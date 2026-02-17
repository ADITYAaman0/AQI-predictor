"""
City Detection Service - Detect city from coordinates or location
Provides city detection and location services for multi-city support
"""

import logging
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_GeomFromText, ST_Contains

from src.api.models import CityConfiguration, MonitoringStation
from src.utils.location_parser import LocationInfo, LocationParser

logger = logging.getLogger(__name__)


@dataclass
class CityInfo:
    """City information with configuration"""
    city_code: str
    city_name: str
    state: Optional[str]
    country: str
    latitude: float
    longitude: float
    is_active: bool
    priority: int
    model_config: Optional[Dict]
    data_sources: Optional[Dict]
    alert_thresholds: Optional[Dict]


class CityDetector:
    """Detect and manage city information"""
    
    def __init__(self, db: Session):
        self.db = db
        self._city_cache: Optional[Dict[str, CityInfo]] = None
    
    def detect_city_from_coordinates(
        self, 
        latitude: float, 
        longitude: float,
        max_distance_km: float = 50.0
    ) -> Optional[CityInfo]:
        """
        Detect city from coordinates
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            max_distance_km: Maximum distance to search for city (default 50km)
            
        Returns:
            CityInfo if city found within distance, None otherwise
        """
        try:
            # Create point geometry
            point = f"POINT({longitude} {latitude})"
            
            # First try: Check if point is within any city's bounding box
            stmt = select(CityConfiguration).where(
                CityConfiguration.is_active == True,
                CityConfiguration.bounding_box.isnot(None),
                ST_Contains(
                    CityConfiguration.bounding_box,
                    ST_GeomFromText(point, 4326)
                )
            ).order_by(CityConfiguration.priority.desc())
            
            result = self.db.execute(stmt).first()
            if result:
                return self._city_config_to_info(result[0])
            
            # Second try: Find nearest city center within max_distance
            distance_meters = max_distance_km * 1000
            stmt = select(
                CityConfiguration,
                ST_Distance(
                    CityConfiguration.center_location,
                    ST_GeomFromText(point, 4326),
                    True  # Use spheroid for accurate distance
                ).label('distance')
            ).where(
                CityConfiguration.is_active == True,
                ST_DWithin(
                    CityConfiguration.center_location,
                    ST_GeomFromText(point, 4326),
                    distance_meters,
                    True  # Use spheroid
                )
            ).order_by('distance').limit(1)
            
            result = self.db.execute(stmt).first()
            if result:
                return self._city_config_to_info(result[0])
            
            logger.warning(f"No city found for coordinates ({latitude}, {longitude})")
            return None
            
        except Exception as e:
            logger.error(f"Error detecting city from coordinates: {e}")
            return None
    
    def detect_city_from_location(self, location_input: str) -> Optional[CityInfo]:
        """
        Detect city from location string
        
        Args:
            location_input: Location string (city name, coordinates, or address)
            
        Returns:
            CityInfo if city detected, None otherwise
        """
        try:
            # Parse location first
            location_info = LocationParser.parse_location(location_input)
            
            # If city name is in parsed info, try direct lookup
            if location_info.city:
                city_info = self.get_city_by_name(location_info.city)
                if city_info:
                    return city_info
            
            # Otherwise detect from coordinates
            return self.detect_city_from_coordinates(
                location_info.latitude,
                location_info.longitude
            )
            
        except ValueError as e:
            logger.error(f"Error parsing location: {e}")
            return None
    
    def get_city_by_code(self, city_code: str) -> Optional[CityInfo]:
        """Get city information by city code"""
        try:
            stmt = select(CityConfiguration).where(
                CityConfiguration.city_code == city_code.upper(),
                CityConfiguration.is_active == True
            )
            result = self.db.execute(stmt).first()
            
            if result:
                return self._city_config_to_info(result[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting city by code {city_code}: {e}")
            return None
    
    def get_city_by_name(self, city_name: str) -> Optional[CityInfo]:
        """Get city information by city name"""
        try:
            stmt = select(CityConfiguration).where(
                func.lower(CityConfiguration.city_name) == city_name.lower(),
                CityConfiguration.is_active == True
            )
            result = self.db.execute(stmt).first()
            
            if result:
                return self._city_config_to_info(result[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting city by name {city_name}: {e}")
            return None
    
    def get_all_active_cities(self) -> List[CityInfo]:
        """Get all active cities ordered by priority"""
        try:
            stmt = select(CityConfiguration).where(
                CityConfiguration.is_active == True
            ).order_by(CityConfiguration.priority.desc(), CityConfiguration.city_name)
            
            results = self.db.execute(stmt).all()
            return [self._city_config_to_info(row[0]) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting all active cities: {e}")
            return []
    
    def get_supported_cities(self) -> Dict[str, Dict[str, any]]:
        """Get dictionary of all supported cities with their details"""
        cities = self.get_all_active_cities()
        return {
            city.city_code: {
                'name': city.city_name,
                'state': city.state,
                'country': city.country,
                'latitude': city.latitude,
                'longitude': city.longitude,
                'priority': city.priority
            }
            for city in cities
        }
    
    def get_city_stations(self, city_code: str) -> List[Dict]:
        """Get all monitoring stations for a city"""
        try:
            stmt = select(MonitoringStation).where(
                MonitoringStation.city_code == city_code,
                MonitoringStation.is_active == True
            )
            results = self.db.execute(stmt).all()
            
            return [
                {
                    'station_id': row[0].station_id,
                    'name': row[0].name,
                    'latitude': self.db.scalar(func.ST_Y(row[0].location)),
                    'longitude': self.db.scalar(func.ST_X(row[0].location)),
                    'parameters': row[0].parameters
                }
                for row in results
            ]
            
        except Exception as e:
            logger.error(f"Error getting stations for city {city_code}: {e}")
            return []
    
    def get_nearest_city(self, latitude: float, longitude: float) -> Optional[CityInfo]:
        """Get nearest city regardless of distance"""
        try:
            point = f"POINT({longitude} {latitude})"
            
            stmt = select(
                CityConfiguration,
                ST_Distance(
                    CityConfiguration.center_location,
                    ST_GeomFromText(point, 4326),
                    True
                ).label('distance')
            ).where(
                CityConfiguration.is_active == True
            ).order_by('distance').limit(1)
            
            result = self.db.execute(stmt).first()
            if result:
                return self._city_config_to_info(result[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting nearest city: {e}")
            return None
    
    def _city_config_to_info(self, config: CityConfiguration) -> CityInfo:
        """Convert CityConfiguration model to CityInfo dataclass"""
        import json
        
        # Extract coordinates from geometry
        latitude = self.db.scalar(func.ST_Y(config.center_location))
        longitude = self.db.scalar(func.ST_X(config.center_location))
        
        # Parse JSON fields
        model_config = None
        data_sources = None
        alert_thresholds = None
        
        if config.model_config:
            try:
                model_config = json.loads(config.model_config) if isinstance(config.model_config, str) else config.model_config
            except:
                pass
        
        if config.data_sources:
            try:
                data_sources = json.loads(config.data_sources) if isinstance(config.data_sources, str) else config.data_sources
            except:
                pass
        
        if config.alert_thresholds:
            try:
                alert_thresholds = json.loads(config.alert_thresholds) if isinstance(config.alert_thresholds, str) else config.alert_thresholds
            except:
                pass
        
        return CityInfo(
            city_code=config.city_code,
            city_name=config.city_name,
            state=config.state,
            country=config.country,
            latitude=latitude,
            longitude=longitude,
            is_active=config.is_active,
            priority=config.priority,
            model_config=model_config,
            data_sources=data_sources,
            alert_thresholds=alert_thresholds
        )


def detect_city(db: Session, location_input: str) -> Optional[CityInfo]:
    """Convenience function to detect city from location input"""
    detector = CityDetector(db)
    return detector.detect_city_from_location(location_input)
