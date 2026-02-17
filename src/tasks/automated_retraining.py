"""
Automated Model Retraining System for AQI Predictor

This module implements intelligent automated retraining capabilities including:
- Performance-based retraining triggers
- Data drift detection and response
- Adaptive scheduling based on model performance
- Automated model validation and promotion
- Comprehensive retraining pipeline orchestration
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import numpy as np
import pandas as pd
from celery import Task
import json
import os

from src.tasks.celery_app import celery_app
from src.models.mlflow_manager import get_mlflow_manager
from src.models.ensemble_forecaster import get_ensemble_forecaster, ModelPerformance
from src.api.monitoring import get_performance_monitor
from src.tasks.model_training import (
    retrain_models, evaluate_model_performance, 
    promote_best_model, compare_model_performance
)
from src.api.database import get_db_session
from src.api.models import AirQualityMeasurement, WeatherData

logger = logging.getLogger(__name__)

# Configuration paths
SCHEDULE_CONFIG_PATH = "models/retraining_schedule.json"


@dataclass
class RetrainingTrigger:
    """Represents a trigger condition for automated retraining"""
    trigger_type: str  # 'performance', 'drift', 'schedule', 'manual'
    model_name: str
    threshold_value: float
    current_value: float
    severity: str  # 'low', 'medium', 'high', 'critical'
    timestamp: datetime
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class RetrainingResult:
    """Results from automated retraining process"""
    trigger: RetrainingTrigger
    models_retrained: List[str]
    training_duration_minutes: float
    validation_results: Dict[str, Dict[str, float]]
    promotion_results: Dict[str, bool]
    success: bool
    error_message: Optional[str]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['trigger'] = self.trigger.to_dict()
        data['timestamp'] = self.timestamp.isoformat()
        return data


class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Automated retraining task {task_id} succeeded")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Automated retraining task {task_id} failed: {exc}")


@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def check_retraining_triggers(self) -> Dict[str, Any]:
    """
    Check all automated retraining trigger conditions.
    
    Returns:
        Dictionary with trigger check results and any triggered retraining
    """
    try:
        logger.info("Checking automated retraining triggers")
        
        triggers_found = []
        retraining_triggered = []
        
        # Check performance-based triggers
        performance_triggers = _check_performance_triggers()
        triggers_found.extend(performance_triggers)
        
        # Check data drift triggers
        drift_triggers = _check_data_drift_triggers()
        triggers_found.extend(drift_triggers)
        
        # Check scheduled retraining triggers
        schedule_triggers = _check_schedule_triggers()
        triggers_found.extend(schedule_triggers)
        
        # Process high-priority triggers
        for trigger in triggers_found:
            if trigger.severity in ['high', 'critical']:
                logger.warning(f"High-priority retraining trigger detected: {trigger.trigger_type} "
                             f"for {trigger.model_name} (severity: {trigger.severity})")
                
                # Trigger automated retraining
                retraining_task = execute_automated_retraining.delay(trigger.to_dict())
                retraining_triggered.append({
                    'trigger': trigger.to_dict(),
                    'task_id': retraining_task.id
                })
        
        result = {
            "task": "check_retraining_triggers",
            "timestamp": datetime.utcnow().isoformat(),
            "triggers_checked": len(triggers_found),
            "triggers_found": [t.to_dict() for t in triggers_found],
            "retraining_triggered": len(retraining_triggered),
            "triggered_tasks": retraining_triggered
        }
        
        logger.info(f"Retraining trigger check completed: {len(triggers_found)} triggers found, "
                   f"{len(retraining_triggered)} retraining tasks triggered")
        
        return result
        
    except Exception as exc:
        logger.error(f"Retraining trigger check failed: {exc}")
        raise self.retry(exc=exc, countdown=300 * (2 ** self.request.retries))


def _check_performance_triggers() -> List[RetrainingTrigger]:
    """Check for performance-based retraining triggers"""
    triggers = []
    
    try:
        monitor = get_performance_monitor()
        
        # Get recent model performance metrics (synchronous call)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            model_metrics = loop.run_until_complete(monitor.get_model_performance(days=7))
        finally:
            loop.close()
        
        # Group metrics by model
        model_performance = {}
        for metric in model_metrics:
            if metric.model_name not in model_performance:
                model_performance[metric.model_name] = []
            model_performance[metric.model_name].append(metric)
        
        # Check each model for performance degradation
        for model_name, metrics_list in model_performance.items():
            if len(metrics_list) < 5:  # Need at least 5 data points
                continue
            
            # Sort by timestamp
            metrics_list.sort(key=lambda x: x.timestamp)
            
            # Calculate recent vs historical performance
            recent_metrics = metrics_list[-3:]  # Last 3 evaluations
            historical_metrics = metrics_list[:-3] if len(metrics_list) > 3 else metrics_list
            
            recent_rmse = np.mean([m.rmse for m in recent_metrics])
            historical_rmse = np.mean([m.rmse for m in historical_metrics])
            
            recent_accuracy = np.mean([m.accuracy for m in recent_metrics])
            historical_accuracy = np.mean([m.accuracy for m in historical_metrics])
            
            # Check RMSE degradation
            rmse_degradation = (recent_rmse - historical_rmse) / historical_rmse
            if rmse_degradation > 0.15:  # 15% RMSE increase
                severity = 'critical' if rmse_degradation > 0.3 else 'high'
                triggers.append(RetrainingTrigger(
                    trigger_type='performance',
                    model_name=model_name,
                    threshold_value=0.15,
                    current_value=rmse_degradation,
                    severity=severity,
                    timestamp=datetime.utcnow(),
                    metadata={
                        'metric': 'rmse_degradation',
                        'recent_rmse': recent_rmse,
                        'historical_rmse': historical_rmse,
                        'degradation_percent': rmse_degradation * 100
                    }
                ))
            
            # Check accuracy degradation
            accuracy_degradation = (historical_accuracy - recent_accuracy) / historical_accuracy
            if accuracy_degradation > 0.10:  # 10% accuracy decrease
                severity = 'critical' if accuracy_degradation > 0.20 else 'high'
                triggers.append(RetrainingTrigger(
                    trigger_type='performance',
                    model_name=model_name,
                    threshold_value=0.10,
                    current_value=accuracy_degradation,
                    severity=severity,
                    timestamp=datetime.utcnow(),
                    metadata={
                        'metric': 'accuracy_degradation',
                        'recent_accuracy': recent_accuracy,
                        'historical_accuracy': historical_accuracy,
                        'degradation_percent': accuracy_degradation * 100
                    }
                ))
        
    except Exception as e:
        logger.error(f"Failed to check performance triggers: {e}")
    
    return triggers


def _check_data_drift_triggers() -> List[RetrainingTrigger]:
    """Check for data drift-based retraining triggers"""
    triggers = []
    
    try:
        # Get recent data for drift analysis
        with get_db_session() as db:
            # Get recent air quality data (last 7 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            historical_cutoff = datetime.utcnow() - timedelta(days=30)
            
            recent_data = db.query(AirQualityMeasurement).filter(
                AirQualityMeasurement.time >= recent_cutoff
            ).limit(10000).all()
            
            historical_data = db.query(AirQualityMeasurement).filter(
                AirQualityMeasurement.time >= historical_cutoff,
                AirQualityMeasurement.time < recent_cutoff
            ).limit(10000).all()
            
            if len(recent_data) < 100 or len(historical_data) < 100:
                logger.warning("Insufficient data for drift detection")
                return triggers
            
            # Convert to DataFrames for analysis
            recent_df = pd.DataFrame([{
                'pm25': d.value if d.parameter == 'pm25' else None,
                'pm10': d.value if d.parameter == 'pm10' else None,
                'timestamp': d.time
            } for d in recent_data])
            
            historical_df = pd.DataFrame([{
                'pm25': d.value if d.parameter == 'pm25' else None,
                'pm10': d.value if d.parameter == 'pm10' else None,
                'timestamp': d.time
            } for d in historical_data])
            
            # Calculate distribution statistics
            for parameter in ['pm25', 'pm10']:
                recent_values = recent_df[parameter].dropna()
                historical_values = historical_df[parameter].dropna()
                
                if len(recent_values) < 50 or len(historical_values) < 50:
                    continue
                
                # Calculate statistical measures
                recent_mean = recent_values.mean()
                historical_mean = historical_values.mean()
                recent_std = recent_values.std()
                historical_std = historical_values.std()
                
                # Check for mean shift
                mean_shift = abs(recent_mean - historical_mean) / historical_mean
                if mean_shift > 0.25:  # 25% mean shift
                    severity = 'critical' if mean_shift > 0.5 else 'high'
                    triggers.append(RetrainingTrigger(
                        trigger_type='drift',
                        model_name='ensemble',  # Affects all models
                        threshold_value=0.25,
                        current_value=mean_shift,
                        severity=severity,
                        timestamp=datetime.utcnow(),
                        metadata={
                            'parameter': parameter,
                            'drift_type': 'mean_shift',
                            'recent_mean': recent_mean,
                            'historical_mean': historical_mean,
                            'shift_percent': mean_shift * 100
                        }
                    ))
                
                # Check for variance change
                variance_ratio = recent_std / historical_std if historical_std > 0 else 1.0
                if variance_ratio > 2.0 or variance_ratio < 0.5:  # 2x variance change
                    severity = 'high' if variance_ratio > 3.0 or variance_ratio < 0.33 else 'medium'
                    triggers.append(RetrainingTrigger(
                        trigger_type='drift',
                        model_name='ensemble',
                        threshold_value=2.0,
                        current_value=variance_ratio,
                        severity=severity,
                        timestamp=datetime.utcnow(),
                        metadata={
                            'parameter': parameter,
                            'drift_type': 'variance_change',
                            'recent_std': recent_std,
                            'historical_std': historical_std,
                            'variance_ratio': variance_ratio
                        }
                    ))
    
    except Exception as e:
        logger.error(f"Failed to check data drift triggers: {e}")
    
    return triggers


def _check_schedule_triggers() -> List[RetrainingTrigger]:
    """Check for schedule-based retraining triggers"""
    triggers = []
    
    try:
        mlflow_manager = get_mlflow_manager()
        
        # Check when models were last retrained
        model_names = ['aqi_predictor_xgboost', 'aqi_predictor_lstm', 'aqi_predictor_gnn']
        
        for model_name in model_names:
            try:
                # Get latest model version
                latest_versions = mlflow_manager.client.get_latest_versions(
                    model_name, stages=["Production", "Staging", "None"]
                )
                
                if not latest_versions:
                    # No model exists, trigger initial training
                    triggers.append(RetrainingTrigger(
                        trigger_type='schedule',
                        model_name=model_name,
                        threshold_value=0,
                        current_value=float('inf'),
                        severity='high',
                        timestamp=datetime.utcnow(),
                        metadata={
                            'reason': 'no_model_exists',
                            'last_training': None
                        }
                    ))
                    continue
                
                latest_version = latest_versions[0]
                
                # Get the run that created this model version
                run = mlflow_manager.client.get_run(latest_version.run_id)
                last_training_time = datetime.fromtimestamp(run.info.start_time / 1000)
                
                # Calculate time since last training
                time_since_training = datetime.utcnow() - last_training_time
                days_since_training = time_since_training.days
                
                # Adaptive scheduling based on model type
                model_type = model_name.split('_')[-1]
                if model_type == 'xgboost':
                    max_days = 7  # Retrain weekly
                elif model_type == 'lstm':
                    max_days = 14  # Retrain bi-weekly
                elif model_type == 'gnn':
                    max_days = 21  # Retrain every 3 weeks
                else:
                    max_days = 7  # Default weekly
                
                if days_since_training >= max_days:
                    severity = 'critical' if days_since_training > max_days * 2 else 'medium'
                    triggers.append(RetrainingTrigger(
                        trigger_type='schedule',
                        model_name=model_name,
                        threshold_value=max_days,
                        current_value=days_since_training,
                        severity=severity,
                        timestamp=datetime.utcnow(),
                        metadata={
                            'reason': 'scheduled_retraining',
                            'last_training': last_training_time.isoformat(),
                            'days_since_training': days_since_training,
                            'max_days_threshold': max_days
                        }
                    ))
                
            except Exception as e:
                logger.warning(f"Could not check schedule for {model_name}: {e}")
                continue
    
    except Exception as e:
        logger.error(f"Failed to check schedule triggers: {e}")
    
    return triggers


@celery_app.task(base=CallbackTask, bind=True, max_retries=1)
def execute_automated_retraining(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute automated retraining pipeline based on trigger.
    
    Args:
        trigger_data: Serialized RetrainingTrigger data
        
    Returns:
        Dictionary with retraining results
    """
    try:
        # Reconstruct trigger object
        trigger_data['timestamp'] = datetime.fromisoformat(trigger_data['timestamp'])
        trigger = RetrainingTrigger(**trigger_data)
        
        logger.info(f"Executing automated retraining for {trigger.model_name} "
                   f"(trigger: {trigger.trigger_type}, severity: {trigger.severity})")
        
        start_time = datetime.utcnow()
        
        # Determine which models to retrain based on trigger
        if trigger.model_name == 'ensemble':
            # Retrain all models for ensemble-level triggers
            models_to_retrain = ['xgboost', 'lstm', 'gnn']
        else:
            # Extract model type from MLflow model name
            model_type = trigger.model_name.split('_')[-1]
            models_to_retrain = [model_type]
        
        # Execute retraining
        retraining_result = retrain_models.delay(models_to_retrain)
        retraining_data = retraining_result.get(timeout=3600)  # 1 hour timeout
        
        # Validate new models
        validation_results = {}
        for model_type in models_to_retrain:
            validation_task = evaluate_model_performance.delay(model_type, validation_period_days=3)
            validation_results[model_type] = validation_task.get(timeout=600)  # 10 minute timeout
        
        # Promote best models if validation passes
        promotion_results = {}
        for model_type in models_to_retrain:
            model_name = f"aqi_predictor_{model_type}"
            validation_metrics = validation_results[model_type]['performance_metrics']
            
            # Check if new model meets quality thresholds
            rmse_threshold = 25.0  # Maximum acceptable RMSE
            accuracy_threshold = 70.0  # Minimum acceptable accuracy
            
            if (validation_metrics['rmse'] <= rmse_threshold and 
                validation_metrics.get('accuracy_within_20_percent', 0) * 100 >= accuracy_threshold):
                
                # Promote to production
                promotion_task = promote_best_model.delay(model_name, 'rmse')
                promotion_result = promotion_task.get(timeout=300)  # 5 minute timeout
                promotion_results[model_type] = promotion_result['promotion_successful']
                
                logger.info(f"Model {model_type} promoted to production: "
                           f"RMSE {validation_metrics['rmse']:.2f}")
            else:
                promotion_results[model_type] = False
                logger.warning(f"Model {model_type} failed validation: "
                             f"RMSE {validation_metrics['rmse']:.2f}, "
                             f"Accuracy {validation_metrics.get('accuracy_within_20_percent', 0) * 100:.1f}%")
        
        # Calculate total duration
        end_time = datetime.utcnow()
        duration_minutes = (end_time - start_time).total_seconds() / 60
        
        # Create result object
        result = RetrainingResult(
            trigger=trigger,
            models_retrained=models_to_retrain,
            training_duration_minutes=duration_minutes,
            validation_results={k: v['performance_metrics'] for k, v in validation_results.items()},
            promotion_results=promotion_results,
            success=any(promotion_results.values()),
            error_message=None,
            timestamp=end_time
        )
        
        # Log to MLflow
        mlflow_manager = get_mlflow_manager()
        with mlflow_manager.start_run(
            run_name=f"automated_retraining_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            tags={
                "run_type": "automated_retraining",
                "trigger_type": trigger.trigger_type,
                "trigger_severity": trigger.severity
            }
        ) as run:
            import mlflow
            
            # Log retraining metrics
            mlflow.log_metrics({
                "retraining_duration_minutes": duration_minutes,
                "models_retrained": len(models_to_retrained),
                "models_promoted": sum(promotion_results.values()),
                "success_rate": sum(promotion_results.values()) / len(promotion_results) if promotion_results else 0
            })
            
            # Log trigger information
            mlflow.log_params({
                "trigger_type": trigger.trigger_type,
                "trigger_severity": trigger.severity,
                "trigger_model": trigger.model_name,
                "trigger_threshold": trigger.threshold_value,
                "trigger_value": trigger.current_value
            })
            
            # Log validation results
            for model_type, metrics in validation_results.items():
                mlflow.log_metrics({
                    f"{model_type}_validation_rmse": metrics['rmse'],
                    f"{model_type}_validation_mae": metrics['mae'],
                    f"{model_type}_validation_accuracy": metrics.get('accuracy_within_20_percent', 0) * 100
                })
        
        logger.info(f"Automated retraining completed: {len(models_to_retrain)} models retrained, "
                   f"{sum(promotion_results.values())} promoted to production")
        
        return result.to_dict()
        
    except Exception as exc:
        logger.error(f"Automated retraining failed: {exc}")
        
        # Create failure result
        result = RetrainingResult(
            trigger=RetrainingTrigger(**trigger_data),
            models_retrained=[],
            training_duration_minutes=0,
            validation_results={},
            promotion_results={},
            success=False,
            error_message=str(exc),
            timestamp=datetime.utcnow()
        )
        
        # Don't retry critical failures, but retry transient failures
        if "timeout" in str(exc).lower() or "connection" in str(exc).lower():
            raise self.retry(exc=exc, countdown=600 * (2 ** self.request.retries))
        else:
            return result.to_dict()


