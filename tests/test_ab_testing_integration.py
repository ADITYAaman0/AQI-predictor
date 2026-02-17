"""
Integration tests for A/B Testing Framework
Tests the complete A/B testing workflow including API endpoints and middleware.
"""

import pytest
import tempfile
import shutil
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.main import app
from src.models.ab_testing_framework import ABTestingFramework, ExperimentStatus
from src.api.ab_testing_middleware import ABTestingMiddleware


class TestABTestingIntegration:
    """Integration tests for A/B testing framework"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create temporary directory for test storage
        self.temp_dir = tempfile.mkdtemp()
        
        # Create test client
        self.client = TestClient(app)
        
        # Mock authentication for testing
        self.mock_user = MagicMock()
        self.mock_user.id = "test_user_123"
        self.mock_user.email = "test@example.com"
        
        # Patch the authentication dependency
        self.auth_patcher = patch('src.api.routers.ab_testing.get_current_user')
        self.mock_get_current_user = self.auth_patcher.start()
        self.mock_get_current_user.return_value = self.mock_user
        
        # Patch the A/B testing framework to use temp directory
        self.framework_patcher = patch('src.models.ab_testing_framework.get_ab_testing_framework')
        self.mock_get_framework = self.framework_patcher.start()
        self.ab_framework = ABTestingFramework(storage_dir=self.temp_dir)
        self.mock_get_framework.return_value = self.ab_framework
    
    def teardown_method(self):
        """Clean up test fixtures"""
        self.auth_patcher.stop()
        self.framework_patcher.stop()
        
        if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_create_experiment_endpoint(self):
        """Test creating an A/B test experiment via API"""
        experiment_config = {
            "name": "Model Comparison Test",
            "description": "Compare XGBoost vs LSTM models",
            "hypothesis": "LSTM model will have better accuracy than XGBoost",
            "variants": [
                {
                    "variant_id": "control_xgboost",
                    "name": "XGBoost Control",
                    "model_name": "aqi_predictor_xgboost",
                    "model_version": "1.0",
                    "traffic_percentage": 50.0,
                    "is_control": True
                },
                {
                    "variant_id": "treatment_lstm",
                    "name": "LSTM Treatment",
                    "model_name": "aqi_predictor_lstm",
                    "model_version": "2.0",
                    "traffic_percentage": 50.0,
                    "is_control": False
                }
            ],
            "success_metric": "rmse",
            "duration_days": 14,
            "traffic_split_method": "random",
            "minimum_sample_size": 1000,
            "tags": ["model_comparison", "accuracy_test"]
        }
        
        response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "experiment_id" in data
        assert data["name"] == experiment_config["name"]
        assert data["status"] == "draft"
        assert len(data["variants"]) == 2
        
        # Verify experiment was created in framework
        experiment = self.ab_framework.get_experiment(data["experiment_id"])
        assert experiment is not None
        assert experiment.name == experiment_config["name"]
    
    def test_experiment_lifecycle_endpoints(self):
        """Test complete experiment lifecycle through API endpoints"""
        # Create experiment
        experiment_config = {
            "name": "Lifecycle Test",
            "description": "Test experiment lifecycle",
            "hypothesis": "Lifecycle should work correctly",
            "variants": [
                {
                    "variant_id": "control",
                    "name": "Control",
                    "model_name": "control_model",
                    "model_version": "1.0",
                    "traffic_percentage": 60.0,
                    "is_control": True
                },
                {
                    "variant_id": "treatment",
                    "name": "Treatment",
                    "model_name": "treatment_model",
                    "model_version": "2.0",
                    "traffic_percentage": 40.0,
                    "is_control": False
                }
            ]
        }
        
        # Create experiment
        create_response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
        assert create_response.status_code == 200
        experiment_id = create_response.json()["experiment_id"]
        
        # Get experiment details
        get_response = self.client.get(f"/api/v1/ab-testing/experiments/{experiment_id}")
        assert get_response.status_code == 200
        experiment_data = get_response.json()
        assert experiment_data["status"] == "draft"
        
        # Start experiment
        start_response = self.client.post(f"/api/v1/ab-testing/experiments/{experiment_id}/start")
        assert start_response.status_code == 200
        assert start_response.json()["status"] == "running"
        
        # Check status
        status_response = self.client.get(f"/api/v1/ab-testing/experiments/{experiment_id}/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["status"] == "running"
        assert status_data["is_active"] == True
        
        # Assign variants
        assignment_request = {
            "user_id": "test_user_1",
            "location": {"lat": 28.6139, "lon": 77.2090}
        }
        
        assign_response = self.client.post(
            f"/api/v1/ab-testing/experiments/{experiment_id}/assign",
            json=assignment_request
        )
        assert assign_response.status_code == 200
        assignment_data = assign_response.json()
        assert assignment_data["assigned_variant"]["variant_id"] in ["control", "treatment"]
        
        # Record prediction
        prediction_record = {
            "variant_id": assignment_data["assigned_variant"]["variant_id"],
            "prediction_data": {
                "pm25": 85.5,
                "aqi": 156,
                "confidence": 0.85,
                "rmse": 18.2
            },
            "response_time_ms": 245.5,
            "success": True
        }
        
        record_response = self.client.post(
            f"/api/v1/ab-testing/experiments/{experiment_id}/record",
            json=prediction_record
        )
        assert record_response.status_code == 200
        
        # Get metrics
        metrics_response = self.client.get(f"/api/v1/ab-testing/experiments/{experiment_id}/metrics")
        assert metrics_response.status_code == 200
        metrics_data = metrics_response.json()
        assert "variant_metrics" in metrics_data
        assert prediction_record["variant_id"] in metrics_data["variant_metrics"]
        
        # Stop experiment
        stop_response = self.client.post(
            f"/api/v1/ab-testing/experiments/{experiment_id}/stop",
            json={"reason": "test_completed"}
        )
        assert stop_response.status_code == 200
        assert stop_response.json()["status"] == "completed"
    
    def test_list_experiments_endpoint(self):
        """Test listing experiments with filtering"""
        # Create multiple experiments
        for i in range(3):
            experiment_config = {
                "name": f"Test Experiment {i}",
                "description": f"Test experiment number {i}",
                "hypothesis": "Test hypothesis",
                "variants": [
                    {
                        "variant_id": "control",
                        "name": "Control",
                        "model_name": "control_model",
                        "model_version": "1.0",
                        "traffic_percentage": 50.0,
                        "is_control": True
                    },
                    {
                        "variant_id": "treatment",
                        "name": "Treatment",
                        "model_name": "treatment_model",
                        "model_version": "2.0",
                        "traffic_percentage": 50.0,
                        "is_control": False
                    }
                ],
                "tags": ["test", f"experiment_{i}"]
            }
            
            response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
            assert response.status_code == 200
        
        # List all experiments
        list_response = self.client.get("/api/v1/ab-testing/experiments")
        assert list_response.status_code == 200
        list_data = list_response.json()
        assert list_data["total_count"] == 3
        assert len(list_data["experiments"]) == 3
        
        # Test pagination
        paginated_response = self.client.get("/api/v1/ab-testing/experiments?limit=2&offset=1")
        assert paginated_response.status_code == 200
        paginated_data = paginated_response.json()
        assert len(paginated_data["experiments"]) == 2
        assert paginated_data["offset"] == 1
        
        # Test filtering by status
        status_response = self.client.get("/api/v1/ab-testing/experiments?status=draft")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert all(exp["status"] == "draft" for exp in status_data["experiments"])
    
    def test_experiment_analysis_endpoint(self):
        """Test experiment analysis with statistical calculations"""
        # Create and start experiment
        experiment_config = {
            "name": "Analysis Test",
            "description": "Test statistical analysis",
            "hypothesis": "Treatment should be better",
            "variants": [
                {
                    "variant_id": "control",
                    "name": "Control",
                    "model_name": "control_model",
                    "model_version": "1.0",
                    "traffic_percentage": 50.0,
                    "is_control": True
                },
                {
                    "variant_id": "treatment",
                    "name": "Treatment",
                    "model_name": "treatment_model",
                    "model_version": "2.0",
                    "traffic_percentage": 50.0,
                    "is_control": False
                }
            ],
            "success_metric": "rmse",
            "minimum_sample_size": 10  # Low for testing
        }
        
        create_response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
        experiment_id = create_response.json()["experiment_id"]
        
        # Start experiment
        self.client.post(f"/api/v1/ab-testing/experiments/{experiment_id}/start")
        
        # Record multiple predictions for both variants
        for i in range(20):
            variant_id = "control" if i % 2 == 0 else "treatment"
            # Make treatment slightly better (lower RMSE)
            rmse = 20.0 + (i % 5) if variant_id == "control" else 18.0 + (i % 4)
            
            prediction_record = {
                "variant_id": variant_id,
                "prediction_data": {
                    "pm25": 85.5 + i,
                    "aqi": 156 + i,
                    "confidence": 0.8 + (i % 10) / 100,
                    "rmse": rmse
                },
                "response_time_ms": 200 + i * 5,
                "success": True
            }
            
            self.client.post(
                f"/api/v1/ab-testing/experiments/{experiment_id}/record",
                json=prediction_record
            )
        
        # Analyze experiment
        analysis_response = self.client.get(f"/api/v1/ab-testing/experiments/{experiment_id}/analysis")
        assert analysis_response.status_code == 200
        
        analysis_data = analysis_response.json()
        assert "statistical_analysis" in analysis_data
        assert "recommendation" in analysis_data
        assert "detailed_metrics" in analysis_data
        
        # Check statistical analysis fields
        stats = analysis_data["statistical_analysis"]
        assert "p_value" in stats
        assert "effect_size" in stats
        assert "statistical_significance" in stats
        assert "business_significance" in stats
        
        # Check that both variants have metrics
        metrics = analysis_data["detailed_metrics"]
        assert "control" in metrics
        assert "treatment" in metrics
        assert metrics["control"]["total_requests"] == 10
        assert metrics["treatment"]["total_requests"] == 10
    
    def test_ab_testing_dashboard_endpoint(self):
        """Test A/B testing dashboard overview"""
        # Create experiments with different statuses
        experiments_data = [
            {"name": "Active Experiment", "start_immediately": True},
            {"name": "Draft Experiment", "start_immediately": False},
            {"name": "Another Active", "start_immediately": True}
        ]
        
        created_experiments = []
        for exp_data in experiments_data:
            experiment_config = {
                "name": exp_data["name"],
                "description": "Dashboard test experiment",
                "hypothesis": "Test hypothesis",
                "variants": [
                    {
                        "variant_id": "control",
                        "name": "Control",
                        "model_name": "control_model",
                        "model_version": "1.0",
                        "traffic_percentage": 50.0,
                        "is_control": True
                    },
                    {
                        "variant_id": "treatment",
                        "name": "Treatment",
                        "model_name": "treatment_model",
                        "model_version": "2.0",
                        "traffic_percentage": 50.0,
                        "is_control": False
                    }
                ]
            }
            
            create_response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
            experiment_id = create_response.json()["experiment_id"]
            created_experiments.append(experiment_id)
            
            if exp_data["start_immediately"]:
                self.client.post(f"/api/v1/ab-testing/experiments/{experiment_id}/start")
        
        # Get dashboard
        dashboard_response = self.client.get("/api/v1/ab-testing/dashboard")
        assert dashboard_response.status_code == 200
        
        dashboard_data = dashboard_response.json()
        assert "summary" in dashboard_data
        assert "active_experiments" in dashboard_data
        assert "statistics" in dashboard_data
        
        # Check summary counts
        summary = dashboard_data["summary"]
        assert summary["total_experiments"] == 3
        assert summary["active_experiments"] == 2
        assert summary["draft_experiments"] == 1
        
        # Check active experiments details
        active_experiments = dashboard_data["active_experiments"]
        assert len(active_experiments) == 2
        
        for active_exp in active_experiments:
            assert active_exp["status"] == "running"
            assert "days_remaining" in active_exp
    
    def test_error_handling(self):
        """Test error handling in A/B testing endpoints"""
        # Test creating experiment with invalid data
        invalid_config = {
            "name": "Invalid Experiment",
            "description": "Missing required fields"
            # Missing variants and hypothesis
        }
        
        response = self.client.post("/api/v1/ab-testing/experiments", json=invalid_config)
        assert response.status_code == 400
        assert "Missing required field" in response.json()["detail"]
        
        # Test getting non-existent experiment
        response = self.client.get("/api/v1/ab-testing/experiments/nonexistent_id")
        assert response.status_code == 404
        
        # Test starting non-existent experiment
        response = self.client.post("/api/v1/ab-testing/experiments/nonexistent_id/start")
        assert response.status_code == 400
        
        # Test invalid traffic percentages
        invalid_traffic_config = {
            "name": "Invalid Traffic",
            "description": "Invalid traffic split",
            "hypothesis": "Test hypothesis",
            "variants": [
                {
                    "variant_id": "control",
                    "name": "Control",
                    "model_name": "control_model",
                    "model_version": "1.0",
                    "traffic_percentage": 60.0,
                    "is_control": True
                },
                {
                    "variant_id": "treatment",
                    "name": "Treatment",
                    "model_name": "treatment_model",
                    "model_version": "2.0",
                    "traffic_percentage": 50.0,  # Total = 110%
                    "is_control": False
                }
            ]
        }
        
        response = self.client.post("/api/v1/ab-testing/experiments", json=invalid_traffic_config)
        assert response.status_code == 400
        assert "sum to 100%" in response.json()["detail"]
    
    @patch('src.models.mlflow_manager.get_mlflow_manager')
    def test_ab_testing_middleware_integration(self, mock_mlflow_manager):
        """Test A/B testing middleware integration with forecast endpoints"""
        # Mock MLflow manager
        mock_mlflow = MagicMock()
        mock_mlflow_manager.return_value = mock_mlflow
        
        # Create and start an experiment
        experiment_config = {
            "name": "Middleware Test",
            "description": "Test middleware integration",
            "hypothesis": "Middleware should work",
            "variants": [
                {
                    "variant_id": "control",
                    "name": "Control",
                    "model_name": "control_model",
                    "model_version": "1.0",
                    "traffic_percentage": 50.0,
                    "is_control": True
                },
                {
                    "variant_id": "treatment",
                    "name": "Treatment",
                    "model_name": "treatment_model",
                    "model_version": "2.0",
                    "traffic_percentage": 50.0,
                    "is_control": False
                }
            ],
            "metadata": {
                "applicable_endpoints": ["/api/v1/forecast/current/"]
            }
        }
        
        create_response = self.client.post("/api/v1/ab-testing/experiments", json=experiment_config)
        experiment_id = create_response.json()["experiment_id"]
        
        # Start experiment
        self.client.post(f"/api/v1/ab-testing/experiments/{experiment_id}/start")
        
        # Make forecast request that should trigger A/B testing
        with patch('src.api.routers.forecast.get_ensemble_forecaster') as mock_forecaster:
            # Mock the forecaster
            mock_ensemble = MagicMock()
            mock_prediction = MagicMock()
            mock_prediction.pm25 = 85.5
            mock_prediction.pm25_lower = 75.0
            mock_prediction.pm25_upper = 95.0
            mock_prediction.aqi = 156
            mock_prediction.category = "unhealthy"
            mock_prediction.confidence = 0.85
            mock_prediction.model_weights = {"xgboost": 0.6, "lstm": 0.4}
            mock_ensemble.predict.return_value = mock_prediction
            mock_forecaster.return_value = mock_ensemble
            
            # Make forecast request
            forecast_response = self.client.get("/api/v1/forecast/current/delhi")
            
            # Check that A/B testing headers are present
            assert "X-AB-Experiment-ID" in forecast_response.headers
            assert "X-AB-Variant-ID" in forecast_response.headers
            assert "X-AB-Model-Version" in forecast_response.headers
            
            # Verify experiment got the prediction recorded
            metrics_response = self.client.get(f"/api/v1/ab-testing/experiments/{experiment_id}/metrics")
            metrics_data = metrics_response.json()
            
            # Should have at least one request recorded
            total_requests = metrics_data["summary"]["total_requests"]
            assert total_requests >= 1


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])