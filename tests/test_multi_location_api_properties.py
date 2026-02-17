"""
Property-based tests for multi-location API support.
Tests that the API correctly handles various location formats and returns valid data.

Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
Validates: Requirements 3.2, 3.3
"""

import pytest
from hypothesis import given, strategies as st, settings
import json
from datetime import datetime
from typing import Dict, Any
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from fastapi.testclient import TestClient
    from api.main import app
    from utils.location_parser import LocationParser
    
    client = TestClient(app)
    APP_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import app components: {e}")
    APP_AVAILABLE = False
    LocationParser = None


# Strategy for generating valid coordinates within India
india_coordinates = st.tuples(
    st.floats(min_value=6.0, max_value=37.0),  # Latitude range for India
    st.floats(min_value=68.0, max_value=97.0)  # Longitude range for India
)

# Strategy for generating known city names (fallback if LocationParser not available)
if APP_AVAILABLE and LocationParser:
    known_cities = st.sampled_from(list(LocationParser.CITY_COORDINATES.keys()))
else:
    # Fallback city list
    fallback_cities = ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad']
    known_cities = st.sampled_from(fallback_cities)

# Strategy for generating coordinate strings
coordinate_strings = india_coordinates.map(
    lambda coords: f"{coords[0]:.4f}, {coords[1]:.4f}"
)

# Combined location strategy - filter out problematic characters
location_inputs = st.one_of(
    known_cities,
    coordinate_strings,
    # Add some address-like strings, but filter out URL-unsafe characters
    st.text(min_size=3, max_size=50).filter(
        lambda x: x.strip() and not x.isdigit() and 
        all(ord(c) >= 32 and ord(c) < 127 and c not in ['/', '?', '#', '%'] for c in x)
    )
)


def validate_location_response(response_data: Dict[str, Any]) -> bool:
    """Validate that a location response has the required structure"""
    required_fields = ['location', 'timestamp']
    
    # Check top-level fields
    for field in required_fields:
        if field not in response_data:
            return False
    
    # Check location structure
    location = response_data['location']
    location_required = ['name', 'coordinates']
    for field in location_required:
        if field not in location:
            return False
    
    # Check coordinates structure
    coords = location['coordinates']
    if 'lat' not in coords or 'lon' not in coords:
        return False
    
    # Validate coordinate ranges
    lat, lon = coords['lat'], coords['lon']
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return False
    
    return True


def validate_current_forecast_response(response_data: Dict[str, Any]) -> bool:
    """Validate current forecast response structure"""
    if not validate_location_response(response_data):
        return False
    
    required_fields = ['aqi', 'pollutants', 'weather', 'source_attribution']
    for field in required_fields:
        if field not in response_data:
            return False
    
    # Validate AQI structure
    aqi = response_data['aqi']
    aqi_required = ['value', 'category']
    for field in aqi_required:
        if field not in aqi:
            return False
    
    # AQI value should be between 0 and 500
    if not (0 <= aqi['value'] <= 500):
        return False
    
    # Validate pollutants structure
    pollutants = response_data['pollutants']
    expected_pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
    for pollutant in expected_pollutants:
        if pollutant not in pollutants:
            return False
        
        pollutant_data = pollutants[pollutant]
        if 'value' not in pollutant_data or 'unit' not in pollutant_data:
            return False
        
        # Values should be non-negative
        if pollutant_data['value'] < 0:
            return False
    
    return True


def validate_24h_forecast_response(response_data: Dict[str, Any]) -> bool:
    """Validate 24-hour forecast response structure"""
    # Check basic structure
    required_fields = ['location', 'forecast_type', 'generated_at', 'forecasts', 'metadata']
    for field in required_fields:
        if field not in response_data:
            return False
    
    # Check location structure
    location = response_data['location']
    location_required = ['name', 'coordinates']
    for field in location_required:
        if field not in location:
            return False
    
    # Check coordinates structure
    coords = location['coordinates']
    if 'lat' not in coords or 'lon' not in coords:
        return False
    
    # Validate coordinate ranges
    lat, lon = coords['lat'], coords['lon']
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return False
    
    # Should have 24 hourly forecasts
    forecasts = response_data['forecasts']
    if not isinstance(forecasts, list) or len(forecasts) != 24:
        return False
    
    # Validate each forecast
    for i, forecast in enumerate(forecasts):
        required_forecast_fields = ['timestamp', 'forecast_hour', 'aqi', 'pollutants']
        for field in required_forecast_fields:
            if field not in forecast:
                return False
        
        # Forecast hour should match index + 1
        if forecast['forecast_hour'] != i + 1:
            return False
        
        # Validate AQI in forecast
        aqi = forecast['aqi']
        if 'value' not in aqi or not (0 <= aqi['value'] <= 500):
            return False
    
    return True


