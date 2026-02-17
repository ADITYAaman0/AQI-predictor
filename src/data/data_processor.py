"""
Data Processor - Feature engineering for AQI prediction model
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

from .openaq_client import get_openaq_client
from .weather_client import get_weather_client
from ..utils.aqi_calculator import AQICalculator


class DataProcessor:
    """Process and prepare data for ML models"""
    
    def __init__(self):
        self.openaq = get_openaq_client()
        self.weather = get_weather_client()
        self.aqi_calc = AQICalculator()
    
    def get_current_data(self, city: str = 'Delhi') -> Dict[str, Any]:
        """
        Get current AQI and weather data for a city
        
        Args:
            city: City name
            
        Returns:
            Dictionary with AQI, pollutants, weather, and metadata
        """
        # Get AQI data
        aqi_data = self.openaq.get_city_summary(city)
        pollutants = aqi_data.get('pollutants', {})
        
        # Calculate AQI
        if pollutants:
            aqi_value, dominant, category = self.aqi_calc.calculate_aqi(pollutants)
        else:
            # Generate demo data if no real data
            aqi_value, dominant, category = self._generate_demo_aqi()
            pollutants = self._generate_demo_pollutants(aqi_value)
        
        # Get weather
        weather = self.weather.get_current_weather(city)
        
        return {
            'city': city,
            'aqi': aqi_value,
            'dominant_pollutant': dominant,
            'category': category,
            'category_label': self.aqi_calc.get_category_label(aqi_value),
            'category_description': self.aqi_calc.get_category_description(aqi_value),
            'health_message': self.aqi_calc.get_health_message(aqi_value),
            'color': self.aqi_calc.get_color(aqi_value),
            'pollutants': pollutants,
            'weather': weather,
            'station_count': aqi_data.get('station_count', 0),
            'last_updated': aqi_data.get('last_updated') or datetime.now().isoformat()
        }
    
    def _generate_demo_aqi(self) -> Tuple[int, str, str]:
        """Generate demo AQI for when no real data available"""
        import random
        # Simulate Delhi-like AQI (often moderate to unhealthy)
        aqi = random.randint(80, 200)
        dominant = random.choice(['pm25', 'pm10', 'no2'])
        category = self.aqi_calc.get_category(aqi)
        return aqi, dominant, category
    
    def _generate_demo_pollutants(self, target_aqi: int) -> Dict[str, float]:
        """Generate demo pollutant values based on target AQI"""
        import random
        
        # Approximate pollutant values for given AQI
        base_pm25 = target_aqi * 0.4  # Rough conversion
        
        return {
            'pm25': base_pm25 + random.uniform(-10, 10),
            'pm10': base_pm25 * 1.5 + random.uniform(-20, 20),
            'o3': random.uniform(20, 60),
            'no2': random.uniform(30, 80),
            'so2': random.uniform(5, 30),
            'co': random.uniform(0.5, 2.0)
        }
    
    def create_features(self, city: str = 'Delhi', 
                        historical_hours: int = 24) -> pd.DataFrame:
        """
        Create feature dataset for ML model
        
        Args:
            city: City name
            historical_hours: Hours of historical data to include
            
        Returns:
            DataFrame with features
        """
        # Get historical measurements
        measurements = self.openaq.get_measurements(city, hours=historical_hours)
        
        if not measurements:
            # Generate synthetic data for demo
            return self._generate_synthetic_features(historical_hours)
        
        # Convert to DataFrame
        data = []
        for m in measurements:
            timestamp = m.get('date', {}).get('utc')
            if timestamp:
                data.append({
                    'timestamp': pd.to_datetime(timestamp),
                    'parameter': m.get('parameter', '').lower(),
                    'value': m.get('value')
                })
        
        if not data:
            return self._generate_synthetic_features(historical_hours)
        
        df = pd.DataFrame(data)
        
        # Pivot to wide format
        df_pivot = df.pivot_table(
            index='timestamp', 
            columns='parameter', 
            values='value',
            aggfunc='mean'
        ).reset_index()
        
        # Add temporal features
        df_pivot = self._add_temporal_features(df_pivot)
        
        # Add weather features
        weather_features = self.weather.get_weather_features(city)
        for key, value in weather_features.items():
            df_pivot[key] = value
        
        # Add lag features
        df_pivot = self._add_lag_features(df_pivot)
        
        return df_pivot
    
    def _generate_synthetic_features(self, hours: int = 24) -> pd.DataFrame:
        """Generate synthetic feature data for demo/testing"""
        import random
        
        timestamps = [datetime.now() - timedelta(hours=i) for i in range(hours, 0, -1)]
        
        data = []
        base_pm25 = random.uniform(50, 150)
        
        for i, ts in enumerate(timestamps):
            # Add some variation and patterns
            hour_factor = 1 + 0.3 * np.sin(2 * np.pi * ts.hour / 24)  # Daily pattern
            trend = i * 0.5  # Slight trend
            noise = random.uniform(-10, 10)
            
            pm25 = max(0, base_pm25 * hour_factor + trend + noise)
            
            data.append({
                'timestamp': ts,
                'pm25': pm25,
                'pm10': pm25 * 1.5 + random.uniform(-10, 10),
                'o3': random.uniform(20, 60),
                'no2': random.uniform(30, 80) * hour_factor,
                'so2': random.uniform(5, 30),
                'co': random.uniform(0.5, 2.0),
                'temperature': 25 + 10 * np.sin(2 * np.pi * ts.hour / 24),
                'humidity': random.uniform(40, 80),
                'wind_speed': random.uniform(1, 8),
                'pressure': random.uniform(1000, 1020)
            })
        
        df = pd.DataFrame(data)
        df = self._add_temporal_features(df)
        df = self._add_lag_features(df)
        
        return df
    
    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add temporal features to dataframe"""
        if 'timestamp' not in df.columns:
            return df
        
        df = df.copy()
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['month'] = df['timestamp'].dt.month
        
        # Rush hour indicator (8-10 AM and 5-8 PM)
        df['is_rush_hour'] = (
            ((df['hour'] >= 8) & (df['hour'] <= 10)) |
            ((df['hour'] >= 17) & (df['hour'] <= 20))
        ).astype(int)
        
        # Cyclic encoding for hour
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        
        return df
    
    def _add_lag_features(self, df: pd.DataFrame, target_col: str = 'pm25') -> pd.DataFrame:
        """Add lag and rolling features"""
        if target_col not in df.columns:
            return df
        
        df = df.copy()
        
        # Lag features
        for lag in [1, 3, 6, 12, 24]:
            if len(df) > lag:
                df[f'{target_col}_lag_{lag}'] = df[target_col].shift(lag)
        
        # Rolling statistics
        for window in [3, 6, 12, 24]:
            if len(df) > window:
                df[f'{target_col}_roll_mean_{window}'] = (
                    df[target_col].rolling(window, min_periods=1).mean()
                )
                df[f'{target_col}_roll_std_{window}'] = (
                    df[target_col].rolling(window, min_periods=1).std()
                )
        
        # Fill NaN from lag features with forward fill
        df = df.fillna(method='ffill').fillna(method='bfill')
        
        return df
    
    def get_forecast_input(self, city: str = 'Delhi', 
                           forecast_hours: int = 24) -> pd.DataFrame:
        """
        Prepare input data for forecast model
        
        Args:
            city: City name
            forecast_hours: Hours to forecast
            
        Returns:
            DataFrame with features for each forecast hour
        """
        # Get current data and historical features
        current = self.get_current_data(city)
        historical = self.create_features(city, historical_hours=48)
        
        # Get weather forecast
        weather_forecast = self.weather.get_forecast(city, hours=forecast_hours)
        
        # Create forecast input rows
        forecast_data = []
        now = datetime.now()
        
        for hour in range(1, forecast_hours + 1):
            forecast_time = now + timedelta(hours=hour)
            
            # Find matching weather forecast (3-hour resolution)
            weather_idx = min(hour // 3, len(weather_forecast) - 1)
            weather = weather_forecast[weather_idx] if weather_forecast else {}
            
            row = {
                'timestamp': forecast_time,
                'hour': forecast_time.hour,
                'day_of_week': forecast_time.weekday(),
                'is_weekend': 1 if forecast_time.weekday() >= 5 else 0,
                'month': forecast_time.month,
                'is_rush_hour': 1 if (8 <= forecast_time.hour <= 10 or 17 <= forecast_time.hour <= 20) else 0,
                'hour_sin': np.sin(2 * np.pi * forecast_time.hour / 24),
                'hour_cos': np.cos(2 * np.pi * forecast_time.hour / 24),
                'temperature': weather.get('temperature', 25),
                'humidity': weather.get('humidity', 50),
                'wind_speed': weather.get('wind_speed', 3),
                'pressure': weather.get('pressure', 1013),
                # Use current values as baseline
                'pm25_current': current['pollutants'].get('pm25', 100),
                'pm10_current': current['pollutants'].get('pm10', 150)
            }
            
            # Add lag features from historical data
            if len(historical) > 0:
                last_row = historical.iloc[-1]
                for col in historical.columns:
                    if 'lag' in col or 'roll' in col:
                        row[col] = last_row.get(col, 0)
            
            forecast_data.append(row)
        
        return pd.DataFrame(forecast_data)


# Singleton
_processor_instance = None

def get_data_processor() -> DataProcessor:
    """Get or create DataProcessor instance"""
    global _processor_instance
    if _processor_instance is None:
        _processor_instance = DataProcessor()
    return _processor_instance
