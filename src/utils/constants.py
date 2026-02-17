"""
Constants for AQI Predictor Application
Based on US EPA AQI standards and CPCB India guidelines
"""

# =============================================================================
# AQI Categories and Thresholds
# =============================================================================

AQI_CATEGORIES = {
    'good': {'min': 0, 'max': 50, 'label': 'Good', 'description': 'Air quality is satisfactory'},
    'moderate': {'min': 51, 'max': 100, 'label': 'Moderate', 'description': 'Acceptable for most'},
    'unhealthy_sensitive': {'min': 101, 'max': 150, 'label': 'Unhealthy for Sensitive', 'description': 'Sensitive groups should limit exposure'},
    'unhealthy': {'min': 151, 'max': 200, 'label': 'Unhealthy', 'description': 'Everyone may experience health effects'},
    'very_unhealthy': {'min': 201, 'max': 300, 'label': 'Very Unhealthy', 'description': 'Health alert: everyone affected'},
    'hazardous': {'min': 301, 'max': 500, 'label': 'Hazardous', 'description': 'Emergency conditions'}
}

# =============================================================================
# AQI Color Palette (from Graphics Instructions)
# =============================================================================

AQI_COLORS = {
    'good': '#4ADE80',           # Green
    'moderate': '#FCD34D',        # Yellow
    'unhealthy_sensitive': '#FB923C',  # Orange
    'unhealthy': '#EF4444',       # Red
    'very_unhealthy': '#A855F7',  # Purple
    'hazardous': '#7C2D12'        # Maroon
}

# Gradient backgrounds for each AQI level
AQI_BACKGROUNDS = {
    'good': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'moderate': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'unhealthy_sensitive': 'linear-gradient(135deg, #ff9a44 0%, #fc6076 100%)',
    'unhealthy': 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
    'very_unhealthy': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'hazardous': 'linear-gradient(135deg, #434343 0%, #000000 100%)'
}

# =============================================================================
# Pollutant Information
# =============================================================================

POLLUTANTS = {
    'pm25': {
        'name': 'PM2.5',
        'full_name': 'Fine Particulate Matter',
        'unit': 'μg/m³',
        'description': 'Fine particles that penetrate deep into lungs',
        'icon': '🔴',
        'breakpoints': [
            (0, 12.0, 0, 50),
            (12.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 150.4, 151, 200),
            (150.5, 250.4, 201, 300),
            (250.5, 500.4, 301, 500)
        ]
    },
    'pm10': {
        'name': 'PM10',
        'full_name': 'Coarse Particulate Matter',
        'unit': 'μg/m³',
        'description': 'Inhalable particles causing respiratory issues',
        'icon': '🟠',
        'breakpoints': [
            (0, 54, 0, 50),
            (55, 154, 51, 100),
            (155, 254, 101, 150),
            (255, 354, 151, 200),
            (355, 424, 201, 300),
            (425, 604, 301, 500)
        ]
    },
    'o3': {
        'name': 'O₃',
        'full_name': 'Ozone',
        'unit': 'ppb',
        'description': 'Ground-level ozone causing breathing difficulties',
        'icon': '🟡',
        'breakpoints': [
            (0, 54, 0, 50),
            (55, 70, 51, 100),
            (71, 85, 101, 150),
            (86, 105, 151, 200),
            (106, 200, 201, 300),
            (201, 604, 301, 500)
        ]
    },
    'no2': {
        'name': 'NO₂',
        'full_name': 'Nitrogen Dioxide',
        'unit': 'ppb',
        'description': 'Traffic pollutant causing lung irritation',
        'icon': '🟤',
        'breakpoints': [
            (0, 53, 0, 50),
            (54, 100, 51, 100),
            (101, 360, 101, 150),
            (361, 649, 151, 200),
            (650, 1249, 201, 300),
            (1250, 2049, 301, 500)
        ]
    },
    'so2': {
        'name': 'SO₂',
        'full_name': 'Sulfur Dioxide',
        'unit': 'ppb',
        'description': 'Industrial pollutant affecting airways',
        'icon': '🟣',
        'breakpoints': [
            (0, 35, 0, 50),
            (36, 75, 51, 100),
            (76, 185, 101, 150),
            (186, 304, 151, 200),
            (305, 604, 201, 300),
            (605, 1004, 301, 500)
        ]
    },
    'co': {
        'name': 'CO',
        'full_name': 'Carbon Monoxide',
        'unit': 'ppm',
        'description': 'Colorless gas reducing oxygen in blood',
        'icon': '⚫',
        'breakpoints': [
            (0, 4.4, 0, 50),
            (4.5, 9.4, 51, 100),
            (9.5, 12.4, 101, 150),
            (12.5, 15.4, 151, 200),
            (15.5, 30.4, 201, 300),
            (30.5, 50.4, 301, 500)
        ]
    }
}

