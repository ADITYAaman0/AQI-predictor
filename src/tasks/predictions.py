"""
Prediction generation tasks for air quality forecasting.
Handles hourly predictions, spatial grid predictions, and ensemble modeling.
"""

import logging
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timedelta
from celery import Task

from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} succeeded with result: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed with exception: {exc}")

@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def generate_hourly_predictions(self, locations: List[str] = None) -> Dict[str, Any]:
    """
    Generate hourly air quality predictions for specified locations.
    
    Args:
        locations: List of location identifiers. If None, generate for all active locations.
        
    Returns:
        Dictionary with prediction generation results.
    """
    try:
        logger.info("Starting hourly prediction generation")
        
        # Mock implementation - will be replaced with actual ML model inference
        predictions_generated = 0
        failed_predictions = 0
        
        if not locations:
            locations = ["Delhi", "Mumbai", "Bangalore", "Chennai"]
        
        for location in locations:
            try:
                # Mock prediction generation
                logger.info(f"Generating predictions for {location}")
                # Here would be actual ML model inference
                predictions_generated += 24  # 24 hourly predictions per location
            except Exception as e:
                logger.error(f"Failed to generate predictions for {location}: {e}")
                failed_predictions += 24
        
        result = {
            "task": "generate_hourly_predictions",
            "timestamp": datetime.utcnow().isoformat(),
            "locations_processed": len(locations),
            "predictions_generated": predictions_generated,
            "failed_predictions": failed_predictions,
            "success_rate": predictions_generated / (predictions_generated + failed_predictions) if (predictions_generated + failed_predictions) > 0 else 0
        }
        
        logger.info(f"Hourly prediction generation completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Hourly prediction generation failed: {exc}")
        raise self.retry(exc=exc, countdown=120 * (2 ** self.request.retries))

