"""
MLflow configuration for AQI Predictor project
"""

import os
from pathlib import Path

# MLflow configuration
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", f"file://{Path.cwd()}/mlruns")
MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "aqi-predictor")
MLFLOW_ARTIFACT_ROOT = os.getenv("MLFLOW_ARTIFACT_ROOT", None)

# Model registry configuration
MODEL_REGISTRY_URI = os.getenv("MODEL_REGISTRY_URI", MLFLOW_TRACKING_URI)

# Model naming conventions
MODEL_NAMES = {
    "xgboost": "aqi_predictor_xgboost",
    "lstm": "aqi_predictor_lstm", 
    "gnn": "aqi_predictor_gnn",
    "ensemble": "aqi_predictor_ensemble"
}

# Model stages
MODEL_STAGES = {
    "NONE": "None",
    "STAGING": "Staging", 
    "PRODUCTION": "Production",
    "ARCHIVED": "Archived"
}

# Performance thresholds for model promotion
PERFORMANCE_THRESHOLDS = {
    "rmse_threshold": 25.0,  # Maximum RMSE for production promotion
    "mae_threshold": 20.0,   # Maximum MAE for production promotion
    "r2_threshold": 0.7,     # Minimum R² for production promotion
}

# Model retention policy
MODEL_RETENTION = {
    "keep_versions": 10,      # Number of versions to keep per model
    "cleanup_frequency": 7,   # Days between cleanup runs
    "archive_after_days": 30  # Archive models older than this
}

# Experiment tags
DEFAULT_TAGS = {
    "project": "aqi-predictor",
    "team": "data-science",
    "environment": os.getenv("ENVIRONMENT", "development")
}

# Logging configuration
MLFLOW_LOGGING = {
    "log_models": True,
    "log_artifacts": True,
    "log_metrics": True,
    "log_parameters": True,
    "log_system_metrics": False  # Set to True for detailed system monitoring
}

# Auto-promotion rules
AUTO_PROMOTION = {
    "enabled": os.getenv("MLFLOW_AUTO_PROMOTION", "false").lower() == "true",
    "metric": "rmse",
    "comparison": "min",  # "min" for metrics where lower is better
    "min_runs": 3,       # Minimum runs before auto-promotion
    "improvement_threshold": 0.05  # Minimum improvement for promotion
}