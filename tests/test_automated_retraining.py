"""
Tests for automated retraining system functionality.
"""

import pytest
import json
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any

from src.tasks.automated_retraining import (
    RetrainingTrigger, RetrainingResult,
    check_retraining_triggers, execute_automated_retraining,
    update_retraining_schedule, generate_retraining_report,
    _check_performance_triggers, _check_data_drift_triggers, _check_schedule_triggers
)
from src.api.monitoring import ModelPerformanceMetrics


class TestRetrainingTrigger:
    """Test RetrainingTrigger data class"""
    
    def test_trigger_creation(self):
        """Test creating a retraining trigger"""
        trigger = RetrainingTrigger(
            trigger_type='performance',
            model_name='aqi_predictor_xgboost',
            threshold_value=0.15,
            current_value=0.25,
            severity='high',
            timestamp=datetime.utcnow(),
            metadata={'metric': 'rmse_degradation'}
        )
        
        assert trigger.trigger_type == 'performance'
        assert trigger.model_name == 'aqi_predictor_xgboost'
        assert trigger.severity == 'high'
        assert 'metric' in trigger.metadata
    
    def test_trigger_serialization(self):
        """Test trigger serialization to dict"""
        timestamp = datetime.utcnow()
        trigger = RetrainingTrigger(
            trigger_type='drift',
            model_name='ensemble',
            threshold_value=0.25,
            current_value=0.35,
            severity='critical',
            timestamp=timestamp,
            metadata={'parameter': 'pm25', 'drift_type': 'mean_shift'}
        )
        
        trigger_dict = trigger.to_dict()
        
        assert trigger_dict['trigger_type'] == 'drift'
        assert trigger_dict['timestamp'] == timestamp.isoformat()
        assert trigger_dict['metadata']['parameter'] == 'pm25'


class TestPerformanceTriggers:
    """Test performance-based retraining triggers"""
    
    @patch('src.tasks.automated_retraining.get_performance_monitor')
    @patch('src.tasks.automated_retraining.asyncio')
    def test_performance_degradation_trigger(self, mock_asyncio, mock_monitor):
        """Test trigger creation for performance degradation"""
        # Mock performance monitor
        monitor = Mock()
        mock_monitor.return_value = monitor
        
        # Mock asyncio
        loop = Mock()
        mock_asyncio.new_event_loop.return_value = loop
        mock_asyncio.set_event_loop = Mock()
        
        # Create mock metrics showing degradation
        historical_metrics = [
            ModelPerformanceMetrics(
                model_name='xgboost',
                model_version='1.0',
                rmse=18.0,
                mae=14.0,
                accuracy=80.0,
                prediction_count=100,
                avg_response_time_ms=100,
                timestamp=datetime.utcnow() - timedelta(days=5)
            ),
            ModelPerformanceMetrics(
                model_name='xgboost',
                model_version='1.0',
                rmse=19.0,
                mae=14.5,
                accuracy=79.0,
                prediction_count=100,
                avg_response_time_ms=100,
                timestamp=datetime.utcnow() - timedelta(days=4)
            )
        ]
        
        recent_metrics = [
            ModelPerformanceMetrics(
                model_name='xgboost',
                model_version='1.0',
                rmse=22.0,  # Significant degradation
                mae=17.0,
                accuracy=72.0,  # Accuracy drop
                prediction_count=100,
                avg_response_time_ms=100,
                timestamp=datetime.utcnow() - timedelta(days=1)
            )
        ]
        
        all_metrics = historical_metrics + recent_metrics
        
        # Mock the loop.run_until_complete call
        loop.run_until_complete.return_value = all_metrics
        
        # Test trigger detection
        triggers = _check_performance_triggers()
        
        # Should detect both RMSE and accuracy degradation
        assert len(triggers) >= 1
        
        rmse_trigger = next((t for t in triggers if t.metadata.get('metric') == 'rmse_degradation'), None)
        assert rmse_trigger is not None
        assert rmse_trigger.severity in ['high', 'critical']
        assert rmse_trigger.current_value > 0.15  # Above threshold
    
    @patch('src.tasks.automated_retraining.get_performance_monitor')
    @patch('src.tasks.automated_retraining.asyncio')
    def test_no_trigger_stable_performance(self, mock_asyncio, mock_monitor):
        """Test no trigger when performance is stable"""
        monitor = Mock()
        mock_monitor.return_value = monitor
        
        # Mock asyncio
        loop = Mock()
        mock_asyncio.new_event_loop.return_value = loop
        mock_asyncio.set_event_loop = Mock()
        
        # Create stable metrics
        stable_metrics = [
            ModelPerformanceMetrics(
                model_name='lstm',
                model_version='1.0',
                rmse=18.5,
                mae=14.2,
                accuracy=78.0,
                prediction_count=100,
                avg_response_time_ms=100,
                timestamp=datetime.utcnow() - timedelta(days=i)
            )
            for i in range(1, 8)
        ]
        
        loop.run_until_complete.return_value = stable_metrics
        
        triggers = _check_performance_triggers()
        
        # Should not trigger for stable performance
        assert len(triggers) == 0


