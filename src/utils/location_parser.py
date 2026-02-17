"""
Location Parser - Parse and validate location inputs
Handles coordinates, city names, and addresses for AQI forecasting
"""

import re
from typing import Dict, Optional, Tuple, Union
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class LocationInfo:
    """Parsed location information"""
    latitude: float
    longitude: float
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    source: str = "parsed"  # parsed, geocoded, database


class LocationParser:
    """Parse various location input formats"""
    
    # Major Indian cities with coordinates
    CITY_COORDINATES = {
        'delhi': (28.6139, 77.2090),
        'new delhi': (28.6139, 77.2090),
        'mumbai': (19.0760, 72.8777),
        'bangalore': (12.9716, 77.5946),
        'bengaluru': (12.9716, 77.5946),
        'hyderabad': (17.3850, 78.4867),
        'ahmedabad': (23.0225, 72.5714),
        'chennai': (13.0827, 80.2707),
        'kolkata': (22.5726, 88.3639),
        'pune': (18.5204, 73.8567),
        'jaipur': (26.9124, 75.7873),
        'surat': (21.1702, 72.8311),
        'lucknow': (26.8467, 80.9462),
        'kanpur': (26.4499, 80.3319),
        'nagpur': (21.1458, 79.0882),
        'indore': (22.7196, 75.8577),
        'thane': (19.2183, 72.9781),
        'bhopal': (23.2599, 77.4126),
        'visakhapatnam': (17.6868, 83.2185),
        'pimpri chinchwad': (18.6298, 73.7997),
        'patna': (25.5941, 85.1376),
        'vadodara': (22.3072, 73.1812),
        'ghaziabad': (28.6692, 77.4538),
        'ludhiana': (30.9010, 75.8573),
        'agra': (27.1767, 78.0081),
        'nashik': (19.9975, 73.7898),
        'faridabad': (28.4089, 77.3178),
        'meerut': (28.9845, 77.7064),
        'rajkot': (22.3039, 70.8022),
        'kalyan dombivali': (19.2403, 73.1305),
        'vasai virar': (19.4912, 72.8054),
        'varanasi': (25.3176, 82.9739),
        'srinagar': (34.0837, 74.7973),
        'aurangabad': (19.8762, 75.3433),
        'dhanbad': (23.7957, 86.4304),
        'amritsar': (31.6340, 74.8723),
        'navi mumbai': (19.0330, 73.0297),
        'allahabad': (25.4358, 81.8463),
        'prayagraj': (25.4358, 81.8463),
        'ranchi': (23.3441, 85.3096),
        'howrah': (22.5958, 88.2636),
        'coimbatore': (11.0168, 76.9558),
        'jabalpur': (23.1815, 79.9864),
        'gwalior': (26.2183, 78.1828),
        'vijayawada': (16.5062, 80.6480),
        'jodhpur': (26.2389, 73.0243),
        'madurai': (9.9252, 78.1198),
        'raipur': (21.2514, 81.6296),
        'kota': (25.2138, 75.8648),
        'chandigarh': (30.7333, 76.7794),
        'guwahati': (26.1445, 91.7362),
        'solapur': (17.6599, 75.9064),
        'hubli dharwad': (15.3647, 75.1240),
        'bareilly': (28.3670, 79.4304),
        'moradabad': (28.8386, 78.7733),
        'mysore': (12.2958, 76.6394),
        'mysuru': (12.2958, 76.6394),
        'gurgaon': (28.4595, 77.0266),
        'gurugram': (28.4595, 77.0266),
        'aligarh': (27.8974, 78.0880),
        'jalandhar': (31.3260, 75.5762),
        'tiruchirappalli': (10.7905, 78.7047),
        'bhubaneswar': (20.2961, 85.8245),
        'salem': (11.6643, 78.1460),
        'warangal': (17.9689, 79.5941),
        'mira bhayandar': (19.2952, 72.8544),
        'thiruvananthapuram': (8.5241, 76.9366),
        'bhiwandi': (19.3002, 73.0635),
        'saharanpur': (29.9680, 77.5552),
        'guntur': (16.3067, 80.4365),
        'amravati': (20.9374, 77.7796),
        'bikaner': (28.0229, 73.3119),
        'noida': (28.5355, 77.3910),
        'jamshedpur': (22.8046, 86.2029),
        'bhilai nagar': (21.1938, 81.3509),
        'cuttack': (20.4625, 85.8828),
        'firozabad': (27.1592, 78.3957),
        'kochi': (9.9312, 76.2673),
        'cochin': (9.9312, 76.2673),
        'bhavnagar': (21.7645, 72.1519),
        'dehradun': (30.3165, 78.0322),
        'durgapur': (23.4800, 87.3119),
        'asansol': (23.6739, 86.9524),
        'nanded waghala': (19.1383, 77.2975),
        'kolhapur': (16.7050, 74.2433),
        'ajmer': (26.4499, 74.6399),
        'akola': (20.7002, 77.0082),
        'gulbarga': (17.3297, 76.8343),
        'jamnagar': (22.4707, 70.0577),
        'ujjain': (23.1765, 75.7885),
        'loni': (28.7333, 77.2833),
        'siliguri': (26.7271, 88.3953),
        'jhansi': (25.4484, 78.5685),
        'ulhasnagar': (19.2215, 73.1645),
        'nellore': (14.4426, 79.9865),
        'jammu': (32.7266, 74.8570),
        'sangli miraj kupwad': (16.8524, 74.5815),
        'belgaum': (15.8497, 74.4977),
        'mangalore': (12.9141, 74.8560),
        'ambattur': (13.1143, 80.1548),
        'tirunelveli': (8.7139, 77.7567),
        'malegaon': (20.5579, 74.5287),
        'gaya': (24.7914, 85.0002),
        'jalgaon': (21.0077, 75.5626),
        'udaipur': (24.5854, 73.7125),
        'maheshtala': (22.5049, 88.2482)
    }
    
    @classmethod
    def parse_location(cls, location_input: str) -> LocationInfo:
        """
        Parse location input and return LocationInfo
        
        Args:
            location_input: Location string (coordinates, city name, or address)
            
        Returns:
            LocationInfo object with parsed coordinates and metadata
            
        Raises:
            ValueError: If location cannot be parsed
        """
        location_input = location_input.strip().lower()
        
        # Try to parse as coordinates first
        coords = cls._parse_coordinates(location_input)
        if coords:
            lat, lon = coords
            return LocationInfo(
                latitude=lat,
                longitude=lon,
                name=f"{lat:.4f}, {lon:.4f}",
                source="coordinates"
            )
        
        # Try to match known cities
        city_info = cls._parse_city(location_input)
        if city_info:
            return city_info
        
        # Try to parse as address (basic implementation)
        address_info = cls._parse_address(location_input)
        if address_info:
            return address_info
        
        # If all parsing fails, raise error
        raise ValueError(f"Unable to parse location: {location_input}")
    
    @classmethod
    def _parse_coordinates(cls, location_input: str) -> Optional[Tuple[float, float]]:
        """
        Parse coordinate strings like:
        - "28.6139, 77.2090"
        - "28.6139,77.2090"
        - "lat:28.6139,lon:77.2090"
        - "28.6139N, 77.2090E"
        """
        # Remove common prefixes and suffixes
        cleaned = re.sub(r'(lat|latitude|lng|lon|longitude)[:=]?', '', location_input, flags=re.IGNORECASE)
        cleaned = re.sub(r'[NSEW]', '', cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()
        
        # Pattern for decimal coordinates
        coord_patterns = [
            r'^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$',  # "lat, lon"
            r'^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$',      # "lat lon"
        ]
        
        for pattern in coord_patterns:
            match = re.match(pattern, cleaned)
            if match:
                try:
                    lat, lon = float(match.group(1)), float(match.group(2))
                    
                    # Validate coordinate ranges
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        # For India, validate reasonable bounds
                        if 6 <= lat <= 37 and 68 <= lon <= 97:
                            return lat, lon
                        else:
                            logger.warning(f"Coordinates {lat}, {lon} outside India bounds")
                            return lat, lon  # Still valid coordinates, just outside India
                except ValueError:
                    continue
        
        return None
    
    @classmethod
    def _parse_city(cls, location_input: str) -> Optional[LocationInfo]:
        """Parse city names and return LocationInfo"""
        # Direct match
        if location_input in cls.CITY_COORDINATES:
            lat, lon = cls.CITY_COORDINATES[location_input]
            return LocationInfo(
                latitude=lat,
                longitude=lon,
                name=location_input.title(),
                city=location_input.title(),
                state=cls._get_state_for_city(location_input),
                source="city_database"
            )
        
        # Fuzzy matching for common variations
        for city, coords in cls.CITY_COORDINATES.items():
            # Remove common suffixes/prefixes
            city_clean = city.replace(' city', '').replace('greater ', '')
            input_clean = location_input.replace(' city', '').replace('greater ', '')
            
            if city_clean == input_clean or input_clean in city_clean or city_clean in input_clean:
                lat, lon = coords
                return LocationInfo(
                    latitude=lat,
                    longitude=lon,
                    name=city.title(),
                    city=city.title(),
                    state=cls._get_state_for_city(city),
                    source="city_database"
                )
        
        return None
    
    @classmethod
    def _parse_address(cls, location_input: str) -> Optional[LocationInfo]:
        """
        Basic address parsing - looks for city names within addresses
        More sophisticated geocoding would require external APIs
        """
        # Look for known cities within the address
        for city, coords in cls.CITY_COORDINATES.items():
            if city in location_input:
                lat, lon = coords
                return LocationInfo(
                    latitude=lat,
                    longitude=lon,
                    name=location_input.title(),
                    city=city.title(),
                    state=cls._get_state_for_city(city),
                    source="address_parsed"
                )
        
        return None
    
    @classmethod
    def _get_state_for_city(cls, city: str) -> Optional[str]:
        """Get state name for known cities"""
        # Simplified state mapping for major cities
        state_mapping = {
            'delhi': 'Delhi',
            'new delhi': 'Delhi',
            'mumbai': 'Maharashtra',
            'bangalore': 'Karnataka',
            'bengaluru': 'Karnataka',
            'hyderabad': 'Telangana',
            'ahmedabad': 'Gujarat',
            'chennai': 'Tamil Nadu',
            'kolkata': 'West Bengal',
            'pune': 'Maharashtra',
            'jaipur': 'Rajasthan',
            'surat': 'Gujarat',
            'lucknow': 'Uttar Pradesh',
            'kanpur': 'Uttar Pradesh',
            'nagpur': 'Maharashtra',
            'indore': 'Madhya Pradesh',
            'thane': 'Maharashtra',
            'bhopal': 'Madhya Pradesh',
            'visakhapatnam': 'Andhra Pradesh',
            'patna': 'Bihar',
            'vadodara': 'Gujarat',
            'ghaziabad': 'Uttar Pradesh',
            'ludhiana': 'Punjab',
            'agra': 'Uttar Pradesh',
            'nashik': 'Maharashtra',
            'faridabad': 'Haryana',
            'meerut': 'Uttar Pradesh',
            'rajkot': 'Gujarat',
            'srinagar': 'Jammu and Kashmir',
            'aurangabad': 'Maharashtra',
            'dhanbad': 'Jharkhand',
            'amritsar': 'Punjab',
            'navi mumbai': 'Maharashtra',
            'allahabad': 'Uttar Pradesh',
            'prayagraj': 'Uttar Pradesh',
            'ranchi': 'Jharkhand',
            'howrah': 'West Bengal',
            'coimbatore': 'Tamil Nadu',
            'jabalpur': 'Madhya Pradesh',
            'gwalior': 'Madhya Pradesh',
            'vijayawada': 'Andhra Pradesh',
            'jodhpur': 'Rajasthan',
            'madurai': 'Tamil Nadu',
            'raipur': 'Chhattisgarh',
            'kota': 'Rajasthan',
            'chandigarh': 'Chandigarh',
            'guwahati': 'Assam',
            'solapur': 'Maharashtra',
            'bareilly': 'Uttar Pradesh',
            'moradabad': 'Uttar Pradesh',
            'mysore': 'Karnataka',
            'mysuru': 'Karnataka',
            'gurgaon': 'Haryana',
            'gurugram': 'Haryana',
            'aligarh': 'Uttar Pradesh',
            'jalandhar': 'Punjab',
            'tiruchirappalli': 'Tamil Nadu',
            'bhubaneswar': 'Odisha',
            'salem': 'Tamil Nadu',
            'warangal': 'Telangana',
            'thiruvananthapuram': 'Kerala',
            'saharanpur': 'Uttar Pradesh',
            'guntur': 'Andhra Pradesh',
            'amravati': 'Maharashtra',
            'bikaner': 'Rajasthan',
            'noida': 'Uttar Pradesh',
            'jamshedpur': 'Jharkhand',
            'cuttack': 'Odisha',
            'firozabad': 'Uttar Pradesh',
            'kochi': 'Kerala',
            'cochin': 'Kerala',
            'bhavnagar': 'Gujarat',
            'dehradun': 'Uttarakhand',
            'durgapur': 'West Bengal',
            'asansol': 'West Bengal',
            'kolhapur': 'Maharashtra',
            'ajmer': 'Rajasthan',
            'akola': 'Maharashtra',
            'jamnagar': 'Gujarat',
            'ujjain': 'Madhya Pradesh',
            'siliguri': 'West Bengal',
            'jhansi': 'Uttar Pradesh',
            'nellore': 'Andhra Pradesh',
            'jammu': 'Jammu and Kashmir',
            'belgaum': 'Karnataka',
            'mangalore': 'Karnataka',
            'tirunelveli': 'Tamil Nadu',
            'gaya': 'Bihar',
            'jalgaon': 'Maharashtra',
            'udaipur': 'Rajasthan'
        }
        
        return state_mapping.get(city.lower())
    
    @classmethod
    def validate_coordinates(cls, latitude: float, longitude: float) -> bool:
        """Validate if coordinates are within reasonable bounds"""
        return (-90 <= latitude <= 90 and -180 <= longitude <= 180)
    
    @classmethod
    def get_supported_cities(cls) -> Dict[str, Tuple[float, float]]:
        """Get dictionary of all supported cities and their coordinates"""
        return cls.CITY_COORDINATES.copy()
    
    @classmethod
    def is_in_india(cls, latitude: float, longitude: float) -> bool:
        """Check if coordinates are within India's approximate bounds"""
        return (6 <= latitude <= 37 and 68 <= longitude <= 97)


def parse_location(location_input: str) -> LocationInfo:
    """Convenience function to parse location input"""
    return LocationParser.parse_location(location_input)