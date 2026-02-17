"""
Notification delivery tracking service.
Tracks delivery status and provides analytics for notification performance.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from src.api.database import get_db
from src.api.models import AlertHistory, AlertSubscription, User
from src.api.notifications import NotificationResult, DeliveryStatus, NotificationChannel

logger = logging.getLogger(__name__)


class DeliveryTracker:
    """Service for tracking notification delivery status and analytics."""
    
    def __init__(self):
        self.delivery_callbacks = {}
    
    async def record_delivery_attempt(self,
                                    db: Session,
                                    subscription_id: UUID,
                                    aqi_value: int,
                                    threshold_value: int,
                                    message: str,
                                    results: List[NotificationResult]) -> UUID:
        """
        Record a notification delivery attempt in the database.
        
        Args:
            db: Database session
            subscription_id: Alert subscription ID
            aqi_value: Current AQI value that triggered the alert
            threshold_value: User's threshold that was exceeded
            message: Alert message content
            results: List of delivery results from notification service
        
        Returns:
            UUID of the created alert history record
        """
        try:
            # Separate successful and failed channels
            channels_sent = []
            channels_failed = []
            
            for result in results:
                if result.status in [DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
                    channels_sent.append(result.channel.value)
                else:
                    channels_failed.append(result.channel.value)
            
            # Determine overall delivery status
            if channels_sent and not channels_failed:
                delivery_status = "sent"
            elif channels_sent and channels_failed:
                delivery_status = "partial"
            else:
                delivery_status = "failed"
            
            # Create alert history record
            alert_record = AlertHistory(
                subscription_id=subscription_id,
                aqi_value=aqi_value,
                threshold_value=threshold_value,
                message=message,
                channels_sent=channels_sent,
                channels_failed=channels_failed if channels_failed else None,
                sent_at=datetime.utcnow(),
                delivery_status=delivery_status
            )
            
            db.add(alert_record)
            db.commit()
            db.refresh(alert_record)
            
            logger.info(f"Recorded delivery attempt for subscription {subscription_id}: "
                       f"{len(channels_sent)} sent, {len(channels_failed)} failed")
            
            return alert_record.id
            
        except Exception as e:
            logger.error(f"Failed to record delivery attempt: {e}")
            db.rollback()
            raise
    
    async def update_delivery_status(self,
                                   db: Session,
                                   alert_history_id: UUID,
                                   channel: NotificationChannel,
                                   new_status: DeliveryStatus,
                                   metadata: Optional[Dict[str, Any]] = None):
        """
        Update delivery status for a specific channel.
        
        This would be called by webhook handlers from notification providers.
        """
        try:
            alert_record = db.query(AlertHistory).filter(
                AlertHistory.id == alert_history_id
            ).first()
            
            if not alert_record:
                logger.warning(f"Alert history record not found: {alert_history_id}")
                return
            
            # Update delivery status based on the new information
            if new_status == DeliveryStatus.DELIVERED:
                alert_record.delivery_status = "delivered"
            elif new_status == DeliveryStatus.BOUNCED:
                # Move channel from sent to failed
                if channel.value in alert_record.channels_sent:
                    alert_record.channels_sent.remove(channel.value)
                    if not alert_record.channels_failed:
                        alert_record.channels_failed = []
                    alert_record.channels_failed.append(channel.value)
                    
                    # Update overall status
                    if not alert_record.channels_sent:
                        alert_record.delivery_status = "failed"
                    else:
                        alert_record.delivery_status = "partial"
            
            db.commit()
            
            logger.info(f"Updated delivery status for alert {alert_history_id}, "
                       f"channel {channel.value}: {new_status.value}")
            
        except Exception as e:
            logger.error(f"Failed to update delivery status: {e}")
            db.rollback()
    
    async def get_delivery_analytics(self,
                                   db: Session,
                                   user_id: Optional[UUID] = None,
                                   days: int = 30) -> Dict[str, Any]:
        """
        Get delivery analytics for notifications.
        
        Args:
            db: Database session
            user_id: Optional user ID to filter analytics
            days: Number of days to include in analytics
        
        Returns:
            Dictionary containing delivery analytics
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Base query
            query = db.query(AlertHistory).filter(
                AlertHistory.sent_at >= start_date
            )
            
            # Filter by user if specified
            if user_id:
                query = query.join(AlertSubscription).filter(
                    AlertSubscription.user_id == user_id
                )
            
            # Get all records
            records = query.all()
            
            # Calculate analytics
            total_alerts = len(records)
            
            if total_alerts == 0:
                return {
                    "total_alerts": 0,
                    "delivery_rate": 0.0,
                    "channel_performance": {},
                    "status_breakdown": {},
                    "daily_stats": []
                }
            
            # Status breakdown
            status_counts = {}
            for record in records:
                status = record.delivery_status
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Channel performance
            channel_stats = {}
            for record in records:
                # Count successful channels
                for channel in record.channels_sent or []:
                    if channel not in channel_stats:
                        channel_stats[channel] = {"sent": 0, "failed": 0}
                    channel_stats[channel]["sent"] += 1
                
                # Count failed channels
                for channel in record.channels_failed or []:
                    if channel not in channel_stats:
                        channel_stats[channel] = {"sent": 0, "failed": 0}
                    channel_stats[channel]["failed"] += 1
            
            # Calculate delivery rates per channel
            channel_performance = {}
            for channel, stats in channel_stats.items():
                total = stats["sent"] + stats["failed"]
                if total > 0:
                    delivery_rate = stats["sent"] / total
                    channel_performance[channel] = {
                        "total_attempts": total,
                        "successful": stats["sent"],
                        "failed": stats["failed"],
                        "delivery_rate": round(delivery_rate * 100, 2)
                    }
            
            # Overall delivery rate
            successful_alerts = status_counts.get("sent", 0) + status_counts.get("delivered", 0)
            overall_delivery_rate = (successful_alerts / total_alerts) * 100 if total_alerts > 0 else 0
            
            # Daily statistics
            daily_stats = []
            for i in range(days):
                day = start_date + timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                day_records = [r for r in records if day_start <= r.sent_at < day_end]
                day_count = len(day_records)
                day_successful = len([r for r in day_records if r.delivery_status in ["sent", "delivered"]])
                
                daily_stats.append({
                    "date": day.strftime("%Y-%m-%d"),
                    "total_alerts": day_count,
                    "successful_alerts": day_successful,
                    "delivery_rate": round((day_successful / day_count) * 100, 2) if day_count > 0 else 0
                })
            
            return {
                "total_alerts": total_alerts,
                "delivery_rate": round(overall_delivery_rate, 2),
                "channel_performance": channel_performance,
                "status_breakdown": status_counts,
                "daily_stats": daily_stats,
                "period_days": days,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get delivery analytics: {e}")
            return {
                "error": str(e),
                "total_alerts": 0,
                "delivery_rate": 0.0
            }
    
    async def get_failed_deliveries(self,
                                  db: Session,
                                  user_id: Optional[UUID] = None,
                                  hours: int = 24) -> List[Dict[str, Any]]:
        """
        Get recent failed deliveries for investigation.
        
        Args:
            db: Database session
            user_id: Optional user ID to filter failures
            hours: Number of hours to look back
        
        Returns:
            List of failed delivery records
        """
        try:
            # Calculate time range
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Query failed deliveries
            query = db.query(AlertHistory).filter(
                and_(
                    AlertHistory.sent_at >= cutoff_time,
                    AlertHistory.delivery_status.in_(["failed", "partial"])
                )
            )
            
            # Filter by user if specified
            if user_id:
                query = query.join(AlertSubscription).filter(
                    AlertSubscription.user_id == user_id
                )
            
            failed_records = query.order_by(desc(AlertHistory.sent_at)).all()
            
            # Format results
            failures = []
            for record in failed_records:
                subscription = record.subscription
                failures.append({
                    "alert_id": record.id,
                    "subscription_id": record.subscription_id,
                    "location_name": subscription.location_name,
                    "aqi_value": record.aqi_value,
                    "threshold": record.threshold_value,
                    "channels_failed": record.channels_failed or [],
                    "channels_sent": record.channels_sent or [],
                    "sent_at": record.sent_at.isoformat(),
                    "delivery_status": record.delivery_status
                })
            
            return failures
            
        except Exception as e:
            logger.error(f"Failed to get failed deliveries: {e}")
            return []


# Global delivery tracker instance
delivery_tracker = DeliveryTracker()