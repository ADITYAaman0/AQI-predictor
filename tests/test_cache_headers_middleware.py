"""
Tests for cache headers middleware.
Validates HTTP cache headers are properly set according to requirements.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch
import hashlib

from src.api.middleware import CacheHeadersMiddleware


class TestCacheHeadersMiddleware:
    """Test the CacheHeadersMiddleware functionality."""
    
    @pytest.fixture
    def app_with_cache_middleware(self):
        """Create a test FastAPI app with cache headers middleware."""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)
        
        @app.get("/api/v1/forecast/current/delhi")
        async def mock_current_forecast():
            return {"aqi": 150, "timestamp": "2024-01-15T10:30:00Z"}
        
        @app.get("/api/v1/forecast/24h/delhi")
        async def mock_24h_forecast():
            return {"forecasts": [{"hour": 1, "aqi": 145}]}
        
        @app.get("/api/v1/forecast/spatial")
        async def mock_spatial_forecast():
            return {"grid_predictions": [{"lat": 28.6, "lon": 77.2, "aqi": 140}]}
        
        @app.get("/api/v1/attribution/delhi")
        async def mock_attribution():
            return {"vehicular": 45, "industrial": 30}
        
        @app.get("/api/v1/data/stations")
        async def mock_stations():
            return {"stations": [{"id": "DL001", "name": "Anand Vihar"}]}
        
        @app.get("/health")
        async def mock_health():
            return {"status": "healthy"}
        
        @app.get("/api/v1/other")
        async def mock_other():
            return {"data": "test"}
        
        @app.post("/api/v1/forecast/current/delhi")
        async def mock_post():
            return {"message": "created"}
        
        @app.get("/api/v1/error")
        async def mock_error():
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="Test error")
        
        return app
    
    @pytest.fixture
    def client(self, app_with_cache_middleware):
        """Create a test client."""
        return TestClient(app_with_cache_middleware)
    
    def test_current_forecast_cache_headers(self, client):
        """Test cache headers for current forecast endpoint."""
        response = client.get("/api/v1/forecast/current/delhi")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=300, must-revalidate" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_24h_forecast_cache_headers(self, client):
        """Test cache headers for 24h forecast endpoint."""
        response = client.get("/api/v1/forecast/24h/delhi")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=3600, must-revalidate" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_spatial_forecast_cache_headers(self, client):
        """Test cache headers for spatial forecast endpoint."""
        response = client.get("/api/v1/forecast/spatial")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=3600" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_attribution_cache_headers(self, client):
        """Test cache headers for attribution endpoint."""
        response = client.get("/api/v1/attribution/delhi")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=1800" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_stations_cache_headers(self, client):
        """Test cache headers for stations endpoint."""
        response = client.get("/api/v1/data/stations")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=86400" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_health_cache_headers(self, client):
        """Test cache headers for health endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public, max-age=60" in response.headers["Cache-Control"]
        assert "ETag" in response.headers
        assert "Last-Modified" in response.headers
    
    def test_other_endpoint_cache_headers(self, client):
        """Test cache headers for endpoints without specific policy."""
        response = client.get("/api/v1/other")
        
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "no-cache, must-revalidate" in response.headers["Cache-Control"]
    
    def test_post_request_no_cache_headers(self, client):
        """Test that POST requests don't get cache headers."""
        response = client.post("/api/v1/forecast/current/delhi")
        
        assert response.status_code == 200
        # Should not have cache headers for non-GET requests
        assert "Cache-Control" not in response.headers or "no-cache" in response.headers.get("Cache-Control", "")
    
    def test_error_response_cache_headers(self, client):
        """Test cache headers for error responses."""
        response = client.get("/api/v1/error")
        
        assert response.status_code == 500
        assert "Cache-Control" in response.headers
        assert "no-cache, no-store, must-revalidate" in response.headers["Cache-Control"]
        assert "Pragma" in response.headers
        assert response.headers["Pragma"] == "no-cache"
        assert "Expires" in response.headers
        assert response.headers["Expires"] == "0"
    
    def test_etag_generation(self, client):
        """Test ETag generation for responses."""
        response = client.get("/api/v1/forecast/current/delhi")
        
        assert response.status_code == 200
        assert "ETag" in response.headers
        
        # ETag should be a quoted MD5 hash
        etag = response.headers["ETag"]
        assert etag.startswith('"') and etag.endswith('"')
        
        # Verify ETag is consistent for same content
        response2 = client.get("/api/v1/forecast/current/delhi")
        assert response2.headers["ETag"] == etag
    
    def test_conditional_request_with_etag(self, client):
        """Test conditional requests using ETag."""
        # First request to get ETag
        response1 = client.get("/api/v1/forecast/current/delhi")
        etag = response1.headers["ETag"]
        
        # Second request with If-None-Match header
        response2 = client.get(
            "/api/v1/forecast/current/delhi",
            headers={"If-None-Match": etag}
        )
        
        # Should return 304 Not Modified
        assert response2.status_code == 304
        assert "ETag" in response2.headers
    
    def test_last_modified_header_format(self, client):
        """Test Last-Modified header format."""
        response = client.get("/api/v1/forecast/current/delhi")
        
        assert response.status_code == 200
        assert "Last-Modified" in response.headers
        
        # Should be in HTTP date format
        last_modified = response.headers["Last-Modified"]
        assert "GMT" in last_modified
        
        # Should be parseable as HTTP date
        from email.utils import parsedate
        parsed_date = parsedate(last_modified)
        assert parsed_date is not None
    
    def test_cache_policy_configuration(self):
        """Test that cache policies are properly configured."""
        middleware = CacheHeadersMiddleware(None)
        
        # Verify all required endpoints have cache policies
        assert "/api/v1/forecast/current/" in middleware.cache_policies
        assert "/api/v1/forecast/24h/" in middleware.cache_policies
        assert "/api/v1/forecast/spatial" in middleware.cache_policies
        assert "/api/v1/attribution/" in middleware.cache_policies
        assert "/api/v1/data/stations" in middleware.cache_policies
        assert "/health" in middleware.cache_policies
        
        # Verify TTL values match requirements
        current_policy = middleware.cache_policies["/api/v1/forecast/current/"]
        assert current_policy["max_age"] == 300  # 5 minutes
        
        forecast_policy = middleware.cache_policies["/api/v1/forecast/24h/"]
        assert forecast_policy["max_age"] == 3600  # 1 hour
        
        spatial_policy = middleware.cache_policies["/api/v1/forecast/spatial"]
        assert spatial_policy["max_age"] == 3600  # 1 hour
        
        attribution_policy = middleware.cache_policies["/api/v1/attribution/"]
        assert attribution_policy["max_age"] == 1800  # 30 minutes
        
        stations_policy = middleware.cache_policies["/api/v1/data/stations"]
        assert stations_policy["max_age"] == 86400  # 24 hours
        
        health_policy = middleware.cache_policies["/health"]
        assert health_policy["max_age"] == 60  # 1 minute


if __name__ == "__main__":
    pytest.main([__file__])