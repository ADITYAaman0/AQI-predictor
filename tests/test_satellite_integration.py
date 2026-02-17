"""
Integration tests for satellite data processing with existing system.
"""

import pytest
import asyncio
from datetime import datetime, timedelta

from src.data.satellite_client import SatelliteDataOrchestrator
from src.data.ingestion_clients import DataIngestionOrchestrator


class TestSatelliteIntegration:
    """Test satellite data integration with existing data ingestion system."""
    
    @pytest.mark.asyncio
    async def test_satellite_orchestrator_integration(self):
        """Test satellite data orchestrator works independently."""
        orchestrator = SatelliteDataOrchestrator()
        await orchestrator.initialize_clients()
        
        bbox = {
            "min_lat": 28.0,
            "max_lat": 29.0,
            "min_lon": 77.0,
            "max_lon": 78.0
        }
        
        start_time = datetime.utcnow() - timedelta(hours=1)
        end_time = datetime.utcnow()
        
        results = await orchestrator.ingest_all_satellite_sources(
            bbox=bbox,
            start_time=start_time,
            end_time=end_time
        )
        
        # Verify results structure
        assert "tropomi" in results
        assert "viirs" in results
        assert isinstance(results["tropomi"], list)
        assert isinstance(results["viirs"], list)
        
        # Should have some data points
        assert len(results["tropomi"]) > 0
        assert len(results["viirs"]) > 0
        
        # Verify TROPOMI data structure
        tropomi_point = results["tropomi"][0]
        assert tropomi_point.satellite == "TROPOMI"
        assert tropomi_point.parameter in ["no2", "so2", "co"]
        assert tropomi_point.value > 0
        assert tropomi_point.source == "tropomi_simulated"
        
        # Verify VIIRS data structure
        viirs_point = results["viirs"][0]
        assert viirs_point.satellite == "VIIRS"
        assert viirs_point.parameter in ["aerosol_optical_depth", "fire_radiative_power"]
        assert viirs_point.value >= 0
        assert viirs_point.source == "viirs_simulated"
    
    @pytest.mark.asyncio
    async def test_ground_based_orchestrator_with_satellite_support(self):
        """Test that ground-based orchestrator can be extended with satellite support."""
        orchestrator = DataIngestionOrchestrator()
        await orchestrator.initialize_clients()
        
        # Verify satellite clients are initialized
        assert "tropomi" in orchestrator.satellite_clients
        assert "viirs" in orchestrator.satellite_clients
        
        # Test ground-based data ingestion still works
        locations = [(28.6139, 77.2090)]  # Delhi
        start_time = datetime.utcnow() - timedelta(hours=1)
        end_time = datetime.utcnow()
        
        results = await orchestrator.ingest_all_sources(
            locations=locations,
            start_time=start_time,
            end_time=end_time
        )
        
        # Verify ground-based results structure
        assert "air_quality" in results
        assert "weather" in results
        assert "traffic" in results
        assert isinstance(results["air_quality"], list)
        assert isinstance(results["weather"], list)
        assert isinstance(results["traffic"], list)
    
    def test_satellite_data_parameters_coverage(self):
        """Test that satellite data covers required parameters from requirements."""
        from src.data.satellite_client import TROPOMIClient, VIIRSClient
        
        tropomi_client = TROPOMIClient()
        viirs_client = VIIRSClient()
        
        # Verify TROPOMI covers required atmospheric trace gases
        assert "no2" in tropomi_client.supported_parameters
        assert "so2" in tropomi_client.supported_parameters
        assert "co" in tropomi_client.supported_parameters
        
        # Verify VIIRS covers required aerosol and fire data
        assert "aerosol_optical_depth" in viirs_client.supported_parameters
        assert "fire_radiative_power" in viirs_client.supported_parameters
    
    def test_satellite_data_geographic_coverage(self):
        """Test that satellite data covers India geographic region."""
        from src.data.satellite_client import TROPOMIClient, VIIRSClient
        
        tropomi_client = TROPOMIClient()
        viirs_client = VIIRSClient()
        
        # Both clients should have India bounding box
        assert tropomi_client.india_bbox["min_lat"] == 6.0
        assert tropomi_client.india_bbox["max_lat"] == 37.0
        assert tropomi_client.india_bbox["min_lon"] == 68.0
        assert tropomi_client.india_bbox["max_lon"] == 97.0
        
        assert viirs_client.india_bbox["min_lat"] == 6.0
        assert viirs_client.india_bbox["max_lat"] == 37.0
        assert viirs_client.india_bbox["min_lon"] == 68.0
        assert viirs_client.india_bbox["max_lon"] == 97.0
        
        # Test point-in-India detection for major cities
        # Delhi
        assert tropomi_client._is_point_in_india(28.6139, 77.2090) == True
        assert viirs_client._is_point_in_india(28.6139, 77.2090) == True
        
        # Mumbai
        assert tropomi_client._is_point_in_india(19.0760, 72.8777) == True
        assert viirs_client._is_point_in_india(19.0760, 72.8777) == True
        
        # Outside India
        assert tropomi_client._is_point_in_india(40.0, 80.0) == False
        assert viirs_client._is_point_in_india(40.0, 80.0) == False
    
    def test_satellite_data_quality_flags(self):
        """Test that satellite data includes proper quality flags."""
        from src.data.satellite_client import SatelliteDataPoint
        
        # Test data point with real-time quality
        real_time_point = SatelliteDataPoint(
            timestamp=datetime.utcnow(),
            location=(28.6139, 77.2090),
            parameter="no2",
            value=5e15,
            unit="molec/cm²",
            source="tropomi_copernicus",
            satellite="TROPOMI",
            quality_flag="real_time"
        )
        
        assert real_time_point.quality_flag == "real_time"
        
        # Test data point with estimated quality
        estimated_point = SatelliteDataPoint(
            timestamp=datetime.utcnow(),
            location=(28.6139, 77.2090),
            parameter="no2",
            value=5e15,
            unit="molec/cm²",
            source="tropomi_simulated",
            satellite="TROPOMI",
            quality_flag="estimated"
        )
        
        assert estimated_point.quality_flag == "estimated"
    
    def test_satellite_data_metadata_structure(self):
        """Test that satellite data includes proper metadata."""
        from src.data.satellite_client import SatelliteDataPoint
        
        metadata = {
            "data_source": "realistic_simulation",
            "note": "Test satellite data",
            "processing_level": "L2"
        }
        
        sat_point = SatelliteDataPoint(
            timestamp=datetime.utcnow(),
            location=(28.6139, 77.2090),
            parameter="no2",
            value=5e15,
            unit="molec/cm²",
            source="tropomi_test",
            satellite="TROPOMI",
            quality_flag="test",
            pixel_size=7.0,
            cloud_fraction=0.1,
            metadata=metadata
        )
        
        assert sat_point.metadata["data_source"] == "realistic_simulation"
        assert sat_point.metadata["note"] == "Test satellite data"
        assert sat_point.metadata["processing_level"] == "L2"
        assert sat_point.pixel_size == 7.0
        assert sat_point.cloud_fraction == 0.1


if __name__ == "__main__":
    pytest.main([__file__])