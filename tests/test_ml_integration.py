"""
Integration tests for ML models
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.forecaster import AQIForecaster
from src.models.ensemble_forecaster import EnsembleForecaster
from src.models.gnn_spatial import Station


class TestMLIntegration:
    """Integration tests for ML model system"""
    
    def test_xgboost_forecaster_basic_functionality(self):
        """Test that XGBoost forecaster works with basic data"""
        forecaster = AQIForecaster()
        
        # Create sample data
        data = pd.DataFrame({
            'timestamp': pd.date_range('2024-01-01', periods=10, freq='h'),
            'temperature': [25] * 10,
            'humidity': [60] * 10,
            'wind_speed': [3] * 10,
            'hour': list(range(10)),
            'pm25_current': [50] * 10
        })
        
        # Test prediction (should use rule-based since no trained model)
        result = forecaster.predict(data)
        
        assert 'predictions' in result
        assert len(result['predictions']) == len(data)
        assert all(pred >= 0 for pred in result['predictions'])
    
    def test_ensemble_forecaster_basic_functionality(self):
        """Test that ensemble forecaster works with available models"""
        stations = [
            Station(id="test1", name="Test 1", latitude=28.6, longitude=77.2),
            Station(id="test2", name="Test 2", latitude=28.7, longitude=77.3)
        ]
        
        ensemble = EnsembleForecaster(stations=stations)
        
        # Create sample features
        features = pd.DataFrame([{
            'temperature': 25.0,
            'humidity': 60.0,
            'wind_speed': 3.0,
            'hour': 12,
            'day_of_week': 1,
            'is_weekend': 0,
            'pm25_lag1': 50.0
        }])
        
        # Test prediction
        prediction = ensemble.predict(features)
        
        assert prediction.pm25 >= 0
        assert prediction.aqi >= 0
        assert prediction.category in ['good', 'moderate', 'unhealthy_sensitive', 
                                     'unhealthy', 'very_unhealthy', 'hazardous']
        assert 0 <= prediction.confidence <= 1
        assert prediction.pm25_lower <= prediction.pm25 <= prediction.pm25_upper
    
    def test_ensemble_model_status(self):
        """Test that ensemble can report model status"""
        ensemble = EnsembleForecaster()
        status = ensemble.get_model_status()
        
        assert 'ensemble_weights' in status
        assert 'models' in status
        assert 'xgboost' in status['models']
        assert status['models']['xgboost']['available'] is True
    
    def test_ensemble_forecast_sequence(self):
        """Test multi-step forecasting"""
        ensemble = EnsembleForecaster()
        
        initial_features = pd.DataFrame([{
            'temperature': 25.0,
            'humidity': 60.0,
            'wind_speed': 3.0,
            'hour': 12,
            'day_of_week': 1,
            'is_weekend': 0,
            'pm25_lag1': 50.0
        }])
        
        weather_forecast = [
            {'temperature': 26, 'humidity': 55, 'wind_speed': 4},
            {'temperature': 27, 'humidity': 50, 'wind_speed': 5},
            {'temperature': 28, 'humidity': 45, 'wind_speed': 6}
        ]
        
        forecasts = ensemble.forecast_sequence(
            initial_features, weather_forecast, hours=3
        )
        
        assert len(forecasts) == 3
        for i, forecast in enumerate(forecasts):
            assert forecast.pm25 >= 0
            # Check that timestamp is in the future
            assert forecast.timestamp > datetime.now()
            assert forecast.pm25_lower <= forecast.pm25 <= forecast.pm25_upper


if __name__ == '__main__':
    pytest.main([__file__, '-v'])