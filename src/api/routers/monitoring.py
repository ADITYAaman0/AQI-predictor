"""
Performance monitoring endpoints for AQI Predictor API.
Provides access to system metrics, request performance, and model performance data.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from src.api.monitoring import (
    PerformanceMonitor, 
    RequestMetrics, 
    SystemMetrics, 
    ModelPerformanceMetrics,
    get_performance_monitor
)
from src.api.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/summary")
async def get_performance_summary(
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive performance summary.
    
    Returns:
        Performance statistics and current system status
    """
    try:
        summary = await monitor.get_performance_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve performance summary: {str(e)}"
        )


@router.get("/requests")
async def get_request_metrics(
    hours: int = Query(1, ge=1, le=24, description="Hours to look back"),
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get recent HTTP request performance metrics.
    
    Args:
        hours: Number of hours to look back (1-24)
        
    Returns:
        List of request metrics
    """
    try:
        metrics = await monitor.get_request_metrics(hours=hours)
        return [metric.to_dict() for metric in metrics]
        
    except Exception as e:
        logger.error(f"Failed to get request metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve request metrics: {str(e)}"
        )


@router.get("/system")
async def get_system_metrics(
    hours: int = Query(1, ge=1, le=168, description="Hours to look back"),
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get recent system resource metrics.
    
    Args:
        hours: Number of hours to look back (1-168)
        
    Returns:
        List of system metrics
    """
    try:
        metrics = await monitor.get_system_metrics(hours=hours)
        return [metric.to_dict() for metric in metrics]
        
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system metrics: {str(e)}"
        )


