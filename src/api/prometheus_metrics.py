"""
Prometheus metrics exporter for AQI Predictor API.
Provides Prometheus-compatible metrics for monitoring and alerting.
"""

import logging
import time
from typing import Dict, Any
from prometheus_client import (
    Counter, Histogram, Gauge, Info, 
    CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
)
from fastapi import Response
import psutil

logger = logging.getLogger(__name__)

# Create custom registry for AQI metrics
registry = CollectorRegistry()

# HTTP Request Metrics
http_requests_total = Counter(
    'aqi_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'aqi_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)

http_requests_in_progress = Gauge(
    'aqi_http_requests_in_progress',
    'Number of HTTP requests in progress',
    ['method', 'endpoint'],
    registry=registry
)

# API-specific Metrics
api_forecast_requests_total = Counter(
    'aqi_forecast_requests_total',
    'Total forecast API requests',
    ['location_type', 'forecast_type'],
    registry=registry
)

api_prediction_errors_total = Counter(
    'aqi_prediction_errors_total',
    'Total prediction errors',
    ['error_type'],
    registry=registry
)

# ML Model Metrics
model_predictions_total = Counter(
    'aqi_model_predictions_total',
    'Total model predictions',
    ['model_name', 'model_version'],
    registry=registry
)

model_prediction_duration_seconds = Histogram(
    'aqi_model_prediction_duration_seconds',
    'Model prediction duration in seconds',
    ['model_name'],
    registry=registry
)

model_rmse = Gauge(
    'aqi_model_rmse',
    'Model Root Mean Square Error',
    ['model_name', 'model_version'],
    registry=registry
)

model_mae = Gauge(
    'aqi_model_mae',
    'Model Mean Absolute Error',
    ['model_name', 'model_version'],
    registry=registry
)

model_accuracy = Gauge(
    'aqi_model_accuracy_percent',
    'Model accuracy percentage',
    ['model_name', 'model_version'],
    registry=registry
)

# Data Pipeline Metrics
data_ingestion_total = Counter(
    'aqi_data_ingestion_total',
    'Total data points ingested',
    ['source', 'data_type'],
    registry=registry
)

data_ingestion_errors_total = Counter(
    'aqi_data_ingestion_errors_total',
    'Total data ingestion errors',
    ['source', 'error_type'],
    registry=registry
)

data_quality_issues_total = Counter(
    'aqi_data_quality_issues_total',
    'Total data quality issues detected',
    ['issue_type'],
    registry=registry
)

data_processing_duration_seconds = Histogram(
    'aqi_data_processing_duration_seconds',
    'Data processing duration in seconds',
    ['source', 'operation'],
    registry=registry
)

# Database Metrics
db_connections_active = Gauge(
    'aqi_db_connections_active',
    'Number of active database connections',
    registry=registry
)

db_query_duration_seconds = Histogram(
    'aqi_db_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    registry=registry
)

db_queries_total = Counter(
    'aqi_db_queries_total',
    'Total database queries',
    ['query_type', 'status'],
    registry=registry
)

# Cache Metrics
cache_hits_total = Counter(
    'aqi_cache_hits_total',
    'Total cache hits',
    ['cache_type'],
    registry=registry
)

cache_misses_total = Counter(
    'aqi_cache_misses_total',
    'Total cache misses',
    ['cache_type'],
    registry=registry
)

cache_size_bytes = Gauge(
    'aqi_cache_size_bytes',
    'Cache size in bytes',
    ['cache_type'],
    registry=registry
)

# Alert Metrics
alerts_sent_total = Counter(
    'aqi_alerts_sent_total',
    'Total alerts sent',
    ['alert_type', 'channel'],
    registry=registry
)

alerts_failed_total = Counter(
    'aqi_alerts_failed_total',
    'Total failed alert deliveries',
    ['alert_type', 'channel', 'error_type'],
    registry=registry
)

alert_subscriptions_active = Gauge(
    'aqi_alert_subscriptions_active',
    'Number of active alert subscriptions',
    registry=registry
)

# System Resource Metrics
system_cpu_percent = Gauge(
    'aqi_system_cpu_percent',
    'System CPU usage percentage',
    registry=registry
)

system_memory_percent = Gauge(
    'aqi_system_memory_percent',
    'System memory usage percentage',
    registry=registry
)

system_memory_used_bytes = Gauge(
    'aqi_system_memory_used_bytes',
    'System memory used in bytes',
    registry=registry
)

system_disk_usage_percent = Gauge(
    'aqi_system_disk_usage_percent',
    'System disk usage percentage',
    registry=registry
)

system_disk_free_bytes = Gauge(
    'aqi_system_disk_free_bytes',
    'System disk free space in bytes',
    registry=registry
)

# Background Task Metrics
celery_tasks_total = Counter(
    'aqi_celery_tasks_total',
    'Total Celery tasks',
    ['task_name', 'status'],
    registry=registry
)

celery_task_duration_seconds = Histogram(
    'aqi_celery_task_duration_seconds',
    'Celery task duration in seconds',
    ['task_name'],
    registry=registry
)

