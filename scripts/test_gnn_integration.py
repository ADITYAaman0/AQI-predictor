#!/usr/bin/env python3
"""
Test GNN integration with the ensemble forecasting system
"""

import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.gnn_spatial import SpatialGNN, Station
from src.models.ensemble_forecaster import EnsembleForecaster


def test_gnn_basic_functionality():
    """Test basic GNN functionality"""
    print("Testing GNN basic functionality...")
    
    # Create test stations
    stations = [
        Station(id="test1", name="Test Station 1", latitude=28.6139, longitude=77.2090),
        Station(id="test2", name="Test Station 2", latitude=28.6500, longitude=77.2300),
        Station(id="test3", name="Test Station 3", latitude=28.5800, longitude=77.1800),
    ]
    
    # Initialize GNN
    gnn = SpatialGNN(stations, hidden_dim=32, num_layers=2)
    
    print(f"✅ GNN created with {len(gnn.stations)} stations")
    print(f"   Adjacency matrix shape: {gnn.adjacency_matrix.shape}")
    print(f"   Number of edges: {len(gnn.edge_index[0]) if gnn.edge_index is not None else 0}")
    
    return gnn, stations


def test_gnn_training():
    """Test GNN training with synthetic data"""
    print("\nTesting GNN training...")
    
    gnn, stations = test_gnn_basic_functionality()
    
    # Create synthetic training data
    training_data = {}
    n_samples = 48  # 2 days of hourly data
    
    for station in stations:
        # Generate synthetic features and target
        np.random.seed(hash(station.id) % 2**32)
        
        data = {
            'temperature': 25 + 5 * np.random.randn(n_samples),
            'humidity': 60 + 10 * np.random.randn(n_samples),
            'wind_speed': 3 + 2 * np.random.exponential(1, n_samples),
            'pressure': 1013 + 10 * np.random.randn(n_samples),
            'hour': np.tile(np.arange(24), n_samples // 24 + 1)[:n_samples],
            'day_of_week': np.repeat([1, 2], n_samples // 2 + 1)[:n_samples],
            'is_weekend': np.zeros(n_samples),
            'pm25': 50 + 20 * np.random.randn(n_samples)
        }
        
        training_data[station.id] = pd.DataFrame(data)
    
    # Train the model
    try:
        training_metrics = gnn.train(
            station_data=training_data,
            target_column='pm25',
            epochs=20,
            learning_rate=0.01
        )
        
        print(f"✅ GNN training successful")
        print(f"   Final RMSE: {training_metrics['train_rmse']:.2f}")
        print(f"   Epochs trained: {training_metrics['epochs_trained']}")
        
        return gnn, training_data
        
    except Exception as e:
        print(f"❌ GNN training failed: {e}")
        return None, None


def test_gnn_prediction():
    """Test GNN spatial prediction"""
    print("\nTesting GNN spatial prediction...")
    
    gnn, training_data = test_gnn_training()
    
    if gnn is None:
        print("❌ Cannot test prediction - training failed")
        return None
    
    # Test prediction with sample data
    station_data = {
        'test1': np.array([25.0, 60.0, 3.0, 1013.0, 12, 1, 0]),  # Features for station test1
        'test2': np.array([26.0, 55.0, 4.0, 1015.0, 12, 1, 0]),  # Features for station test2
    }
    
    try:
        predictions = gnn.predict_spatial(station_data)
        
        print(f"✅ GNN prediction successful")
        print(f"   Predictions: {predictions}")
        
        # Test interpolation
        grid_points = [
            (28.62, 77.21),  # Point between stations
            (28.61, 77.20),  # Near station 1
            (28.65, 77.23),  # Near station 2
        ]
        
        interpolated = gnn.interpolate_grid(predictions, grid_points)
        
        print(f"✅ GNN interpolation successful")
        print(f"   Interpolated values: {interpolated}")
        
        return gnn, predictions
        
    except Exception as e:
        print(f"❌ GNN prediction failed: {e}")
        return None, None


def test_ensemble_integration():
    """Test GNN integration with ensemble forecaster"""
    print("\nTesting GNN integration with ensemble forecaster...")
    
    # Create stations for ensemble
    stations = [
        Station(id="ens1", name="Ensemble Station 1", latitude=28.6139, longitude=77.2090),
        Station(id="ens2", name="Ensemble Station 2", latitude=28.6500, longitude=77.2300),
    ]
    
    try:
        # Initialize ensemble with GNN
        ensemble = EnsembleForecaster(stations=stations)
        
        print(f"✅ Ensemble forecaster created")
        
        # Check model status
        status = ensemble.get_model_status()
        print(f"   GNN available: {status['models']['gnn']['available']}")
        print(f"   GNN trained: {status['models']['gnn']['trained']}")
        print(f"   Number of stations: {status['models']['gnn']['num_stations']}")
        
        # Test prediction with ensemble
        features = pd.DataFrame([{
            'temperature': 25.0,
            'humidity': 60.0,
            'wind_speed': 3.0,
            'hour': 12,
            'day_of_week': 1,
            'is_weekend': 0,
            'pm25_lag1': 50.0
        }])
        
        # Station data for GNN
        station_data = {
            'ens1': np.array([25.0, 60.0, 3.0, 180.0, 1013.0, 12, 1, 0]),
            'ens2': np.array([26.0, 55.0, 4.0, 200.0, 1015.0, 12, 1, 0])
        }
        
        prediction = ensemble.predict(features, station_data=station_data, return_individual=True)
        
        print(f"✅ Ensemble prediction successful")
        print(f"   PM2.5: {prediction.pm25} μg/m³")
        print(f"   AQI: {prediction.aqi}")
        print(f"   Category: {prediction.category}")
        print(f"   Confidence: {prediction.confidence:.3f}")
        print(f"   Model weights: {prediction.model_weights}")
        print(f"   Individual predictions: {prediction.individual_predictions}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ensemble integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all GNN integration tests"""
    print("🧪 Testing GNN Integration with AQI Predictor System")
    print("=" * 60)
    
    success_count = 0
    total_tests = 4
    
    # Test 1: Basic functionality
    try:
        test_gnn_basic_functionality()
        success_count += 1
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
    
    # Test 2: Training
    try:
        gnn, _ = test_gnn_training()
        if gnn is not None:
            success_count += 1
    except Exception as e:
        print(f"❌ Training test failed: {e}")
    
    # Test 3: Prediction
    try:
        gnn, _ = test_gnn_prediction()
        if gnn is not None:
            success_count += 1
    except Exception as e:
        print(f"❌ Prediction test failed: {e}")
    
    # Test 4: Ensemble integration
    try:
        if test_ensemble_integration():
            success_count += 1
    except Exception as e:
        print(f"❌ Ensemble integration test failed: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"🧪 Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("✅ All GNN integration tests passed!")
        print("🎉 GNN is successfully integrated with the AQI Predictor system")
    else:
        print(f"⚠️  {total_tests - success_count} tests failed")
        print("🔧 Some GNN functionality may need attention")
    
    return success_count == total_tests


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)