"""
AQI (Air Quality Index) calculation utilities.
Implements standard AQI calculation formulas for various pollutants.
"""

import math
from typing import Dict, Tuple, Optional


class AQICalculator:
    """
    AQI Calculator class for computing Air Quality Index values.
    """
    
    def __init__(self):
        """Initialize AQI Calculator with standard breakpoints."""
        self.pm25_breakpoints = [
            (0.0, 12.0, 0, 50),
            (12.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 150.4, 151, 200),
            (150.5, 250.4, 201, 300),
            (250.5, 350.4, 301, 400),
            (350.5, 500.4, 401, 500)
        ]
        
        self.pm10_breakpoints = [
            (0, 54, 0, 50),
            (55, 154, 51, 100),
            (155, 254, 101, 150),
            (255, 354, 151, 200),
            (355, 424, 201, 300),
            (425, 504, 301, 400),
            (505, 604, 401, 500)
        ]
        
        self.o3_breakpoints = [
            (0, 54, 0, 50),
            (55, 70, 51, 100),
            (71, 85, 101, 150),
            (86, 105, 151, 200),
            (106, 200, 201, 300)
        ]
        
        self.no2_breakpoints = [
            (0, 53, 0, 50),
            (54, 100, 51, 100),
            (101, 360, 101, 150),
            (361, 649, 151, 200),
            (650, 1249, 201, 300),
            (1250, 1649, 301, 400),
            (1650, 2049, 401, 500)
        ]
        
        self.so2_breakpoints = [
            (0, 35, 0, 50),
            (36, 75, 51, 100),
            (76, 185, 101, 150),
            (186, 304, 151, 200),
            (305, 604, 201, 300),
            (605, 804, 301, 400),
            (805, 1004, 401, 500)
        ]
        
        self.co_breakpoints = [
            (0.0, 4.4, 0, 50),
            (4.5, 9.4, 51, 100),
            (9.5, 12.4, 101, 150),
            (12.5, 15.4, 151, 200),
            (15.5, 30.4, 201, 300),
            (30.5, 40.4, 301, 400),
            (40.5, 50.4, 401, 500)
        ]
        
        self.breakpoint_map = {
            'pm25': self.pm25_breakpoints,
            'pm10': self.pm10_breakpoints,
            'o3': self.o3_breakpoints,
            'no2': self.no2_breakpoints,
            'so2': self.so2_breakpoints,
            'co': self.co_breakpoints
        }
    
    def calculate_sub_index(self, concentration: float, pollutant: str) -> float:
        """
        Calculate sub-index for a single pollutant.
        
        Args:
            concentration: Pollutant concentration
            pollutant: Pollutant type (pm25, pm10, etc.)
        
        Returns:
            Sub-index value
        """
        if concentration < 0:
            return 0
        
        if pollutant not in self.breakpoint_map:
            raise ValueError(f"Unknown pollutant: {pollutant}")
        
        breakpoints = self.breakpoint_map[pollutant]
        return self._calculate_pollutant_aqi(concentration, breakpoints) or 0
    
    def calculate_aqi(self, pollutant_values: Dict[str, float]) -> Tuple[int, str, str]:
        """
        Calculate AQI from pollutant concentrations.
        
        Args:
            pollutant_values: Dictionary of pollutant concentrations
        
        Returns:
            Tuple of (AQI value, dominant pollutant, category)
        """
        if not pollutant_values:
            return 0, "unknown", "good"
        
        pollutant_aqis = {}
        
        # Calculate AQI for each pollutant
        for pollutant, concentration in pollutant_values.items():
            if pollutant in self.breakpoint_map and concentration is not None:
                aqi = self.calculate_sub_index(concentration, pollutant)
                if aqi is not None:
                    pollutant_aqis[pollutant] = aqi
        
        if not pollutant_aqis:
            return 0, "unknown", "good"
        
        # Find the maximum AQI (dominant pollutant)
        max_aqi = max(pollutant_aqis.values())
        dominant_pollutant = max(pollutant_aqis, key=pollutant_aqis.get)
        
        # Determine AQI category
        category = self.get_category(max_aqi)
        
        return int(max_aqi), dominant_pollutant, category
    
    def get_category(self, aqi: float) -> str:
        """
        Get AQI category based on AQI value.
        
        Args:
            aqi: AQI value
        
        Returns:
            AQI category string
        """
        if aqi <= 50:
            return "good"
        elif aqi <= 100:
            return "moderate"
        elif aqi <= 150:
            return "unhealthy_sensitive"
        elif aqi <= 200:
            return "unhealthy"
        elif aqi <= 300:
            return "very_unhealthy"
        else:
            return "hazardous"
    
    def get_color(self, aqi: int) -> str:
        """
        Get color code for AQI value.
        
        Args:
            aqi: AQI value
        
        Returns:
            Hex color code
        """
        if aqi <= 50:
            return "#4ADE80"  # Green
        elif aqi <= 100:
            return "#FBBF24"  # Yellow
        elif aqi <= 150:
            return "#FB923C"  # Orange
        elif aqi <= 200:
            return "#EF4444"  # Red
        elif aqi <= 300:
            return "#A855F7"  # Purple
        else:
            return "#7C2D12"  # Maroon
    
    def get_category_label(self, aqi: int) -> str:
        """
        Get human-readable category label for AQI value.
        
        Args:
            aqi: AQI value
        
        Returns:
            Category label string
        """
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Moderate"
        elif aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        elif aqi <= 200:
            return "Unhealthy"
        elif aqi <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"
    
    def get_category_description(self, aqi: int) -> str:
        """
        Get detailed description for AQI category.
        
        Args:
            aqi: AQI value
        
        Returns:
            Category description string
        """
        if aqi <= 50:
            return "Air quality is satisfactory, and air pollution poses little or no risk."
        elif aqi <= 100:
            return "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution."
        elif aqi <= 150:
            return "Members of sensitive groups may experience health effects. The general public is less likely to be affected."
        elif aqi <= 200:
            return "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects."
        elif aqi <= 300:
            return "Health alert: The risk of health effects is increased for everyone."
        else:
            return "Health warning of emergency conditions: everyone is more likely to be affected."
    
    def get_health_message(self, aqi: int) -> str:
        """
        Get health advice message for AQI value.
        
        Args:
            aqi: AQI value
        
        Returns:
            Health advice string
        """
        if aqi <= 50:
            return "Enjoy outdoor activities."
        elif aqi <= 100:
            return "Unusually sensitive people should consider limiting prolonged outdoor exertion."
        elif aqi <= 150:
            return "Sensitive groups should limit prolonged outdoor exertion."
        elif aqi <= 200:
            return "Everyone should limit prolonged outdoor exertion."
        elif aqi <= 300:
            return "Everyone should limit outdoor exertion."
        else:
            return "Everyone should avoid outdoor exertion."
    
    def _calculate_pollutant_aqi(self, concentration: float, breakpoints: list) -> Optional[float]:
        """
        Calculate AQI for a single pollutant using linear interpolation.
        
        Args:
            concentration: Pollutant concentration
            breakpoints: List of (conc_low, conc_high, aqi_low, aqi_high) tuples
        
        Returns:
            AQI value or None if concentration is out of range
        """
        if concentration < 0:
            return None
        
        # Find the appropriate breakpoint
        for conc_low, conc_high, aqi_low, aqi_high in breakpoints:
            if conc_low <= concentration <= conc_high:
                # Linear interpolation
                aqi = ((aqi_high - aqi_low) / (conc_high - conc_low)) * (concentration - conc_low) + aqi_low
                return aqi
        
        # If concentration exceeds all breakpoints, use the highest category
        if concentration > breakpoints[-1][1]:
            return 500  # Hazardous
        
        return None


