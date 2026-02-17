#!/usr/bin/env python3
"""
Simple LSTM Test
Quick test to verify LSTM model functionality.
"""

import sys
import os
import pandas as pd
import numpy as np
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.lstm_forecaster import LSTMForecaster

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_lstm_basic():
    """Test basic LSTM functionality"""
    logger.info("Testing basic LSTM functionality")
    
    try:
        # Create LSTM model
        lstm_model = LSTMForecaster(sequence_length=12, features=5)
        
        # Create simple training data
        np.random.seed(42)
        n_samples = 100
        
        # Simple features
        X = pd.DataFrame({
            'temp': 25 + np.random.normal(0, 5, n_samples),
            'humidity': 60 + np.random.normal(0, 10, n_samples),
            'wind': 3 + np.random.exponential(1, n_samples),
            'hour': np.random.randint(0, 24, n_samples),
            'pm25_lag': 50 + np.random.normal(0, 10, n_samples)
        })
        
        # Simple target
        y = pd.Series(50 + 10 * np.sin(np.arange(n_samples) * 0.1) + np.random.normal(0, 5, n_samples))
        
        # Quick training
        lstm_model.epochs = 3
        lstm_model.batch_size = 8
        
        logger.info("Training LSTM model...")
        train_metrics = lstm_model.train(X, y)
        logger.info(f"Training completed: RMSE={train_metrics['train_rmse']:.2f}")
        
        # Test prediction
        test_features = pd.DataFrame([{
            'temp': 25.0,
            'humidity': 60.0,
            'wind': 3.0,
            'hour': 12,
            'pm25_lag': 50.0
        }])
        
        logger.info("Making prediction...")
        result = lstm_model.predict(test_features, return_confidence=True)
        
        logger.info(f"✅ Prediction: {result['predictions'][0]:.1f} μg/m³")
        logger.info(f"✅ Confidence interval: [{result['lower_bound'][0]:.1f}, {result['upper_bound'][0]:.1f}]")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ LSTM test failed: {e}")
        return False


def main():
    """Main function"""
    logger.info("Simple LSTM Test")
    logger.info("=" * 30)
    
    success = test_lstm_basic()
    
    logger.info("=" * 30)
    if success:
        logger.info("🎯 LSTM test PASSED!")
        return 0
    else:
        logger.error("❌ LSTM test FAILED!")
        return 1


if __name__ == "__main__":
    exit(main())