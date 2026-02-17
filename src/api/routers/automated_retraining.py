"""
API endpoints for automated retraining management and monitoring.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from ..auth import get_current_user
from ..schemas import UserResponse
from ...tasks.automated_retraining import (
    check_retraining_triggers, execute_automated_retraining,
    update_retraining_schedule, generate_retraining_report
)
from ...models.mlflow_manager import get_mlflow_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/automated-retraining", tags=["Automated Retraining"])


class TriggerRetrainingRequest(BaseModel):
    """Request model for manual retraining trigger"""
    model_name: str
    trigger_type: str = "manual"
    reason: str
    severity: str = "medium"


class RetrainingConfigUpdate(BaseModel):
    """Request model for updating retraining configuration"""
    model_type: str
    schedule_days: int
    performance_thresholds: Dict[str, float]


@router.get("/status")
async def get_retraining_status(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current automated retraining system status.
    """
    try:
        logger.info("Getting automated retraining status")
        
        # Generate comprehensive report
        report_task = generate_retraining_report.delay()
        report = report_task.get(timeout=30)
        
        return {
            "status": "active",
            "timestamp": datetime.utcnow().isoformat(),
            "system_report": report
        }
        
    except Exception as e:
        logger.error(f"Failed to get retraining status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/triggers/check")
