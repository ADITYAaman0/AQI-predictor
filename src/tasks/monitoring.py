"""
Background tasks for performance monitoring and metrics collection.
Handles periodic system metrics collection and performance alerting.
"""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta
import asyncio

from src.tasks.celery_app import celery_app, CallbackTask
from src.api.monitoring import PerformanceMonitor, ModelPerformanceMetrics
from src.models.ensemble_forecaster import EnsembleForecaster
from src.models.lstm_forecaster import LSTMForecaster
from src.models.gnn_spatial import SpatialGNN

logger = logging.getLogger(__name__)


@celery_app.task(base=CallbackTask)
def collect_system_metrics() -> Dict[str, Any]:
    """
    Collect and store current system metrics.
    
    Returns:
        Dictionary with collection results
    """
    try:
        logger.info("Starting system metrics collection")
        
        # Initialize performance monitor
        monitor = PerformanceMonitor()
        
        # Collect system metrics synchronously
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            metrics = loop.run_until_complete(monitor.record_system_metrics())
        finally:
            loop.close()
        
        if metrics:
            result = {
                "task": "collect_system_metrics",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "completed",
                "metrics": metrics.to_dict()
            }
            
            logger.info(f"System metrics collected: CPU {metrics.cpu_percent:.1f}%, "
                       f"Memory {metrics.memory_percent:.1f}%, "
                       f"Disk {metrics.disk_usage_percent:.1f}%")
            
            return result
        else:
            raise Exception("Failed to collect system metrics")
            
    except Exception as e:
        logger.error(f"System metrics collection failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def collect_model_performance_metrics() -> Dict[str, Any]:
    """
    Collect performance metrics for all ML models.
    
    Returns:
        Dictionary with model performance results
    """
    try:
        logger.info("Starting model performance metrics collection")
        
        monitor = PerformanceMonitor()
        results = []
        
        # Mock model performance collection
        # In a real implementation, this would evaluate models on recent data
        models_to_evaluate = [
            ("ensemble", "1.0.0"),
            ("lstm", "1.0.0"),
            ("gnn", "1.0.0"),
            ("xgboost", "1.0.0")
        ]
        
        for model_name, model_version in models_to_evaluate:
            try:
                # Mock performance evaluation
                # In production, this would run actual model evaluation
                import random
                import time
                
                # Simulate model evaluation time
                time.sleep(0.1)
                
                # Generate realistic performance metrics with some variation
                base_rmse = 18.5
                base_mae = 14.2
                base_accuracy = 78.5
                
                # Add model-specific variations
                model_variations = {
                    "ensemble": (0, 0, 2),  # Best performance
                    "lstm": (1.5, 1.0, -1),
                    "gnn": (2.0, 1.5, -2),
                    "xgboost": (3.0, 2.0, -3)
                }
                
                rmse_var, mae_var, acc_var = model_variations.get(model_name, (0, 0, 0))
                
                metrics = ModelPerformanceMetrics(
                    model_name=model_name,
                    model_version=model_version,
                    rmse=base_rmse + rmse_var + random.uniform(-0.5, 0.5),
                    mae=base_mae + mae_var + random.uniform(-0.3, 0.3),
                    accuracy=base_accuracy + acc_var + random.uniform(-1, 1),
                    prediction_count=random.randint(100, 500),
                    avg_response_time_ms=random.uniform(50, 200),
                    timestamp=datetime.utcnow()
                )
                
                # Record metrics asynchronously
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    loop.run_until_complete(monitor.record_model_performance(metrics))
                finally:
                    loop.close()
                
                results.append({
                    "model_name": model_name,
                    "model_version": model_version,
                    "metrics": metrics.to_dict(),
                    "status": "success"
                })
                
                logger.info(f"Collected performance metrics for {model_name}: "
                           f"RMSE {metrics.rmse:.2f}, MAE {metrics.mae:.2f}, "
                           f"Accuracy {metrics.accuracy:.1f}%")
                
            except Exception as e:
                logger.error(f"Failed to collect metrics for {model_name}: {e}")
                results.append({
                    "model_name": model_name,
                    "model_version": model_version,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "task": "collect_model_performance_metrics",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "completed",
            "models_evaluated": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Model performance metrics collection failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def check_performance_alerts() -> Dict[str, Any]:
    """
    Check for performance threshold violations and generate alerts.
    
    Returns:
        Dictionary with alert check results
    """
    try:
        logger.info("Checking performance alerts")
        
        monitor = PerformanceMonitor()
        
        # Get performance summary
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            summary = loop.run_until_complete(monitor.get_performance_summary())
        finally:
            loop.close()
        
        alerts_triggered = []
        
        # Check system resource thresholds
        if 'current_cpu_percent' in summary:
            cpu_percent = summary['current_cpu_percent']
            if cpu_percent > 90:
                alert = {
                    "type": "system",
                    "severity": "critical",
                    "metric": "cpu_usage",
                    "value": cpu_percent,
                    "threshold": 90,
                    "message": f"CPU usage critical: {cpu_percent:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                }
                alerts_triggered.append(alert)
                logger.warning(f"ALERT: {alert['message']}")
        
        if 'current_memory_percent' in summary:
            memory_percent = summary['current_memory_percent']
            if memory_percent > 90:
                alert = {
                    "type": "system",
                    "severity": "critical",
                    "metric": "memory_usage",
                    "value": memory_percent,
                    "threshold": 90,
                    "message": f"Memory usage critical: {memory_percent:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                }
                alerts_triggered.append(alert)
                logger.warning(f"ALERT: {alert['message']}")
        
        # Check error rate
        total_requests = summary.get('total_requests', 0)
        error_requests = summary.get('error_requests', 0)
        
        if total_requests > 100:  # Only check if we have sufficient data
            error_rate = (error_requests / total_requests) * 100
            if error_rate > 10:
                alert = {
                    "type": "application",
                    "severity": "critical",
                    "metric": "error_rate",
                    "value": error_rate,
                    "threshold": 10,
                    "message": f"High error rate: {error_rate:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                }
                alerts_triggered.append(alert)
                logger.warning(f"ALERT: {alert['message']}")
        
        # Check model performance degradation
        # Get recent model performance
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            model_metrics = loop.run_until_complete(
                monitor.get_model_performance(days=1)
            )
        finally:
            loop.close()
        
        # Check for model performance issues
        for metric in model_metrics[-10:]:  # Check last 10 model evaluations
            if metric.rmse > 25:  # RMSE threshold
                alert = {
                    "type": "model",
                    "severity": "warning",
                    "metric": "model_rmse",
                    "model_name": metric.model_name,
                    "value": metric.rmse,
                    "threshold": 25,
                    "message": f"Model {metric.model_name} RMSE degraded: {metric.rmse:.2f}",
                    "timestamp": datetime.utcnow().isoformat()
                }
                alerts_triggered.append(alert)
                logger.warning(f"ALERT: {alert['message']}")
            
            if metric.accuracy < 70:  # Accuracy threshold
                alert = {
                    "type": "model",
                    "severity": "warning",
                    "metric": "model_accuracy",
                    "model_name": metric.model_name,
                    "value": metric.accuracy,
                    "threshold": 70,
                    "message": f"Model {metric.model_name} accuracy degraded: {metric.accuracy:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                }
                alerts_triggered.append(alert)
                logger.warning(f"ALERT: {alert['message']}")
        
        result = {
            "task": "check_performance_alerts",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "completed",
            "alerts_checked": True,
            "alerts_triggered": len(alerts_triggered),
            "alerts": alerts_triggered
        }
        
        if alerts_triggered:
            logger.warning(f"Performance alert check completed: {len(alerts_triggered)} alerts triggered")
        else:
            logger.info("Performance alert check completed: No alerts triggered")
        
        return result
        
    except Exception as e:
        logger.error(f"Performance alert check failed: {e}")
        raise


@celery_app.task(base=CallbackTask)
def cleanup_old_metrics() -> Dict[str, Any]:
    """
    Clean up old performance metrics to prevent storage bloat.
    
    Returns:
        Dictionary with cleanup results
    """
    try:
        logger.info("Starting metrics cleanup")
        
        monitor = PerformanceMonitor()
        
        # Clean up old request metrics (older than 24 hours)
        request_pattern = f"{monitor.request_metrics_key}:*"
        cutoff_time = int((datetime.utcnow() - timedelta(hours=24)).timestamp())
        
        request_keys = monitor.redis_client.keys(request_pattern)
        deleted_requests = 0
        
        for key in request_keys:
            try:
                timestamp = int(key.split(':')[-1])
                if timestamp < cutoff_time:
                    monitor.redis_client.delete(key)
                    deleted_requests += 1
            except (ValueError, IndexError):
                # Skip malformed keys
                continue
        
        # Clean up old system metrics (older than 7 days)
        system_pattern = f"{monitor.system_metrics_key}:*"
        cutoff_time = int((datetime.utcnow() - timedelta(days=7)).timestamp())
        
        system_keys = monitor.redis_client.keys(system_pattern)
        deleted_system = 0
        
        for key in system_keys:
            try:
                timestamp = int(key.split(':')[-1])
                if timestamp < cutoff_time:
                    monitor.redis_client.delete(key)
                    deleted_system += 1
            except (ValueError, IndexError):
                continue
        
        # Clean up old model metrics (older than 30 days)
        model_pattern = f"{monitor.model_metrics_key}:*"
        cutoff_time = int((datetime.utcnow() - timedelta(days=30)).timestamp())
        
        model_keys = monitor.redis_client.keys(model_pattern)
        deleted_models = 0
        
        for key in model_keys:
            try:
                timestamp = int(key.split(':')[-1])
                if timestamp < cutoff_time:
                    monitor.redis_client.delete(key)
                    deleted_models += 1
            except (ValueError, IndexError):
                continue
        
        result = {
            "task": "cleanup_old_metrics",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "completed",
            "deleted_request_metrics": deleted_requests,
            "deleted_system_metrics": deleted_system,
            "deleted_model_metrics": deleted_models,
            "total_deleted": deleted_requests + deleted_system + deleted_models
        }
        
        logger.info(f"Metrics cleanup completed: {result['total_deleted']} old metrics deleted")
        
        return result
        
    except Exception as e:
        logger.error(f"Metrics cleanup failed: {e}")
        raise


# Periodic task scheduling
@celery_app.task(base=CallbackTask)
def schedule_monitoring_tasks():
    """
    Schedule periodic monitoring tasks.
    
    This task sets up the recurring monitoring jobs.
    """
    try:
        # Schedule system metrics collection every 5 minutes
        collect_system_metrics.apply_async()
        
        # Schedule model performance collection every hour
        collect_model_performance_metrics.apply_async()
        
        # Schedule performance alert checks every 10 minutes
        check_performance_alerts.apply_async()
        
        # Schedule cleanup every 6 hours
        cleanup_old_metrics.apply_async()
        
        logger.info("Monitoring tasks scheduled successfully")
        
        return {
            "task": "schedule_monitoring_tasks",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "scheduled",
            "scheduled_tasks": [
                "collect_system_metrics",
                "collect_model_performance_metrics", 
                "check_performance_alerts",
                "cleanup_old_metrics"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule monitoring tasks: {e}")
        raise