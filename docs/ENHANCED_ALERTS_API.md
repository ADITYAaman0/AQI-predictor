# Enhanced Alerts API Documentation

## Overview

This document describes the enhanced alert system endpoints that extend the basic alert functionality with:
- Detailed user preferences for alert notifications
- Push notification device token management
- Advanced notification controls (quiet hours, rate limiting, severity filtering)

## New Database Models

### UserAlertPreferences

Stores detailed notification preferences for each user.

**Fields:**
- `id`: UUID - Primary key
- `user_id`: UUID - Foreign key to users table (unique)
- `default_channels`: Array[String] - Default notification channels (email, sms, push)
- `quiet_hours_start`: Integer (0-23) - Start hour for quiet period
- `quiet_hours_end`: Integer (0-23) - End hour for quiet period
- `quiet_hours_enabled`: Boolean - Whether quiet hours are active
- `max_alerts_per_day`: Integer - Maximum alerts per day (1-100)
- `min_alert_interval_minutes`: Integer - Minimum time between alerts (5-1440)
- `alert_on_good`: Boolean - Send alerts for Good AQI (0-50)
- `alert_on_moderate`: Boolean - Send alerts for Moderate AQI (51-100)
- `alert_on_unhealthy_sensitive`: Boolean - Send alerts for Unhealthy for Sensitive Groups (101-150)
- `alert_on_unhealthy`: Boolean - Send alerts for Unhealthy (151-200)
- `alert_on_very_unhealthy`: Boolean - Send alerts for Very Unhealthy (201-300)
- `alert_on_hazardous`: Boolean - Send alerts for Hazardous (301+)
- `enable_daily_digest`: Boolean - Enable daily summary email
- `daily_digest_time`: Integer (0-23) - Hour to send daily digest
- `created_at`: DateTime - Creation timestamp
- `updated_at`: DateTime - Last update timestamp

### PushNotificationToken

Stores push notification device tokens for users.

**Fields:**
- `id`: UUID - Primary key
- `user_id`: UUID - Foreign key to users table
- `token`: Text - Push notification token (unique)
- `device_type`: String - Device type (ios, android, web)
- `device_name`: String - Optional device name
- `is_active`: Boolean - Whether token is active
- `last_used_at`: DateTime - Last time token was used
- `created_at`: DateTime - Creation timestamp
- `updated_at`: DateTime - Last update timestamp

## API Endpoints

### User Alert Preferences

#### GET /api/v1/alerts/preferences/detailed

Get detailed alert preferences for the authenticated user. Creates default preferences if none exist.

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "default_channels": ["email"],
  "quiet_hours_start": null,
  "quiet_hours_end": null,
  "quiet_hours_enabled": false,
  "max_alerts_per_day": 10,
  "min_alert_interval_minutes": 60,
  "alert_on_good": false,
  "alert_on_moderate": false,
  "alert_on_unhealthy_sensitive": true,
  "alert_on_unhealthy": true,
  "alert_on_very_unhealthy": true,
  "alert_on_hazardous": true,
  "enable_daily_digest": false,
  "daily_digest_time": null,
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

#### PUT /api/v1/alerts/preferences/detailed

Update detailed alert preferences. Only provided fields are updated.

**Authentication:** Required

**Request Body:**
```json
{
  "default_channels": ["email", "push"],
  "quiet_hours_start": 22,
  "quiet_hours_end": 7,
  "quiet_hours_enabled": true,
  "max_alerts_per_day": 5,
  "min_alert_interval_minutes": 120,
  "alert_on_moderate": true,
  "enable_daily_digest": true,
  "daily_digest_time": 8
}
```

**Validation Rules:**
- `default_channels`: Must contain at least one valid channel (email, sms, push)
- `quiet_hours_start/end`: Must be 0-23
- `max_alerts_per_day`: Must be 1-100
- `min_alert_interval_minutes`: Must be 5-1440
- `daily_digest_time`: Must be 0-23

**Response:** Same as GET endpoint

### Push Notification Tokens

#### POST /api/v1/alerts/push-tokens

Register a push notification token for the authenticated user. If the token already exists, it will be reactivated and updated.