class TestDataDriftTriggers:
    """Test data drift-based retraining triggers"""
    
    @patch('src.tasks.automated_retraining.get_db_session')
    def test_mean_shift_trigger(self, mock_db_session):
        """Test trigger creation for data mean shift"""
        # Mock database session and data
        mock_db = Mock()
        mock_db_session.return_value.__enter__.return_value = mock_db
        
        # Create mock data showing mean shift
        recent_data = [Mock(parameter='pm25', value=50.0 + i, time=datetime.utcnow()) for i in range(100)]
        historical_data = [Mock(parameter='pm25', value=25.0 + i, time=datetime.utcnow() - timedelta(days=15)) for i in range(100)]
        
        mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [
            recent_data, historical_data
        ]
        
        triggers = _check_data_drift_triggers()
        
        # Should detect mean shift
        mean_shift_triggers = [t for t in triggers if t.metadata.get('drift_type') == 'mean_shift']
        assert len(mean_shift_triggers) > 0
        
        trigger = mean_shift_triggers[0]
        assert trigger.trigger_type == 'drift'
        assert trigger.severity in ['high', 'critical']
    
    @patch('src.tasks.automated_retraining.get_db_session')
    def test_insufficient_data_no_trigger(self, mock_db_session):
        """Test no trigger when insufficient data"""
        mock_db = Mock()
        mock_db_session.return_value.__enter__.return_value = mock_db
        
        # Mock insufficient data
        mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = []
        
        triggers = _check_data_drift_triggers()
        
        # Should not trigger with insufficient data
        assert len(triggers) == 0


class TestScheduleTriggers:
    """Test schedule-based retraining triggers"""
    
    @patch('src.tasks.automated_retraining.get_mlflow_manager')
    def test_overdue_retraining_trigger(self, mock_mlflow_manager):
        """Test trigger for overdue model retraining"""
        # Mock MLflow manager
        manager = Mock()
        mock_mlflow_manager.return_value = manager
        
        # Mock old model version
        old_run = Mock()
        old_run.info.start_time = int((datetime.utcnow() - timedelta(days=10)).timestamp() * 1000)
        
        old_version = Mock()
        old_version.run_id = 'old_run_id'
        
        manager.client.get_latest_versions.return_value = [old_version]
        manager.client.get_run.return_value = old_run
        
        triggers = _check_schedule_triggers()
        
        # Should trigger for overdue XGBoost model (7 day threshold)
        schedule_triggers = [t for t in triggers if t.trigger_type == 'schedule']
        assert len(schedule_triggers) > 0
        
        trigger = schedule_triggers[0]
        assert trigger.current_value > trigger.threshold_value
        assert trigger.severity in ['medium', 'critical']
    
    @patch('src.tasks.automated_retraining.get_mlflow_manager')
    def test_no_model_exists_trigger(self, mock_mlflow_manager):
        """Test trigger when no model exists"""
        manager = Mock()
        mock_mlflow_manager.return_value = manager
        
        # Mock no existing models
        manager.client.get_latest_versions.return_value = []
        
        triggers = _check_schedule_triggers()
        
        # Should trigger for missing models
        no_model_triggers = [t for t in triggers if t.metadata.get('reason') == 'no_model_exists']
        assert len(no_model_triggers) > 0
        
        trigger = no_model_triggers[0]
        assert trigger.severity == 'high'


