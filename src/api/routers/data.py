"""
Data API endpoints for air quality and weather data access.
Provides CRUD operations for measurements, weather data, and stations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from uuid import UUID
import logging

from src.api.database import get_db, AsyncSession
from src.api.crud import air_quality_crud, weather_crud, station_crud
from src.api.cache import cache_manager, CACHE_TTL

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/air-quality/latest")
async def get_latest_air_quality(
    station_id: Optional[str] = Query(None, description="Filter by station ID"),
    parameter: Optional[str] = Query(None, description="Filter by parameter (pm25, pm10, etc.)"),
    city: Optional[str] = Query(None, description="Filter by city"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get latest air quality measurements.
    
    Args:
        station_id: Optional station ID filter
        parameter: Optional parameter filter
        city: Optional city filter
        limit: Maximum number of records to return
        
    Returns:
        Latest air quality measurements with metadata
    """
    try:
        # Build cache key
        cache_key = f"air_quality:latest:{station_id}:{parameter}:{city}:{limit}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info("Returning cached latest air quality data")
            return cached_data
        
        measurements = []
        
        if station_id:
            # Get measurements for specific station
            measurements = await air_quality_crud.get_latest_by_station(
                db, station_id, parameter, limit
            )
        else:
            # Get recent measurements across all stations
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(hours=24)  # Last 24 hours
            
            measurements = await air_quality_crud.get_by_time_range(
                db, start_time, end_time, None, parameter, limit
            )
        
        # Convert to response format
        measurement_data = []
        for m in measurements:
            measurement_data.append({
                "time": m.time.isoformat(),
                "station_id": m.station_id,
                "parameter": m.parameter,
                "value": m.value,
                "unit": m.unit,
                "quality_flag": m.quality_flag,
                "source": m.source,
                "location": {
                    "coordinates": [77.2090, 28.6139] if m.location else None  # Mock coordinates
                } if m.location else None
            })
        
        response_data = {
            "measurements": measurement_data,
            "count": len(measurement_data),
            "filters": {
                "station_id": station_id,
                "parameter": parameter,
                "city": city,
                "limit": limit
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["current_aqi"]
        )
        
        logger.info(f"Retrieved {len(measurement_data)} air quality measurements")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving air quality data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve air quality data"
        )


