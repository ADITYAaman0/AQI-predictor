"""
Tests for Google Maps traffic data integration.

This module tests the traffic data ingestion from Google Maps API,
including data fetching, processing, and storage.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock, patch, AsyncMock

from src.data.ingestion_clients import GoogleMapsClient, TrafficPoint
from src.tasks.data_ingestion import ingest_traffic_data, _async_ingest_traffic_data


class TestGoogleMapsClient:
    """Test suite for GoogleMapsClient."""
    
    @pytest.fixture
    def client(self):
        """Create a GoogleMapsClient instance for testing."""
        return GoogleMapsClient()
    
    @pytest.fixture
    def sample_locations(self):
        """Sample locations for testing."""
        return [
            (28.6139, 77.2090),  # Central Delhi
            (28.7041, 77.1025),  # North Delhi
            (28.5355, 77.3910),  # East Delhi
        ]
    
    def test_client_initialization(self, client):
        """Test that GoogleMapsClient initializes correctly."""
        assert client is not None
        assert client.base_url == "https://maps.googleapis.com/maps/api"
        assert len(client.traffic_monitoring_points) > 0
        
    def test_monitoring_points_structure(self, client):
        """Test that monitoring points have correct structure."""
        for point_id, point_data in client.traffic_monitoring_points.items():
            assert "lat" in point_data
            assert "lon" in point_data
            assert "road_type" in point_data
            assert "name" in point_data
            assert isinstance(point_data["lat"], float)
            assert isinstance(point_data["lon"], float)
            assert point_data["road_type"] in ["highway", "arterial", "intersection"]
    
    @pytest.mark.asyncio
    async def test_fetch_traffic_data_without_api_key(self, client, sample_locations):
        """Test traffic data fetching without API key (simulation mode)."""
        # Ensure no API key is set
        client.api_key = None
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=sample_locations,
                include_monitoring_points=False
            )
        
        # Should return simulated data
        assert len(traffic_points) > 0
        assert all(isinstance(point, TrafficPoint) for point in traffic_points)
        
        # Verify traffic point structure
        for point in traffic_points:
            assert point.timestamp is not None
            assert point.location is not None
            assert 0 <= point.traffic_density <= 1
            assert point.congestion_level in ["free_flow", "light", "moderate", "heavy", "severe", "unknown"]
            if point.average_speed is not None:
                assert point.average_speed >= 0
    
    @pytest.mark.asyncio
    async def test_fetch_traffic_data_with_monitoring_points(self, client):
        """Test traffic data fetching with predefined monitoring points."""
        client.api_key = None  # Use simulation mode
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=None,
                include_monitoring_points=True
            )
        
        # Should include monitoring points
        assert len(traffic_points) > 0
        
        # Verify we got data for monitoring points
        monitoring_point_names = [point["name"] for point in client.traffic_monitoring_points.values()]
        traffic_point_names = [point.metadata.get("location_name") for point in traffic_points if point.metadata]
        
        # At least some monitoring points should be present
        assert any(name in traffic_point_names for name in monitoring_point_names)
    
    @pytest.mark.asyncio
    async def test_traffic_point_data_quality(self, client, sample_locations):
        """Test that traffic points have valid data quality."""
        client.api_key = None
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=sample_locations,
                include_monitoring_points=False
            )
        
        for point in traffic_points:
            # Verify timestamp is recent
            assert point.timestamp is not None
            time_diff = datetime.utcnow() - point.timestamp
            assert time_diff < timedelta(minutes=5)
            
            # Verify location is valid
            assert point.location is not None
            lat, lon = point.location
            assert -90 <= lat <= 90
            assert -180 <= lon <= 180
            
            # Verify traffic density is normalized
            assert 0 <= point.traffic_density <= 1
            
            # Verify congestion level is valid
            assert point.congestion_level in ["free_flow", "light", "moderate", "heavy", "severe", "unknown"]
            
            # Verify speed is reasonable if present
            if point.average_speed is not None:
                assert 0 <= point.average_speed <= 150  # Max reasonable speed in km/h
    
    @pytest.mark.asyncio
    async def test_traffic_density_congestion_correlation(self, client, sample_locations):
        """Test that traffic density correlates with congestion level."""
        client.api_key = None
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=sample_locations,
                include_monitoring_points=False
            )
        
        # Define expected density ranges for each congestion level
        congestion_density_map = {
            "free_flow": (0.0, 0.3),
            "light": (0.2, 0.5),
            "moderate": (0.4, 0.7),
            "heavy": (0.6, 0.9),
            "severe": (0.8, 1.0)
        }
        
        for point in traffic_points:
            if point.congestion_level in congestion_density_map:
                min_density, max_density = congestion_density_map[point.congestion_level]
                # Allow some tolerance for edge cases
                assert min_density - 0.2 <= point.traffic_density <= max_density + 0.2, \
                    f"Traffic density {point.traffic_density} doesn't match congestion level {point.congestion_level}"
    
    @pytest.mark.asyncio
    async def test_realistic_traffic_simulation(self, client):
        """Test that simulated traffic data is realistic."""
        client.api_key = None
        
        # Test at different times of day
        test_times = [
            datetime.utcnow().replace(hour=8, minute=0),   # Morning rush hour
            datetime.utcnow().replace(hour=14, minute=0),  # Afternoon
            datetime.utcnow().replace(hour=19, minute=0),  # Evening rush hour
            datetime.utcnow().replace(hour=2, minute=0),   # Late night
        ]
        
        for test_time in test_times:
            # Mock the current time
            with patch('src.data.ingestion_clients.datetime') as mock_datetime:
                mock_datetime.utcnow.return_value = test_time
                mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
                
                async with client:
                    traffic_points = await client.fetch_traffic_data(
                        locations=[(28.6139, 77.2090)],  # Central Delhi
                        include_monitoring_points=False
                    )
                
                # Verify we got data
                assert len(traffic_points) > 0
                
                # Rush hours should have higher traffic density on average
                avg_density = sum(p.traffic_density for p in traffic_points) / len(traffic_points)
                
                if test_time.hour in [8, 9, 18, 19, 20]:  # Rush hours
                    # Higher traffic expected during rush hours
                    assert avg_density > 0.3, f"Expected higher traffic at hour {test_time.hour}"
                elif test_time.hour in [2, 3, 4]:  # Late night
                    # Lower traffic expected at night
                    assert avg_density < 0.7, f"Expected lower traffic at hour {test_time.hour}"


class TestTrafficDataIngestion:
    """Test suite for traffic data ingestion tasks."""
    
    @pytest.mark.asyncio
    async def test_async_ingest_traffic_data_default_locations(self):
        """Test traffic data ingestion with default locations."""
        result = await _async_ingest_traffic_data(locations=None)
        
        assert result is not None
        assert result["task"] == "ingest_traffic_data"
        assert result["locations_processed"] > 0
        assert result["ingested_count"] >= 0
        assert result["success_rate"] >= 0
    
    @pytest.mark.asyncio
    async def test_async_ingest_traffic_data_custom_locations(self):
        """Test traffic data ingestion with custom locations."""
        custom_locations = [
            (28.6139, 77.2090),  # Central Delhi
            (19.0760, 72.8777),  # Mumbai
        ]
        
        result = await _async_ingest_traffic_data(locations=custom_locations)
        
        assert result is not None
        assert result["locations_processed"] == len(custom_locations)
        assert result["ingested_count"] >= 0
    
    def test_ingest_traffic_data_task(self):
        """Test the Celery task for traffic data ingestion."""
        # Test with default locations
        result = ingest_traffic_data.apply(kwargs={}).get()
        
        assert result is not None
        assert "task" in result
        assert "timestamp" in result
        assert "locations_processed" in result
        assert "ingested_count" in result
    
    def test_ingest_traffic_data_task_with_locations(self):
        """Test the Celery task with custom locations."""
        locations = [
            {"lat": 28.6139, "lon": 77.2090},
            {"lat": 28.7041, "lon": 77.1025},
        ]
        
        result = ingest_traffic_data.apply(kwargs={"locations": locations}).get()
        
        assert result is not None
        assert result["locations_processed"] == len(locations)


class TestTrafficDataIntegration:
    """Integration tests for traffic data with other components."""
    
    @pytest.mark.asyncio
    async def test_traffic_data_format_compatibility(self):
        """Test that traffic data format is compatible with ML models."""
        client = GoogleMapsClient()
        client.api_key = None
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=[(28.6139, 77.2090)],
                include_monitoring_points=False
            )
        
        # Verify traffic points can be converted to feature format
        for point in traffic_points:
            features = {
                "traffic_density": point.traffic_density,
                "average_speed": point.average_speed or 0,
                "congestion_level_encoded": {
                    "free_flow": 0,
                    "light": 1,
                    "moderate": 2,
                    "heavy": 3,
                    "severe": 4,
                    "unknown": -1
                }.get(point.congestion_level, -1),
                "road_type_encoded": {
                    "highway": 0,
                    "arterial": 1,
                    "local": 2,
                    "intersection": 3,
                    "unknown": -1
                }.get(point.road_type, -1)
            }
            
            # Verify all features are numeric
            assert all(isinstance(v, (int, float)) for v in features.values())
            
            # Verify features are in valid ranges
            assert 0 <= features["traffic_density"] <= 1
            assert features["average_speed"] >= 0
            assert -1 <= features["congestion_level_encoded"] <= 4
            assert -1 <= features["road_type_encoded"] <= 3
    
    @pytest.mark.asyncio
    async def test_traffic_data_temporal_consistency(self):
        """Test that traffic data maintains temporal consistency."""
        client = GoogleMapsClient()
        client.api_key = None
        
        # Fetch traffic data twice with a small delay
        async with client:
            traffic_points_1 = await client.fetch_traffic_data(
                locations=[(28.6139, 77.2090)],
                include_monitoring_points=False
            )
            
            await asyncio.sleep(1)
            
            traffic_points_2 = await client.fetch_traffic_data(
                locations=[(28.6139, 77.2090)],
                include_monitoring_points=False
            )
        
        # Verify both fetches returned data
        assert len(traffic_points_1) > 0
        assert len(traffic_points_2) > 0
        
        # Verify timestamps are different
        if len(traffic_points_1) > 0 and len(traffic_points_2) > 0:
            assert traffic_points_2[0].timestamp >= traffic_points_1[0].timestamp
    
    @pytest.mark.asyncio
    async def test_traffic_data_spatial_coverage(self):
        """Test that traffic data covers multiple locations."""
        client = GoogleMapsClient()
        client.api_key = None
        
        # Test multiple cities
        test_locations = [
            (28.6139, 77.2090),  # Delhi
            (19.0760, 72.8777),  # Mumbai
            (12.9716, 77.5946),  # Bangalore
        ]
        
        async with client:
            traffic_points = await client.fetch_traffic_data(
                locations=test_locations,
                include_monitoring_points=False
            )
        
        # Verify we got data for multiple locations
        assert len(traffic_points) >= len(test_locations)
        
        # Verify locations are covered
        traffic_locations = set((p.location[0], p.location[1]) for p in traffic_points)
        
        # At least some of the test locations should be present
        for test_loc in test_locations:
            # Check if any traffic point is near this location (within 0.1 degrees)
            nearby = any(
                abs(tl[0] - test_loc[0]) < 0.1 and abs(tl[1] - test_loc[1]) < 0.1
                for tl in traffic_locations
            )
            assert nearby, f"No traffic data found near location {test_loc}"


class TestTrafficDataErrorHandling:
    """Test error handling in traffic data integration."""
    
    @pytest.mark.asyncio
    async def test_graceful_degradation_on_api_failure(self):
        """Test that system gracefully degrades when API fails."""
        client = GoogleMapsClient()
        
        # Simulate API failure by using invalid API key
        client.api_key = "invalid_key_for_testing"
        
        async with client:
            # Should fall back to simulation
            traffic_points = await client.fetch_traffic_data(
                locations=[(28.6139, 77.2090)],
                include_monitoring_points=False
            )
        
        # Should still return data (simulated)
        assert len(traffic_points) > 0
        
        # Verify data source indicates simulation
        for point in traffic_points:
            if point.metadata:
                assert "simulation" in point.source.lower() or "simulated" in point.source.lower()
    
    @pytest.mark.asyncio
    async def test_invalid_location_handling(self):
        """Test handling of invalid locations."""
        client = GoogleMapsClient()
        client.api_key = None
        
        # Test with invalid coordinates
        invalid_locations = [
            (999, 999),  # Out of range
            (-999, -999),  # Out of range
        ]
        
        async with client:
            # Should handle gracefully
            try:
                traffic_points = await client.fetch_traffic_data(
                    locations=invalid_locations,
                    include_monitoring_points=False
                )
                # If it doesn't raise an error, verify it returns empty or valid data
                assert isinstance(traffic_points, list)
            except Exception as e:
                # If it raises an error, it should be a specific validation error
                assert "location" in str(e).lower() or "coordinate" in str(e).lower()
    
    @pytest.mark.asyncio
    async def test_empty_location_list_handling(self):
        """Test handling of empty location list."""
        client = GoogleMapsClient()
        client.api_key = None
        
        async with client:
            # Should use default monitoring points
            traffic_points = await client.fetch_traffic_data(
                locations=[],
                include_monitoring_points=True
            )
        
        # Should return data from monitoring points
        assert len(traffic_points) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
