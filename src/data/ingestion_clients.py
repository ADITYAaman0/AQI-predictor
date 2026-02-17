"""
Data ingestion clients for various air quality and weather data sources.
Provides standardized interfaces for CPCB, IMD, OpenAQ, and Google Maps APIs.
"""

import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from abc import ABC, abstractmethod
import json
import os
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


@dataclass
class DataPoint:
    """Standardized data point structure."""
    timestamp: datetime
    location: Tuple[float, float]  # (lat, lon)
    parameter: str
    value: float
    unit: str
    source: str
    station_id: Optional[str] = None
    quality_flag: str = "valid"
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class WeatherPoint:
    """Standardized weather data point structure."""
    timestamp: datetime
    location: Tuple[float, float]  # (lat, lon)
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    pressure: Optional[float] = None
    precipitation: Optional[float] = None
    visibility: Optional[float] = None
    source: str = "unknown"
    metadata: Optional[Dict[str, Any]] = None


class DataIngestionClient(ABC):
    """Abstract base class for data ingestion clients."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def fetch_data(self, **kwargs) -> List[DataPoint]:
        """Fetch data from the source."""
        pass
    
    async def _make_request(self, url: str, params: Dict[str, Any] = None, headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Make HTTP request with error handling."""
        if not self.session:
            raise RuntimeError("Client session not initialized. Use async context manager.")
        
        try:
            async with self.session.get(url, params=params, headers=headers) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"HTTP request failed for {url}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from {url}: {e}")
            raise


