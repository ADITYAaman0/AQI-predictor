#!/usr/bin/env python3
"""
LSTM Model Training Script
Demonstrates LSTM time-series forecasting model training and evaluation.
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.lstm_forecaster import LSTMForecaster
from src.api.database import get_db_session
from src.api.models import AirQualityMeasurement, WeatherData

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def create_synthetic_training_data(n_samples: int = 1000) -> pd.DataFrame:
    """
    Create synthetic training data for LSTM model demonstration.
    
    Args:
        n_samples: Number of samples to generate
        
    Returns:
        DataFrame with features and target variable
    """
    logger.info(f"Creating synthetic training data with {n_samples} samples")
    
    # Set random seed for reproducibility
    np.random.seed(42)
    
    # Generate time series
    dates = pd.date_range(start='2023-01-01', periods=n_samples, freq='h')
    
    # Generate realistic air quality patterns
    # Daily pattern (higher pollution during day)
    daily_pattern = 20 * np.sin(2 * np.pi * np.arange(n_samples) / 24 - np.pi/2) + 20
    
    # Weekly pattern (higher pollution on weekdays)
    weekly_pattern = 10 * np.sin(2 * np.pi * np.arange(n_samples) / (24 * 7))
    
    # Seasonal pattern (higher pollution in winter)
    seasonal_pattern = 15 * np.sin(2 * np.pi * np.arange(n_samples) / (24 * 365) + np.pi)
    
    # Random noise
    noise = np.random.normal(0, 8, n_samples)
    
    # Combine patterns
    base_pm25 = 50 + daily_pattern + weekly_pattern + seasonal_pattern + noise
    pm25 = np.maximum(5, base_pm25)  # Ensure positive values
    
    # Generate correlated weather features
    temperature = 25 + 10 * np.sin(2 * np.pi * np.arange(n_samples) / (24 * 365)) + np.random.normal(0, 3, n_samples)
    humidity = 60 + 20 * np.sin(2 * np.pi * np.arange(n_samples) / (24 * 30)) + np.random.normal(0, 10, n_samples)
    humidity = np.clip(humidity, 10, 95)
    
    wind_speed = 3 + 2 * np.random.exponential(1, n_samples)
    wind_speed = np.clip(wind_speed, 0.1, 15)
    
    pressure = 1013 + np.random.normal(0, 10, n_samples)
    
    # Create DataFrame
    data = pd.DataFrame({
        'timestamp': dates,
        'pm25': pm25,
        'temperature': temperature,
        'humidity': humidity,
        'wind_speed': wind_speed,
        'pressure': pressure,
        'hour': dates.hour,
        'day_of_week': dates.dayofweek,
        'month': dates.month,
        'is_weekend': (dates.dayofweek >= 5).astype(int),
        'is_winter': ((dates.month >= 11) | (dates.month <= 2)).astype(int)
    })
    
    # Add lagged features
    data['pm25_lag1'] = data['pm25'].shift(1)
    data['pm25_lag24'] = data['pm25'].shift(24)
    data['temp_lag1'] = data['temperature'].shift(1)
    
    # Remove rows with NaN values
    data = data.dropna().reset_index(drop=True)
    
    logger.info(f"Generated {len(data)} samples with features: {list(data.columns)}")
    return data


def train_lstm_model():
    """Train and evaluate LSTM forecasting model"""
    logger.info("Starting LSTM model training")
    
    try:
        # Create training data
        data = create_synthetic_training_data(n_samples=2000)
        
        # Define features and target
        feature_cols = [
            'temperature', 'humidity', 'wind_speed', 'pressure',
            'hour', 'day_of_week', 'month', 'is_weekend', 'is_winter',
            'pm25_lag1', 'pm25_lag24', 'temp_lag1'
        ]
        
        X = data[feature_cols]
        y = data['pm25']
        
        logger.info(f"Training data shape: X={X.shape}, y={y.shape}")
        
        # Split data (80% train, 20% test)
        split_idx = int(len(data) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        logger.info(f"Train set: {len(X_train)} samples, Test set: {len(X_test)} samples")
        
        # Create LSTM model
        lstm_model = LSTMForecaster(
            sequence_length=24,  # Use 24 hours of history
            features=len(feature_cols)
        )
        
        # Configure for faster training (for demonstration)
        lstm_model.epochs = 20
        lstm_model.batch_size = 32
        lstm_model.early_stopping_patience = 5
        
        # Train model
        logger.info("Training LSTM model...")
        train_metrics = lstm_model.train(X_train, y_train)
        
        logger.info("Training completed!")
        logger.info(f"Training metrics: {train_metrics}")
        
        # Evaluate on test set
        logger.info("Evaluating model on test set...")
        test_metrics = lstm_model.evaluate(X_test, y_test)
        
        logger.info("Evaluation completed!")
        logger.info(f"Test metrics: {test_metrics}")
        
        # Make sample predictions
        logger.info("Making sample predictions...")
        
        # Single prediction
        sample_features = X_test.iloc[:1]
        prediction_result = lstm_model.predict(sample_features, return_confidence=True)
        
        logger.info(f"Sample prediction:")
        logger.info(f"  Predicted PM2.5: {prediction_result['predictions'][0]:.1f} μg/m³")
        logger.info(f"  Confidence interval: [{prediction_result['lower_bound'][0]:.1f}, {prediction_result['upper_bound'][0]:.1f}]")
        logger.info(f"  Uncertainty: {prediction_result['uncertainty']:.3f}")
        
        # Multi-step prediction
        logger.info("Generating 24-hour forecast...")
        initial_data = X_test.iloc[:24]  # Use first 24 hours as initial sequence
        forecast_sequence = lstm_model.predict_sequence(initial_data, hours=24)
        
        logger.info("24-hour forecast:")
        for i, forecast in enumerate(forecast_sequence[:6]):  # Show first 6 hours
            logger.info(f"  Hour {forecast['hour']}: {forecast['pm25']:.1f} μg/m³ "
                       f"[{forecast['pm25_lower']:.1f}, {forecast['pm25_upper']:.1f}]")
        
        # Save model
        model_path = "models/lstm_forecaster.keras"
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        lstm_model.save_model(model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Verify model can be loaded
        logger.info("Testing model loading...")
        loaded_model = LSTMForecaster()
        loaded_model.load_model(model_path)
        
        # Test loaded model
        test_prediction = loaded_model.predict(sample_features, return_confidence=True)
        logger.info(f"Loaded model prediction: {test_prediction['predictions'][0]:.1f} μg/m³")
        
        # Check if model meets accuracy requirements
        rmse_threshold = 20.0  # From requirements
        if test_metrics['rmse'] <= rmse_threshold:
            logger.info(f"✅ Model meets accuracy requirement: RMSE {test_metrics['rmse']:.2f} ≤ {rmse_threshold}")
        else:
            logger.warning(f"⚠️ Model does not meet accuracy requirement: RMSE {test_metrics['rmse']:.2f} > {rmse_threshold}")
        
        return {
            'train_metrics': train_metrics,
            'test_metrics': test_metrics,
            'model_path': model_path,
            'meets_requirements': test_metrics['rmse'] <= rmse_threshold
        }
        
    except Exception as e:
        logger.error(f"Error during LSTM training: {e}")
        raise


def main():
    """Main function"""
    logger.info("LSTM Model Training Script")
    logger.info("=" * 50)
    
    try:
        results = train_lstm_model()
        
        logger.info("=" * 50)
        logger.info("Training Summary:")
        logger.info(f"✅ LSTM model training completed successfully")
        logger.info(f"📊 Test RMSE: {results['test_metrics']['rmse']:.2f} μg/m³")
        logger.info(f"📊 Test MAE: {results['test_metrics']['mae']:.2f} μg/m³")
        logger.info(f"📊 Accuracy within 10%: {results['test_metrics']['within_10_percent']:.1f}%")
        logger.info(f"📊 Accuracy within 20%: {results['test_metrics']['within_20_percent']:.1f}%")
        logger.info(f"💾 Model saved to: {results['model_path']}")
        
        if results['meets_requirements']:
            logger.info("🎯 Model meets PRD accuracy requirements!")
        else:
            logger.info("⚠️ Model needs improvement to meet PRD requirements")
        
        return 0
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return 1


if __name__ == "__main__":
    exit(main())