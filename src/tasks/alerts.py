"""
Alert and notification tasks for air quality monitoring.
Handles threshold monitoring and multi-channel notifications with rate limiting.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from celery import Task
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from geoalchemy2.functions import ST_DWithin, ST_GeomFromText

from src.tasks.celery_app import celery_app
from src.api.database import get_db_session
from src.api.models import AlertSubscription, AlertHistory, AirQualityMeasurement, SourceAttribution, User
from src.api.notifications import notification_service
from src.api.delivery_tracker import delivery_tracker
from src.utils.aqi_calculator import calculate_aqi

logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} succeeded with result: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed with exception: {exc}")


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def check_alert_thresholds(self) -> Dict[str, Any]:
    """
    Check current AQI values against user alert thresholds and trigger alerts.
    
    This task runs every 5 minutes to monitor air quality and send alerts
    when thresholds are exceeded, with rate limiting to prevent spam.
    
    Returns:
        Dictionary with threshold check results and triggered alerts.
    """
    try:
        logger.info("Starting alert threshold check")
        
        with get_db_session() as db:
            # Get all active alert subscriptions
            subscriptions = db.query(AlertSubscription).filter(
                AlertSubscription.is_active == True
            ).all()
            
            if not subscriptions:
                logger.info("No active alert subscriptions found")
                return {
                    "task": "check_alert_thresholds",
                    "timestamp": datetime.utcnow().isoformat(),
                    "subscriptions_checked": 0,
                    "alerts_triggered": 0,
                    "message": "No active subscriptions"
                }
            
            alerts_triggered = 0
            subscriptions_checked = len(subscriptions)
            
            for subscription in subscriptions:
                try:
                    # Check if we should skip due to rate limiting
                    should_skip = asyncio.run(_should_skip_alert_due_to_rate_limit(db, subscription))
                    if should_skip:
                        continue
                    
                    # Get current AQI for subscription location
                    current_aqi_data = asyncio.run(_get_current_aqi_for_location(db, subscription))
                    
                    if not current_aqi_data:
                        logger.warning(f"No current AQI data for subscription {subscription.id}")
                        continue
                    
                    current_aqi = current_aqi_data["aqi"]
                    
                    # Check if threshold is exceeded
                    if current_aqi > subscription.threshold_value:
                        logger.info(f"Threshold exceeded for subscription {subscription.id}: "
                                   f"AQI {current_aqi} > {subscription.threshold_value}")
                        
                        # Get source attribution data
                        source_attribution = asyncio.run(_get_source_attribution_for_location(db, subscription))
                        
                        # Trigger alert notification
                        asyncio.run(_trigger_alert_notification(
                            db=db,
                            subscription=subscription,
                            current_aqi=current_aqi,
                            aqi_data=current_aqi_data,
                            source_attribution=source_attribution
                        ))
                        
                        alerts_triggered += 1
                        
                except Exception as e:
                    logger.error(f"Error processing subscription {subscription.id}: {e}")
                    continue
            
            result = {
                "task": "check_alert_thresholds",
                "timestamp": datetime.utcnow().isoformat(),
                "subscriptions_checked": subscriptions_checked,
                "alerts_triggered": alerts_triggered
            }
            
            logger.info(f"Alert threshold check completed: {result}")
            return result
            
    except Exception as exc:
        logger.error(f"Alert threshold check failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _should_skip_alert_due_to_rate_limit(db: Session, subscription: AlertSubscription) -> bool:
    """
    Check if we should skip sending an alert due to rate limiting.
    Rate limit: Maximum 1 alert per hour per subscription.
    """
    try:
        # Check for recent alerts (within last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        recent_alert = db.query(AlertHistory).filter(
            and_(
                AlertHistory.subscription_id == subscription.id,
                AlertHistory.sent_at >= one_hour_ago
            )
        ).first()
        
        if recent_alert:
            logger.info(f"Skipping alert for subscription {subscription.id} due to rate limiting. "
                       f"Last alert sent at {recent_alert.sent_at}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking rate limit for subscription {subscription.id}: {e}")
        return False


async def _get_current_aqi_for_location(db: Session, subscription: AlertSubscription) -> Optional[Dict[str, Any]]:
    """
    Get current AQI data for a subscription location.
    """
    try:
        # Extract coordinates from subscription location
        location_wkt = str(subscription.location)
        if "POINT(" not in location_wkt:
            return None
        
        # Get recent measurements within 5km of the subscription location
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        measurements = db.query(AirQualityMeasurement).filter(
            and_(
                AirQualityMeasurement.time >= one_hour_ago,
                ST_DWithin(
                    AirQualityMeasurement.location,
                    subscription.location,
                    0.05  # 5km in degrees (approximate)
                )
            )
        ).order_by(AirQualityMeasurement.time.desc()).limit(50).all()
        
        if not measurements:
            return None
        
        # Group measurements by parameter and calculate average
        parameter_values = {}
        for measurement in measurements:
            if measurement.parameter not in parameter_values:
                parameter_values[measurement.parameter] = []
            parameter_values[measurement.parameter].append(measurement.value)
        
        # Calculate average values
        avg_values = {}
        for parameter, values in parameter_values.items():
            if values:
                avg_values[parameter] = sum(values) / len(values)
        
        # Calculate AQI
        if avg_values:
            aqi, dominant_pollutant, category = calculate_aqi(avg_values)
            return {
                "aqi": aqi,
                "category": category,
                "dominant_pollutant": dominant_pollutant,
                "pollutant_values": avg_values,
                "measurement_count": len(measurements)
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting current AQI for subscription {subscription.id}: {e}")
        return None


async def _get_source_attribution_for_location(db: Session, subscription: AlertSubscription) -> Optional[Dict[str, float]]:
    """
    Get source attribution data for a subscription location.
    """
    try:
        # Get recent source attribution data within 5km
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        attribution = db.query(SourceAttribution).filter(
            and_(
                SourceAttribution.timestamp >= one_hour_ago,
                ST_DWithin(
                    SourceAttribution.location,
                    subscription.location,
                    0.05  # 5km in degrees
                )
            )
        ).order_by(SourceAttribution.timestamp.desc()).first()
        
        if attribution:
            return {
                "vehicular": attribution.vehicular_percent or 0,
                "industrial": attribution.industrial_percent or 0,
                "biomass": attribution.biomass_percent or 0,
                "background": attribution.background_percent or 0
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting source attribution for subscription {subscription.id}: {e}")
        return None


async def _trigger_alert_notification(db: Session,
                                    subscription: AlertSubscription,
                                    current_aqi: int,
                                    aqi_data: Dict[str, Any],
                                    source_attribution: Optional[Dict[str, float]]):
    """
    Trigger alert notification for a subscription.
    """
    try:
        # Get user information
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if not user:
            logger.error(f"User not found for subscription {subscription.id}")
            return
        
        # Prepare notification message
        location_name = subscription.location_name or "your location"
        message = f"Air quality alert for {location_name}: AQI {current_aqi} exceeds your threshold of {subscription.threshold_value}."
        
        if source_attribution:
            # Add main pollution sources to message
            main_sources = []
            for source, percent in source_attribution.items():
                if percent > 15:  # Only mention significant sources
                    main_sources.append(f"{source.replace('_', ' ')}: {percent:.0f}%")
            
            if main_sources:
                message += f" Main sources: {', '.join(main_sources)}."
        
        message += " Take protective measures and limit outdoor activities."
        
        # Send notifications
        results = await notification_service.send_alert_notification(
            user_email=user.email,
            user_phone=None,  # Would need to add phone field to User model
            push_token=None,  # Would need to add push token management
            channels=subscription.notification_channels,
            location_name=location_name,
            aqi_value=current_aqi,
            threshold=subscription.threshold_value,
            source_attribution=source_attribution
        )
        
        # Record delivery attempt
        await delivery_tracker.record_delivery_attempt(
            db=db,
            subscription_id=subscription.id,
            aqi_value=current_aqi,
            threshold_value=subscription.threshold_value,
            message=message,
            results=results
        )
        
        logger.info(f"Alert notification sent for subscription {subscription.id}")
        
    except Exception as e:
        logger.error(f"Error triggering alert notification for subscription {subscription.id}: {e}")
        raise


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def send_test_alert(self, subscription_id: str, user_id: str) -> Dict[str, Any]:
    """
    Send a test alert notification for a specific subscription.
    
    Args:
        subscription_id: UUID of the subscription to test
        user_id: UUID of the user (for verification)
        
    Returns:
        Dictionary with test notification results.
    """
    try:
        logger.info(f"Sending test alert for subscription {subscription_id}")
        
        with get_db_session() as db:
            # Get subscription and verify ownership
            subscription = db.query(AlertSubscription).filter(
                and_(
                    AlertSubscription.id == subscription_id,
                    AlertSubscription.user_id == user_id
                )
            ).first()
            
            if not subscription:
                return {
                    "task": "send_test_alert",
                    "timestamp": datetime.utcnow().isoformat(),
                    "success": False,
                    "error": "Subscription not found or access denied"
                }
            
            # Get user information
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {
                    "task": "send_test_alert",
                    "timestamp": datetime.utcnow().isoformat(),
                    "success": False,
                    "error": "User not found"
                }
            
            # Send test notification
            location_name = subscription.location_name or "your location"
            test_aqi = subscription.threshold_value + 10  # Slightly above threshold
            
            results = asyncio.run(notification_service.send_alert_notification(
                user_email=user.email,
                user_phone=None,
                push_token=None,
                channels=subscription.notification_channels,
                location_name=location_name,
                aqi_value=test_aqi,
                threshold=subscription.threshold_value,
                source_attribution={"vehicular": 45.0, "industrial": 30.0, "biomass": 15.0, "background": 10.0}
            ))
            
            # Count successful/failed notifications
            successful = len([r for r in results if r.status.value in ["sent", "delivered"]])
            failed = len(results) - successful
            
            result = {
                "task": "send_test_alert",
                "timestamp": datetime.utcnow().isoformat(),
                "subscription_id": subscription_id,
                "location_name": location_name,
                "channels_tested": subscription.notification_channels,
                "notifications_sent": successful,
                "notifications_failed": failed,
                "success": successful > 0
            }
            
            logger.info(f"Test alert completed: {result}")
            return result
            
    except Exception as exc:
        logger.error(f"Test alert failed: {exc}")
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@celery_app.task(base=CallbackTask)
def cleanup_old_alerts(self, days_to_keep: int = 30) -> Dict[str, Any]:
    """
    Clean up old alert records from the database.
    
    Args:
        days_to_keep: Number of days of alert history to retain.
        
    Returns:
        Cleanup results.
    """
    try:
        logger.info(f"Cleaning up alerts older than {days_to_keep} days")
        
        with get_db_session() as db:
            # Calculate cutoff date
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Delete old alert history records
            deleted_count = db.query(AlertHistory).filter(
                AlertHistory.sent_at < cutoff_date
            ).delete()
            
            db.commit()
            
            result = {
                "task": "cleanup_old_alerts",
                "timestamp": datetime.utcnow().isoformat(),
                "days_to_keep": days_to_keep,
                "cutoff_date": cutoff_date.isoformat(),
                "alerts_deleted": deleted_count
            }
            
            logger.info(f"Alert cleanup completed: {result}")
            return result
            
    except Exception as e:
        logger.error(f"Alert cleanup failed: {e}")
        raise


# Periodic task configuration
@celery_app.task(base=CallbackTask)
def schedule_alert_monitoring():
    """
    Schedule periodic alert monitoring tasks.
    This task sets up the recurring alert threshold checks.
    """
    try:
        # Schedule threshold checking every 5 minutes
        check_alert_thresholds.apply_async()
        
        logger.info("Alert monitoring scheduled successfully")
        return {
            "task": "schedule_alert_monitoring",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "scheduled"
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule alert monitoring: {e}")
        raise