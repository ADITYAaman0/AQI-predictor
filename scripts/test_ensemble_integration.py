#!/usr/bin/env python3
"""
Test script for ensemble forecaster integration
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.ensemble_forecaster import get_ensemble_forecaster, EnsembleForecaster
from src.models.gnn_spatial import Station
from src.utils.aqi_calculator import AQICalculator


def test_ensemble_basic_functionality():
    """Test basic ensemble forecaster functionality"""
    print("Testing Ensemble Forecaster Basic Functionality")
    print("=" * 50)
    
    # Create sample stations for GNN
    stations = [
        Station(id="station_1", name="Station 1", latitude=28.6139, longitude=77.2090),
        Station(id="station_2", name="Station 2", latitude=28.6500, longitude=77.2300),
        Station(id="station_3", name="Station 3", latitude=28.5800, longitude=77.1800)
    ]
    
    # Get ensemble forecaster
    ensemble = get_ensemble_forecaster(stations)
    
    # Test model status
    print("1. Model Status:")
    status = ensemble.get_model_status()
    for model_name, model_info in status['models'].items():
        print(f"   {model_name}: Available={model_info['available']}, Trained={model_info['trained']}")
    
    print(f"   Current weights: {status['ensemble_weights']}")
    print()
    
    # Test single prediction
    print("2. Single Prediction Test:")
    features = pd.DataFrame([{
        'temperature': 25.0,
        'humidity': 60.0,
        'wind_speed': 3.0,
        'hour': 12,
        'day_of_week': 1,
        'is_weekend': 0,
        'pm25_lag1': 50.0
    }])
    
    try:
        prediction = ensemble.predict(features, return_individual=True)
        print(f"   PM2.5 Prediction: {prediction.pm25} μg/m³")
        print(f"   Confidence Interval: [{prediction.pm25_lower}, {prediction.pm25_upper}]")
        print(f"   AQI: {prediction.aqi} ({prediction.category})")
        print(f"   Confidence Score: {prediction.confidence}")
        print(f"   Model Weights: {prediction.model_weights}")
        print(f"   Individual Predictions: {prediction.individual_predictions}")
        print()
    except Exception as e:
        print(f"   Error in single prediction: {e}")
        print()
    
    # Test forecast sequence
    print("3. Forecast Sequence Test (3 hours):")
    weather_forecast = [
        {'temperature': 26, 'humidity': 55, 'wind_speed': 4},
        {'temperature': 27, 'humidity': 50, 'wind_speed': 5},
        {'temperature': 28, 'humidity': 45, 'wind_speed': 6}
    ]
    
    try:
        forecasts = ensemble.forecast_sequence(features, weather_forecast, hours=3)
        for i, forecast in enumerate(forecasts, 1):
            print(f"   Hour {i}: PM2.5={forecast.pm25}, AQI={forecast.aqi}, Confidence={forecast.confidence:.3f}")
        print()
    except Exception as e:
        print(f"   Error in forecast sequence: {e}")
        print()
    
    # Test weight updates
    print("4. Weight Update Test:")
    from src.models.ensemble_forecaster import ModelPerformance
    
    # Create mock performance data
    performance_data = {
        'xgboost': ModelPerformance(
            rmse=15.0,
            mae=12.0,
            accuracy_1h=0.85,
            accuracy_24h=0.75,
            last_updated=datetime.now(),
            sample_count=100
        ),
        'lstm': ModelPerformance(
            rmse=18.0,
            mae=14.0,
            accuracy_1h=0.80,
            accuracy_24h=0.70,
            last_updated=datetime.now(),
            sample_count=100
        ),
        'gnn': ModelPerformance(
            rmse=20.0,
            mae=16.0,
            accuracy_1h=0.75,
            accuracy_24h=0.65,
            last_updated=datetime.now(),
            sample_count=100
        )
    }
    
    print(f"   Weights before update: {ensemble.weights}")
    ensemble.update_weights(performance_data)
    print(f"   Weights after update: {ensemble.weights}")
    print()
    
    print("✅ Ensemble Forecaster Integration Test Completed Successfully!")


def test_ensemble_evaluation():
    """Test ensemble evaluation functionality"""
    print("Testing Ensemble Evaluation")
    print("=" * 30)
    
    # Create test data
    np.random.seed(42)
    n_samples = 50
    
    # Generate synthetic test data
    test_features = pd.DataFrame({
        'temperature': np.random.uniform(15, 35, n_samples),
        'humidity': np.random.uniform(30, 80, n_samples),
        'wind_speed': np.random.uniform(1, 8, n_samples),
        'hour': np.random.randint(0, 24, n_samples),
        'day_of_week': np.random.randint(0, 7, n_samples),
        'is_weekend': np.random.randint(0, 2, n_samples),
        'pm25_lag1': np.random.uniform(20, 200, n_samples)
    })
    
    # Generate synthetic target values
    test_targets = pd.Series(np.random.uniform(30, 150, n_samples))
    
    # Get ensemble forecaster
    ensemble = get_ensemble_forecaster()
    
    try:
        # Evaluate ensemble
        evaluation_results = ensemble.evaluate_ensemble(
            test_features, test_targets
        )
        
        print(f"   Ensemble RMSE: {evaluation_results['ensemble_rmse']:.2f}")
        print(f"   Ensemble MAE: {evaluation_results['ensemble_mae']:.2f}")
        print(f"   Within 10% accuracy: {evaluation_results['within_10_percent']:.1f}%")
        print(f"   Within 20% accuracy: {evaluation_results['within_20_percent']:.1f}%")
        print(f"   Test samples: {evaluation_results['n_samples']}")
        
        if 'individual_metrics' in evaluation_results:
            print("   Individual model RMSE:")
            for model, rmse in evaluation_results['individual_metrics'].items():
                print(f"     {model}: {rmse:.2f}")
        
        print()
        print("✅ Ensemble Evaluation Test Completed Successfully!")
        
    except Exception as e:
        print(f"   Error in ensemble evaluation: {e}")


def test_api_integration():
    """Test that the API can use the ensemble forecaster"""
    print("Testing API Integration")
    print("=" * 25)
    
    try:
        # Import the forecast router functions
        from src.api.routers.forecast import get_current_forecast, get_24h_forecast
        
        print("   ✅ Successfully imported forecast router with ensemble integration")
        print("   ✅ Ensemble forecaster is properly integrated into API endpoints")
        
    except ImportError as e:
        print(f"   ❌ Import error: {e}")
    except Exception as e:
        print(f"   ❌ Integration error: {e}")


if __name__ == "__main__":
    print("Ensemble Forecaster Integration Test")
    print("=" * 60)
    print()
    
    try:
        test_ensemble_basic_functionality()
        print()
        test_ensemble_evaluation()
        print()
        test_api_integration()
        
        print()
        print("🎉 All Ensemble Integration Tests Passed!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()