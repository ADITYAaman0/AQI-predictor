"""
MLflow Model Versioning and Experiment Tracking Manager
"""

import os
import logging
import json
import pickle
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pathlib import Path

import mlflow
import mlflow.sklearn
import mlflow.tensorflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient
from mlflow.entities import ViewType
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MLflowManager:
    """
    MLflow integration for model versioning and experiment tracking
    
    Features:
    - Model versioning with automatic registration
    - Experiment tracking with metrics and parameters
    - Model artifact storage and retrieval
    - Model performance comparison
    - Automated model promotion (staging -> production)
    """
    
    def __init__(self, tracking_uri: str = None, experiment_name: str = "aqi-predictor"):
        """
        Initialize MLflow manager
        
        Args:
            tracking_uri: MLflow tracking server URI (defaults to local file store)
            experiment_name: Name of the MLflow experiment
        """
        # Set tracking URI
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        else:
            # Default to SQLite backend for model registry support
            mlflow_dir = os.path.join(os.getcwd(), "mlruns")
            os.makedirs(mlflow_dir, exist_ok=True)
            
            # Use SQLite database for model registry functionality
            db_path = os.path.join(mlflow_dir, "mlflow.db")
            mlflow.set_tracking_uri(f"sqlite:///{db_path}")
        
        self.client = MlflowClient()
        self.experiment_name = experiment_name
        
        # Create or get experiment
        try:
            self.experiment = mlflow.get_experiment_by_name(experiment_name)
            if self.experiment is None:
                self.experiment_id = mlflow.create_experiment(experiment_name)
                self.experiment = mlflow.get_experiment(self.experiment_id)
            else:
                self.experiment_id = self.experiment.experiment_id
        except Exception as e:
            logger.error(f"Failed to create/get MLflow experiment: {e}")
            raise
        
        logger.info(f"MLflow manager initialized with experiment: {experiment_name}")
    
    def start_run(self, run_name: str = None, tags: Dict[str, str] = None) -> mlflow.ActiveRun:
        """
        Start a new MLflow run
        
        Args:
            run_name: Name for the run
            tags: Additional tags for the run
            
        Returns:
            Active MLflow run
        """
        return mlflow.start_run(
            experiment_id=self.experiment_id,
            run_name=run_name,
            tags=tags
        )
    
    def log_model_training(self, model_type: str, model, 
                          training_data: Dict[str, Any],
                          metrics: Dict[str, float],
                          parameters: Dict[str, Any],
                          artifacts: Dict[str, str] = None) -> str:
        """
        Log model training run with MLflow
        
        Args:
            model_type: Type of model (xgboost, lstm, gnn)
            model: Trained model object
            training_data: Information about training data
            metrics: Training and validation metrics
            parameters: Model hyperparameters
            artifacts: Additional artifacts to log
            
        Returns:
            Run ID of the logged run
        """
        run_name = f"{model_type}_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        with self.start_run(run_name=run_name, tags={"model_type": model_type}) as run:
            # Log parameters
            mlflow.log_params(parameters)
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log training data info
            mlflow.log_params({
                "training_samples": training_data.get("n_samples", 0),
                "training_features": training_data.get("n_features", 0),
                "training_period": training_data.get("period", "unknown")
            })
            
            # Log model based on type
            if model_type == "xgboost":
                mlflow.sklearn.log_model(
                    model, 
                    "model",
                    registered_model_name=f"aqi_predictor_{model_type}"
                )
            elif model_type == "lstm":
                mlflow.tensorflow.log_model(
                    model.model if hasattr(model, 'model') else model,
                    "model",
                    registered_model_name=f"aqi_predictor_{model_type}"
                )
                
                # Log additional LSTM artifacts
                if hasattr(model, 'scaler'):
                    with open("scaler.pkl", "wb") as f:
                        pickle.dump(model.scaler, f)
                    mlflow.log_artifact("scaler.pkl")
                    os.remove("scaler.pkl")
                
                if hasattr(model, 'target_scaler'):
                    with open("target_scaler.pkl", "wb") as f:
                        pickle.dump(model.target_scaler, f)
                    mlflow.log_artifact("target_scaler.pkl")
                    os.remove("target_scaler.pkl")
                    
            elif model_type == "gnn":
                # For PyTorch models
                mlflow.pytorch.log_model(
                    model.model if hasattr(model, 'model') else model,
                    "model",
                    registered_model_name=f"aqi_predictor_{model_type}"
                )
                
                # Log GNN-specific artifacts
                if hasattr(model, 'adjacency_matrix'):
                    np.save("adjacency_matrix.npy", model.adjacency_matrix)
                    mlflow.log_artifact("adjacency_matrix.npy")
                    os.remove("adjacency_matrix.npy")
                
                if hasattr(model, 'stations'):
                    with open("stations.json", "w") as f:
                        stations_data = {
                            sid: {
                                "id": station.id,
                                "name": station.name,
                                "latitude": station.latitude,
                                "longitude": station.longitude
                            }
                            for sid, station in model.stations.items()
                        }
                        json.dump(stations_data, f)
                    mlflow.log_artifact("stations.json")
                    os.remove("stations.json")
            
            # Log additional artifacts
            if artifacts:
                for artifact_name, artifact_path in artifacts.items():
                    if os.path.exists(artifact_path):
                        mlflow.log_artifact(artifact_path, artifact_name)
            
            # Log model metadata
            model_info = {
                "model_type": model_type,
                "training_timestamp": datetime.now().isoformat(),
                "mlflow_version": mlflow.__version__
            }
            
            with open("model_info.json", "w") as f:
                json.dump(model_info, f)
            mlflow.log_artifact("model_info.json")
            os.remove("model_info.json")
            
            run_id = run.info.run_id
            logger.info(f"Logged {model_type} model training run: {run_id}")
            
            return run_id
    
    def load_model(self, model_name: str, version: str = "latest", 
                   stage: str = None) -> Any:
        """
        Load a model from MLflow registry
        
        Args:
            model_name: Name of the registered model
            version: Model version to load ("latest" or specific version)
            stage: Model stage ("staging", "production", etc.)
            
        Returns:
            Loaded model object
        """
        try:
            if stage:
                model_uri = f"models:/{model_name}/{stage}"
            else:
                if version == "latest":
                    # Get latest version
                    latest_version = self.client.get_latest_versions(
                        model_name, stages=["None", "Staging", "Production"]
                    )[0]
                    version = latest_version.version
                
                model_uri = f"models:/{model_name}/{version}"
            
            # Load model based on type
            if "xgboost" in model_name.lower():
                model = mlflow.sklearn.load_model(model_uri)
            elif "lstm" in model_name.lower():
                model = mlflow.tensorflow.load_model(model_uri)
            elif "gnn" in model_name.lower():
                model = mlflow.pytorch.load_model(model_uri)
            else:
                # Try to load as generic Python model
                model = mlflow.pyfunc.load_model(model_uri)
            
            logger.info(f"Loaded model {model_name} version {version}")
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise
    
    def compare_models(self, model_name: str, metric: str = "rmse", 
                      limit: int = 10) -> pd.DataFrame:
        """
        Compare different versions of a model
        
        Args:
            model_name: Name of the registered model
            metric: Metric to compare (rmse, mae, etc.)
            limit: Maximum number of versions to compare
            
        Returns:
            DataFrame with model comparison results
        """
        try:
            # Get model versions
            versions = self.client.search_model_versions(f"name='{model_name}'")
            
            comparison_data = []
            for version in versions[:limit]:
                run_id = version.run_id
                run = self.client.get_run(run_id)
                
                comparison_data.append({
                    "version": version.version,
                    "stage": version.current_stage,
                    "run_id": run_id,
                    "created_timestamp": version.creation_timestamp,
                    metric: run.data.metrics.get(metric, None),
                    "mae": run.data.metrics.get("mae", None),
                    "r2_score": run.data.metrics.get("r2_score", None)
                })
            
            df = pd.DataFrame(comparison_data)
            df = df.sort_values("created_timestamp", ascending=False)
            
            logger.info(f"Compared {len(df)} versions of {model_name}")
            return df
            
        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise
    
    def promote_model(self, model_name: str, version: str, 
                     stage: str = "Production") -> bool:
        """
        Promote a model version to a specific stage
        
        Args:
            model_name: Name of the registered model
            version: Version to promote
            stage: Target stage (Staging, Production, Archived)
            
        Returns:
            True if promotion successful
        """
        try:
            # Transition model to new stage
            self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage
            )
            
            logger.info(f"Promoted {model_name} version {version} to {stage}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to promote model: {e}")
            return False
    
    def get_best_model(self, model_name: str, metric: str = "rmse", 
                      ascending: bool = True) -> Dict[str, Any]:
        """
        Get the best performing model version based on a metric
        
        Args:
            model_name: Name of the registered model
            metric: Metric to optimize for
            ascending: True if lower values are better (e.g., RMSE)
            
        Returns:
            Dictionary with best model information
        """
        try:
            comparison_df = self.compare_models(model_name, metric)
            
            if comparison_df.empty:
                raise ValueError(f"No versions found for model {model_name}")
            
            # Filter out None values
            valid_df = comparison_df.dropna(subset=[metric])
            
            if valid_df.empty:
                raise ValueError(f"No valid {metric} values found")
            
            # Get best model
            best_model = valid_df.loc[
                valid_df[metric].idxmin() if ascending else valid_df[metric].idxmax()
            ]
            
            return {
                "model_name": model_name,
                "version": best_model["version"],
                "stage": best_model["stage"],
                "run_id": best_model["run_id"],
                "metric_value": best_model[metric],
                "metric_name": metric
            }
            
        except Exception as e:
            logger.error(f"Failed to get best model: {e}")
            raise
    
    def log_prediction_metrics(self, model_name: str, version: str,
                              predictions: np.ndarray, actuals: np.ndarray,
                              additional_metrics: Dict[str, float] = None):
        """
        Log prediction performance metrics for a deployed model
        
        Args:
            model_name: Name of the model
            version: Model version
            predictions: Predicted values
            actuals: Actual values
            additional_metrics: Additional metrics to log
        """
        try:
            # Calculate standard metrics
            from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
            
            rmse = np.sqrt(mean_squared_error(actuals, predictions))
            mae = mean_absolute_error(actuals, predictions)
            r2 = r2_score(actuals, predictions)
            
            metrics = {
                "prediction_rmse": rmse,
                "prediction_mae": mae,
                "prediction_r2": r2,
                "prediction_samples": len(predictions)
            }
            
            if additional_metrics:
                metrics.update(additional_metrics)
            
            # Log metrics with timestamp
            run_name = f"{model_name}_v{version}_prediction_{datetime.now().strftime('%Y%m%d_%H%M')}"
            
            with self.start_run(run_name=run_name, tags={
                "model_name": model_name,
                "model_version": version,
                "run_type": "prediction_evaluation"
            }) as run:
                mlflow.log_metrics(metrics)
                
                # Log prediction vs actual plot data
                prediction_data = pd.DataFrame({
                    "predictions": predictions,
                    "actuals": actuals,
                    "residuals": actuals - predictions
                })
                
                prediction_data.to_csv("prediction_results.csv", index=False)
                mlflow.log_artifact("prediction_results.csv")
                os.remove("prediction_results.csv")
            
            logger.info(f"Logged prediction metrics for {model_name} v{version}")
            
        except Exception as e:
            logger.error(f"Failed to log prediction metrics: {e}")
    
    def cleanup_old_models(self, model_name: str, keep_versions: int = 10):
        """
        Clean up old model versions, keeping only the most recent ones
        
        Args:
            model_name: Name of the registered model
            keep_versions: Number of versions to keep
        """
        try:
            versions = self.client.search_model_versions(f"name='{model_name}'")
            
            # Sort by creation timestamp (newest first)
            versions.sort(key=lambda x: x.creation_timestamp, reverse=True)
            
            # Archive old versions (skip production/staging models)
            archived_count = 0
            for version in versions[keep_versions:]:
                if version.current_stage not in ["Production", "Staging"]:
                    self.client.transition_model_version_stage(
                        name=model_name,
                        version=version.version,
                        stage="Archived"
                    )
                    archived_count += 1
            
            logger.info(f"Archived {archived_count} old versions of {model_name}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old models: {e}")
    
    def get_model_lineage(self, model_name: str, version: str) -> Dict[str, Any]:
        """
        Get model lineage information including training data and parameters
        
        Args:
            model_name: Name of the registered model
            version: Model version
            
        Returns:
            Dictionary with model lineage information
        """
        try:
            # Get model version
            model_version = self.client.get_model_version(model_name, version)
            run_id = model_version.run_id
            
            # Get run details
            run = self.client.get_run(run_id)
            
            lineage = {
                "model_name": model_name,
                "version": version,
                "run_id": run_id,
                "created_timestamp": model_version.creation_timestamp,
                "current_stage": model_version.current_stage,
                "parameters": run.data.params,
                "metrics": run.data.metrics,
                "tags": run.data.tags,
                "artifacts": [artifact.path for artifact in self.client.list_artifacts(run_id)]
            }
            
            return lineage
            
        except Exception as e:
            logger.error(f"Failed to get model lineage: {e}")
            raise
    
    def search_experiments(self, filter_string: str = None) -> List[Dict[str, Any]]:
        """
        Search experiments with optional filtering
        
        Args:
            filter_string: MLflow search filter string
            
        Returns:
            List of experiment information
        """
        try:
            experiments = self.client.search_experiments(
                view_type=ViewType.ACTIVE_ONLY,
                filter_string=filter_string
            )
            
            return [
                {
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "lifecycle_stage": exp.lifecycle_stage,
                    "creation_time": exp.creation_time
                }
                for exp in experiments
            ]
            
        except Exception as e:
            logger.error(f"Failed to search experiments: {e}")
            raise


# Singleton instance
_mlflow_manager_instance = None

def get_mlflow_manager(tracking_uri: str = None, 
                      experiment_name: str = "aqi-predictor") -> MLflowManager:
    """Get or create MLflow manager instance"""
    global _mlflow_manager_instance
    if _mlflow_manager_instance is None:
        _mlflow_manager_instance = MLflowManager(tracking_uri, experiment_name)
    return _mlflow_manager_instance