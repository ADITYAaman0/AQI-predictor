"""
A/B Testing API endpoints for ML model experiments
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta

from ..auth import get_current_user
from ..schemas import UserResponse
from ...models.ab_testing_framework import (
    get_ab_testing_framework, ABTestExperiment, ExperimentStatus,
    TrafficSplitMethod, ExperimentVariant, ExperimentResult
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ab-testing", tags=["ab-testing"])


@router.post("/experiments")
async def create_experiment(
    experiment_config: Dict[str, Any] = Body(...),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new A/B test experiment
    
    Request body should contain:
    - name: Experiment name
    - description: Detailed description
    - hypothesis: Hypothesis being tested
    - variants: List of variant configurations
    - success_metric: Primary metric for evaluation (default: "rmse")
    - duration_days: Experiment duration in days (default: 14)
    - traffic_split_method: Method for traffic splitting (default: "random")
    - minimum_sample_size: Minimum samples per variant (default: 1000)
    - confidence_level: Statistical confidence level (default: 0.95)
    - minimum_effect_size: Minimum detectable effect size (default: 0.05)
    - tags: Optional tags for categorization
    - metadata: Additional metadata
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Validate required fields
        required_fields = ["name", "description", "hypothesis", "variants"]
        for field in required_fields:
            if field not in experiment_config:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        # Parse traffic split method
        traffic_split_method = TrafficSplitMethod.RANDOM
        if "traffic_split_method" in experiment_config:
            try:
                traffic_split_method = TrafficSplitMethod(experiment_config["traffic_split_method"])
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid traffic_split_method. Valid options: {[m.value for m in TrafficSplitMethod]}"
                )
        
        # Create experiment
        experiment = ab_framework.create_experiment(
            name=experiment_config["name"],
            description=experiment_config["description"],
            hypothesis=experiment_config["hypothesis"],
            variants=experiment_config["variants"],
            success_metric=experiment_config.get("success_metric", "rmse"),
            duration_days=experiment_config.get("duration_days", 14),
            traffic_split_method=traffic_split_method,
            minimum_sample_size=experiment_config.get("minimum_sample_size", 1000),
            confidence_level=experiment_config.get("confidence_level", 0.95),
            minimum_effect_size=experiment_config.get("minimum_effect_size", 0.05),
            tags=experiment_config.get("tags", []),
            metadata=experiment_config.get("metadata", {})
        )
        
        return {
            "experiment_id": experiment.experiment_id,
            "name": experiment.name,
            "status": experiment.status.value,
            "variants": [
                {
                    "variant_id": v.variant_id,
                    "name": v.name,
                    "model_name": v.model_name,
                    "model_version": v.model_version,
                    "traffic_percentage": v.traffic_percentage,
                    "is_control": v.is_control
                }
                for v in experiment.variants
            ],
            "start_date": experiment.start_date.isoformat(),
            "end_date": experiment.end_date.isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create A/B test experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments")
async def list_experiments(
    status: Optional[str] = Query(None, description="Filter by experiment status"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List A/B test experiments with optional filtering
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Parse status filter
        status_filter = None
        if status:
            try:
                status_filter = ExperimentStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status. Valid options: {[s.value for s in ExperimentStatus]}"
                )
        
        # Get experiments
        experiments = ab_framework.list_experiments(status=status_filter, tags=tags)
        
        # Apply pagination
        total_count = len(experiments)
        paginated_experiments = experiments[offset:offset + limit]
        
        # Format response
        experiment_list = []
        for exp in paginated_experiments:
            experiment_list.append({
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "description": exp.description,
                "status": exp.status.value,
                "success_metric": exp.success_metric,
                "num_variants": len(exp.variants),
                "traffic_split_method": exp.traffic_split_method.value,
                "start_date": exp.start_date.isoformat(),
                "end_date": exp.end_date.isoformat(),
                "is_active": exp.is_active,
                "tags": exp.tags,
                "created_by": exp.created_by
            })
        
        return {
            "experiments": experiment_list,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "filters": {
                "status": status,
                "tags": tags
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list A/B test experiments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}")
async def get_experiment(
    experiment_id: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed information about a specific experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        experiment = ab_framework.get_experiment(experiment_id)
        
        if not experiment:
            raise HTTPException(
                status_code=404,
                detail=f"Experiment {experiment_id} not found"
            )
        
        return {
            "experiment_id": experiment.experiment_id,
            "name": experiment.name,
            "description": experiment.description,
            "hypothesis": experiment.hypothesis,
            "status": experiment.status.value,
            "success_metric": experiment.success_metric,
            "traffic_split_method": experiment.traffic_split_method.value,
            "start_date": experiment.start_date.isoformat(),
            "end_date": experiment.end_date.isoformat(),
            "minimum_sample_size": experiment.minimum_sample_size,
            "confidence_level": experiment.confidence_level,
            "minimum_effect_size": experiment.minimum_effect_size,
            "is_active": experiment.is_active,
            "variants": [
                {
                    "variant_id": v.variant_id,
                    "name": v.name,
                    "description": v.description,
                    "model_name": v.model_name,
                    "model_version": v.model_version,
                    "traffic_percentage": v.traffic_percentage,
                    "is_control": v.is_control,
                    "configuration": v.configuration
                }
                for v in experiment.variants
            ],
            "tags": experiment.tags,
            "metadata": experiment.metadata,
            "created_by": experiment.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Start an A/B test experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        success = ab_framework.start_experiment(experiment_id)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to start experiment {experiment_id}"
            )
        
        experiment = ab_framework.get_experiment(experiment_id)
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.status.value,
            "started_at": experiment.start_date.isoformat(),
            "message": f"Experiment {experiment_id} started successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/stop")
async def stop_experiment(
    experiment_id: str,
    reason: str = Body("manual_stop", embed=True),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Stop an A/B test experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        success = ab_framework.stop_experiment(experiment_id, reason)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to stop experiment {experiment_id}"
            )
        
        experiment = ab_framework.get_experiment(experiment_id)
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.status.value,
            "stopped_at": experiment.end_date.isoformat(),
            "reason": reason,
            "message": f"Experiment {experiment_id} stopped successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to stop experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/assign")
async def assign_variant(
    experiment_id: str,
    assignment_request: Dict[str, Any] = Body(...),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Assign a variant to a user/request
    
    Request body can contain:
    - user_id: Optional user identifier
    - location: Optional location data (lat, lon)
    - request_context: Additional context for assignment
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        variant_id = ab_framework.assign_variant(
            experiment_id=experiment_id,
            user_id=assignment_request.get("user_id"),
            location=assignment_request.get("location"),
            request_context=assignment_request.get("request_context")
        )
        
        if not variant_id:
            raise HTTPException(
                status_code=404,
                detail=f"Experiment {experiment_id} not found or not active"
            )
        
        # Get variant details
        experiment = ab_framework.get_experiment(experiment_id)
        variant = next((v for v in experiment.variants if v.variant_id == variant_id), None)
        
        return {
            "experiment_id": experiment_id,
            "assigned_variant": {
                "variant_id": variant_id,
                "name": variant.name if variant else "unknown",
                "model_name": variant.model_name if variant else "unknown",
                "model_version": variant.model_version if variant else "unknown",
                "is_control": variant.is_control if variant else False
            },
            "assignment_timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to assign variant for experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/record")
async def record_prediction(
    experiment_id: str,
    prediction_record: Dict[str, Any] = Body(...),
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Record a prediction result for experiment tracking
    
    Request body should contain:
    - variant_id: ID of the variant used
    - prediction_data: Prediction data and metadata
    - response_time_ms: Response time in milliseconds
    - success: Whether prediction was successful (default: True)
    - error: Error message if prediction failed
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Validate required fields
        required_fields = ["variant_id", "prediction_data", "response_time_ms"]
        for field in required_fields:
            if field not in prediction_record:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        success = ab_framework.record_prediction(
            experiment_id=experiment_id,
            variant_id=prediction_record["variant_id"],
            prediction_data=prediction_record["prediction_data"],
            response_time_ms=prediction_record["response_time_ms"],
            success=prediction_record.get("success", True),
            error=prediction_record.get("error")
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to record prediction"
            )
        
        return {
            "experiment_id": experiment_id,
            "variant_id": prediction_record["variant_id"],
            "recorded_at": datetime.utcnow().isoformat(),
            "message": "Prediction recorded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record prediction for experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}/metrics")
async def get_experiment_metrics(
    experiment_id: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current metrics for all variants in an experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Check if experiment exists
        experiment = ab_framework.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(
                status_code=404,
                detail=f"Experiment {experiment_id} not found"
            )
        
        # Get metrics
        variant_metrics = ab_framework.get_experiment_metrics(experiment_id)
        
        # Format response
        metrics_response = {}
        for variant_id, metrics in variant_metrics.items():
            metrics_response[variant_id] = {
                "total_requests": metrics.total_requests,
                "successful_predictions": metrics.successful_predictions,
                "failed_predictions": metrics.failed_predictions,
                "success_rate": round(metrics.success_rate, 4),
                "error_rate": round(metrics.error_rate, 4),
                "avg_response_time_ms": round(metrics.avg_response_time_ms, 2),
                "avg_prediction_confidence": round(metrics.avg_prediction_confidence, 4),
                "rmse": round(metrics.rmse, 4) if metrics.rmse is not None else None,
                "mae": round(metrics.mae, 4) if metrics.mae is not None else None
            }
        
        return {
            "experiment_id": experiment_id,
            "metrics_timestamp": datetime.utcnow().isoformat(),
            "variant_metrics": metrics_response,
            "summary": {
                "total_variants": len(variant_metrics),
                "total_requests": sum(m.total_requests for m in variant_metrics.values()),
                "overall_success_rate": round(
                    sum(m.successful_predictions for m in variant_metrics.values()) /
                    max(sum(m.total_requests for m in variant_metrics.values()), 1), 4
                )
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get metrics for experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}/analysis")
async def analyze_experiment(
    experiment_id: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Perform statistical analysis of A/B test experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Perform analysis
        result = ab_framework.analyze_experiment(experiment_id)
        
        # Format detailed metrics for response
        detailed_metrics = {}
        for variant_id, metrics in result.detailed_metrics.items():
            detailed_metrics[variant_id] = {
                "total_requests": metrics.total_requests,
                "success_rate": round(metrics.success_rate, 4),
                "error_rate": round(metrics.error_rate, 4),
                "avg_response_time_ms": round(metrics.avg_response_time_ms, 2),
                "avg_prediction_confidence": round(metrics.avg_prediction_confidence, 4),
                "rmse": round(metrics.rmse, 4) if metrics.rmse is not None else None,
                "mae": round(metrics.mae, 4) if metrics.mae is not None else None
            }
        
        return {
            "experiment_id": result.experiment_id,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "control_variant": result.control_variant,
            "treatment_variant": result.treatment_variant,
            "winner": result.winner,
            "statistical_analysis": {
                "confidence_level": result.confidence_level,
                "p_value": round(result.p_value, 6),
                "effect_size": round(result.effect_size, 6),
                "statistical_significance": result.statistical_significance,
                "business_significance": result.business_significance
            },
            "recommendation": result.recommendation,
            "experiment_summary": {
                "duration_days": result.duration_days,
                "total_samples": result.total_samples
            },
            "detailed_metrics": detailed_metrics
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to analyze experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}/status")
async def get_experiment_status(
    experiment_id: str,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current status and progress of an experiment
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        experiment = ab_framework.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(
                status_code=404,
                detail=f"Experiment {experiment_id} not found"
            )
        
        # Get current metrics
        variant_metrics = ab_framework.get_experiment_metrics(experiment_id)
        
        # Calculate progress
        total_requests = sum(m.total_requests for m in variant_metrics.values())
        min_sample_size = experiment.minimum_sample_size
        progress_percentage = min(100.0, (total_requests / (min_sample_size * len(experiment.variants))) * 100)
        
        # Calculate time progress
        now = datetime.utcnow()
        total_duration = (experiment.end_date - experiment.start_date).total_seconds()
        elapsed_duration = (now - experiment.start_date).total_seconds()
        time_progress_percentage = min(100.0, (elapsed_duration / total_duration) * 100)
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.status.value,
            "is_active": experiment.is_active,
            "progress": {
                "sample_progress_percentage": round(progress_percentage, 1),
                "time_progress_percentage": round(time_progress_percentage, 1),
                "total_requests": total_requests,
                "target_requests": min_sample_size * len(experiment.variants),
                "days_elapsed": (now - experiment.start_date).days,
                "days_remaining": max(0, (experiment.end_date - now).days)
            },
            "variant_status": {
                variant_id: {
                    "requests": metrics.total_requests,
                    "target_requests": min_sample_size,
                    "progress_percentage": round(min(100.0, (metrics.total_requests / min_sample_size) * 100), 1)
                }
                for variant_id, metrics in variant_metrics.items()
            },
            "timestamps": {
                "start_date": experiment.start_date.isoformat(),
                "end_date": experiment.end_date.isoformat(),
                "current_time": now.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get status for experiment {experiment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_ab_testing_dashboard(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get A/B testing dashboard overview
    """
    try:
        ab_framework = get_ab_testing_framework()
        
        # Get all experiments
        all_experiments = ab_framework.list_experiments()
        
        # Calculate summary statistics
        total_experiments = len(all_experiments)
        active_experiments = len([e for e in all_experiments if e.is_active])
        completed_experiments = len([e for e in all_experiments if e.status == ExperimentStatus.COMPLETED])
        draft_experiments = len([e for e in all_experiments if e.status == ExperimentStatus.DRAFT])
        
        # Get recent experiments (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_experiments = [
            e for e in all_experiments 
            if e.start_date >= thirty_days_ago
        ]
        
        # Format active experiments for dashboard
        active_experiment_details = []
        for exp in all_experiments:
            if exp.is_active:
                metrics = ab_framework.get_experiment_metrics(exp.experiment_id)
                total_requests = sum(m.total_requests for m in metrics.values())
                
                active_experiment_details.append({
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "status": exp.status.value,
                    "num_variants": len(exp.variants),
                    "total_requests": total_requests,
                    "start_date": exp.start_date.isoformat(),
                    "end_date": exp.end_date.isoformat(),
                    "days_remaining": max(0, (exp.end_date - datetime.utcnow()).days)
                })
        
        return {
            "dashboard_timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_experiments": total_experiments,
                "active_experiments": active_experiments,
                "completed_experiments": completed_experiments,
                "draft_experiments": draft_experiments,
                "recent_experiments_30d": len(recent_experiments)
            },
            "active_experiments": active_experiment_details,
            "statistics": {
                "avg_experiment_duration_days": round(
                    sum((e.end_date - e.start_date).days for e in completed_experiments) / 
                    max(completed_experiments, 1), 1
                ),
                "total_requests_processed": sum(
                    sum(m.total_requests for m in ab_framework.get_experiment_metrics(e.experiment_id).values())
                    for e in all_experiments
                )
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get A/B testing dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))