def calculate_aqi(pollutant_values: Dict[str, float]) -> Tuple[int, str, str]:
    """
    Calculate AQI from pollutant concentrations.
    
    Args:
        pollutant_values: Dictionary of pollutant concentrations
                         Keys: pm25, pm10, o3, no2, so2, co
                         Values: concentrations in µg/m³ (ppm for CO)
    
    Returns:
        Tuple of (AQI value, dominant pollutant, category)
    """
    # AQI breakpoints for different pollutants
    # Format: [(concentration_low, concentration_high, aqi_low, aqi_high), ...]
    
    pm25_breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500)
    ]
    
    pm10_breakpoints = [
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500)
    ]
    
    o3_breakpoints = [
        (0, 54, 0, 50),
        (55, 70, 51, 100),
        (71, 85, 101, 150),
        (86, 105, 151, 200),
        (106, 200, 201, 300)
    ]
    
    no2_breakpoints = [
        (0, 53, 0, 50),
        (54, 100, 51, 100),
        (101, 360, 101, 150),
        (361, 649, 151, 200),
        (650, 1249, 201, 300),
        (1250, 1649, 301, 400),
        (1650, 2049, 401, 500)
    ]
    
    so2_breakpoints = [
        (0, 35, 0, 50),
        (36, 75, 51, 100),
        (76, 185, 101, 150),
        (186, 304, 151, 200),
        (305, 604, 201, 300),
        (605, 804, 301, 400),
        (805, 1004, 401, 500)
    ]
    
    co_breakpoints = [
        (0.0, 4.4, 0, 50),
        (4.5, 9.4, 51, 100),
        (9.5, 12.4, 101, 150),
        (12.5, 15.4, 151, 200),
        (15.5, 30.4, 201, 300),
        (30.5, 40.4, 301, 400),
        (40.5, 50.4, 401, 500)
    ]
    
    breakpoint_map = {
        'pm25': pm25_breakpoints,
        'pm10': pm10_breakpoints,
        'o3': o3_breakpoints,
        'no2': no2_breakpoints,
        'so2': so2_breakpoints,
        'co': co_breakpoints
    }
    
    pollutant_aqis = {}
    
    # Calculate AQI for each pollutant
    for pollutant, concentration in pollutant_values.items():
        if pollutant in breakpoint_map and concentration is not None:
            aqi = _calculate_pollutant_aqi(concentration, breakpoint_map[pollutant])
            if aqi is not None:
                pollutant_aqis[pollutant] = aqi
    
    if not pollutant_aqis:
        return 0, "unknown", "no_data"
    
    # Find the maximum AQI (dominant pollutant)
    max_aqi = max(pollutant_aqis.values())
    dominant_pollutant = max(pollutant_aqis, key=pollutant_aqis.get)
    
    # Determine AQI category
    category = _get_aqi_category(max_aqi)
    
    return int(max_aqi), dominant_pollutant, category


