"""
Tests for enhanced alert endpoints including preferences and push tokens.
"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime

from src.api.main import app
from src.api.database import get_db
from src.api.models import User, UserAlertPreferences, PushNotificationToken
from src.api.auth import create_access_token


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
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
def auth_headers(test_user):
    """Create authentication headers."""
    token = create_access_token({"sub": test_user.email, "user_id": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


class TestUserAlertPreferences:
    """Test user alert preferences endpoints."""
    
    def test_get_default_preferences(self, client, auth_headers, test_user):
        """Test getting default preferences when none exist."""
        response = client.get("/api/v1/alerts/preferences/detailed", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == str(test_user.id)
        assert data["default_channels"] == ["email"]
        assert data["quiet_hours_enabled"] is False
        assert data["max_alerts_per_day"] == 10
        assert data["min_alert_interval_minutes"] == 60
        assert data["alert_on_unhealthy_sensitive"] is True
        assert data["alert_on_hazardous"] is True
        assert data["enable_daily_digest"] is False
    
    def test_update_preferences(self, client, auth_headers, test_user):
        """Test updating user preferences."""
        update_data = {
            "default_channels": ["email", "push"],
            "quiet_hours_start": 22,
            "quiet_hours_end": 7,
            "quiet_hours_enabled": True,
            "max_alerts_per_day": 5,
            "min_alert_interval_minutes": 120,
            "alert_on_moderate": True,
            "enable_daily_digest": True,
            "daily_digest_time": 8
        }
        
        response = client.put(
            "/api/v1/alerts/preferences/detailed",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["default_channels"] == ["email", "push"]
        assert data["quiet_hours_start"] == 22
        assert data["quiet_hours_end"] == 7
        assert data["quiet_hours_enabled"] is True
        assert data["max_alerts_per_day"] == 5
        assert data["min_alert_interval_minutes"] == 120
        assert data["alert_on_moderate"] is True
        assert data["enable_daily_digest"] is True
        assert data["daily_digest_time"] == 8
    
    def test_partial_update_preferences(self, client, auth_headers, test_user):
        """Test partial update of preferences."""
        # First create preferences
        client.get("/api/v1/alerts/preferences/detailed", headers=auth_headers)
        
        # Update only some fields
        update_data = {
            "max_alerts_per_day": 15,
            "alert_on_good": True
        }
        
        response = client.put(
            "/api/v1/alerts/preferences/detailed",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["max_alerts_per_day"] == 15
        assert data["alert_on_good"] is True
        # Other fields should remain at defaults
        assert data["default_channels"] == ["email"]
    
    def test_invalid_channels(self, client, auth_headers):
        """Test validation of invalid notification channels."""
        update_data = {
            "default_channels": ["email", "invalid_channel"]
        }
        
        response = client.put(
            "/api/v1/alerts/preferences/detailed",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_invalid_quiet_hours(self, client, auth_headers):
        """Test validation of invalid quiet hours."""
        update_data = {
            "quiet_hours_start": 25  # Invalid hour
        }
        
        response = client.put(
            "/api/v1/alerts/preferences/detailed",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error


class TestPushNotificationTokens:
    """Test push notification token management endpoints."""
    
    def test_register_push_token(self, client, auth_headers, test_user):
        """Test registering a new push token."""
        token_data = {
            "token": "test_push_token_12345",
            "device_type": "ios",
            "device_name": "iPhone 13"
        }
        
        response = client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["token"] == "test_push_token_12345"
        assert data["device_type"] == "ios"
        assert data["device_name"] == "iPhone 13"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    def test_register_duplicate_token(self, client, auth_headers, test_user):
        """Test registering a duplicate token reactivates it."""
        token_data = {
            "token": "duplicate_token_12345",
            "device_type": "android",
            "device_name": "Pixel 6"
        }
        
        # Register first time
        response1 = client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        token_id1 = response1.json()["id"]
        
        # Register again with same token
        token_data["device_name"] = "Pixel 7"  # Different device name
        response2 = client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
        token_id2 = response2.json()["id"]
        
        # Should be the same token, updated
        assert token_id1 == token_id2
        assert response2.json()["device_name"] == "Pixel 7"
    
    def test_get_push_tokens(self, client, auth_headers, test_user):
        """Test getting all push tokens for a user."""
        # Register multiple tokens
        tokens = [
            {"token": "token1", "device_type": "ios", "device_name": "iPhone"},
            {"token": "token2", "device_type": "android", "device_name": "Android"},
            {"token": "token3", "device_type": "web", "device_name": "Chrome"}
        ]
        
        for token_data in tokens:
            client.post(
                "/api/v1/alerts/push-tokens",
                json=token_data,
                headers=auth_headers
            )
        
        # Get all tokens
        response = client.get("/api/v1/alerts/push-tokens", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3
        assert all(token["is_active"] for token in data)
    
    def test_delete_push_token(self, client, auth_headers, test_user):
        """Test deleting (deactivating) a push token."""
        # Register a token
        token_data = {
            "token": "token_to_delete",
            "device_type": "ios",
            "device_name": "iPhone"
        }
        
        response = client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        token_id = response.json()["id"]
        
        # Delete the token
        response = client.delete(
            f"/api/v1/alerts/push-tokens/{token_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "deactivated successfully" in response.json()["message"]
        
        # Verify token is deactivated
        response = client.get(
            "/api/v1/alerts/push-tokens?active_only=false",
            headers=auth_headers
        )
        tokens = response.json()
        deleted_token = next(t for t in tokens if t["id"] == token_id)
        assert deleted_token["is_active"] is False
    
    def test_invalid_device_type(self, client, auth_headers):
        """Test validation of invalid device type."""
        token_data = {
            "token": "test_token",
            "device_type": "invalid_type",  # Invalid
            "device_name": "Device"
        }
        
        response = client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_test_push_notification(self, client, auth_headers, test_user):
        """Test sending a test push notification."""
        # Register a token first
        token_data = {
            "token": "test_notification_token",
            "device_type": "web",
            "device_name": "Chrome Browser"
        }
        
        client.post(
            "/api/v1/alerts/push-tokens",
            json=token_data,
            headers=auth_headers
        )
        
        # Send test notification
        response = client.post(
            "/api/v1/alerts/push-tokens/test",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "Test notifications sent" in data["message"]
        assert "results" in data
        assert len(data["results"]) > 0
    
    def test_test_push_no_tokens(self, client, auth_headers):
        """Test sending test notification with no registered tokens."""
        response = client.post(
            "/api/v1/alerts/push-tokens/test",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "No active push notification tokens found" in response.json()["detail"]


class TestAuthenticationRequired:
    """Test that endpoints require authentication."""
    
    def test_preferences_requires_auth(self, client):
        """Test that preferences endpoint requires authentication."""
        response = client.get("/api/v1/alerts/preferences/detailed")
        assert response.status_code == 401
    
    def test_push_tokens_requires_auth(self, client):
        """Test that push tokens endpoint requires authentication."""
        response = client.get("/api/v1/alerts/push-tokens")
        assert response.status_code == 401
    
    def test_register_token_requires_auth(self, client):
        """Test that registering token requires authentication."""
        token_data = {
            "token": "test_token",
            "device_type": "ios",
            "device_name": "iPhone"
        }
        response = client.post("/api/v1/alerts/push-tokens", json=token_data)
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
