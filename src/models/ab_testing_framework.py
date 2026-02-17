"""
A/B Testing Framework for ML Models
Provides comprehensive A/B testing capabilities for model comparison and deployment.
"""

import logging
import json
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import pandas as pd
from pathlib import Path
import os

from .mlflow_manager import get_mlflow_manager
from ..api.database import get_db
from ..utils.aqi_calculator import AQICalculator

logger = logging.getLogger(__name__)


class ExperimentStatus(Enum):
    """Status of A/B test experiments"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrafficSplitMethod(Enum):
    """Methods for splitting traffic between variants"""
    RANDOM = "random"
    USER_ID = "user_id"
    LOCATION = "location"
    TIME_BASED = "time_based"
    CUSTOM = "custom"


@dataclass
class ExperimentVariant:
    """Configuration for an experiment variant"""
    variant_id: str
    name: str
    description: str
    model_name: str
    model_version: str
    traffic_percentage: float
    is_control: bool = False
    configuration: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.configuration is None:
            self.configuration = {}


@dataclass
class ExperimentMetrics:
    """Metrics collected during A/B test"""
    variant_id: str
    total_requests: int
    successful_predictions: int
    failed_predictions: int
    avg_response_time_ms: float
    avg_prediction_confidence: float
    rmse: Optional[float] = None
    mae: Optional[float] = None
    accuracy_within_10_percent: Optional[float] = None
    accuracy_within_20_percent: Optional[float] = None
    user_satisfaction_score: Optional[float] = None
    conversion_rate: Optional[float] = None
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.total_requests == 0:
            return 0.0
        return self.successful_predictions / self.total_requests
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate"""
        return 1.0 - self.success_rate


@dataclass
class ExperimentResult:
    """Results of A/B test comparison"""
    experiment_id: str
    control_variant: str
    treatment_variant: str
    winner: Optional[str]
    confidence_level: float
    p_value: float
    effect_size: float
    statistical_significance: bool
    business_significance: bool
    recommendation: str
    detailed_metrics: Dict[str, ExperimentMetrics]
    duration_days: int
    total_samples: int


@dataclass
class ABTestExperiment:
    """A/B test experiment configuration"""
    experiment_id: str
    name: str
    description: str
    hypothesis: str
    success_metric: str
    variants: List[ExperimentVariant]
    traffic_split_method: TrafficSplitMethod
    start_date: datetime
    end_date: datetime
    status: ExperimentStatus
    minimum_sample_size: int
    confidence_level: float = 0.95
    minimum_effect_size: float = 0.05
    created_by: str = "system"
    tags: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.metadata is None:
            self.metadata = {}
    
    @property
    def is_active(self) -> bool:
        """Check if experiment is currently active"""
        now = datetime.utcnow()
        return (self.status == ExperimentStatus.RUNNING and 
                self.start_date <= now <= self.end_date)
    
    @property
    def control_variant(self) -> Optional[ExperimentVariant]:
        """Get the control variant"""
        for variant in self.variants:
            if variant.is_control:
                return variant
        return None
    
    @property
    def treatment_variants(self) -> List[ExperimentVariant]:
        """Get all treatment variants"""
        return [v for v in self.variants if not v.is_control]