def _calculate_pollutant_aqi(concentration: float, breakpoints: list) -> Optional[float]:
    """
    Calculate AQI for a single pollutant using linear interpolation.
    
    Args:
        concentration: Pollutant concentration
        breakpoints: List of (conc_low, conc_high, aqi_low, aqi_high) tuples
    
    Returns:
        AQI value or None if concentration is out of range
    """
    if concentration < 0:
        return None
    
    # Find the appropriate breakpoint
    for conc_low, conc_high, aqi_low, aqi_high in breakpoints:
        if conc_low <= concentration <= conc_high:
            # Linear interpolation
            aqi = ((aqi_high - aqi_low) / (conc_high - conc_low)) * (concentration - conc_low) + aqi_low
            return aqi
    
    # If concentration exceeds all breakpoints, use the highest category
    if concentration > breakpoints[-1][1]:
        return 500  # Hazardous
    
    return None


def _get_aqi_category(aqi: float) -> str:
    """
    Get AQI category based on AQI value.
    
    Args:
        aqi: AQI value
    
    Returns:
        AQI category string
    """
    if aqi <= 50:
        return "good"
    elif aqi <= 100:
        return "moderate"
    elif aqi <= 150:
        return "unhealthy_sensitive"
    elif aqi <= 200:
        return "unhealthy"
    elif aqi <= 300:
        return "very_unhealthy"
    else:
        return "hazardous"


