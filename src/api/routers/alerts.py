"""
Alert subscription management API endpoints.
Handles user alert subscriptions, preferences, and notification settings.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from geoalchemy2.functions import ST_DWithin, ST_GeomFromText

from src.api.database import get_db
from src.api.auth import get_current_user
from src.api.models import User, AlertSubscription, AlertHistory, UserAlertPreferences, PushNotificationToken
from src.api.delivery_tracker import delivery_tracker
from src.api.schemas import (
    AlertSubscriptionRequest, AlertSubscriptionResponse, 
    AlertRecord, AlertHistoryResponse, PaginationInfo,
    LocationPoint, UserAlertPreferencesRequest, UserAlertPreferencesResponse,
    PushTokenRequest, PushTokenResponse
)

router = APIRouter()


@router.post("/subscribe", response_model=AlertSubscriptionResponse)
async def create_alert_subscription(
    subscription_request: AlertSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new alert subscription for the authenticated user.
    
    - **location**: Geographic coordinates for the alert
    - **location_name**: Optional human-readable location name
    - **threshold**: AQI threshold value (0-500)
    - **channels**: List of notification channels (email, sms, push)
    """
    # Check if user already has a subscription for this location
    location_wkt = f"POINT({subscription_request.location.longitude} {subscription_request.location.latitude})"
    
    existing_subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.user_id == current_user.id,
            ST_DWithin(
                AlertSubscription.location,
                ST_GeomFromText(location_wkt, 4326),
                0.01  # ~1km tolerance
            )
        )
    ).first()
    
    if existing_subscription:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert subscription already exists for this location"
        )
    
    # Create new subscription
    new_subscription = AlertSubscription(
        user_id=current_user.id,
        location=location_wkt,
        location_name=subscription_request.location_name,
        threshold_value=subscription_request.threshold,
        notification_channels=subscription_request.channels,
        is_active=True
    )
    
    db.add(new_subscription)
    db.commit()
    db.refresh(new_subscription)
    
    return AlertSubscriptionResponse(
        id=new_subscription.id,
        location=LocationPoint(
            latitude=subscription_request.location.latitude,
            longitude=subscription_request.location.longitude
        ),
        location_name=new_subscription.location_name,
        threshold=new_subscription.threshold_value,
        channels=new_subscription.notification_channels,
        is_active=new_subscription.is_active,
        created_at=new_subscription.created_at
    )


@router.get("/subscriptions", response_model=List[AlertSubscriptionResponse])
async def get_user_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Return only active subscriptions")
):
    """
    Get all alert subscriptions for the authenticated user.
    
    - **active_only**: Filter to return only active subscriptions
    """
    query = db.query(AlertSubscription).filter(AlertSubscription.user_id == current_user.id)
    
    if active_only:
        query = query.filter(AlertSubscription.is_active == True)
    
    subscriptions = query.order_by(AlertSubscription.created_at.desc()).all()
    
    response_subscriptions = []
    for sub in subscriptions:
        # Extract coordinates from PostGIS geometry
        # Note: In a real implementation, you'd use proper PostGIS functions
        # For now, we'll parse the WKT format
        location_wkt = str(sub.location)
        if "POINT(" in location_wkt:
            coords_str = location_wkt.replace("POINT(", "").replace(")", "")
            lon, lat = map(float, coords_str.split())
            location_point = LocationPoint(latitude=lat, longitude=lon)
        else:
            # Fallback if geometry parsing fails
            location_point = LocationPoint(latitude=0.0, longitude=0.0)
        
        response_subscriptions.append(AlertSubscriptionResponse(
            id=sub.id,
            location=location_point,
            location_name=sub.location_name,
            threshold=sub.threshold_value,
            channels=sub.notification_channels,
            is_active=sub.is_active,
            created_at=sub.created_at
        ))
    
    return response_subscriptions


