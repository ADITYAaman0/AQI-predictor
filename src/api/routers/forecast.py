"""
Forecast API endpoints for air quality predictions.
Provides current AQI and forecast data for locations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from src.api.database import get_db, AsyncSession
from src.api.cache import cache_manager, make_forecast_key, CACHE_TTL
from src.api.schemas import (
    LocationInfo, CurrentForecastResponse, HourlyForecastResponse,
    PollutantReading, WeatherInfo, SourceAttributionInfo,
    HourlyForecast, ForecastMetadata, SpatialForecastRequest
)
from src.utils.location_parser import parse_location
from src.models.forecaster import get_forecaster
from src.models.ensemble_forecaster import get_ensemble_forecaster
from src.utils.aqi_calculator import AQICalculator
from src.utils.spatial_interpolation import SpatialInterpolator

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/current/{location}")
async def get_current_forecast(
    location: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get current AQI and air quality data for a location.
    
    Args:
        location: Location identifier (city name, coordinates, or address)
        
    Returns:
        Current air quality data including AQI, pollutant levels, and weather
    """
    # Check cache first
    cache_key = make_forecast_key(location, "current")
    cached_data = await cache_manager.get(cache_key)
    
    if cached_data:
        logger.info(f"Returning cached current forecast for {location}")
        return cached_data
    
    try:
        # Parse location input
        try:
            location_info = parse_location(location)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid location format: {str(e)}"
            )
        
        # Get ensemble forecaster and AQI calculator
        ensemble_forecaster = get_ensemble_forecaster()
        aqi_calc = AQICalculator()
        
        # Create current features for prediction
        now = datetime.utcnow()
        current_features = pd.DataFrame([{
            'timestamp': now,
            'hour': now.hour,
            'day_of_week': now.weekday(),
            'is_weekend': 1 if now.weekday() >= 5 else 0,
            'is_rush_hour': 1 if (8 <= now.hour <= 10 or 17 <= now.hour <= 20) else 0,
            'hour_sin': np.sin(2 * np.pi * now.hour / 24),
            'hour_cos': np.cos(2 * np.pi * now.hour / 24),
            'latitude': location_info.latitude,
            'longitude': location_info.longitude,
            # Default weather values - would be replaced with real data
            'temperature': 25.0,
            'humidity': 60.0,
            'wind_speed': 3.0,
            'pressure': 1013.0,
            'pm25_lag1': 100.0  # Would be from latest measurement
        }])
        
        # Get prediction from ensemble model
        try:
            ensemble_prediction = ensemble_forecaster.predict(current_features, return_individual=True)
            pm25_pred = ensemble_prediction.pm25
            pm25_lower = ensemble_prediction.pm25_lower
            pm25_upper = ensemble_prediction.pm25_upper
            confidence_level = ensemble_prediction.confidence
            model_weights = ensemble_prediction.model_weights
            model_version = f"ensemble_v1.0 (weights: {model_weights})"
        except Exception as e:
            logger.warning(f"Ensemble prediction failed, using fallback: {e}")
            # Fallback to rule-based prediction
            pm25_pred = 120.0 + np.random.uniform(-20, 20)  # Mock current value
            pm25_lower = pm25_pred * 0.8
            pm25_upper = pm25_pred * 1.2
            confidence_level = 0.3
            model_weights = {}
            model_version = "fallback_v1.0"
        
        # Calculate other pollutants (simplified relationships)
        pm10_pred = pm25_pred * 1.6  # Typical PM10/PM2.5 ratio
        no2_pred = pm25_pred * 0.4
        so2_pred = pm25_pred * 0.15
        co_pred = pm25_pred * 0.02
        o3_pred = max(20, 80 - pm25_pred * 0.2)  # Inverse relationship
        
        # Calculate AQI values
        pollutant_values = {
            'pm25': pm25_pred,
            'pm10': pm10_pred,
            'no2': no2_pred,
            'so2': so2_pred,
            'co': co_pred,
            'o3': o3_pred
        }
        
        overall_aqi, dominant_pollutant, category = aqi_calc.calculate_aqi(pollutant_values)
        
        # Build pollutant readings
        pollutants = {}
        for param, value in pollutant_values.items():
            aqi_value = aqi_calc.calculate_sub_index(value, param)
            pollutants[param] = {
                "value": round(value, 1),
                "unit": "μg/m³" if param != 'co' else "mg/m³",
                "aqi": aqi_value
            }
        
        # Mock weather data (would be from weather service)
        weather_data = {
            "temperature": 28.5,
            "humidity": 65,
            "wind_speed": 3.2,
            "wind_direction": 245,
            "pressure": 1013.2
        }
        
        # Mock source attribution (would be from attribution model)
        source_attribution = {
            "vehicular": 45.2,
            "industrial": 28.7,
            "biomass": 15.1,
            "background": 11.0
        }
        
        current_data = {
            "location": {
                "name": location_info.name,
                "coordinates": {
                    "lat": location_info.latitude,
                    "lon": location_info.longitude
                },
                "city": location_info.city,
                "state": location_info.state,
                "country": location_info.country
            },
            "timestamp": now.isoformat(),
            "aqi": {
                "value": overall_aqi,
                "category": category,
                "category_label": aqi_calc.get_category_label(overall_aqi),
                "dominant_pollutant": dominant_pollutant,
                "color": aqi_calc.get_color(overall_aqi),
                "health_message": aqi_calc.get_health_message(overall_aqi)
            },
            "pollutants": pollutants,
            "weather": weather_data,
            "source_attribution": source_attribution,
            "confidence": {
                "pm25_lower": round(max(0, pm25_lower), 1),
                "pm25_upper": round(pm25_upper, 1),
                "level": "high" if confidence_level > 0.7 else "medium" if confidence_level > 0.4 else "low",
                "score": round(confidence_level, 3),
                "model_weights": model_weights
            },
            "data_sources": ["CPCB", "OpenWeatherMap", "Ensemble Model"],
            "last_updated": now.isoformat(),
            "model_version": model_version
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key, 
            current_data, 
            ttl=CACHE_TTL["current_aqi"]
        )
        
        logger.info(f"Generated current forecast for {location_info.name}")
        return current_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating current forecast for {location}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get current forecast for {location}"
        )

