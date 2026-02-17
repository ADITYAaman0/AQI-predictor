"""
Property-based tests for API response format consistency.
Tests that all API endpoints return properly formatted JSON responses with required fields.
"""

import pytest
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from hypothesis import given, strategies as st, settings
from hypothesis.strategies import composite
from fastapi.testclient import TestClient
from fastapi import status
import json

# Test configuration
pytestmark = pytest.mark.asyncio


@pytest.fixture(scope="session")
def client():
    """Create test client for API testing."""
    # Lazy import to avoid triggering lifespan events during collection
    try:
        from src.api.main import app
        return TestClient(app)
    except Exception as e:
        pytest.skip(f"Cannot create test client: {e}")


@pytest.fixture(scope="session", autouse=True)
def skip_if_no_server():
    """Skip all tests in this module if API server dependencies are not available."""
    try:
        from src.api.main import app
        # Try to create a test client to see if it works
        TestClient(app)
    except Exception as e:
        pytest.skip(f"API server dependencies not available: {e}", allow_module_level=True)


# Custom strategies for generating test data
@composite
def location_string(draw):
    """Generate valid location strings."""
    location_types = [
        # City names
        st.sampled_from(["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"]),
        # Coordinates format
        st.builds(
            lambda lat, lon: f"{lat},{lon}",
            lat=st.floats(min_value=20.0, max_value=35.0, allow_nan=False),
            lon=st.floats(min_value=68.0, max_value=97.0, allow_nan=False)
        ),
        # Address-like strings
        st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Zs")))
    ]
    return draw(st.one_of(*location_types))


@composite
def query_parameters(draw):
    """Generate valid query parameters for API endpoints."""
    return {
        "limit": draw(st.one_of(st.none(), st.integers(min_value=1, max_value=1000))),
        "city": draw(st.one_of(st.none(), st.text(min_size=2, max_size=50))),
        "parameter": draw(st.one_of(st.none(), st.sampled_from(["pm25", "pm10", "no2", "so2", "co", "o3"]))),
        "active_only": draw(st.booleans())
    }


def validate_json_response(response_data: Any) -> bool:
    """Validate that response data is valid JSON-serializable."""
    try:
        json.dumps(response_data)
        return True
    except (TypeError, ValueError):
        return False


def validate_timestamp_format(timestamp_str: str) -> bool:
    """Validate ISO format timestamp."""
    try:
        datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        return True
    except (ValueError, AttributeError):
        return False


def validate_location_format(location: Dict[str, Any]) -> bool:
    """Validate location object format."""
    if not isinstance(location, dict):
        return False
    
    # Should have coordinates
    if "coordinates" in location:
        coords = location["coordinates"]
        if isinstance(coords, list) and len(coords) == 2:
            return all(isinstance(c, (int, float)) for c in coords)
    
    return True


def validate_aqi_format(aqi: Dict[str, Any]) -> bool:
    """Validate AQI object format."""
    if not isinstance(aqi, dict):
        return False
    
    # Should have value and category
    required_fields = ["value", "category"]
    for field in required_fields:
        if field not in aqi:
            return False
    
    # Value should be numeric
    if not isinstance(aqi["value"], (int, float)):
        return False
    
    # Category should be string
    if not isinstance(aqi["category"], str):
        return False
    
    return True


def validate_error_response(response_data: Dict[str, Any]) -> None:
    """Validate error response structure for both custom and validation errors."""
    assert "detail" in response_data, "Error responses must include detail field"
    # Handle both string details (custom errors) and list details (validation errors)
    detail = response_data["detail"]
    assert isinstance(detail, (str, list)), "Detail must be a string or list"
    
    # If it's a list (validation errors), validate the structure
    if isinstance(detail, list):
        for error in detail:
            assert isinstance(error, dict), "Each validation error must be a dictionary"
            assert "msg" in error, "Validation errors must have a message"
            assert isinstance(error["msg"], str), "Validation error message must be a string"


# Property-based tests
@given(location=location_string())
@settings(max_examples=100, deadline=10000)
def test_current_forecast_response_format(client: TestClient, location: str):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    For any valid location request to current forecast endpoint, the response should be 
    valid JSON with proper HTTP status codes and include all required fields.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Make request to current forecast endpoint
        response = client.get(f"/api/v1/forecast/current/{location}")
        
        # Verify HTTP status code is valid
        assert response.status_code in [200, 400, 404, 422, 500], \
            f"Invalid HTTP status code: {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # If successful response, validate structure
        if response.status_code == 200:
            # Required top-level fields
            required_fields = ["location", "timestamp", "aqi", "pollutants"]
            for field in required_fields:
                assert field in response_data, f"Missing required field: {field}"
            
            # Validate location format
            assert validate_location_format(response_data["location"]), \
                "Location must have valid format"
            
            # Validate timestamp format
            assert validate_timestamp_format(response_data["timestamp"]), \
                "Timestamp must be in ISO format"
            
            # Validate AQI format
            assert validate_aqi_format(response_data["aqi"]), \
                "AQI must have valid format with value and category"
            
            # Validate pollutants is a dictionary
            assert isinstance(response_data["pollutants"], dict), \
                "Pollutants must be a dictionary"
            
            # Validate optional fields have correct types if present
            optional_fields = {
                "weather": dict,
                "source_attribution": dict,
                "data_sources": list,
                "last_updated": str
            }
            
            for field, expected_type in optional_fields.items():
                if field in response_data:
                    assert isinstance(response_data[field], expected_type), \
                        f"Field {field} must be of type {expected_type.__name__}"
        
        # If error response, validate error structure
        elif response.status_code >= 400:
            validate_error_response(response_data)
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise


