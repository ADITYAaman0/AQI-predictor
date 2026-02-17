"""
Performance monitoring and metrics collection for AQI Predictor API.
Provides application performance monitoring (APM), system metrics, and model performance tracking.
"""

import logging
import time
import psutil
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import json
import os

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from redis import Redis

logger = logging.getLogger(__name__)


@dataclass
class RequestMetrics:
    """Metrics for individual HTTP requests."""
    path: str
    method: str
    status_code: int
    response_time_ms: float
    timestamp: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class SystemMetrics:
    """System resource metrics."""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class ModelPerformanceMetrics:
    """ML model performance metrics."""
    model_name: str
    model_version: str
    rmse: float
    mae: float
    accuracy: float
    prediction_count: int
    avg_response_time_ms: float
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


class PerformanceMonitor:
    """Central performance monitoring system."""
    
    def __init__(self, redis_url: str = None):
        """
        Initialize performance monitor.
        
        Args:
            redis_url: Redis connection URL for metrics storage
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = Redis.from_url(self.redis_url, decode_responses=True)
        
        # Redis keys for different metric types
        self.request_metrics_key = "aqi:metrics:requests"
        self.system_metrics_key = "aqi:metrics:system"
        self.model_metrics_key = "aqi:metrics:models"
        self.performance_stats_key = "aqi:stats:performance"
        
        # Metric retention periods
        self.request_retention_hours = 24
        self.system_retention_hours = 168  # 7 days
        self.model_retention_days = 30
        
    async def record_request_metrics(self, metrics: RequestMetrics):
        """
        Record HTTP request performance metrics.
        
        Args:
            metrics: Request metrics to record
        """
        try:
            # Store individual request metric
            metric_key = f"{self.request_metrics_key}:{int(time.time())}"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(
                    metric_key,
                    timedelta(hours=self.request_retention_hours),
                    json.dumps(metrics.to_dict())
                )
            )
            
            # Update aggregated statistics
            await self._update_request_stats(metrics)
            
        except Exception as e:
            logger.error(f"Failed to record request metrics: {e}")
    
    async def record_system_metrics(self):
        """Record current system resource metrics."""
        try:
            # Collect system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics = SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                memory_available_mb=memory.available / (1024 * 1024),
                disk_usage_percent=disk.percent,
                disk_free_gb=disk.free / (1024 * 1024 * 1024),
                timestamp=datetime.utcnow()
            )
            
            # Store system metrics
            metric_key = f"{self.system_metrics_key}:{int(time.time())}"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(
                    metric_key,
                    timedelta(hours=self.system_retention_hours),
                    json.dumps(metrics.to_dict())
                )
            )
            
            # Update current system stats
            await self._update_system_stats(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to record system metrics: {e}")
            return None
    
    async def record_model_performance(self, metrics: ModelPerformanceMetrics):
        """
        Record ML model performance metrics.
        
        Args:
            metrics: Model performance metrics to record
        """
        try:
            # Store model performance metrics
            metric_key = f"{self.model_metrics_key}:{metrics.model_name}:{int(time.time())}"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(
                    metric_key,
                    timedelta(days=self.model_retention_days),
                    json.dumps(metrics.to_dict())
                )
            )
            
            # Update model performance stats
            await self._update_model_stats(metrics)
            
        except Exception as e:
            logger.error(f"Failed to record model performance metrics: {e}")
    
    async def get_request_metrics(self, hours: int = 1) -> List[RequestMetrics]:
        """
        Get recent request metrics.
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            List of request metrics
        """
        try:
            cutoff_time = int(time.time()) - (hours * 3600)
            pattern = f"{self.request_metrics_key}:*"
            
            keys = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.keys(pattern)
            )
            
            metrics = []
            for key in keys:
                timestamp = int(key.split(':')[-1])
                if timestamp >= cutoff_time:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, lambda k=key: self.redis_client.get(k)
                    )
                    if data:
                        metric_data = json.loads(data)
                        metric_data['timestamp'] = datetime.fromisoformat(metric_data['timestamp'])
                        metrics.append(RequestMetrics(**metric_data))
            
            return sorted(metrics, key=lambda x: x.timestamp, reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get request metrics: {e}")
            return []
    
    async def get_system_metrics(self, hours: int = 1) -> List[SystemMetrics]:
        """
        Get recent system metrics.
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            List of system metrics
        """
        try:
            cutoff_time = int(time.time()) - (hours * 3600)
            pattern = f"{self.system_metrics_key}:*"
            
            keys = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.keys(pattern)
            )
            
            metrics = []
            for key in keys:
                timestamp = int(key.split(':')[-1])
                if timestamp >= cutoff_time:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, lambda k=key: self.redis_client.get(k)
                    )
                    if data:
                        metric_data = json.loads(data)
                        metric_data['timestamp'] = datetime.fromisoformat(metric_data['timestamp'])
                        metrics.append(SystemMetrics(**metric_data))
            
            return sorted(metrics, key=lambda x: x.timestamp, reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return []
    
    async def get_model_performance(self, model_name: str = None, days: int = 7) -> List[ModelPerformanceMetrics]:
        """
        Get recent model performance metrics.
        
        Args:
            model_name: Optional model name to filter by
            days: Number of days to look back
            
        Returns:
            List of model performance metrics
        """
        try:
            cutoff_time = int(time.time()) - (days * 24 * 3600)
            
            if model_name:
                pattern = f"{self.model_metrics_key}:{model_name}:*"
            else:
                pattern = f"{self.model_metrics_key}:*"
            
            keys = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.keys(pattern)
            )
            
            metrics = []
            for key in keys:
                timestamp = int(key.split(':')[-1])
                if timestamp >= cutoff_time:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, lambda k=key: self.redis_client.get(k)
                    )
                    if data:
                        metric_data = json.loads(data)
                        metric_data['timestamp'] = datetime.fromisoformat(metric_data['timestamp'])
                        metrics.append(ModelPerformanceMetrics(**metric_data))
            
            return sorted(metrics, key=lambda x: x.timestamp, reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get model performance metrics: {e}")
            return []
    
    async def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive performance summary.
        
        Returns:
            Dictionary with performance statistics
        """
        try:
            # Get aggregated statistics
            stats = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.hgetall(self.performance_stats_key)
            )
            
            # Convert numeric values
            for key, value in stats.items():
                try:
                    if '.' in value:
                        stats[key] = float(value)
                    else:
                        stats[key] = int(value)
                except ValueError:
                    pass  # Keep as string
            
            # Add current system metrics
            current_system = await self.record_system_metrics()
            if current_system:
                stats['current_system'] = current_system.to_dict()
            
            # Add timestamp
            stats['timestamp'] = datetime.utcnow().isoformat()
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {"error": str(e)}
    
    async def _update_request_stats(self, metrics: RequestMetrics):
        """Update aggregated request statistics."""
        try:
            # Update counters
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.hincrby(self.performance_stats_key, "total_requests", 1)
            )
            
            if metrics.status_code >= 400:
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda: self.redis_client.hincrby(self.performance_stats_key, "error_requests", 1)
                )
            
            # Update response time statistics
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.hincrbyfloat(
                    self.performance_stats_key, "total_response_time", metrics.response_time_ms
                )
            )
            
            # Update endpoint-specific stats
            endpoint_key = f"endpoint_{metrics.path.replace('/', '_')}_requests"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.redis_client.hincrby(self.performance_stats_key, endpoint_key, 1)
            )
            
        except Exception as e:
            logger.error(f"Failed to update request stats: {e}")
    
    async def _update_system_stats(self, metrics: SystemMetrics):
        """Update current system statistics."""
        try:
            stats_update = {
                "current_cpu_percent": metrics.cpu_percent,
                "current_memory_percent": metrics.memory_percent,
                "current_memory_used_mb": metrics.memory_used_mb,
                "current_disk_usage_percent": metrics.disk_usage_percent,
                "current_disk_free_gb": metrics.disk_free_gb,
                "last_system_update": metrics.timestamp.isoformat()
            }
            
            for key, value in stats_update.items():
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda k=key, v=value: self.redis_client.hset(self.performance_stats_key, k, v)
                )
                
        except Exception as e:
            logger.error(f"Failed to update system stats: {e}")
    
    async def _update_model_stats(self, metrics: ModelPerformanceMetrics):
        """Update model performance statistics."""
        try:
            model_prefix = f"model_{metrics.model_name}"
            
            stats_update = {
                f"{model_prefix}_current_rmse": metrics.rmse,
                f"{model_prefix}_current_mae": metrics.mae,
                f"{model_prefix}_current_accuracy": metrics.accuracy,
                f"{model_prefix}_prediction_count": metrics.prediction_count,
                f"{model_prefix}_avg_response_time": metrics.avg_response_time_ms,
                f"{model_prefix}_last_update": metrics.timestamp.isoformat()
            }
            
            for key, value in stats_update.items():
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda k=key, v=value: self.redis_client.hset(self.performance_stats_key, k, v)
                )
                
        except Exception as e:
            logger.error(f"Failed to update model stats: {e}")


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request performance metrics."""
    
    def __init__(self, app, monitor: PerformanceMonitor):
        super().__init__(app)
        self.monitor = monitor
    
    async def dispatch(self, request: Request, call_next):
        """Process request and collect performance metrics."""
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time_ms = (time.time() - start_time) * 1000
        
        # Create metrics record
        metrics = RequestMetrics(
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=response_time_ms,
            timestamp=datetime.utcnow(),
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None
        )
        
        # Record metrics asynchronously
        asyncio.create_task(self.monitor.record_request_metrics(metrics))
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{response_time_ms:.2f}ms"
        
        return response


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


@asynccontextmanager
async def track_operation(operation_name: str):
    """
    Context manager to track operation performance.
    
    Args:
        operation_name: Name of the operation being tracked
    """
    start_time = time.time()
    try:
        yield
    finally:
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"Operation '{operation_name}' completed in {duration_ms:.2f}ms")
        
        # Record operation metrics
        try:
            await performance_monitor.redis_client.hincrbyfloat(
                performance_monitor.performance_stats_key,
                f"operation_{operation_name}_total_time",
                duration_ms
            )
            await performance_monitor.redis_client.hincrby(
                performance_monitor.performance_stats_key,
                f"operation_{operation_name}_count",
                1
            )
        except Exception as e:
            logger.error(f"Failed to record operation metrics: {e}")


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance."""
    return performance_monitor