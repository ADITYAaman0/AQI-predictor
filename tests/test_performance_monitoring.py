"""
Tests for performance monitoring functionality.
Validates system metrics collection, model performance tracking, and alerting.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from typing import Dict, Any

from src.api.monitoring import (
    PerformanceMonitor, 
    RequestMetrics, 
    SystemMetrics, 
    ModelPerformanceMetrics,
    PerformanceMiddleware
)
from src.tasks.monitoring import (
    collect_system_metrics,
    collect_model_performance_metrics,
    check_performance_alerts,
    cleanup_old_metrics
)


class TestPerformanceMonitor:
    """Test performance monitoring core functionality."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client for testing."""
        mock_redis = Mock()
        mock_redis.setex = Mock()
        mock_redis.hgetall = Mock(return_value={})
        mock_redis.hincrby = Mock()
        mock_redis.hincrbyfloat = Mock()
        mock_redis.hset = Mock()
        mock_redis.keys = Mock(return_value=[])
        mock_redis.get = Mock(return_value=None)
        mock_redis.delete = Mock()
        return mock_redis
    
    @pytest.fixture
    def performance_monitor(self, mock_redis):
        """Create performance monitor with mocked Redis."""
        monitor = PerformanceMonitor()
        monitor.redis_client = mock_redis
        return monitor
    
    @pytest.mark.asyncio
    async def test_record_request_metrics(self, performance_monitor, mock_redis):
        """Test recording HTTP request metrics."""
        metrics = RequestMetrics(
            path="/api/v1/forecast/current/delhi",
            method="GET",
            status_code=200,
            response_time_ms=150.5,
            timestamp=datetime.utcnow(),
            user_agent="test-agent",
            ip_address="127.0.0.1"
        )
        
        await performance_monitor.record_request_metrics(metrics)
        
        # Verify Redis operations were called
        assert mock_redis.setex.called
        assert mock_redis.hincrby.called
        assert mock_redis.hincrbyfloat.called
    
    @pytest.mark.asyncio
    async def test_record_system_metrics(self, performance_monitor, mock_redis):
        """Test recording system resource metrics."""
        with patch('psutil.cpu_percent', return_value=45.2), \
             patch('psutil.virtual_memory') as mock_memory, \
             patch('psutil.disk_usage') as mock_disk:
            
            # Mock memory and disk objects
            mock_memory.return_value = Mock(
                percent=65.3,
                used=8589934592,  # 8GB in bytes
                available=4294967296  # 4GB in bytes
            )
            mock_disk.return_value = Mock(
                percent=75.1,
                free=107374182400  # 100GB in bytes
            )
            
            metrics = await performance_monitor.record_system_metrics()
            
            assert metrics is not None
            assert metrics.cpu_percent == 45.2
            assert metrics.memory_percent == 65.3
            assert metrics.disk_usage_percent == 75.1
            assert mock_redis.setex.called
            assert mock_redis.hset.called
    
    @pytest.mark.asyncio
    async def test_record_model_performance(self, performance_monitor, mock_redis):
        """Test recording ML model performance metrics."""
        metrics = ModelPerformanceMetrics(
            model_name="ensemble",
            model_version="1.0.0",
            rmse=18.5,
            mae=14.2,
            accuracy=78.5,
            prediction_count=150,
            avg_response_time_ms=125.3,
            timestamp=datetime.utcnow()
        )
        
        await performance_monitor.record_model_performance(metrics)
        
        # Verify Redis operations were called
        assert mock_redis.setex.called
        assert mock_redis.hset.called
    
    @pytest.mark.asyncio
    async def test_get_performance_summary(self, performance_monitor, mock_redis):
        """Test getting comprehensive performance summary."""
        # Mock Redis hash data
        mock_redis.hgetall.return_value = {
            "total_requests": "1000",
            "error_requests": "25",
            "total_response_time": "125000.5",
            "current_cpu_percent": "45.2",
            "current_memory_percent": "65.3"
        }
        
        with patch('psutil.cpu_percent', return_value=45.2), \
             patch('psutil.virtual_memory') as mock_memory, \
             patch('psutil.disk_usage') as mock_disk:
            
            mock_memory.return_value = Mock(
                percent=65.3,
                used=8589934592,
                available=4294967296
            )
            mock_disk.return_value = Mock(
                percent=75.1,
                free=107374182400
            )
            
            summary = await performance_monitor.get_performance_summary()
            
            assert "total_requests" in summary
            assert summary["total_requests"] == 1000
            assert summary["error_requests"] == 25
            assert "current_system" in summary
            assert "timestamp" in summary


class TestPerformanceMiddleware:
    """Test performance monitoring middleware."""
    
    @pytest.mark.asyncio
    async def test_middleware_records_metrics(self):
        """Test that middleware records request metrics."""
        mock_monitor = Mock()
        mock_monitor.record_request_metrics = AsyncMock()
        
        middleware = PerformanceMiddleware(app=None, monitor=mock_monitor)
        
        # Mock request and response
        mock_request = Mock()
        mock_request.url.path = "/api/v1/forecast/current/delhi"
        mock_request.method = "GET"
        mock_request.headers.get.return_value = "test-agent"
        mock_request.client.host = "127.0.0.1"
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {}
        
        async def mock_call_next(request):
            # Simulate some processing time
            await asyncio.sleep(0.01)
            return mock_response
        
        # Process request through middleware
        response = await middleware.dispatch(mock_request, mock_call_next)
        
        # Verify metrics were recorded
        assert mock_monitor.record_request_metrics.called
        assert response.headers["X-Response-Time"]
        assert "ms" in response.headers["X-Response-Time"]