class ABTestingFramework:
    """
    A/B Testing Framework for ML Models
    
    Features:
    - Experiment design and configuration
    - Traffic splitting and variant assignment
    - Metrics collection and analysis
    - Statistical significance testing
    - Model performance comparison
    - Automated decision making
    """
    
    def __init__(self, storage_dir: str = "experiments"):
        """
        Initialize A/B testing framework
        
        Args:
            storage_dir: Directory to store experiment data
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.mlflow_manager = get_mlflow_manager()
        self.aqi_calc = AQICalculator()
        
        # Active experiments cache
        self._active_experiments: Dict[str, ABTestExperiment] = {}
        self._load_active_experiments()
        
        logger.info(f"A/B Testing Framework initialized with storage: {self.storage_dir}")
    
    def create_experiment(self, 
                         name: str,
                         description: str,
                         hypothesis: str,
                         variants: List[Dict[str, Any]],
                         success_metric: str = "rmse",
                         duration_days: int = 14,
                         traffic_split_method: TrafficSplitMethod = TrafficSplitMethod.RANDOM,
                         minimum_sample_size: int = 1000,
                         confidence_level: float = 0.95,
                         minimum_effect_size: float = 0.05,
                         tags: List[str] = None,
                         metadata: Dict[str, Any] = None) -> ABTestExperiment:
        """
        Create a new A/B test experiment
        
        Args:
            name: Experiment name
            description: Detailed description
            hypothesis: Hypothesis being tested
            variants: List of variant configurations
            success_metric: Primary metric for evaluation
            duration_days: Experiment duration in days
            traffic_split_method: Method for traffic splitting
            minimum_sample_size: Minimum samples per variant
            confidence_level: Statistical confidence level
            minimum_effect_size: Minimum detectable effect size
            tags: Optional tags for categorization
            metadata: Additional metadata
            
        Returns:
            Created experiment object
        """
        # Generate unique experiment ID
        experiment_id = f"exp_{uuid.uuid4().hex[:8]}"
        
        # Validate variants
        if len(variants) < 2:
            raise ValueError("At least 2 variants required for A/B test")
        
        # Ensure traffic percentages sum to 100%
        total_traffic = sum(v.get('traffic_percentage', 0) for v in variants)
        if abs(total_traffic - 100.0) > 0.01:
            raise ValueError(f"Traffic percentages must sum to 100%, got {total_traffic}")
        
        # Ensure exactly one control variant
        control_count = sum(1 for v in variants if v.get('is_control', False))
        if control_count != 1:
            raise ValueError("Exactly one variant must be marked as control")
        
        # Create variant objects
        experiment_variants = []
        for i, variant_config in enumerate(variants):
            variant = ExperimentVariant(
                variant_id=variant_config.get('variant_id', f"variant_{i}"),
                name=variant_config['name'],
                description=variant_config.get('description', ''),
                model_name=variant_config['model_name'],
                model_version=variant_config['model_version'],
                traffic_percentage=variant_config['traffic_percentage'],
                is_control=variant_config.get('is_control', False),
                configuration=variant_config.get('configuration', {})
            )
            experiment_variants.append(variant)
        
        # Create experiment
        experiment = ABTestExperiment(
            experiment_id=experiment_id,
            name=name,
            description=description,
            hypothesis=hypothesis,
            success_metric=success_metric,
            variants=experiment_variants,
            traffic_split_method=traffic_split_method,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=duration_days),
            status=ExperimentStatus.DRAFT,
            minimum_sample_size=minimum_sample_size,
            confidence_level=confidence_level,
            minimum_effect_size=minimum_effect_size,
            tags=tags or [],
            metadata=metadata or {}
        )
        
        # Save experiment
        self._save_experiment(experiment)
        
        # Log to MLflow
        self._log_experiment_to_mlflow(experiment, "created")
        
        logger.info(f"Created A/B test experiment: {experiment_id} - {name}")
        return experiment
    
    def start_experiment(self, experiment_id: str) -> bool:
        """
        Start an A/B test experiment
        
        Args:
            experiment_id: ID of experiment to start
            
        Returns:
            True if started successfully
        """
        experiment = self.get_experiment(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        if experiment.status != ExperimentStatus.DRAFT:
            raise ValueError(f"Can only start experiments in DRAFT status, current: {experiment.status}")
        
        # Validate that all models exist and are accessible
        for variant in experiment.variants:
            try:
                model = self.mlflow_manager.load_model(
                    variant.model_name, 
                    version=variant.model_version
                )
                if model is None:
                    raise ValueError(f"Model {variant.model_name} v{variant.model_version} not found")
            except Exception as e:
                raise ValueError(f"Failed to load model for variant {variant.variant_id}: {e}")
        
        # Update status and start time
        experiment.status = ExperimentStatus.RUNNING
        experiment.start_date = datetime.utcnow()
        
        # Add to active experiments
        self._active_experiments[experiment_id] = experiment
        
        # Save updated experiment
        self._save_experiment(experiment)
        
        # Log to MLflow
        self._log_experiment_to_mlflow(experiment, "started")
        
        logger.info(f"Started A/B test experiment: {experiment_id}")
        return True
    
    def stop_experiment(self, experiment_id: str, reason: str = "manual_stop") -> bool:
        """
        Stop an A/B test experiment
        
        Args:
            experiment_id: ID of experiment to stop
            reason: Reason for stopping
            
        Returns:
            True if stopped successfully
        """
        experiment = self.get_experiment(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        if experiment.status not in [ExperimentStatus.RUNNING, ExperimentStatus.PAUSED]:
            raise ValueError(f"Can only stop RUNNING or PAUSED experiments, current: {experiment.status}")
        
        # Update status
        experiment.status = ExperimentStatus.COMPLETED
        experiment.end_date = datetime.utcnow()
        experiment.metadata['stop_reason'] = reason
        
        # Remove from active experiments
        if experiment_id in self._active_experiments:
            del self._active_experiments[experiment_id]
        
        # Save updated experiment
        self._save_experiment(experiment)
        
        # Log to MLflow
        self._log_experiment_to_mlflow(experiment, "stopped", {"reason": reason})
        
        logger.info(f"Stopped A/B test experiment: {experiment_id} (reason: {reason})")
        return True
    
    def assign_variant(self, experiment_id: str, 
                      user_id: Optional[str] = None,
                      location: Optional[Dict[str, float]] = None,
                      request_context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Assign a variant to a user/request based on experiment configuration
        
        Args:
            experiment_id: ID of the experiment
            user_id: Optional user identifier
            location: Optional location data (lat, lon)
            request_context: Additional context for assignment
            
        Returns:
            Assigned variant ID or None if experiment not active
        """
        experiment = self._active_experiments.get(experiment_id)
        if not experiment or not experiment.is_active:
            return None
        
        # Generate assignment key based on split method
        if experiment.traffic_split_method == TrafficSplitMethod.USER_ID:
            if not user_id:
                # Fallback to random if no user_id provided
                assignment_key = str(uuid.uuid4())
            else:
                assignment_key = user_id
        elif experiment.traffic_split_method == TrafficSplitMethod.LOCATION:
            if not location:
                assignment_key = str(uuid.uuid4())
            else:
                # Use location hash for consistent assignment
                location_str = f"{location.get('lat', 0):.4f},{location.get('lon', 0):.4f}"
                assignment_key = location_str
        elif experiment.traffic_split_method == TrafficSplitMethod.TIME_BASED:
            # Use hour of day for time-based splitting
            hour = datetime.utcnow().hour
            assignment_key = str(hour)
        else:  # RANDOM or CUSTOM
            assignment_key = str(uuid.uuid4())
        
        # Hash assignment key for consistent distribution
        hash_value = int(hashlib.md5(
            f"{experiment_id}:{assignment_key}".encode()
        ).hexdigest(), 16)
        
        # Determine variant based on traffic percentages
        random_value = (hash_value % 10000) / 100.0  # 0-99.99
        
        cumulative_percentage = 0.0
        for variant in experiment.variants:
            cumulative_percentage += variant.traffic_percentage
            if random_value < cumulative_percentage:
                return variant.variant_id
        
        # Fallback to control variant
        control = experiment.control_variant
        return control.variant_id if control else experiment.variants[0].variant_id
    
    def record_prediction(self, experiment_id: str, variant_id: str,
                         prediction_data: Dict[str, Any],
                         response_time_ms: float,
                         success: bool = True,
                         error: Optional[str] = None) -> bool:
        """
        Record a prediction result for experiment tracking
        
        Args:
            experiment_id: ID of the experiment
            variant_id: ID of the variant used
            prediction_data: Prediction data and metadata
            response_time_ms: Response time in milliseconds
            success: Whether prediction was successful
            error: Error message if prediction failed
            
        Returns:
            True if recorded successfully
        """
        try:
            # Load or create metrics file for this experiment
            metrics_file = self.storage_dir / f"{experiment_id}_metrics.jsonl"
            
            # Create metrics record
            record = {
                "timestamp": datetime.utcnow().isoformat(),
                "experiment_id": experiment_id,
                "variant_id": variant_id,
                "prediction_data": prediction_data,
                "response_time_ms": response_time_ms,
                "success": success,
                "error": error
            }
            
            # Append to metrics file
            with open(metrics_file, "a") as f:
                f.write(json.dumps(record) + "\n")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record prediction for experiment {experiment_id}: {e}")
            return False
    
    def get_experiment_metrics(self, experiment_id: str) -> Dict[str, ExperimentMetrics]:
        """
        Calculate current metrics for all variants in an experiment
        
        Args:
            experiment_id: ID of the experiment
            
        Returns:
            Dictionary mapping variant_id to metrics
        """
        metrics_file = self.storage_dir / f"{experiment_id}_metrics.jsonl"
        
        if not metrics_file.exists():
            return {}
        
        # Load all metrics records
        records = []
        try:
            with open(metrics_file, "r") as f:
                for line in f:
                    if line.strip():
                        records.append(json.loads(line))
        except Exception as e:
            logger.error(f"Failed to load metrics for experiment {experiment_id}: {e}")
            return {}
        
        # Group by variant
        variant_records = {}
        for record in records:
            variant_id = record["variant_id"]
            if variant_id not in variant_records:
                variant_records[variant_id] = []
            variant_records[variant_id].append(record)
        
        # Calculate metrics for each variant
        variant_metrics = {}
        for variant_id, variant_records_list in variant_records.items():
            metrics = self._calculate_variant_metrics(variant_records_list)
            variant_metrics[variant_id] = metrics
        
        return variant_metrics
    
    def analyze_experiment(self, experiment_id: str) -> ExperimentResult:
        """
        Perform statistical analysis of A/B test experiment
        
        Args:
            experiment_id: ID of the experiment to analyze
            
        Returns:
            Experiment analysis results
        """
        experiment = self.get_experiment(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        # Get current metrics
        variant_metrics = self.get_experiment_metrics(experiment_id)
        
        if len(variant_metrics) < 2:
            raise ValueError("Need at least 2 variants with data for analysis")
        
        # Find control and treatment variants
        control_variant = experiment.control_variant
        if not control_variant or control_variant.variant_id not in variant_metrics:
            raise ValueError("Control variant not found or has no data")
        
        control_metrics = variant_metrics[control_variant.variant_id]
        
        # Find best treatment variant
        treatment_variants = experiment.treatment_variants
        treatment_metrics = {
            v.variant_id: variant_metrics[v.variant_id] 
            for v in treatment_variants 
            if v.variant_id in variant_metrics
        }
        
        if not treatment_metrics:
            raise ValueError("No treatment variants with data found")
        
        # Determine winner based on success metric
        success_metric = experiment.success_metric
        
        # Get metric values for comparison
        control_value = self._get_metric_value(control_metrics, success_metric)
        
        best_treatment_id = None
        best_treatment_value = None
        
        for variant_id, metrics in treatment_metrics.items():
            treatment_value = self._get_metric_value(metrics, success_metric)
            
            if best_treatment_value is None or self._is_better_metric(
                treatment_value, best_treatment_value, success_metric
            ):
                best_treatment_id = variant_id
                best_treatment_value = treatment_value
        
        # Perform statistical significance test
        statistical_result = self._perform_statistical_test(
            control_value, best_treatment_value, 
            control_metrics.total_requests, treatment_metrics[best_treatment_id].total_requests,
            experiment.confidence_level
        )
        
        # Calculate effect size
        effect_size = self._calculate_effect_size(control_value, best_treatment_value, success_metric)
        
        # Determine business significance
        business_significance = abs(effect_size) >= experiment.minimum_effect_size
        
        # Determine winner
        winner = None
        if statistical_result['significant'] and business_significance:
            if self._is_better_metric(best_treatment_value, control_value, success_metric):
                winner = best_treatment_id
            else:
                winner = control_variant.variant_id
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            statistical_result, business_significance, effect_size, 
            control_metrics.total_requests, treatment_metrics[best_treatment_id].total_requests,
            experiment.minimum_sample_size
        )
        
        # Calculate experiment duration
        duration_days = (datetime.utcnow() - experiment.start_date).days
        
        # Total samples
        total_samples = sum(m.total_requests for m in variant_metrics.values())
        
        result = ExperimentResult(
            experiment_id=experiment_id,
            control_variant=control_variant.variant_id,
            treatment_variant=best_treatment_id,
            winner=winner,
            confidence_level=experiment.confidence_level,
            p_value=statistical_result['p_value'],
            effect_size=effect_size,
            statistical_significance=statistical_result['significant'],
            business_significance=business_significance,
            recommendation=recommendation,
            detailed_metrics=variant_metrics,
            duration_days=duration_days,
            total_samples=total_samples
        )
        
        # Log analysis to MLflow
        self._log_analysis_to_mlflow(experiment, result)
        
        return result
    
    def get_experiment(self, experiment_id: str) -> Optional[ABTestExperiment]:
        """Get experiment by ID"""
        # Check active experiments first
        if experiment_id in self._active_experiments:
            return self._active_experiments[experiment_id]
        
        # Load from storage
        return self._load_experiment(experiment_id)
    
    def list_experiments(self, status: Optional[ExperimentStatus] = None,
                        tags: Optional[List[str]] = None) -> List[ABTestExperiment]:
        """
        List experiments with optional filtering
        
        Args:
            status: Filter by experiment status
            tags: Filter by tags (experiments must have all specified tags)
            
        Returns:
            List of matching experiments
        """
        experiments = []
        
        # Load all experiment files
        for exp_file in self.storage_dir.glob("exp_*.json"):
            try:
                experiment = self._load_experiment_from_file(exp_file)
                if experiment:
                    # Apply filters
                    if status and experiment.status != status:
                        continue
                    
                    if tags and not all(tag in experiment.tags for tag in tags):
                        continue
                    
                    experiments.append(experiment)
            except Exception as e:
                logger.warning(f"Failed to load experiment from {exp_file}: {e}")
        
        # Sort by creation date (newest first)
        experiments.sort(key=lambda x: x.start_date, reverse=True)
        
        return experiments
    
    def _calculate_variant_metrics(self, records: List[Dict[str, Any]]) -> ExperimentMetrics:
        """Calculate metrics for a variant from its records"""
        if not records:
            return ExperimentMetrics(
                variant_id="unknown",
                total_requests=0,
                successful_predictions=0,
                failed_predictions=0,
                avg_response_time_ms=0.0,
                avg_prediction_confidence=0.0
            )
        
        variant_id = records[0]["variant_id"]
        total_requests = len(records)
        successful_predictions = sum(1 for r in records if r["success"])
        failed_predictions = total_requests - successful_predictions
        
        # Calculate average response time
        response_times = [r["response_time_ms"] for r in records]
        avg_response_time = np.mean(response_times) if response_times else 0.0
        
        # Calculate average confidence (if available)
        confidences = []
        rmse_values = []
        mae_values = []
        
        for record in records:
            pred_data = record.get("prediction_data", {})
            if "confidence" in pred_data:
                confidences.append(pred_data["confidence"])
            if "rmse" in pred_data:
                rmse_values.append(pred_data["rmse"])
            if "mae" in pred_data:
                mae_values.append(pred_data["mae"])
        
        avg_confidence = np.mean(confidences) if confidences else 0.0
        avg_rmse = np.mean(rmse_values) if rmse_values else None
        avg_mae = np.mean(mae_values) if mae_values else None
        
        return ExperimentMetrics(
            variant_id=variant_id,
            total_requests=total_requests,
            successful_predictions=successful_predictions,
            failed_predictions=failed_predictions,
            avg_response_time_ms=avg_response_time,
            avg_prediction_confidence=avg_confidence,
            rmse=avg_rmse,
            mae=avg_mae
        )
    
    def _get_metric_value(self, metrics: ExperimentMetrics, metric_name: str) -> float:
        """Get metric value by name"""
        metric_map = {
            "rmse": metrics.rmse,
            "mae": metrics.mae,
            "success_rate": metrics.success_rate,
            "error_rate": metrics.error_rate,
            "avg_response_time_ms": metrics.avg_response_time_ms,
            "avg_prediction_confidence": metrics.avg_prediction_confidence
        }
        
        value = metric_map.get(metric_name)
        if value is None:
            raise ValueError(f"Metric {metric_name} not available")
        
        return value
    
    def _is_better_metric(self, value1: float, value2: float, metric_name: str) -> bool:
        """Determine if value1 is better than value2 for the given metric"""
        # Lower is better for these metrics
        lower_is_better = ["rmse", "mae", "error_rate", "avg_response_time_ms"]
        
        if metric_name in lower_is_better:
            return value1 < value2
        else:
            return value1 > value2
    
    def _perform_statistical_test(self, control_value: float, treatment_value: float,
                                 control_n: int, treatment_n: int,
                                 confidence_level: float) -> Dict[str, Any]:
        """Perform statistical significance test"""
        # Simplified t-test implementation
        # In production, use scipy.stats for proper statistical tests
        
        # Handle edge cases
        if control_n == 0 or treatment_n == 0:
            return {"significant": False, "p_value": 1.0, "t_statistic": 0.0}
        
        # Calculate pooled standard error (simplified)
        # Use a more robust calculation to avoid NaN
        control_variance = max(0.001, control_value * (1 - min(control_value, 1.0)) / control_n)
        treatment_variance = max(0.001, treatment_value * (1 - min(treatment_value, 1.0)) / treatment_n)
        
        pooled_se = np.sqrt(control_variance + treatment_variance)
        
        if pooled_se == 0 or not np.isfinite(pooled_se):
            return {"significant": False, "p_value": 1.0, "t_statistic": 0.0}
        
        # Calculate t-statistic
        t_stat = abs(treatment_value - control_value) / pooled_se
        
        # Ensure t_statistic is finite
        if not np.isfinite(t_stat):
            t_stat = 0.0
        
        # Simplified p-value calculation (use proper statistical library in production)
        # This is a rough approximation
        if t_stat > 2.58:  # 99% confidence
            p_value = 0.01
        elif t_stat > 1.96:  # 95% confidence
            p_value = 0.05
        elif t_stat > 1.65:  # 90% confidence
            p_value = 0.10
        else:
            p_value = 0.20
        
        alpha = 1 - confidence_level
        significant = p_value < alpha
        
        return {
            "significant": significant,
            "p_value": p_value,
            "t_statistic": float(t_stat)
        }
    
    def _calculate_effect_size(self, control_value: float, treatment_value: float, 
                              metric_name: str) -> float:
        """Calculate effect size (Cohen's d approximation)"""
        if control_value == 0:
            return 0.0
        
        return (treatment_value - control_value) / control_value
    
    def _generate_recommendation(self, statistical_result: Dict[str, Any],
                               business_significance: bool, effect_size: float,
                               control_n: int, treatment_n: int,
                               min_sample_size: int) -> str:
        """Generate recommendation based on analysis results"""
        recommendations = []
        
        # Check sample size
        if control_n < min_sample_size or treatment_n < min_sample_size:
            recommendations.append(f"Continue experiment - insufficient sample size (need {min_sample_size} per variant)")
        
        # Check statistical significance
        if not statistical_result['significant']:
            recommendations.append("No statistically significant difference detected")
        
        # Check business significance
        if not business_significance:
            recommendations.append("Effect size too small for business impact")
        
        # Final recommendation
        if statistical_result['significant'] and business_significance:
            if effect_size > 0:
                recommendations.append("RECOMMEND: Deploy treatment variant")
            else:
                recommendations.append("RECOMMEND: Keep control variant")
        elif not recommendations:
            recommendations.append("Continue monitoring - results inconclusive")
        
        return "; ".join(recommendations)
    
    def _save_experiment(self, experiment: ABTestExperiment):
        """Save experiment to storage"""
        exp_file = self.storage_dir / f"{experiment.experiment_id}.json"
        
        # Convert to dict for JSON serialization
        exp_dict = asdict(experiment)
        
        # Convert datetime objects to ISO strings
        exp_dict['start_date'] = experiment.start_date.isoformat()
        exp_dict['end_date'] = experiment.end_date.isoformat()
        exp_dict['status'] = experiment.status.value
        exp_dict['traffic_split_method'] = experiment.traffic_split_method.value
        
        with open(exp_file, 'w') as f:
            json.dump(exp_dict, f, indent=2)
    
    def _load_experiment(self, experiment_id: str) -> Optional[ABTestExperiment]:
        """Load experiment from storage"""
        exp_file = self.storage_dir / f"{experiment_id}.json"
        return self._load_experiment_from_file(exp_file)
    
    def _load_experiment_from_file(self, exp_file: Path) -> Optional[ABTestExperiment]:
        """Load experiment from file"""
        if not exp_file.exists():
            return None
        
        try:
            with open(exp_file, 'r') as f:
                exp_dict = json.load(f)
            
            # Convert string dates back to datetime
            exp_dict['start_date'] = datetime.fromisoformat(exp_dict['start_date'])
            exp_dict['end_date'] = datetime.fromisoformat(exp_dict['end_date'])
            exp_dict['status'] = ExperimentStatus(exp_dict['status'])
            exp_dict['traffic_split_method'] = TrafficSplitMethod(exp_dict['traffic_split_method'])
            
            # Convert variant dicts to objects
            variants = []
            for v_dict in exp_dict['variants']:
                variant = ExperimentVariant(**v_dict)
                variants.append(variant)
            exp_dict['variants'] = variants
            
            return ABTestExperiment(**exp_dict)
            
        except Exception as e:
            logger.error(f"Failed to load experiment from {exp_file}: {e}")
            return None
    
    def _load_active_experiments(self):
        """Load all active experiments into cache"""
        for experiment in self.list_experiments(status=ExperimentStatus.RUNNING):
            if experiment.is_active:
                self._active_experiments[experiment.experiment_id] = experiment
    
    def _log_experiment_to_mlflow(self, experiment: ABTestExperiment, 
                                 action: str, metadata: Dict[str, Any] = None):
        """Log experiment event to MLflow"""
        try:
            with self.mlflow_manager.start_run(
                run_name=f"ab_test_{experiment.experiment_id}_{action}",
                tags={
                    "experiment_type": "ab_test",
                    "experiment_id": experiment.experiment_id,
                    "action": action
                }
            ) as run:
                import mlflow
                
                # Log experiment parameters
                mlflow.log_params({
                    "experiment_name": experiment.name,
                    "hypothesis": experiment.hypothesis,
                    "success_metric": experiment.success_metric,
                    "num_variants": len(experiment.variants),
                    "traffic_split_method": experiment.traffic_split_method.value,
                    "confidence_level": experiment.confidence_level,
                    "minimum_effect_size": experiment.minimum_effect_size
                })
                
                # Log variant information
                for i, variant in enumerate(experiment.variants):
                    mlflow.log_params({
                        f"variant_{i}_id": variant.variant_id,
                        f"variant_{i}_name": variant.name,
                        f"variant_{i}_model": f"{variant.model_name}:{variant.model_version}",
                        f"variant_{i}_traffic": variant.traffic_percentage,
                        f"variant_{i}_is_control": variant.is_control
                    })
                
                # Log metadata if provided
                if metadata:
                    mlflow.log_params(metadata)
                
        except Exception as e:
            logger.warning(f"Failed to log experiment to MLflow: {e}")
    
    def _log_analysis_to_mlflow(self, experiment: ABTestExperiment, result: ExperimentResult):
        """Log experiment analysis results to MLflow"""
        try:
            with self.mlflow_manager.start_run(
                run_name=f"ab_test_analysis_{experiment.experiment_id}",
                tags={
                    "experiment_type": "ab_test_analysis",
                    "experiment_id": experiment.experiment_id
                }
            ) as run:
                import mlflow
                
                # Log analysis results
                mlflow.log_metrics({
                    "p_value": result.p_value,
                    "effect_size": result.effect_size,
                    "confidence_level": result.confidence_level,
                    "duration_days": result.duration_days,
                    "total_samples": result.total_samples
                })
                
                mlflow.log_params({
                    "winner": result.winner or "none",
                    "statistical_significance": result.statistical_significance,
                    "business_significance": result.business_significance,
                    "recommendation": result.recommendation
                })
                
                # Log variant metrics
                for variant_id, metrics in result.detailed_metrics.items():
                    mlflow.log_metrics({
                        f"{variant_id}_total_requests": metrics.total_requests,
                        f"{variant_id}_success_rate": metrics.success_rate,
                        f"{variant_id}_avg_response_time": metrics.avg_response_time_ms,
                        f"{variant_id}_avg_confidence": metrics.avg_prediction_confidence
                    })
                    
                    if metrics.rmse is not None:
                        mlflow.log_metrics({f"{variant_id}_rmse": metrics.rmse})
                    if metrics.mae is not None:
                        mlflow.log_metrics({f"{variant_id}_mae": metrics.mae})
                
        except Exception as e:
            logger.warning(f"Failed to log analysis to MLflow: {e}")


# Singleton instance
_ab_testing_framework_instance = None

def get_ab_testing_framework(storage_dir: str = "experiments") -> ABTestingFramework:
    """Get or create A/B testing framework instance"""
    global _ab_testing_framework_instance
    if _ab_testing_framework_instance is None:
        _ab_testing_framework_instance = ABTestingFramework(storage_dir)
    return _ab_testing_framework_instance