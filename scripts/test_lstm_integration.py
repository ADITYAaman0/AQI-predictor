#!/usr/bin/env python3
"""
LSTM Integration Test
Tests LSTM model integration with the ensemble forecaster.
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.lstm_forecaster import LSTMForecaster, get_lstm_forecaster
from src.models.ensemble_forecaster import EnsembleForecaster
from src.models.gnn_spatial import Station

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_lstm_integration():
    """Test LSTM model integration with ensemble forecaster"""
    logger.info("Testing LSTM integration with ensemble forecaster")
    
    try:
        # Create sample stations for ensemble
        stations = [
            Station(id="station_1", name="Station 1", latitude=28.6139, longitude=77.2090),
            Station(id="station_2", name="Station 2", latitude=28.6500, longitude=77.2300)
        ]
        
        # Create ensemble forecaster
        ensemble = EnsembleForecaster(stations=stations)
        
        # Check if LSTM model is available in ensemble
        if ensemble.lstm_model is None:
            logger.error("❌ LSTM model not available in ensemble")
            return False
        
        logger.info("✅ LSTM model successfully integrated into ensemble")
        
        # Create sample features for prediction (match the training features)
        features = pd.DataFrame([{
            'temperature': 25.0,
            'humidity': 60.0,
            'wind_speed': 3.0,
            'pressure': 1013.0,
            'hour': 12,
            'day_of_week': 1,
            'month': 6,
            'is_weekend': 0,
            'is_winter': 0,
            'pm25_lag1': 50.0,
            'pm25_lag24': 45.0,
            'temp_lag1': 24.0
        }])
        
        logger.info("Testing ensemble prediction with LSTM...")
        
        # Test ensemble prediction
        try:
            prediction = ensemble.predict(features, return_individual=True)
            
            logger.info("✅ Ensemble prediction successful!")
            logger.info(f"📊 Ensemble PM2.5: {prediction.pm25} μg/m³")
            logger.info(f"📊 Confidence interval: [{prediction.pm25_lower}, {prediction.pm25_upper}]")
            logger.info(f"📊 AQI: {prediction.aqi} ({prediction.category})")
            logger.info(f"📊 Confidence: {prediction.confidence:.2f}")
            
            # Check if LSTM contributed to the prediction
            if 'lstm' in prediction.individual_predictions:
                lstm_pred = prediction.individual_predictions['lstm']
                logger.info(f"📊 LSTM contribution: {lstm_pred:.1f} μg/m³")
                logger.info(f"📊 LSTM weight: {prediction.model_weights.get('lstm', 0):.2f}")
            else:
                logger.warning("⚠️ LSTM did not contribute to prediction (model may not be trained)")
            
            # Test direct LSTM prediction
            logger.info("Testing direct LSTM prediction...")
            
            # Get LSTM model directly
            lstm_model = LSTMForecaster(
                sequence_length=24,
                features=len(features.columns)  # Use actual feature count
            )
            
            if not lstm_model.is_trained:
                logger.info("🔧 LSTM model not trained, training with sample data...")
                
                # Create minimal training data with same features as prediction
                np.random.seed(42)
                n_samples = 200
                dates = pd.date_range(start='2024-01-01', periods=n_samples, freq='h')
                
                # Generate synthetic data
                pm25 = 50 + 20 * np.sin(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 5, n_samples)
                pm25 = np.maximum(5, pm25)
                
                train_data = pd.DataFrame({
                    'temperature': 25 + np.random.normal(0, 5, n_samples),
                    'humidity': 60 + np.random.normal(0, 10, n_samples),
                    'wind_speed': 3 + np.random.exponential(1, n_samples),
                    'pressure': 1013 + np.random.normal(0, 10, n_samples),
                    'hour': dates.hour,
                    'day_of_week': dates.dayofweek,
                    'month': dates.month,
                    'is_weekend': (dates.dayofweek >= 5).astype(int),
                    'is_winter': ((dates.month >= 11) | (dates.month <= 2)).astype(int),
                    'pm25_lag1': np.roll(pm25, 1),
                    'pm25_lag24': np.roll(pm25, 24),
                    'temp_lag1': np.roll(25 + np.random.normal(0, 5, n_samples), 1),
                    'pm25': pm25
                })
                
                # Remove rows with NaN
                train_data = train_data.iloc[24:].reset_index(drop=True)
                
                feature_cols = [col for col in train_data.columns if col != 'pm25']
                X_train = train_data[feature_cols]
                y_train = train_data['pm25']
                
                # Quick training
                lstm_model.epochs = 5
                lstm_model.batch_size = 16
                
                train_metrics = lstm_model.train(X_train, y_train)
                logger.info(f"🔧 LSTM training completed: RMSE={train_metrics['train_rmse']:.2f}")
            
            # Test direct LSTM prediction
            lstm_result = lstm_model.predict(features, return_confidence=True)
            logger.info(f"✅ Direct LSTM prediction: {lstm_result['predictions'][0]:.1f} μg/m³")
            logger.info(f"📊 LSTM confidence interval: [{lstm_result['lower_bound'][0]:.1f}, {lstm_result['upper_bound'][0]:.1f}]")
            
            # Test multi-step prediction
            logger.info("Testing LSTM 6-hour forecast...")
            forecast = lstm_model.predict_sequence(features, hours=6)
            
            logger.info("📊 6-hour LSTM forecast:")
            for i, pred in enumerate(forecast):
                logger.info(f"  Hour {pred['hour']}: {pred['pm25']:.1f} μg/m³ [{pred['pm25_lower']:.1f}, {pred['pm25_upper']:.1f}]")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ensemble prediction failed: {e}")
            return False
        
    except Exception as e:
        logger.error(f"❌ LSTM integration test failed: {e}")
        return False


def main():
    """Main function"""
    logger.info("LSTM Integration Test")
    logger.info("=" * 50)
    
    success = test_lstm_integration()
    
    logger.info("=" * 50)
    if success:
        logger.info("🎯 LSTM integration test PASSED!")
        logger.info("✅ LSTM model is properly integrated with the ensemble forecaster")
        return 0
    else:
        logger.error("❌ LSTM integration test FAILED!")
        return 1


if __name__ == "__main__":
    exit(main())