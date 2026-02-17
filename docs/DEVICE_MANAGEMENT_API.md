# Device Management API Documentation

## Overview

The Device Management API provides endpoints for managing user-connected air quality sensor devices. Users can register their personal sensors, monitor device status, and track readings.

## Base URL

```
/api/v1/devices
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### 1. Get All User Devices

**GET** `/api/v1/devices`

Retrieve all sensor devices for the authenticated user.

**Query Parameters:**
- `active_only` (boolean, optional): Filter to return only active devices. Default: `true`

**Response:** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "device_name": "Living Room Sensor",
    "device_id": "AQS-12345",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "location_name": "New Delhi",
    "status": "connected",
    "battery_level": 85,
    "last_reading_at": "2024-02-14T10:30:00Z",
    "last_reading_aqi": 125,
    "device_type": "PurpleAir PA-II",
    "firmware_version": "1.2.3",
    "is_active": true,
    "created_at": "2024-02-01T08:00:00Z",
    "updated_at": "2024-02-14T10:30:00Z"
  }
]
```

### 2. Create Device

**POST** `/api/v1/devices`

Register a new sensor device for the authenticated user.

**Request Body:**

```json
{
  "device_name": "Living Room Sensor",
  "device_id": "AQS-12345",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "location_name": "New Delhi",
  "device_type": "PurpleAir PA-II",
  "firmware_version": "1.2.3"
}
```

**Required Fields:**
- `device_name` (string): Human-readable name for the device

**Optional Fields:**
- `device_id` (string): External device identifier (must be unique)
- `location` (object): Geographic coordinates
- `location_name` (string): Human-readable location name
- `device_type` (string): Device model/type
- `firmware_version` (string): Firmware version

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "Living Room Sensor",
  "device_id": "AQS-12345",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "location_name": "New Delhi",
  "status": "connected",
  "battery_level": null,
  "last_reading_at": null,
  "last_reading_aqi": null,
  "device_type": "PurpleAir PA-II",
  "firmware_version": "1.2.3",
  "is_active": true,
  "created_at": "2024-02-14T10:30:00Z",
  "updated_at": "2024-02-14T10:30:00Z"
}
```

**Error Responses:**
- `409 Conflict`: Device with the same `device_id` already exists

### 3. Get Device by ID

**GET** `/api/v1/devices/{device_id}`

Retrieve a specific sensor device by its UUID.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "Living Room Sensor",
  "device_id": "AQS-12345",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "location_name": "New Delhi",
  "status": "connected",
  "battery_level": 85,
  "last_reading_at": "2024-02-14T10:30:00Z",
  "last_reading_aqi": 125,
  "device_type": "PurpleAir PA-II",
  "firmware_version": "1.2.3",
  "is_active": true,
  "created_at": "2024-02-01T08:00:00Z",
  "updated_at": "2024-02-14T10:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Device not found or doesn't belong to the user

### 4. Update Device

**PUT** `/api/v1/devices/{device_id}`

Update an existing sensor device.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Request Body:**

```json
{
  "device_name": "Updated Device Name",
  "device_id": "AQS-12345-NEW",
  "location": {
    "latitude": 28.7041,
    "longitude": 77.1025
  },
  "location_name": "Updated Location",
  "device_type": "Updated Type",
  "firmware_version": "2.0.0"
}
```

**Response:** `200 OK`

Returns the updated device object.

**Error Responses:**
- `404 Not Found`: Device not found
- `409 Conflict`: New `device_id` conflicts with existing device

### 5. Delete Device

**DELETE** `/api/v1/devices/{device_id}`

Delete a sensor device.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Response:** `200 OK`

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Device deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Device not found

### 6. Update Device Status

**PATCH** `/api/v1/devices/{device_id}/status`

Update device status and battery level.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Query Parameters:**
- `status` (string, required): New status. Valid values: `connected`, `disconnected`, `low_battery`
- `battery_level` (integer, optional): Battery level (0-100)

**Response:** `200 OK`

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "low_battery",
  "battery_level": 15,
  "message": "Device status updated successfully"
}
```

**Error Responses:**
- `404 Not Found`: Device not found
- `422 Unprocessable Entity`: Invalid status value or battery level

### 7. Update Device Reading

**PATCH** `/api/v1/devices/{device_id}/reading`

Update device's last reading data.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Query Parameters:**
- `aqi_value` (integer, required): Latest AQI reading (0-500)

