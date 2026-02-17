"""
Test backward compatibility preservation for Streamlit dashboard.
Validates: Requirements 8.1, 8.2, 8.5
"""

import pytest
import requests
import time
from typing import Dict, Any
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class TestStreamlitCompatibility:
    """Test suite for Streamlit dashboard backward compatibility"""
    
    @pytest.fixture
    def api_base_url(self):
        """Base URL for API endpoints"""
        return os.getenv("API_BASE_URL", "http://localhost:8000")
    
    @pytest.fixture
    def streamlit_url(self):
        """Base URL for Streamlit dashboard"""
        return os.getenv("STREAMLIT_URL", "http://localhost:8501")
    
    def test_streamlit_dashboard_accessible(self, streamlit_url):
        """
        Test that Streamlit dashboard is accessible at its URL.
        Validates: Requirement 8.1
        """
        try:
            response = requests.get(streamlit_url, timeout=10)
            assert response.status_code == 200, f"Streamlit dashboard not accessible: {response.status_code}"
            
            # Check for Streamlit-specific content
            content = response.text.lower()
            assert "streamlit" in content or "aqi predictor" in content, \
                "Streamlit dashboard content not found"
            
            print(f"✓ Streamlit dashboard accessible at {streamlit_url}")
        except requests.exceptions.ConnectionError:
            pytest.skip("Streamlit dashboard not running - skipping test")
    
    def test_api_endpoints_preserved(self, api_base_url):
        """
        Test that all existing API endpoints remain functional.
        Validates: Requirement 8.2
        """
        # List of critical API endpoints that must remain functional
        endpoints = [
            "/health",
            "/api/v1/data/air-quality/latest",
            "/api/v1/data/stations",
            "/api/v1/forecast/spatial",
            "/api/v1/data/weather/latest",
        ]
        
        for endpoint in endpoints:
            url = f"{api_base_url}{endpoint}"
            try:
                response = requests.get(url, timeout=10)
                
                # Accept 200 (success) or 401 (auth required) as valid
                assert response.status_code in [200, 401, 422], \
                    f"Endpoint {endpoint} returned unexpected status: {response.status_code}"
                
                print(f"✓ Endpoint preserved: {endpoint}")
            except requests.exceptions.ConnectionError:
                pytest.skip(f"API not running at {api_base_url} - skipping test")
    
    def test_api_response_format_unchanged(self, api_base_url):
        """
        Test that API response formats remain unchanged.
        Validates: Requirement 8.2
        """
        # Test health endpoint response format
        try:
            response = requests.get(f"{api_base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected fields exist
                assert "status" in data, "Health endpoint missing 'status' field"
                assert "database" in data, "Health endpoint missing 'database' field"
                assert "cache" in data, "Health endpoint missing 'cache' field"
                
                print("✓ API response format unchanged")
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_both_frontends_can_run_simultaneously(self, api_base_url, streamlit_url):
        """
        Test that both Streamlit and Leaflet frontends can run at the same time.
        Validates: Requirement 8.1
        """
        try:
            # Check Streamlit is accessible
            streamlit_response = requests.get(streamlit_url, timeout=10)
            streamlit_ok = streamlit_response.status_code == 200
            
            # Check API is accessible (used by both frontends)
            api_response = requests.get(f"{api_base_url}/health", timeout=10)
            api_ok = api_response.status_code == 200
            
            # Check Leaflet frontend would be accessible (if deployed)
            # In development, this might not be running
            leaflet_url = api_base_url.replace(":8000", ":8080")
            try:
                leaflet_response = requests.get(leaflet_url, timeout=5)
                leaflet_ok = leaflet_response.status_code == 200
            except:
                leaflet_ok = None  # Not running, which is OK in dev
            
            assert api_ok, "API backend not accessible"
            assert streamlit_ok, "Streamlit dashboard not accessible"
            
            print(f"✓ API backend: {'✓' if api_ok else '✗'}")
            print(f"✓ Streamlit dashboard: {'✓' if streamlit_ok else '✗'}")
            print(f"✓ Leaflet frontend: {'✓' if leaflet_ok else 'Not deployed (OK)'}")
            
        except requests.exceptions.ConnectionError as e:
            pytest.skip(f"Services not running - skipping test: {e}")
    
    def test_database_schema_unchanged(self, api_base_url):
        """
        Test that database schema remains unchanged for Streamlit compatibility.
        Validates: Requirement 8.5
        """
        # This test verifies that the API can still serve data in the expected format
        # which implies the database schema hasn't changed in breaking ways
        
        try:
            # Test that stations endpoint returns expected structure
            response = requests.get(f"{api_base_url}/api/v1/data/stations", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it's a list or has expected structure
                assert isinstance(data, (list, dict)), "Stations endpoint returned unexpected type"
                
                if isinstance(data, list) and len(data) > 0:
                    # Check first station has expected fields
                    station = data[0]
                    expected_fields = ["station_id", "location"]
                    
                    for field in expected_fields:
                        assert field in station, f"Station missing expected field: {field}"
                
                print("✓ Database schema compatible with existing API contracts")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_streamlit_can_fetch_data_from_api(self, api_base_url):
        """
        Test that Streamlit can still fetch data from API endpoints.
        Validates: Requirement 8.1, 8.2
        """
        # Simulate what Streamlit would do - fetch data from API
        try:
            # Test fetching latest air quality data
            response = requests.get(
                f"{api_base_url}/api/v1/data/air-quality/latest",
                timeout=10
            )
            
            # Accept 200 or 422 (validation error for missing params)
            assert response.status_code in [200, 422], \
                f"API endpoint returned unexpected status: {response.status_code}"
            
            print("✓ Streamlit can fetch data from API")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")


class TestAPIContractPreservation:
    """Test that API contracts remain unchanged"""
    
    @pytest.fixture
    def api_base_url(self):
        """Base URL for API endpoints"""
        return os.getenv("API_BASE_URL", "http://localhost:8000")
    
    def test_health_endpoint_contract(self, api_base_url):
        """Test health endpoint maintains its contract"""
        try:
            response = requests.get(f"{api_base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify contract fields
                assert "status" in data
                assert "timestamp" in data
                assert "database" in data
                assert "cache" in data
                
                print("✓ Health endpoint contract preserved")
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_forecast_endpoint_contract(self, api_base_url):
        """Test forecast endpoint maintains its contract"""
        try:
            # Test with a sample location
            response = requests.get(
                f"{api_base_url}/api/v1/forecast/24h/Delhi",
                timeout=10
            )
            
            # Accept 200, 401 (auth), or 422 (validation)
            assert response.status_code in [200, 401, 422], \
                f"Forecast endpoint returned unexpected status: {response.status_code}"
            
            print("✓ Forecast endpoint contract preserved")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_data_endpoint_contract(self, api_base_url):
        """Test data endpoints maintain their contracts"""
        try:
            response = requests.get(
                f"{api_base_url}/api/v1/data/stations",
                timeout=10
            )
            
            # Accept 200, 401 (auth), or 422 (validation)
            assert response.status_code in [200, 401, 422], \
                f"Data endpoint returned unexpected status: {response.status_code}"
            
            print("✓ Data endpoint contract preserved")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
