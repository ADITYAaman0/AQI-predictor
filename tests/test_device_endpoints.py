"""
Tests for device management API endpoints.
"""

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.api.main import app
from src.api.models import User, SensorDevice
from src.api.auth import create_access_token


@pytest.fixture
def test_user(db_session: Session):
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="testuser@example.com",
        password_hash="hashed_password",
        full_name="Test User",
        is_active=True,
        is_verified=True,
        role="user"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User):
    """Create authentication headers."""
    token = create_access_token({"sub": test_user.email, "user_id": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_device(db_session: Session, test_user: User):
    """Create a test device."""
    device = SensorDevice(
        id=uuid4(),
        user_id=test_user.id,
        device_name="Test Device",
        device_id="TEST-001",
        location_name="Test Location",
        status="connected",
        battery_level=85,
        is_active=True
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)
    return device


class TestDeviceEndpoints:
    """Test device management endpoints."""
    
    def test_get_devices_empty(self, auth_headers):
        """Test getting devices when user has none."""
        client = TestClient(app)
        response = client.get("/api/v1/devices", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json() == []
    
    def test_create_device(self, auth_headers):
        """Test creating a new device."""
        client = TestClient(app)
        device_data = {
            "device_name": "My Air Quality Sensor",
            "device_id": "AQS-12345",
            "location": {
                "latitude": 28.6139,
                "longitude": 77.2090
            },
            "location_name": "New Delhi",
            "device_type": "PurpleAir PA-II",
            "firmware_version": "1.2.3"
        }
        
        response = client.post("/api/v1/devices", json=device_data, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["device_name"] == device_data["device_name"]
        assert data["device_id"] == device_data["device_id"]
        assert data["location_name"] == device_data["location_name"]
        assert data["status"] == "connected"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    def test_create_device_duplicate_id(self, auth_headers, test_device):
        """Test creating device with duplicate device_id."""
        client = TestClient(app)
        device_data = {
            "device_name": "Another Device",
            "device_id": test_device.device_id  # Duplicate
        }
        
        response = client.post("/api/v1/devices", json=device_data, headers=auth_headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
    
    def test_get_devices(self, auth_headers, test_device):
        """Test getting all user devices."""
        client = TestClient(app)
        response = client.get("/api/v1/devices", headers=auth_headers)
        
        assert response.status_code == 200
        devices = response.json()
        assert len(devices) >= 1
        assert any(d["id"] == str(test_device.id) for d in devices)
    
    def test_get_device_by_id(self, auth_headers, test_device):
        """Test getting a specific device."""
        client = TestClient(app)
        response = client.get(f"/api/v1/devices/{test_device.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_device.id)
        assert data["device_name"] == test_device.device_name
        assert data["status"] == test_device.status
    
    def test_get_device_not_found(self, auth_headers):
        """Test getting non-existent device."""
        client = TestClient(app)
        fake_id = uuid4()
        response = client.get(f"/api/v1/devices/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_device(self, auth_headers, test_device):
        """Test updating a device."""
        client = TestClient(app)
        update_data = {
            "device_name": "Updated Device Name",
            "device_id": "UPDATED-001",
            "location_name": "Updated Location",
            "device_type": "Updated Type",
            "firmware_version": "2.0.0"
        }
        
        response = client.put(
            f"/api/v1/devices/{test_device.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == update_data["device_name"]
        assert data["device_id"] == update_data["device_id"]
        assert data["firmware_version"] == update_data["firmware_version"]
    
    def test_update_device_status(self, auth_headers, test_device):
        """Test updating device status."""
        client = TestClient(app)
        response = client.patch(
            f"/api/v1/devices/{test_device.id}/status",
            params={"status": "low_battery", "battery_level": 15},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "low_battery"
        assert data["battery_level"] == 15
    
    def test_update_device_reading(self, auth_headers, test_device):
        """Test updating device reading."""
        client = TestClient(app)
        response = client.patch(
            f"/api/v1/devices/{test_device.id}/reading",
            params={"aqi_value": 125},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["last_reading_aqi"] == 125
        assert "last_reading_at" in data
    
    def test_toggle_device_active(self, auth_headers, test_device):
        """Test toggling device active status."""
        client = TestClient(app)
        initial_status = test_device.is_active
        
        response = client.patch(
            f"/api/v1/devices/{test_device.id}/toggle",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] != initial_status
    
    def test_delete_device(self, auth_headers, test_device):
        """Test deleting a device."""
        client = TestClient(app)
        response = client.delete(
            f"/api/v1/devices/{test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify device is deleted
        get_response = client.get(
            f"/api/v1/devices/{test_device.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    def test_unauthorized_access(self):
        """Test accessing endpoints without authentication."""
        client = TestClient(app)
        
        # Test GET
        response = client.get("/api/v1/devices")
        assert response.status_code == 401
        
        # Test POST
        response = client.post("/api/v1/devices", json={"device_name": "Test"})
        assert response.status_code == 401
        
        # Test DELETE
        fake_id = uuid4()
        response = client.delete(f"/api/v1/devices/{fake_id}")
        assert response.status_code == 401