@router.get("/24h/{location}")
async def get_24h_forecast(
    location: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get 24-hour air quality forecast for a location.
    
    Args:
        location: Location identifier (city name, coordinates, or address)
        
    Returns:
        24-hour hourly forecast data
    """
    # Check cache first
    cache_key = make_forecast_key(location, "24h")
    cached_data = await cache_manager.get(cache_key)
    
    if cached_data:
        logger.info(f"Returning cached 24h forecast for {location}")
        return cached_data
    
    try:
        # Parse location input
        try:
            location_info = parse_location(location)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid location format: {str(e)}"
            )
        
        # Get ensemble forecaster and AQI calculator
        ensemble_forecaster = get_ensemble_forecaster()
        aqi_calc = AQICalculator()
        
        # Generate mock weather forecast (would be from weather service)
        base_time = datetime.utcnow()
        weather_forecast = []
        for h in range(24):
            temp_base = 25 + 5 * np.sin(2 * np.pi * h / 24)  # Daily temperature cycle
            weather_forecast.append({
                'temperature': temp_base + np.random.uniform(-2, 2),
                'humidity': 60 + 20 * np.sin(2 * np.pi * (h + 6) / 24),
                'wind_speed': 3 + 2 * np.random.uniform(0, 1),
                'pressure': 1013 + np.random.uniform(-5, 5)
            })
        
        # Create initial features for ensemble forecasting
        initial_features = pd.DataFrame([{
            'timestamp': base_time,
            'hour': base_time.hour,
            'day_of_week': base_time.weekday(),
            'is_weekend': 1 if base_time.weekday() >= 5 else 0,
            'is_rush_hour': 1 if (8 <= base_time.hour <= 10 or 17 <= base_time.hour <= 20) else 0,
            'hour_sin': np.sin(2 * np.pi * base_time.hour / 24),
            'hour_cos': np.cos(2 * np.pi * base_time.hour / 24),
            'latitude': location_info.latitude,
            'longitude': location_info.longitude,
            'temperature': weather_forecast[0]['temperature'],
            'humidity': weather_forecast[0]['humidity'],
            'wind_speed': weather_forecast[0]['wind_speed'],
            'pressure': weather_forecast[0]['pressure'],
            'pm25_lag1': 100.0  # Would be from current measurement
        }])
        
        # Generate 24-hour forecast using ensemble model
        try:
            ensemble_forecasts = ensemble_forecaster.forecast_sequence(
                initial_features, 
                weather_forecast, 
                hours=24
            )
            
            # Convert ensemble predictions to API format
            forecasts = []
            for h, ensemble_pred in enumerate(ensemble_forecasts, 1):
                forecast_time = base_time + timedelta(hours=h)
                
                forecasts.append({
                    'timestamp': forecast_time,
                    'hour': h,
                    'pm25': ensemble_pred.pm25,
                    'pm25_lower': ensemble_pred.pm25_lower,
                    'pm25_upper': ensemble_pred.pm25_upper,
                    'aqi': ensemble_pred.aqi,
                    'aqi_lower': aqi_calc.calculate_sub_index(ensemble_pred.pm25_lower, 'pm25'),
                    'aqi_upper': aqi_calc.calculate_sub_index(ensemble_pred.pm25_upper, 'pm25'),
                    'category': ensemble_pred.category,
                    'category_label': aqi_calc.get_category_label(ensemble_pred.aqi),
                    'color': aqi_calc.get_color(ensemble_pred.aqi),
                    'temperature': weather_forecast[h-1]['temperature'],
                    'humidity': weather_forecast[h-1]['humidity'],
                    'wind_speed': weather_forecast[h-1]['wind_speed'],
                    'confidence': ensemble_pred.confidence,
                    'model_weights': ensemble_pred.model_weights
                })
            
            model_version = f"ensemble_v1.0"
            
        except Exception as e:
            logger.warning(f"Ensemble forecast generation failed, using fallback: {e}")
            # Fallback forecast generation
            forecasts = []
            base_pm25 = 100.0
            
            for h in range(1, 25):
                forecast_time = base_time + timedelta(hours=h)
                
                # Simple pattern: higher during rush hours, lower at night
                hour_factor = 1 + 0.3 * np.sin(2 * np.pi * (h - 8) / 24)
                rush_factor = 1.2 if (8 <= forecast_time.hour <= 10 or 17 <= forecast_time.hour <= 20) else 1.0
                
                pm25_pred = base_pm25 * hour_factor * rush_factor
                pm25_pred += np.random.uniform(-10, 10)  # Add some variation
                pm25_pred = max(20, min(300, pm25_pred))  # Keep in reasonable bounds
                
                aqi = aqi_calc.calculate_sub_index(pm25_pred, 'pm25')
                
                forecasts.append({
                    'timestamp': forecast_time,
                    'hour': h,
                    'pm25': round(pm25_pred, 1),
                    'pm25_lower': round(pm25_pred * 0.8, 1),
                    'pm25_upper': round(pm25_pred * 1.2, 1),
                    'aqi': aqi,
                    'aqi_lower': aqi_calc.calculate_sub_index(pm25_pred * 0.8, 'pm25'),
                    'aqi_upper': aqi_calc.calculate_sub_index(pm25_pred * 1.2, 'pm25'),
                    'category': aqi_calc.get_category(aqi),
                    'category_label': aqi_calc.get_category_label(aqi),
                    'color': aqi_calc.get_color(aqi),
                    'temperature': weather_forecast[h-1]['temperature'],
                    'humidity': weather_forecast[h-1]['humidity'],
                    'wind_speed': weather_forecast[h-1]['wind_speed'],
                    'confidence': 0.3,
                    'model_weights': {}
                })
                
                # Update baseline for next hour
                base_pm25 = pm25_pred * 0.9 + base_pm25 * 0.1
            
            model_version = "fallback_v1.0"
        
        # Format forecasts for API response
        hourly_forecasts = []
        for forecast in forecasts:
            # Calculate other pollutants
            pm25_val = forecast['pm25']
            pm10_val = pm25_val * 1.6
            no2_val = pm25_val * 0.4
            so2_val = pm25_val * 0.15
            co_val = pm25_val * 0.02
            o3_val = max(20, 80 - pm25_val * 0.2)
            
            pollutants = {
                'pm25': {
                    'value': pm25_val,
                    'unit': 'μg/m³',
                    'aqi': forecast['aqi'],
                    'confidence_lower': forecast['pm25_lower'],
                    'confidence_upper': forecast['pm25_upper']
                },
                'pm10': {
                    'value': round(pm10_val, 1),
                    'unit': 'μg/m³',
                    'aqi': aqi_calc.calculate_sub_index(pm10_val, 'pm10')
                },
                'no2': {
                    'value': round(no2_val, 1),
                    'unit': 'μg/m³',
                    'aqi': aqi_calc.calculate_sub_index(no2_val, 'no2')
                },
                'so2': {
                    'value': round(so2_val, 1),
                    'unit': 'μg/m³',
                    'aqi': aqi_calc.calculate_sub_index(so2_val, 'so2')
                },
                'co': {
                    'value': round(co_val, 2),
                    'unit': 'mg/m³',
                    'aqi': aqi_calc.calculate_sub_index(co_val, 'co')
                },
                'o3': {
                    'value': round(o3_val, 1),
                    'unit': 'μg/m³',
                    'aqi': aqi_calc.calculate_sub_index(o3_val, 'o3')
                }
            }
            
            hourly_forecasts.append({
                'timestamp': forecast['timestamp'].isoformat(),
                'forecast_hour': forecast['hour'],
                'aqi': {
                    'value': forecast['aqi'],
                    'category': forecast['category'],
                    'category_label': forecast['category_label'],
                    'color': forecast['color'],
                    'confidence_lower': forecast['aqi_lower'],
                    'confidence_upper': forecast['aqi_upper']
                },
                'pollutants': pollutants,
                'weather': {
                    'temperature': round(forecast['temperature'], 1),
                    'humidity': round(forecast['humidity'], 1),
                    'wind_speed': round(forecast['wind_speed'], 1)
                },
                'confidence': {
                    'score': round(forecast.get('confidence', 0.5), 3),
                    'model_weights': forecast.get('model_weights', {})
                }
            })
        
        forecast_data = {
            "location": {
                "name": location_info.name,
                "coordinates": {
                    "lat": location_info.latitude,
                    "lon": location_info.longitude
                },
                "city": location_info.city,
                "state": location_info.state,
                "country": location_info.country
            },
            "forecast_type": "24_hour",
            "generated_at": base_time.isoformat(),
            "forecasts": hourly_forecasts,
            "metadata": {
                "model_version": model_version,
                "confidence_level": 0.8,
                "data_sources": ["CPCB", "IMD", "OpenWeatherMap", "Ensemble Model"],
                "spatial_resolution": "point_forecast",
                "update_frequency": "hourly",
                "ensemble_info": {
                    "models_used": ["XGBoost", "LSTM", "GNN"],
                    "dynamic_weighting": True,
                    "confidence_intervals": True
                }
            }
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            forecast_data,
            ttl=CACHE_TTL["forecast"]
        )
        
        logger.info(f"Generated 24h forecast for {location_info.name}")
        return forecast_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating 24h forecast for {location}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get 24h forecast for {location}"
        )

@router.post("/spatial")
async def get_spatial_forecast(
    bounds: Dict[str, float],
    resolution: float = Query(1.0, ge=0.1, le=10.0, description="Grid resolution in kilometers"),
    timestamp: Optional[str] = Query(None, description="Forecast timestamp (ISO format)"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get spatial grid predictions for air quality.
    
    Args:
        bounds: Bounding box with 'north', 'south', 'east', 'west' keys
        resolution: Grid resolution in kilometers (0.1 to 10.0)
        timestamp: Optional timestamp for forecast (defaults to current time)
        
    Returns:
        Spatial grid predictions with metadata
    """
    try:
        # Validate bounds
        from src.utils.spatial_interpolation import create_spatial_interpolator, StationData
        
        interpolator = create_spatial_interpolator(method="idw")
        
        if not interpolator.validate_bounds(bounds):
            raise HTTPException(
                status_code=400,
                detail="Invalid bounding box. Ensure north > south and east > west, with valid coordinate ranges."
            )
        
        # Check if the area is reasonable (not too large)
        area_deg_sq = (bounds['north'] - bounds['south']) * (bounds['east'] - bounds['west'])
        if area_deg_sq > 25:  # Roughly 250km x 250km at equator
            raise HTTPException(
                status_code=400,
                detail="Requested area too large. Please use a smaller bounding box."
            )
        
        # Parse timestamp if provided
        forecast_time = datetime.utcnow()
        if timestamp:
            try:
                forecast_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid timestamp format. Use ISO format (e.g., 2024-01-15T10:30:00Z)"
                )
        
        # Check cache first
        cache_key = f"spatial_{bounds['north']}_{bounds['south']}_{bounds['east']}_{bounds['west']}_{resolution}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info(f"Returning cached spatial forecast for bounds")
            return cached_data
        
        # Generate grid points
        grid_points = interpolator.generate_grid(bounds, resolution)
        
        if len(grid_points) > 10000:  # Limit grid size
            raise HTTPException(
                status_code=400,
                detail=f"Grid too large ({len(grid_points)} points). Use lower resolution or smaller area."
            )
        
        # Mock station data (in production, this would come from database)
        # For now, create some sample stations within the bounds
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lon = (bounds['east'] + bounds['west']) / 2
        
        # Create mock stations around the area
        mock_stations = []
        
        # Central station
        mock_stations.append(StationData(
            latitude=center_lat,
            longitude=center_lon,
            aqi=120,
            pm25=85.0,
            station_id="center_station",
            quality_score=1.0
        ))
        
        # Add some variation around the center
        offsets = [
            (-0.02, -0.02, 140, 95.0),  # Southwest - higher pollution
            (0.02, 0.02, 100, 70.0),   # Northeast - lower pollution
            (0.01, -0.01, 130, 88.0),  # Northwest
            (-0.01, 0.01, 110, 75.0)   # Southeast
        ]
        
        for i, (lat_offset, lon_offset, aqi, pm25) in enumerate(offsets):
            station_lat = center_lat + lat_offset
            station_lon = center_lon + lon_offset
            
            # Only add if within bounds
            if (bounds['south'] <= station_lat <= bounds['north'] and 
                bounds['west'] <= station_lon <= bounds['east']):
                mock_stations.append(StationData(
                    latitude=station_lat,
                    longitude=station_lon,
                    aqi=aqi,
                    pm25=pm25,
                    station_id=f"station_{i+1}",
                    quality_score=0.9
                ))
        
        # Interpolate to grid points
        interpolated_points = interpolator.interpolate_grid(mock_stations, grid_points)
        
        # Format response
        grid_predictions = []
        for point in interpolated_points:
            # Calculate category from AQI
            aqi_calc = AQICalculator()
            category = aqi_calc.get_category(point.aqi)
            
            grid_predictions.append({
                "coordinates": {
                    "lat": round(point.latitude, 6),
                    "lon": round(point.longitude, 6)
                },
                "aqi": point.aqi,
                "pm25": point.pm25,
                "category": category,
                "category_label": aqi_calc.get_category_label(point.aqi),
                "color": aqi_calc.get_color(point.aqi),
                "confidence": point.confidence
            })
        
        spatial_data = {
            "bounds": bounds,
            "resolution_km": resolution,
            "grid_predictions": grid_predictions,
            "metadata": {
                "generated_at": forecast_time.isoformat(),
                "grid_points": len(grid_predictions),
                "interpolation_method": "inverse_distance_weighting",
                "stations_used": len(mock_stations),
                "model_version": "spatial_v1.0",
                "update_frequency": "hourly",
                "confidence_method": "distance_based"
            },
            "statistics": {
                "min_aqi": min(p["aqi"] for p in grid_predictions),
                "max_aqi": max(p["aqi"] for p in grid_predictions),
                "mean_aqi": round(sum(p["aqi"] for p in grid_predictions) / len(grid_predictions), 1),
                "min_confidence": min(p["confidence"] for p in grid_predictions),
                "max_confidence": max(p["confidence"] for p in grid_predictions)
            }
        }
        
        # Cache the result for 1 hour
        await cache_manager.set(
            cache_key,
            spatial_data,
            ttl=3600  # 1 hour
        )
        
        logger.info(f"Generated spatial forecast with {len(grid_predictions)} points")
        return spatial_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating spatial forecast: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate spatial forecast"
        )


