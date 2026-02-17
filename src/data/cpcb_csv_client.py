"""
CPCB CSV Data Client - Integration with downloaded CPCB data

This client processes the downloaded CPCB CSV data file to provide
real air quality measurements from official CPCB monitoring stations
across India.
"""

import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import os
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class CPCBDataPoint:
    """CPCB data point from CSV file."""
    timestamp: datetime
    location: Tuple[float, float]  # (lat, lon)
    parameter: str
    value: float
    unit: str
    source: str
    station_id: str
    station_name: str
    city: str
    state: str
    quality_flag: str = "real_time"
    metadata: Optional[Dict[str, Any]] = None


class CPCBCSVClient:
    """Client for processing CPCB CSV data."""
    
    def __init__(self, csv_file_path: str = "cpcb_data.csv"):
        self.csv_file_path = csv_file_path
        self.data_cache = None
        self.cache_timestamp = None
        self.cache_duration = 3600  # Cache for 1 hour
        
        # Parameter mapping and units
        self.parameter_mapping = {
            "PM2.5": ("pm25", "µg/m³"),
            "PM10": ("pm10", "µg/m³"),
            "SO2": ("so2", "µg/m³"),
            "NO2": ("no2", "µg/m³"),
            "CO": ("co", "mg/m³"),
            "OZONE": ("o3", "µg/m³"),
            "NH3": ("nh3", "µg/m³")
        }
    
    def _load_csv_data(self) -> pd.DataFrame:
        """Load and cache CSV data."""
        # Check if we need to reload data
        if (self.data_cache is not None and self.cache_timestamp and 
            (datetime.now() - self.cache_timestamp).seconds < self.cache_duration):
            return self.data_cache
        
        try:
            # Load CSV data
            df = pd.read_csv(self.csv_file_path)
            
            # Clean and process data
            df = df.dropna(subset=['latitude', 'longitude', 'pollutant_avg'])
            df = df[df['pollutant_avg'] != 'NA']  # Remove NA values
            
            # Convert timestamp
            df['last_update'] = pd.to_datetime(df['last_update'], format='%d-%m-%Y %H:%M:%S')
            
            # Convert numeric columns
            df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
            df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
            df['pollutant_avg'] = pd.to_numeric(df['pollutant_avg'], errors='coerce')
            df['pollutant_min'] = pd.to_numeric(df['pollutant_min'], errors='coerce')
            df['pollutant_max'] = pd.to_numeric(df['pollutant_max'], errors='coerce')
            
            # Remove rows with invalid coordinates or values
            df = df.dropna(subset=['latitude', 'longitude', 'pollutant_avg'])
            
            # Cache the data
            self.data_cache = df
            self.cache_timestamp = datetime.now()
            
            logger.info(f"Loaded {len(df)} CPCB data records from CSV")
            return df
            
        except Exception as e:
            logger.error(f"Failed to load CPCB CSV data: {e}")
            return pd.DataFrame()
    
    def get_available_stations(self, city: Optional[str] = None, state: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get list of available CPCB monitoring stations."""
        df = self._load_csv_data()
        
        if df.empty:
            return []
        
        # Filter by city/state if specified
        if city:
            df = df[df['city'].str.contains(city, case=False, na=False)]
        if state:
            df = df[df['state'].str.contains(state, case=False, na=False)]
        
        # Get unique stations
        stations = df.groupby(['station', 'city', 'state', 'latitude', 'longitude']).agg({
            'pollutant_id': lambda x: list(x.unique()),
            'last_update': 'max'
        }).reset_index()
        
        station_list = []
        for _, row in stations.iterrows():
            station_list.append({
                "station_name": row['station'],
                "city": row['city'],
                "state": row['state'],
                "latitude": row['latitude'],
                "longitude": row['longitude'],
                "parameters": row['pollutant_id'],
                "last_update": row['last_update'].isoformat(),
                "data_source": "cpcb_csv"
            })
        
        return station_list
    
    def get_data_by_city(self, city: str, parameters: Optional[List[str]] = None) -> List[CPCBDataPoint]:
        """Get CPCB data for a specific city."""
        df = self._load_csv_data()
        
        if df.empty:
            return []
        
        # Filter by city (case-insensitive)
        city_data = df[df['city'].str.contains(city, case=False, na=False)]
        
        if parameters:
            # Filter by specific parameters
            city_data = city_data[city_data['pollutant_id'].isin(parameters)]
        
        return self._convert_to_data_points(city_data)
    
    def get_data_by_coordinates(self, lat: float, lon: float, radius_km: float = 50) -> List[CPCBDataPoint]:
        """Get CPCB data within a radius of given coordinates."""
        df = self._load_csv_data()
        
        if df.empty:
            return []
        
        # Simple distance calculation (approximate)
        df['distance'] = ((df['latitude'] - lat) ** 2 + (df['longitude'] - lon) ** 2) ** 0.5
        df['distance_km'] = df['distance'] * 111  # Rough conversion to km
        
        # Filter by radius
        nearby_data = df[df['distance_km'] <= radius_km]
        
        return self._convert_to_data_points(nearby_data)
    
    def get_latest_data(self, limit: int = 100) -> List[CPCBDataPoint]:
        """Get latest CPCB data points."""
        df = self._load_csv_data()
        
        if df.empty:
            return []
        
        # Sort by timestamp and get latest
        latest_data = df.nlargest(limit, 'last_update')
        
        return self._convert_to_data_points(latest_data)
    
    def get_delhi_data(self) -> List[CPCBDataPoint]:
        """Get all Delhi CPCB data (most comprehensive dataset)."""
        return self.get_data_by_city("Delhi")
    
    def get_major_cities_data(self) -> Dict[str, List[CPCBDataPoint]]:
        """Get data for major Indian cities."""
        major_cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"]
        
        city_data = {}
        for city in major_cities:
            data = self.get_data_by_city(city)
            if data:
                city_data[city] = data
        
        return city_data
    
    def _convert_to_data_points(self, df: pd.DataFrame) -> List[CPCBDataPoint]:
        """Convert DataFrame rows to CPCBDataPoint objects."""
        data_points = []
        
        for _, row in df.iterrows():
            try:
                # Get parameter name and unit
                pollutant = row['pollutant_id']
                param_name, unit = self.parameter_mapping.get(pollutant, (pollutant.lower(), "µg/m³"))
                
                # Create data point
                data_point = CPCBDataPoint(
                    timestamp=row['last_update'],
                    location=(row['latitude'], row['longitude']),
                    parameter=param_name,
                    value=row['pollutant_avg'],
                    unit=unit,
                    source="cpcb_csv",
                    station_id=self._generate_station_id(row['station'], row['city']),
                    station_name=row['station'],
                    city=row['city'],
                    state=row['state'],
                    quality_flag="real_time",
                    metadata={
                        "min_value": row.get('pollutant_min'),
                        "max_value": row.get('pollutant_max'),
                        "data_source": "cpcb_official_csv",
                        "collection_date": "2026-02-04",
                        "note": "Real CPCB data from official monitoring stations"
                    }
                )
                
                data_points.append(data_point)
                
            except Exception as e:
                logger.warning(f"Failed to convert row to data point: {e}")
                continue
        
        return data_points
    
    def _generate_station_id(self, station_name: str, city: str) -> str:
        """Generate a unique station ID."""
        # Create a simple ID from station name and city
        station_clean = station_name.replace(" ", "_").replace(",", "").replace("-", "_")
        city_clean = city.replace(" ", "_")
        return f"CPCB_{city_clean}_{station_clean}"[:50]  # Limit length
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary statistics of the CPCB data."""
        df = self._load_csv_data()
        
        if df.empty:
            return {"error": "No data available"}
        
        summary = {
            "total_records": len(df),
            "unique_stations": df['station'].nunique(),
            "unique_cities": df['city'].nunique(),
            "unique_states": df['state'].nunique(),
            "parameters_available": df['pollutant_id'].unique().tolist(),
            "date_range": {
                "earliest": df['last_update'].min().isoformat(),
                "latest": df['last_update'].max().isoformat()
            },
            "cities_covered": df['city'].unique().tolist(),
            "states_covered": df['state'].unique().tolist(),
            "data_quality": "real_time_official"
        }
        
        return summary
    
    def search_stations(self, query: str) -> List[Dict[str, Any]]:
        """Search for stations by name, city, or state."""
        df = self._load_csv_data()
        
        if df.empty:
            return []
        
        # Search in station name, city, and state
        mask = (
            df['station'].str.contains(query, case=False, na=False) |
            df['city'].str.contains(query, case=False, na=False) |
            df['state'].str.contains(query, case=False, na=False)
        )
        
        search_results = df[mask]
        
        # Get unique stations
        stations = search_results.groupby(['station', 'city', 'state', 'latitude', 'longitude']).agg({
            'pollutant_id': lambda x: list(x.unique()),
            'last_update': 'max'
        }).reset_index()
        
        results = []
        for _, row in stations.iterrows():
            results.append({
                "station_name": row['station'],
                "city": row['city'],
                "state": row['state'],
                "latitude": row['latitude'],
                "longitude": row['longitude'],
                "parameters": row['pollutant_id'],
                "last_update": row['last_update'].isoformat()
            })
        
        return results


# Singleton instance for easy import
_cpcb_csv_client = None

def get_cpcb_csv_client() -> CPCBCSVClient:
    """Get or create CPCB CSV client instance."""
    global _cpcb_csv_client
    if _cpcb_csv_client is None:
        _cpcb_csv_client = CPCBCSVClient()
    return _cpcb_csv_client