**Response:** `200 OK`

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "last_reading_aqi": 125,
  "last_reading_at": "2024-02-14T10:30:00Z",
  "message": "Device reading updated successfully"
}
```

**Error Responses:**
- `404 Not Found`: Device not found
- `422 Unprocessable Entity`: Invalid AQI value (must be 0-500)

### 8. Toggle Device Active Status

**PATCH** `/api/v1/devices/{device_id}/toggle`

Toggle the active status of a device.

**Path Parameters:**
- `device_id` (UUID): The device's unique identifier

**Response:** `200 OK`

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_active": false,
  "message": "Device deactivated"
}
```

**Error Responses:**
- `404 Not Found`: Device not found

## Device Status Values

- `connected`: Device is online and functioning normally
- `disconnected`: Device is offline or unreachable
- `low_battery`: Device battery is below threshold (typically <20%)

## Data Models

### SensorDevice

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique device identifier |
| device_name | string | Human-readable device name |
| device_id | string | External device identifier (optional) |
| location | LocationPoint | Geographic coordinates (optional) |
| location_name | string | Human-readable location (optional) |
| status | string | Device status (connected/disconnected/low_battery) |
| battery_level | integer | Battery level 0-100 (optional) |
| last_reading_at | datetime | Timestamp of last reading (optional) |
| last_reading_aqi | integer | Last AQI reading 0-500 (optional) |
| device_type | string | Device model/type (optional) |
| firmware_version | string | Firmware version (optional) |
| is_active | boolean | Whether device is active |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### LocationPoint

| Field | Type | Description |
|-------|------|-------------|
| latitude | float | Latitude coordinate |
| longitude | float | Longitude coordinate |

## Usage Examples

### Python (requests)

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "your_access_token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Create a device
device_data = {
    "device_name": "My Air Quality Sensor",
    "device_id": "AQS-12345",
    "location": {
        "latitude": 28.6139,
        "longitude": 77.2090
    },
    "location_name": "New Delhi"
}

response = requests.post(
    f"{BASE_URL}/devices",
    json=device_data,
    headers=headers
)
device = response.json()
print(f"Created device: {device['id']}")

# Get all devices
response = requests.get(f"{BASE_URL}/devices", headers=headers)
devices = response.json()
print(f"Total devices: {len(devices)}")

# Update device reading
device_id = device['id']
response = requests.patch(
    f"{BASE_URL}/devices/{device_id}/reading",
    params={"aqi_value": 125},
    headers=headers
)
print(response.json())
```

### JavaScript (fetch)

```javascript
const BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN = 'your_access_token';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

// Create a device
const deviceData = {
  device_name: 'My Air Quality Sensor',
  device_id: 'AQS-12345',
  location: {
    latitude: 28.6139,
    longitude: 77.2090
  },
  location_name: 'New Delhi'
};

fetch(`${BASE_URL}/devices`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(deviceData)
})
  .then(response => response.json())
  .then(device => {
    console.log('Created device:', device.id);
    
    // Update device status
    return fetch(`${BASE_URL}/devices/${device.id}/status?status=connected&battery_level=85`, {
      method: 'PATCH',
      headers: headers
    });
  })
  .then(response => response.json())
  .then(result => console.log(result));
```

## Database Schema

The `sensor_devices` table structure:

```sql
CREATE TABLE sensor_devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(200) NOT NULL,
    device_id VARCHAR(100) UNIQUE,
    location GEOMETRY(POINT, 4326),
    location_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'connected',
    battery_level INTEGER,
    last_reading_at TIMESTAMP WITH TIME ZONE,
    last_reading_aqi INTEGER,
    device_type VARCHAR(100),
    firmware_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user ON sensor_devices(user_id);
CREATE INDEX idx_devices_status ON sensor_devices(status);
CREATE INDEX idx_devices_active ON sensor_devices(is_active);
CREATE INDEX idx_devices_location ON sensor_devices USING GIST(location);
```

## Migration

To apply the database migration:

```bash
alembic upgrade head
```

This will create the `sensor_devices` table and all necessary indexes.

## Notes

- All endpoints require authentication
- Users can only access their own devices
- Device IDs must be unique across all users
- Location coordinates use WGS84 (SRID 4326)
- Battery level is optional and should be 0-100
- AQI readings should be 0-500
- Timestamps are in UTC with timezone information