class CPCBClient(DataIngestionClient):
    """Client for CPCB (Central Pollution Control Board) data."""
    
    def __init__(self, api_key: Optional[str] = None):
        # CPCB data access via WAQI (World Air Quality Index) API
        super().__init__(
            api_key=api_key or os.getenv("CPCB_API_KEY"),
            base_url="https://api.waqi.info"
        )
        # Real CPCB monitoring stations in Delhi and other major cities
        self.station_mapping = {
            # Delhi stations
            "DL001": {"name": "Anand Vihar", "lat": 28.6469, "lon": 77.3162, "city": "Delhi", "state": "Delhi"},
            "DL002": {"name": "RK Puram", "lat": 28.5706, "lon": 77.1847, "city": "Delhi", "state": "Delhi"},
            "DL003": {"name": "Punjabi Bagh", "lat": 28.6742, "lon": 77.1311, "city": "Delhi", "state": "Delhi"},
            "DL004": {"name": "Mandir Marg", "lat": 28.6358, "lon": 77.2014, "city": "Delhi", "state": "Delhi"},
            "DL005": {"name": "ITO", "lat": 28.6289, "lon": 77.2426, "city": "Delhi", "state": "Delhi"},
            "DL006": {"name": "Dwarka-Sector 8", "lat": 28.5706, "lon": 77.0688, "city": "Delhi", "state": "Delhi"},
            "DL007": {"name": "IGI Airport (T3)", "lat": 28.5665, "lon": 77.1031, "city": "Delhi", "state": "Delhi"},
            "DL008": {"name": "Nehru Nagar", "lat": 28.5706, "lon": 77.2496, "city": "Delhi", "state": "Delhi"},
            "DL009": {"name": "NSIT Dwarka", "lat": 28.6089, "lon": 77.0324, "city": "Delhi", "state": "Delhi"},
            "DL010": {"name": "Patparganj", "lat": 28.6219, "lon": 77.2906, "city": "Delhi", "state": "Delhi"},
            
            # Mumbai stations
            "MH001": {"name": "Colaba", "lat": 18.9067, "lon": 72.8147, "city": "Mumbai", "state": "Maharashtra"},
            "MH002": {"name": "Bandra", "lat": 19.0596, "lon": 72.8295, "city": "Mumbai", "state": "Maharashtra"},
            "MH003": {"name": "Worli", "lat": 19.0176, "lon": 72.8162, "city": "Mumbai", "state": "Maharashtra"},
            "MH004": {"name": "Borivali", "lat": 19.2307, "lon": 72.8567, "city": "Mumbai", "state": "Maharashtra"},
            
            # Bangalore stations
            "KA001": {"name": "BTM Layout", "lat": 12.9165, "lon": 77.6101, "city": "Bangalore", "state": "Karnataka"},
            "KA002": {"name": "BWSSB Kadabesanahalli", "lat": 12.9352, "lon": 77.6245, "city": "Bangalore", "state": "Karnataka"},
            "KA003": {"name": "City Railway Station", "lat": 12.9767, "lon": 77.5718, "city": "Bangalore", "state": "Karnataka"},
            "KA004": {"name": "Hebbal", "lat": 13.0358, "lon": 77.5970, "city": "Bangalore", "state": "Karnataka"},
            
            # Chennai stations
            "TN001": {"name": "Alandur Bus Depot", "lat": 13.0067, "lon": 80.2206, "city": "Chennai", "state": "Tamil Nadu"},
            "TN002": {"name": "Manali Village", "lat": 13.1693, "lon": 80.2619, "city": "Chennai", "state": "Tamil Nadu"},
            "TN003": {"name": "US Consulate", "lat": 13.0569, "lon": 80.2497, "city": "Chennai", "state": "Tamil Nadu"},
            
            # Kolkata stations
            "WB001": {"name": "Ballygunge", "lat": 22.5448, "lon": 88.3643, "city": "Kolkata", "state": "West Bengal"},
            "WB002": {"name": "Bidhannagar", "lat": 22.5726, "lon": 88.4279, "city": "Kolkata", "state": "West Bengal"},
            "WB003": {"name": "Fort William", "lat": 22.5697, "lon": 88.3378, "city": "Kolkata", "state": "West Bengal"},
        }
    
    async def fetch_data(self, 
                        stations: Optional[List[str]] = None,
                        start_time: Optional[datetime] = None,
                        end_time: Optional[datetime] = None) -> List[DataPoint]:
        """
        Fetch air quality data from CPCB monitoring stations.
        
        Since CPCB doesn't provide a public API, this implementation:
        1. Attempts to fetch data from the official CPCB portal
        2. Falls back to simulated realistic data based on historical patterns
        3. Uses actual station locations and parameters
        
        Args:
            stations: List of station IDs to fetch data for
            start_time: Start time for data retrieval
            end_time: End time for data retrieval
            
        Returns:
            List of standardized DataPoint objects
        """
        if not stations:
            # Default to Delhi stations if none specified
            stations = [sid for sid in self.station_mapping.keys() if sid.startswith("DL")]
        
        if not start_time:
            start_time = datetime.utcnow() - timedelta(hours=1)
        if not end_time:
            end_time = datetime.utcnow()
        
        data_points = []
        
        for station_id in stations:
            try:
                station_data = await self._fetch_station_data(station_id, start_time, end_time)
                data_points.extend(station_data)
            except Exception as e:
                logger.error(f"Failed to fetch CPCB data for station {station_id}: {e}")
                continue
        
        logger.info(f"Fetched {len(data_points)} data points from CPCB")
        return data_points
    
    async def _fetch_station_data(self, 
                                 station_id: str, 
                                 start_time: datetime, 
                                 end_time: datetime) -> List[DataPoint]:
        """Fetch data for a specific CPCB station."""
        station_info = self.station_mapping.get(station_id)
        if not station_info:
            logger.warning(f"Unknown CPCB station ID: {station_id}")
            return []
        
        try:
            # Attempt to fetch real data from CPCB portal
            real_data = await self._fetch_from_cpcb_portal(station_id, station_info)
            if real_data:
                return real_data
        except Exception as e:
            logger.warning(f"Failed to fetch real CPCB data for {station_id}: {e}")
        
        # Fallback to realistic simulated data based on station location and time
        return await self._generate_realistic_data(station_id, station_info, start_time)
    
    async def _fetch_from_cpcb_portal(self, station_id: str, station_info: Dict[str, Any]) -> List[DataPoint]:
        """
        Attempt to fetch real data from CPCB via available APIs.
        
        This method tries multiple approaches to get real CPCB data:
        1. WAQI (World Air Quality Index) API - aggregates CPCB data
        2. Direct CPCB portal scraping (if implemented)
        3. Other third-party services that provide CPCB data
        
        Returns None if no real data is available, triggering fallback to simulation.
        """
        if not self.api_key:
            logger.info(f"No API key provided for {station_id}, using simulation")
            return None
        
        # Try WAQI API first
        waqi_data = await self._try_waqi_api(station_id, station_info)
        if waqi_data:
            return waqi_data
        
        # Try other APIs or methods here
        # Could add: AirVisual, BreezoMeter, Ambee, etc.
        
        logger.info(f"No real-time data available for {station_id}, using simulation")
        return None
    
    async def _try_waqi_api(self, station_id: str, station_info: Dict[str, Any]) -> Optional[List[DataPoint]]:
        """Try to fetch data from WAQI API."""
        try:
            # Map our station IDs to WAQI station identifiers
            waqi_station_mapping = {
                # Delhi stations (CPCB via WAQI)
                "DL001": "anand-vihar-delhi",  # Anand Vihar
                "DL002": "rk-puram-delhi",     # RK Puram
                "DL003": "punjabi-bagh-delhi", # Punjabi Bagh
                "DL004": "mandir-marg-delhi",  # Mandir Marg
                "DL005": "ito-delhi",          # ITO
                "DL006": "dwarka-sector-8-delhi", # Dwarka
                "DL007": "igi-airport-delhi",  # IGI Airport
                "DL008": "nehru-nagar-delhi",  # Nehru Nagar
                "DL009": "nsit-dwarka-delhi",  # NSIT Dwarka
                "DL010": "patparganj-delhi",   # Patparganj
                
                # Mumbai stations
                "MH001": "colaba-mumbai",      # Colaba
                "MH002": "bandra-mumbai",      # Bandra
                "MH003": "worli-mumbai",       # Worli
                "MH004": "borivali-mumbai",    # Borivali
                
                # Bangalore stations
                "KA001": "btm-layout-bangalore", # BTM Layout
                "KA002": "bwssb-kadabesanahalli-bangalore", # BWSSB
                "KA003": "city-railway-station-bangalore", # Railway Station
                "KA004": "hebbal-bangalore",   # Hebbal
                
                # Chennai stations
                "TN001": "alandur-chennai",    # Alandur
                "TN002": "manali-chennai",     # Manali
                "TN003": "us-consulate-chennai", # US Consulate
                
                # Kolkata stations
                "WB001": "ballygunge-kolkata", # Ballygunge
                "WB002": "bidhannagar-kolkata", # Bidhannagar
                "WB003": "fort-william-kolkata", # Fort William
            }
            
            waqi_station = waqi_station_mapping.get(station_id)
            if not waqi_station:
                return None
            
            # Test API key validity first
            if not await self._validate_waqi_api_key():
                logger.warning("WAQI API key validation failed")
                return None
            
            # Fetch data from WAQI API
            api_url = f"https://api.waqi.info/feed/{waqi_station}/"
            params = {"token": self.api_key}
            
            logger.info(f"Attempting to fetch real CPCB data for {station_id} via WAQI API")
            
            response_data = await self._make_request(api_url, params)
            
            if response_data.get("status") != "ok":
                error_msg = response_data.get("data", "Unknown error")
                logger.warning(f"WAQI API returned error for {station_id}: {error_msg}")
                return None
            
            data = response_data.get("data", {})
            if not data:
                logger.warning(f"No data returned from WAQI API for {station_id}")
                return None
            
            # Parse WAQI response into our DataPoint format
            return await self._parse_waqi_response(data, station_id, station_info)
            
        except Exception as e:
            logger.error(f"WAQI API request failed for {station_id}: {e}")
            return None
    
    async def _validate_waqi_api_key(self) -> bool:
        """Validate WAQI API key by making a test request."""
        try:
            # Test with a simple city search
            test_url = "https://api.waqi.info/feed/beijing/"
            params = {"token": self.api_key}
            
            response_data = await self._make_request(test_url, params)
            
            if response_data.get("status") == "ok":
                logger.info("WAQI API key validation successful")
                return True
            elif response_data.get("status") == "error":
                error_msg = response_data.get("data", "Unknown error")
                if "Invalid key" in error_msg:
                    logger.warning("WAQI API key is invalid")
                else:
                    logger.warning(f"WAQI API validation error: {error_msg}")
                return False
            else:
                logger.warning("WAQI API validation returned unexpected response")
                return False
                
        except Exception as e:
            logger.error(f"WAQI API key validation failed: {e}")
            return False
    
    async def _parse_waqi_response(self, waqi_data: Dict[str, Any], station_id: str, station_info: Dict[str, Any]) -> List[DataPoint]:
        """Parse WAQI API response into standardized DataPoint objects."""
        try:
            data_points = []
            
            # Extract timestamp
            time_info = waqi_data.get("time", {})
            timestamp_str = time_info.get("iso")
            if timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.utcnow()
            
            # Extract pollutant data
            iaqi = waqi_data.get("iaqi", {})
            
            # Map WAQI parameters to our standard parameters
            parameter_mapping = {
                "pm25": ("pm25", "µg/m³"),
                "pm10": ("pm10", "µg/m³"),
                "no2": ("no2", "µg/m³"),
                "so2": ("so2", "µg/m³"),
                "o3": ("o3", "µg/m³"),
                "co": ("co", "mg/m³")
            }
            
            for waqi_param, (our_param, unit) in parameter_mapping.items():
                if waqi_param in iaqi:
                    param_data = iaqi[waqi_param]
                    if isinstance(param_data, dict) and "v" in param_data:
                        value = param_data["v"]
                        
                        # Convert AQI values to concentration values (approximate)
                        # WAQI returns AQI values, we need to convert to concentrations
                        concentration_value = self._convert_aqi_to_concentration(value, our_param)
                        
                        data_points.append(DataPoint(
                            timestamp=timestamp,
                            location=(station_info["lat"], station_info["lon"]),
                            parameter=our_param,
                            value=concentration_value,
                            unit=unit,
                            source="cpcb_waqi",
                            station_id=station_id,
                            quality_flag="real_time",
                            metadata={
                                "station_name": station_info["name"],
                                "city": station_info["city"],
                                "state": station_info["state"],
                                "data_source": "waqi_api",
                                "original_aqi": value,
                                "waqi_station": waqi_data.get("city", {}).get("name", ""),
                                "note": "Real-time data from CPCB via WAQI API"
                            }
                        ))
            
            # If we got data, log success
            if data_points:
                logger.info(f"Successfully parsed {len(data_points)} real-time data points from WAQI for {station_id}")
            
            return data_points
            
        except Exception as e:
            logger.error(f"Failed to parse WAQI response for {station_id}: {e}")
            return []
    
    def _convert_aqi_to_concentration(self, aqi_value: float, parameter: str) -> float:
        """
        Convert AQI values to approximate concentration values.
        This is a rough conversion based on standard AQI breakpoints.
        """
        # AQI to concentration conversion tables (approximate)
        if parameter == "pm25":
            if aqi_value <= 50:
                return aqi_value * 12.0 / 50.0
            elif aqi_value <= 100:
                return 12.0 + (aqi_value - 50) * 23.5 / 50.0
            elif aqi_value <= 150:
                return 35.5 + (aqi_value - 100) * 19.4 / 50.0
            elif aqi_value <= 200:
                return 55.0 + (aqi_value - 150) * 95.0 / 50.0
            else:
                return 150.0 + (aqi_value - 200) * 100.0 / 100.0
                
        elif parameter == "pm10":
            if aqi_value <= 50:
                return aqi_value * 54.0 / 50.0
            elif aqi_value <= 100:
                return 54.0 + (aqi_value - 50) * 100.0 / 50.0
            elif aqi_value <= 150:
                return 154.0 + (aqi_value - 100) * 100.0 / 50.0
            elif aqi_value <= 200:
                return 254.0 + (aqi_value - 150) * 96.0 / 50.0
            else:
                return 350.0 + (aqi_value - 200) * 74.0 / 100.0
                
        elif parameter == "no2":
            # Rough approximation for NO2
            return aqi_value * 0.8
            
        elif parameter == "so2":
            # Rough approximation for SO2
            return aqi_value * 0.6
            
        elif parameter == "o3":
            # Rough approximation for O3
            return aqi_value * 1.2
            
        elif parameter == "co":
            # Rough approximation for CO (in mg/m³)
            return aqi_value * 0.05
            
        else:
            # Default: return AQI value as-is
            return aqi_value
    
    async def _generate_realistic_data(self, station_id: str, station_info: Dict[str, Any], timestamp: datetime) -> List[DataPoint]:
        """
        Generate realistic air quality data based on:
        1. Station location (urban/industrial areas have higher pollution)
        2. Time of day (rush hours have higher pollution)
        3. Season (winter has higher PM levels in North India)
        4. Historical patterns for the region
        """
        import random
        import math
        
        # Base pollution levels by city (based on historical data)
        city_base_levels = {
            "Delhi": {"pm25": 80, "pm10": 150, "no2": 45, "so2": 15, "o3": 60, "co": 2.5},
            "Mumbai": {"pm25": 45, "pm10": 85, "no2": 35, "so2": 12, "o3": 55, "co": 1.8},
            "Bangalore": {"pm25": 35, "pm10": 70, "no2": 25, "so2": 8, "o3": 45, "co": 1.2},
            "Chennai": {"pm25": 40, "pm10": 75, "no2": 30, "so2": 10, "o3": 50, "co": 1.5},
            "Kolkata": {"pm25": 65, "pm10": 120, "no2": 40, "so2": 18, "o3": 65, "co": 2.2},
        }
        
        city = station_info.get("city", "Delhi")
        base_levels = city_base_levels.get(city, city_base_levels["Delhi"])
        
        # Time-based adjustments (rush hours have higher pollution)
        hour = timestamp.hour
        time_multiplier = 1.0
        if 7 <= hour <= 10 or 18 <= hour <= 21:  # Rush hours
            time_multiplier = 1.4
        elif 22 <= hour <= 6:  # Night hours
            time_multiplier = 0.7
        
        # Seasonal adjustments (winter months have higher PM in North India)
        month = timestamp.month
        seasonal_multiplier = 1.0
        if city in ["Delhi", "Kolkata"] and month in [11, 12, 1, 2]:  # Winter
            seasonal_multiplier = 1.6
        elif month in [6, 7, 8, 9]:  # Monsoon
            seasonal_multiplier = 0.6
        
        # Station-specific adjustments based on location characteristics
        station_multiplier = 1.0
        station_name = station_info["name"].lower()
        if any(keyword in station_name for keyword in ["airport", "highway", "traffic"]):
            station_multiplier = 1.3
        elif any(keyword in station_name for keyword in ["park", "residential"]):
            station_multiplier = 0.8
        
        data_points = []
        
        # Generate data for each pollutant
        for parameter, base_value in base_levels.items():
            # Apply all multipliers and add random variation
            adjusted_value = base_value * time_multiplier * seasonal_multiplier * station_multiplier
            
            # Add realistic random variation (±30%)
            variation = random.uniform(0.7, 1.3)
            final_value = max(0, adjusted_value * variation)
            
            # Round to appropriate precision
            if parameter in ["pm25", "pm10", "no2", "so2", "o3"]:
                final_value = round(final_value, 1)
                unit = "µg/m³"
            else:  # CO
                final_value = round(final_value, 2)
                unit = "mg/m³"
            
            data_points.append(DataPoint(
                timestamp=timestamp,
                location=(station_info["lat"], station_info["lon"]),
                parameter=parameter,
                value=final_value,
                unit=unit,
                source="cpcb",
                station_id=station_id,
                quality_flag="estimated",  # Mark as estimated since it's not real-time data
                metadata={
                    "station_name": station_info["name"],
                    "city": station_info["city"],
                    "state": station_info["state"],
                    "data_source": "simulated_realistic",
                    "note": "Realistic simulation based on historical patterns - CPCB API not publicly available"
                }
            ))
        
        return data_points
    
    async def get_available_stations(self, city: Optional[str] = None, state: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of available CPCB monitoring stations.
        
        Args:
            city: Filter by city name
            state: Filter by state name
            
        Returns:
            List of station information dictionaries
        """
        stations = []
        
        for station_id, info in self.station_mapping.items():
            if city and info.get("city", "").lower() != city.lower():
                continue
            if state and info.get("state", "").lower() != state.lower():
                continue
                
            stations.append({
                "station_id": station_id,
                "name": info["name"],
                "city": info.get("city", ""),
                "state": info.get("state", ""),
                "latitude": info["lat"],
                "longitude": info["lon"],
                "parameters": ["pm25", "pm10", "no2", "so2", "o3", "co"]
            })
        
        return stations
    
    async def get_station_status(self, station_id: str) -> Dict[str, Any]:
        """
        Get operational status of a CPCB monitoring station.
        
        Args:
            station_id: Station identifier
            
        Returns:
            Dictionary with station status information
        """
        station_info = self.station_mapping.get(station_id)
        if not station_info:
            return {"status": "unknown", "message": "Station not found"}
        
        # In a real implementation, this would check actual station status
        # For now, simulate realistic status based on station characteristics
        import random
        
        # Most stations are operational, but some may have issues
        status_options = [
            {"status": "operational", "uptime": 0.95},
            {"status": "maintenance", "uptime": 0.0},
            {"status": "partial", "uptime": 0.7},
        ]
        
        # Weight towards operational status
        weights = [0.85, 0.05, 0.10]
        status_info = random.choices(status_options, weights=weights)[0]
        
        return {
            "station_id": station_id,
            "station_name": station_info["name"],
            "status": status_info["status"],
            "uptime_percentage": status_info["uptime"] * 100,
            "last_updated": datetime.utcnow().isoformat(),
            "parameters_available": ["pm25", "pm10", "no2", "so2", "o3", "co"],
            "data_quality": "estimated" if status_info["status"] == "operational" else "unavailable"
        }


class IMDClient(DataIngestionClient):
    """
    Client for IMD (India Meteorological Department) weather data.
    
    Since IMD doesn't provide a public API, this implementation uses OpenWeatherMap
    as the data source but structures the data as IMD weather information for
    consistency with requirements.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        # Use OpenWeatherMap API key for IMD weather data
        super().__init__(
            api_key=api_key or os.getenv("OPENWEATHER_API_KEY"),
            base_url="https://api.openweathermap.org/data/2.5"
        )
        
        # IMD weather station locations across India
        self.imd_stations = {
            # Delhi region
            "DL_SAFDARJUNG": {"name": "Safdarjung", "lat": 28.5833, "lon": 77.2167, "city": "Delhi", "state": "Delhi"},
            "DL_PALAM": {"name": "Palam", "lat": 28.5665, "lon": 77.1031, "city": "Delhi", "state": "Delhi"},
            "DL_RIDGE": {"name": "Ridge", "lat": 28.6667, "lon": 77.2167, "city": "Delhi", "state": "Delhi"},
            
            # Mumbai region
            "MH_COLABA": {"name": "Colaba", "lat": 18.9067, "lon": 72.8147, "city": "Mumbai", "state": "Maharashtra"},
            "MH_SANTACRUZ": {"name": "Santacruz", "lat": 19.0896, "lon": 72.8656, "city": "Mumbai", "state": "Maharashtra"},
            
            # Bangalore region
            "KA_HAL": {"name": "HAL Airport", "lat": 12.9500, "lon": 77.6681, "city": "Bangalore", "state": "Karnataka"},
            "KA_KEMPEGOWDA": {"name": "Kempegowda Intl Airport", "lat": 13.1986, "lon": 77.7066, "city": "Bangalore", "state": "Karnataka"},
            
            # Chennai region
            "TN_MEENAMBAKKAM": {"name": "Meenambakkam", "lat": 12.9850, "lon": 80.1811, "city": "Chennai", "state": "Tamil Nadu"},
            "TN_NUNGAMBAKKAM": {"name": "Nungambakkam", "lat": 13.0569, "lon": 80.2497, "city": "Chennai", "state": "Tamil Nadu"},
            
            # Kolkata region
            "WB_DUMDUM": {"name": "Dum Dum", "lat": 22.6533, "lon": 88.4467, "city": "Kolkata", "state": "West Bengal"},
            "WB_ALIPORE": {"name": "Alipore", "lat": 22.5333, "lon": 88.3333, "city": "Kolkata", "state": "West Bengal"},
            
            # Hyderabad region
            "TS_BEGUMPET": {"name": "Begumpet", "lat": 17.4500, "lon": 78.4667, "city": "Hyderabad", "state": "Telangana"},
            
            # Pune region
            "MH_PUNE": {"name": "Pune", "lat": 18.5333, "lon": 73.8667, "city": "Pune", "state": "Maharashtra"},
            
            # Ahmedabad region
            "GJ_AHMEDABAD": {"name": "Ahmedabad", "lat": 23.0333, "lon": 72.6167, "city": "Ahmedabad", "state": "Gujarat"},
        }
    
    async def fetch_weather_data(self, 
                               locations: Optional[List[Tuple[float, float]]] = None,
                               station_ids: Optional[List[str]] = None,
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None) -> List[WeatherPoint]:
        """
        Fetch weather data from IMD stations.
        
        Args:
            locations: List of (lat, lon) coordinates
            station_ids: List of IMD station IDs to fetch data for
            start_time: Start time for data retrieval
            end_time: End time for data retrieval
            
        Returns:
            List of standardized WeatherPoint objects
        """
        if not start_time:
            start_time = datetime.utcnow() - timedelta(hours=1)
        if not end_time:
            end_time = datetime.utcnow()
        
        # Determine locations to fetch data for
        fetch_locations = []
        
        if station_ids:
            # Use specified IMD stations
            for station_id in station_ids:
                station_info = self.imd_stations.get(station_id)
                if station_info:
                    fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
                else:
                    logger.warning(f"Unknown IMD station ID: {station_id}")
        elif locations:
            # Use provided coordinates
            for i, location in enumerate(locations):
                fetch_locations.append((location[0], location[1], f"CUSTOM_{i}"))
        else:
            # Default to major city stations
            default_stations = ["DL_SAFDARJUNG", "MH_COLABA", "KA_HAL", "TN_MEENAMBAKKAM", "WB_DUMDUM"]
            for station_id in default_stations:
                station_info = self.imd_stations[station_id]
                fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
        
        weather_points = []
        
        for lat, lon, station_id in fetch_locations:
            try:
                location_data = await self._fetch_location_weather((lat, lon), station_id, start_time, end_time)
                weather_points.extend(location_data)
            except Exception as e:
                logger.error(f"Failed to fetch IMD weather data for {station_id} at ({lat}, {lon}): {e}")
                continue
        
        logger.info(f"Fetched {len(weather_points)} weather points from IMD stations")
        return weather_points
    
    async def _fetch_location_weather(self, 
                                    location: Tuple[float, float], 
                                    station_id: str,
                                    start_time: datetime, 
                                    end_time: datetime) -> List[WeatherPoint]:
        """Fetch weather data for a specific IMD station location."""
        lat, lon = location
        
        if not self.api_key:
            logger.warning("No OpenWeatherMap API key provided for IMD weather data, using simulation")
            return await self._generate_realistic_weather_data(location, station_id, start_time)
        
        try:
            # Fetch current weather data from OpenWeatherMap
            current_weather = await self._fetch_current_weather(lat, lon)
            if current_weather:
                weather_point = self._parse_openweather_to_imd(current_weather, location, station_id)
                return [weather_point] if weather_point else []
            
            # Fallback to realistic simulation
            return await self._generate_realistic_weather_data(location, station_id, start_time)
            
        except Exception as e:
            logger.error(f"Failed to fetch OpenWeatherMap data for IMD station {station_id}: {e}")
            return await self._generate_realistic_weather_data(location, station_id, start_time)
    
    async def _fetch_current_weather(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Fetch current weather from OpenWeatherMap API."""
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }
            
            url = f"{self.base_url}/weather"
            response_data = await self._make_request(url, params)
            
            if response_data:
                logger.debug(f"Successfully fetched OpenWeatherMap data for ({lat}, {lon})")
                return response_data
            
            return None
            
        except Exception as e:
            logger.error(f"OpenWeatherMap API request failed for ({lat}, {lon}): {e}")
            return None
    
    def _parse_openweather_to_imd(self, 
                                 weather_data: Dict[str, Any], 
                                 location: Tuple[float, float],
                                 station_id: str) -> Optional[WeatherPoint]:
        """Parse OpenWeatherMap response into IMD WeatherPoint format."""
        try:
            # Extract timestamp
            timestamp = datetime.utcfromtimestamp(weather_data.get("dt", 0))
            
            # Extract weather parameters
            main = weather_data.get("main", {})
            wind = weather_data.get("wind", {})
            
            # Get station info if available
            station_info = self.imd_stations.get(station_id, {})
            
            weather_point = WeatherPoint(
                timestamp=timestamp,
                location=location,
                temperature=main.get("temp"),
                humidity=main.get("humidity"),
                wind_speed=wind.get("speed"),
                wind_direction=wind.get("deg"),
                pressure=main.get("pressure"),
                precipitation=weather_data.get("rain", {}).get("1h", 0.0),  # 1-hour precipitation
                visibility=weather_data.get("visibility", 10000) / 1000,  # Convert to km
                source="imd_openweather",
                metadata={
                    "station_id": station_id,
                    "station_name": station_info.get("name", "Unknown"),
                    "city": station_info.get("city", "Unknown"),
                    "state": station_info.get("state", "Unknown"),
                    "data_source": "openweathermap_via_imd",
                    "weather_description": weather_data.get("weather", [{}])[0].get("description", ""),
                    "cloud_cover": weather_data.get("clouds", {}).get("all", 0),
                    "note": "IMD weather data via OpenWeatherMap API"
                }
            )
            
            return weather_point
            
        except Exception as e:
            logger.error(f"Failed to parse OpenWeatherMap data for IMD station {station_id}: {e}")
            return None
    
    async def _generate_realistic_weather_data(self, 
                                             location: Tuple[float, float], 
                                             station_id: str,
                                             timestamp: datetime) -> List[WeatherPoint]:
        """
        Generate realistic weather data based on:
        1. Station location and regional climate patterns
        2. Season and time of year
        3. Historical weather patterns for the region
        """
        import random
        import math
        
        lat, lon = location
        station_info = self.imd_stations.get(station_id, {})
        city = station_info.get("city", "Unknown")
        
        # Base weather patterns by city and season
        city_weather_patterns = {
            "Delhi": {
                "winter": {"temp_base": 15, "temp_range": 10, "humidity": 60, "wind": 2.5},
                "summer": {"temp_base": 35, "temp_range": 8, "humidity": 40, "wind": 4.0},
                "monsoon": {"temp_base": 28, "temp_range": 5, "humidity": 80, "wind": 3.0},
                "post_monsoon": {"temp_base": 25, "temp_range": 6, "humidity": 65, "wind": 2.0}
            },
            "Mumbai": {
                "winter": {"temp_base": 25, "temp_range": 5, "humidity": 65, "wind": 3.0},
                "summer": {"temp_base": 32, "temp_range": 4, "humidity": 70, "wind": 4.5},
                "monsoon": {"temp_base": 27, "temp_range": 3, "humidity": 90, "wind": 5.0},
                "post_monsoon": {"temp_base": 28, "temp_range": 4, "humidity": 75, "wind": 3.5}
            },
            "Bangalore": {
                "winter": {"temp_base": 20, "temp_range": 6, "humidity": 55, "wind": 2.0},
                "summer": {"temp_base": 28, "temp_range": 5, "humidity": 50, "wind": 3.0},
                "monsoon": {"temp_base": 23, "temp_range": 3, "humidity": 85, "wind": 2.5},
                "post_monsoon": {"temp_base": 24, "temp_range": 4, "humidity": 70, "wind": 2.0}
            },
            "Chennai": {
                "winter": {"temp_base": 26, "temp_range": 4, "humidity": 70, "wind": 3.5},
                "summer": {"temp_base": 35, "temp_range": 5, "humidity": 60, "wind": 4.0},
                "monsoon": {"temp_base": 29, "temp_range": 3, "humidity": 85, "wind": 4.5},
                "post_monsoon": {"temp_base": 28, "temp_range": 4, "humidity": 75, "wind": 3.0}
            },
            "Kolkata": {
                "winter": {"temp_base": 20, "temp_range": 8, "humidity": 65, "wind": 2.5},
                "summer": {"temp_base": 34, "temp_range": 6, "humidity": 70, "wind": 3.5},
                "monsoon": {"temp_base": 29, "temp_range": 4, "humidity": 90, "wind": 3.0},
                "post_monsoon": {"temp_base": 26, "temp_range": 5, "humidity": 75, "wind": 2.5}
            }
        }
        
        # Determine season based on month
        month = timestamp.month
        if month in [12, 1, 2]:
            season = "winter"
        elif month in [3, 4, 5]:
            season = "summer"
        elif month in [6, 7, 8, 9]:
            season = "monsoon"
        else:
            season = "post_monsoon"
        
        # Get weather pattern for city and season
        city_pattern = city_weather_patterns.get(city, city_weather_patterns["Delhi"])
        season_pattern = city_pattern[season]
        
        # Generate realistic values with diurnal variation
        hour = timestamp.hour
        
        # Temperature with diurnal cycle
        temp_base = season_pattern["temp_base"]
        temp_range = season_pattern["temp_range"]
        diurnal_factor = math.sin((hour - 6) * math.pi / 12)  # Peak at 2 PM, minimum at 6 AM
        temperature = temp_base + (diurnal_factor * temp_range / 2) + random.uniform(-2, 2)
        
        # Humidity (inverse relationship with temperature)
        humidity_base = season_pattern["humidity"]
        humidity = max(20, min(100, humidity_base - (diurnal_factor * 15) + random.uniform(-10, 10)))
        
        # Wind speed with some randomness
        wind_speed = season_pattern["wind"] + random.uniform(-1, 1)
        wind_speed = max(0, wind_speed)
        
        # Wind direction (somewhat random but with seasonal patterns)
        if season == "monsoon":
            wind_direction = random.uniform(180, 270)  # SW monsoon
        else:
            wind_direction = random.uniform(0, 360)
        
        # Pressure (standard with small variations)
        pressure = 1013.25 + random.uniform(-10, 10)
        
        # Precipitation (higher during monsoon)
        if season == "monsoon":
            precipitation = random.uniform(0, 5) if random.random() < 0.3 else 0
        else:
            precipitation = random.uniform(0, 1) if random.random() < 0.1 else 0
        
        # Visibility (reduced during monsoon and high pollution periods)
        if season == "monsoon" and precipitation > 0:
            visibility = random.uniform(2, 8)
        elif city == "Delhi" and season == "winter":
            visibility = random.uniform(1, 6)  # Fog and pollution
        else:
            visibility = random.uniform(8, 15)
        
        weather_point = WeatherPoint(
            timestamp=timestamp,
            location=location,
            temperature=round(temperature, 1),
            humidity=round(humidity, 1),
            wind_speed=round(wind_speed, 1),
            wind_direction=round(wind_direction, 1),
            pressure=round(pressure, 1),
            precipitation=round(precipitation, 2),
            visibility=round(visibility, 1),
            source="imd_simulated",
            metadata={
                "station_id": station_id,
                "station_name": station_info.get("name", "Unknown"),
                "city": city,
                "state": station_info.get("state", "Unknown"),
                "season": season,
                "data_source": "realistic_simulation",
                "note": "Realistic IMD weather simulation based on regional climate patterns"
            }
        )
        
        return [weather_point]
    
    async def get_available_stations(self, 
                                   city: Optional[str] = None, 
                                   state: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of available IMD weather stations.
        
        Args:
            city: Filter by city name
            state: Filter by state name
            
        Returns:
            List of station information dictionaries
        """
        stations = []
        
        for station_id, info in self.imd_stations.items():
            if city and info.get("city", "").lower() != city.lower():
                continue
            if state and info.get("state", "").lower() != state.lower():
                continue
                
            stations.append({
                "station_id": station_id,
                "name": info["name"],
                "city": info.get("city", ""),
                "state": info.get("state", ""),
                "latitude": info["lat"],
                "longitude": info["lon"],
                "parameters": ["temperature", "humidity", "wind_speed", "wind_direction", 
                             "pressure", "precipitation", "visibility"]
            })
        
        return stations
    
    async def get_station_status(self, station_id: str) -> Dict[str, Any]:
        """
        Get operational status of an IMD weather station.
        
        Args:
            station_id: IMD station identifier
            
        Returns:
            Dictionary with station status information
        """
        station_info = self.imd_stations.get(station_id)
        if not station_info:
            return {"status": "unknown", "message": "Station not found"}
        
        # Test connectivity by attempting to fetch weather data
        try:
            if self.api_key:
                weather_data = await self._fetch_current_weather(
                    station_info["lat"], 
                    station_info["lon"]
                )
                if weather_data:
                    status = "operational"
                    uptime = 95.0
                    data_quality = "real_time"
                else:
                    status = "degraded"
                    uptime = 70.0
                    data_quality = "simulated"
            else:
                status = "simulated"
                uptime = 100.0
                data_quality = "simulated"
                
        except Exception as e:
            logger.error(f"Failed to check IMD station {station_id} status: {e}")
            status = "degraded"
            uptime = 50.0
            data_quality = "simulated"
        
        return {
            "station_id": station_id,
            "station_name": station_info["name"],
            "city": station_info.get("city", ""),
            "state": station_info.get("state", ""),
            "status": status,
            "uptime_percentage": uptime,
            "last_updated": datetime.utcnow().isoformat(),
            "parameters_available": ["temperature", "humidity", "wind_speed", "wind_direction", 
                                   "pressure", "precipitation", "visibility"],
            "data_quality": data_quality,
            "coordinates": {"lat": station_info["lat"], "lon": station_info["lon"]}
        }
    
    async def fetch_data(self, **kwargs) -> List[DataPoint]:
        """
        Fetch data from IMD weather stations (compatibility method).
        
        This method provides compatibility with the abstract base class.
        For weather data, use fetch_weather_data() instead.
        
        Args:
            **kwargs: Keyword arguments passed to fetch_weather_data
            
        Returns:
            Empty list (weather data is returned as WeatherPoint objects)
        """
        logger.info("fetch_data called on IMDClient - use fetch_weather_data for weather data")
        return []
        """
        Fetch weather forecast data from IMD stations.
        
        Args:
            locations: List of (lat, lon) coordinates
            station_ids: List of IMD station IDs
            hours: Number of hours to forecast (max 120)
            
        Returns:
            List of forecast WeatherPoint objects
        """
        if not self.api_key:
            logger.warning("No OpenWeatherMap API key provided for IMD forecast data")
            return []
        
        # Determine locations to fetch forecasts for
        fetch_locations = []
        
        if station_ids:
            for station_id in station_ids:
                station_info = self.imd_stations.get(station_id)
                if station_info:
                    fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
        elif locations:
            for i, location in enumerate(locations):
                fetch_locations.append((location[0], location[1], f"CUSTOM_{i}"))
        else:
            # Default to major stations
            default_stations = ["DL_SAFDARJUNG", "MH_COLABA", "KA_HAL"]
            for station_id in default_stations:
                station_info = self.imd_stations[station_id]
                fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
        
        forecast_points = []
        
        for lat, lon, station_id in fetch_locations:
            try:
                location_forecasts = await self._fetch_location_forecast((lat, lon), station_id, hours)
                forecast_points.extend(location_forecasts)
            except Exception as e:
                logger.error(f"Failed to fetch IMD forecast for {station_id}: {e}")
                continue
        
        logger.info(f"Fetched {len(forecast_points)} forecast points from IMD stations")
        return forecast_points
    
    async def _fetch_location_forecast(self, 
                                     location: Tuple[float, float], 
                                     station_id: str,
                                     hours: int) -> List[WeatherPoint]:
        """Fetch forecast data for a specific IMD station location."""
        lat, lon = location
        
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }
            
            url = f"{self.base_url}/forecast"
            response_data = await self._make_request(url, params)
            
            if not response_data or "list" not in response_data:
                return []
            
            forecast_points = []
            station_info = self.imd_stations.get(station_id, {})
            
            for forecast_item in response_data["list"]:
                forecast_time = datetime.utcfromtimestamp(forecast_item.get("dt", 0))
                
                # Only include forecasts within the requested time range
                if forecast_time <= datetime.utcnow() + timedelta(hours=hours):
                    main = forecast_item.get("main", {})
                    wind = forecast_item.get("wind", {})
                    
                    weather_point = WeatherPoint(
                        timestamp=forecast_time,
                        location=location,
                        temperature=main.get("temp"),
                        humidity=main.get("humidity"),
                        wind_speed=wind.get("speed"),
                        wind_direction=wind.get("deg"),
                        pressure=main.get("pressure"),
                        precipitation=forecast_item.get("rain", {}).get("3h", 0.0),  # 3-hour precipitation
                        visibility=10.0,  # Default visibility for forecasts
                        source="imd_forecast",
                        metadata={
                            "station_id": station_id,
                            "station_name": station_info.get("name", "Unknown"),
                            "city": station_info.get("city", "Unknown"),
                            "state": station_info.get("state", "Unknown"),
                            "data_source": "openweathermap_forecast_via_imd",
                            "forecast_type": "5day_3hour",
                            "weather_description": forecast_item.get("weather", [{}])[0].get("description", ""),
                            "note": "IMD weather forecast via OpenWeatherMap API"
                        }
                    )
                    
                    forecast_points.append(weather_point)
            
            return forecast_points
            
        except Exception as e:
            logger.error(f"Failed to fetch forecast for IMD station {station_id}: {e}")
            return []
    
    async def fetch_forecast_data(self, 
                                locations: Optional[List[Tuple[float, float]]] = None,
                                station_ids: Optional[List[str]] = None,
                                hours: int = 48) -> List[WeatherPoint]:
        """
        Fetch weather forecast data from IMD stations.
        
        Args:
            locations: List of (lat, lon) coordinates
            station_ids: List of IMD station IDs
            hours: Number of hours to forecast (max 120)
            
        Returns:
            List of forecast WeatherPoint objects
        """
        if not self.api_key:
            logger.warning("No OpenWeatherMap API key provided for IMD forecast data")
            return []
        
        # Determine locations to fetch forecasts for
        fetch_locations = []
        
        if station_ids:
            for station_id in station_ids:
                station_info = self.imd_stations.get(station_id)
                if station_info:
                    fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
        elif locations:
            for i, location in enumerate(locations):
                fetch_locations.append((location[0], location[1], f"CUSTOM_{i}"))
        else:
            # Default to major stations
            default_stations = ["DL_SAFDARJUNG", "MH_COLABA", "KA_HAL"]
            for station_id in default_stations:
                station_info = self.imd_stations[station_id]
                fetch_locations.append((station_info["lat"], station_info["lon"], station_id))
        
        forecast_points = []
        
        for lat, lon, station_id in fetch_locations:
            try:
                location_forecasts = await self._fetch_location_forecast((lat, lon), station_id, hours)
                forecast_points.extend(location_forecasts)
            except Exception as e:
                logger.error(f"Failed to fetch IMD forecast for {station_id}: {e}")
                continue
        
        logger.info(f"Fetched {len(forecast_points)} forecast points from IMD stations")
        return forecast_points
    
    async def _fetch_location_forecast(self, 
                                     location: Tuple[float, float], 
                                     station_id: str,
                                     hours: int) -> List[WeatherPoint]:
        """Fetch forecast data for a specific IMD station location."""
        lat, lon = location
        
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }
            
            url = f"{self.base_url}/forecast"
            response_data = await self._make_request(url, params)
            
            if not response_data or "list" not in response_data:
                return []
            
            forecast_points = []
            station_info = self.imd_stations.get(station_id, {})
            
            for forecast_item in response_data["list"]:
                forecast_time = datetime.utcfromtimestamp(forecast_item.get("dt", 0))
                
                # Only include forecasts within the requested time range
                if forecast_time <= datetime.utcnow() + timedelta(hours=hours):
                    main = forecast_item.get("main", {})
                    wind = forecast_item.get("wind", {})
                    
                    weather_point = WeatherPoint(
                        timestamp=forecast_time,
                        location=location,
                        temperature=main.get("temp"),
                        humidity=main.get("humidity"),
                        wind_speed=wind.get("speed"),
                        wind_direction=wind.get("deg"),
                        pressure=main.get("pressure"),
                        precipitation=forecast_item.get("rain", {}).get("3h", 0.0),  # 3-hour precipitation
                        visibility=10.0,  # Default visibility for forecasts
                        source="imd_forecast",
                        metadata={
                            "station_id": station_id,
                            "station_name": station_info.get("name", "Unknown"),
                            "city": station_info.get("city", "Unknown"),
                            "state": station_info.get("state", "Unknown"),
                            "data_source": "openweathermap_forecast_via_imd",
                            "forecast_type": "5day_3hour",
                            "weather_description": forecast_item.get("weather", [{}])[0].get("description", ""),
                            "note": "IMD weather forecast via OpenWeatherMap API"
                        }
                    )
                    
                    forecast_points.append(weather_point)
            
            return forecast_points
            
        except Exception as e:
            logger.error(f"Failed to fetch forecast for IMD station {station_id}: {e}")
            return []
    
    async def fetch_data(self, **kwargs) -> List[DataPoint]:
        """
        Fetch data from IMD weather stations (compatibility method).
        
        This method provides compatibility with the abstract base class.
        For weather data, use fetch_weather_data() instead.
        
        Args:
            **kwargs: Keyword arguments passed to fetch_weather_data
            
        Returns:
            Empty list (weather data is returned as WeatherPoint objects)
        """
        logger.info("fetch_data called on IMDClient - use fetch_weather_data for weather data")
        return []


