"""
Task monitoring and status tracking for Celery background jobs.
Provides job status tracking, retry monitoring, and performance metrics.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json

from celery import Task
from celery.result import AsyncResult
from redis import Redis
import os

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Task execution status."""
    PENDING = "PENDING"
    STARTED = "STARTED"
    RETRY = "RETRY"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    REVOKED = "REVOKED"


@dataclass
class TaskExecutionRecord:
    """Record of task execution with retry information."""
    task_id: str
    task_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    last_error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    execution_time_seconds: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['started_at'] = self.started_at.isoformat()
        if self.completed_at:
            data['completed_at'] = self.completed_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskExecutionRecord':
        """Create from dictionary."""
        data['started_at'] = datetime.fromisoformat(data['started_at'])
        if data.get('completed_at'):
            data['completed_at'] = datetime.fromisoformat(data['completed_at'])
        return cls(**data)


class TaskMonitor:
    """Monitor and track Celery task execution."""
    
    def __init__(self, redis_url: str = None):
        """
        Initialize task monitor.
        
        Args:
            redis_url: Redis connection URL. Defaults to REDIS_URL env var.
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = Redis.from_url(self.redis_url, decode_responses=True)
        self.task_key_prefix = "celery:task:monitor:"
        self.retry_key_prefix = "celery:task:retry:"
        self.stats_key = "celery:task:stats"
        
    def record_task_start(self, task_id: str, task_name: str, max_retries: int = 3):
        """
        Record task start.
        
        Args:
            task_id: Unique task identifier
            task_name: Name of the task
            max_retries: Maximum retry attempts
        """
        record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=max_retries
        )
        
        key = f"{self.task_key_prefix}{task_id}"
        self.redis_client.setex(
            key,
            timedelta(days=7),  # Keep records for 7 days
            json.dumps(record.to_dict())
        )
        
        # Update task statistics
        self._increment_stat(f"{task_name}:started")
        
        logger.info(f"Recorded task start: {task_id} ({task_name})")
    
    def record_task_retry(self, task_id: str, retry_count: int, error: str, 
                         countdown: int):
        """
        Record task retry attempt.
        
        Args:
            task_id: Unique task identifier
            retry_count: Current retry attempt number
            error: Error message that triggered retry
            countdown: Seconds until next retry
        """
        key = f"{self.task_key_prefix}{task_id}"
        record_data = self.redis_client.get(key)
        
        if record_data:
            record = TaskExecutionRecord.from_dict(json.loads(record_data))
            record.status = TaskStatus.RETRY
            record.retry_count = retry_count
            record.last_error = error
            
            self.redis_client.setex(
                key,
                timedelta(days=7),
                json.dumps(record.to_dict())
            )
            
            # Track retry with exponential backoff info
            retry_key = f"{self.retry_key_prefix}{task_id}:{retry_count}"
            retry_info = {
                "retry_count": retry_count,
                "error": error,
                "countdown": countdown,
                "timestamp": datetime.utcnow().isoformat(),
                "next_retry_at": (datetime.utcnow() + timedelta(seconds=countdown)).isoformat()
            }
            self.redis_client.setex(
                retry_key,
                timedelta(days=7),
                json.dumps(retry_info)
            )
            
            # Update statistics
            self._increment_stat(f"{record.task_name}:retried")
            
            logger.warning(
                f"Task {task_id} retry {retry_count}/{record.max_retries} "
                f"scheduled in {countdown}s due to: {error}"
            )
    
    def record_task_success(self, task_id: str, result: Dict[str, Any]):
        """
        Record successful task completion.
        
        Args:
            task_id: Unique task identifier
            result: Task result data
        """
        key = f"{self.task_key_prefix}{task_id}"
        record_data = self.redis_client.get(key)
        
        if record_data:
            record = TaskExecutionRecord.from_dict(json.loads(record_data))
            record.status = TaskStatus.SUCCESS
            record.completed_at = datetime.utcnow()
            record.result = result
            record.execution_time_seconds = (
                record.completed_at - record.started_at
            ).total_seconds()
            
            self.redis_client.setex(
                key,
                timedelta(days=7),
                json.dumps(record.to_dict())
            )
            
            # Update statistics
            self._increment_stat(f"{record.task_name}:succeeded")
            self._record_execution_time(record.task_name, record.execution_time_seconds)
            
            logger.info(
                f"Task {task_id} completed successfully in "
                f"{record.execution_time_seconds:.2f}s"
            )
    
    def record_task_failure(self, task_id: str, error: str):
        """
        Record task failure.
        
        Args:
            task_id: Unique task identifier
            error: Error message
        """
        key = f"{self.task_key_prefix}{task_id}"
        record_data = self.redis_client.get(key)
        
        if record_data:
            record = TaskExecutionRecord.from_dict(json.loads(record_data))
            record.status = TaskStatus.FAILURE
            record.completed_at = datetime.utcnow()
            record.last_error = error
            record.execution_time_seconds = (
                record.completed_at - record.started_at
            ).total_seconds()
            
            self.redis_client.setex(
                key,
                timedelta(days=7),
                json.dumps(record.to_dict())
            )
            
            # Update statistics
            self._increment_stat(f"{record.task_name}:failed")
            
            logger.error(f"Task {task_id} failed after {record.retry_count} retries: {error}")
    
    def get_task_status(self, task_id: str) -> Optional[TaskExecutionRecord]:
        """
        Get task execution status.
        
        Args:
            task_id: Unique task identifier
            
        Returns:
            Task execution record or None if not found
        """
        key = f"{self.task_key_prefix}{task_id}"
        record_data = self.redis_client.get(key)
        
        if record_data:
            return TaskExecutionRecord.from_dict(json.loads(record_data))
        return None
    
    def get_task_retry_history(self, task_id: str) -> List[Dict[str, Any]]:
        """
        Get retry history for a task.
        
        Args:
            task_id: Unique task identifier
            
        Returns:
            List of retry attempts with details
        """
        pattern = f"{self.retry_key_prefix}{task_id}:*"
        retry_keys = self.redis_client.keys(pattern)
        
        retry_history = []
        for key in sorted(retry_keys):
            retry_data = self.redis_client.get(key)
            if retry_data:
                retry_history.append(json.loads(retry_data))
        
        return retry_history
    
    def get_task_statistics(self, task_name: str = None) -> Dict[str, Any]:
        """
        Get task execution statistics.
        
        Args:
            task_name: Optional task name to filter statistics
            
        Returns:
            Dictionary with task statistics
        """
        stats = {}
        
        # Get all statistics from Redis hash
        all_stats = self.redis_client.hgetall(self.stats_key)
        
        if task_name:
            # Filter for specific task
            prefix = f"{task_name}:"
            stats = {
                key.replace(prefix, ""): int(value)
                for key, value in all_stats.items()
                if key.startswith(prefix)
            }
        else:
            # Group by task name
            task_stats = {}
            for key, value in all_stats.items():
                if ":" in key:
                    task, metric = key.rsplit(":", 1)
                    if task not in task_stats:
                        task_stats[task] = {}
                    task_stats[task][metric] = int(value)
            stats = task_stats
        
        return stats
    
    def get_recent_failures(self, hours: int = 24, limit: int = 100) -> List[TaskExecutionRecord]:
        """
        Get recent failed tasks.
        
        Args:
            hours: Number of hours to look back
            limit: Maximum number of failures to return
            
        Returns:
            List of failed task records
        """
        pattern = f"{self.task_key_prefix}*"
        task_keys = self.redis_client.keys(pattern)
        
        failures = []
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        for key in task_keys:
            record_data = self.redis_client.get(key)
            if record_data:
                record = TaskExecutionRecord.from_dict(json.loads(record_data))
                if (record.status == TaskStatus.FAILURE and 
                    record.started_at >= cutoff_time):
                    failures.append(record)
        
        # Sort by started_at descending and limit
        failures.sort(key=lambda x: x.started_at, reverse=True)
        return failures[:limit]
    
    def get_active_tasks(self) -> List[TaskExecutionRecord]:
        """
        Get currently active (running) tasks.
        
        Returns:
            List of active task records
        """
        pattern = f"{self.task_key_prefix}*"
        task_keys = self.redis_client.keys(pattern)
        
        active_tasks = []
        
        for key in task_keys:
            record_data = self.redis_client.get(key)
            if record_data:
                record = TaskExecutionRecord.from_dict(json.loads(record_data))
                if record.status in [TaskStatus.STARTED, TaskStatus.RETRY]:
                    active_tasks.append(record)
        
        return active_tasks
    
    def _increment_stat(self, stat_key: str):
        """Increment a statistic counter."""
        self.redis_client.hincrby(self.stats_key, stat_key, 1)
    
    def _record_execution_time(self, task_name: str, execution_time: float):
        """Record task execution time for performance tracking."""
        time_key = f"{task_name}:total_execution_time"
        self.redis_client.hincrbyfloat(self.stats_key, time_key, execution_time)
    
    def clear_old_records(self, days: int = 7):
        """
        Clear task records older than specified days.
        
        Args:
            days: Number of days to retain records
        """
        # Redis TTL handles this automatically, but this method
        # can be used for manual cleanup if needed
        pattern = f"{self.task_key_prefix}*"
        task_keys = self.redis_client.keys(pattern)
        
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        deleted_count = 0
        
        for key in task_keys:
            record_data = self.redis_client.get(key)
            if record_data:
                record = TaskExecutionRecord.from_dict(json.loads(record_data))
                if record.started_at < cutoff_time:
                    self.redis_client.delete(key)
                    deleted_count += 1
        
        logger.info(f"Cleared {deleted_count} old task records")
        return deleted_count


class MonitoredTask(Task):
    """
    Base task class with monitoring and exponential backoff retry logic.
    """
    
    def __init__(self):
        super().__init__()
        self.monitor = TaskMonitor()
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried."""
        retry_count = self.request.retries
        
        # Calculate exponential backoff countdown
        countdown = 60 * (2 ** retry_count)  # 60s, 120s, 240s, etc.
        
        self.monitor.record_task_retry(
            task_id=task_id,
            retry_count=retry_count,
            error=str(exc),
            countdown=countdown
        )
        
        logger.warning(
            f"Task {self.name} [{task_id}] retry {retry_count}/{self.max_retries} "
            f"in {countdown}s: {exc}"
        )
    
    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds."""
        self.monitor.record_task_success(task_id=task_id, result=retval)
        logger.info(f"Task {self.name} [{task_id}] succeeded")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails."""
        self.monitor.record_task_failure(task_id=task_id, error=str(exc))
        logger.error(f"Task {self.name} [{task_id}] failed: {exc}")
    
    def before_start(self, task_id, args, kwargs):
        """Called before task execution starts."""
        self.monitor.record_task_start(
            task_id=task_id,
            task_name=self.name,
            max_retries=self.max_retries
        )
        logger.info(f"Task {self.name} [{task_id}] starting")


def get_task_monitor() -> TaskMonitor:
    """Get task monitor instance."""
    return TaskMonitor()