@celery_app.task(base=CallbackTask)
def update_retraining_schedule(model_performance_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update adaptive retraining schedule based on model performance.
    
    Args:
        model_performance_data: Recent model performance metrics
        
    Returns:
        Updated schedule configuration
    """
    try:
        logger.info("Updating adaptive retraining schedule")
        
        # Load current schedule configuration
        if os.path.exists(SCHEDULE_CONFIG_PATH):
            with open(SCHEDULE_CONFIG_PATH, 'r') as f:
                schedule_config = json.load(f)
        else:
            # Default schedule configuration
            schedule_config = {
                'xgboost': {'days': 7, 'performance_weight': 1.0},
                'lstm': {'days': 14, 'performance_weight': 1.0},
                'gnn': {'days': 21, 'performance_weight': 1.0}
            }
        
        # Update schedule based on performance
        for model_type, performance in model_performance_data.items():
            if model_type in schedule_config:
                current_days = schedule_config[model_type]['days']
                
                # Adjust schedule based on performance trends
                rmse = performance.get('rmse', 20.0)
                accuracy = performance.get('accuracy', 75.0)
                
                # Calculate performance score (0-1, higher is better)
                rmse_score = max(0, 1 - (rmse - 15) / 20)  # Best at 15, worst at 35
                accuracy_score = accuracy / 100
                performance_score = (rmse_score + accuracy_score) / 2
                
                # Adjust retraining frequency
                if performance_score < 0.7:  # Poor performance
                    new_days = max(3, int(current_days * 0.7))  # Retrain more frequently
                elif performance_score > 0.9:  # Excellent performance
                    new_days = min(30, int(current_days * 1.3))  # Retrain less frequently
                else:
                    new_days = current_days  # Keep current schedule
                
                schedule_config[model_type]['days'] = new_days
                schedule_config[model_type]['performance_weight'] = performance_score
                schedule_config[model_type]['last_updated'] = datetime.utcnow().isoformat()
        
        # Save updated schedule
        os.makedirs(os.path.dirname(SCHEDULE_CONFIG_PATH), exist_ok=True)
        with open(SCHEDULE_CONFIG_PATH, 'w') as f:
            json.dump(schedule_config, f, indent=2)
        
        result = {
            "task": "update_retraining_schedule",
            "timestamp": datetime.utcnow().isoformat(),
            "schedule_config": schedule_config,
            "models_updated": len(schedule_config)
        }
        
        logger.info(f"Retraining schedule updated: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to update retraining schedule: {e}")
        raise


@celery_app.task(base=CallbackTask)
def generate_retraining_report() -> Dict[str, Any]:
    """
    Generate comprehensive automated retraining report.
    
    Returns:
        Dictionary with retraining system status and metrics
    """
    try:
        logger.info("Generating automated retraining report")
        
        mlflow_manager = get_mlflow_manager()
        
        # Get recent retraining runs
        retraining_runs = mlflow_manager.client.search_runs(
            experiment_ids=[mlflow_manager.experiment_id],
            filter_string="tags.run_type = 'automated_retraining'",
            max_results=10,
            order_by=["start_time DESC"]
        )
        
        # Analyze retraining history
        retraining_history = []
        for run in retraining_runs:
            run_data = {
                'run_id': run.info.run_id,
                'start_time': datetime.fromtimestamp(run.info.start_time / 1000).isoformat(),
                'duration_minutes': run.data.metrics.get('retraining_duration_minutes', 0),
                'models_retrained': run.data.metrics.get('models_retrained', 0),
                'models_promoted': run.data.metrics.get('models_promoted', 0),
                'success_rate': run.data.metrics.get('success_rate', 0),
                'trigger_type': run.data.tags.get('trigger_type', 'unknown'),
                'trigger_severity': run.data.tags.get('trigger_severity', 'unknown')
            }
            retraining_history.append(run_data)
        
        # Calculate summary statistics
        if retraining_history:
            total_retrainings = len(retraining_history)
            avg_duration = np.mean([r['duration_minutes'] for r in retraining_history])
            avg_success_rate = np.mean([r['success_rate'] for r in retraining_history])
            
            # Count trigger types
            trigger_counts = {}
            for run in retraining_history:
                trigger_type = run['trigger_type']
                trigger_counts[trigger_type] = trigger_counts.get(trigger_type, 0) + 1
        else:
            total_retrainings = 0
            avg_duration = 0
            avg_success_rate = 0
            trigger_counts = {}
        
        # Get current model status
        model_status = {}
        for model_name in ['aqi_predictor_xgboost', 'aqi_predictor_lstm', 'aqi_predictor_gnn']:
            try:
                latest_versions = mlflow_manager.client.get_latest_versions(
                    model_name, stages=["Production", "Staging", "None"]
                )
                
                if latest_versions:
                    latest_version = latest_versions[0]
                    run = mlflow_manager.client.get_run(latest_version.run_id)
                    
                    model_status[model_name] = {
                        'version': latest_version.version,
                        'stage': latest_version.current_stage,
                        'last_updated': datetime.fromtimestamp(run.info.start_time / 1000).isoformat(),
                        'rmse': run.data.metrics.get('rmse', 'N/A'),
                        'mae': run.data.metrics.get('mae', 'N/A')
                    }
                else:
                    model_status[model_name] = {
                        'version': 'None',
                        'stage': 'None',
                        'last_updated': 'Never',
                        'rmse': 'N/A',
                        'mae': 'N/A'
                    }
            except Exception as e:
                logger.warning(f"Could not get status for {model_name}: {e}")
                model_status[model_name] = {'error': str(e)}
        
        # Load current schedule configuration
        if os.path.exists(SCHEDULE_CONFIG_PATH):
            with open(SCHEDULE_CONFIG_PATH, 'r') as f:
                schedule_config = json.load(f)
        else:
            schedule_config = {}
        
        report = {
            "task": "generate_retraining_report",
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_automated_retrainings": total_retrainings,
                "avg_retraining_duration_minutes": round(avg_duration, 2),
                "avg_success_rate": round(avg_success_rate, 3),
                "trigger_type_distribution": trigger_counts
            },
            "recent_retraining_history": retraining_history,
            "current_model_status": model_status,
            "adaptive_schedule_config": schedule_config,
            "system_health": {
                "automated_retraining_enabled": True,
                "last_trigger_check": "Active",
                "next_scheduled_check": "Every 30 minutes"
            }
        }
        
        logger.info(f"Automated retraining report generated: {total_retrainings} retrainings analyzed")
        return report
        
    except Exception as e:
        logger.error(f"Failed to generate retraining report: {e}")
        raise