class OpenAQClient(DataIngestionClient):
    """Enhanced client for OpenAQ v3 API with Indian location support."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            api_key=api_key or os.getenv("OPENAQ_API_KEY"),
            base_url="https://api.openaq.org/v3"
        )
        self.india_country_id = 9  # Correct India country ID for v3 API
        self.indian_locations_cache = None
        self.cache_timestamp = None
        self.cache_duration = 3600  # Cache locations for 1 hour
    
    async def fetch_data(self, 
                        cities: Optional[List[str]] = None,
                        countries: Optional[List[str]] = None,
                        parameters: Optional[List[str]] = None,
                        start_time: Optional[datetime] = None,
                        end_time: Optional[datetime] = None,
                        limit: int = 1000) -> List[DataPoint]:
        """
        Fetch air quality data from OpenAQ v3 API.
        
        Args:
            cities: List of city names (will be mapped to Indian locations)
            countries: List of country codes (defaults to India)
            parameters: List of parameters to fetch
            start_time: Start time for data retrieval
            end_time: End time for data retrieval
            limit: Maximum number of measurements to fetch
            
        Returns:
            List of standardized DataPoint objects
        """
        if not self.api_key:
            logger.warning("No OpenAQ API key provided, using simulation")
            return await self._generate_simulation_data(cities or ["Delhi", "Mumbai", "Bangalore", "Chennai"])
        
        try:
            # Get Indian locations
            indian_locations = await self._get_indian_locations()
            if not indian_locations:
                logger.warning("No Indian locations found, using simulation")
                return await self._generate_simulation_data(cities or ["Delhi", "Mumbai", "Bangalore", "Chennai"])
            
            # Filter locations by requested cities if specified
            target_locations = indian_locations
            if cities:
                target_locations = self._filter_locations_by_cities(indian_locations, cities)
            
            # Fetch latest data from locations
            data_points = []
            for location in target_locations[:10]:  # Limit to 10 locations to avoid rate limits
                location_data = await self._fetch_location_latest_data(location)
                data_points.extend(location_data)
            
            if data_points:
                logger.info(f"Fetched {len(data_points)} real data points from OpenAQ v3")
                return data_points
            else:
                logger.info("No recent data from OpenAQ v3, using simulation")
                return await self._generate_simulation_data(cities or ["Delhi", "Mumbai", "Bangalore", "Chennai"])
            
        except Exception as e:
            logger.error(f"Failed to fetch data from OpenAQ v3: {e}")
            logger.info("Falling back to simulation data")
            return await self._generate_simulation_data(cities or ["Delhi", "Mumbai", "Bangalore", "Chennai"])
    
    async def _get_indian_locations(self) -> List[Dict[str, Any]]:
        """Get and cache Indian monitoring locations."""
        # Check cache
        if (self.indian_locations_cache and self.cache_timestamp and 
            (datetime.now() - self.cache_timestamp).seconds < self.cache_duration):
            return self.indian_locations_cache
        
        try:
            url = f"{self.base_url}/locations"
            params = {
                "limit": 1000,
                "countries": self.india_country_id
            }
            headers = {"X-API-Key": self.api_key} if self.api_key else {}
            
            response_data = await self._make_request(url, params, headers=headers)
            locations = response_data.get("results", [])
            
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
            
        except Exception as e:
            logger.error(f"Failed to fetch Indian locations: {e}")
            return []
    
    def _filter_locations_by_cities(self, locations: List[Dict[str, Any]], cities: List[str]) -> List[Dict[str, Any]]:
        """Filter locations by requested cities."""
        filtered_locations = []
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
        
        for location in locations:
            location_name = location.get("name", "").lower()
            for city in cities:
                city_lower = city.lower()
                keywords = city_keywords.get(city_lower, [city_lower])
                if any(keyword in location_name for keyword in keywords):
                    filtered_locations.append(location)
                    break
        
        return filtered_locations if filtered_locations else locations[:5]  # Return first 5 if no matches
    
    async def _fetch_location_latest_data(self, location: Dict[str, Any]) -> List[DataPoint]:
        """Fetch latest data for a specific location."""
        location_id = location.get("id")
        location_name = location.get("name", "Unknown")
        
        if not location_id:
            return []
        
        try:
            url = f"{self.base_url}/locations/{location_id}/latest"
            headers = {"X-API-Key": self.api_key} if self.api_key else {}
            
            response_data = await self._make_request(url, {}, headers=headers)
            measurements = response_data.get("results", [])
            
            data_points = []
            for measurement in measurements:
                try:
                    data_point = self._parse_openaq_v3_measurement(measurement, location)
                    if data_point:
                        data_points.append(data_point)
                except Exception as e:
                    logger.warning(f"Failed to parse measurement from {location_name}: {e}")
                    continue
            
            if data_points:
                logger.info(f"Fetched {len(data_points)} measurements from {location_name}")
            
            return data_points
            
        except Exception as e:
            logger.warning(f"Failed to fetch data from location {location_name}: {e}")
            return []
    
    def _parse_openaq_v3_measurement(self, measurement: Dict[str, Any], location: Dict[str, Any]) -> Optional[DataPoint]:
        """Parse OpenAQ v3 measurement into standardized DataPoint."""
        try:
            # Get coordinates from location data
            coordinates = location.get("coordinates", {})
            if not coordinates:
                return None
            
            # Parse datetime
            datetime_info = measurement.get("datetime", {})
            if isinstance(datetime_info, dict):
                timestamp_str = datetime_info.get("utc")
            else:
                timestamp_str = datetime_info
            
            if not timestamp_str:
                return None
            
            # Parse timestamp
            if timestamp_str.endswith("Z"):
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
            
            # Get sensor information to determine parameter
            sensors_id = measurement.get("sensorsId")
            parameter = "unknown"
            unit = "µg/m³"
            
            # Try to match sensor ID to parameter from location sensors
            sensors = location.get("sensors", [])
            for sensor in sensors:
                if sensor.get("id") == sensors_id:
                    param_info = sensor.get("parameter", {})
                    parameter = param_info.get("name", "unknown")
                    unit = param_info.get("units", "µg/m³")
                    break
            
            return DataPoint(
                timestamp=timestamp,
                location=(coordinates["latitude"], coordinates["longitude"]),
                parameter=parameter,
                value=float(measurement["value"]),
                unit=unit,
                source="openaq_v3",
                station_id=str(location.get("id", "")),
                metadata={
                    "location_name": location.get("name", ""),
                    "provider": location.get("provider", {}).get("name", ""),
                    "owner": location.get("owner", {}).get("name", ""),
                    "sensors_id": sensors_id,
                    "timezone": location.get("timezone", "")
                }
            )
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(f"Failed to parse OpenAQ v3 measurement: {e}")
            return None
    
    async def _generate_simulation_data(self, cities: List[str]) -> List[DataPoint]:
        """Generate realistic simulation data when API fails."""
        data_points = []
        parameters = ["pm25", "pm10", "no2", "so2", "o3", "co"]
        
        # City coordinates
        city_coords = {
            "Delhi": (28.6139, 77.2090),
            "Mumbai": (19.0760, 72.8777),
            "Bangalore": (12.9716, 77.5946),
            "Chennai": (13.0827, 80.2707),
            "Kolkata": (22.5726, 88.3639),
            "Hyderabad": (17.3850, 78.4867),
            "Pune": (18.5204, 73.8567),
            "Ahmedabad": (23.0225, 72.5714)
        }
        
        current_time = datetime.now(timezone.utc)
        
        for city in cities:
            coords = city_coords.get(city, (28.6139, 77.2090))  # Default to Delhi
            
            for parameter in parameters:
                # Generate realistic values based on parameter and city
                base_values = {
                    "pm25": {"Delhi": 85, "Mumbai": 65, "Bangalore": 45, "Chennai": 55, "Kolkata": 75},
                    "pm10": {"Delhi": 150, "Mumbai": 120, "Bangalore": 80, "Chennai": 100, "Kolkata": 130},
                    "no2": {"Delhi": 45, "Mumbai": 40, "Bangalore": 25, "Chennai": 30, "Kolkata": 35},
                    "so2": {"Delhi": 15, "Mumbai": 12, "Bangalore": 8, "Chennai": 10, "Kolkata": 13},
                    "o3": {"Delhi": 35, "Mumbai": 30, "Bangalore": 25, "Chennai": 28, "Kolkata": 32},
                    "co": {"Delhi": 1.2, "Mumbai": 1.0, "Bangalore": 0.8, "Chennai": 0.9, "Kolkata": 1.1}
                }
                
                base_value = base_values.get(parameter, {}).get(city, base_values.get(parameter, {}).get("Delhi", 50))
                
                # Add some realistic variation
                import random
                variation = random.uniform(0.8, 1.2)
                value = base_value * variation
                
                data_point = DataPoint(
                    timestamp=current_time,
                    location=coords,
                    parameter=parameter,
                    value=value,
                    unit="µg/m³" if parameter in ["pm25", "pm10", "no2", "so2", "o3"] else "mg/m³",
                    source="openaq_v3_simulation",
                    station_id=f"SIM_{city}_{parameter}",
                    metadata={
                        "location_name": f"{city} Simulation Station",
                        "provider": "AQI Predictor Simulation",
                        "simulation_reason": "OpenAQ v3 API unavailable or no recent data"
                    }
                )
                data_points.append(data_point)
        
        logger.info(f"Generated {len(data_points)} simulation data points for OpenAQ")
        return data_points


@dataclass
class TrafficPoint:
    """Standardized traffic data point structure."""
    timestamp: datetime
    location: Tuple[float, float]  # (lat, lon)
    traffic_density: float  # 0-1 scale
    average_speed: Optional[float] = None  # km/h
    congestion_level: str = "unknown"  # free_flow, light, moderate, heavy, severe
    vehicle_count_estimate: Optional[int] = None
    road_type: str = "unknown"  # highway, arterial, local
    source: str = "google_maps"
    metadata: Optional[Dict[str, Any]] = None


class GoogleMapsClient(DataIngestionClient):
    """Client for Google Maps traffic and mobility data."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            api_key=api_key or os.getenv("GOOGLE_MAPS_API_KEY"),
            base_url="https://maps.googleapis.com/maps/api"
        )
        
        # Delhi-NCR major roads and highways for traffic monitoring
        self.traffic_monitoring_points = {
            # Major highways
            "NH1_Delhi_Gurgaon": {"lat": 28.4595, "lon": 77.0266, "road_type": "highway", "name": "NH-1 Delhi-Gurgaon"},
            "NH24_Delhi_Noida": {"lat": 28.6304, "lon": 77.2773, "road_type": "highway", "name": "NH-24 Delhi-Noida"},
            "NH8_Delhi_Jaipur": {"lat": 28.5355, "lon": 77.0688, "road_type": "highway", "name": "NH-8 Delhi-Jaipur"},
            "Eastern_Peripheral": {"lat": 28.6692, "lon": 77.4538, "road_type": "highway", "name": "Eastern Peripheral Expressway"},
            "Western_Peripheral": {"lat": 28.4817, "lon": 76.9377, "road_type": "highway", "name": "Western Peripheral Expressway"},
            
            # Major arterial roads in Delhi
            "Ring_Road_South": {"lat": 28.5672, "lon": 77.2088, "road_type": "arterial", "name": "Ring Road South Delhi"},
            "Ring_Road_North": {"lat": 28.6692, "lon": 77.2311, "road_type": "arterial", "name": "Ring Road North Delhi"},
            "Outer_Ring_Road": {"lat": 28.6515, "lon": 77.1115, "road_type": "arterial", "name": "Outer Ring Road"},
            "Inner_Ring_Road": {"lat": 28.6139, "lon": 77.2090, "road_type": "arterial", "name": "Inner Ring Road"},
            
            # Major intersections and traffic hotspots
            "ITO_Junction": {"lat": 28.6289, "lon": 77.2426, "road_type": "intersection", "name": "ITO Junction"},
            "AIIMS_Flyover": {"lat": 28.5672, "lon": 77.2088, "road_type": "intersection", "name": "AIIMS Flyover"},
            "Dhaula_Kuan": {"lat": 28.5985, "lon": 77.1847, "road_type": "intersection", "name": "Dhaula Kuan"},
            "Anand_Vihar_ISBT": {"lat": 28.6469, "lon": 77.3162, "road_type": "intersection", "name": "Anand Vihar ISBT"},
            
            # NCR connections
            "DND_Flyway": {"lat": 28.5706, "lon": 77.2496, "road_type": "highway", "name": "DND Flyway"},
            "Ghaziabad_Border": {"lat": 28.6692, "lon": 77.4538, "road_type": "arterial", "name": "Delhi-Ghaziabad Border"},
            "Faridabad_Border": {"lat": 28.4089, "lon": 77.3178, "road_type": "arterial", "name": "Delhi-Faridabad Border"},
        }
    
    async def fetch_traffic_data(self, 
                               locations: Optional[List[Tuple[float, float]]] = None,
                               radius: float = 5000,
                               include_monitoring_points: bool = True) -> List[TrafficPoint]:
        """
        Fetch traffic data from Google Maps APIs.
        
        Args:
            locations: List of (lat, lon) coordinates to check traffic for
            radius: Radius in meters for traffic data collection
            include_monitoring_points: Whether to include predefined monitoring points
            
        Returns:
            List of standardized TrafficPoint objects
        """
        if not self.api_key:
            logger.warning("No Google Maps API key provided, using realistic simulation")
            return await self._generate_realistic_traffic_data(locations)
        
        traffic_points = []
        
        # Use provided locations or default monitoring points
        check_locations = []
        
        if locations:
            check_locations.extend([(lat, lon, "custom", f"Custom_{i}") 
                                  for i, (lat, lon) in enumerate(locations)])
        
        if include_monitoring_points:
            check_locations.extend([
                (point["lat"], point["lon"], point["road_type"], point["name"])
                for point in self.traffic_monitoring_points.values()
            ])
        
        # Fetch traffic data for each location
        for lat, lon, road_type, name in check_locations:
            try:
                location_traffic = await self._fetch_location_traffic(
                    (lat, lon), radius, road_type, name
                )
                if location_traffic:
                    traffic_points.extend(location_traffic)
            except Exception as e:
                logger.error(f"Failed to fetch traffic data for {name} at ({lat}, {lon}): {e}")
                continue
        
        logger.info(f"Fetched {len(traffic_points)} traffic data points from Google Maps")
        return traffic_points
    
    async def _fetch_location_traffic(self, 
                                    location: Tuple[float, float], 
                                    radius: float,
                                    road_type: str = "unknown",
                                    location_name: str = "Unknown") -> List[TrafficPoint]:
        """Fetch traffic data for a specific location using Google Maps APIs."""
        lat, lon = location
        
        try:
            # Method 1: Try Google Maps Roads API for traffic data
            roads_traffic = await self._fetch_roads_api_traffic(lat, lon, radius)
            if roads_traffic:
                return roads_traffic
            
            # Method 2: Try Distance Matrix API with traffic model
            matrix_traffic = await self._fetch_distance_matrix_traffic(lat, lon, radius)
            if matrix_traffic:
                return matrix_traffic
            
            # Method 3: Try Places API to get nearby traffic-generating locations
            places_traffic = await self._fetch_places_based_traffic(lat, lon, radius, road_type)
            if places_traffic:
                return places_traffic
            
            # Fallback to realistic simulation
            logger.info(f"No real traffic data available for {location_name}, using simulation")
            return await self._generate_location_traffic_simulation(location, road_type, location_name)
            
        except Exception as e:
            logger.error(f"Error fetching traffic data for {location_name}: {e}")
            return await self._generate_location_traffic_simulation(location, road_type, location_name)
    
    async def _fetch_roads_api_traffic(self, lat: float, lon: float, radius: float) -> Optional[List[TrafficPoint]]:
        """
        Fetch traffic data using Google Maps Roads API.
        Note: This requires special access and may not be available for all users.
        """
        try:
            # Roads API endpoint for traffic data
            url = f"{self.base_url}/roads/v1/speedLimits"
            
            # Create a path around the location
            path_points = [
                f"{lat},{lon}",
                f"{lat + 0.001},{lon}",
                f"{lat},{lon + 0.001}",
                f"{lat - 0.001},{lon}",
                f"{lat},{lon - 0.001}"
            ]
            
            params = {
                "path": "|".join(path_points),
                "key": self.api_key
            }
            
            response_data = await self._make_request(url, params)
            
            if response_data and "speedLimits" in response_data:
                # Process Roads API response
                traffic_points = []
                for speed_limit in response_data["speedLimits"]:
                    # Extract traffic information from speed limit data
                    traffic_point = TrafficPoint(
                        timestamp=datetime.utcnow(),
                        location=(lat, lon),
                        traffic_density=0.5,  # Default, would need additional API calls
                        average_speed=speed_limit.get("speedLimit", 50) * 0.8,  # Assume 80% of speed limit
                        congestion_level="moderate",
                        road_type="arterial",
                        source="google_roads_api",
                        metadata={
                            "speed_limit": speed_limit.get("speedLimit"),
                            "place_id": speed_limit.get("placeId"),
                            "api_method": "roads_api"
                        }
                    )
                    traffic_points.append(traffic_point)
                
                return traffic_points
            
            return None
            
        except Exception as e:
            logger.debug(f"Roads API not available or failed: {e}")
            return None
    
    async def _fetch_distance_matrix_traffic(self, lat: float, lon: float, radius: float) -> Optional[List[TrafficPoint]]:
        """
        Fetch traffic data using Google Maps Distance Matrix API with traffic model.
        This provides travel time with and without traffic.
        """
        try:
            # Distance Matrix API endpoint
            url = f"{self.base_url}/distancematrix/json"
            
            # Create origin and destination points around the location
            origin = f"{lat},{lon}"
            destinations = [
                f"{lat + 0.01},{lon}",      # North
                f"{lat},{lon + 0.01}",      # East  
                f"{lat - 0.01},{lon}",      # South
                f"{lat},{lon - 0.01}",      # West
            ]
            
            params = {
                "origins": origin,
                "destinations": "|".join(destinations),
                "departure_time": "now",
                "traffic_model": "best_guess",
                "key": self.api_key
            }
            
            response_data = await self._make_request(url, params)
            
            if response_data and response_data.get("status") == "OK":
                rows = response_data.get("rows", [])
                if rows and rows[0].get("elements"):
                    elements = rows[0]["elements"]
                    
                    # Calculate traffic metrics from travel times
                    traffic_points = []
                    for i, element in enumerate(elements):
                        if element.get("status") == "OK":
                            duration = element.get("duration", {}).get("value", 0)  # seconds
                            duration_in_traffic = element.get("duration_in_traffic", {}).get("value", duration)
                            
                            # Calculate traffic density based on delay
                            if duration > 0:
                                delay_ratio = duration_in_traffic / duration
                                traffic_density = min(1.0, max(0.0, (delay_ratio - 1.0) * 2))
                                
                                # Estimate congestion level
                                if delay_ratio < 1.1:
                                    congestion_level = "free_flow"
                                elif delay_ratio < 1.3:
                                    congestion_level = "light"
                                elif delay_ratio < 1.6:
                                    congestion_level = "moderate"
                                elif delay_ratio < 2.0:
                                    congestion_level = "heavy"
                                else:
                                    congestion_level = "severe"
                                
                                # Estimate average speed (assuming 10km distance)
                                distance_km = 10.0
                                average_speed = (distance_km / (duration_in_traffic / 3600)) if duration_in_traffic > 0 else 50
                                
                                traffic_point = TrafficPoint(
                                    timestamp=datetime.utcnow(),
                                    location=(lat, lon),
                                    traffic_density=traffic_density,
                                    average_speed=average_speed,
                                    congestion_level=congestion_level,
                                    source="google_distance_matrix",
                                    metadata={
                                        "direction": ["north", "east", "south", "west"][i],
                                        "duration_normal": duration,
                                        "duration_in_traffic": duration_in_traffic,
                                        "delay_ratio": delay_ratio,
                                        "api_method": "distance_matrix"
                                    }
                                )
                                traffic_points.append(traffic_point)
                    
                    if traffic_points:
                        # Return average traffic conditions
                        avg_density = sum(tp.traffic_density for tp in traffic_points) / len(traffic_points)
                        avg_speed = sum(tp.average_speed for tp in traffic_points) / len(traffic_points)
                        
                        # Determine overall congestion level
                        congestion_counts = {}
                        for tp in traffic_points:
                            congestion_counts[tp.congestion_level] = congestion_counts.get(tp.congestion_level, 0) + 1
                        overall_congestion = max(congestion_counts, key=congestion_counts.get)
                        
                        return [TrafficPoint(
                            timestamp=datetime.utcnow(),
                            location=(lat, lon),
                            traffic_density=avg_density,
                            average_speed=avg_speed,
                            congestion_level=overall_congestion,
                            source="google_distance_matrix_avg",
                            metadata={
                                "sample_directions": len(traffic_points),
                                "api_method": "distance_matrix_average",
                                "individual_measurements": [tp.metadata for tp in traffic_points]
                            }
                        )]
            
            return None
            
        except Exception as e:
            logger.debug(f"Distance Matrix API failed: {e}")
            return None
    
    async def _fetch_places_based_traffic(self, lat: float, lon: float, radius: float, road_type: str) -> Optional[List[TrafficPoint]]:
        """
        Estimate traffic based on nearby places that generate traffic.
        Uses Google Places API to find traffic-generating locations.
        """
        try:
            # Places API endpoint
            url = f"{self.base_url}/place/nearbysearch/json"
            
            # Types of places that generate significant traffic
            traffic_generating_types = [
                "shopping_mall", "hospital", "school", "university", 
                "subway_station", "bus_station", "airport", "parking",
                "gas_station", "restaurant", "tourist_attraction"
            ]
            
            all_places = []
            
            # Search for each type of traffic-generating place
            for place_type in traffic_generating_types[:3]:  # Limit to avoid API quota issues
                try:
                    params = {
                        "location": f"{lat},{lon}",
                        "radius": min(radius, 5000),  # Max 5km radius
                        "type": place_type,
                        "key": self.api_key
                    }
                    
                    response_data = await self._make_request(url, params)
                    
                    if response_data and response_data.get("status") == "OK":
                        places = response_data.get("results", [])
                        all_places.extend(places)
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.debug(f"Places API request failed for {place_type}: {e}")
                    continue
            
            if all_places:
                # Calculate traffic density based on nearby places
                traffic_score = 0
                place_weights = {
                    "shopping_mall": 0.8,
                    "hospital": 0.6,
                    "school": 0.7,
                    "university": 0.7,
                    "subway_station": 0.9,
                    "bus_station": 0.8,
                    "airport": 1.0,
                    "parking": 0.5,
                    "gas_station": 0.4,
                    "restaurant": 0.3,
                    "tourist_attraction": 0.5
                }
                
                for place in all_places:
                    place_types = place.get("types", [])
                    rating = place.get("rating", 3.0)
                    
                    # Calculate place contribution to traffic
                    place_score = 0
                    for place_type in place_types:
                        if place_type in place_weights:
                            place_score = max(place_score, place_weights[place_type])
                    
                    # Weight by rating and proximity
                    place_location = place.get("geometry", {}).get("location", {})
                    if place_location:
                        place_lat = place_location.get("lat", lat)
                        place_lon = place_location.get("lng", lon)
                        
                        # Calculate distance
                        distance = ((lat - place_lat) ** 2 + (lon - place_lon) ** 2) ** 0.5
                        distance_factor = max(0.1, 1.0 - (distance / 0.05))  # Normalize to ~5km
                        
                        traffic_score += place_score * (rating / 5.0) * distance_factor
                
                # Normalize traffic score to 0-1 scale
                traffic_density = min(1.0, traffic_score / 10.0)
                
                # Determine congestion level and speed
                if traffic_density < 0.2:
                    congestion_level = "free_flow"
                    avg_speed = 60
                elif traffic_density < 0.4:
                    congestion_level = "light"
                    avg_speed = 45
                elif traffic_density < 0.6:
                    congestion_level = "moderate"
                    avg_speed = 30
                elif traffic_density < 0.8:
                    congestion_level = "heavy"
                    avg_speed = 20
                else:
                    congestion_level = "severe"
                    avg_speed = 10
                
                # Adjust speed based on road type
                road_speed_factors = {
                    "highway": 1.5,
                    "arterial": 1.0,
                    "local": 0.7,
                    "intersection": 0.5
                }
                avg_speed *= road_speed_factors.get(road_type, 1.0)
                
                return [TrafficPoint(
                    timestamp=datetime.utcnow(),
                    location=(lat, lon),
                    traffic_density=traffic_density,
                    average_speed=avg_speed,
                    congestion_level=congestion_level,
                    road_type=road_type,
                    source="google_places_based",
                    metadata={
                        "nearby_places_count": len(all_places),
                        "traffic_score": traffic_score,
                        "api_method": "places_based_estimation",
                        "place_types_found": list(set([t for p in all_places for t in p.get("types", [])]))
                    }
                )]
            
            return None
            
        except Exception as e:
            logger.debug(f"Places-based traffic estimation failed: {e}")
            return None
    
    async def fetch_places_data(self, 
                              location: Tuple[float, float],
                              place_types: List[str] = None,
                              radius: float = 5000) -> List[Dict[str, Any]]:
        """
        Fetch nearby places data that might affect air quality.
        
        Args:
            location: (lat, lon) coordinates
            place_types: Types of places to search for
            radius: Search radius in meters
            
        Returns:
            List of places data
        """
        if not place_types:
            place_types = ["gas_station", "parking", "subway_station", "bus_station"]
        
        # Mock implementation
        mock_places = [
            {
                "place_id": "mock_place_1",
                "name": "Industrial Area",
                "type": "industrial",
                "location": {"lat": location[0] + 0.01, "lon": location[1] + 0.01},
                "distance": 1200,
                "emission_potential": "high"
            },
            {
                "place_id": "mock_place_2", 
                "name": "Metro Station",
                "type": "subway_station",
                "location": {"lat": location[0] - 0.005, "lon": location[1] + 0.005},
                "distance": 800,
                "emission_potential": "medium"
            }
        ]
        
        return mock_places
    
    async def _generate_realistic_traffic_data(self, locations: List[Tuple[float, float]]) -> List[TrafficPoint]:
        """
        Generate realistic traffic data when API is not available.
        
        Args:
            locations: List of (lat, lon) coordinates
            
        Returns:
            List of simulated TrafficPoint objects
        """
        if not locations:
            # Use default monitoring points
            locations = [(point["lat"], point["lon"]) for point in self.traffic_monitoring_points.values()]
        
        traffic_points = []
        
        for lat, lon in locations:
            # Find nearest monitoring point to get road type
            road_type = "arterial"  # Default
            location_name = f"Location_{lat:.4f}_{lon:.4f}"
            
            # Check if this is near a monitoring point
            for point_id, point_data in self.traffic_monitoring_points.items():
                distance = ((lat - point_data["lat"]) ** 2 + (lon - point_data["lon"]) ** 2) ** 0.5
                if distance < 0.01:  # Within ~1km
                    road_type = point_data["road_type"]
                    location_name = point_data["name"]
                    break
            
            # Generate realistic traffic point
            traffic_point = await self._generate_location_traffic_simulation(
                (lat, lon), road_type, location_name
            )
            if traffic_point:
                traffic_points.extend(traffic_point)
        
        return traffic_points
    
    async def _generate_location_traffic_simulation(self, 
                                                   location: Tuple[float, float],
                                                   road_type: str = "arterial",
                                                   location_name: str = "Unknown") -> List[TrafficPoint]:
        """
        Generate realistic traffic simulation for a specific location.
        
        Args:
            location: (lat, lon) coordinates
            road_type: Type of road (highway, arterial, local, intersection)
            location_name: Name of the location
            
        Returns:
            List with single TrafficPoint object
        """
        import random
        import math
        
        # Get current time for time-based simulation
        current_time = datetime.utcnow()
        hour = current_time.hour
        day_of_week = current_time.weekday()  # 0=Monday, 6=Sunday
        
        # Base traffic density by road type
        base_density = {
            "highway": 0.6,
            "arterial": 0.5,
            "local": 0.3,
            "intersection": 0.7,
            "unknown": 0.4
        }.get(road_type, 0.4)
        
        # Time-based multiplier (rush hours have higher traffic)
        time_multiplier = 1.0
        if 7 <= hour <= 10 or 18 <= hour <= 21:  # Rush hours
            time_multiplier = 1.6
        elif 11 <= hour <= 17:  # Daytime
            time_multiplier = 1.2
        elif 22 <= hour <= 6:  # Night
            time_multiplier = 0.4
        
        # Weekend adjustment (less traffic on weekends)
        weekend_multiplier = 0.7 if day_of_week >= 5 else 1.0
        
        # Calculate traffic density
        traffic_density = min(1.0, base_density * time_multiplier * weekend_multiplier * random.uniform(0.8, 1.2))
        
        # Determine congestion level based on density
        if traffic_density < 0.2:
            congestion_level = "free_flow"
            base_speed = 60
        elif traffic_density < 0.4:
            congestion_level = "light"
            base_speed = 50
        elif traffic_density < 0.6:
            congestion_level = "moderate"
            base_speed = 35
        elif traffic_density < 0.8:
            congestion_level = "heavy"
            base_speed = 20
        else:
            congestion_level = "severe"
            base_speed = 10
        
        # Adjust speed based on road type
        road_speed_factors = {
            "highway": 1.5,
            "arterial": 1.0,
            "local": 0.7,
            "intersection": 0.5,
            "unknown": 1.0
        }
        average_speed = base_speed * road_speed_factors.get(road_type, 1.0) * random.uniform(0.9, 1.1)
        
        # Estimate vehicle count based on density and road type
        road_capacity = {
            "highway": 2000,
            "arterial": 1500,
            "local": 500,
            "intersection": 1000,
            "unknown": 1000
        }
        vehicle_count = int(road_capacity.get(road_type, 1000) * traffic_density * random.uniform(0.8, 1.2))
        
        traffic_point = TrafficPoint(
            timestamp=current_time,
            location=location,
            traffic_density=round(traffic_density, 3),
            average_speed=round(average_speed, 1),
            congestion_level=congestion_level,
            vehicle_count_estimate=vehicle_count,
            road_type=road_type,
            source="google_maps_simulated",
            metadata={
                "location_name": location_name,
                "simulation_method": "time_based_realistic",
                "hour": hour,
                "day_of_week": day_of_week,
                "is_rush_hour": 7 <= hour <= 10 or 18 <= hour <= 21,
                "is_weekend": day_of_week >= 5,
                "note": "Realistic traffic simulation based on time patterns"
            }
        )
        
        return [traffic_point]
    
    async def fetch_data(self, **kwargs) -> List[DataPoint]:
        """
        Fetch data from Google Maps (compatibility method).
        
        This method provides compatibility with the abstract base class.
        For traffic data, use fetch_traffic_data() instead.
        
        Args:
            **kwargs: Keyword arguments (locations, etc.)
            
        Returns:
            Empty list (traffic data is returned as dictionaries, not DataPoint objects)
        """
        logger.info("fetch_data called on GoogleMapsClient - use fetch_traffic_data for traffic data")
        return []


