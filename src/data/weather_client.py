"""
OpenWeatherMap API Client - Fetch weather data for AQI prediction
https://openweathermap.org/api
"""

import os
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from cachetools import TTLCache
from dotenv import load_dotenv

from ..utils.constants import OPENWEATHER_BASE_URL, CITIES, CACHE_DURATION

# Load environment variables
load_dotenv()


class WeatherClient:
    """Client for fetching weather data from OpenWeatherMap API"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('OPENWEATHERMAP_API_KEY')
        self.base_url = OPENWEATHER_BASE_URL
        self.session = requests.Session()
        self._cache = TTLCache(maxsize=50, ttl=CACHE_DURATION)
        
        if not self.api_key or self.api_key == 'your_openweathermap_api_key_here':
            print("Warning: OpenWeatherMap API key not configured. Using demo data.")
            self._demo_mode = True
        else:
            self._demo_mode = False
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request with caching"""
        if self._demo_mode:
            return self._get_demo_data(endpoint, params)
        
        cache_key = f"{endpoint}:{str(sorted(params.items()) if params else '')}"
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            params = params or {}
            params['appid'] = self.api_key
            params['units'] = 'metric'
            
            url = f"{self.base_url}/{endpoint}"
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            self._cache[cache_key] = data
            return data
        except requests.exceptions.RequestException as e:
            print(f"OpenWeatherMap API error: {e}")
            return self._get_demo_data(endpoint, params)
    
    def _get_demo_data(self, endpoint: str, params: Dict = None) -> Dict:
        """Return demo data when API key is not available"""
        import random
        
        base_temp = 25 + random.uniform(-5, 5)
        
        if endpoint == 'weather':
            return {
                'main': {
                    'temp': round(base_temp, 1),
                    'feels_like': round(base_temp + random.uniform(-2, 2), 1),
                    'humidity': random.randint(40, 80),
                    'pressure': random.randint(1000, 1020)
                },
                'wind': {
                    'speed': round(random.uniform(1, 8), 1),
                    'deg': random.randint(0, 360)
                },
                'visibility': random.randint(5000, 10000),
                'weather': [{'description': 'partly cloudy', 'icon': '02d'}],
                'dt': int(datetime.now().timestamp()),
                'name': params.get('q', 'Delhi') if params else 'Delhi'
            }
        elif endpoint == 'forecast':
            # Generate 48-hour forecast
            forecasts = []
            current_time = datetime.now()
            for i in range(16):  # 3-hour intervals = 48 hours
                forecast_time = current_time + timedelta(hours=i*3)
                temp_variation = random.uniform(-3, 3) + (2 if 6 <= forecast_time.hour <= 18 else -2)
                
                forecasts.append({
                    'dt': int(forecast_time.timestamp()),
                    'dt_txt': forecast_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'main': {
                        'temp': round(base_temp + temp_variation, 1),
                        'humidity': random.randint(40, 80),
                        'pressure': random.randint(1000, 1020)
                    },
                    'wind': {
                        'speed': round(random.uniform(1, 8), 1),
                        'deg': random.randint(0, 360)
                    },
                    'weather': [{'description': 'partly cloudy', 'icon': '02d'}]
                })
            
            return {'list': forecasts}
        
        return {}
    
    def get_current_weather(self, city: str = 'Delhi') -> Dict[str, Any]:
        """
        Get current weather for a city
        
        Args:
            city: City name
            
        Returns:
            Weather data dictionary
        """
        city_info = CITIES.get(city, CITIES['Delhi'])
        
        params = {
            'lat': city_info['lat'],
            'lon': city_info['lon']
        }
        
        data = self._make_request('weather', params)
        
        return {
            'city': city,
            'temperature': data.get('main', {}).get('temp'),
            'feels_like': data.get('main', {}).get('feels_like'),
            'humidity': data.get('main', {}).get('humidity'),
            'pressure': data.get('main', {}).get('pressure'),
            'wind_speed': data.get('wind', {}).get('speed'),
            'wind_deg': data.get('wind', {}).get('deg'),
            'visibility': data.get('visibility'),
            'description': data.get('weather', [{}])[0].get('description', ''),
            'icon': data.get('weather', [{}])[0].get('icon', '01d'),
            'timestamp': datetime.fromtimestamp(data.get('dt', 0))
        }
    
    def get_forecast(self, city: str = 'Delhi', hours: int = 48) -> List[Dict]:
        """
        Get weather forecast for a city
        
        Args:
            city: City name
            hours: Hours of forecast (max 120)
            
        Returns:
            List of forecast data dictionaries
        """
        city_info = CITIES.get(city, CITIES['Delhi'])
        
        params = {
            'lat': city_info['lat'],
            'lon': city_info['lon']
        }
        
        data = self._make_request('forecast', params)
        forecasts = data.get('list', [])
        
        result = []
        for f in forecasts:
            forecast_time = datetime.fromtimestamp(f.get('dt', 0))
            if forecast_time <= datetime.now() + timedelta(hours=hours):
                result.append({
                    'timestamp': forecast_time,
                    'temperature': f.get('main', {}).get('temp'),
                    'humidity': f.get('main', {}).get('humidity'),
                    'pressure': f.get('main', {}).get('pressure'),
                    'wind_speed': f.get('wind', {}).get('speed'),
                    'wind_deg': f.get('wind', {}).get('deg'),
                    'description': f.get('weather', [{}])[0].get('description', ''),
                    'icon': f.get('weather', [{}])[0].get('icon', '01d')
                })
        
        return result
    
    def get_weather_features(self, city: str = 'Delhi') -> Dict[str, float]:
        """
        Get weather features for ML model input
        
        Args:
            city: City name
            
        Returns:
            Dictionary of weather features
        """
        weather = self.get_current_weather(city)
        
        import math
        wind_speed = weather.get('wind_speed', 0) or 0
        wind_deg = weather.get('wind_deg', 0) or 0
        
        # Convert wind to x/y components
        wind_rad = math.radians(wind_deg)
        wind_x = wind_speed * math.cos(wind_rad)
        wind_y = wind_speed * math.sin(wind_rad)
        
        return {
            'temperature': weather.get('temperature', 25),
            'humidity': weather.get('humidity', 50),
            'pressure': weather.get('pressure', 1013),
            'wind_speed': wind_speed,
            'wind_x': wind_x,
            'wind_y': wind_y,
            'visibility': (weather.get('visibility', 10000) or 10000) / 1000  # km
        }


# Singleton pattern
_client_instance = None

def get_weather_client() -> WeatherClient:
    """Get or create Weather client instance"""
    global _client_instance
    if _client_instance is None:
        _client_instance = WeatherClient()
    return _client_instance