class TestAutomatedRetraining:
    """Test automated retraining execution"""
    
    @patch('src.tasks.automated_retraining.retrain_models')
    @patch('src.tasks.automated_retraining.evaluate_model_performance')
    @patch('src.tasks.automated_retraining.promote_best_model')
    @patch('src.tasks.automated_retraining.get_mlflow_manager')
    def test_successful_retraining(self, mock_mlflow_manager, mock_promote, mock_evaluate, mock_retrain):
        """Test successful automated retraining execution"""
        # Mock task results
        mock_retrain.delay.return_value.get.return_value = {
            'successful_models': 1,
            'training_results': {'xgboost': {'status': 'completed'}}
        }
        
        mock_evaluate.delay.return_value.get.return_value = {
            'performance_metrics': {
                'rmse': 18.5,
                'mae': 14.2,
                'accuracy_within_20_percent': 0.85
            }
        }
        
        mock_promote.delay.return_value.get.return_value = {
            'promotion_successful': True
        }
        
        # Mock MLflow manager
        manager = Mock()
        mock_mlflow_manager.return_value = manager
        manager.start_run.return_value.__enter__ = Mock()
        manager.start_run.return_value.__exit__ = Mock()
        
        # Create test trigger
        trigger_data = {
            'trigger_type': 'performance',
            'model_name': 'aqi_predictor_xgboost',
            'threshold_value': 0.15,
            'current_value': 0.25,
            'severity': 'high',
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {'metric': 'rmse_degradation'}
        }
        
        # Execute retraining
        result = execute_automated_retraining.apply(args=[trigger_data]).get()
        
        # Verify successful execution
        assert result['success'] is True
        assert len(result['models_retrained']) == 1
        assert result['promotion_results']['xgboost'] is True
    
    @patch('src.tasks.automated_retraining.retrain_models')
    def test_retraining_failure_handling(self, mock_retrain):
        """Test handling of retraining failures"""
        # Mock training failure
        mock_retrain.delay.return_value.get.side_effect = Exception("Training failed")
        
        trigger_data = {
            'trigger_type': 'performance',
            'model_name': 'aqi_predictor_lstm',
            'threshold_value': 0.15,
            'current_value': 0.25,
            'severity': 'high',
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {'metric': 'rmse_degradation'}
        }
        
        # Execute retraining
        result = execute_automated_retraining.apply(args=[trigger_data]).get()
        
        # Verify failure handling
        assert result['success'] is False
        assert result['error_message'] is not None
        assert 'Training failed' in result['error_message']


class TestRetrainingScheduleUpdate:
    """Test adaptive retraining schedule updates"""
    
    def test_schedule_update_poor_performance(self):
        """Test schedule adjustment for poor performance"""
        # Mock performance data showing poor performance
        performance_data = {
            'xgboost': {
                'rmse': 30.0,  # Poor RMSE
                'accuracy': 65.0  # Poor accuracy
            }
        }
        
        # Create temporary config file
        config_path = "models/test_retraining_schedule.json"
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        initial_config = {
            'xgboost': {'days': 7, 'performance_weight': 1.0}
        }
        
        with open(config_path, 'w') as f:
            json.dump(initial_config, f)
        
        try:
            # Mock the config path
            with patch('src.tasks.automated_retraining.SCHEDULE_CONFIG_PATH', config_path):
                result = update_retraining_schedule.apply(args=[performance_data]).get()
            
            # Verify schedule was updated
            assert result['models_updated'] == 1
            
            # Check updated config
            with open(config_path, 'r') as f:
                updated_config = json.load(f)
            
            # Should retrain more frequently due to poor performance
            assert updated_config['xgboost']['days'] < initial_config['xgboost']['days']
            
        finally:
            # Cleanup
            if os.path.exists(config_path):
                os.remove(config_path)
    
    def test_schedule_update_excellent_performance(self):
        """Test schedule adjustment for excellent performance"""
        performance_data = {
            'lstm': {
                'rmse': 16.0,  # Excellent RMSE
                'accuracy': 92.0  # Excellent accuracy
            }
        }
        
        config_path = "models/test_retraining_schedule.json"
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        initial_config = {
            'lstm': {'days': 14, 'performance_weight': 1.0}
        }
        
        with open(config_path, 'w') as f:
            json.dump(initial_config, f)
        
        try:
            with patch('src.tasks.automated_retraining.SCHEDULE_CONFIG_PATH', config_path):
                result = update_retraining_schedule.apply(args=[performance_data]).get()
            
            with open(config_path, 'r') as f:
                updated_config = json.load(f)
            
            # Should retrain less frequently due to excellent performance
            assert updated_config['lstm']['days'] > initial_config['lstm']['days']
            
        finally:
            if os.path.exists(config_path):
                os.remove(config_path)


