"""Property-based tests for alerting system."""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, patch, AsyncMock
import asyncio

from src.tasks.alerts import _should_skip_alert_due_to_rate_limit, _trigger_alert_notification
from src.api.notifications import NotificationResult, NotificationChannel, DeliveryStatus


@st.composite
def alert_subscription_data(draw):
    return {
        'user_id': draw(st.uuids()),
        'location_name': draw(st.text(min_size=3, max_size=50)),
        'threshold_value': draw(st.integers(min_value=50, max_value=500)),
        'notification_channels': draw(st.lists(
            st.sampled_from(['email', 'sms', 'push']),
            min_size=1, max_size=3, unique=True
        )),
    }


def test_basic_threshold_logic():
    threshold = 100
    aqi_above = 150
    aqi_below = 50
    assert aqi_above > threshold
    assert aqi_below <= threshold


@given(
    subscription=alert_subscription_data(),
    aqi_value=st.integers(min_value=0, max_value=500)
)
@settings(max_examples=100, deadline=5000)
def test_alert_threshold_triggering_property(subscription, aqi_value):
    mock_session = Mock()
    mock_notification_service = Mock()
    mock_delivery_tracker = Mock()
    
    alert_sub = Mock()
    alert_sub.id = subscription['user_id']
    alert_sub.user_id = subscription['user_id']
    alert_sub.location_name = subscription['location_name']
    alert_sub.threshold_value = subscription['threshold_value']
    alert_sub.notification_channels = subscription['notification_channels']
    
    user_mock = Mock()
    user_mock.id = subscription['user_id']
    user_mock.email = "test@example.com"
    
    mock_session.query.return_value.filter.return_value.first.return_value = user_mock
    
    aqi_data = {
        "aqi": aqi_value,
        "category": "Moderate" if aqi_value < 100 else "Unhealthy",
        "dominant_pollutant": "PM2.5",
        "pollutant_values": {"pm25": 35.0},
        "measurement_count": 5
    }
    
    notification_results = [
        NotificationResult(
            channel=NotificationChannel.EMAIL,
            status=DeliveryStatus.SENT,
            message_id="test_msg_123",
            delivery_time=datetime.utcnow()
        )
    ]
    
    mock_notification_service.send_alert_notification = AsyncMock(return_value=notification_results)
    mock_delivery_tracker.record_delivery_attempt = AsyncMock()
    
    with patch('src.tasks.alerts.notification_service', mock_notification_service),          patch('src.tasks.alerts.delivery_tracker', mock_delivery_tracker):
        
        if aqi_value > subscription['threshold_value']:
            asyncio.run(_trigger_alert_notification(
                db=mock_session,
                subscription=alert_sub,
                current_aqi=aqi_value,
                aqi_data=aqi_data,
                source_attribution={"vehicular": 45.0}
            ))
            
            mock_notification_service.send_alert_notification.assert_called_once()
            call_args = mock_notification_service.send_alert_notification.call_args
            assert call_args.kwargs['aqi_value'] == aqi_value
            assert call_args.kwargs['threshold'] == subscription['threshold_value']
            mock_delivery_tracker.record_delivery_attempt.assert_called_once()
        else:
            assert aqi_value <= subscription['threshold_value']


def test_basic_rate_limiting_logic():
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    thirty_minutes_ago = now - timedelta(minutes=30)
    assert (now - one_hour_ago).total_seconds() >= 3600
    assert (now - thirty_minutes_ago).total_seconds() < 3600


@given(
    subscription=alert_subscription_data(),
    alert_intervals=st.lists(st.integers(min_value=1, max_value=120), min_size=2, max_size=5)
)
@settings(max_examples=50, deadline=5000)
def test_alert_rate_limiting_property(subscription, alert_intervals):
    mock_session = Mock()
    
    alert_sub = Mock()
    alert_sub.id = subscription['user_id']
    alert_sub.user_id = subscription['user_id']
    alert_sub.location_name = subscription['location_name']
    
    alert_history = []
    base_time = datetime.utcnow()
    current_mock_time = [base_time]  # Use list to allow modification in nested function
    
    def mock_alert_query(*args):
        query_mock = Mock()
        filter_mock = Mock()
        one_hour_ago = current_mock_time[0] - timedelta(hours=1)
        recent_alerts = [alert for alert in alert_history if alert.sent_at >= one_hour_ago]
        filter_mock.first.return_value = recent_alerts[-1] if recent_alerts else None
        query_mock.filter.return_value = filter_mock
        return query_mock
    
    mock_session.query.side_effect = mock_alert_query
    
    should_send_count = 0
    cumulative_minutes = 0
    
    for interval_minutes in alert_intervals:
        cumulative_minutes += interval_minutes
        current_time = base_time + timedelta(minutes=cumulative_minutes)
        current_mock_time[0] = current_time  # Update the mock time
        
        with patch('src.tasks.alerts.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = current_time
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
            
            should_skip = asyncio.run(_should_skip_alert_due_to_rate_limit(mock_session, alert_sub))
            
            if not should_skip:
                should_send_count += 1
                alert_record = Mock()
                alert_record.subscription_id = alert_sub.id
                alert_record.sent_at = current_time
                alert_history.append(alert_record)
    
    # Calculate expected sends: first alert always sends, then only if 60+ minutes have passed
    # Note: The first alert happens at cumulative_minutes = alert_intervals[0], not at time 0
    expected_sends = 1  # First alert always sends
    last_send_time = base_time + timedelta(minutes=alert_intervals[0])
    cumulative_minutes = alert_intervals[0]
    
    for i in range(1, len(alert_intervals)):
        cumulative_minutes += alert_intervals[i]
        current_time = base_time + timedelta(minutes=cumulative_minutes)
        time_since_last = (current_time - last_send_time).total_seconds()
        
        if time_since_last >= 3600:
            expected_sends += 1
            last_send_time = current_time
    
    assert should_send_count == expected_sends