@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def generate_spatial_predictions(self, bounds: Dict[str, float] = None, resolution: float = 1.0) -> Dict[str, Any]:
    """
    Generate spatial grid predictions for air quality.
    
    Args:
        bounds: Geographic bounds dictionary with north, south, east, west coordinates.
        resolution: Grid resolution in kilometers.
        
    Returns:
        Dictionary with spatial prediction results.
    """
    try:
        logger.info("Starting spatial prediction generation")
        
        # Default bounds for Delhi-NCR region
        if not bounds:
            bounds = {
                "north": 28.8,
                "south": 28.4,
                "east": 77.4,
                "west": 76.8
            }
        
        # Import spatial interpolation utilities
        from src.utils.spatial_interpolation import create_spatial_interpolator, StationData
        from src.utils.aqi_calculator import AQICalculator
        from src.api.cache import cache_manager
        
        # Create spatial interpolator
        interpolator = create_spatial_interpolator(method="idw")
        
        if not interpolator.validate_bounds(bounds):
            raise ValueError("Invalid bounds provided")
        
        # Generate grid points
        grid_points = interpolator.generate_grid(bounds, resolution)
        
        if len(grid_points) > 10000:
            raise ValueError(f"Grid too large: {len(grid_points)} points")
        
        # Mock station data with temporal variation
        now = datetime.utcnow()
        hour_factor = 1 + 0.2 * np.sin(2 * np.pi * now.hour / 24)
        
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lon = (bounds['east'] + bounds['west']) / 2
        
        mock_stations = [
            StationData(
                latitude=center_lat,
                longitude=center_lon,
                aqi=int(120 * hour_factor),
                pm25=85.0 * hour_factor,
                station_id="center_station",
                quality_score=1.0
            ),
            StationData(
                latitude=center_lat - 0.02,
                longitude=center_lon - 0.02,
                aqi=int(140 * hour_factor),
                pm25=95.0 * hour_factor,
                station_id="sw_station",
                quality_score=0.9
            ),
            StationData(
                latitude=center_lat + 0.02,
                longitude=center_lon + 0.02,
                aqi=int(100 * hour_factor),
                pm25=70.0 * hour_factor,
                station_id="ne_station",
                quality_score=0.9
            )
        ]
        
        # Interpolate to grid
        interpolated_points = interpolator.interpolate_grid(mock_stations, grid_points)
        
        # Format for caching
        aqi_calc = AQICalculator()
        grid_predictions = []
        
        for point in interpolated_points:
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
        
        # Create cache key and store result
        cache_key = f"spatial_{bounds['north']}_{bounds['south']}_{bounds['east']}_{bounds['west']}_{resolution}"
        
        spatial_data = {
            "bounds": bounds,
            "resolution_km": resolution,
            "grid_predictions": grid_predictions,
            "metadata": {
                "generated_at": now.isoformat(),
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
        
        # Cache for 1 hour
        try:
            cache_manager.set_sync(cache_key, spatial_data, ttl=3600)
        except Exception as e:
            logger.warning(f"Failed to cache spatial data: {e}")
        
        result = {
            "task": "generate_spatial_predictions",
            "timestamp": now.isoformat(),
            "bounds": bounds,
            "resolution_km": resolution,
            "grid_points": len(grid_predictions),
            "predictions_generated": len(grid_predictions),
            "coverage_area_km2": (bounds['north'] - bounds['south']) * (bounds['east'] - bounds['west']) * 111 * 111,
            "cache_key": cache_key,
            "success": True
        }
        
        logger.info(f"Spatial prediction generation completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Spatial prediction generation failed: {exc}")
        raise self.retry(exc=exc, countdown=180 * (2 ** self.request.retries))

@celery_app.task(base=CallbackTask)
def update_ensemble_weights(model_performance: Dict[str, float]) -> Dict[str, Any]:
    """
    Update ensemble model weights based on recent performance metrics.
    
    Args:
        model_performance: Dictionary with model names and their performance scores.
        
    Returns:
        Updated ensemble weights.
    """
    try:
        logger.info("Updating ensemble model weights")
        
        # Mock ensemble weight calculation
        total_performance = sum(model_performance.values())
        
        if total_performance > 0:
            new_weights = {
                model: performance / total_performance 
                for model, performance in model_performance.items()
            }
        else:
            # Default equal weights if no performance data
            num_models = len(model_performance)
            new_weights = {model: 1.0 / num_models for model in model_performance.keys()}
        
        result = {
            "task": "update_ensemble_weights",
            "timestamp": datetime.utcnow().isoformat(),
            "old_performance": model_performance,
            "new_weights": new_weights
        }
        
        logger.info(f"Ensemble weights updated: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Ensemble weight update failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def schedule_hourly_spatial_updates() -> Dict[str, Any]:
    """
    Schedule spatial prediction updates for common regions.
    This task runs hourly and triggers updates for predefined areas.
    
    Returns:
        Dictionary with scheduling results.
    """
    try:
        logger.info("Scheduling hourly spatial updates")
        
        # Define common regions to update
        regions = [
            {
                "name": "Delhi NCR",
                "bounds": {
                    "north": 28.8,
                    "south": 28.4,
                    "east": 77.4,
                    "west": 76.8
                },
                "resolution": 1.0
            },
            {
                "name": "Mumbai Metropolitan",
                "bounds": {
                    "north": 19.3,
                    "south": 18.9,
                    "east": 72.9,
                    "west": 72.7
                },
                "resolution": 1.0
            },
            {
                "name": "Bangalore Urban",
                "bounds": {
                    "north": 13.1,
                    "south": 12.8,
                    "east": 77.8,
                    "west": 77.4
                },
                "resolution": 1.0
            }
        ]
        
        # Schedule updates for each region
        scheduled_tasks = []
        for region in regions:
            try:
                task = generate_spatial_predictions.delay(
                    region["bounds"], 
                    region["resolution"]
                )
                scheduled_tasks.append({
                    "region": region["name"],
                    "task_id": task.id,
                    "bounds": region["bounds"],
                    "resolution": region["resolution"]
                })
            except Exception as e:
                logger.error(f"Failed to schedule spatial update for {region['name']}: {e}")
                scheduled_tasks.append({
                    "region": region["name"],
                    "task_id": None,
                    "error": str(e)
                })
        
        result = {
            "task": "schedule_hourly_spatial_updates",
            "timestamp": datetime.utcnow().isoformat(),
            "regions_scheduled": len([t for t in scheduled_tasks if t.get("task_id")]),
            "regions_failed": len([t for t in scheduled_tasks if not t.get("task_id")]),
            "total_regions": len(regions),
            "scheduled_tasks": scheduled_tasks
        }
        
        logger.info(f"Scheduled spatial updates for {result['regions_scheduled']} regions")
        return result
        
    except Exception as e:
        logger.error(f"Failed to schedule spatial updates: {e}")
        return {
            "task": "schedule_hourly_spatial_updates",
            "timestamp": datetime.utcnow().isoformat(),
            "success": False,
            "error": str(e)
        }