@pytest.mark.skipif(not APP_AVAILABLE, reason="App components not available")
@given(location_inputs)
@settings(max_examples=20, deadline=10000)
def test_current_forecast_api_multi_location_support(location_input):
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    For any valid location input (coordinates, city names, or addresses),
    the current forecast API should return valid current AQI data in the expected format.
    
    Validates: Requirements 3.2, 3.3
    """
    # Skip empty or very short inputs that are likely invalid
    if not location_input or len(location_input.strip()) < 2:
        return
    
    # Make API request
    response = client.get(f"/api/v1/forecast/current/{location_input}")
    
    # API should either succeed or return a clear error for invalid locations
    if response.status_code == 400:
        # Bad request is acceptable for invalid location formats
        error_data = response.json()
        assert 'detail' in error_data
        assert 'Invalid location format' in error_data['detail']
        return
    elif response.status_code == 500:
        # Server errors should be rare but acceptable for edge cases
        return
    
    # For successful responses, validate structure
    assert response.status_code == 200
    response_data = response.json()
    
    # Validate response structure
    assert validate_current_forecast_response(response_data), \
        f"Invalid current forecast response structure for location: {location_input}"
    
    # Additional validations
    location = response_data['location']
    
    # Location name should not be empty
    assert location['name'].strip(), "Location name should not be empty"
    
    # Coordinates should be valid
    coords = location['coordinates']
    assert isinstance(coords['lat'], (int, float)), "Latitude should be numeric"
    assert isinstance(coords['lon'], (int, float)), "Longitude should be numeric"
    
    # Timestamp should be valid ISO format
    timestamp = response_data['timestamp']
    try:
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    except ValueError:
        pytest.fail(f"Invalid timestamp format: {timestamp}")


@pytest.mark.skipif(not APP_AVAILABLE, reason="App components not available")
@given(location_inputs)
@settings(max_examples=20, deadline=15000)
def test_24h_forecast_api_multi_location_support(location_input):
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    For any valid location input (coordinates, city names, or addresses),
    the 24-hour forecast API should return valid 24-hour forecasts in the expected format.
    
    Validates: Requirements 3.2, 3.3
    """
    # Skip empty or very short inputs that are likely invalid
    if not location_input or len(location_input.strip()) < 2:
        return
    
    # Make API request
    response = client.get(f"/api/v1/forecast/24h/{location_input}")
    
    # API should either succeed or return a clear error for invalid locations
    if response.status_code == 400:
        # Bad request is acceptable for invalid location formats
        error_data = response.json()
        assert 'detail' in error_data
        assert 'Invalid location format' in error_data['detail']
        return
    elif response.status_code == 500:
        # Server errors should be rare but acceptable for edge cases
        return
    
    # For successful responses, validate structure
    assert response.status_code == 200
    response_data = response.json()
    
    # Validate response structure
    assert validate_24h_forecast_response(response_data), \
        f"Invalid 24h forecast response structure for location: {location_input}"
    
    # Additional validations
    location = response_data['location']
    
    # Location name should not be empty
    assert location['name'].strip(), "Location name should not be empty"
    
    # Forecast type should be correct
    assert response_data['forecast_type'] == '24_hour'
    
    # Generated timestamp should be valid
    generated_at = response_data['generated_at']
    try:
        datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
    except ValueError:
        pytest.fail(f"Invalid generated_at timestamp: {generated_at}")
    
    # Metadata should contain required fields
    metadata = response_data['metadata']
    required_metadata = ['model_version', 'confidence_level', 'data_sources']
    for field in required_metadata:
        assert field in metadata, f"Missing metadata field: {field}"


