"""
Model training and retraining tasks for ML models.
Handles LSTM, GNN, and ensemble model training workflows with MLflow integration.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from celery import Task

from src.tasks.celery_app import celery_app
from src.models.mlflow_manager import get_mlflow_manager

logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} succeeded with result: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed with exception: {exc}")

@celery_app.task(base=CallbackTask, bind=True, max_retries=1)
def retrain_models(self, model_types: List[str] = None) -> Dict[str, Any]:
    """
    Retrain ML models with latest data.
    
    Args:
        model_types: List of model types to retrain. If None, retrain all models.
        
    Returns:
        Dictionary with retraining results and performance metrics.
    """
    try:
        logger.info("Starting model retraining")
        
        if not model_types:
            model_types = ["xgboost", "lstm", "gnn"]
        
        training_results = {}
        mlflow_manager = get_mlflow_manager()
        
        for model_type in model_types:
            try:
                logger.info(f"Retraining {model_type} model")
                
                # Mock training process with MLflow integration
                if model_type == "xgboost":
                    # Mock XGBoost training
                    training_time = 45  # minutes
                    rmse = 18.5
                    mae = 14.2
                    
                    # Log to MLflow
                    with mlflow_manager.start_run(
                        run_name=f"xgboost_retrain_{datetime.now().strftime('%Y%m%d_%H%M')}",
                        tags={"model_type": "xgboost", "run_type": "retraining"}
                    ) as run:
                        import mlflow
                        mlflow.log_metrics({
                            "rmse": rmse,
                            "mae": mae,
                            "r2_score": 0.85,
                            "training_time_minutes": training_time
                        })
                        mlflow.log_params({
                            "model_type": "xgboost",
                            "training_data_size": 100000,
                            "retrain_trigger": "scheduled"
                        })
                        run_id = run.info.run_id
                    
                elif model_type == "lstm":
                    # Mock LSTM training
                    training_time = 120  # minutes
                    rmse = 19.8
                    mae = 15.1
                    
                    # Log to MLflow
                    with mlflow_manager.start_run(
                        run_name=f"lstm_retrain_{datetime.now().strftime('%Y%m%d_%H%M')}",
                        tags={"model_type": "lstm", "run_type": "retraining"}
                    ) as run:
                        import mlflow
                        mlflow.log_metrics({
                            "rmse": rmse,
                            "mae": mae,
                            "r2_score": 0.85,
                            "training_time_minutes": training_time
                        })
                        mlflow.log_params({
                            "model_type": "lstm",
                            "sequence_length": 24,
                            "hidden_units": 64,
                            "training_data_size": 100000,
                            "retrain_trigger": "scheduled"
                        })
                        run_id = run.info.run_id
                    
                elif model_type == "gnn":
                    # Mock GNN training
                    training_time = 90  # minutes
                    rmse = 21.2
                    mae = 16.8
                    
                    # Log to MLflow
                    with mlflow_manager.start_run(
                        run_name=f"gnn_retrain_{datetime.now().strftime('%Y%m%d_%H%M')}",
                        tags={"model_type": "gnn", "run_type": "retraining"}
                    ) as run:
                        import mlflow
                        mlflow.log_metrics({
                            "rmse": rmse,
                            "mae": mae,
                            "r2_score": 0.85,
                            "training_time_minutes": training_time
                        })
                        mlflow.log_params({
                            "model_type": "gnn",
                            "hidden_dim": 64,
                            "num_layers": 3,
                            "num_stations": 50,
                            "training_data_size": 100000,
                            "retrain_trigger": "scheduled"
                        })
                        run_id = run.info.run_id
                
                training_results[model_type] = {
                    "status": "completed",
                    "training_time_minutes": training_time,
                    "metrics": {
                        "rmse": rmse,
                        "mae": mae,
                        "r2_score": 0.85
                    },
                    "model_version": f"{model_type}_v{datetime.now().strftime('%Y%m%d_%H%M')}",
                    "training_data_size": 100000,  # Mock data size
                    "validation_score": 0.82,
                    "mlflow_run_id": run_id
                }
                
            except Exception as e:
                logger.error(f"Failed to retrain {model_type} model: {e}")
                training_results[model_type] = {
                    "status": "failed",
                    "error": str(e)
                }
        
        # Calculate overall success rate
        successful_models = sum(1 for result in training_results.values() if result["status"] == "completed")
        success_rate = successful_models / len(model_types) if model_types else 0
        
        result = {
            "task": "retrain_models",
            "timestamp": datetime.utcnow().isoformat(),
            "models_requested": model_types,
            "successful_models": successful_models,
            "success_rate": success_rate,
            "training_results": training_results
        }
        
        logger.info(f"Model retraining completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Model retraining failed: {exc}")
        raise self.retry(exc=exc, countdown=300 * (2 ** self.request.retries))

@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def evaluate_model_performance(self, model_type: str, validation_period_days: int = 7) -> Dict[str, Any]:
    """
    Evaluate model performance on recent data.
    
    Args:
        model_type: Type of model to evaluate.
        validation_period_days: Number of days of recent data to use for validation.
        
    Returns:
        Performance evaluation results.
    """
    try:
        logger.info(f"Evaluating {model_type} model performance")
        
        # Mock performance evaluation
        validation_samples = validation_period_days * 24 * 10  # Hourly predictions for 10 locations
        
        # Mock performance metrics
        performance_metrics = {
            "rmse": 19.2 + (hash(model_type) % 10) / 10,  # Add some variation
            "mae": 15.1 + (hash(model_type) % 8) / 10,
            "r2_score": 0.83 + (hash(model_type) % 5) / 100,
            "mape": 12.5 + (hash(model_type) % 6) / 10,
            "accuracy_within_10_percent": 0.78,
            "accuracy_within_20_percent": 0.92
        }
        
        result = {
            "task": "evaluate_model_performance",
            "timestamp": datetime.utcnow().isoformat(),
            "model_type": model_type,
            "validation_period_days": validation_period_days,
            "validation_samples": validation_samples,
            "performance_metrics": performance_metrics,
            "evaluation_status": "completed"
        }
        
        logger.info(f"Model performance evaluation completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Model performance evaluation failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery_app.task(base=CallbackTask)
def update_model_registry(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update model registry with new model versions and metadata.
    
    Args:
        model_info: Model information including type, version, metrics, and metadata.
        
    Returns:
        Registry update results.
    """
    try:
        logger.info(f"Updating model registry for {model_info.get('model_type', 'unknown')}")
        
        # Mock model registry update
        registry_entry = {
            "model_id": f"{model_info['model_type']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "model_type": model_info["model_type"],
            "version": model_info.get("version", "1.0.0"),
            "created_at": datetime.utcnow().isoformat(),
            "metrics": model_info.get("metrics", {}),
            "status": "active",
            "deployment_ready": True
        }
        
        result = {
            "task": "update_model_registry",
            "timestamp": datetime.utcnow().isoformat(),
            "registry_entry": registry_entry,
            "update_status": "completed"
        }
        
        logger.info(f"Model registry update completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Model registry update failed: {e}")
        raise