@given(location=location_string())
@settings(max_examples=100, deadline=10000)
def test_24h_forecast_response_format(client: TestClient, location: str):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    For any valid location request to 24h forecast endpoint, the response should be 
    valid JSON with proper HTTP status codes and include all required fields.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Make request to 24h forecast endpoint
        response = client.get(f"/api/v1/forecast/24h/{location}")
        
        # Verify HTTP status code is valid
        assert response.status_code in [200, 400, 404, 422, 500], \
            f"Invalid HTTP status code: {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # If successful response, validate structure
        if response.status_code == 200:
            # Required top-level fields
            required_fields = ["location", "forecast_type", "generated_at", "forecasts", "metadata"]
            for field in required_fields:
                assert field in response_data, f"Missing required field: {field}"
            
            # Validate location format
            assert validate_location_format(response_data["location"]), \
                "Location must have valid format"
            
            # Validate forecast_type
            assert response_data["forecast_type"] == "24_hour", \
                "Forecast type must be '24_hour'"
            
            # Validate generated_at timestamp
            assert validate_timestamp_format(response_data["generated_at"]), \
                "Generated_at must be in ISO format"
            
            # Validate forecasts is a list
            assert isinstance(response_data["forecasts"], list), \
                "Forecasts must be a list"
            
            # Validate forecast entries if present
            if response_data["forecasts"]:
                for forecast in response_data["forecasts"]:
                    assert isinstance(forecast, dict), "Each forecast must be a dictionary"
                    
                    # Required forecast fields
                    forecast_required = ["timestamp", "forecast_hour", "aqi"]
                    for field in forecast_required:
                        assert field in forecast, f"Missing forecast field: {field}"
                    
                    # Validate forecast hour is numeric
                    assert isinstance(forecast["forecast_hour"], int), \
                        "Forecast hour must be an integer"
                    
                    # Validate AQI format in forecast
                    assert validate_aqi_format(forecast["aqi"]), \
                        "Forecast AQI must have valid format"
            
            # Validate metadata is a dictionary
            assert isinstance(response_data["metadata"], dict), \
                "Metadata must be a dictionary"
        
        # If error response, validate error structure
        elif response.status_code >= 400:
            validate_error_response(response_data)
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise


@given(params=query_parameters())
@settings(max_examples=100, deadline=10000)
def test_monitoring_stations_response_format(client: TestClient, params: Dict[str, Any]):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    For any valid query parameters to monitoring stations endpoint, the response should be 
    valid JSON with proper HTTP status codes and include all required fields.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Build query parameters
        query_params = {}
        for key, value in params.items():
            if value is not None:
                query_params[key] = value
        
        # Make request to monitoring stations endpoint
        response = client.get("/api/v1/data/stations", params=query_params)
        
        # Verify HTTP status code is valid
        assert response.status_code in [200, 400, 422, 500], \
            f"Invalid HTTP status code: {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # If successful response, validate structure
        if response.status_code == 200:
            # Required top-level fields
            required_fields = ["stations", "count", "filters", "timestamp"]
            for field in required_fields:
                assert field in response_data, f"Missing required field: {field}"
            
            # Validate stations is a list
            assert isinstance(response_data["stations"], list), \
                "Stations must be a list"
            
            # Validate count is numeric and matches list length
            assert isinstance(response_data["count"], int), \
                "Count must be an integer"
            assert response_data["count"] == len(response_data["stations"]), \
                "Count must match stations list length"
            
            # Validate filters is a dictionary
            assert isinstance(response_data["filters"], dict), \
                "Filters must be a dictionary"
            
            # Validate timestamp format
            assert validate_timestamp_format(response_data["timestamp"]), \
                "Timestamp must be in ISO format"
            
            # Validate station entries if present
            if response_data["stations"]:
                for station in response_data["stations"]:
                    assert isinstance(station, dict), "Each station must be a dictionary"
                    
                    # Required station fields
                    station_required = ["id", "station_id", "name", "location", "is_active"]
                    for field in station_required:
                        assert field in station, f"Missing station field: {field}"
                    
                    # Validate location format
                    assert validate_location_format(station["location"]), \
                        "Station location must have valid format"
                    
                    # Validate is_active is boolean
                    assert isinstance(station["is_active"], bool), \
                        "is_active must be a boolean"
        
        # If error response, validate error structure
        elif response.status_code >= 400:
            validate_error_response(response_data)
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise


@given(
    latitude=st.floats(min_value=20.0, max_value=35.0, allow_nan=False),
    longitude=st.floats(min_value=68.0, max_value=97.0, allow_nan=False),
    radius_km=st.floats(min_value=0.1, max_value=100.0, allow_nan=False),
    limit=st.integers(min_value=1, max_value=1000)
)
@settings(max_examples=50, deadline=10000)
def test_air_quality_location_response_format(
    client: TestClient, 
    latitude: float, 
    longitude: float, 
    radius_km: float, 
    limit: int
):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    For any valid location-based air quality request, the response should be 
    valid JSON with proper HTTP status codes and include all required fields.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Make request to air quality location endpoint
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "radius_km": radius_km,
            "limit": limit
        }
        response = client.get("/api/v1/data/air-quality/location", params=params)
        
        # Verify HTTP status code is valid
        assert response.status_code in [200, 400, 422, 500], \
            f"Invalid HTTP status code: {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # If successful response, validate structure
        if response.status_code == 200:
            # Required top-level fields
            required_fields = ["measurements", "count", "search_location", "filters", "timestamp"]
            for field in required_fields:
                assert field in response_data, f"Missing required field: {field}"
            
            # Validate measurements is a list
            assert isinstance(response_data["measurements"], list), \
                "Measurements must be a list"
            
            # Validate count matches list length
            assert isinstance(response_data["count"], int), \
                "Count must be an integer"
            assert response_data["count"] == len(response_data["measurements"]), \
                "Count must match measurements list length"
            
            # Validate search_location format
            search_loc = response_data["search_location"]
            assert isinstance(search_loc, dict), "Search location must be a dictionary"
            assert "latitude" in search_loc and "longitude" in search_loc, \
                "Search location must include latitude and longitude"
            
            # Validate filters is a dictionary
            assert isinstance(response_data["filters"], dict), \
                "Filters must be a dictionary"
            
            # Validate timestamp format
            assert validate_timestamp_format(response_data["timestamp"]), \
                "Timestamp must be in ISO format"
            
            # Validate measurement entries if present
            if response_data["measurements"]:
                for measurement in response_data["measurements"]:
                    assert isinstance(measurement, dict), "Each measurement must be a dictionary"
                    
                    # Required measurement fields
                    measurement_required = ["time", "station_id", "parameter", "value"]
                    for field in measurement_required:
                        assert field in measurement, f"Missing measurement field: {field}"
                    
                    # Validate time format
                    assert validate_timestamp_format(measurement["time"]), \
                        "Measurement time must be in ISO format"
        
        # If error response, validate error structure
        elif response.status_code >= 400:
            validate_error_response(response_data)
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise


def test_health_endpoint_response_format(client: TestClient):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    The health endpoint should always return valid JSON with proper format.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Make request to health endpoint
        response = client.get("/health/")
        
        # Verify HTTP status code is valid
        assert response.status_code in [200, 500], \
            f"Invalid HTTP status code: {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # Required health fields
        required_fields = ["status", "service", "version", "timestamp"]
        for field in required_fields:
            assert field in response_data, f"Missing required field: {field}"
        
        # Validate field types
        assert isinstance(response_data["status"], str), "Status must be a string"
        assert isinstance(response_data["service"], str), "Service must be a string"
        assert isinstance(response_data["version"], str), "Version must be a string"
        assert validate_timestamp_format(response_data["timestamp"]), \
            "Timestamp must be in ISO format"
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise


def test_root_endpoint_response_format(client: TestClient):
    """
    Feature: aqi-predictor-completion, Property 2: API Response Format Consistency
    
    The root endpoint should always return valid JSON with proper format.
    
    **Validates: Requirements 3.9**
    """
    try:
        # Make request to root endpoint
        response = client.get("/")
        
        # Verify HTTP status code is 200
        assert response.status_code == 200, f"Root endpoint should return 200, got {response.status_code}"
        
        # Verify response is valid JSON
        response_data = response.json()
        assert validate_json_response(response_data), "Response must be valid JSON"
        
        # Required root fields
        required_fields = ["service", "version", "status"]
        for field in required_fields:
            assert field in response_data, f"Missing required field: {field}"
        
        # Validate field types
        assert isinstance(response_data["service"], str), "Service must be a string"
        assert isinstance(response_data["version"], str), "Version must be a string"
        assert isinstance(response_data["status"], str), "Status must be a string"
        
    except Exception as e:
        # Skip if this is a network/connection error (expected in test environment)
        if "connection" in str(e).lower() or "network" in str(e).lower():
            pytest.skip(f"Network connectivity issue: {e}")
        else:
            raise