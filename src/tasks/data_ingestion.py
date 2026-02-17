"""
Data ingestion tasks for collecting air quality and weather data.
Handles data from CPCB, OpenAQ, weather services, and other sources.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from celery import Task
from sqlalchemy.orm import Session

from src.tasks.celery_app import celery_app
from src.data.ingestion_clients import (
    DataIngestionOrchestrator, CPCBClient, IMDClient, 
    OpenAQClient, GoogleMapsClient, DataPoint, WeatherPoint
)
from src.data.satellite_client import (
    SatelliteDataOrchestrator, TROPOMIClient, VIIRSClient, SatelliteDataPoint
)
from src.api.database import get_db
from src.api.models import AirQualityMeasurement, WeatherData, MonitoringStation
from src.data.quality_validator import DataQualityValidator
from geoalchemy2 import WKTElement

logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} succeeded with result: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed with exception: {exc}")


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_cpcb_data(self, stations: List[str] = None, 
                     start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """
    Ingest air quality data from CPCB (Central Pollution Control Board).
    
    This task fetches data from CPCB monitoring stations across India.
    Since CPCB doesn't provide a public API, the implementation:
    1. Attempts to fetch real data from official sources
    2. Falls back to realistic simulated data based on historical patterns
    3. Uses actual station locations and monitoring parameters
    
    Args:
        stations: List of station IDs to fetch data for. If None, fetch all active stations.
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with ingestion results and statistics.
    """
    try:
        logger.info("Starting CPCB data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(hours=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_cpcb_data(stations, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"CPCB data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"CPCB data ingestion failed: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_cpcb_data(stations: List[str], start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Async helper for CPCB data ingestion."""
    ingested_count = 0
    failed_count = 0
    estimated_count = 0
    
    async with CPCBClient() as client:
        data_points = await client.fetch_data(
            stations=stations,
            start_time=start_time,
            end_time=end_time
        )
        
        # Store data points in database
        db = next(get_db())
        try:
            for data_point in data_points:
                try:
                    await _store_air_quality_measurement(db, data_point)
                    ingested_count += 1
                    
                    # Track if data is estimated vs real-time
                    if data_point.quality_flag == "estimated":
                        estimated_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to store CPCB data point: {e}")
                    failed_count += 1
        finally:
            db.close()
    
    return {
        "task": "ingest_cpcb_data",
        "timestamp": datetime.utcnow().isoformat(),
        "stations_processed": len(stations) if stations else 0,
        "ingested_count": ingested_count,
        "failed_count": failed_count,
        "estimated_count": estimated_count,
        "real_time_count": ingested_count - estimated_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0,
        "data_quality": "mixed" if estimated_count > 0 else "real_time"
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_weather_data(self, locations: List[Dict[str, float]] = None,
                       station_ids: List[str] = None,
                       start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """
    Ingest weather data from IMD (India Meteorological Department) stations.
    
    This task fetches weather data from IMD stations using OpenWeatherMap API
    as the backend data source, providing comprehensive meteorological data
    for air quality prediction models.
    
    Args:
        locations: List of location dictionaries with lat/lon coordinates.
        station_ids: List of IMD station IDs to fetch data for.
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with ingestion results and statistics.
    """
    try:
        logger.info("Starting IMD weather data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(hours=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Convert locations to tuples
        location_tuples = []
        if locations:
            location_tuples = [(loc["lat"], loc["lon"]) for loc in locations]
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_weather_data(location_tuples, station_ids, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"IMD weather data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"IMD weather data ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_weather_data(locations: List[tuple], station_ids: List[str], 
                                   start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Async helper for IMD weather data ingestion."""
    ingested_count = 0
    failed_count = 0
    forecast_count = 0
    real_time_count = 0
    simulated_count = 0
    
    # Default to major IMD stations if no specific locations or stations provided
    if not locations and not station_ids:
        station_ids = ["DL_SAFDARJUNG", "MH_COLABA", "KA_HAL", "TN_MEENAMBAKKAM", "WB_DUMDUM"]
    
    async with IMDClient() as client:
        # Fetch current weather data
        weather_points = await client.fetch_weather_data(
            locations=locations,
            station_ids=station_ids,
            start_time=start_time,
            end_time=end_time
        )
        
        # Also fetch forecast data for better ML model input
        forecast_points = await client.fetch_forecast_data(
            locations=locations,
            station_ids=station_ids,
            hours=24  # 24-hour forecast
        )
        
        # Store weather points in database
        db = next(get_db())
        try:
            # Store current weather data
            for weather_point in weather_points:
                try:
                    await _store_weather_data(db, weather_point)
                    ingested_count += 1
                    
                    # Track data quality
                    if weather_point.source == "imd_openweather":
                        real_time_count += 1
                    elif weather_point.source == "imd_simulated":
                        simulated_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to store weather point: {e}")
                    failed_count += 1
            
            # Store forecast data
            for forecast_point in forecast_points:
                try:
                    await _store_weather_data(db, forecast_point)
                    forecast_count += 1
                except Exception as e:
                    logger.error(f"Failed to store forecast point: {e}")
                    failed_count += 1
                    
        finally:
            db.close()
    
    total_processed = ingested_count + forecast_count
    
    return {
        "task": "ingest_weather_data",
        "timestamp": datetime.utcnow().isoformat(),
        "locations_processed": len(locations) if locations else 0,
        "stations_processed": len(station_ids) if station_ids else 0,
        "current_weather_ingested": ingested_count,
        "forecast_data_ingested": forecast_count,
        "total_ingested": total_processed,
        "failed_count": failed_count,
        "real_time_count": real_time_count,
        "simulated_count": simulated_count,
        "success_rate": total_processed / (total_processed + failed_count) if (total_processed + failed_count) > 0 else 0,
        "data_quality": "mixed" if simulated_count > 0 else "real_time"
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_openaq_data(self, cities: List[str] = None,
                      start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """
    Ingest air quality data from OpenAQ API.
    
    Args:
        cities: List of city names to fetch data for.
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with ingestion results and statistics.
    """
    try:
        logger.info("Starting OpenAQ data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(hours=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_openaq_data(cities, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"OpenAQ data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"OpenAQ data ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_openaq_data(cities: List[str], start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Async helper for OpenAQ data ingestion."""
    ingested_count = 0
    failed_count = 0
    
    if not cities:
        cities = ["Delhi", "Mumbai", "Bangalore", "Chennai"]
    
    async with OpenAQClient() as client:
        data_points = await client.fetch_data(
            cities=cities,
            start_time=start_time,
            end_time=end_time
        )
        
        # Store data points in database
        db = next(get_db())
        try:
            for data_point in data_points:
                try:
                    await _store_air_quality_measurement(db, data_point)
                    ingested_count += 1
                except Exception as e:
                    logger.error(f"Failed to store data point: {e}")
                    failed_count += 1
        finally:
            db.close()
    
    return {
        "task": "ingest_openaq_data",
        "timestamp": datetime.utcnow().isoformat(),
        "cities_processed": len(cities),
        "ingested_count": ingested_count,
        "failed_count": failed_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_traffic_data(self, locations: List[Dict[str, float]] = None) -> Dict[str, Any]:
    """
    Ingest traffic data from Google Maps API.
    
    Args:
        locations: List of location dictionaries with lat/lon coordinates.
        
    Returns:
        Dictionary with ingestion results and statistics.
    """
    try:
        logger.info("Starting traffic data ingestion")
        
        # Convert locations to tuples
        location_tuples = []
        if locations:
            location_tuples = [(loc["lat"], loc["lon"]) for loc in locations]
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_traffic_data(location_tuples)
            )
        finally:
            loop.close()
        
        logger.info(f"Traffic data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Traffic data ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_traffic_data(locations: List[tuple]) -> Dict[str, Any]:
    """Async helper for traffic data ingestion."""
    ingested_count = 0
    failed_count = 0
    
    # Default locations if none provided
    if not locations:
        locations = [
            (28.6139, 77.2090),  # Central Delhi
            (28.7041, 77.1025),  # North Delhi
            (28.5355, 77.3910),  # East Delhi
            (28.5706, 77.0688),  # South Delhi
        ]
    
    async with GoogleMapsClient() as client:
        traffic_data = await client.fetch_traffic_data(locations=locations)
        
        # Store traffic data (would need a separate table/model for traffic data)
        # For now, just count successful fetches
        ingested_count = len(traffic_data)
    
    return {
        "task": "ingest_traffic_data",
        "timestamp": datetime.utcnow().isoformat(),
        "locations_processed": len(locations),
        "ingested_count": ingested_count,
        "failed_count": failed_count,
        "success_rate": 1.0 if ingested_count > 0 else 0.0
    }


@celery_app.task(base=CallbackTask, bind=True)
def ingest_all_sources(self, locations: List[Dict[str, float]] = None,
                      start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """
    Orchestrate data ingestion from all sources.
    
    Args:
        locations: List of location dictionaries with lat/lon coordinates.
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with combined ingestion results.
    """
    try:
        logger.info("Starting comprehensive data ingestion from all sources")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(hours=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Convert locations to tuples
        location_tuples = []
        if locations:
            location_tuples = [(loc["lat"], loc["lon"]) for loc in locations]
        
        # Run async orchestrated ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_all_sources(location_tuples, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"Comprehensive data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Comprehensive data ingestion failed: {exc}")
        raise


async def _async_ingest_all_sources(locations: List[tuple], start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Async helper for comprehensive data ingestion."""
    orchestrator = DataIngestionOrchestrator()
    await orchestrator.initialize_clients()
    
    # Ingest from all sources
    results = await orchestrator.ingest_all_sources(
        locations=locations,
        start_time=start_time,
        end_time=end_time
    )
    
    # Store all data in database
    db = next(get_db())
    ingestion_stats = {
        "air_quality_stored": 0,
        "weather_stored": 0,
        "air_quality_failed": 0,
        "weather_failed": 0
    }
    
    try:
        # Store air quality data
        for data_point in results["air_quality"]:
            try:
                await _store_air_quality_measurement(db, data_point)
                ingestion_stats["air_quality_stored"] += 1
            except Exception as e:
                logger.error(f"Failed to store air quality data: {e}")
                ingestion_stats["air_quality_failed"] += 1
        
        # Store weather data
        for weather_point in results["weather"]:
            try:
                await _store_weather_data(db, weather_point)
                ingestion_stats["weather_stored"] += 1
            except Exception as e:
                logger.error(f"Failed to store weather data: {e}")
                ingestion_stats["weather_failed"] += 1
    
    finally:
        db.close()
    
    return {
        "task": "ingest_all_sources",
        "timestamp": datetime.utcnow().isoformat(),
        "locations_processed": len(locations) if locations else 4,
        "air_quality_points": len(results["air_quality"]),
        "weather_points": len(results["weather"]),
        "traffic_points": len(results["traffic"]),
        "storage_stats": ingestion_stats
    }


async def _store_air_quality_measurement(db: Session, data_point: DataPoint):
    """Store air quality measurement in database."""
    measurement = AirQualityMeasurement(
        time=data_point.timestamp,
        station_id=data_point.station_id or f"unknown_{data_point.source}",
        parameter=data_point.parameter,
        value=data_point.value,
        unit=data_point.unit,
        quality_flag=data_point.quality_flag,
        source=data_point.source,
        location=WKTElement(f"POINT({data_point.location[1]} {data_point.location[0]})", srid=4326)
    )
    
    db.add(measurement)
    db.commit()


async def _store_weather_data(db: Session, weather_point: WeatherPoint):
    """Store weather data in database."""
    weather_data = WeatherData(
        time=weather_point.timestamp,
        location=WKTElement(f"POINT({weather_point.location[1]} {weather_point.location[0]})", srid=4326),
        temperature=weather_point.temperature,
        humidity=weather_point.humidity,
        wind_speed=weather_point.wind_speed,
        wind_direction=weather_point.wind_direction,
        pressure=weather_point.pressure,
        precipitation=weather_point.precipitation,
        visibility=weather_point.visibility,
        source=weather_point.source
    )
    
    db.add(weather_data)
    db.commit()


@celery_app.task(base=CallbackTask)
def validate_data_quality(data_batch: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate data quality for ingested measurements.
    
    Args:
        data_batch: Batch of measurements to validate.
        
    Returns:
        Validation results with quality flags.
    """
    try:
        logger.info("Starting comprehensive data quality validation")
        
        validator = DataQualityValidator()
        
        # Extract data points from batch
        air_quality_points = data_batch.get("air_quality", [])
        weather_points = data_batch.get("weather", [])
        
        validation_results = {
            "task": "validate_data_quality",
            "timestamp": datetime.utcnow().isoformat(),
            "air_quality_validation": {},
            "weather_validation": {}
        }
        
        # Validate air quality data
        if air_quality_points:
            # Convert dict data to DataPoint objects if needed
            if isinstance(air_quality_points[0], dict):
                from src.data.ingestion_clients import DataPoint
                aq_data_points = []
                for point in air_quality_points:
                    aq_data_points.append(DataPoint(
                        timestamp=datetime.fromisoformat(point["timestamp"]),
                        location=(point["location"]["lat"], point["location"]["lon"]),
                        parameter=point["parameter"],
                        value=point["value"],
                        unit=point["unit"],
                        source=point["source"],
                        station_id=point.get("station_id")
                    ))
                air_quality_points = aq_data_points
            
            validated_aq, aq_stats = validator.validate_data_points(air_quality_points)
            
            validation_results["air_quality_validation"] = {
                "total_records": aq_stats.total_records,
                "valid_records": aq_stats.valid_records,
                "flagged_records": aq_stats.flagged_records,
                "outliers": aq_stats.outliers,
                "missing_values": aq_stats.missing_values,
                "imputed_values": aq_stats.imputed_values,
                "quality_score": aq_stats.quality_score
            }
            
            # Store quality flags in database
            db = next(get_db())
            try:
                validator.store_quality_flags(db, validated_aq, aq_stats)
            finally:
                db.close()
        
        # Validate weather data
        if weather_points:
            # Convert dict data to WeatherPoint objects if needed
            if isinstance(weather_points[0], dict):
                from src.data.ingestion_clients import WeatherPoint
                weather_data_points = []
                for point in weather_points:
                    weather_data_points.append(WeatherPoint(
                        timestamp=datetime.fromisoformat(point["timestamp"]),
                        location=(point["location"]["lat"], point["location"]["lon"]),
                        temperature=point.get("temperature"),
                        humidity=point.get("humidity"),
                        wind_speed=point.get("wind_speed"),
                        wind_direction=point.get("wind_direction"),
                        pressure=point.get("pressure"),
                        precipitation=point.get("precipitation"),
                        visibility=point.get("visibility"),
                        source=point["source"]
                    ))
                weather_points = weather_data_points
            
            validated_weather, weather_stats = validator.validate_weather_points(weather_points)
            
            validation_results["weather_validation"] = {
                "total_records": weather_stats.total_records,
                "valid_records": weather_stats.valid_records,
                "flagged_records": weather_stats.flagged_records,
                "outliers": weather_stats.outliers,
                "missing_values": weather_stats.missing_values,
                "imputed_values": weather_stats.imputed_values,
                "quality_score": weather_stats.quality_score
            }
        
        # Calculate overall quality score
        total_records = validation_results["air_quality_validation"].get("total_records", 0) + \
                       validation_results["weather_validation"].get("total_records", 0)
        total_valid = validation_results["air_quality_validation"].get("valid_records", 0) + \
                     validation_results["weather_validation"].get("valid_records", 0)
        
        validation_results["overall_quality_score"] = total_valid / total_records if total_records > 0 else 0
        validation_results["total_records_processed"] = total_records
        
        logger.info(f"Data quality validation completed: {validation_results}")
        return validation_results
        
    except Exception as e:
        logger.error(f"Data quality validation failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def cleanup_expired_data() -> Dict[str, Any]:
    """
    Clean up expired data based on retention policies.
    
    Returns:
        Dictionary with cleanup results and statistics.
    """
    try:
        logger.info("Starting automated data cleanup")
        
        from src.data.quality_validator import DataRetentionManager
        
        db = next(get_db())
        try:
            retention_manager = DataRetentionManager(db)
            cleanup_stats = retention_manager.cleanup_expired_data()
            
            result = {
                "task": "cleanup_expired_data",
                "timestamp": datetime.utcnow().isoformat(),
                "cleanup_stats": cleanup_stats,
                "total_deleted": sum(cleanup_stats.values())
            }
            
            logger.info(f"Data cleanup completed: {result}")
            return result
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error(f"Data cleanup failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def track_data_lineage(event_type: str, source: str, record_count: int, 
                      metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Track data lineage and audit information.
    
    Args:
        event_type: Type of event (ingestion, validation, processing)
        source: Data source identifier
        record_count: Number of records processed
        metadata: Additional metadata
        
    Returns:
        Dictionary with lineage tracking results.
    """
    try:
        logger.info(f"Tracking data lineage: {event_type} from {source}")
        
        from src.data.quality_validator import DataLineageTracker
        
        tracker = DataLineageTracker()
        
        if event_type == "ingestion":
            tracker.track_ingestion(source, datetime.utcnow(), record_count, metadata)
        elif event_type == "processing":
            process_type = metadata.get("process_type", "unknown") if metadata else "unknown"
            input_count = metadata.get("input_count", record_count) if metadata else record_count
            tracker.track_processing(process_type, datetime.utcnow(), input_count, record_count, metadata)
        
        lineage_summary = tracker.get_lineage_summary()
        
        result = {
            "task": "track_data_lineage",
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "source": source,
            "record_count": record_count,
            "lineage_summary": lineage_summary
        }
        
        logger.info(f"Data lineage tracking completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Data lineage tracking failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def get_cpcb_stations(city: str = None, state: str = None) -> Dict[str, Any]:
    """
    Get available CPCB monitoring stations.
    
    Args:
        city: Filter by city name (optional)
        state: Filter by state name (optional)
        
    Returns:
        Dictionary with station information and metadata.
    """
    try:
        logger.info(f"Fetching CPCB stations for city={city}, state={state}")
        
        # Run async station fetch
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_get_cpcb_stations(city, state)
            )
        finally:
            loop.close()
        
        logger.info(f"CPCB stations fetch completed: {len(result['stations'])} stations found")
        return result
        
    except Exception as e:
        logger.error(f"CPCB stations fetch failed: {e}")
        raise


async def _async_get_cpcb_stations(city: str, state: str) -> Dict[str, Any]:
    """Async helper for CPCB stations fetch."""
    async with CPCBClient() as client:
        stations = await client.get_available_stations(city=city, state=state)
        
        # Get status for each station
        station_statuses = []
        for station in stations:
            try:
                status = await client.get_station_status(station["station_id"])
                station_statuses.append(status)
            except Exception as e:
                logger.warning(f"Failed to get status for station {station['station_id']}: {e}")
                station_statuses.append({
                    "station_id": station["station_id"],
                    "status": "unknown",
                    "message": str(e)
                })
    
    return {
        "task": "get_cpcb_stations",
        "timestamp": datetime.utcnow().isoformat(),
        "filters": {"city": city, "state": state},
        "stations": stations,
        "station_statuses": station_statuses,
        "total_stations": len(stations),
        "operational_stations": len([s for s in station_statuses if s.get("status") == "operational"])
    }


@celery_app.task(base=CallbackTask)
def check_cpcb_station_status(station_id: str) -> Dict[str, Any]:
    """
    Check operational status of a specific CPCB monitoring station.
    
    Args:
        station_id: CPCB station identifier
        
    Returns:
        Dictionary with station status information.
    """
    try:
        logger.info(f"Checking CPCB station status for {station_id}")
        
        # Run async status check
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_check_cpcb_station_status(station_id)
            )
        finally:
            loop.close()
        
        logger.info(f"CPCB station status check completed for {station_id}")
        return result
        
    except Exception as e:
        logger.error(f"CPCB station status check failed for {station_id}: {e}")
        raise


async def _async_check_cpcb_station_status(station_id: str) -> Dict[str, Any]:
    """Async helper for CPCB station status check."""
    async with CPCBClient() as client:
        status = await client.get_station_status(station_id)
    
    return {
        "task": "check_cpcb_station_status",
        "timestamp": datetime.utcnow().isoformat(),
        "station_id": station_id,
        "status": status
    }


@celery_app.task(base=CallbackTask)
def get_imd_stations(city: str = None, state: str = None) -> Dict[str, Any]:
    """
    Get available IMD weather monitoring stations.
    
    Args:
        city: Filter by city name (optional)
        state: Filter by state name (optional)
        
    Returns:
        Dictionary with IMD station information and metadata.
    """
    try:
        logger.info(f"Fetching IMD weather stations for city={city}, state={state}")
        
        # Run async station fetch
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_get_imd_stations(city, state)
            )
        finally:
            loop.close()
        
        logger.info(f"IMD stations fetch completed: {len(result['stations'])} stations found")
        return result
        
    except Exception as e:
        logger.error(f"IMD stations fetch failed: {e}")
        raise


async def _async_get_imd_stations(city: str, state: str) -> Dict[str, Any]:
    """Async helper for IMD stations fetch."""
    async with IMDClient() as client:
        stations = await client.get_available_stations(city=city, state=state)
        
        # Get status for each station
        station_statuses = []
        for station in stations:
            try:
                status = await client.get_station_status(station["station_id"])
                station_statuses.append(status)
            except Exception as e:
                logger.warning(f"Failed to get status for IMD station {station['station_id']}: {e}")
                station_statuses.append({
                    "station_id": station["station_id"],
                    "status": "unknown",
                    "message": str(e)
                })
    
    return {
        "task": "get_imd_stations",
        "timestamp": datetime.utcnow().isoformat(),
        "filters": {"city": city, "state": state},
        "stations": stations,
        "station_statuses": station_statuses,
        "total_stations": len(stations),
        "operational_stations": len([s for s in station_statuses if s.get("status") == "operational"]),
        "data_sources": ["openweathermap_api", "realistic_simulation"]
    }


@celery_app.task(base=CallbackTask)
def check_imd_station_status(station_id: str) -> Dict[str, Any]:
    """
    Check operational status of a specific IMD weather monitoring station.
    
    Args:
        station_id: IMD station identifier
        
    Returns:
        Dictionary with station status information.
    """
    try:
        logger.info(f"Checking IMD weather station status for {station_id}")
        
        # Run async status check
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_check_imd_station_status(station_id)
            )
        finally:
            loop.close()
        
        logger.info(f"IMD station status check completed for {station_id}")
        return result
        
    except Exception as e:
        logger.error(f"IMD station status check failed for {station_id}: {e}")
        raise


async def _async_check_imd_station_status(station_id: str) -> Dict[str, Any]:
    """Async helper for IMD station status check."""
    async with IMDClient() as client:
        status = await client.get_station_status(station_id)
    
    return {
        "task": "check_imd_station_status",
        "timestamp": datetime.utcnow().isoformat(),
        "station_id": station_id,
        "status": status
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_satellite_data(self, 
                         sources: List[str] = None,
                         parameters: List[str] = None,
                         bbox: Dict[str, float] = None,
                         start_time: str = None, 
                         end_time: str = None) -> Dict[str, Any]:
    """
    Ingest satellite data from TROPOMI and VIIRS sources.
    
    This task fetches satellite-based air quality measurements from:
    1. TROPOMI (Sentinel-5P) - NO2, SO2, CO, aerosol index
    2. VIIRS (Suomi NPP) - aerosol optical depth, fire detection
    
    Args:
        sources: List of satellite sources ('tropomi', 'viirs'). If None, fetch all.
        parameters: List of parameters to fetch. If None, fetch default parameters.
        bbox: Bounding box dict with min_lat, max_lat, min_lon, max_lon
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with ingestion results and statistics.
    """
    try:
        logger.info("Starting satellite data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(days=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Default to India bounding box if not provided
        if not bbox:
            bbox = {
                "min_lat": 6.0,
                "max_lat": 37.0,
                "min_lon": 68.0,
                "max_lon": 97.0
            }
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_satellite_data(sources, parameters, bbox, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"Satellite data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Satellite data ingestion failed: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_satellite_data(sources: List[str], 
                                     parameters: List[str],
                                     bbox: Dict[str, float],
                                     start_time: datetime, 
                                     end_time: datetime) -> Dict[str, Any]:
    """Async helper for satellite data ingestion."""
    ingested_count = 0
    failed_count = 0
    tropomi_count = 0
    viirs_count = 0
    real_time_count = 0
    estimated_count = 0
    
    # Default sources and parameters
    if not sources:
        sources = ["tropomi", "viirs"]
    
    # Initialize orchestrator
    orchestrator = SatelliteDataOrchestrator()
    await orchestrator.initialize_clients()
    
    # Store results by source
    source_results = {}
    
    # Ingest TROPOMI data
    if "tropomi" in sources:
        try:
            tropomi_params = parameters if parameters else ["no2", "so2", "co"]
            async with TROPOMIClient() as client:
                tropomi_data = await client.fetch_satellite_data(
                    parameters=tropomi_params,
                    bbox=bbox,
                    start_time=start_time,
                    end_time=end_time
                )
                source_results["tropomi"] = tropomi_data
                tropomi_count = len(tropomi_data)
        except Exception as e:
            logger.error(f"TROPOMI data ingestion failed: {e}")
            source_results["tropomi"] = []
    
    # Ingest VIIRS data
    if "viirs" in sources:
        try:
            viirs_params = parameters if parameters else ["aerosol_optical_depth", "fire_radiative_power"]
            async with VIIRSClient() as client:
                viirs_data = await client.fetch_satellite_data(
                    parameters=viirs_params,
                    bbox=bbox,
                    start_time=start_time,
                    end_time=end_time
                )
                source_results["viirs"] = viirs_data
                viirs_count = len(viirs_data)
        except Exception as e:
            logger.error(f"VIIRS data ingestion failed: {e}")
            source_results["viirs"] = []
    
    # Store all satellite data in database
    db = next(get_db())
    try:
        for source, satellite_points in source_results.items():
            for sat_point in satellite_points:
                try:
                    await _store_satellite_measurement(db, sat_point)
                    ingested_count += 1
                    
                    # Track data quality
                    if sat_point.quality_flag == "real_time":
                        real_time_count += 1
                    elif sat_point.quality_flag == "estimated":
                        estimated_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to store satellite data point: {e}")
                    failed_count += 1
    finally:
        db.close()
    
    return {
        "task": "ingest_satellite_data",
        "timestamp": datetime.utcnow().isoformat(),
        "sources_processed": sources,
        "bbox": bbox,
        "tropomi_points": tropomi_count,
        "viirs_points": viirs_count,
        "total_ingested": ingested_count,
        "failed_count": failed_count,
        "real_time_count": real_time_count,
        "estimated_count": estimated_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0,
        "data_quality": "mixed" if estimated_count > 0 else "real_time"
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_tropomi_data(self, 
                       parameters: List[str] = None,
                       bbox: Dict[str, float] = None,
                       start_time: str = None, 
                       end_time: str = None,
                       max_cloud_fraction: float = 0.3) -> Dict[str, Any]:
    """
    Ingest TROPOMI satellite data specifically.
    
    Args:
        parameters: List of TROPOMI parameters (no2, so2, co, aerosol_index)
        bbox: Bounding box dict with min_lat, max_lat, min_lon, max_lon
        start_time: ISO format start time string
        end_time: ISO format end time string
        max_cloud_fraction: Maximum cloud fraction for data filtering
        
    Returns:
        Dictionary with TROPOMI ingestion results and statistics.
    """
    try:
        logger.info("Starting TROPOMI satellite data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(days=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Default parameters
        if not parameters:
            parameters = ["no2", "so2", "co"]
        
        # Default to India bounding box
        if not bbox:
            bbox = {
                "min_lat": 6.0,
                "max_lat": 37.0,
                "min_lon": 68.0,
                "max_lon": 97.0
            }
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_tropomi_data(parameters, bbox, start_dt, end_dt, max_cloud_fraction)
            )
        finally:
            loop.close()
        
        logger.info(f"TROPOMI data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"TROPOMI data ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_tropomi_data(parameters: List[str],
                                   bbox: Dict[str, float],
                                   start_time: datetime,
                                   end_time: datetime,
                                   max_cloud_fraction: float) -> Dict[str, Any]:
    """Async helper for TROPOMI data ingestion."""
    ingested_count = 0
    failed_count = 0
    real_time_count = 0
    estimated_count = 0
    parameter_counts = {}
    
    async with TROPOMIClient() as client:
        satellite_points = await client.fetch_satellite_data(
            parameters=parameters,
            bbox=bbox,
            start_time=start_time,
            end_time=end_time,
            max_cloud_fraction=max_cloud_fraction
        )
        
        # Store satellite data in database
        db = next(get_db())
        try:
            for sat_point in satellite_points:
                try:
                    await _store_satellite_measurement(db, sat_point)
                    ingested_count += 1
                    
                    # Track parameter counts
                    param = sat_point.parameter
                    parameter_counts[param] = parameter_counts.get(param, 0) + 1
                    
                    # Track data quality
                    if sat_point.quality_flag == "real_time":
                        real_time_count += 1
                    elif sat_point.quality_flag == "estimated":
                        estimated_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to store TROPOMI data point: {e}")
                    failed_count += 1
        finally:
            db.close()
    
    return {
        "task": "ingest_tropomi_data",
        "timestamp": datetime.utcnow().isoformat(),
        "parameters_processed": parameters,
        "bbox": bbox,
        "max_cloud_fraction": max_cloud_fraction,
        "parameter_counts": parameter_counts,
        "total_ingested": ingested_count,
        "failed_count": failed_count,
        "real_time_count": real_time_count,
        "estimated_count": estimated_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0,
        "data_quality": "mixed" if estimated_count > 0 else "real_time"
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_viirs_data(self, 
                     parameters: List[str] = None,
                     bbox: Dict[str, float] = None,
                     start_time: str = None, 
                     end_time: str = None) -> Dict[str, Any]:
    """
    Ingest VIIRS satellite data specifically.
    
    Args:
        parameters: List of VIIRS parameters (aerosol_optical_depth, fire_radiative_power)
        bbox: Bounding box dict with min_lat, max_lat, min_lon, max_lon
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with VIIRS ingestion results and statistics.
    """
    try:
        logger.info("Starting VIIRS satellite data ingestion")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(days=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Default parameters
        if not parameters:
            parameters = ["aerosol_optical_depth", "fire_radiative_power"]
        
        # Default to India bounding box
        if not bbox:
            bbox = {
                "min_lat": 6.0,
                "max_lat": 37.0,
                "min_lon": 68.0,
                "max_lon": 97.0
            }
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_viirs_data(parameters, bbox, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"VIIRS data ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"VIIRS data ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_viirs_data(parameters: List[str],
                                 bbox: Dict[str, float],
                                 start_time: datetime,
                                 end_time: datetime) -> Dict[str, Any]:
    """Async helper for VIIRS data ingestion."""
    ingested_count = 0
    failed_count = 0
    real_time_count = 0
    estimated_count = 0
    parameter_counts = {}
    fire_detections = 0
    
    async with VIIRSClient() as client:
        satellite_points = await client.fetch_satellite_data(
            parameters=parameters,
            bbox=bbox,
            start_time=start_time,
            end_time=end_time
        )
        
        # Store satellite data in database
        db = next(get_db())
        try:
            for sat_point in satellite_points:
                try:
                    await _store_satellite_measurement(db, sat_point)
                    ingested_count += 1
                    
                    # Track parameter counts
                    param = sat_point.parameter
                    parameter_counts[param] = parameter_counts.get(param, 0) + 1
                    
                    # Count fire detections
                    if param == "fire_radiative_power" and sat_point.value > 0:
                        fire_detections += 1
                    
                    # Track data quality
                    if sat_point.quality_flag == "real_time":
                        real_time_count += 1
                    elif sat_point.quality_flag == "estimated":
                        estimated_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to store VIIRS data point: {e}")
                    failed_count += 1
        finally:
            db.close()
    
    return {
        "task": "ingest_viirs_data",
        "timestamp": datetime.utcnow().isoformat(),
        "parameters_processed": parameters,
        "bbox": bbox,
        "parameter_counts": parameter_counts,
        "fire_detections": fire_detections,
        "total_ingested": ingested_count,
        "failed_count": failed_count,
        "real_time_count": real_time_count,
        "estimated_count": estimated_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0,
        "data_quality": "mixed" if estimated_count > 0 else "real_time"
    }


async def _store_satellite_measurement(db: Session, sat_point: SatelliteDataPoint):
    """Store satellite measurement in database."""
    # Convert SatelliteDataPoint to AirQualityMeasurement for storage
    # This allows satellite data to be stored alongside ground-based measurements
    measurement = AirQualityMeasurement(
        time=sat_point.timestamp,
        station_id=f"{sat_point.satellite}_{sat_point.parameter}",
        parameter=sat_point.parameter,
        value=sat_point.value,
        unit=sat_point.unit,
        quality_flag=sat_point.quality_flag,
        source=sat_point.source,
        location=WKTElement(f"POINT({sat_point.location[1]} {sat_point.location[0]})", srid=4326)
    )
    
    db.add(measurement)
    db.commit()


@celery_app.task(base=CallbackTask, bind=True)
def ingest_all_sources_with_satellite(self, 
                                     locations: List[Dict[str, float]] = None,
                                     bbox: Dict[str, float] = None,
                                     start_time: str = None, 
                                     end_time: str = None) -> Dict[str, Any]:
    """
    Orchestrate comprehensive data ingestion from all sources including satellite data.
    
    Args:
        locations: List of location dictionaries with lat/lon coordinates.
        bbox: Bounding box for satellite data retrieval
        start_time: ISO format start time string
        end_time: ISO format end time string
        
    Returns:
        Dictionary with combined ingestion results from all sources.
    """
    try:
        logger.info("Starting comprehensive data ingestion from all sources including satellite")
        
        # Parse time parameters
        start_dt = datetime.fromisoformat(start_time) if start_time else datetime.utcnow() - timedelta(hours=1)
        end_dt = datetime.fromisoformat(end_time) if end_time else datetime.utcnow()
        
        # Convert locations to tuples
        location_tuples = []
        if locations:
            location_tuples = [(loc["lat"], loc["lon"]) for loc in locations]
        
        # Default bbox for satellite data
        if not bbox:
            bbox = {
                "min_lat": 6.0,
                "max_lat": 37.0,
                "min_lon": 68.0,
                "max_lon": 97.0
            }
        
        # Run async orchestrated ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_all_sources_with_satellite(location_tuples, bbox, start_dt, end_dt)
            )
        finally:
            loop.close()
        
        logger.info(f"Comprehensive data ingestion with satellite completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Comprehensive data ingestion with satellite failed: {exc}")
        raise


async def _async_ingest_all_sources_with_satellite(locations: List[tuple], 
                                                 bbox: Dict[str, float],
                                                 start_time: datetime, 
                                                 end_time: datetime) -> Dict[str, Any]:
    """Async helper for comprehensive data ingestion including satellite sources."""
    # Initialize orchestrators
    ground_orchestrator = DataIngestionOrchestrator()
    satellite_orchestrator = SatelliteDataOrchestrator()
    
    await ground_orchestrator.initialize_clients()
    await satellite_orchestrator.initialize_clients()
    
    # Ingest from ground-based sources
    ground_results = await ground_orchestrator.ingest_all_sources(
        locations=locations,
        start_time=start_time,
        end_time=end_time
    )
    
    # Ingest from satellite sources
    satellite_results = await satellite_orchestrator.ingest_all_satellite_sources(
        bbox=bbox,
        start_time=start_time,
        end_time=end_time
    )
    
    # Store all data in database
    db = next(get_db())
    ingestion_stats = {
        "air_quality_stored": 0,
        "weather_stored": 0,
        "satellite_stored": 0,
        "air_quality_failed": 0,
        "weather_failed": 0,
        "satellite_failed": 0
    }
    
    try:
        # Store ground-based air quality data
        for data_point in ground_results["air_quality"]:
            try:
                await _store_air_quality_measurement(db, data_point)
                ingestion_stats["air_quality_stored"] += 1
            except Exception as e:
                logger.error(f"Failed to store air quality data: {e}")
                ingestion_stats["air_quality_failed"] += 1
        
        # Store weather data
        for weather_point in ground_results["weather"]:
            try:
                await _store_weather_data(db, weather_point)
                ingestion_stats["weather_stored"] += 1
            except Exception as e:
                logger.error(f"Failed to store weather data: {e}")
                ingestion_stats["weather_failed"] += 1
        
        # Store satellite data
        for source, satellite_points in satellite_results.items():
            for sat_point in satellite_points:
                try:
                    await _store_satellite_measurement(db, sat_point)
                    ingestion_stats["satellite_stored"] += 1
                except Exception as e:
                    logger.error(f"Failed to store satellite data: {e}")
                    ingestion_stats["satellite_failed"] += 1
    
    finally:
        db.close()
    
    return {
        "task": "ingest_all_sources_with_satellite",
        "timestamp": datetime.utcnow().isoformat(),
        "locations_processed": len(locations) if locations else 4,
        "bbox": bbox,
        "ground_based_results": {
            "air_quality_points": len(ground_results["air_quality"]),
            "weather_points": len(ground_results["weather"]),
            "traffic_points": len(ground_results["traffic"])
        },
        "satellite_results": {
            "tropomi_points": len(satellite_results.get("tropomi", [])),
            "viirs_points": len(satellite_results.get("viirs", []))
        },
        "storage_stats": ingestion_stats,
        "total_satellite_points": sum(len(points) for points in satellite_results.values())
    }


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def ingest_imd_forecast_data(self, station_ids: List[str] = None,
                            locations: List[Dict[str, float]] = None,
                            hours: int = 48) -> Dict[str, Any]:
    """
    Ingest weather forecast data from IMD stations.
    
    Args:
        station_ids: List of IMD station IDs to fetch forecasts for.
        locations: List of location dictionaries with lat/lon coordinates.
        hours: Number of hours to forecast (max 120)
        
    Returns:
        Dictionary with forecast ingestion results and statistics.
    """
    try:
        logger.info(f"Starting IMD weather forecast ingestion for {hours} hours")
        
        # Convert locations to tuples
        location_tuples = []
        if locations:
            location_tuples = [(loc["lat"], loc["lon"]) for loc in locations]
        
        # Run async ingestion
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _async_ingest_imd_forecast_data(station_ids, location_tuples, hours)
            )
        finally:
            loop.close()
        
        logger.info(f"IMD weather forecast ingestion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"IMD weather forecast ingestion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _async_ingest_imd_forecast_data(station_ids: List[str], locations: List[tuple], hours: int) -> Dict[str, Any]:
    """Async helper for IMD forecast data ingestion."""
    ingested_count = 0
    failed_count = 0
    
    # Default to major IMD stations if no specific locations or stations provided
    if not locations and not station_ids:
        station_ids = ["DL_SAFDARJUNG", "MH_COLABA", "KA_HAL", "TN_MEENAMBAKKAM", "WB_DUMDUM"]
    
    async with IMDClient() as client:
        forecast_points = await client.fetch_forecast_data(
            locations=locations,
            station_ids=station_ids,
            hours=hours
        )
        
        # Store forecast points in database
        db = next(get_db())
        try:
            for forecast_point in forecast_points:
                try:
                    await _store_weather_data(db, forecast_point)
                    ingested_count += 1
                except Exception as e:
                    logger.error(f"Failed to store forecast point: {e}")
                    failed_count += 1
        finally:
            db.close()
    
    return {
        "task": "ingest_imd_forecast_data",
        "timestamp": datetime.utcnow().isoformat(),
        "stations_processed": len(station_ids) if station_ids else 0,
        "locations_processed": len(locations) if locations else 0,
        "forecast_hours": hours,
        "ingested_count": ingested_count,
        "failed_count": failed_count,
        "success_rate": ingested_count / (ingested_count + failed_count) if (ingested_count + failed_count) > 0 else 0
    }