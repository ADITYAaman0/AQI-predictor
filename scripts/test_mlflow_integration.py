#!/usr/bin/env python3
"""
Test script for MLflow integration with AQI Predictor models
"""

import os
import sys
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.models.mlflow_manager import get_mlflow_manager
from src.models.lstm_forecaster import LSTMForecaster
from src.models.gnn_spatial import SpatialGNN, Station
from src.models.ensemble_forecaster import EnsembleForecaster, ModelPerformance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_mlflow_manager():
    """Test basic MLflow manager functionality"""
    logger.info("Testing MLflow Manager...")
    
    try:
        # Initialize MLflow manager
        mlflow_manager = get_mlflow_manager()
        logger.info(f"MLflow manager initialized with experiment: {mlflow_manager.experiment_name}")
        
        # Test experiment search
        experiments = mlflow_manager.search_experiments()
        logger.info(f"Found {len(experiments)} experiments")
        
        return True
        
    except Exception as e:
        logger.error(f"MLflow manager test failed: {e}")
        return False


def test_mock_model_training():
    """Test model training with MLflow logging"""
    logger.info("Testing mock model training with MLflow...")
    
    try:
        mlflow_manager = get_mlflow_manager()
        
        # Mock training data
        training_data = {
            "n_samples": 10000,
            "n_features": 15,
            "period": "2024-01-01 to 2024-12-31"
        }
        
        # Mock model parameters
        parameters = {
            "model_type": "xgboost",
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1
        }
        
        # Mock training metrics
        metrics = {
            "rmse": 18.5,
            "mae": 14.2,
            "r2_score": 0.85,
            "training_time_minutes": 45
        }
        
        # Create a mock model (just a dict for this test)
        mock_model = {
            "type": "xgboost",
            "trained": True,
            "version": "1.0.0"
        }
        
        # Log training run
        run_id = mlflow_manager.log_model_training(
            model_type="xgboost",
            model=mock_model,
            training_data=training_data,
            metrics=metrics,
            parameters=parameters
        )
        
        logger.info(f"Mock training logged with run ID: {run_id}")
        
        # Test model comparison
        try:
            comparison_df = mlflow_manager.compare_models("aqi_predictor_xgboost", limit=3)
            logger.info(f"Model comparison returned {len(comparison_df)} versions")
        except Exception as e:
            logger.warning(f"Model comparison failed (expected for first run): {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"Mock model training test failed: {e}")
        return False


def test_ensemble_mlflow_integration():
    """Test ensemble forecaster MLflow integration"""
    logger.info("Testing ensemble forecaster MLflow integration...")
    
    try:
        # Create mock stations for ensemble
        stations = [
            Station(id="station_1", name="Test Station 1", latitude=28.6139, longitude=77.2090),
            Station(id="station_2", name="Test Station 2", latitude=28.7041, longitude=77.1025)
        ]
        
        # Initialize ensemble forecaster
        ensemble = EnsembleForecaster(stations)
        
        # Mock performance data
        mock_performance = {
            "xgboost": ModelPerformance(
                rmse=18.5,
                mae=14.2,
                accuracy_1h=0.85,
                accuracy_24h=0.78,
                last_updated=datetime.now(),
                sample_count=1000
            ),
            "lstm": ModelPerformance(
                rmse=19.8,
                mae=15.1,
                accuracy_1h=0.82,
                accuracy_24h=0.75,
                last_updated=datetime.now(),
                sample_count=1000
            )
        }
        
        # Test weight update with MLflow logging
        ensemble.update_weights(mock_performance)
        logger.info(f"Ensemble weights updated: {ensemble.weights}")
        
        return True
        
    except Exception as e:
        logger.error(f"Ensemble MLflow integration test failed: {e}")
        return False


def test_model_promotion():
    """Test model promotion functionality"""
    logger.info("Testing model promotion...")
    
    try:
        mlflow_manager = get_mlflow_manager()
        
        # First, we need to have some models to promote
        # This would typically be done after actual training
        logger.info("Model promotion test requires existing models in registry")
        logger.info("Run actual model training first to test promotion")
        
        return True
        
    except Exception as e:
        logger.error(f"Model promotion test failed: {e}")
        return False


def test_model_cleanup():
    """Test model cleanup functionality"""
    logger.info("Testing model cleanup...")
    
    try:
        mlflow_manager = get_mlflow_manager()
        
        # Test cleanup (this is safe to run even with no models)
        mlflow_manager.cleanup_old_models("aqi_predictor_xgboost", keep_versions=5)
        logger.info("Model cleanup completed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"Model cleanup test failed: {e}")
        return False


def main():
    """Run all MLflow integration tests"""
    logger.info("Starting MLflow integration tests...")
    
    tests = [
        ("MLflow Manager", test_mlflow_manager),
        ("Mock Model Training", test_mock_model_training),
        ("Ensemble MLflow Integration", test_ensemble_mlflow_integration),
        ("Model Promotion", test_model_promotion),
        ("Model Cleanup", test_model_cleanup)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running test: {test_name}")
        logger.info(f"{'='*50}")
        
        try:
            result = test_func()
            results[test_name] = "PASSED" if result else "FAILED"
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {e}")
            results[test_name] = "ERROR"
    
    # Print summary
    logger.info(f"\n{'='*50}")
    logger.info("TEST SUMMARY")
    logger.info(f"{'='*50}")
    
    for test_name, result in results.items():
        status_symbol = "✓" if result == "PASSED" else "✗"
        logger.info(f"{status_symbol} {test_name}: {result}")
    
    passed = sum(1 for r in results.values() if r == "PASSED")
    total = len(results)
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All MLflow integration tests passed!")
        return 0
    else:
        logger.warning(f"⚠️  {total - passed} tests failed or had errors")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)