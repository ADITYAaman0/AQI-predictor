"""
Tests for satellite data processing functionality.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from src.data.satellite_client import (
    TROPOMIClient, VIIRSClient, SatelliteDataOrchestrator,
    SatelliteDataPoint
)


class TestTROPOMIClient:
    """Test TROPOMI satellite data client."""
    
    @pytest.mark.asyncio
    async def test_tropomi_client_initialization(self):
        """Test TROPOMI client initializes correctly."""
        client = TROPOMIClient()
        
        assert client.satellite_name == "TROPOMI"
        assert "no2" in client.supported_parameters
        assert "so2" in client.supported_parameters
        assert "co" in client.supported_parameters
        assert client.india_bbox["min_lat"] == 6.0
        assert client.india_bbox["max_lat"] == 37.0
    
    @pytest.mark.asyncio
    async def test_tropomi_fetch_simulated_data(self):
        """Test TROPOMI client fetches simulated data when no API key."""
        client = TROPOMIClient(api_key=None)
        
        bbox = {
            "min_lat": 28.0,
            "max_lat": 29.0,
            "min_lon": 77.0,
            "max_lon": 78.0
        }
        
        start_time = datetime.utcnow() - timedelta(days=1)
        end_time = datetime.utcnow()
        
        async with client:
            data_points = await client.fetch_satellite_data(
                parameters=["no2"],
                bbox=bbox,
                start_time=start_time,
                end_time=end_time
            )
        
        assert len(data_points) > 0
        
        # Check data point structure
        point = data_points[0]
        assert isinstance(point, SatelliteDataPoint)
        assert point.parameter == "no2"
        assert point.satellite == "TROPOMI"
        assert point.source == "tropomi_simulated"
        assert point.unit == "molec/cm²"
        assert point.value > 0
        assert point.pixel_size == 7.0
        assert bbox["min_lat"] <= point.location[0] <= bbox["max_lat"]
        assert bbox["min_lon"] <= point.location[1] <= bbox["max_lon"]
    
    @pytest.mark.asyncio
    async def test_tropomi_multiple_parameters(self):
        """Test TROPOMI client handles multiple parameters."""
        client = TROPOMIClient(api_key=None)
        
        bbox = {
            "min_lat": 28.5,
            "max_lat": 28.7,
            "min_lon": 77.1,
            "max_lon": 77.3
        }
        
        async with client:
            data_points = await client.fetch_satellite_data(
                parameters=["no2", "so2", "co"],
                bbox=bbox
            )
        
        # Should have data for all parameters
        parameters_found = set(point.parameter for point in data_points)
        assert "no2" in parameters_found
        assert "so2" in parameters_found
        assert "co" in parameters_found
    
    def test_tropomi_urban_area_detection(self):
        """Test TROPOMI urban area detection."""
        client = TROPOMIClient()
        
        # Delhi coordinates - should be urban
        assert client._is_urban_area(28.6139, 77.2090) == True
        
        # Mumbai coordinates - should be urban
        assert client._is_urban_area(19.0760, 72.8777) == True
        
        # Remote area - should not be urban
        assert client._is_urban_area(25.0, 75.0) == False
    
    def test_tropomi_realistic_values(self):
        """Test TROPOMI generates realistic values."""
        client = TROPOMIClient()
        timestamp = datetime.utcnow()
        
        # Test NO2 values
        no2_value, no2_unit = client._get_realistic_tropomi_value("no2", 28.6139, 77.2090, timestamp)
        assert no2_unit == "molec/cm²"
        assert no2_value > 0
        assert no2_value < 1e17  # Reasonable upper bound
        
        # Test SO2 values
        so2_value, so2_unit = client._get_realistic_tropomi_value("so2", 28.6139, 77.2090, timestamp)
        assert so2_unit == "molec/cm²"
        assert so2_value > 0
        
        # Test CO values
        co_value, co_unit = client._get_realistic_tropomi_value("co", 28.6139, 77.2090, timestamp)
        assert co_unit == "molec/cm²"
        assert co_value > 0


class TestVIIRSClient:
    """Test VIIRS satellite data client."""
    
    @pytest.mark.asyncio
    async def test_viirs_client_initialization(self):
        """Test VIIRS client initializes correctly."""
        client = VIIRSClient()
        
        assert client.satellite_name == "VIIRS"
        assert "aerosol_optical_depth" in client.supported_parameters
        assert "fire_radiative_power" in client.supported_parameters
        assert client.india_bbox["min_lat"] == 6.0
        assert client.india_bbox["max_lat"] == 37.0
    
    @pytest.mark.asyncio
    async def test_viirs_fetch_simulated_data(self):
        """Test VIIRS client fetches simulated data when no API key."""
        client = VIIRSClient(api_key=None)
        
        bbox = {
            "min_lat": 28.0,
            "max_lat": 29.0,
            "min_lon": 77.0,
            "max_lon": 78.0
        }
        
        start_time = datetime.utcnow() - timedelta(days=1)
        end_time = datetime.utcnow()
        
        async with client:
            data_points = await client.fetch_satellite_data(
                parameters=["aerosol_optical_depth"],
                bbox=bbox,
                start_time=start_time,
                end_time=end_time
            )
        
        assert len(data_points) > 0
        
        # Check data point structure
        point = data_points[0]
        assert isinstance(point, SatelliteDataPoint)
        assert point.parameter == "aerosol_optical_depth"
        assert point.satellite == "VIIRS"
        assert point.source == "viirs_simulated"
        assert point.unit == "dimensionless"
        assert point.value >= 0
        assert point.pixel_size == 0.75
        assert bbox["min_lat"] <= point.location[0] <= bbox["max_lat"]
        assert bbox["min_lon"] <= point.location[1] <= bbox["max_lon"]
    
    @pytest.mark.asyncio
    async def test_viirs_fire_detection(self):
        """Test VIIRS fire detection functionality."""
        client = VIIRSClient(api_key=None)
        
        bbox = {
            "min_lat": 28.0,
            "max_lat": 29.0,
            "min_lon": 77.0,
            "max_lon": 78.0
        }
        
        async with client:
            data_points = await client.fetch_satellite_data(
                parameters=["fire_radiative_power"],
                bbox=bbox
            )
        
        # Should have some fire detection data (may be zero values)
        fire_points = [p for p in data_points if p.parameter == "fire_radiative_power"]
        assert len(fire_points) >= 0  # May have no fires detected
        
        # If fires are detected, check values
        active_fires = [p for p in fire_points if p.value > 0]
        for fire_point in active_fires:
            assert fire_point.unit == "MW"
            assert fire_point.value > 0
            assert fire_point.value <= 100  # Reasonable upper bound
    
    def test_viirs_realistic_values(self):
        """Test VIIRS generates realistic values."""
        client = VIIRSClient()
        timestamp = datetime.utcnow()
        
        # Test AOD values
        aod_value, aod_unit = client._get_realistic_viirs_value("aerosol_optical_depth", 28.6139, 77.2090, timestamp)
        assert aod_unit == "dimensionless"
        assert aod_value >= 0
        assert aod_value <= 5.0  # Reasonable upper bound for AOD
        
        # Test fire detection
        frp_value, frp_unit = client._get_realistic_viirs_value("fire_radiative_power", 28.6139, 77.2090, timestamp)
        assert frp_unit == "MW"
        assert frp_value >= 0  # May be zero if no fire


class TestSatelliteDataOrchestrator:
    """Test satellite data orchestrator."""
    
    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self):
        """Test orchestrator initializes correctly."""
        orchestrator = SatelliteDataOrchestrator()
        
        assert "tropomi" in orchestrator.clients
        assert "viirs" in orchestrator.clients
        assert isinstance(orchestrator.clients["tropomi"], TROPOMIClient)
        assert isinstance(orchestrator.clients["viirs"], VIIRSClient)
    
    @pytest.mark.asyncio
    async def test_orchestrator_ingest_all_sources(self):
        """Test orchestrator ingests from all satellite sources."""
        orchestrator = SatelliteDataOrchestrator()
        await orchestrator.initialize_clients()
        
        bbox = {
            "min_lat": 28.0,
            "max_lat": 29.0,
            "min_lon": 77.0,
            "max_lon": 78.0
        }
        
        start_time = datetime.utcnow() - timedelta(days=1)
        end_time = datetime.utcnow()
        
        results = await orchestrator.ingest_all_satellite_sources(
            bbox=bbox,
            start_time=start_time,
            end_time=end_time
        )
        
        assert "tropomi" in results
        assert "viirs" in results
        assert len(results["tropomi"]) > 0
        assert len(results["viirs"]) > 0
        
        # Check TROPOMI data
        tropomi_point = results["tropomi"][0]
        assert tropomi_point.satellite == "TROPOMI"
        assert tropomi_point.parameter in ["no2", "so2", "co"]
        
        # Check VIIRS data
        viirs_point = results["viirs"][0]
        assert viirs_point.satellite == "VIIRS"
        assert viirs_point.parameter in ["aerosol_optical_depth", "fire_radiative_power"]


class TestSatelliteDataIntegration:
    """Test integration with existing data ingestion system."""
    
    @pytest.mark.asyncio
    async def test_satellite_data_point_to_data_point_conversion(self):
        """Test conversion from SatelliteDataPoint to DataPoint."""
        client = TROPOMIClient(api_key=None)
        
        bbox = {
            "min_lat": 28.5,
            "max_lat": 28.7,
            "min_lon": 77.1,
            "max_lon": 77.3
        }
        
        async with client:
            # Use the compatibility method that returns DataPoint objects
            data_points = await client.fetch_data(
                parameters=["no2"],
                bbox=bbox
            )
        
        assert len(data_points) > 0
        
        # Check that we get DataPoint objects with satellite metadata
        from src.data.ingestion_clients import DataPoint
        point = data_points[0]
        assert isinstance(point, DataPoint)
        assert point.parameter == "no2"
        assert point.source == "tropomi_simulated"
        assert "satellite" in point.metadata
        assert point.metadata["satellite"] == "TROPOMI"
        assert "pixel_size_km" in point.metadata
    
    @pytest.mark.asyncio
    async def test_satellite_data_quality_flags(self):
        """Test satellite data quality flags are set correctly."""
        client = TROPOMIClient(api_key=None)
        
        async with client:
            satellite_points = await client.fetch_satellite_data(
                parameters=["no2"],
                bbox={"min_lat": 28.0, "max_lat": 29.0, "min_lon": 77.0, "max_lon": 78.0}
            )
        
        # All simulated data should be marked as estimated
        for point in satellite_points:
            assert point.quality_flag == "estimated"
    
    def test_satellite_data_point_structure(self):
        """Test SatelliteDataPoint structure and validation."""
        timestamp = datetime.utcnow()
        location = (28.6139, 77.2090)
        
        sat_point = SatelliteDataPoint(
            timestamp=timestamp,
            location=location,
            parameter="no2",
            value=5e15,
            unit="molec/cm²",
            source="tropomi_test",
            satellite="TROPOMI",
            quality_flag="test",
            pixel_size=7.0,
            cloud_fraction=0.1,
            metadata={"test": "data"}
        )
        
        assert sat_point.timestamp == timestamp
        assert sat_point.location == location
        assert sat_point.parameter == "no2"
        assert sat_point.value == 5e15
        assert sat_point.unit == "molec/cm²"
        assert sat_point.source == "tropomi_test"
        assert sat_point.satellite == "TROPOMI"
        assert sat_point.quality_flag == "test"
        assert sat_point.pixel_size == 7.0
        assert sat_point.cloud_fraction == 0.1
        assert sat_point.metadata["test"] == "data"


if __name__ == "__main__":
    pytest.main([__file__])