def get_aqi_color(aqi: int) -> str:
    """
    Get color code for AQI value.
    
    Args:
        aqi: AQI value
    
    Returns:
        Hex color code
    """
    if aqi <= 50:
        return "#00E400"  # Green
    elif aqi <= 100:
        return "#FFFF00"  # Yellow
    elif aqi <= 150:
        return "#FF7E00"  # Orange
    elif aqi <= 200:
        return "#FF0000"  # Red
    elif aqi <= 300:
        return "#8F3F97"  # Purple
    else:
        return "#7E0023"  # Maroon


def get_aqi_description(aqi: int) -> Dict[str, str]:
    """
    Get detailed description for AQI value.
    
    Args:
        aqi: AQI value
    
    Returns:
        Dictionary with category, description, and health_advice
    """
    if aqi <= 50:
        return {
            "category": "Good",
            "description": "Air quality is satisfactory, and air pollution poses little or no risk.",
            "health_advice": "Enjoy outdoor activities."
        }
    elif aqi <= 100:
        return {
            "category": "Moderate",
            "description": "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
            "health_advice": "Unusually sensitive people should consider limiting prolonged outdoor exertion."
        }
    elif aqi <= 150:
        return {
            "category": "Unhealthy for Sensitive Groups",
            "description": "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
            "health_advice": "Sensitive groups should limit prolonged outdoor exertion."
        }
    elif aqi <= 200:
        return {
            "category": "Unhealthy",
            "description": "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.",
            "health_advice": "Everyone should limit prolonged outdoor exertion."
        }
    elif aqi <= 300:
        return {
            "category": "Very Unhealthy",
            "description": "Health alert: The risk of health effects is increased for everyone.",
            "health_advice": "Everyone should limit outdoor exertion."
        }
    else:
        return {
            "category": "Hazardous",
            "description": "Health warning of emergency conditions: everyone is more likely to be affected.",
            "health_advice": "Everyone should avoid outdoor exertion."
        }


# Backward compatibility functions
def calculate_aqi(pollutant_values: Dict[str, float]) -> Tuple[int, str, str]:
    """
    Calculate AQI from pollutant concentrations (backward compatibility).
    
    Args:
        pollutant_values: Dictionary of pollutant concentrations
                         Keys: pm25, pm10, o3, no2, so2, co
                         Values: concentrations in µg/m³ (ppm for CO)
    
    Returns:
        Tuple of (AQI value, dominant pollutant, category)
    """
    calculator = AQICalculator()
    return calculator.calculate_aqi(pollutant_values)


def get_aqi_color(aqi: int) -> str:
    """
    Get color code for AQI value (backward compatibility).
    
    Args:
        aqi: AQI value
    
    Returns:
        Hex color code
    """
    calculator = AQICalculator()
    return calculator.get_color(aqi)


def get_aqi_description(aqi: int) -> Dict[str, str]:
    """
    Get detailed description for AQI value.
    
    Args:
        aqi: AQI value
    
    Returns:
        Dictionary with category, description, and health_advice
    """
    if aqi <= 50:
        return {
            "category": "Good",
            "description": "Air quality is satisfactory, and air pollution poses little or no risk.",
            "health_advice": "Enjoy outdoor activities."
        }
    elif aqi <= 100:
        return {
            "category": "Moderate",
            "description": "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
            "health_advice": "Unusually sensitive people should consider limiting prolonged outdoor exertion."
        }
    elif aqi <= 150:
        return {
            "category": "Unhealthy for Sensitive Groups",
            "description": "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
            "health_advice": "Sensitive groups should limit prolonged outdoor exertion."
        }
    elif aqi <= 200:
        return {
            "category": "Unhealthy",
            "description": "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.",
            "health_advice": "Everyone should limit prolonged outdoor exertion."
        }
    elif aqi <= 300:
        return {
            "category": "Very Unhealthy",
            "description": "Health alert: The risk of health effects is increased for everyone.",
            "health_advice": "Everyone should limit outdoor exertion."
        }
    else:
        return {
            "category": "Hazardous",
            "description": "Health warning of emergency conditions: everyone is more likely to be affected.",
            "health_advice": "Everyone should avoid outdoor exertion."
        }