class TestRetrainingReport:
    """Test retraining report generation"""
    
    @patch('src.tasks.automated_retraining.get_mlflow_manager')
    def test_report_generation(self, mock_mlflow_manager):
        """Test comprehensive retraining report generation"""
        # Mock MLflow manager and runs
        manager = Mock()
        mock_mlflow_manager.return_value = manager
        
        # Mock retraining runs
        mock_run = Mock()
        mock_run.info.run_id = 'test_run_id'
        mock_run.info.start_time = int(datetime.utcnow().timestamp() * 1000)
        mock_run.data.metrics = {
            'retraining_duration_minutes': 45.0,
            'models_retrained': 2,
            'models_promoted': 1,
            'success_rate': 0.5
        }
        mock_run.data.tags = {
            'trigger_type': 'performance',
            'trigger_severity': 'high'
        }
        
        manager.client.search_runs.return_value = [mock_run]
        manager.experiment_id = 'test_experiment'
        
        # Mock model versions
        mock_version = Mock()
        mock_version.version = '1'
        mock_version.current_stage = 'Production'
        mock_version.run_id = 'model_run_id'
        
        mock_model_run = Mock()
        mock_model_run.info.start_time = int(datetime.utcnow().timestamp() * 1000)
        mock_model_run.data.metrics = {'rmse': 18.5, 'mae': 14.2}
        
        manager.client.get_latest_versions.return_value = [mock_version]
        manager.client.get_run.return_value = mock_model_run
        
        # Generate report
        report = generate_retraining_report.apply().get()
        
        # Verify report structure
        assert 'summary' in report
        assert 'recent_retraining_history' in report
        assert 'current_model_status' in report
        assert 'system_health' in report
        
        # Verify summary statistics
        summary = report['summary']
        assert summary['total_automated_retrainings'] == 1
        assert summary['avg_retraining_duration_minutes'] == 45.0
        assert summary['avg_success_rate'] == 0.5
        
        # Verify trigger distribution
        assert 'performance' in summary['trigger_type_distribution']
        assert summary['trigger_type_distribution']['performance'] == 1


@pytest.fixture
def mock_celery_task():
    """Mock Celery task for testing"""
    with patch('src.tasks.automated_retraining.celery_app.task') as mock_task:
        yield mock_task


class TestIntegration:
    """Integration tests for automated retraining system"""
    
    @patch('src.tasks.automated_retraining._check_performance_triggers')
    @patch('src.tasks.automated_retraining._check_data_drift_triggers')
    @patch('src.tasks.automated_retraining._check_schedule_triggers')
    @patch('src.tasks.automated_retraining.execute_automated_retraining')
    def test_trigger_check_integration(self, mock_execute, mock_schedule, mock_drift, mock_performance):
        """Test integration of trigger checking and retraining execution"""
        # Mock triggers
        high_priority_trigger = RetrainingTrigger(
            trigger_type='performance',
            model_name='aqi_predictor_xgboost',
            threshold_value=0.15,
            current_value=0.30,
            severity='critical',
            timestamp=datetime.utcnow(),
            metadata={'metric': 'rmse_degradation'}
        )
        
        low_priority_trigger = RetrainingTrigger(
            trigger_type='schedule',
            model_name='aqi_predictor_lstm',
            threshold_value=14,
            current_value=10,
            severity='low',
            timestamp=datetime.utcnow(),
            metadata={'reason': 'scheduled_retraining'}
        )
        
        mock_performance.return_value = [high_priority_trigger]
        mock_drift.return_value = []
        mock_schedule.return_value = [low_priority_trigger]
        
        # Mock retraining execution
        mock_task = Mock()
        mock_task.id = 'test_task_id'
        mock_execute.delay.return_value = mock_task
        
        # Execute trigger check
        result = check_retraining_triggers.apply().get()
        
        # Verify results
        assert result['triggers_checked'] == 2
        assert result['retraining_triggered'] == 1  # Only high-priority trigger
        
        # Verify retraining was triggered for critical trigger
        mock_execute.delay.assert_called_once()
        call_args = mock_execute.delay.call_args[0][0]
        assert call_args['severity'] == 'critical'
        assert call_args['model_name'] == 'aqi_predictor_xgboost'


if __name__ == "__main__":
    pytest.main([__file__])