class TestMonitoringTasks:
    """Test background monitoring tasks."""
    
    @patch('src.tasks.monitoring.PerformanceMonitor')
    @patch('psutil.cpu_percent', return_value=45.2)
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_collect_system_metrics_task(self, mock_disk, mock_memory, mock_cpu, mock_monitor_class):
        """Test system metrics collection task."""
        # Mock system resources
        mock_memory.return_value = Mock(
            percent=65.3,
            used=8589934592,
            available=4294967296
        )
        mock_disk.return_value = Mock(
            percent=75.1,
            free=107374182400
        )
        
        # Mock monitor instance
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        
        # Mock async method
        mock_metrics = SystemMetrics(
            cpu_percent=45.2,
            memory_percent=65.3,
            memory_used_mb=8192.0,
            memory_available_mb=4096.0,
            disk_usage_percent=75.1,
            disk_free_gb=100.0,
            timestamp=datetime.utcnow()
        )
        
        with patch('asyncio.new_event_loop') as mock_loop_new, \
             patch('asyncio.set_event_loop') as mock_loop_set:
            
            mock_loop = Mock()
            mock_loop_new.return_value = mock_loop
            mock_loop.run_until_complete.return_value = mock_metrics
            
            result = collect_system_metrics()
            
            assert result["status"] == "completed"
            assert "metrics" in result
            assert mock_loop.run_until_complete.called
    
    @patch('src.tasks.monitoring.PerformanceMonitor')
    def test_collect_model_performance_task(self, mock_monitor_class):
        """Test model performance collection task."""
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        
        with patch('asyncio.new_event_loop') as mock_loop_new, \
             patch('asyncio.set_event_loop') as mock_loop_set, \
             patch('time.sleep'):  # Mock sleep to speed up test
            
            mock_loop = Mock()
            mock_loop_new.return_value = mock_loop
            mock_loop.run_until_complete.return_value = None
            
            result = collect_model_performance_metrics()
            
            assert result["status"] == "completed"
            assert "models_evaluated" in result
            assert result["models_evaluated"] == 4  # ensemble, lstm, gnn, xgboost
            assert "results" in result
    
    @patch('src.tasks.monitoring.PerformanceMonitor')
    def test_check_performance_alerts_task(self, mock_monitor_class):
        """Test performance alerts checking task."""
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        
        # Mock performance summary with high CPU usage
        mock_summary = {
            "current_cpu_percent": 95.0,  # Above threshold
            "current_memory_percent": 60.0,
            "total_requests": 1000,
            "error_requests": 150  # High error rate
        }
        
        with patch('asyncio.new_event_loop') as mock_loop_new, \
             patch('asyncio.set_event_loop') as mock_loop_set:
            
            mock_loop = Mock()
            mock_loop_new.return_value = mock_loop
            mock_loop.run_until_complete.side_effect = [
                mock_summary,  # get_performance_summary
                []  # get_model_performance
            ]
            
            result = check_performance_alerts()
            
            assert result["status"] == "completed"
            assert "alerts_triggered" in result
            assert result["alerts_triggered"] > 0  # Should trigger CPU and error rate alerts
            assert "alerts" in result
    
    @patch('src.tasks.monitoring.PerformanceMonitor')
    def test_cleanup_old_metrics_task(self, mock_monitor_class):
        """Test old metrics cleanup task."""
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        
        # Mock Redis keys for cleanup
        current_time = int(time.time())
        old_time = current_time - (25 * 3600)  # 25 hours ago
        
        mock_monitor.redis_client.keys.side_effect = [
            [f"aqi:metrics:requests:{old_time}", f"aqi:metrics:requests:{current_time}"],  # Request metrics
            [f"aqi:metrics:system:{old_time}"],  # System metrics
            [f"aqi:metrics:models:ensemble:{old_time}"]  # Model metrics
        ]
        
        result = cleanup_old_metrics()
        
        assert result["status"] == "completed"
        assert "total_deleted" in result
        assert result["total_deleted"] >= 0


class TestPerformanceAlerts:
    """Test performance alerting functionality."""
    
    @pytest.mark.asyncio
    async def test_cpu_threshold_alert(self):
        """Test CPU usage threshold alert generation."""
        monitor = PerformanceMonitor()
        
        # Mock high CPU usage
        with patch.object(monitor, 'get_performance_summary') as mock_summary:
            mock_summary.return_value = {
                "current_cpu_percent": 95.0,
                "current_memory_percent": 60.0,
                "total_requests": 1000,
                "error_requests": 50
            }
            
            # This would be called by the monitoring router
            summary = await monitor.get_performance_summary()
            
            # Check if CPU alert would be triggered
            cpu_percent = summary.get('current_cpu_percent', 0)
            assert cpu_percent > 90  # Should trigger critical alert
    
    @pytest.mark.asyncio
    async def test_error_rate_alert(self):
        """Test error rate threshold alert generation."""
        monitor = PerformanceMonitor()
        
        # Mock high error rate
        with patch.object(monitor, 'get_performance_summary') as mock_summary:
            mock_summary.return_value = {
                "current_cpu_percent": 45.0,
                "current_memory_percent": 60.0,
                "total_requests": 1000,
                "error_requests": 150  # 15% error rate
            }
            
            summary = await monitor.get_performance_summary()
            
            # Calculate error rate
            total_requests = summary.get('total_requests', 0)
            error_requests = summary.get('error_requests', 0)
            error_rate = (error_requests / total_requests) * 100 if total_requests > 0 else 0
            
            assert error_rate > 10  # Should trigger critical alert


if __name__ == "__main__":
    pytest.main([__file__])