"""
Celery application configuration for background task processing.
Handles data ingestion, model training, and other asynchronous tasks.

Features:
- Redis broker for task queue management
- Exponential backoff retry logic
- Task monitoring and status tracking
- Scheduled periodic tasks with Celery Beat
"""

import os
from celery import Celery, Task
from celery.schedules import crontab
from celery.signals import task_prerun, task_postrun, task_retry, task_failure
import logging

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Base task class with callbacks for success/failure."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails."""
        logger.error(f"Task {task_id} failed with exception: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds."""
        logger.info(f"Task {task_id} completed successfully")


# Redis URL for Celery broker and result backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery application
celery_app = Celery(
    "aqi_predictor",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "src.tasks.data_ingestion",
        "src.tasks.model_training",
        "src.tasks.automated_retraining",
        "src.tasks.predictions",
        "src.tasks.alerts",
        "src.tasks.maintenance",
        "src.tasks.monitoring"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        "src.tasks.data_ingestion.*": {"queue": "data_ingestion"},
        "src.tasks.model_training.*": {"queue": "model_training"},
        "src.tasks.automated_retraining.*": {"queue": "model_training"},
        "src.tasks.predictions.*": {"queue": "predictions"},
        "src.tasks.alerts.*": {"queue": "alerts"},
        "src.tasks.maintenance.*": {"queue": "maintenance"},
        "src.tasks.monitoring.*": {"queue": "monitoring"},
    },
    
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task result settings
    result_expires=3600,  # 1 hour
    result_extended=True,  # Store additional task metadata
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_send_task_events=True,  # Enable task events for monitoring
    
    # Retry settings with exponential backoff
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=60,  # Initial retry delay: 60 seconds
    task_max_retries=3,  # Maximum retry attempts
    
    # Monitoring and events
    task_send_sent_event=True,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        # Data ingestion tasks
        "ingest-cpcb-data": {
            "task": "src.tasks.data_ingestion.ingest_cpcb_data",
            "schedule": crontab(minute="*/15"),  # Every 15 minutes
        },
        "ingest-weather-data": {
            "task": "src.tasks.data_ingestion.ingest_weather_data",
            "schedule": crontab(minute="*/30"),  # Every 30 minutes
        },
        "ingest-openaq-data": {
            "task": "src.tasks.data_ingestion.ingest_openaq_data",
            "schedule": crontab(minute="*/20"),  # Every 20 minutes
        },
        
        # Prediction tasks
        "generate-hourly-predictions": {
            "task": "src.tasks.predictions.generate_hourly_predictions",
            "schedule": crontab(minute=0),  # Every hour
        },
        "generate-spatial-predictions": {
            "task": "src.tasks.predictions.generate_spatial_predictions",
            "schedule": crontab(minute=30),  # Every hour at 30 minutes
        },
        
        # Model training tasks
        "retrain-models": {
            "task": "src.tasks.model_training.retrain_models",
            "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
        },
        
        # Automated retraining tasks
        "check-retraining-triggers": {
            "task": "src.tasks.automated_retraining.check_retraining_triggers",
            "schedule": crontab(minute="*/30"),  # Every 30 minutes
        },
        "update-retraining-schedule": {
            "task": "src.tasks.automated_retraining.update_retraining_schedule",
            "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
        },
        "generate-retraining-report": {
            "task": "src.tasks.automated_retraining.generate_retraining_report",
            "schedule": crontab(hour=6, minute=0, day_of_week=1),  # Weekly on Monday at 6 AM
        },
        
        # Alert tasks
        "check-alert-thresholds": {
            "task": "src.tasks.alerts.check_alert_thresholds",
            "schedule": crontab(minute="*/5"),  # Every 5 minutes
        },
        
        # Maintenance tasks
        "cleanup-old-data": {
            "task": "src.tasks.maintenance.cleanup_old_data",
            "schedule": crontab(hour=1, minute=0),  # Daily at 1 AM
        },
        "health-check": {
            "task": "src.tasks.maintenance.health_check",
            "schedule": crontab(minute="*/10"),  # Every 10 minutes
        },
        
        # Monitoring tasks
        "collect-system-metrics": {
            "task": "src.tasks.monitoring.collect_system_metrics",
            "schedule": crontab(minute="*/5"),  # Every 5 minutes
        },
        "collect-model-performance": {
            "task": "src.tasks.monitoring.collect_model_performance_metrics",
            "schedule": crontab(minute=0),  # Every hour
        },
        "check-performance-alerts": {
            "task": "src.tasks.monitoring.check_performance_alerts",
            "schedule": crontab(minute="*/10"),  # Every 10 minutes
        },
        "cleanup-old-metrics": {
            "task": "src.tasks.monitoring.cleanup_old_metrics",
            "schedule": crontab(hour="*/6", minute=0),  # Every 6 hours
        },
    },
)

# Task discovery
celery_app.autodiscover_tasks()

if __name__ == "__main__":
    celery_app.start()


# Signal handlers for task monitoring
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, **kwargs):
    """Handler called before task execution."""
    from src.tasks.task_monitor import get_task_monitor
    monitor = get_task_monitor()
    monitor.record_task_start(
        task_id=task_id,
        task_name=task.name,
        max_retries=getattr(task, 'max_retries', 3)
    )


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, 
                        retval=None, state=None, **kwargs):
    """Handler called after task execution."""
    from src.tasks.task_monitor import get_task_monitor
    monitor = get_task_monitor()
    
    if state == 'SUCCESS':
        result = retval if isinstance(retval, dict) else {"result": str(retval)}
        monitor.record_task_success(task_id=task_id, result=result)


@task_retry.connect
def task_retry_handler(sender=None, task_id=None, reason=None, 
                      einfo=None, **kwargs):
    """Handler called when task is retried."""
    from src.tasks.task_monitor import get_task_monitor
    monitor = get_task_monitor()
    
    # Get retry count from task request
    request = sender.request
    retry_count = request.retries if hasattr(request, 'retries') else 0
    
    # Calculate exponential backoff
    countdown = 60 * (2 ** retry_count)
    
    monitor.record_task_retry(
        task_id=task_id,
        retry_count=retry_count,
        error=str(reason),
        countdown=countdown
    )


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, 
                        einfo=None, **kwargs):
    """Handler called when task fails."""
    from src.tasks.task_monitor import get_task_monitor
    monitor = get_task_monitor()
    monitor.record_task_failure(task_id=task_id, error=str(exception))