@router.get("/models")
async def get_model_performance(
    model_name: Optional[str] = Query(None, description="Filter by model name"),
    days: int = Query(7, ge=1, le=30, description="Days to look back"),
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get ML model performance metrics.
    
    Args:
        model_name: Optional model name to filter by
        days: Number of days to look back (1-30)
        
    Returns:
        List of model performance metrics
    """
    try:
        metrics = await monitor.get_model_performance(
            model_name=model_name, 
            days=days
        )
        return [metric.to_dict() for metric in metrics]
        
    except Exception as e:
        logger.error(f"Failed to get model performance metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve model performance metrics: {str(e)}"
        )


@router.get("/alerts")
async def get_performance_alerts(
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get performance alerts and threshold violations.
    
    Returns:
        Current performance alerts and warnings
    """
    try:
        summary = await monitor.get_performance_summary()
        alerts = []
        warnings = []
        
        # Check system resource thresholds
        if 'current_cpu_percent' in summary:
            cpu_percent = summary['current_cpu_percent']
            if cpu_percent > 90:
                alerts.append({
                    "type": "system",
                    "severity": "critical",
                    "message": f"CPU usage critical: {cpu_percent:.1f}%",
                    "threshold": 90,
                    "current_value": cpu_percent
                })
            elif cpu_percent > 75:
                warnings.append({
                    "type": "system",
                    "severity": "warning",
                    "message": f"CPU usage high: {cpu_percent:.1f}%",
                    "threshold": 75,
                    "current_value": cpu_percent
                })
        
        if 'current_memory_percent' in summary:
            memory_percent = summary['current_memory_percent']
            if memory_percent > 90:
                alerts.append({
                    "type": "system",
                    "severity": "critical",
                    "message": f"Memory usage critical: {memory_percent:.1f}%",
                    "threshold": 90,
                    "current_value": memory_percent
                })
            elif memory_percent > 80:
                warnings.append({
                    "type": "system",
                    "severity": "warning",
                    "message": f"Memory usage high: {memory_percent:.1f}%",
                    "threshold": 80,
                    "current_value": memory_percent
                })
        
        if 'current_disk_usage_percent' in summary:
            disk_percent = summary['current_disk_usage_percent']
            if disk_percent > 95:
                alerts.append({
                    "type": "system",
                    "severity": "critical",
                    "message": f"Disk usage critical: {disk_percent:.1f}%",
                    "threshold": 95,
                    "current_value": disk_percent
                })
            elif disk_percent > 85:
                warnings.append({
                    "type": "system",
                    "severity": "warning",
                    "message": f"Disk usage high: {disk_percent:.1f}%",
                    "threshold": 85,
                    "current_value": disk_percent
                })
        
        # Check error rate
        total_requests = summary.get('total_requests', 0)
        error_requests = summary.get('error_requests', 0)
        
        if total_requests > 0:
            error_rate = (error_requests / total_requests) * 100
            if error_rate > 10:
                alerts.append({
                    "type": "application",
                    "severity": "critical",
                    "message": f"High error rate: {error_rate:.1f}%",
                    "threshold": 10,
                    "current_value": error_rate
                })
            elif error_rate > 5:
                warnings.append({
                    "type": "application",
                    "severity": "warning",
                    "message": f"Elevated error rate: {error_rate:.1f}%",
                    "threshold": 5,
                    "current_value": error_rate
                })
        
        # Check average response time
        if total_requests > 0 and 'total_response_time' in summary:
            avg_response_time = summary['total_response_time'] / total_requests
            if avg_response_time > 1000:  # 1 second
                alerts.append({
                    "type": "performance",
                    "severity": "critical",
                    "message": f"High average response time: {avg_response_time:.0f}ms",
                    "threshold": 1000,
                    "current_value": avg_response_time
                })
            elif avg_response_time > 500:  # 500ms
                warnings.append({
                    "type": "performance",
                    "severity": "warning",
                    "message": f"Elevated response time: {avg_response_time:.0f}ms",
                    "threshold": 500,
                    "current_value": avg_response_time
                })
        
        return {
            "alerts": alerts,
            "warnings": warnings,
            "alert_count": len(alerts),
            "warning_count": len(warnings),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance alerts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve performance alerts: {str(e)}"
        )


@router.post("/system/collect")
async def collect_system_metrics(
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Manually trigger system metrics collection.
    
    Returns:
        Current system metrics
    """
    try:
        metrics = await monitor.record_system_metrics()
        
        if metrics:
            return {
                "status": "success",
                "metrics": metrics.to_dict(),
                "message": "System metrics collected successfully"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to collect system metrics"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to collect system metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to collect system metrics: {str(e)}"
        )


@router.post("/models/{model_name}/performance")
async def record_model_performance(
    model_name: str,
    model_version: str,
    rmse: float,
    mae: float,
    accuracy: float,
    prediction_count: int,
    avg_response_time_ms: float,
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Record model performance metrics.
    
    Args:
        model_name: Name of the ML model
        model_version: Version of the model
        rmse: Root Mean Square Error
        mae: Mean Absolute Error
        accuracy: Model accuracy percentage
        prediction_count: Number of predictions made
        avg_response_time_ms: Average response time in milliseconds
        
    Returns:
        Success confirmation
    """
    try:
        metrics = ModelPerformanceMetrics(
            model_name=model_name,
            model_version=model_version,
            rmse=rmse,
            mae=mae,
            accuracy=accuracy,
            prediction_count=prediction_count,
            avg_response_time_ms=avg_response_time_ms,
            timestamp=datetime.utcnow()
        )
        
        await monitor.record_model_performance(metrics)
        
        return {
            "status": "success",
            "message": f"Performance metrics recorded for {model_name}",
            "metrics": metrics.to_dict()
        }
        
    except Exception as e:
        logger.error(f"Failed to record model performance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record model performance: {str(e)}"
        )


@router.get("/dashboard")
async def get_monitoring_dashboard(
    monitor: PerformanceMonitor = Depends(get_performance_monitor),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive monitoring dashboard data.
    
    Returns:
        Dashboard data with all key metrics and visualizations
    """
    try:
        # Get performance summary
        summary = await monitor.get_performance_summary()
        
        # Get recent request metrics (last hour)
        recent_requests = await monitor.get_request_metrics(hours=1)
        
        # Get recent system metrics (last 6 hours)
        recent_system = await monitor.get_system_metrics(hours=6)
        
        # Get model performance (last 7 days)
        model_performance = await monitor.get_model_performance(days=7)
        
        # Calculate key performance indicators
        total_requests = summary.get('total_requests', 0)
        error_requests = summary.get('error_requests', 0)
        error_rate = (error_requests / total_requests * 100) if total_requests > 0 else 0
        
        avg_response_time = 0
        if total_requests > 0 and 'total_response_time' in summary:
            avg_response_time = summary['total_response_time'] / total_requests
        
        # Group model performance by model name
        model_stats = {}
        for metric in model_performance:
            model_name = metric.model_name
            if model_name not in model_stats:
                model_stats[model_name] = []
            model_stats[model_name].append(metric.to_dict())
        
        return {
            "summary": summary,
            "kpis": {
                "total_requests": total_requests,
                "error_rate_percent": round(error_rate, 2),
                "avg_response_time_ms": round(avg_response_time, 2),
                "uptime_percent": 99.5,  # Would calculate from actual uptime data
                "active_models": len(model_stats)
            },
            "recent_requests": [req.to_dict() for req in recent_requests[-100:]],  # Last 100 requests
            "system_metrics": [sys.to_dict() for sys in recent_system],
            "model_performance": model_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get monitoring dashboard: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve monitoring dashboard: {str(e)}"
        )