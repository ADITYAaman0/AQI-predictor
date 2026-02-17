"""
API endpoints for Celery task monitoring and management.
Provides task status, statistics, and control operations.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from src.tasks.task_monitor import get_task_monitor, TaskExecutionRecord

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


class TaskStatusResponse(BaseModel):
    """Task status response model."""
    task_id: str
    task_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int
    max_retries: int
    last_error: Optional[str] = None
    execution_time_seconds: Optional[float] = None


class TaskRetryInfo(BaseModel):
    """Task retry information model."""
    retry_count: int
    error: str
    countdown: int
    timestamp: datetime
    next_retry_at: datetime


class TaskStatistics(BaseModel):
    """Task statistics model."""
    task_name: Optional[str] = None
    started: int = 0
    succeeded: int = 0
    failed: int = 0
    retried: int = 0
    success_rate: float = 0.0
    average_execution_time: Optional[float] = None


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of a specific task.
    
    Args:
        task_id: Unique task identifier
        
    Returns:
        Task execution status and details
    """
    monitor = get_task_monitor()
    record = monitor.get_task_status(task_id)
    
    if not record:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    
    return TaskStatusResponse(
        task_id=record.task_id,
        task_name=record.task_name,
        status=record.status,
        started_at=record.started_at,
        completed_at=record.completed_at,
        retry_count=record.retry_count,
        max_retries=record.max_retries,
        last_error=record.last_error,
        execution_time_seconds=record.execution_time_seconds
    )


@router.get("/retry-history/{task_id}", response_model=List[TaskRetryInfo])
async def get_task_retry_history(task_id: str):
    """
    Get retry history for a specific task.
    
    Args:
        task_id: Unique task identifier
        
    Returns:
        List of retry attempts with details
    """
    monitor = get_task_monitor()
    retry_history = monitor.get_task_retry_history(task_id)
    
    if not retry_history:
        return []
    
    return [
        TaskRetryInfo(
            retry_count=retry["retry_count"],
            error=retry["error"],
            countdown=retry["countdown"],
            timestamp=datetime.fromisoformat(retry["timestamp"]),
            next_retry_at=datetime.fromisoformat(retry["next_retry_at"])
        )
        for retry in retry_history
    ]


@router.get("/statistics", response_model=Dict[str, Any])
async def get_task_statistics(
    task_name: Optional[str] = Query(None, description="Filter by task name")
):
    """
    Get task execution statistics.
    
    Args:
        task_name: Optional task name to filter statistics
        
    Returns:
        Task execution statistics
    """
    monitor = get_task_monitor()
    stats = monitor.get_task_statistics(task_name)
    
    if task_name:
        # Calculate derived metrics for specific task
        started = stats.get("started", 0)
        succeeded = stats.get("succeeded", 0)
        failed = stats.get("failed", 0)
        retried = stats.get("retried", 0)
        total_execution_time = stats.get("total_execution_time", 0.0)
        
        success_rate = succeeded / started if started > 0 else 0.0
        avg_execution_time = total_execution_time / succeeded if succeeded > 0 else None
        
        return {
            "task_name": task_name,
            "started": started,
            "succeeded": succeeded,
            "failed": failed,
            "retried": retried,
            "success_rate": success_rate,
            "average_execution_time": avg_execution_time
        }
    else:
        # Return statistics for all tasks
        result = {}
        for task, task_stats in stats.items():
            started = task_stats.get("started", 0)
            succeeded = task_stats.get("succeeded", 0)
            failed = task_stats.get("failed", 0)
            retried = task_stats.get("retried", 0)
            total_execution_time = task_stats.get("total_execution_time", 0.0)
            
            success_rate = succeeded / started if started > 0 else 0.0
            avg_execution_time = total_execution_time / succeeded if succeeded > 0 else None
            
            result[task] = {
                "started": started,
                "succeeded": succeeded,
                "failed": failed,
                "retried": retried,
                "success_rate": success_rate,
                "average_execution_time": avg_execution_time
            }
        
        return result


@router.get("/failures", response_model=List[TaskStatusResponse])
async def get_recent_failures(
    hours: int = Query(24, description="Number of hours to look back"),
    limit: int = Query(100, description="Maximum number of failures to return")
):
    """
    Get recent failed tasks.
    
    Args:
        hours: Number of hours to look back
        limit: Maximum number of failures to return
        
    Returns:
        List of recent failed tasks
    """
    monitor = get_task_monitor()
    failures = monitor.get_recent_failures(hours=hours, limit=limit)
    
    return [
        TaskStatusResponse(
            task_id=record.task_id,
            task_name=record.task_name,
            status=record.status,
            started_at=record.started_at,
            completed_at=record.completed_at,
            retry_count=record.retry_count,
            max_retries=record.max_retries,
            last_error=record.last_error,
            execution_time_seconds=record.execution_time_seconds
        )
        for record in failures
    ]


@router.get("/active", response_model=List[TaskStatusResponse])
async def get_active_tasks():
    """
    Get currently active (running) tasks.
    
    Returns:
        List of active tasks
    """
    monitor = get_task_monitor()
    active_tasks = monitor.get_active_tasks()
    
    return [
        TaskStatusResponse(
            task_id=record.task_id,
            task_name=record.task_name,
            status=record.status,
            started_at=record.started_at,
            completed_at=record.completed_at,
            retry_count=record.retry_count,
            max_retries=record.max_retries,
            last_error=record.last_error,
            execution_time_seconds=record.execution_time_seconds
        )
        for record in active_tasks
    ]


@router.get("/health")
async def task_system_health():
    """
    Get task system health status.
    
    Returns:
        Health status of task processing system
    """
    monitor = get_task_monitor()
    
    # Get statistics for all tasks
    all_stats = monitor.get_task_statistics()
    
    # Calculate overall metrics
    total_started = 0
    total_succeeded = 0
    total_failed = 0
    total_retried = 0
    
    for task_stats in all_stats.values():
        total_started += task_stats.get("started", 0)
        total_succeeded += task_stats.get("succeeded", 0)
        total_failed += task_stats.get("failed", 0)
        total_retried += task_stats.get("retried", 0)
    
    success_rate = total_succeeded / total_started if total_started > 0 else 0.0
    
    # Get active tasks
    active_tasks = monitor.get_active_tasks()
    
    # Get recent failures
    recent_failures = monitor.get_recent_failures(hours=1, limit=10)
    
    # Determine health status
    if success_rate >= 0.95 and len(recent_failures) < 5:
        health_status = "healthy"
    elif success_rate >= 0.85 and len(recent_failures) < 10:
        health_status = "degraded"
    else:
        health_status = "unhealthy"
    
    return {
        "status": health_status,
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "total_tasks_started": total_started,
            "total_tasks_succeeded": total_succeeded,
            "total_tasks_failed": total_failed,
            "total_tasks_retried": total_retried,
            "success_rate": success_rate,
            "active_tasks_count": len(active_tasks),
            "recent_failures_count": len(recent_failures)
        },
        "active_tasks": len(active_tasks),
        "recent_failures": len(recent_failures)
    }