# =============================================================================
# Supported Cities
# =============================================================================

CITIES = {
    'Delhi': {
        'lat': 28.6139,
        'lon': 77.2090,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['Anand Vihar', 'ITO', 'Dwarka', 'Rohini', 'Punjabi Bagh']
    },
    'Mumbai': {
        'lat': 19.0760,
        'lon': 72.8777,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['Bandra', 'Worli', 'Colaba', 'Andheri']
    },
    'Bangalore': {
        'lat': 12.9716,
        'lon': 77.5946,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['BTM Layout', 'Jayanagar', 'Silk Board']
    },
    'Chennai': {
        'lat': 13.0827,
        'lon': 80.2707,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['T Nagar', 'Velachery']
    },
    'Kolkata': {
        'lat': 22.5726,
        'lon': 88.3639,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['Victoria Memorial', 'Ballygunge', 'Jadavpur']
    },
    'Hyderabad': {
        'lat': 17.3850,
        'lon': 78.4867,
        'country': 'IN',
        'timezone': 'Asia/Kolkata',
        'stations': ['Jubilee Hills', 'HITEC City', 'Secunderabad']
    }
}

# =============================================================================
# Health Recommendations by AQI Level
# =============================================================================

HEALTH_RECOMMENDATIONS = {
    'good': [
        "Great day for outdoor activities! 🌳",
        "Air quality is excellent for everyone.",
        "Perfect conditions for exercise and outdoor sports."
    ],
    'moderate': [
        "Air quality is acceptable for most people.",
        "Unusually sensitive individuals may experience minor symptoms.",
        "Consider reducing prolonged outdoor exertion if you're sensitive."
    ],
    'unhealthy_sensitive': [
        "Sensitive groups should limit prolonged outdoor exertion.",
        "People with asthma, heart disease, or elderly should reduce outdoor activity.",
        "Keep windows closed and use air purifiers if available."
    ],
    'unhealthy': [
        "Everyone should reduce prolonged outdoor exertion.",
        "Sensitive groups should avoid all outdoor physical activity.",
        "Use N95 masks if going outside is necessary.",
        "Keep windows and doors closed."
    ],
    'very_unhealthy': [
        "Everyone should avoid outdoor activities.",
        "Stay indoors with windows closed.",
        "Use air purifiers and N95 masks.",
        "Seek medical attention if experiencing symptoms."
    ],
    'hazardous': [
        "⚠️ EMERGENCY: Everyone should remain indoors.",
        "All physical activity should be avoided.",
        "If you must go outside, wear N95 mask.",
        "Seek immediate medical help for any respiratory symptoms.",
        "Consider evacuation if conditions persist."
    ]
}

# =============================================================================
# Source Attribution Categories
# =============================================================================

SOURCE_CATEGORIES = {
    'traffic': {
        'name': 'Vehicular Emissions',
        'color': '#EF4444',
        'icon': '🚗',
        'features': ['no2', 'co', 'traffic_density', 'rush_hour']
    },
    'industry': {
        'name': 'Industrial Sources',
        'color': '#6366F1',
        'icon': '🏭',
        'features': ['so2', 'industrial_zones', 'night_shift']
    },
    'biomass': {
        'name': 'Biomass Burning',
        'color': '#F59E0B',
        'icon': '🔥',
        'features': ['pm25_pm10_ratio', 'fire_count', 'wind_direction']
    },
    'background': {
        'name': 'Background/Regional',
        'color': '#8B5CF6',
        'icon': '🌫️',
        'features': ['humidity', 'temperature', 'wind_speed']
    }
}

# =============================================================================
# API Configuration
# =============================================================================

OPENAQ_BASE_URL = "https://api.openaq.org/v2"
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

# Default cache duration (seconds)
CACHE_DURATION = 300  # 5 minutes

# API rate limits
OPENAQ_RATE_LIMIT = 100  # requests per minute
OPENWEATHER_RATE_LIMIT = 60  # requests per minute (free tier)