@router.put("/subscriptions/{subscription_id}", response_model=AlertSubscriptionResponse)
async def update_alert_subscription(
    subscription_id: UUID,
    subscription_request: AlertSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing alert subscription.
    
    - **subscription_id**: UUID of the subscription to update
    - **location**: New geographic coordinates
    - **location_name**: New location name
    - **threshold**: New AQI threshold value
    - **channels**: New notification channels
    """
    subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == current_user.id
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert subscription not found"
        )
    
    # Update subscription fields
    location_wkt = f"POINT({subscription_request.location.longitude} {subscription_request.location.latitude})"
    subscription.location = location_wkt
    subscription.location_name = subscription_request.location_name
    subscription.threshold_value = subscription_request.threshold
    subscription.notification_channels = subscription_request.channels
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    return AlertSubscriptionResponse(
        id=subscription.id,
        location=LocationPoint(
            latitude=subscription_request.location.latitude,
            longitude=subscription_request.location.longitude
        ),
        location_name=subscription.location_name,
        threshold=subscription.threshold_value,
        channels=subscription.notification_channels,
        is_active=subscription.is_active,
        created_at=subscription.created_at
    )


@router.patch("/subscriptions/{subscription_id}/toggle")
async def toggle_subscription_status(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle the active status of an alert subscription.
    
    - **subscription_id**: UUID of the subscription to toggle
    """
    subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == current_user.id
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert subscription not found"
        )
    
    subscription.is_active = not subscription.is_active
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "subscription_id": subscription_id,
        "is_active": subscription.is_active,
        "message": f"Subscription {'activated' if subscription.is_active else 'deactivated'}"
    }


@router.delete("/subscriptions/{subscription_id}")
async def delete_alert_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert subscription.
    
    - **subscription_id**: UUID of the subscription to delete
    """
    subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == current_user.id
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert subscription not found"
        )
    
    db.delete(subscription)
    db.commit()
    
    return {
        "subscription_id": subscription_id,
        "message": "Alert subscription deleted successfully"
    }


@router.get("/subscriptions/{subscription_id}", response_model=AlertSubscriptionResponse)
async def get_alert_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific alert subscription by ID.
    
    - **subscription_id**: UUID of the subscription to retrieve
    """
    subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == current_user.id
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert subscription not found"
        )
    
    # Extract coordinates from PostGIS geometry
    location_wkt = str(subscription.location)
    if "POINT(" in location_wkt:
        coords_str = location_wkt.replace("POINT(", "").replace(")", "")
        lon, lat = map(float, coords_str.split())
        location_point = LocationPoint(latitude=lat, longitude=lon)
    else:
        location_point = LocationPoint(latitude=0.0, longitude=0.0)
    
    return AlertSubscriptionResponse(
        id=subscription.id,
        location=location_point,
        location_name=subscription.location_name,
        threshold=subscription.threshold_value,
        channels=subscription.notification_channels,
        is_active=subscription.is_active,
        created_at=subscription.created_at
    )


@router.get("/preferences")
async def get_alert_preferences(
    current_user: User = Depends(get_current_user)
):
    """
    Get user's alert preferences and settings.
    """
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "default_channels": ["email"],  # Default notification channels
        "max_subscriptions": 10,  # Maximum allowed subscriptions per user
        "supported_channels": ["email", "sms", "push"],
        "threshold_ranges": {
            "good": {"min": 0, "max": 50},
            "moderate": {"min": 51, "max": 100},
            "unhealthy_sensitive": {"min": 101, "max": 150},
            "unhealthy": {"min": 151, "max": 200},
            "very_unhealthy": {"min": 201, "max": 300},
            "hazardous": {"min": 301, "max": 500}
        }
    }


@router.get("/history", response_model=AlertHistoryResponse)
async def get_alert_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    subscription_id: Optional[UUID] = Query(None, description="Filter by subscription ID")
):
    """
    Get alert history for the authenticated user.
    
    - **page**: Page number for pagination
    - **per_page**: Number of items per page (max 100)
    - **subscription_id**: Optional filter by specific subscription
    """
    # Base query for user's alert history
    query = db.query(AlertHistory).join(AlertSubscription).filter(
        AlertSubscription.user_id == current_user.id
    )
    
    # Filter by subscription if specified
    if subscription_id:
        query = query.filter(AlertHistory.subscription_id == subscription_id)
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    alert_records = query.order_by(AlertHistory.sent_at.desc()).offset(offset).limit(per_page).all()
    
    # Convert to response format
    alerts = []
    for record in alert_records:
        # Get subscription details for location info
        subscription = record.subscription
        
        # Extract coordinates from PostGIS geometry
        location_wkt = str(subscription.location)
        if "POINT(" in location_wkt:
            coords_str = location_wkt.replace("POINT(", "").replace(")", "")
            lon, lat = map(float, coords_str.split())
            location_point = LocationPoint(latitude=lat, longitude=lon)
        else:
            location_point = LocationPoint(latitude=0.0, longitude=0.0)
        
        alerts.append(AlertRecord(
            id=record.id,
            location=location_point,
            location_name=subscription.location_name,
            aqi_value=record.aqi_value,
            threshold=record.threshold_value,
            message=record.message,
            channels_sent=record.channels_sent,
            sent_at=record.sent_at
        ))
    
    # Calculate pagination info
    pages = (total + per_page - 1) // per_page
    
    return AlertHistoryResponse(
        alerts=alerts,
        pagination=PaginationInfo(
            page=page,
            per_page=per_page,
            total=total,
            pages=pages
        )
    )


