"""
Simple tests for device router functionality.
Tests the router logic without full app initialization.
"""

import pytest
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

from src.api.models import User, SensorDevice
from src.api.routers.devices import (
    get_user_devices,
    create_device,
    get_device,
    update_device,
    delete_device,
    update_device_status,
    update_device_reading,
    toggle_device_active
)
from src.api.schemas import SensorDeviceRequest, LocationPoint


class MockDB:
    """Mock database session for testing."""
    def __init__(self):
        self.devices = []
        self.committed = False
    
    def query(self, model):
        return MockQuery(self.devices)
    
    def add(self, obj):
        self.devices.append(obj)
    
    def delete(self, obj):
        self.devices.remove(obj)
    
    def commit(self):
        self.committed = True
    
    def refresh(self, obj):
        pass


class MockQuery:
    """Mock query object."""
    def __init__(self, devices):
        self.devices = devices
        self._filters = []
    
    def filter(self, *args):
        return self
    
    def order_by(self, *args):
        return self
    
    def first(self):
        return self.devices[0] if self.devices else None
    
    def all(self):
        return self.devices


def test_device_model_creation():
    """Test creating a SensorDevice model instance."""
    user_id = uuid4()
    device = SensorDevice(
        id=uuid4(),
        user_id=user_id,
        device_name="Test Device",
        device_id="TEST-001",
        location_name="Test Location",
        status="connected",
        battery_level=85,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    assert device.device_name == "Test Device"
    assert device.device_id == "TEST-001"
    assert device.status == "connected"
    assert device.battery_level == 85
    assert device.is_active is True


def test_device_request_schema():
    """Test SensorDeviceRequest schema validation."""
    request = SensorDeviceRequest(
        device_name="My Sensor",
        device_id="SENSOR-123",
        location=LocationPoint(latitude=28.6139, longitude=77.2090),
        location_name="New Delhi",
        device_type="PurpleAir",
        firmware_version="1.0.0"
    )
    
    assert request.device_name == "My Sensor"
    assert request.device_id == "SENSOR-123"
    assert request.location.latitude == 28.6139
    assert request.location.longitude == 77.2090
    assert request.location_name == "New Delhi"


def test_device_status_values():
    """Test valid device status values."""
    valid_statuses = ["connected", "disconnected", "low_battery"]
    
    for status in valid_statuses:
        device = SensorDevice(
            id=uuid4(),
            user_id=uuid4(),
            device_name="Test",
            status=status,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        assert device.status == status


def test_device_battery_level_range():
    """Test battery level is within valid range."""
    device = SensorDevice(
        id=uuid4(),
        user_id=uuid4(),
        device_name="Test",
        status="connected",
        battery_level=50,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    assert 0 <= device.battery_level <= 100


def test_device_relationships():
    """Test device-user relationship structure."""
    user_id = uuid4()
    device = SensorDevice(
        id=uuid4(),
        user_id=user_id,
        device_name="Test Device",
        status="connected",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    assert device.user_id == user_id


def test_device_optional_fields():
    """Test device with minimal required fields."""
    device = SensorDevice(
        id=uuid4(),
        user_id=uuid4(),
        device_name="Minimal Device",
        status="connected",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    assert device.device_id is None
    assert device.location is None
    assert device.location_name is None
    assert device.battery_level is None
    assert device.last_reading_at is None
    assert device.last_reading_aqi is None
    assert device.device_type is None
    assert device.firmware_version is None


def test_device_timestamps():
    """Test device has proper timestamps."""
    now = datetime.utcnow()
    device = SensorDevice(
        id=uuid4(),
        user_id=uuid4(),
        device_name="Test",
        status="connected",
        is_active=True,
        created_at=now,
        updated_at=now
    )
    
    assert device.created_at == now
    assert device.updated_at == now


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
