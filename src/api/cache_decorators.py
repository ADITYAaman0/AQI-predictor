"""
Cache decorators for API endpoints
Provides decorators for caching frequently accessed data with appropriate TTL
"""

import functools
import hashlib
import json
import logging
from typing import Any, Callable, Optional
from datetime import timedelta

from src.api.cache import cache_manager, CACHE_TTL

logger = logging.getLogger(__name__)


def cache_key_from_args(*args, **kwargs) -> str:
    """Generate cache key from function arguments"""
    # Create a stable string representation of arguments
    key_parts = []
    
    # Add positional arguments
    for arg in args:
        if hasattr(arg, '__dict__'):
            # Skip self/cls arguments
            continue
        key_parts.append(str(arg))
    
    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}={v}")
    
    # Create hash of the key parts
    key_string = ":".join(key_parts)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()
    
    return key_hash


def cached(
    ttl: Optional[int] = None,
    key_prefix: str = "",
    key_func: Optional[Callable] = None
):
    """
    Decorator to cache function results in Redis
    
    Args:
        ttl: Time to live in seconds (None for no expiration)
        key_prefix: Prefix for cache key
        key_func: Custom function to generate cache key from arguments
    
    Example:
        @cached(ttl=300, key_prefix="forecast")
        async def get_forecast(location: str):
            return expensive_computation(location)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                arg_hash = cache_key_from_args(*args, **kwargs)
                cache_key = f"{key_prefix}:{func.__name__}:{arg_hash}"
            
            # Try to get from cache
            cached_value = await cache_manager.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return cached_value
            
            # Cache miss - execute function
            logger.debug(f"Cache miss for key: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            if result is not None:
                await cache_manager.set(cache_key, result, ttl=ttl)
            
            return result
        
        return wrapper
    return decorator


def cache_forecast(forecast_type: str = "current"):
    """
    Specialized decorator for caching forecast data
    
    Args:
        forecast_type: Type of forecast (current, 24h, spatial)
    """
    ttl = CACHE_TTL.get("forecast", 3600)
    
    def key_func(*args, **kwargs):
        location = kwargs.get('location') or (args[0] if args else 'unknown')
        return f"forecast:{forecast_type}:{location}"
    
    return cached(ttl=ttl, key_prefix="forecast", key_func=key_func)


def cache_aqi(ttl: Optional[int] = None):
    """
    Specialized decorator for caching current AQI data
    """
    if ttl is None:
        ttl = CACHE_TTL.get("current_aqi", 300)
    
    def key_func(*args, **kwargs):
        location = kwargs.get('location') or (args[0] if args else 'unknown')
        return f"aqi:current:{location}"
    
    return cached(ttl=ttl, key_prefix="aqi", key_func=key_func)


def cache_attribution(ttl: Optional[int] = None):
    """
    Specialized decorator for caching source attribution data
    """
    if ttl is None:
        ttl = CACHE_TTL.get("attribution", 1800)
    
    def key_func(*args, **kwargs):
        location = kwargs.get('location') or (args[0] if args else 'unknown')
        return f"attribution:{location}"
    
    return cached(ttl=ttl, key_prefix="attribution", key_func=key_func)


def cache_spatial(ttl: Optional[int] = None):
    """
    Specialized decorator for caching spatial predictions
    """
    if ttl is None:
        ttl = CACHE_TTL.get("spatial", 3600)
    
    def key_func(*args, **kwargs):
        bounds = kwargs.get('bounds', 'default')
        resolution = kwargs.get('resolution', 1.0)
        return f"spatial:{bounds}:{resolution}"
    
    return cached(ttl=ttl, key_prefix="spatial", key_func=key_func)


def cache_city_data(ttl: Optional[int] = None):
    """
    Specialized decorator for caching city configuration data
    """
    if ttl is None:
        ttl = CACHE_TTL.get("stations", 86400)  # 24 hours
    
    def key_func(*args, **kwargs):
        city_code = kwargs.get('city_code') or (args[0] if args else 'unknown')
        return f"city:{city_code}"
    
    return cached(ttl=ttl, key_prefix="city", key_func=key_func)


def invalidate_cache(key_pattern: str):
    """
    Decorator to invalidate cache after function execution
    
    Args:
        key_pattern: Pattern of cache keys to invalidate
    
    Example:
        @invalidate_cache("forecast:*")
        async def update_forecast_model():
            # Update model
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Invalidate cache (simplified - in production use Redis SCAN)
            # For now, just log the invalidation
            logger.info(f"Cache invalidation requested for pattern: {key_pattern}")
            
            return result
        
        return wrapper
    return decorator


class CacheWarmer:
    """Utility class for warming up cache with frequently accessed data"""
    
    @staticmethod
    async def warm_city_data():
        """Pre-load city configuration data into cache"""
        from src.utils.city_detector import CityDetector
        from src.api.database import get_db
        
        logger.info("Warming up city data cache...")
        
        try:
            async for db in get_db():
                detector = CityDetector(db)
                cities = detector.get_all_active_cities()
                
                # Cache each city's data
                for city in cities:
                    cache_key = f"city:{city.city_code}"
                    await cache_manager.set(
                        cache_key,
                        {
                            'city_code': city.city_code,
                            'city_name': city.city_name,
                            'state': city.state,
                            'country': city.country,
                            'latitude': city.latitude,
                            'longitude': city.longitude,
                            'is_active': city.is_active,
                            'priority': city.priority
                        },
                        ttl=CACHE_TTL.get("stations", 86400)
                    )
                
                logger.info(f"Cached data for {len(cities)} cities")
                break  # Exit after first iteration
                
        except Exception as e:
            logger.error(f"Error warming up city data cache: {e}")
    
    @staticmethod
    async def warm_station_data():
        """Pre-load monitoring station data into cache"""
        from src.api.models import MonitoringStation
        from src.api.database import get_db
        from sqlalchemy import select
        
        logger.info("Warming up station data cache...")
        
        try:
            async for db in get_db():
                stmt = select(MonitoringStation).where(MonitoringStation.is_active == True)
                result = await db.execute(stmt)
                stations = result.scalars().all()
                
                # Cache station list
                station_data = [
                    {
                        'station_id': station.station_id,
                        'name': station.name,
                        'city': station.city,
                        'city_code': station.city_code
                    }
                    for station in stations
                ]
                
                await cache_manager.set(
                    "stations:all",
                    station_data,
                    ttl=CACHE_TTL.get("stations", 86400)
                )
                
                logger.info(f"Cached data for {len(stations)} stations")
                break  # Exit after first iteration
                
        except Exception as e:
            logger.error(f"Error warming up station data cache: {e}")