@router.get("/spatial")
async def get_spatial_forecast(
    north: float,
    south: float,
    east: float,
    west: float,
    resolution: float = 1.0,
    parameter: str = "pm25",
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get spatial grid predictions for a specified area.
    
    Args:
        request: Spatial forecast request with bounds, resolution, and optional timestamp
        
    Returns:
        Spatial grid predictions with metadata
    """
    from src.utils.spatial_interpolation import SpatialInterpolator, get_city_bounds
    from src.utils.aqi_calculator import AQICalculator
    
    try:
        # Create bounds dictionary
        bounds_dict = {
            'north': north,
            'south': south,
            'east': east,
            'west': west
        }
        
        # Validate bounds
        if north <= south:
            raise HTTPException(
                status_code=400,
                detail="North boundary must be greater than south boundary"
            )
        
        if east <= west:
            raise HTTPException(
                status_code=400,
                detail="East boundary must be greater than west boundary"
            )
        
        # Validate resolution
        if not (0.1 <= resolution <= 10.0):
            raise HTTPException(
                status_code=400,
                detail="Resolution must be between 0.1 and 10.0 km"
            )
        
        # Check cache first
        cache_key = f"spatial:{bounds_dict['north']},{bounds_dict['south']},{bounds_dict['east']},{bounds_dict['west']}:{resolution}:{parameter}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info(f"Returning cached spatial forecast for bounds: {bounds_dict}")
            return cached_data
        
        # Initialize spatial interpolator
        interpolator = SpatialInterpolator(variogram_model='exponential')
        
        # Estimate grid size and validate
        estimated_points = interpolator.estimate_grid_size(bounds_dict, resolution)
        if estimated_points > 10000:  # Limit to prevent excessive computation
            raise HTTPException(
                status_code=400,
                detail=f"Requested grid too large ({estimated_points} points). Use coarser resolution or smaller bounds."
            )
        
        # Mock station data (in production, this would come from database)
        # Generate some realistic station data within bounds
        station_data = {}
        np.random.seed(42)  # For reproducible results
        
        # Create mock stations within bounds
        n_stations = min(20, max(5, int((bounds_dict['north'] - bounds_dict['south']) * (bounds_dict['east'] - bounds_dict['west']) * 100)))
        
        for i in range(n_stations):
            station_id = f"station_{i:03d}"
            
            # Random location within bounds
            lat = np.random.uniform(bounds_dict['south'], bounds_dict['north'])
            lon = np.random.uniform(bounds_dict['west'], bounds_dict['east'])
            
            # Generate realistic PM2.5 values with spatial correlation
            # Higher values near city centers, lower near boundaries
            center_lat = (bounds_dict['north'] + bounds_dict['south']) / 2
            center_lon = (bounds_dict['east'] + bounds_dict['west']) / 2
            
            # Distance from center (normalized)
            dist_from_center = np.sqrt((lat - center_lat)**2 + (lon - center_lon)**2)
            max_dist = np.sqrt((bounds_dict['north'] - bounds_dict['south'])**2 + (bounds_dict['east'] - bounds_dict['west'])**2) / 2
            norm_dist = dist_from_center / max_dist
            
            # Base value decreases with distance from center
            base_value = 120 * (1 - norm_dist * 0.5) + np.random.normal(0, 20)
            base_value = max(20, min(300, base_value))  # Keep in reasonable range
            
            station_data[station_id] = {
                'lat': lat,
                'lon': lon,
                parameter: base_value
            }
        
        # Perform spatial interpolation
        try:
            spatial_grid = interpolator.interpolate_grid(
                station_data, bounds_dict, resolution, parameter
            )
        except Exception as e:
            logger.error(f"Spatial interpolation failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate spatial predictions: {str(e)}"
            )
        
        # Format response
        grid_predictions = []
        for point in spatial_grid.grid_points:
            grid_predictions.append({
                'coordinates': {
                    'lat': point.latitude,
                    'lon': point.longitude
                },
                'aqi': point.aqi,
                'category': point.category,
                'value': point.predicted_value,
                'parameter': parameter,
                'confidence': point.confidence
            })
        
        response_data = {
            'bounds': bounds_dict,
            'resolution_km': resolution,
            'parameter': parameter,
            'grid_predictions': grid_predictions,
            'metadata': {
                'generated_at': spatial_grid.generated_at.isoformat(),
                'n_grid_points': len(grid_predictions),
                'n_stations_used': spatial_grid.metadata['n_stations'],
                'interpolation_method': spatial_grid.metadata['interpolation_method'],
                'variogram_model': spatial_grid.metadata.get('variogram_model'),
                'model_version': 'spatial_v1.0',
                'data_sources': ['CPCB', 'Spatial Interpolation']
            }
        }
        
        # Cache the result
        await cache_manager.set(
            cache_key,
            response_data,
            ttl=CACHE_TTL["spatial"]
        )
        
        logger.info(f"Generated spatial forecast with {len(grid_predictions)} grid points")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating spatial forecast: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate spatial forecast: {str(e)}"
        )


@router.get("/spatial/bounds/{city}")
async def get_city_bounds_endpoint(city: str) -> Dict[str, Any]:
    """
    Get default spatial bounds for a city.
    
    Args:
        city: City name
        
    Returns:
        Default bounds for the city
    """
    from src.utils.spatial_interpolation import get_city_bounds
    
    bounds = get_city_bounds(city)
    if not bounds:
        raise HTTPException(
            status_code=404,
            detail=f"No default bounds available for city: {city}"
        )
    
    return {
        'city': city.title(),
        'bounds': bounds,
        'default_resolution_km': 1.0,
        'estimated_grid_points': SpatialInterpolator().estimate_grid_size(bounds, 1.0)
    }


@router.get("/stations")
async def get_monitoring_stations(
    city: Optional[str] = Query(None, description="Filter by city"),
    active_only: bool = Query(True, description="Return only active stations"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get list of monitoring stations.
    
    Args:
        city: Optional city filter
        active_only: Whether to return only active stations
        
    Returns:
        List of monitoring stations with their details
    """
    try:
        # Mock station data - will be replaced with actual database query
        stations = [
            {
                "id": "DL001",
                "name": "Anand Vihar",
                "location": {"lat": 28.6469, "lon": 77.3161},
                "city": "Delhi",
                "state": "Delhi",
                "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"],
                "is_active": True,
                "last_updated": datetime.utcnow().isoformat()
            },
            {
                "id": "DL002",
                "name": "Punjabi Bagh",
                "location": {"lat": 28.6742, "lon": 77.1318},
                "city": "Delhi",
                "state": "Delhi",
                "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"],
                "is_active": True,
                "last_updated": datetime.utcnow().isoformat()
            },
            {
                "id": "DL003",
                "name": "R K Puram",
                "location": {"lat": 28.5636, "lon": 77.1825},
                "city": "Delhi",
                "state": "Delhi",
                "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"],
                "is_active": True,
                "last_updated": datetime.utcnow().isoformat()
            }
        ]
        
        # Apply filters
        if city:
            stations = [s for s in stations if s["city"].lower() == city.lower()]
        
        if active_only:
            stations = [s for s in stations if s["is_active"]]
        
        return {
            "stations": stations,
            "count": len(stations),
            "filters": {
                "city": city,
                "active_only": active_only
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching monitoring stations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch monitoring stations"
        )