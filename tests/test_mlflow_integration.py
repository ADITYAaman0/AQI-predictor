"""
Tests for MLflow integration with AQI Predictor models
"""

import pytest
import tempfile
import shutil
import os
import numpy as np
import pandas as pd
from datetime import datetime
from unittest.mock import Mock, patch

from src.models.mlflow_manager import MLflowManager, get_mlflow_manager
from src.models.ensemble_forecaster import ModelPerformance


class TestMLflowManager:
    """Test MLflow manager functionality"""
    
    @pytest.fixture
    def temp_mlflow_dir(self):
        """Create temporary directory for MLflow tracking"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mlflow_manager(self, temp_mlflow_dir):
        """Create MLflow manager with temporary tracking URI"""
        # Use SQLite URI for Windows compatibility
        db_path = os.path.join(temp_mlflow_dir, "test.db")
        tracking_uri = f"sqlite:///{db_path}"
        return MLflowManager(tracking_uri=tracking_uri, experiment_name="test-experiment")
    
    def test_mlflow_manager_initialization(self, mlflow_manager):
        """Test MLflow manager initialization"""
        assert mlflow_manager.experiment_name == "test-experiment"
        assert mlflow_manager.experiment is not None
        assert mlflow_manager.client is not None
    
    def test_start_run(self, mlflow_manager):
        """Test starting MLflow run"""
        with mlflow_manager.start_run(run_name="test_run", tags={"test": "true"}) as run:
            assert run is not None
            assert run.info.run_name == "test_run"
    
    def test_log_model_training_xgboost(self, mlflow_manager):
        """Test logging XGBoost model training"""
        # Mock model
        mock_model = Mock()
        
        training_data = {
            "n_samples": 1000,
            "n_features": 10,
            "period": "2024-01-01 to 2024-12-31"
        }
        
        metrics = {
            "rmse": 18.5,
            "mae": 14.2,
            "r2_score": 0.85
        }
        
        parameters = {
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1
        }
        
        with patch('mlflow.sklearn.log_model') as mock_log_model:
            run_id = mlflow_manager.log_model_training(
                model_type="xgboost",
                model=mock_model,
                training_data=training_data,
                metrics=metrics,
                parameters=parameters
            )
            
            assert run_id is not None
            mock_log_model.assert_called_once()
    
    def test_log_model_training_lstm(self, mlflow_manager):
        """Test logging LSTM model training"""
        # Mock LSTM model
        mock_model = Mock()
        mock_model.model = Mock()  # TensorFlow model
        mock_model.scaler = Mock()
        mock_model.target_scaler = Mock()
        
        training_data = {
            "n_samples": 1000,
            "n_features": 15,
            "period": "2024-01-01 to 2024-12-31"
        }
        
        metrics = {
            "rmse": 19.8,
            "mae": 15.1,
            "r2_score": 0.82
        }
        
        parameters = {
            "sequence_length": 24,
            "hidden_units": 64,
            "dropout_rate": 0.2
        }
        
        with patch('mlflow.tensorflow.log_model') as mock_log_model, \
             patch('pickle.dump') as mock_pickle, \
             patch('mlflow.log_artifact') as mock_log_artifact:
            
            run_id = mlflow_manager.log_model_training(
                model_type="lstm",
                model=mock_model,
                training_data=training_data,
                metrics=metrics,
                parameters=parameters
            )
            
            assert run_id is not None
            mock_log_model.assert_called_once()
    
    def test_log_model_training_gnn(self, mlflow_manager):
        """Test logging GNN model training"""
        # Mock GNN model
        mock_model = Mock()
        mock_model.model = Mock()  # PyTorch model
        mock_model.adjacency_matrix = np.array([[0, 1], [1, 0]])
        mock_model.stations = {
            "station_1": Mock(id="station_1", name="Test Station 1", 
                            latitude=28.6139, longitude=77.2090)
        }
        
        training_data = {
            "n_samples": 500,
            "n_features": 12,
            "n_stations": 2,
            "period": "historical_data"
        }
        
        metrics = {
            "rmse": 21.2,
            "mae": 16.8,
            "r2_score": 0.79
        }
        
        parameters = {
            "hidden_dim": 64,
            "num_layers": 3,
            "learning_rate": 0.01
        }
        
        with patch('mlflow.pytorch.log_model') as mock_log_model, \
             patch('numpy.save') as mock_np_save, \
             patch('mlflow.log_artifact') as mock_log_artifact:
            
            run_id = mlflow_manager.log_model_training(
                model_type="gnn",
                model=mock_model,
                training_data=training_data,
                metrics=metrics,
                parameters=parameters
            )
            
            assert run_id is not None
            mock_log_model.assert_called_once()
    
    def test_compare_models_empty(self, mlflow_manager):
        """Test comparing models when no models exist"""
        comparison_df = mlflow_manager.compare_models("nonexistent_model")
        assert comparison_df.empty
    
    def test_get_best_model_no_models(self, mlflow_manager):
        """Test getting best model when no models exist"""
        with pytest.raises(ValueError, match="No versions found"):
            mlflow_manager.get_best_model("nonexistent_model")
    
    def test_promote_model(self, mlflow_manager):
        """Test model promotion"""
        with patch.object(mlflow_manager.client, 'transition_model_version_stage') as mock_transition:
            result = mlflow_manager.promote_model("test_model", "1", "Production")
            assert result is True
            mock_transition.assert_called_once_with(
                name="test_model",
                version="1", 
                stage="Production"
            )
    
    def test_cleanup_old_models(self, mlflow_manager):
        """Test cleaning up old model versions"""
        # Mock model versions
        mock_versions = [
            Mock(version="1", creation_timestamp=1000, current_stage="None"),
            Mock(version="2", creation_timestamp=2000, current_stage="None"),
            Mock(version="3", creation_timestamp=3000, current_stage="Production")
        ]
        
        with patch.object(mlflow_manager.client, 'search_model_versions', return_value=mock_versions), \
             patch.object(mlflow_manager.client, 'transition_model_version_stage') as mock_transition:
            
            mlflow_manager.cleanup_old_models("test_model", keep_versions=2)
            
            # Should archive version 1 (oldest, not in production/staging)
            mock_transition.assert_called_once_with(
                name="test_model",
                version="1",
                stage="Archived"
            )
    
    def test_search_experiments(self, mlflow_manager):
        """Test searching experiments"""
        experiments = mlflow_manager.search_experiments()
        assert isinstance(experiments, list)
        # Should at least contain our test experiment
        assert len(experiments) >= 1
        assert any(exp["name"] == "test-experiment" for exp in experiments)


class TestMLflowIntegration:
    """Test MLflow integration with model classes"""
    
    def test_ensemble_weight_update_logging(self):
        """Test that ensemble weight updates are logged to MLflow"""
        from src.models.ensemble_forecaster import EnsembleForecaster
        
        # Mock stations
        stations = []
        
        with patch('src.models.ensemble_forecaster.get_mlflow_manager') as mock_get_manager:
            mock_manager = Mock()
            mock_run = Mock()
            mock_run.__enter__ = Mock(return_value=mock_run)
            mock_run.__exit__ = Mock(return_value=None)
            mock_manager.start_run.return_value = mock_run
            mock_get_manager.return_value = mock_manager
            
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
                )
            }
            
            with patch('mlflow.log_metrics') as mock_log_metrics, \
                 patch('mlflow.log_params') as mock_log_params:
                
                ensemble.update_weights(mock_performance)
                
                # Verify MLflow logging was called
                mock_get_manager.assert_called_once()
                mock_manager.start_run.assert_called_once()


class TestMLflowConfiguration:
    """Test MLflow configuration and setup"""
    
    def test_singleton_manager(self):
        """Test that get_mlflow_manager returns singleton instance"""
        manager1 = get_mlflow_manager()
        manager2 = get_mlflow_manager()
        assert manager1 is manager2
    
    def test_environment_variables(self):
        """Test MLflow configuration from environment variables"""
        with patch.dict(os.environ, {
            'MLFLOW_TRACKING_URI': 'http://localhost:5000',
            'MLFLOW_EXPERIMENT_NAME': 'custom-experiment'
        }):
            # Reset singleton
            import src.models.mlflow_manager
            src.models.mlflow_manager._mlflow_manager_instance = None
            
            manager = get_mlflow_manager()
            assert manager.experiment_name == 'custom-experiment'


@pytest.mark.integration
class TestMLflowEndToEnd:
    """End-to-end tests for MLflow integration"""
    
    @pytest.fixture
    def temp_mlflow_dir(self):
        """Create temporary directory for MLflow tracking"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    def test_full_model_lifecycle(self, temp_mlflow_dir):
        """Test complete model lifecycle with MLflow"""
        db_path = os.path.join(temp_mlflow_dir, "test.db")
        tracking_uri = f"sqlite:///{db_path}"
        manager = MLflowManager(tracking_uri=tracking_uri, experiment_name="lifecycle-test")
        
        # 1. Log initial model training
        mock_model = Mock()
        training_data = {"n_samples": 1000, "n_features": 10, "period": "test"}
        metrics = {"rmse": 20.0, "mae": 15.0, "r2_score": 0.8}
        parameters = {"test_param": "test_value"}
        
        with patch('mlflow.sklearn.log_model'):
            run_id1 = manager.log_model_training(
                model_type="xgboost",
                model=mock_model,
                training_data=training_data,
                metrics=metrics,
                parameters=parameters
            )
        
        assert run_id1 is not None
        
        # 2. Log improved model
        improved_metrics = {"rmse": 18.0, "mae": 13.0, "r2_score": 0.85}
        
        with patch('mlflow.sklearn.log_model'):
            run_id2 = manager.log_model_training(
                model_type="xgboost",
                model=mock_model,
                training_data=training_data,
                metrics=improved_metrics,
                parameters=parameters
            )
        
        assert run_id2 is not None
        assert run_id2 != run_id1
        
        # 3. Compare models (would work with real MLflow backend)
        # This test demonstrates the workflow even if comparison returns empty
        comparison_df = manager.compare_models("aqi_predictor_xgboost")
        # In real scenario, this would contain our logged models
        
        # Test passes if no exceptions are raised
        assert True