@router.get("/air-quality/time-range")
async def get_air_quality_time_range(
    start_time: datetime = Query(..., description="Start time (ISO format)"),
    end_time: datetime = Query(..., description="End time (ISO format)"),
    station_id: Optional[str] = Query(None, description="Filter by station ID"),
    parameter: Optional[str] = Query(None, description="Filter by parameter"),
    limit: int = Query(1000, ge=1, le=5000, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get air quality measurements within a time range.
    
    Args:
        start_time: Start of time range
        end_time: End of time range
        station_id: Optional station ID filter
        parameter: Optional parameter filter
        limit: Maximum number of records
        
    Returns:
        Air quality measurements within the specified time range
    """
    try:
        # Validate time range
        if end_time <= start_time:
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time"
            )
        
        # Limit time range to prevent excessive queries
        max_days = 30
        if (end_time - start_time).days > max_days:
            raise HTTPException(
                status_code=400,
                detail=f"Time range cannot exceed {max_days} days"
            )
        
        measurements = await air_quality_crud.get_by_time_range(
            db, start_time, end_time, station_id, parameter, limit
        )
        
        # Convert to response format
        measurement_data = []
        for m in measurements:
            measurement_data.append({
                "time": m.time.isoformat(),
                "station_id": m.station_id,
                "parameter": m.parameter,
                "value": m.value,
                "unit": m.unit,
                "quality_flag": m.quality_flag,
                "source": m.source
            })
        
        return {
            "measurements": measurement_data,
            "count": len(measurement_data),
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            },
            "filters": {
                "station_id": station_id,
                "parameter": parameter,
                "limit": limit
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving time range data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve time range data"
        )


@router.get("/air-quality/location")
async def get_air_quality_by_location(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(10.0, ge=0.1, le=100, description="Search radius in kilometers"),
    parameter: Optional[str] = Query(None, description="Filter by parameter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get air quality measurements near a location.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        radius_km: Search radius in kilometers
        parameter: Optional parameter filter
        limit: Maximum number of records
        
    Returns:
        Air quality measurements near the specified location
    """
    try:
        measurements = await air_quality_crud.get_by_location(
            db, latitude, longitude, radius_km, parameter, limit
        )
        
        # Convert to response format
        measurement_data = []
        for m in measurements:
            measurement_data.append({
                "time": m.time.isoformat(),
                "station_id": m.station_id,
                "parameter": m.parameter,
                "value": m.value,
                "unit": m.unit,
                "quality_flag": m.quality_flag,
                "source": m.source,
                "distance_km": 5.2  # Mock distance - would calculate from actual location
            })
        
        return {
            "measurements": measurement_data,
            "count": len(measurement_data),
            "search_location": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km
            },
            "filters": {
                "parameter": parameter,
                "limit": limit
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving location-based data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve location-based data"
        )


@router.get("/weather/latest")
async def get_latest_weather(
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
    station_id: Optional[str] = Query(None, description="IMD station ID"),
    radius_km: float = Query(10.0, ge=0.1, le=100, description="Search radius in kilometers"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get latest weather data from IMD stations.
    
    Args:
        latitude: Optional latitude filter
        longitude: Optional longitude filter
        station_id: Optional IMD station ID filter
        radius_km: Search radius in kilometers
        limit: Maximum number of records
        
    Returns:
        Latest weather data from IMD stations
    """
    try:
        # Build cache key
        cache_key = f"weather:latest:{latitude}:{longitude}:{station_id}:{radius_km}:{limit}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info("Returning cached latest weather data")
            return cached_data
        
        weather_data = []
        
        if latitude is not None and longitude is not None:
            weather_records = await weather_crud.get_latest_by_location(
                db, latitude, longitude, radius_km, limit
            )
        else:
            # Get recent weather data across all locations
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(hours=6)  # Last 6 hours
            
            weather_records = await weather_crud.get_by_time_range(
                db, start_time, end_time, None, None, radius_km, limit
            )
        
        # Convert to response format
        for w in weather_records:
            weather_data.append({
                "time": w.time.isoformat(),
                "location": {
                    "coordinates": [77.2090, 28.6139]  # Mock coordinates
                },
                "temperature": w.temperature,
                "humidity": w.humidity,
                "wind_speed": w.wind_speed,
                "wind_direction": w.wind_direction,
                "pressure": w.pressure,
                "precipitation": w.precipitation,
                "visibility": w.visibility,
                "source": w.source,
                "station_metadata": {
                    "station_id": getattr(w, 'station_id', None),
                    "station_name": getattr(w, 'station_name', None),
                    "city": getattr(w, 'city', None),
                    "state": getattr(w, 'state', None)
                } if w.source.startswith('imd') else None
            })
        
        response_data = {
            "weather_data": weather_data,
            "count": len(weather_data),
            "search_location": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km
            } if latitude is not None and longitude is not None else None,
            "station_filter": station_id,
            "data_sources": ["imd_openweather", "imd_simulated", "imd_forecast"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["weather"]
        )
        
        logger.info(f"Retrieved {len(weather_data)} weather records")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving weather data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve weather data"
        )


@router.get("/weather/imd/stations")
async def get_imd_weather_stations(
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get available IMD weather monitoring stations.
    
    Args:
        city: Optional city filter
        state: Optional state filter
        
    Returns:
        List of IMD weather stations with status information
    """
    try:
        # Build cache key
        cache_key = f"imd_stations:{city}:{state}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info("Returning cached IMD stations data")
            return cached_data
        
        # Import here to avoid circular imports
        from src.tasks.data_ingestion import get_imd_stations
        
        # Get IMD stations using the Celery task
        result = get_imd_stations.delay(city=city, state=state)
        station_data = result.get(timeout=30)  # Wait up to 30 seconds
        
        response_data = {
            "imd_stations": station_data.get("stations", []),
            "station_statuses": station_data.get("station_statuses", []),
            "total_stations": station_data.get("total_stations", 0),
            "operational_stations": station_data.get("operational_stations", 0),
            "data_sources": station_data.get("data_sources", []),
            "filters": {
                "city": city,
                "state": state
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["stations"]
        )
        
        logger.info(f"Retrieved {response_data['total_stations']} IMD weather stations")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving IMD weather stations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve IMD weather stations"
        )


@router.get("/weather/imd/stations/{station_id}/status")
async def get_imd_station_status(
    station_id: str = Path(..., description="IMD station ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get operational status of a specific IMD weather station.
    
    Args:
        station_id: IMD station identifier
        
    Returns:
        Detailed station status information
    """
    try:
        # Build cache key
        cache_key = f"imd_station_status:{station_id}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info(f"Returning cached IMD station status for {station_id}")
            return cached_data
        
        # Import here to avoid circular imports
        from src.tasks.data_ingestion import check_imd_station_status
        
        # Check station status using the Celery task
        result = check_imd_station_status.delay(station_id=station_id)
        status_data = result.get(timeout=30)  # Wait up to 30 seconds
        
        response_data = {
            "station_status": status_data.get("status", {}),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result for a shorter time since status can change
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=300  # 5 minutes
        )
        
        logger.info(f"Retrieved IMD station status for {station_id}")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving IMD station status for {station_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve IMD station status for {station_id}"
        )


@router.get("/weather/imd/forecast")
async def get_imd_weather_forecast(
    station_id: Optional[str] = Query(None, description="IMD station ID"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
    hours: int = Query(24, ge=1, le=120, description="Forecast hours"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get weather forecast data from IMD stations.
    
    Args:
        station_id: Optional IMD station ID
        latitude: Optional latitude
        longitude: Optional longitude
        hours: Number of forecast hours (1-120)
        
    Returns:
        Weather forecast data from IMD stations
    """
    try:
        # Build cache key
        cache_key = f"imd_forecast:{station_id}:{latitude}:{longitude}:{hours}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info("Returning cached IMD weather forecast")
            return cached_data
        
        # Get forecast data from database
        end_time = datetime.now(timezone.utc) + timedelta(hours=hours)
        start_time = datetime.now(timezone.utc)
        
        # Filter for forecast data sources
        forecast_records = await weather_crud.get_by_time_range(
            db, start_time, end_time, latitude, longitude, 50.0, 1000
        )
        
        # Filter for IMD forecast data
        forecast_data = []
        for w in forecast_records:
            if w.source == "imd_forecast":
                forecast_data.append({
                    "time": w.time.isoformat(),
                    "location": {
                        "coordinates": [77.2090, 28.6139]  # Mock coordinates
                    },
                    "temperature": w.temperature,
                    "humidity": w.humidity,
                    "wind_speed": w.wind_speed,
                    "wind_direction": w.wind_direction,
                    "pressure": w.pressure,
                    "precipitation": w.precipitation,
                    "visibility": w.visibility,
                    "source": w.source,
                    "forecast_hour": int((w.time - start_time).total_seconds() / 3600)
                })
        
        response_data = {
            "forecast_data": forecast_data,
            "count": len(forecast_data),
            "forecast_parameters": {
                "station_id": station_id,
                "location": {
                    "latitude": latitude,
                    "longitude": longitude
                } if latitude is not None and longitude is not None else None,
                "forecast_hours": hours,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            },
            "data_source": "imd_via_openweathermap",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["forecast"]
        )
        
        logger.info(f"Retrieved {len(forecast_data)} IMD weather forecast records")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving IMD weather forecast: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve IMD weather forecast"
        )


@router.get("/stations")
async def get_monitoring_stations(
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    active_only: bool = Query(True, description="Return only active stations"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude for location search"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude for location search"),
    radius_km: float = Query(50.0, ge=0.1, le=500, description="Search radius in kilometers"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get monitoring stations with optional filters.
    
    Args:
        city: Optional city filter
        state: Optional state filter
        active_only: Whether to return only active stations
        latitude: Optional latitude for location-based search
        longitude: Optional longitude for location-based search
        radius_km: Search radius in kilometers
        limit: Maximum number of records
        
    Returns:
        List of monitoring stations matching the criteria
    """
    try:
        # Build cache key
        cache_key = f"stations:{city}:{state}:{active_only}:{latitude}:{longitude}:{radius_km}:{limit}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info("Returning cached monitoring stations data")
            return cached_data
        
        stations = []
        
        if latitude is not None and longitude is not None:
            # Location-based search
            stations = await station_crud.get_near_location(
                db, latitude, longitude, radius_km, active_only, limit
            )
        else:
            # General search with filters
            stations = await station_crud.get_all(
                db, city, state, active_only, limit
            )
        
        # Convert to response format
        station_data = []
        for s in stations:
            station_data.append({
                "id": str(s.id),
                "station_id": s.station_id,
                "name": s.name,
                "location": {
                    "coordinates": [77.2090, 28.6139]  # Mock coordinates
                },
                "city": s.city,
                "state": s.state,
                "country": s.country,
                "elevation": s.elevation,
                "station_type": s.station_type,
                "parameters": s.parameters,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat()
            })
        
        response_data = {
            "stations": station_data,
            "count": len(station_data),
            "filters": {
                "city": city,
                "state": state,
                "active_only": active_only,
                "location_search": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_km": radius_km
                } if latitude is not None and longitude is not None else None,
                "limit": limit
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["stations"]
        )
        
        logger.info(f"Retrieved {len(station_data)} monitoring stations")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving monitoring stations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve monitoring stations"
        )


@router.get("/stations/{station_id}")
async def get_station_details(
    station_id: str = Path(..., description="Station ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed information about a specific monitoring station.
    
    Args:
        station_id: Station identifier
        
    Returns:
        Detailed station information
    """
    try:
        station = await station_crud.get_by_id(db, station_id)
        
        if not station:
            raise HTTPException(
                status_code=404,
                detail=f"Station {station_id} not found"
            )
        
        return {
            "station": {
                "id": str(station.id),
                "station_id": station.station_id,
                "name": station.name,
                "location": {
                    "coordinates": [77.2090, 28.6139]  # Mock coordinates
                },
                "city": station.city,
                "state": station.state,
                "country": station.country,
                "elevation": station.elevation,
                "station_type": station.station_type,
                "parameters": station.parameters,
                "is_active": station.is_active,
                "created_at": station.created_at.isoformat(),
                "updated_at": station.updated_at.isoformat()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving station {station_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve station {station_id}"
        )