@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def promote_best_model(self, model_name: str, metric: str = "rmse") -> Dict[str, Any]:
    """
    Promote the best performing model version to production.
    
    Args:
        model_name: Name of the registered model
        metric: Metric to optimize for (default: rmse)
        
    Returns:
        Promotion results
    """
    try:
        logger.info(f"Promoting best {model_name} model based on {metric}")
        
        mlflow_manager = get_mlflow_manager()
        
        # Get best model
        best_model_info = mlflow_manager.get_best_model(model_name, metric)
        
        # Promote to production
        success = mlflow_manager.promote_model(
            model_name=model_name,
            version=best_model_info["version"],
            stage="Production"
        )
        
        result = {
            "task": "promote_best_model",
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "promoted_version": best_model_info["version"],
            "metric_used": metric,
            "metric_value": best_model_info["metric_value"],
            "promotion_successful": success
        }
        
        logger.info(f"Model promotion completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Model promotion failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(base=CallbackTask)
def cleanup_old_model_versions(self, model_name: str, keep_versions: int = 10) -> Dict[str, Any]:
    """
    Clean up old model versions in MLflow registry.
    
    Args:
        model_name: Name of the registered model
        keep_versions: Number of recent versions to keep
        
    Returns:
        Cleanup results
    """
    try:
        logger.info(f"Cleaning up old versions of {model_name}")
        
        mlflow_manager = get_mlflow_manager()
        mlflow_manager.cleanup_old_models(model_name, keep_versions)
        
        result = {
            "task": "cleanup_old_model_versions",
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "versions_kept": keep_versions,
            "cleanup_status": "completed"
        }
        
        logger.info(f"Model cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Model cleanup failed: {e}")
        raise


@celery_app.task(base=CallbackTask, bind=True, max_retries=2)
def compare_model_performance(self, model_name: str, metric: str = "rmse", 
                            limit: int = 5) -> Dict[str, Any]:
    """
    Compare performance of different model versions.
    
    Args:
        model_name: Name of the registered model
        metric: Metric to compare
        limit: Number of versions to compare
        
    Returns:
        Comparison results
    """
    try:
        logger.info(f"Comparing performance of {model_name} models")
        
        mlflow_manager = get_mlflow_manager()
        comparison_df = mlflow_manager.compare_models(model_name, metric, limit)
        
        # Convert DataFrame to dict for JSON serialization
        comparison_results = comparison_df.to_dict('records')
        
        result = {
            "task": "compare_model_performance",
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "metric": metric,
            "versions_compared": len(comparison_results),
            "comparison_results": comparison_results
        }
        
        logger.info(f"Model comparison completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Model comparison failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))