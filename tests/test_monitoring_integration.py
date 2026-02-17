"""
Integration tests for performance monitoring endpoints.
Tests the complete monitoring system including API endpoints and background tasks.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import json

from src.api.main import app
from src.api.auth import get_current_user
from src.api.monitoring import get_performance_monitor


class TestMonitoringIntegration:
    """Test monitoring system integration."""
    
    @pytest.fixture
    def client(self):
        """Create test client with mocked dependencies."""
        # Mock authentication dependency
        def mock_get_current_user():
            return {
                "id": "test-user-id",
                "email": "test@example.com",
                "role": "admin"
            }
        
        # Mock performance monitor dependency
        def mock_get_performance_monitor():
            mock_monitor = Mock()
            mock_monitor.get_performance_summary = AsyncMock(return_value={
                "total_requests": 1000,
                "error_requests": 25,
                "current_cpu_percent": 45.2,
                "current_memory_percent": 65.3,
                "timestamp": "2024-01-15T10:30:00Z"
            })
            mock_monitor.get_system_metrics = AsyncMock(return_value=[])
            mock_monitor.get_model_performance = AsyncMock(return_value=[])
            mock_monitor.get_request_metrics = AsyncMock(return_value=[])
            mock_monitor.record_system_metrics = AsyncMock(return_value=Mock(
                to_dict=Mock(return_value={
                    "cpu_percent": 45.2,
                    "memory_percent": 65.3,
                    "timestamp": "2024-01-15T10:30:00Z"
                })
            ))
            mock_monitor.record_model_performance = AsyncMock()
            return mock_monitor
        
        # Override dependencies
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_performance_monitor] = mock_get_performance_monitor
        
        # Mock database and Redis connections
        with patch('src.api.database.init_db'), \
             patch('src.api.cache.init_redis'), \
             patch('src.api.database.close_db'), \
             patch('src.api.cache.close_redis'):
            
            client = TestClient(app)
            yield client
        
        # Clean up dependency overrides
        app.dependency_overrides.clear()
    
    def test_monitoring_endpoints_exist(self, client):
        """Test that monitoring endpoints are registered."""
        # Test OpenAPI schema includes monitoring endpoints
        response = client.get("/docs")
        assert response.status_code == 200
        
        # Test that the monitoring router is included
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_spec = response.json()
        paths = openapi_spec.get("paths", {})
        
        # Check for monitoring endpoints
        monitoring_endpoints = [
            "/api/v1/monitoring/summary",
            "/api/v1/monitoring/requests",
            "/api/v1/monitoring/system",
            "/api/v1/monitoring/models",
            "/api/v1/monitoring/alerts",
            "/api/v1/monitoring/dashboard"
        ]
        
        for endpoint in monitoring_endpoints:
            assert endpoint in paths, f"Monitoring endpoint {endpoint} not found in OpenAPI spec"
    
    def test_performance_summary_endpoint(self, client):
        """Test performance summary endpoint."""
        response = client.get("/api/v1/monitoring/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_requests" in data
        assert "current_cpu_percent" in data
        assert "timestamp" in data
    
    def test_system_metrics_endpoint(self, client):
        """Test system metrics endpoint."""
        response = client.get("/api/v1/monitoring/system?hours=1")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_model_performance_endpoint(self, client):
        """Test model performance endpoint."""
        response = client.get("/api/v1/monitoring/models?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_performance_alerts_endpoint(self, client):
        """Test performance alerts endpoint."""
        response = client.get("/api/v1/monitoring/alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data
        assert "warnings" in data
        assert "alert_count" in data
        assert "warning_count" in data
    
    def test_monitoring_dashboard_endpoint(self, client):
        """Test monitoring dashboard endpoint."""
        response = client.get("/api/v1/monitoring/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "kpis" in data
        assert "recent_requests" in data
        assert "system_metrics" in data
        assert "model_performance" in data
        assert "timestamp" in data
        
        # Check KPIs calculation
        kpis = data["kpis"]
        assert "total_requests" in kpis
        assert "error_rate_percent" in kpis
        assert "avg_response_time_ms" in kpis
    
    def test_performance_middleware_integration(self, client):
        """Test that performance middleware is working."""
        # Make a request to any endpoint
        response = client.get("/health")
        assert response.status_code == 200
        
        # Check that performance headers are added
        assert "X-Response-Time" in response.headers
        assert "ms" in response.headers["X-Response-Time"]
    
    def test_manual_system_metrics_collection(self, client):
        """Test manual system metrics collection endpoint."""
        response = client.post(
            "/api/v1/monitoring/system/collect",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "metrics" in data
        assert "message" in data
    
    def test_model_performance_recording(self, client):
        """Test model performance recording endpoint."""
        response = client.post(
            "/api/v1/monitoring/models/ensemble/performance",
            params={
                "model_version": "1.0.0",
                "rmse": 18.5,
                "mae": 14.2,
                "accuracy": 78.5,
                "prediction_count": 150,
                "avg_response_time_ms": 125.3
            },
            headers={"Content-Type": "application/json"}
        )
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.content}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "metrics" in data
        assert data["metrics"]["model_name"] == "ensemble"
        assert data["metrics"]["rmse"] == 18.5
    
    def test_authentication_required(self, client):
        """Test that monitoring endpoints require authentication."""
        # Clear dependency overrides to test real authentication
        app.dependency_overrides.clear()
        
        # Create a new client without mocked authentication
        with patch('src.api.database.init_db'), \
             patch('src.api.cache.init_redis'), \
             patch('src.api.database.close_db'), \
             patch('src.api.cache.close_redis'):
            test_client = TestClient(app)
        
        # Test without authentication
        response = test_client.get("/api/v1/monitoring/summary")
        assert response.status_code == 401  # Unauthorized
        
        response = test_client.get("/api/v1/monitoring/dashboard")
        assert response.status_code == 401  # Unauthorized


if __name__ == "__main__":
    pytest.main([__file__])