celery_tasks_in_progress = Gauge(
    'aqi_celery_tasks_in_progress',
    'Number of Celery tasks in progress',
    ['task_name'],
    registry=registry
)

# Application Info
app_info = Info(
    'aqi_application',
    'AQI Predictor application information',
    registry=registry
)

# Uptime Metric
app_uptime_seconds = Gauge(
    'aqi_app_uptime_seconds',
    'Application uptime in seconds',
    registry=registry
)


class PrometheusMetricsCollector:
    """Collector for Prometheus metrics."""
    
    def __init__(self):
        """Initialize metrics collector."""
        self.start_time = time.time()
        
        # Set application info
        app_info.info({
            'version': '1.0.0',
            'environment': 'production',
            'service': 'aqi-predictor-api'
        })
    
    def update_system_metrics(self):
        """Update system resource metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            system_cpu_percent.set(cpu_percent)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            system_memory_percent.set(memory.percent)
            system_memory_used_bytes.set(memory.used)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            system_disk_usage_percent.set(disk.percent)
            system_disk_free_bytes.set(disk.free)
            
            # Uptime
            uptime = time.time() - self.start_time
            app_uptime_seconds.set(uptime)
            
        except Exception as e:
            logger.error(f"Failed to update system metrics: {e}")
    
    def record_http_request(self, method: str, endpoint: str, status: int, duration: float):
        """
        Record HTTP request metrics.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            status: HTTP status code
            duration: Request duration in seconds
        """
        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
    
    def record_forecast_request(self, location_type: str, forecast_type: str):
        """
        Record forecast API request.
        
        Args:
            location_type: Type of location (city, coordinates, etc.)
            forecast_type: Type of forecast (current, 24h, spatial)
        """
        api_forecast_requests_total.labels(
            location_type=location_type,
            forecast_type=forecast_type
        ).inc()
    
    def record_prediction_error(self, error_type: str):
        """
        Record prediction error.
        
        Args:
            error_type: Type of error
        """
        api_prediction_errors_total.labels(error_type=error_type).inc()
    
    def record_model_prediction(self, model_name: str, model_version: str, duration: float):
        """
        Record model prediction.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            duration: Prediction duration in seconds
        """
        model_predictions_total.labels(
            model_name=model_name,
            model_version=model_version
        ).inc()
        model_prediction_duration_seconds.labels(model_name=model_name).observe(duration)
    
    def update_model_performance(self, model_name: str, model_version: str, 
                                 rmse: float, mae: float, accuracy: float):
        """
        Update model performance metrics.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            rmse: Root Mean Square Error
            mae: Mean Absolute Error
            accuracy: Accuracy percentage
        """
        model_rmse.labels(model_name=model_name, model_version=model_version).set(rmse)
        model_mae.labels(model_name=model_name, model_version=model_version).set(mae)
        model_accuracy.labels(model_name=model_name, model_version=model_version).set(accuracy)
    
    def record_data_ingestion(self, source: str, data_type: str, count: int = 1):
        """
        Record data ingestion.
        
        Args:
            source: Data source
            data_type: Type of data
            count: Number of data points
        """
        data_ingestion_total.labels(source=source, data_type=data_type).inc(count)
    
    def record_data_ingestion_error(self, source: str, error_type: str):
        """
        Record data ingestion error.
        
        Args:
            source: Data source
            error_type: Type of error
        """
        data_ingestion_errors_total.labels(source=source, error_type=error_type).inc()
    
    def record_data_quality_issue(self, issue_type: str):
        """
        Record data quality issue.
        
        Args:
            issue_type: Type of quality issue
        """
        data_quality_issues_total.labels(issue_type=issue_type).inc()
    
    def record_cache_hit(self, cache_type: str):
        """Record cache hit."""
        cache_hits_total.labels(cache_type=cache_type).inc()
    
    def record_cache_miss(self, cache_type: str):
        """Record cache miss."""
        cache_misses_total.labels(cache_type=cache_type).inc()
    
    def record_alert_sent(self, alert_type: str, channel: str):
        """Record alert sent."""
        alerts_sent_total.labels(alert_type=alert_type, channel=channel).inc()
    
    def record_alert_failed(self, alert_type: str, channel: str, error_type: str):
        """Record failed alert."""
        alerts_failed_total.labels(
            alert_type=alert_type,
            channel=channel,
            error_type=error_type
        ).inc()
    
    def get_metrics(self) -> bytes:
        """
        Get Prometheus metrics in text format.
        
        Returns:
            Metrics in Prometheus text format
        """
        # Update system metrics before generating output
        self.update_system_metrics()
        
        return generate_latest(registry)


# Global metrics collector instance
metrics_collector = PrometheusMetricsCollector()


def get_metrics_collector() -> PrometheusMetricsCollector:
    """Get the global metrics collector instance."""
    return metrics_collector


async def metrics_endpoint() -> Response:
    """
    Prometheus metrics endpoint.
    
    Returns:
        Response with Prometheus metrics
    """
    metrics = metrics_collector.get_metrics()
    return Response(content=metrics, media_type=CONTENT_TYPE_LATEST)