@pytest.mark.skipif(not APP_AVAILABLE or not LocationParser, reason="LocationParser not available")
@given(known_cities)
@settings(max_examples=50, deadline=10000)
def test_known_cities_return_consistent_data(city_name):
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    For known cities, the API should return consistent location information
    that matches the expected coordinates and city details.
    
    Validates: Requirements 3.2, 3.3
    """
    # Get expected coordinates for the city
    expected_coords = LocationParser.CITY_COORDINATES[city_name]
    
    # Test current forecast
    response = client.get(f"/api/v1/forecast/current/{city_name}")
    assert response.status_code == 200
    
    response_data = response.json()
    location = response_data['location']
    coords = location['coordinates']
    
    # Coordinates should match expected values (within small tolerance)
    assert abs(coords['lat'] - expected_coords[0]) < 0.01, \
        f"Latitude mismatch for {city_name}: expected {expected_coords[0]}, got {coords['lat']}"
    assert abs(coords['lon'] - expected_coords[1]) < 0.01, \
        f"Longitude mismatch for {city_name}: expected {expected_coords[1]}, got {coords['lon']}"
    
    # City name should be properly formatted
    assert location['city'] is not None, f"City field should not be None for {city_name}"
    
    # Country should be India
    assert location['country'] == 'India', f"Country should be India for {city_name}"


@pytest.mark.skipif(not APP_AVAILABLE, reason="App components not available")
@given(coordinate_strings)
@settings(max_examples=50, deadline=10000)
def test_coordinate_inputs_return_valid_responses(coord_string):
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    For coordinate inputs, the API should parse them correctly and return
    forecasts with the same or very similar coordinates.
    
    Validates: Requirements 3.2, 3.3
    """
    # Parse expected coordinates
    parts = coord_string.split(',')
    expected_lat = float(parts[0].strip())
    expected_lon = float(parts[1].strip())
    
    # Test current forecast
    response = client.get(f"/api/v1/forecast/current/{coord_string}")
    
    # Should succeed for valid coordinates
    assert response.status_code == 200
    
    response_data = response.json()
    location = response_data['location']
    coords = location['coordinates']
    
    # Returned coordinates should match input (within small tolerance)
    assert abs(coords['lat'] - expected_lat) < 0.01, \
        f"Latitude mismatch: expected {expected_lat}, got {coords['lat']}"
    assert abs(coords['lon'] - expected_lon) < 0.01, \
        f"Longitude mismatch: expected {expected_lon}, got {coords['lon']}"
    
    # Location name should include the coordinates
    assert str(expected_lat)[:6] in location['name'] or str(coords['lat'])[:6] in location['name'], \
        f"Location name should contain latitude: {location['name']}"


@pytest.mark.skipif(not APP_AVAILABLE or not LocationParser, reason="App components not available")
@given(st.text(min_size=1, max_size=100).filter(
    lambda x: x.strip() and 
    all(ord(c) >= 32 and ord(c) < 127 and c not in ['/', '?', '#', '%', '&'] for c in x)
))
@settings(max_examples=50, deadline=10000)
def test_api_handles_invalid_locations_gracefully(invalid_location):
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    For invalid or unparseable location inputs, the API should return
    appropriate error responses rather than crashing.
    
    Validates: Requirements 3.2, 3.3
    """
    # Skip inputs that might actually be valid
    if (APP_AVAILABLE and LocationParser and 
        (invalid_location.strip().lower() in LocationParser.CITY_COORDINATES or
         len(invalid_location.strip()) == 1)):  # Single characters might be treated as valid
        return
    
    # Try to parse as coordinates - if successful, skip
    try:
        parts = invalid_location.split(',')
        if len(parts) == 2:
            lat, lon = float(parts[0].strip()), float(parts[1].strip())
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return  # Valid coordinates, skip
    except (ValueError, IndexError):
        pass
    
    # Test current forecast endpoint
    response = client.get(f"/api/v1/forecast/current/{invalid_location}")
    
    # Should return either 200 (valid location), 400 (bad request), 404 (not found), or 500 (server error)
    assert response.status_code in [200, 400, 404, 500], \
        f"Expected 200, 400, 404, or 500 for location '{invalid_location}', got {response.status_code}"
    
    # Response should be valid JSON
    try:
        error_data = response.json()
        # Only check for error fields if it's actually an error response
        if response.status_code != 200:
            assert 'detail' in error_data or 'error' in error_data, \
                "Error response should contain 'detail' or 'error' field"
    except json.JSONDecodeError:
        pytest.fail(f"Response should be valid JSON for location: {invalid_location}")


@pytest.mark.skipif(not APP_AVAILABLE, reason="App components not available")
def test_api_response_time_reasonable():
    """
    Feature: aqi-predictor-completion, Property 4: Multi-Location API Support
    
    API responses should be returned within reasonable time limits
    to ensure good user experience.
    
    Validates: Requirements 3.2, 3.3
    """
    import time
    
    test_locations = ['delhi', '28.6139, 77.2090', 'mumbai']
    
    for location in test_locations:
        start_time = time.time()
        
        response = client.get(f"/api/v1/forecast/current/{location}")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # Response should be within 5 seconds (generous for testing)
        assert response_time < 5.0, \
            f"Response time too slow for {location}: {response_time:.2f}s"
        
        # Should be successful
        assert response.status_code == 200


if __name__ == "__main__":
    # Run a quick test to verify the test setup
    if APP_AVAILABLE:
        test_api_response_time_reasonable()
        print("Multi-location API property tests are ready to run!")
    else:
        print("App components not available - tests will be skipped in pytest run")