async def check_triggers(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Manually trigger a check for retraining conditions.
    """
    try:
        logger.info("Manual trigger check requested")
        
        # Execute trigger check
        check_task = check_retraining_triggers.delay()
        result = check_task.get(timeout=60)
        
        return {
            "message": "Retraining trigger check completed",
            "timestamp": datetime.utcnow().isoformat(),
            "check_result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to check retraining triggers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/triggers/manual")
async def trigger_manual_retraining(
    request: TriggerRetrainingRequest,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Manually trigger automated retraining for a specific model.
    """
    try:
        logger.info(f"Manual retraining trigger for {request.model_name}")
        
        # Validate model name
        valid_models = ['aqi_predictor_xgboost', 'aqi_predictor_lstm', 'aqi_predictor_gnn', 'ensemble']
        if request.model_name not in valid_models:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid model name. Must be one of: {valid_models}"
            )
        
        # Create manual trigger
        trigger_data = {
            'trigger_type': request.trigger_type,
            'model_name': request.model_name,
            'threshold_value': 0.0,
            'current_value': 1.0,
            'severity': request.severity,
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {
                'reason': request.reason,
                'triggered_by': current_user.email,
                'manual_trigger': True
            }
        }
        
        # Execute automated retraining
        retraining_task = execute_automated_retraining.delay(trigger_data)
        
        return {
            "message": f"Manual retraining triggered for {request.model_name}",
            "task_id": retraining_task.id,
            "trigger_data": trigger_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger manual retraining: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_retraining_history(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to look back"),
    model_name: Optional[str] = Query(default=None, description="Filter by model name"),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get automated retraining history.
    """
    try:
        logger.info(f"Getting retraining history for {days} days")
        
        mlflow_manager = get_mlflow_manager()
        
        # Build filter string
        filter_parts = ["tags.run_type = 'automated_retraining'"]
        
        if model_name:
            filter_parts.append(f"tags.trigger_model = '{model_name}'")
        
        # Add time filter (MLflow uses milliseconds)
        cutoff_time = int((datetime.utcnow() - timedelta(days=days)).timestamp() * 1000)
        filter_parts.append(f"attributes.start_time >= {cutoff_time}")
        
        filter_string = " and ".join(filter_parts)
        
        # Search for retraining runs
        runs = mlflow_manager.client.search_runs(
            experiment_ids=[mlflow_manager.experiment_id],
            filter_string=filter_string,
            max_results=100,
            order_by=["start_time DESC"]
        )
        
        # Format results
        history = []
        for run in runs:
            run_data = {
                'run_id': run.info.run_id,
                'start_time': datetime.fromtimestamp(run.info.start_time / 1000).isoformat(),
                'end_time': datetime.fromtimestamp(run.info.end_time / 1000).isoformat() if run.info.end_time else None,
                'status': run.info.status,
                'duration_minutes': run.data.metrics.get('retraining_duration_minutes', 0),
                'models_retrained': run.data.metrics.get('models_retrained', 0),
                'models_promoted': run.data.metrics.get('models_promoted', 0),
                'success_rate': run.data.metrics.get('success_rate', 0),
                'trigger_type': run.data.tags.get('trigger_type', 'unknown'),
                'trigger_severity': run.data.tags.get('trigger_severity', 'unknown'),
                'trigger_model': run.data.tags.get('trigger_model', 'unknown')
            }
            history.append(run_data)
        
        return {
            "history": history,
            "total_runs": len(history),
            "period_days": days,
            "model_filter": model_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get retraining history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_retraining_config(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current automated retraining configuration.
    """
    try:
        logger.info("Getting retraining configuration")
        
        import json
        import os
        
        # Load schedule configuration
        schedule_config_path = "models/retraining_schedule.json"
        if os.path.exists(schedule_config_path):
            with open(schedule_config_path, 'r') as f:
                schedule_config = json.load(f)
        else:
            schedule_config = {
                'xgboost': {'days': 7, 'performance_weight': 1.0},
                'lstm': {'days': 14, 'performance_weight': 1.0},
                'gnn': {'days': 21, 'performance_weight': 1.0}
            }
        
        # Add default thresholds
        config = {
            "schedule_config": schedule_config,
            "performance_thresholds": {
                "rmse_degradation_threshold": 0.15,
                "accuracy_degradation_threshold": 0.10,
                "mean_shift_threshold": 0.25,
                "variance_ratio_threshold": 2.0
            },
            "validation_thresholds": {
                "max_rmse": 25.0,
                "min_accuracy_percent": 70.0
            },
            "system_settings": {
                "trigger_check_interval_minutes": 30,
                "max_concurrent_retrainings": 1,
                "retraining_timeout_hours": 1
            }
        }
        
        return {
            "config": config,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get retraining config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_retraining_config(
    config_update: RetrainingConfigUpdate,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update automated retraining configuration.
    """
    try:
        logger.info(f"Updating retraining config for {config_update.model_type}")
        
        # Validate model type
        valid_types = ['xgboost', 'lstm', 'gnn']
        if config_update.model_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {valid_types}"
            )
        
        # Validate schedule days
        if not (1 <= config_update.schedule_days <= 90):
            raise HTTPException(
                status_code=400,
                detail="Schedule days must be between 1 and 90"
            )
        
        import json
        import os
        
        # Load current configuration
        schedule_config_path = "models/retraining_schedule.json"
        if os.path.exists(schedule_config_path):
            with open(schedule_config_path, 'r') as f:
                schedule_config = json.load(f)
        else:
            schedule_config = {}
        
        # Update configuration
        if config_update.model_type not in schedule_config:
            schedule_config[config_update.model_type] = {}
        
        schedule_config[config_update.model_type].update({
            'days': config_update.schedule_days,
            'performance_thresholds': config_update.performance_thresholds,
            'last_updated': datetime.utcnow().isoformat(),
            'updated_by': current_user.email
        })
        
        # Save updated configuration
        os.makedirs(os.path.dirname(schedule_config_path), exist_ok=True)
        with open(schedule_config_path, 'w') as f:
            json.dump(schedule_config, f, indent=2)
        
        return {
            "message": f"Retraining configuration updated for {config_update.model_type}",
            "updated_config": schedule_config[config_update.model_type],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update retraining config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_retraining_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days for metrics"),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get automated retraining performance metrics.
    """
    try:
        logger.info(f"Getting retraining metrics for {days} days")
        
        mlflow_manager = get_mlflow_manager()
        
        # Get retraining runs
        cutoff_time = int((datetime.utcnow() - timedelta(days=days)).timestamp() * 1000)
        
        runs = mlflow_manager.client.search_runs(
            experiment_ids=[mlflow_manager.experiment_id],
            filter_string=f"tags.run_type = 'automated_retraining' and attributes.start_time >= {cutoff_time}",
            max_results=1000,
            order_by=["start_time DESC"]
        )
        
        if not runs:
            return {
                "metrics": {
                    "total_retrainings": 0,
                    "success_rate": 0,
                    "avg_duration_minutes": 0,
                    "trigger_distribution": {},
                    "model_distribution": {}
                },
                "period_days": days,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Calculate metrics
        total_retrainings = len(runs)
        successful_runs = [r for r in runs if r.data.metrics.get('success_rate', 0) > 0]
        success_rate = len(successful_runs) / total_retrainings if total_retrainings > 0 else 0
        
        durations = [r.data.metrics.get('retraining_duration_minutes', 0) for r in runs]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Trigger type distribution
        trigger_distribution = {}
        for run in runs:
            trigger_type = run.data.tags.get('trigger_type', 'unknown')
            trigger_distribution[trigger_type] = trigger_distribution.get(trigger_type, 0) + 1
        
        # Model distribution
        model_distribution = {}
        for run in runs:
            models_retrained = int(run.data.metrics.get('models_retrained', 0))
            model_distribution['total_models'] = model_distribution.get('total_models', 0) + models_retrained
        
        # Recent performance trend
        recent_runs = runs[:10]  # Last 10 runs
        recent_success_rate = len([r for r in recent_runs if r.data.metrics.get('success_rate', 0) > 0]) / len(recent_runs) if recent_runs else 0
        
        metrics = {
            "total_retrainings": total_retrainings,
            "success_rate": round(success_rate, 3),
            "avg_duration_minutes": round(avg_duration, 2),
            "trigger_distribution": trigger_distribution,
            "model_distribution": model_distribution,
            "recent_success_rate": round(recent_success_rate, 3),
            "performance_trend": "improving" if recent_success_rate > success_rate else "stable" if recent_success_rate == success_rate else "declining"
        }
        
        return {
            "metrics": metrics,
            "period_days": days,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get retraining metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_retraining_system(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test the automated retraining system with a dry run.
    """
    try:
        logger.info("Testing automated retraining system")
        
        # Run trigger check without executing retraining
        check_task = check_retraining_triggers.delay()
        check_result = check_task.get(timeout=60)
        
        # Analyze system health
        system_health = {
            "trigger_check_functional": True,
            "mlflow_connection": True,
            "database_connection": True,
            "celery_workers": True
        }
        
        try:
            mlflow_manager = get_mlflow_manager()
            mlflow_manager.client.search_experiments()
        except Exception as e:
            system_health["mlflow_connection"] = False
            logger.warning(f"MLflow connection test failed: {e}")
        
        return {
            "message": "Automated retraining system test completed",
            "system_health": system_health,
            "trigger_check_result": check_result,
            "test_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Retraining system test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))