class DataIngestionOrchestrator:
    """Orchestrates data ingestion from multiple sources."""
    
    def __init__(self):
        self.clients = {}
        # Satellite clients are managed separately due to different data structures
        self.satellite_clients = {
            "tropomi": None,  # Will be imported when needed
            "viirs": None     # Will be imported when needed
        }
    
    async def initialize_clients(self):
        """Initialize all data ingestion clients."""
        self.clients = {
            "cpcb": CPCBClient(),
            "imd": IMDClient(),
            "openaq": OpenAQClient(),
            "google_maps": GoogleMapsClient()
        }
        
        # Initialize satellite clients if available
        try:
            from .satellite_client import TROPOMIClient, VIIRSClient
            self.satellite_clients["tropomi"] = TROPOMIClient()
            self.satellite_clients["viirs"] = VIIRSClient()
            logger.info("Satellite data clients initialized")
        except ImportError as e:
            logger.warning(f"Satellite data clients not available: {e}")
    
    async def ingest_all_sources(self, 
                               locations: List[Tuple[float, float]] = None,
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None) -> Dict[str, List]:
        """
        Ingest data from all available ground-based sources.
        
        Args:
            locations: List of (lat, lon) coordinates
            start_time: Start time for data retrieval
            end_time: End time for data retrieval
            
        Returns:
            Dictionary with data from all sources
        """
        if not locations:
            # Default Delhi area locations
            locations = [
                (28.6139, 77.2090),  # Central Delhi
                (28.7041, 77.1025),  # North Delhi
                (28.5355, 77.3910),  # East Delhi
                (28.5706, 77.0688),  # South Delhi
            ]
        
        results = {
            "air_quality": [],
            "weather": [],
            "traffic": []
        }
        
        # Ingest air quality data
        try:
            async with self.clients["cpcb"] as cpcb_client:
                cpcb_data = await cpcb_client.fetch_data(
                    start_time=start_time, 
                    end_time=end_time
                )
                results["air_quality"].extend(cpcb_data)
        except Exception as e:
            logger.error(f"CPCB ingestion failed: {e}")
        
        try:
            async with self.clients["openaq"] as openaq_client:
                openaq_data = await openaq_client.fetch_data(
                    start_time=start_time,
                    end_time=end_time
                )
                results["air_quality"].extend(openaq_data)
        except Exception as e:
            logger.error(f"OpenAQ ingestion failed: {e}")
        
        # Ingest weather data
        try:
            async with self.clients["imd"] as imd_client:
                # Use IMD stations for weather data
                weather_data = await imd_client.fetch_weather_data(
                    locations=locations,
                    start_time=start_time,
                    end_time=end_time
                )
                results["weather"].extend(weather_data)
                
                # Also fetch forecast data for better ML model input
                forecast_data = await imd_client.fetch_forecast_data(
                    locations=locations,
                    hours=24  # 24-hour forecast
                )
                # Add forecast data with a different source identifier
                for forecast_point in forecast_data:
                    forecast_point.source = "imd_forecast"
                    results["weather"].append(forecast_point)
                    
        except Exception as e:
            logger.error(f"IMD weather ingestion failed: {e}")
            
            # Fallback to OpenWeatherMap if IMD fails
            try:
                from ..data.weather_client import get_weather_client
                weather_client = get_weather_client()
                
                # Get weather for major cities as fallback
                cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"]
                for city in cities:
                    try:
                        weather_features = weather_client.get_weather_features(city)
                        city_info = {"Delhi": (28.6139, 77.2090), "Mumbai": (19.0760, 72.8777),
                                   "Bangalore": (12.9716, 77.5946), "Chennai": (13.0827, 80.2707),
                                   "Kolkata": (22.5726, 88.3639)}.get(city, (28.6139, 77.2090))
                        
                        fallback_weather = WeatherPoint(
                            timestamp=datetime.utcnow(),
                            location=city_info,
                            temperature=weather_features.get("temperature"),
                            humidity=weather_features.get("humidity"),
                            wind_speed=weather_features.get("wind_speed"),
                            wind_direction=0.0,  # Not available in weather_features
                            pressure=weather_features.get("pressure"),
                            precipitation=0.0,  # Not available in weather_features
                            visibility=weather_features.get("visibility"),
                            source="openweather_fallback",
                            metadata={"city": city, "note": "Fallback weather data from OpenWeatherMap"}
                        )
                        results["weather"].append(fallback_weather)
                    except Exception as city_error:
                        logger.error(f"Failed to get fallback weather for {city}: {city_error}")
                        
            except Exception as fallback_error:
                logger.error(f"Weather fallback also failed: {fallback_error}")
        
        # Ingest traffic data
        try:
            async with self.clients["google_maps"] as maps_client:
                traffic_data = await maps_client.fetch_traffic_data(locations=locations)
                results["traffic"].extend(traffic_data)
        except Exception as e:
            logger.error(f"Google Maps traffic ingestion failed: {e}")
        
        logger.info(f"Ground-based ingestion completed: {len(results['air_quality'])} AQ points, "
                   f"{len(results['weather'])} weather points, "
                   f"{len(results['traffic'])} traffic points")
        
        return results
    
    async def ingest_all_sources_with_satellite(self, 
                                              locations: List[Tuple[float, float]] = None,
                                              bbox: Dict[str, float] = None,
                                              start_time: Optional[datetime] = None,
                                              end_time: Optional[datetime] = None) -> Dict[str, List]:
        """
        Ingest data from all sources including satellite data.
        
        Args:
            locations: List of (lat, lon) coordinates for ground-based sources
            bbox: Bounding box for satellite data retrieval
            start_time: Start time for data retrieval
            end_time: End time for data retrieval
            
        Returns:
            Dictionary with data from all sources including satellite
        """
        # Get ground-based data
        ground_results = await self.ingest_all_sources(locations, start_time, end_time)
        
        # Get satellite data if clients are available
        satellite_results = {
            "tropomi": [],
            "viirs": []
        }
        
        if self.satellite_clients["tropomi"] and self.satellite_clients["viirs"]:
            try:
                from .satellite_client import SatelliteDataOrchestrator
                satellite_orchestrator = SatelliteDataOrchestrator()
                satellite_data = await satellite_orchestrator.ingest_all_satellite_sources(
                    bbox=bbox,
                    start_time=start_time,
                    end_time=end_time
                )
                satellite_results.update(satellite_data)
            except Exception as e:
                logger.error(f"Satellite data ingestion failed: {e}")
        
        # Combine results
        combined_results = {
            **ground_results,
            "satellite": satellite_results
        }
        
        logger.info(f"Combined ingestion completed: {len(ground_results['air_quality'])} ground AQ points, "
                   f"{len(satellite_results.get('tropomi', []))} TROPOMI points, "
                   f"{len(satellite_results.get('viirs', []))} VIIRS points")
        
        return combined_results