**Authentication:** Required

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_type": "ios",
  "device_name": "iPhone 13 Pro"
}
```

**Validation Rules:**
- `token`: Minimum 10 characters
- `device_type`: Must be one of: ios, android, web
- `device_name`: Optional, maximum 200 characters

**Response:**
```json
{
  "id": "uuid",
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_type": "ios",
  "device_name": "iPhone 13 Pro",
  "is_active": true,
  "last_used_at": "2026-02-14T10:00:00Z",
  "created_at": "2026-02-14T10:00:00Z"
}
```

#### GET /api/v1/alerts/push-tokens

Get all push notification tokens for the authenticated user.

**Authentication:** Required

**Query Parameters:**
- `active_only` (boolean, default: true) - Return only active tokens

**Response:**
```json
[
  {
    "id": "uuid",
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "device_type": "ios",
    "device_name": "iPhone 13 Pro",
    "is_active": true,
    "last_used_at": "2026-02-14T10:00:00Z",
    "created_at": "2026-02-14T10:00:00Z"
  }
]
```

#### DELETE /api/v1/alerts/push-tokens/{token_id}

Delete (deactivate) a push notification token.

**Authentication:** Required

**Path Parameters:**
- `token_id` (UUID) - ID of the token to delete

**Response:**
```json
{
  "token_id": "uuid",
  "message": "Push notification token deactivated successfully"
}
```

#### POST /api/v1/alerts/push-tokens/test

Send a test push notification to all active devices for the authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "message": "Test notifications sent to 2 device(s)",
  "results": [
    {
      "token_id": "uuid",
      "device_name": "iPhone 13 Pro",
      "status": "delivered",
      "message": "Notification sent successfully"
    },
    {
      "token_id": "uuid",
      "device_name": "Chrome Browser",
      "status": "delivered",
      "message": "Notification sent successfully"
    }
  ]
}
```

## Usage Examples

### Setting Up User Preferences

```python
import requests

# Authenticate
token = "your_jwt_token"
headers = {"Authorization": f"Bearer {token}"}

# Get current preferences
response = requests.get(
    "http://localhost:8000/api/v1/alerts/preferences/detailed",
    headers=headers
)
preferences = response.json()

# Update preferences
update_data = {
    "default_channels": ["email", "push"],
    "quiet_hours_start": 22,
    "quiet_hours_end": 7,
    "quiet_hours_enabled": True,
    "max_alerts_per_day": 5,
    "alert_on_moderate": False,
    "alert_on_unhealthy_sensitive": True
}

response = requests.put(
    "http://localhost:8000/api/v1/alerts/preferences/detailed",
    json=update_data,
    headers=headers
)
updated_preferences = response.json()
```

### Registering Push Notification Token

```javascript
// React Native with Expo
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Permission for notifications was denied');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Register with backend
  const response = await fetch('http://localhost:8000/api/v1/alerts/push-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: token,
      device_type: 'ios',
      device_name: 'iPhone 13'
    })
  });
  
  const data = await response.json();
  console.log('Token registered:', data);
}
```

### Web Push Notifications

```javascript
// Service Worker registration
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('/sw.js')
    .then(async (registration) => {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'your_vapid_public_key'
      });
      
      // Register with backend
      const response = await fetch('http://localhost:8000/api/v1/alerts/push-tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: JSON.stringify(subscription),
          device_type: 'web',
          device_name: navigator.userAgent
        })
      });
      
      const data = await response.json();
      console.log('Web push registered:', data);
    });
}
```

## Database Migration

To apply the database changes, run:

```bash
# Generate migration (if using Alembic)
alembic revision --autogenerate -m "Add enhanced alert preferences"

# Apply migration
alembic upgrade head
```

Or use the provided migration file:

```bash
alembic upgrade add_enhanced_alert_prefs
```

## Integration with Existing Alert System

The enhanced preferences work seamlessly with the existing alert subscription system:

1. When an alert threshold is crossed, the system checks:
   - User's alert preferences (severity filters, quiet hours)
   - Rate limiting (max alerts per day, min interval)
   - Notification channels (including push tokens)

2. Push notifications are sent to all active tokens for the user

3. Alert history is recorded as before

## Testing

Run the test suite:

```bash
pytest tests/test_enhanced_alerts.py -v
```

## Security Considerations

1. **Token Security**: Push notification tokens are sensitive and should be:
   - Transmitted only over HTTPS
   - Stored securely in the database
   - Invalidated when users log out

2. **Rate Limiting**: The system enforces rate limits to prevent:
   - Notification spam
   - API abuse
   - Battery drain on mobile devices

3. **Authentication**: All endpoints require valid JWT authentication

## Future Enhancements

Potential future improvements:
- Geofencing alerts (notify when entering/leaving areas)
- Smart notification timing (ML-based optimal delivery times)
- Alert templates and customization
- Multi-language support for notifications
- Integration with third-party notification services (FCM, APNs)

## Support

For issues or questions, please contact the development team or file an issue in the project repository.