@router.get("/analytics")
async def get_delivery_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Number of days for analytics")
):
    """
    Get delivery analytics for the user's alert notifications.
    
    - **days**: Number of days to include in analytics (1-365)
    """
    analytics = await delivery_tracker.get_delivery_analytics(
        db=db,
        user_id=current_user.id,
        days=days
    )
    
    return analytics


@router.get("/failed-deliveries")
async def get_failed_deliveries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back for failures")
):
    """
    Get recent failed delivery attempts for troubleshooting.
    
    - **hours**: Number of hours to look back (1-168)
    """
    failures = await delivery_tracker.get_failed_deliveries(
        db=db,
        user_id=current_user.id,
        hours=hours
    )
    
    return {
        "failed_deliveries": failures,
        "count": len(failures),
        "period_hours": hours
    }


@router.post("/test-notification")
async def test_notification(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a test notification for a specific subscription.
    
    - **subscription_id**: UUID of the subscription to test
    """
    subscription = db.query(AlertSubscription).filter(
        and_(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == current_user.id
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert subscription not found"
        )
    
    # Import and trigger test alert task
    from src.tasks.alerts import send_test_alert
    
    # Send test alert asynchronously
    task = send_test_alert.delay(str(subscription_id), str(current_user.id))
    
    return {
        "subscription_id": subscription_id,
        "location_name": subscription.location_name,
        "channels": subscription.notification_channels,
        "message": "Test notification queued for delivery",
        "task_id": task.id,
        "test_message": f"Test alert: AQI at {subscription.location_name or 'your location'} is above your threshold of {subscription.threshold_value}"
    }


@router.post("/trigger-threshold-check")
async def trigger_threshold_check(
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger alert threshold checking (admin only).
    This endpoint allows administrators to manually trigger the threshold checking process.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Import and trigger threshold check task
    from src.tasks.alerts import check_alert_thresholds
    
    # Trigger threshold check asynchronously
    task = check_alert_thresholds.delay()
    
    return {
        "message": "Alert threshold check triggered",
        "task_id": task.id,
        "triggered_by": current_user.email,
        "timestamp": datetime.utcnow().isoformat()
    }



# Enhanced User Preferences Endpoints

@router.get("/preferences/detailed", response_model=UserAlertPreferencesResponse)
async def get_detailed_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed alert preferences for the authenticated user.
    Creates default preferences if none exist.
    """
    preferences = db.query(UserAlertPreferences).filter(
        UserAlertPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = UserAlertPreferences(
            user_id=current_user.id,
            default_channels=["email"],
            quiet_hours_enabled=False,
            max_alerts_per_day=10,
            min_alert_interval_minutes=60,
            alert_on_good=False,
            alert_on_moderate=False,
            alert_on_unhealthy_sensitive=True,
            alert_on_unhealthy=True,
            alert_on_very_unhealthy=True,
            alert_on_hazardous=True,
            enable_daily_digest=False
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return UserAlertPreferencesResponse(
        id=preferences.id,
        user_id=preferences.user_id,
        default_channels=preferences.default_channels,
        quiet_hours_start=preferences.quiet_hours_start,
        quiet_hours_end=preferences.quiet_hours_end,
        quiet_hours_enabled=preferences.quiet_hours_enabled,
        max_alerts_per_day=preferences.max_alerts_per_day,
        min_alert_interval_minutes=preferences.min_alert_interval_minutes,
        alert_on_good=preferences.alert_on_good,
        alert_on_moderate=preferences.alert_on_moderate,
        alert_on_unhealthy_sensitive=preferences.alert_on_unhealthy_sensitive,
        alert_on_unhealthy=preferences.alert_on_unhealthy,
        alert_on_very_unhealthy=preferences.alert_on_very_unhealthy,
        alert_on_hazardous=preferences.alert_on_hazardous,
        enable_daily_digest=preferences.enable_daily_digest,
        daily_digest_time=preferences.daily_digest_time,
        created_at=preferences.created_at,
        updated_at=preferences.updated_at
    )


@router.put("/preferences/detailed", response_model=UserAlertPreferencesResponse)
async def update_detailed_alert_preferences(
    preferences_request: UserAlertPreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update detailed alert preferences for the authenticated user.
    Only updates fields that are provided in the request.
    """
    preferences = db.query(UserAlertPreferences).filter(
        UserAlertPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create new preferences with provided values
        preferences = UserAlertPreferences(
            user_id=current_user.id,
            default_channels=preferences_request.default_channels or ["email"],
            quiet_hours_start=preferences_request.quiet_hours_start,
            quiet_hours_end=preferences_request.quiet_hours_end,
            quiet_hours_enabled=preferences_request.quiet_hours_enabled or False,
            max_alerts_per_day=preferences_request.max_alerts_per_day or 10,
            min_alert_interval_minutes=preferences_request.min_alert_interval_minutes or 60,
            alert_on_good=preferences_request.alert_on_good if preferences_request.alert_on_good is not None else False,
            alert_on_moderate=preferences_request.alert_on_moderate if preferences_request.alert_on_moderate is not None else False,
            alert_on_unhealthy_sensitive=preferences_request.alert_on_unhealthy_sensitive if preferences_request.alert_on_unhealthy_sensitive is not None else True,
            alert_on_unhealthy=preferences_request.alert_on_unhealthy if preferences_request.alert_on_unhealthy is not None else True,
            alert_on_very_unhealthy=preferences_request.alert_on_very_unhealthy if preferences_request.alert_on_very_unhealthy is not None else True,
            alert_on_hazardous=preferences_request.alert_on_hazardous if preferences_request.alert_on_hazardous is not None else True,
            enable_daily_digest=preferences_request.enable_daily_digest or False,
            daily_digest_time=preferences_request.daily_digest_time
        )
        db.add(preferences)
    else:
        # Update existing preferences
        if preferences_request.default_channels is not None:
            preferences.default_channels = preferences_request.default_channels
        if preferences_request.quiet_hours_start is not None:
            preferences.quiet_hours_start = preferences_request.quiet_hours_start
        if preferences_request.quiet_hours_end is not None:
            preferences.quiet_hours_end = preferences_request.quiet_hours_end
        if preferences_request.quiet_hours_enabled is not None:
            preferences.quiet_hours_enabled = preferences_request.quiet_hours_enabled
        if preferences_request.max_alerts_per_day is not None:
            preferences.max_alerts_per_day = preferences_request.max_alerts_per_day
        if preferences_request.min_alert_interval_minutes is not None:
            preferences.min_alert_interval_minutes = preferences_request.min_alert_interval_minutes
        if preferences_request.alert_on_good is not None:
            preferences.alert_on_good = preferences_request.alert_on_good
        if preferences_request.alert_on_moderate is not None:
            preferences.alert_on_moderate = preferences_request.alert_on_moderate
        if preferences_request.alert_on_unhealthy_sensitive is not None:
            preferences.alert_on_unhealthy_sensitive = preferences_request.alert_on_unhealthy_sensitive
        if preferences_request.alert_on_unhealthy is not None:
            preferences.alert_on_unhealthy = preferences_request.alert_on_unhealthy
        if preferences_request.alert_on_very_unhealthy is not None:
            preferences.alert_on_very_unhealthy = preferences_request.alert_on_very_unhealthy
        if preferences_request.alert_on_hazardous is not None:
            preferences.alert_on_hazardous = preferences_request.alert_on_hazardous
        if preferences_request.enable_daily_digest is not None:
            preferences.enable_daily_digest = preferences_request.enable_daily_digest
        if preferences_request.daily_digest_time is not None:
            preferences.daily_digest_time = preferences_request.daily_digest_time
        
        preferences.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(preferences)
    
    return UserAlertPreferencesResponse(
        id=preferences.id,
        user_id=preferences.user_id,
        default_channels=preferences.default_channels,
        quiet_hours_start=preferences.quiet_hours_start,
        quiet_hours_end=preferences.quiet_hours_end,
        quiet_hours_enabled=preferences.quiet_hours_enabled,
        max_alerts_per_day=preferences.max_alerts_per_day,
        min_alert_interval_minutes=preferences.min_alert_interval_minutes,
        alert_on_good=preferences.alert_on_good,
        alert_on_moderate=preferences.alert_on_moderate,
        alert_on_unhealthy_sensitive=preferences.alert_on_unhealthy_sensitive,
        alert_on_unhealthy=preferences.alert_on_unhealthy,
        alert_on_very_unhealthy=preferences.alert_on_very_unhealthy,
        alert_on_hazardous=preferences.alert_on_hazardous,
        enable_daily_digest=preferences.enable_daily_digest,
        daily_digest_time=preferences.daily_digest_time,
        created_at=preferences.created_at,
        updated_at=preferences.updated_at
    )


# Push Notification Token Management Endpoints

@router.post("/push-tokens", response_model=PushTokenResponse)
async def register_push_token(
    token_request: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a push notification token for the authenticated user.
    If the token already exists, it will be reactivated and updated.
    """
    # Check if token already exists
    existing_token = db.query(PushNotificationToken).filter(
        PushNotificationToken.token == token_request.token
    ).first()
    
    if existing_token:
        # Reactivate and update existing token
        existing_token.is_active = True
        existing_token.device_type = token_request.device_type
        existing_token.device_name = token_request.device_name
        existing_token.last_used_at = datetime.utcnow()
        existing_token.updated_at = datetime.utcnow()
        
        # If token belongs to different user, reassign it
        if existing_token.user_id != current_user.id:
            existing_token.user_id = current_user.id
        
        db.commit()
        db.refresh(existing_token)
        
        return PushTokenResponse(
            id=existing_token.id,
            token=existing_token.token,
            device_type=existing_token.device_type,
            device_name=existing_token.device_name,
            is_active=existing_token.is_active,
            last_used_at=existing_token.last_used_at,
            created_at=existing_token.created_at
        )
    
    # Create new token
    new_token = PushNotificationToken(
        user_id=current_user.id,
        token=token_request.token,
        device_type=token_request.device_type,
        device_name=token_request.device_name,
        is_active=True,
        last_used_at=datetime.utcnow()
    )
    
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    return PushTokenResponse(
        id=new_token.id,
        token=new_token.token,
        device_type=new_token.device_type,
        device_name=new_token.device_name,
        is_active=new_token.is_active,
        last_used_at=new_token.last_used_at,
        created_at=new_token.created_at
    )


@router.get("/push-tokens", response_model=List[PushTokenResponse])
async def get_push_tokens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Return only active tokens")
):
    """
    Get all push notification tokens for the authenticated user.
    """
    query = db.query(PushNotificationToken).filter(
        PushNotificationToken.user_id == current_user.id
    )
    
    if active_only:
        query = query.filter(PushNotificationToken.is_active == True)
    
    tokens = query.order_by(PushNotificationToken.created_at.desc()).all()
    
    return [
        PushTokenResponse(
            id=token.id,
            token=token.token,
            device_type=token.device_type,
            device_name=token.device_name,
            is_active=token.is_active,
            last_used_at=token.last_used_at,
            created_at=token.created_at
        )
        for token in tokens
    ]


@router.delete("/push-tokens/{token_id}")
async def delete_push_token(
    token_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete (deactivate) a push notification token.
    """
    token = db.query(PushNotificationToken).filter(
        and_(
            PushNotificationToken.id == token_id,
            PushNotificationToken.user_id == current_user.id
        )
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Push notification token not found"
        )
    
    # Soft delete by deactivating
    token.is_active = False
    token.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "token_id": token_id,
        "message": "Push notification token deactivated successfully"
    }


@router.post("/push-tokens/test")
async def test_push_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a test push notification to all active devices for the authenticated user.
    """
    # Get all active push tokens for the user
    tokens = db.query(PushNotificationToken).filter(
        and_(
            PushNotificationToken.user_id == current_user.id,
            PushNotificationToken.is_active == True
        )
    ).all()
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active push notification tokens found"
        )
    
    # Import notification service
    from src.api.notifications import NotificationService, NotificationRequest, NotificationChannel
    
    notification_service = NotificationService()
    
    # Send test notification to each token
    results = []
    for token in tokens:
        notification_request = NotificationRequest(
            channel=NotificationChannel.PUSH,
            recipient=token.token,
            subject="Test Notification",
            message="This is a test push notification from AQI Predictor Dashboard",
            metadata={
                "device_type": token.device_type,
                "device_name": token.device_name,
                "user_id": str(current_user.id)
            }
        )
        
        result = await notification_service.send_notification(notification_request)
        results.append({
            "token_id": str(token.id),
            "device_name": token.device_name,
            "status": result.status.value,
            "message": result.message
        })
        
        # Update last_used_at if successful
        if result.status.value == "delivered":
            token.last_used_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"Test notifications sent to {len(tokens)} device(s)",
        "results": results
    }
