"""
Model management API endpoints with MLflow integration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from ..auth import get_current_user
from ..schemas import UserResponse
from ...models.mlflow_manager import get_mlflow_manager
from ...tasks.model_training import (
    retrain_models, promote_best_model, 
    cleanup_old_model_versions, compare_model_performance
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/status")
async def get_models_status(current_user: UserResponse = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get status of all registered models
    """
    try:
        mlflow_manager = get_mlflow_manager()
        
        # Get status for each model type
        model_types = ["aqi_predictor_xgboost", "aqi_predictor_lstm", "aqi_predictor_gnn"]
        models_status = {}
        
        for model_name in model_types:
            try:
                # Get model versions
                comparison_df = mlflow_manager.compare_models(model_name, limit=5)
                
                if not comparison_df.empty:
                    latest_version = comparison_df.iloc[0]
                    models_status[model_name] = {
                        "latest_version": latest_version["version"],
                        "current_stage": latest_version["stage"],
                        "latest_rmse": latest_version.get("rmse"),
                        "latest_mae": latest_version.get("mae"),
                        "created_timestamp": latest_version["created_timestamp"],
                        "total_versions": len(comparison_df)
                    }
                else:
                    models_status[model_name] = {
                        "status": "no_versions_found"
                    }
                    
            except Exception as e:
                models_status[model_name] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "models": models_status
        }
        
    except Exception as e:
        logger.error(f"Failed to get models status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_name}/versions")
async def get_model_versions(
    model_name: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get versions of a specific model
    """
    try:
        mlflow_manager = get_mlflow_manager()
        comparison_df = mlflow_manager.compare_models(model_name, limit=limit)
        
        if comparison_df.empty:
            return {
                "model_name": model_name,
                "versions": [],
                "total_versions": 0
            }
        
        versions = comparison_df.to_dict('records')
        
        return {
            "model_name": model_name,
            "versions": versions,
            "total_versions": len(versions)
        }
        
    except Exception as e:
        logger.error(f"Failed to get model versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_name}/best")
async def get_best_model(
    model_name: str,
    metric: str = Query("rmse", description="Metric to optimize for"),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get the best performing model version
    """
    try:
        mlflow_manager = get_mlflow_manager()
        best_model_info = mlflow_manager.get_best_model(model_name, metric)
        
        return {
            "model_name": model_name,
            "best_model": best_model_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get best model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_name}/lineage/{version}")
async def get_model_lineage(
    model_name: str,
    version: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get model lineage information including training data and parameters
    """
    try:
        mlflow_manager = get_mlflow_manager()
        lineage = mlflow_manager.get_model_lineage(model_name, version)
        
        return {
            "model_name": model_name,
            "version": version,
            "lineage": lineage,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get model lineage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain")
async def trigger_model_retraining(
    model_types: Optional[List[str]] = None,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger model retraining for specified model types
    """
    try:
        # Validate model types
        valid_types = ["xgboost", "lstm", "gnn"]
        if model_types:
            invalid_types = [t for t in model_types if t not in valid_types]
            if invalid_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid model types: {invalid_types}. Valid types: {valid_types}"
                )
        
        # Trigger retraining task
        task = retrain_models.delay(model_types)
        
        return {
            "message": "Model retraining triggered",
            "task_id": task.id,
            "model_types": model_types or valid_types,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger model retraining: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{model_name}/promote")
async def promote_model_version(
    model_name: str,
    version: Optional[str] = None,
    stage: str = Query("Production", description="Target stage"),
    metric: str = Query("rmse", description="Metric to optimize for (if version not specified)"),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Promote a model version to a specific stage
    """
    try:
        mlflow_manager = get_mlflow_manager()
        
        if version:
            # Promote specific version
            success = mlflow_manager.promote_model(model_name, version, stage)
            
            return {
                "message": f"Model {model_name} version {version} promoted to {stage}",
                "model_name": model_name,
                "version": version,
                "stage": stage,
                "success": success,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # Promote best model based on metric
            task = promote_best_model.delay(model_name, metric)
            
            return {
                "message": f"Best {model_name} model promotion triggered",
                "task_id": task.id,
                "model_name": model_name,
                "metric": metric,
                "target_stage": stage,
                "timestamp": datetime.utcnow().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Failed to promote model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{model_name}/compare")
async def compare_model_versions(
    model_name: str,
    metric: str = Query("rmse", description="Metric to compare"),
    limit: int = Query(5, ge=2, le=20),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Compare performance of different model versions
    """
    try:
        # Trigger comparison task
        task = compare_model_performance.delay(model_name, metric, limit)
        
        return {
            "message": f"Model comparison triggered for {model_name}",
            "task_id": task.id,
            "model_name": model_name,
            "metric": metric,
            "versions_to_compare": limit,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger model comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{model_name}/cleanup")
async def cleanup_model_versions(
    model_name: str,
    keep_versions: int = Query(10, ge=1, le=50),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Clean up old model versions
    """
    try:
        # Trigger cleanup task
        task = cleanup_old_model_versions.delay(model_name, keep_versions)
        
        return {
            "message": f"Model cleanup triggered for {model_name}",
            "task_id": task.id,
            "model_name": model_name,
            "versions_to_keep": keep_versions,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger model cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments")
async def get_experiments(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get list of MLflow experiments
    """
    try:
        mlflow_manager = get_mlflow_manager()
        experiments = mlflow_manager.search_experiments()
        
        return {
            "experiments": experiments,
            "total_experiments": len(experiments),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get experiments: {e}")
        raise HTTPException(status_code=500, detail=str(e))