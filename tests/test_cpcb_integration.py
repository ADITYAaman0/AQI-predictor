"""
Tests for CPCB (Central Pollution Control Board) integration.
Validates the enhanced CPCB client implementation.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock

from src.data.ingestion_clients import CPCBClient, DataPoint
from src.tasks.data_ingestion import ingest_cpcb_data, get_cpcb_stations, check_cpcb_station_status


class TestCPCBClient:
    """Test cases for CPCBClient."""
    
    @pytest.mark.asyncio
    async def test_fetch_data_default_stations(self):
        """Test fetching data with default Delhi stations."""
        async with CPCBClient() as client:
            data_points = await client.fetch_data()
            
            # Should return data for Delhi stations
            assert len(data_points) > 0
            
            # Check data structure
            for point in data_points:
                assert isinstance(point, DataPoint)
                assert point.source == "cpcb"
                assert point.station_id.startswith("DL")
                assert point.parameter in ["pm25", "pm10", "no2", "so2", "o3", "co"]
                assert point.value >= 0
                assert point.unit in ["µg/m³", "mg/m³"]
    
    @pytest.mark.asyncio
    async def test_fetch_data_specific_stations(self):
        """Test fetching data for specific stations."""
        async with CPCBClient() as client:
            stations = ["DL001", "DL002", "MH001"]
            data_points = await client.fetch_data(stations=stations)
            
            # Should return data for specified stations
            station_ids = {point.station_id for point in data_points}
            assert station_ids.issubset(set(stations))
            
            # Should have multiple parameters per station
            assert len(data_points) >= len(stations) * 6  # 6 parameters per station
    
    @pytest.mark.asyncio
    async def test_fetch_data_time_range(self):
        """Test fetching data with specific time range."""
        async with CPCBClient() as client:
            start_time = datetime.utcnow() - timedelta(hours=2)
            end_time = datetime.utcnow() - timedelta(hours=1)
            
            data_points = await client.fetch_data(
                stations=["DL001"],
                start_time=start_time,
                end_time=end_time
            )
            
            # Should return data with correct timestamps
            for point in data_points:
                assert start_time <= point.timestamp <= end_time
    
    @pytest.mark.asyncio
    async def test_get_available_stations_all(self):
        """Test getting all available stations."""
        async with CPCBClient() as client:
            stations = await client.get_available_stations()
            
            assert len(stations) > 0
            
            # Check station structure
            for station in stations:
                assert "station_id" in station
                assert "name" in station
                assert "city" in station
                assert "state" in station
                assert "latitude" in station
                assert "longitude" in station
                assert "parameters" in station
    
    @pytest.mark.asyncio
    async def test_get_available_stations_filtered(self):
        """Test getting stations filtered by city."""
        async with CPCBClient() as client:
            delhi_stations = await client.get_available_stations(city="Delhi")
            mumbai_stations = await client.get_available_stations(city="Mumbai")
            
            # Check filtering works
            for station in delhi_stations:
                assert station["city"] == "Delhi"
            
            for station in mumbai_stations:
                assert station["city"] == "Mumbai"
            
            assert len(delhi_stations) > len(mumbai_stations)  # Delhi has more stations
    
    @pytest.mark.asyncio
    async def test_get_station_status(self):
        """Test getting station status."""
        async with CPCBClient() as client:
            status = await client.get_station_status("DL001")
            
            assert "station_id" in status
            assert "station_name" in status
            assert "status" in status
            assert "uptime_percentage" in status
            assert "parameters_available" in status
            assert status["status"] in ["operational", "maintenance", "partial"]
    
    @pytest.mark.asyncio
    async def test_realistic_data_generation(self):
        """Test that generated data follows realistic patterns."""
        async with CPCBClient() as client:
            # Test Delhi station (high pollution)
            delhi_data = await client.fetch_data(stations=["DL001"])
            
            # Test Bangalore station (lower pollution)
            bangalore_data = await client.fetch_data(stations=["KA001"])
            
            # Delhi should generally have higher PM2.5 than Bangalore
            delhi_pm25 = [p for p in delhi_data if p.parameter == "pm25"][0]
            bangalore_pm25 = [p for p in bangalore_data if p.parameter == "pm25"][0]
            
            # This is a statistical expectation, not a hard rule
            # Delhi typically has higher pollution levels
            assert delhi_pm25.value > 20  # Delhi PM2.5 should be significant
            assert bangalore_pm25.value < delhi_pm25.value * 1.5  # But not unrealistically different
    
    @pytest.mark.asyncio
    async def test_error_handling_unknown_station(self):
        """Test error handling for unknown stations."""
        async with CPCBClient() as client:
            data_points = await client.fetch_data(stations=["UNKNOWN"])
            
            # Should return empty list for unknown stations
            assert len(data_points) == 0
    
    @pytest.mark.asyncio
    async def test_data_quality_flags(self):
        """Test that data quality flags are properly set."""
        async with CPCBClient() as client:
            data_points = await client.fetch_data(stations=["DL001"])
            
            for point in data_points:
                # Since we're using simulated data, quality should be "estimated"
                assert point.quality_flag == "estimated"
                assert "data_source" in point.metadata
                assert point.metadata["data_source"] == "simulated_realistic"


class TestCPCBTasks:
    """Test cases for CPCB Celery tasks."""
    
    def test_ingest_cpcb_data_task(self):
        """Test CPCB data ingestion task."""
        # Mock database operations
        with patch('src.tasks.data_ingestion.get_db'), \
             patch('src.tasks.data_ingestion._store_air_quality_measurement'):
            
            result = ingest_cpcb_data.apply(
                args=[["DL001", "DL002"], None, None]
            ).get()
            
            assert result["task"] == "ingest_cpcb_data"
            assert "ingested_count" in result
            assert "failed_count" in result
            assert "estimated_count" in result
            assert "success_rate" in result
            assert result["success_rate"] >= 0
    
    def test_get_cpcb_stations_task(self):
        """Test CPCB stations retrieval task."""
        result = get_cpcb_stations.apply(
            args=["Delhi", None]
        ).get()
        
        assert result["task"] == "get_cpcb_stations"
        assert "stations" in result
        assert "station_statuses" in result
        assert "total_stations" in result
        assert len(result["stations"]) > 0
    
    def test_check_cpcb_station_status_task(self):
        """Test CPCB station status check task."""
        result = check_cpcb_station_status.apply(
            args=["DL001"]
        ).get()
        
        assert result["task"] == "check_cpcb_station_status"
        assert "station_id" in result
        assert "status" in result
        assert result["station_id"] == "DL001"


class TestCPCBIntegration:
    """Integration tests for CPCB functionality."""
    
    @pytest.mark.asyncio
    async def test_multi_city_data_consistency(self):
        """Test data consistency across multiple cities."""
        async with CPCBClient() as client:
            # Get stations from different cities
            delhi_stations = await client.get_available_stations(city="Delhi")
            mumbai_stations = await client.get_available_stations(city="Mumbai")
            
            # Fetch data from each city
            delhi_data = await client.fetch_data(
                stations=[s["station_id"] for s in delhi_stations[:2]]
            )
            mumbai_data = await client.fetch_data(
                stations=[s["station_id"] for s in mumbai_stations[:2]]
            )
            
            # Verify data structure consistency
            for data_set in [delhi_data, mumbai_data]:
                for point in data_set:
                    assert isinstance(point, DataPoint)
                    assert point.source == "cpcb"
                    assert point.value >= 0
                    assert point.unit in ["µg/m³", "mg/m³"]
                    assert point.parameter in ["pm25", "pm10", "no2", "so2", "o3", "co"]
    
    @pytest.mark.asyncio
    async def test_temporal_data_patterns(self):
        """Test that temporal patterns in data are realistic."""
        async with CPCBClient() as client:
            # Test different times of day
            morning_time = datetime.utcnow().replace(hour=8, minute=0, second=0, microsecond=0)
            night_time = datetime.utcnow().replace(hour=2, minute=0, second=0, microsecond=0)
            
            morning_data = await client.fetch_data(
                stations=["DL001"],
                start_time=morning_time,
                end_time=morning_time
            )
            
            night_data = await client.fetch_data(
                stations=["DL001"],
                start_time=night_time,
                end_time=night_time
            )
            
            # Morning (rush hour) should generally have higher pollution
            morning_pm25 = [p for p in morning_data if p.parameter == "pm25"][0]
            night_pm25 = [p for p in night_data if p.parameter == "pm25"][0]
            
            # This is a statistical expectation
            assert morning_pm25.value > 0
            assert night_pm25.value > 0
            # Morning values are typically higher due to traffic
            assert morning_pm25.value >= night_pm25.value * 0.8
    
    def test_station_coverage(self):
        """Test that we have good station coverage across major cities."""
        client = CPCBClient()
        
        # Check that we have stations in major cities
        cities_with_stations = set()
        for station_id, info in client.station_mapping.items():
            cities_with_stations.add(info.get("city", ""))
        
        expected_cities = {"Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"}
        assert expected_cities.issubset(cities_with_stations)
        
        # Check that Delhi has the most stations (as expected)
        delhi_stations = [s for s in client.station_mapping.values() if s.get("city") == "Delhi"]
        mumbai_stations = [s for s in client.station_mapping.values() if s.get("city") == "Mumbai"]
        
        assert len(delhi_stations) >= len(mumbai_stations)
    
    @pytest.mark.asyncio
    async def test_error_recovery(self):
        """Test error recovery and fallback mechanisms."""
        async with CPCBClient() as client:
            # Test with mix of valid and invalid stations
            mixed_stations = ["DL001", "INVALID", "DL002", "ALSO_INVALID"]
            
            data_points = await client.fetch_data(stations=mixed_stations)
            
            # Should get data for valid stations only
            valid_station_ids = {p.station_id for p in data_points}
            assert "DL001" in valid_station_ids
            assert "DL002" in valid_station_ids
            assert "INVALID" not in valid_station_ids
            assert "ALSO_INVALID" not in valid_station_ids
    
    def test_metadata_completeness(self):
        """Test that metadata is complete and informative."""
        async def check_metadata():
            async with CPCBClient() as client:
                data_points = await client.fetch_data(stations=["DL001"])
                
                for point in data_points:
                    assert point.metadata is not None
                    assert "station_name" in point.metadata
                    assert "city" in point.metadata
                    assert "state" in point.metadata
                    assert "data_source" in point.metadata
                    assert "note" in point.metadata
                    
                    # Check that note explains the data source
                    assert "CPCB API not publicly available" in point.metadata["note"]
        
        asyncio.run(check_metadata())


if __name__ == "__main__":
    pytest.main([__file__])