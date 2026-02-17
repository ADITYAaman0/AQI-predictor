"""
OpenAQ API v3 Client - Fetch real-time air quality data from OpenAQ v3 API
https://openaq.org/
"""

import aiohttp
import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from cachetools import TTLCache
import time
import logging
import os

logger = logging.getLogger(__name__)


class OpenAQClient:
    """Client for fetching air quality data from OpenAQ v3 API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = "https://api.openaq.org/v3"
        self.api_key = api_key or os.getenv("OPENAQ_API_KEY")
        self.session = None
        self.india_country_id = 9  # Correct India country ID for v3 API
        
        # Cache responses for 5 minutes
        self._cache = TTLCache(maxsize=100, ttl=300)
        self._last_request_time = 0
        self._min_request_interval = 0.5  # seconds between requests
        
        # Cache for Indian locations
        self.indian_locations_cache = None
        self.cache_timestamp = None
        self.cache_duration = 3600  # Cache locations for 1 hour
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _rate_limit(self):
        """Simple rate limiting"""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request with caching and rate limiting"""
        if not self.session:
            raise RuntimeError("Client session not initialized. Use async context manager.")
        
        cache_key = f"{endpoint}:{str(sorted(params.items()) if params else '')}"
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        self._rate_limit()
        
        try:
            url = f"{self.base_url}/{endpoint}"
            headers = {}
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            
            async with self.session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                response.raise_for_status()
                data = await response.json()
                self._cache[cache_key] = data
                return data
        except aiohttp.ClientError as e:
            logger.error(f"OpenAQ v3 API error: {e}")
            return {'results': []}
        except Exception as e:
            logger.error(f"Unexpected error in OpenAQ v3 request: {e}")
            return {'results': []}
    
    async def get_indian_locations(self, limit: int = 1000) -> List[Dict]:
        """
        Get all Indian monitoring station locations
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List of location dictionaries
        """
        # Check cache
        if (self.indian_locations_cache and self.cache_timestamp and 
            (datetime.now() - self.cache_timestamp).seconds < self.cache_duration):
            return self.indian_locations_cache
        
        params = {
            'limit': limit,
            'countries': self.india_country_id
        }
        
        data = await self._make_request('locations', params)
        locations = data.get('results', [])
        
        # Filter for actual Indian locations
        indian_locations = [
            loc for loc in locations 
            if loc.get("country", {}).get("id") == self.india_country_id
        ]
        
        # Cache the results
        self.indian_locations_cache = indian_locations
        self.cache_timestamp = datetime.now()
        
        logger.info(f"Found {len(indian_locations)} Indian monitoring locations")
        return indian_locations
    
    async def get_locations(self, city: str = 'Delhi', country: str = 'IN', 
                           limit: int = 100) -> List[Dict]:
        """
        Get monitoring station locations for a city
        
        Args:
            city: City name
            country: Country code (ISO 3166-1 alpha-2)
            limit: Maximum number of results
            
        Returns:
            List of location dictionaries
        """
        # Get all Indian locations first
        indian_locations = await self.get_indian_locations()
        
        # Filter by city
        city_keywords = {
            "delhi": ["delhi", "new delhi"],
            "mumbai": ["mumbai", "bombay"],
            "bangalore": ["bangalore", "bengaluru"],
            "chennai": ["chennai", "madras"],
            "kolkata": ["kolkata", "calcutta"],
            "hyderabad": ["hyderabad"],
            "pune": ["pune"],
            "ahmedabad": ["ahmedabad"]
        }
        
        city_lower = city.lower()
        keywords = city_keywords.get(city_lower, [city_lower])
        
        filtered_locations = []
        for location in indian_locations:
            location_name = location.get("name", "").lower()
            if any(keyword in location_name for keyword in keywords):
                filtered_locations.append(location)
        
        return filtered_locations[:limit]
    
    async def get_latest_measurements(self, city: str = 'Delhi', 
                                     country: str = 'IN') -> List[Dict]:
        """
        Get latest measurements for a city
        
        Args:
            city: City name
            country: Country code
            
        Returns:
            List of measurement dictionaries
        """
        locations = await self.get_locations(city, country)
        
        all_measurements = []
        for location in locations[:5]:  # Limit to 5 locations to avoid rate limits
            location_id = location.get("id")
            if location_id:
                measurements = await self._get_location_latest_data(location_id, location)
                all_measurements.extend(measurements)
        
        return all_measurements
    
    async def _get_location_latest_data(self, location_id: int, location: Dict) -> List[Dict]:
        """Get latest data for a specific location."""
        try:
            data = await self._make_request(f'locations/{location_id}/latest')
            measurements = data.get('results', [])
            
            # Add location metadata to each measurement
            for measurement in measurements:
                measurement['location_info'] = location
            
            return measurements
        except Exception as e:
            logger.warning(f"Failed to fetch data from location {location_id}: {e}")
            return []
    
    async def get_measurements(self, city: str = 'Delhi', country: str = 'IN',
                              parameter: str = None, hours: int = 24) -> List[Dict]:
        """
        Get historical measurements for a city
        
        Args:
            city: City name
            country: Country code
            parameter: Specific parameter (pm25, pm10, o3, no2, so2, co)
            hours: Hours of history to fetch
            
        Returns:
            List of measurement dictionaries
        """
        # Note: v3 measurements endpoint has different behavior
        # For now, return latest measurements as historical data is limited
        return await self.get_latest_measurements(city, country)
    
    async def get_city_summary(self, city: str = 'Delhi') -> Dict[str, Any]:
        """
        Get summarized AQI data for a city
        
        Args:
            city: City name
            
        Returns:
            Dictionary with current pollutant values and metadata
        """
        # City coordinates (fallback)
        city_coords = {
            "Delhi": {"lat": 28.6139, "lon": 77.2090},
            "Mumbai": {"lat": 19.0760, "lon": 72.8777},
            "Bangalore": {"lat": 12.9716, "lon": 77.5946},
            "Chennai": {"lat": 13.0827, "lon": 80.2707},
            "Kolkata": {"lat": 22.5726, "lon": 88.3639},
            "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
            "Pune": {"lat": 18.5204, "lon": 73.8567},
            "Ahmedabad": {"lat": 23.0225, "lon": 72.5714}
        }
        
        city_info = city_coords.get(city, city_coords["Delhi"])
        
        latest = await self.get_latest_measurements(city)
        
        # Aggregate by parameter
        pollutants = {}
        stations = set()
        last_updated = None
        
        for measurement in latest:
            location_info = measurement.get('location_info', {})
            location_name = location_info.get('name', '')
            stations.add(location_name)
            
            # Parse measurement data
            value = measurement.get('value')
            datetime_info = measurement.get('datetime', {})
            
            if isinstance(datetime_info, dict):
                updated = datetime_info.get('utc')
            else:
                updated = datetime_info
            
            # Get parameter from sensor info
            sensors_id = measurement.get('sensorsId')
            parameter = 'unknown'
            
            # Try to match sensor ID to parameter from location sensors
            sensors = location_info.get('sensors', [])
            for sensor in sensors:
                if sensor.get('id') == sensors_id:
                    param_info = sensor.get('parameter', {})
                    parameter = param_info.get('name', 'unknown')
                    break
            
            if parameter != 'unknown' and value is not None:
                param_key = self._normalize_parameter(parameter)
                if param_key:
                    if param_key not in pollutants:
                        pollutants[param_key] = []
                    pollutants[param_key].append(value)
            
            if updated and (not last_updated or updated > last_updated):
                last_updated = updated
        
        # Average values across stations
        averaged = {}
        for key, values in pollutants.items():
            if values:
                averaged[key] = sum(values) / len(values)
        
        return {
            'city': city,
            'country': 'IN',
            'lat': city_info['lat'],
            'lon': city_info['lon'],
            'pollutants': averaged,
            'station_count': len(stations),
            'stations': list(stations),
            'last_updated': last_updated,
            'api_version': 'v3'
        }
    
    def _normalize_parameter(self, param: str) -> Optional[str]:
        """Normalize OpenAQ parameter names to our standard keys"""
        param_map = {
            'pm25': 'pm25',
            'pm2.5': 'pm25',
            'pm10': 'pm10',
            'o3': 'o3',
            'ozone': 'o3',
            'no2': 'no2',
            'so2': 'so2',
            'co': 'co'
        }
        return param_map.get(param.lower())
    
    async def get_historical_data(self, city: str = 'Delhi', 
                                 days: int = 7) -> List[Dict]:
        """
        Get historical daily averages for a city
        
        Args:
            city: City name
            days: Number of days of history
            
        Returns:
            List of daily summary dictionaries
        """
        # Note: v3 API has limited historical data access
        # Return current data as a single day entry
        current_summary = await self.get_city_summary(city)
        
        return [{
            'date': datetime.now().strftime('%Y-%m-%d'),
            'city': city,
            'pollutants': current_summary.get('pollutants', {}),
            'note': 'Limited historical data in v3 API'
        }]


# Singleton pattern for easy import
_client_instance = None

def get_openaq_client() -> OpenAQClient:
    """Get or create OpenAQ client instance"""
    global _client_instance
    if _client_instance is None:
        _client_instance = OpenAQClient()
    return _client_instance
