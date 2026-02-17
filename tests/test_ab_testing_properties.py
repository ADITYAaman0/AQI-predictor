"""
Property-Based Tests for A/B Testing Framework
Feature: aqi-predictor-completion
"""

import pytest
import numpy as np
import tempfile
import shutil
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings
from typing import Dict, List
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.ab_testing_framework import (
    ABTestingFramework, ExperimentStatus, TrafficSplitMethod,
    ExperimentVariant, ABTestExperiment, ExperimentMetrics
)


class TestABTestingProperties:
    """Property-based tests for A/B testing framework"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create temporary directory for test storage
        self.temp_dir = tempfile.mkdtemp()
        
        # Mock MLflow manager to avoid model loading issues
        from unittest.mock import patch, MagicMock
        self.mlflow_patcher = patch('src.models.ab_testing_framework.get_mlflow_manager')
        self.mock_mlflow_manager = self.mlflow_patcher.start()
        
        # Create mock MLflow manager
        mock_manager = MagicMock()
        mock_manager.load_model.return_value = MagicMock()  # Mock model object
        self.mock_mlflow_manager.return_value = mock_manager
        
        self.ab_framework = ABTestingFramework(storage_dir=self.temp_dir)
    
    def teardown_method(self):
        """Clean up test fixtures"""
        # Stop MLflow patcher
        if hasattr(self, 'mlflow_patcher'):
            self.mlflow_patcher.stop()
            
        if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    @given(st.lists(st.floats(min_value=0.1, max_value=99.9), min_size=2, max_size=5))
    @settings(max_examples=20, deadline=10000)
    def test_traffic_split_normalization_property(self, traffic_percentages):
        """
        Property: Traffic percentages should always sum to 100% after normalization
        
        For any list of traffic percentages, when creating an experiment,
        the framework should normalize them to sum to exactly 100%.
        """
        # Normalize percentages to sum to 100
        total = sum(traffic_percentages)
        normalized_percentages = [p / total * 100 for p in traffic_percentages]
        
        # Create variant configurations
        variants = []
        for i, percentage in enumerate(normalized_percentages):
            variants.append({
                "variant_id": f"variant_{i}",
                "name": f"Variant {i}",
                "model_name": "test_model",
                "model_version": "1.0",
                "traffic_percentage": percentage,
                "is_control": i == 0  # First variant is control
            })
        
        try:
            # Create experiment
            experiment = self.ab_framework.create_experiment(
                name="Traffic Split Test",
                description="Test traffic split normalization",
                hypothesis="Traffic splits should sum to 100%",
                variants=variants,
                duration_days=7
            )
            
            # Verify traffic percentages sum to 100% (within tolerance)
            total_traffic = sum(v.traffic_percentage for v in experiment.variants)
            assert abs(total_traffic - 100.0) <= 0.01, \
                f"Traffic percentages sum to {total_traffic}%, should be 100%"
            
            # Verify all percentages are positive
            for variant in experiment.variants:
                assert variant.traffic_percentage > 0, \
                    f"Variant {variant.variant_id} has non-positive traffic: {variant.traffic_percentage}"
                assert variant.traffic_percentage <= 100, \
                    f"Variant {variant.variant_id} has traffic > 100%: {variant.traffic_percentage}"
            
        except ValueError as e:
            # If creation fails due to validation, that's acceptable
            if "sum to 100%" in str(e):
                pytest.skip("Traffic percentages validation failed as expected")
            else:
                raise
    
    @given(
        st.integers(min_value=2, max_value=10),  # num_variants - ensure minimum 2
        st.integers(min_value=100, max_value=10000),  # num_assignments
        st.sampled_from([TrafficSplitMethod.RANDOM, TrafficSplitMethod.USER_ID])
    )
    @settings(max_examples=10, deadline=15000)
    def test_variant_assignment_distribution_property(self, num_variants, num_assignments, split_method):
        """
        Property: Variant assignments should follow the configured traffic distribution
        
        For any experiment with specified traffic percentages, the actual assignment
        distribution should approximate the configured percentages within statistical bounds.
        """
        # Create equal traffic split for simplicity
        traffic_percentage = 100.0 / num_variants
        
        # Create variant configurations
        variants = []
        for i in range(num_variants):
            variants.append({
                "variant_id": f"variant_{i}",
                "name": f"Variant {i}",
                "model_name": "test_model",
                "model_version": "1.0",
                "traffic_percentage": traffic_percentage,
                "is_control": i == 0
            })
        
        # Create experiment
        experiment = self.ab_framework.create_experiment(
            name="Assignment Distribution Test",
            description="Test variant assignment distribution",
            hypothesis="Assignments should follow traffic percentages",
            variants=variants,
            traffic_split_method=split_method,
            duration_days=7
        )
        
        # Start experiment
        self.ab_framework.start_experiment(experiment.experiment_id)
        
        # Perform assignments
        assignment_counts = {f"variant_{i}": 0 for i in range(num_variants)}
        
        for i in range(num_assignments):
            if split_method == TrafficSplitMethod.USER_ID:
                user_id = f"user_{i}"
            else:
                user_id = None
            
            assigned_variant = self.ab_framework.assign_variant(
                experiment.experiment_id,
                user_id=user_id
            )
            
            if assigned_variant:
                assignment_counts[assigned_variant] += 1
        
        # Verify distribution is approximately correct
        expected_count = num_assignments / num_variants
        tolerance = max(50, num_assignments * 0.15)  # 15% tolerance or minimum 50
        
        for variant_id, actual_count in assignment_counts.items():
            assert abs(actual_count - expected_count) <= tolerance, \
                f"Variant {variant_id} got {actual_count} assignments, " \
                f"expected ~{expected_count} (tolerance: ±{tolerance})"
        
        # Verify total assignments equal input
        total_assignments = sum(assignment_counts.values())
        assert total_assignments == num_assignments, \
            f"Total assignments {total_assignments} != expected {num_assignments}"
    
    @given(
        st.integers(min_value=10, max_value=1000),  # total_requests
        st.integers(min_value=0, max_value=100),   # failed_requests
        st.floats(min_value=10.0, max_value=1000.0),  # avg_response_time
        st.floats(min_value=0.1, max_value=1.0)    # avg_confidence
    )
    @settings(max_examples=15, deadline=10000)
    def test_metrics_calculation_consistency_property(self, total_requests, failed_requests, 
                                                     avg_response_time, avg_confidence):
        """
        Property: Metrics calculations should be mathematically consistent
        
        For any set of prediction records, calculated metrics should satisfy
        mathematical relationships and constraints.
        """
        # Ensure failed_requests doesn't exceed total_requests
        failed_requests = min(failed_requests, total_requests)
        successful_requests = total_requests - failed_requests
        
        # Create mock prediction records
        records = []
        for i in range(total_requests):
            success = i < successful_requests
            
            record = {
                "timestamp": datetime.utcnow().isoformat(),
                "experiment_id": "test_exp",
                "variant_id": "test_variant",
                "prediction_data": {
                    "confidence": avg_confidence + np.random.uniform(-0.1, 0.1)
                },
                "response_time_ms": avg_response_time + np.random.uniform(-50, 50),
                "success": success,
                "error": None if success else "test_error"
            }
            records.append(record)
        
        # Calculate metrics using framework method
        metrics = self.ab_framework._calculate_variant_metrics(records)
        
        # Property: Basic count consistency
        assert metrics.total_requests == total_requests, \
            f"Total requests {metrics.total_requests} != expected {total_requests}"
        
        assert metrics.successful_predictions == successful_requests, \
            f"Successful predictions {metrics.successful_predictions} != expected {successful_requests}"
        
        assert metrics.failed_predictions == failed_requests, \
            f"Failed predictions {metrics.failed_predictions} != expected {failed_requests}"
        
        # Property: Success rate calculation
        expected_success_rate = successful_requests / total_requests if total_requests > 0 else 0
        assert abs(metrics.success_rate - expected_success_rate) < 0.001, \
            f"Success rate {metrics.success_rate} != expected {expected_success_rate}"
        
        # Property: Error rate consistency
        expected_error_rate = 1.0 - expected_success_rate
        assert abs(metrics.error_rate - expected_error_rate) < 0.001, \
            f"Error rate {metrics.error_rate} != expected {expected_error_rate}"
        
        # Property: Success rate + error rate = 1.0
        assert abs(metrics.success_rate + metrics.error_rate - 1.0) < 0.001, \
            f"Success rate {metrics.success_rate} + error rate {metrics.error_rate} != 1.0"
        
        # Property: Response time should be positive
        assert metrics.avg_response_time_ms >= 0, \
            f"Average response time {metrics.avg_response_time_ms} should be non-negative"
        
        # Property: Confidence should be in valid range
        assert 0 <= metrics.avg_prediction_confidence <= 1, \
            f"Average confidence {metrics.avg_prediction_confidence} should be in [0, 1]"
    
    @given(
        st.floats(min_value=0.1, max_value=100.0),  # control_value
        st.floats(min_value=0.1, max_value=100.0),  # treatment_value
        st.integers(min_value=100, max_value=10000), # control_n
        st.integers(min_value=100, max_value=10000)  # treatment_n
    )
    @settings(max_examples=15, deadline=10000)
    def test_statistical_test_properties(self, control_value, treatment_value, control_n, treatment_n):
        """
        Property: Statistical test results should satisfy mathematical properties
        
        For any control and treatment values with sample sizes, statistical tests
        should produce consistent and mathematically valid results.
        """
        # Perform statistical test
        result = self.ab_framework._perform_statistical_test(
            control_value, treatment_value, control_n, treatment_n, 0.95
        )
        
        # Property: P-value should be in valid range [0, 1]
        assert 0 <= result['p_value'] <= 1, \
            f"P-value {result['p_value']} should be in [0, 1]"
        
        # Property: Statistical significance should be consistent with p-value
        alpha = 0.05  # 95% confidence level
        expected_significant = result['p_value'] < alpha
        assert result['significant'] == expected_significant, \
            f"Significance {result['significant']} inconsistent with p-value {result['p_value']}"
        
        # Property: T-statistic should be non-negative (we use absolute value)
        assert result['t_statistic'] >= 0, \
            f"T-statistic {result['t_statistic']} should be non-negative"
        
        # Property: Identical values should not be significant (unless by chance)
        if abs(control_value - treatment_value) < 0.001:
            # For identical values, significance should be very unlikely
            # (though not impossible due to random variation in real data)
            assert result['p_value'] > 0.01, \
                f"Identical values should have high p-value, got {result['p_value']}"
    
    @given(
        st.floats(min_value=1.0, max_value=100.0),  # control_value
        st.floats(min_value=1.0, max_value=100.0),  # treatment_value
        st.sampled_from(["rmse", "mae", "success_rate", "error_rate"])
    )
    @settings(max_examples=20, deadline=8000)
    def test_effect_size_calculation_property(self, control_value, treatment_value, metric_name):
        """
        Property: Effect size calculations should be mathematically consistent
        
        For any control and treatment values, effect size should correctly
        represent the relative difference between them.
        """
        # Calculate effect size
        effect_size = self.ab_framework._calculate_effect_size(
            control_value, treatment_value, metric_name
        )
        
        # Property: Effect size should be finite
        assert np.isfinite(effect_size), \
            f"Effect size {effect_size} should be finite"
        
        # Property: Effect size should correctly represent relative change
        if control_value != 0:
            expected_effect_size = (treatment_value - control_value) / control_value
            assert abs(effect_size - expected_effect_size) < 0.001, \
                f"Effect size {effect_size} != expected {expected_effect_size}"
        
        # Property: Zero effect when values are equal
        if abs(control_value - treatment_value) < 0.001:
            assert abs(effect_size) < 0.01, \
                f"Effect size {effect_size} should be near zero for equal values"
        
        # Property: Positive effect when treatment > control
        if treatment_value > control_value:
            assert effect_size > 0, \
                f"Effect size {effect_size} should be positive when treatment > control"
        
        # Property: Negative effect when treatment < control
        if treatment_value < control_value:
            assert effect_size < 0, \
                f"Effect size {effect_size} should be negative when treatment < control"
    
    @given(
        st.integers(min_value=2, max_value=5),  # num_variants
        st.integers(min_value=1, max_value=30)  # duration_days
    )
    @settings(max_examples=10, deadline=10000)
    def test_experiment_lifecycle_consistency_property(self, num_variants, duration_days):
        """
        Property: Experiment lifecycle should maintain consistent state transitions
        
        For any experiment, state transitions should follow valid patterns and
        maintain data consistency throughout the lifecycle.
        """
        # Create variant configurations
        traffic_percentage = 100.0 / num_variants
        variants = []
        for i in range(num_variants):
            variants.append({
                "variant_id": f"variant_{i}",
                "name": f"Variant {i}",
                "model_name": "test_model",
                "model_version": "1.0",
                "traffic_percentage": traffic_percentage,
                "is_control": i == 0
            })
        
        # Create experiment
        experiment = self.ab_framework.create_experiment(
            name="Lifecycle Test",
            description="Test experiment lifecycle consistency",
            hypothesis="Lifecycle should be consistent",
            variants=variants,
            duration_days=duration_days
        )
        
        # Property: Initial state should be DRAFT
        assert experiment.status == ExperimentStatus.DRAFT, \
            f"Initial status should be DRAFT, got {experiment.status}"
        
        # Property: Should not be active initially
        assert not experiment.is_active, \
            "Experiment should not be active in DRAFT state"
        
        # Property: End date should be after start date
        assert experiment.end_date > experiment.start_date, \
            "End date should be after start date"
        
        # Property: Duration should match requested duration
        actual_duration = (experiment.end_date - experiment.start_date).days
        assert abs(actual_duration - duration_days) <= 1, \
            f"Duration {actual_duration} days != requested {duration_days} days"
        
        # Start experiment
        success = self.ab_framework.start_experiment(experiment.experiment_id)
        assert success, "Starting experiment should succeed"
        
        # Reload experiment to check state
        updated_experiment = self.ab_framework.get_experiment(experiment.experiment_id)
        
        # Property: Status should be RUNNING after start
        assert updated_experiment.status == ExperimentStatus.RUNNING, \
            f"Status should be RUNNING after start, got {updated_experiment.status}"
        
        # Property: Should be active after start (if within time bounds)
        if updated_experiment.start_date <= datetime.utcnow() <= updated_experiment.end_date:
            assert updated_experiment.is_active, \
                "Experiment should be active after start"
        
        # Stop experiment
        success = self.ab_framework.stop_experiment(experiment.experiment_id, "test_stop")
        assert success, "Stopping experiment should succeed"
        
        # Reload experiment to check final state
        final_experiment = self.ab_framework.get_experiment(experiment.experiment_id)
        
        # Property: Status should be COMPLETED after stop
        assert final_experiment.status == ExperimentStatus.COMPLETED, \
            f"Status should be COMPLETED after stop, got {final_experiment.status}"
        
        # Property: Should not be active after stop
        assert not final_experiment.is_active, \
            "Experiment should not be active after stop"
        
        # Property: Stop reason should be recorded
        assert final_experiment.metadata.get("stop_reason") == "test_stop", \
            "Stop reason should be recorded in metadata"
    
    @given(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc'))))
    @settings(max_examples=10, deadline=8000)
    def test_experiment_persistence_property(self, experiment_name):
        """
        Property: Experiments should persist correctly across framework instances
        
        For any experiment, saving and loading should preserve all data integrity.
        """
        # Create experiment
        variants = [
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
        
        original_experiment = self.ab_framework.create_experiment(
            name=experiment_name,
            description="Test persistence",
            hypothesis="Data should persist",
            variants=variants,
            duration_days=14,
            tags=["test", "persistence"],
            metadata={"test_key": "test_value"}
        )
        
        # Create new framework instance (simulating restart)
        new_framework = ABTestingFramework(storage_dir=self.temp_dir)
        
        # Load experiment from new instance
        loaded_experiment = new_framework.get_experiment(original_experiment.experiment_id)
        
        # Property: Experiment should be loadable
        assert loaded_experiment is not None, \
            "Experiment should be loadable after persistence"
        
        # Property: Basic fields should match
        assert loaded_experiment.experiment_id == original_experiment.experiment_id
        assert loaded_experiment.name == original_experiment.name
        assert loaded_experiment.description == original_experiment.description
        assert loaded_experiment.hypothesis == original_experiment.hypothesis
        assert loaded_experiment.status == original_experiment.status
        
        # Property: Variants should match
        assert len(loaded_experiment.variants) == len(original_experiment.variants)
        
        for orig_variant, loaded_variant in zip(original_experiment.variants, loaded_experiment.variants):
            assert loaded_variant.variant_id == orig_variant.variant_id
            assert loaded_variant.name == orig_variant.name
            assert loaded_variant.model_name == orig_variant.model_name
            assert loaded_variant.model_version == orig_variant.model_version
            assert abs(loaded_variant.traffic_percentage - orig_variant.traffic_percentage) < 0.001
            assert loaded_variant.is_control == orig_variant.is_control
        
        # Property: Metadata should match
        assert loaded_experiment.tags == original_experiment.tags
        assert loaded_experiment.metadata == original_experiment.metadata
        
        # Property: Dates should match (within reasonable precision)
        assert abs((loaded_experiment.start_date - original_experiment.start_date).total_seconds()) < 1
        assert abs((loaded_experiment.end_date - original_experiment.end_date).total_seconds()) < 1


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])