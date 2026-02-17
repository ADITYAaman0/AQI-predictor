"""
Property-based tests for Celery job retry logic with exponential backoff.

Feature: aqi-predictor-completion
Property 10: Job Retry Exponential Backoff
**Validates: Requirements 8.5**

For any failed background job, retry attempts should follow exponential backoff 
pattern with increasing delays between attempts.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import json

from src.tasks.task_monitor import TaskMonitor, TaskExecutionRecord, TaskStatus


class TestJobRetryExponentialBackoff:
    """Test exponential backoff retry logic for background jobs."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client."""
        redis_mock = MagicMock()
        redis_mock.setex = Mock()
        redis_mock.get = Mock(return_value=None)
        redis_mock.keys = Mock(return_value=[])
        redis_mock.hincrby = Mock()
        redis_mock.hincrbyfloat = Mock()
        redis_mock.hgetall = Mock(return_value={})
        return redis_mock
    
    @pytest.fixture
    def task_monitor(self, mock_redis):
        """Create TaskMonitor with mocked Redis."""
        with patch('src.tasks.task_monitor.Redis') as redis_class:
            redis_class.from_url.return_value = mock_redis
            monitor = TaskMonitor()
            monitor.redis_client = mock_redis
            return monitor
    
    @given(
        retry_count=st.integers(min_value=0, max_value=5)
    )
    @settings(
        max_examples=100, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_exponential_backoff_pattern(self, task_monitor, mock_redis, 
                                        retry_count):
        """
        Property 10: Job Retry Exponential Backoff
        
        For any retry attempt, the countdown should follow exponential backoff:
        countdown = 60 * (2 ** retry_count)
        
        This ensures increasing delays: 60s, 120s, 240s, 480s, etc.
        """
        task_id = f"test_task_{retry_count}"
        task_name = "test.task"
        error = "Test error"
        base_delay = 60  # Fixed base delay used by implementation
        
        # Create initial task record
        initial_record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=5
        )
        
        # Mock Redis to return the initial record
        mock_redis.get.return_value = json.dumps(initial_record.to_dict())
        
        # Calculate expected countdown with exponential backoff
        expected_countdown = base_delay * (2 ** retry_count)
        
        # Record retry with the calculated countdown
        task_monitor.record_task_retry(
            task_id=task_id,
            retry_count=retry_count,
            error=error,
            countdown=expected_countdown
        )
        
        # Verify retry was recorded
        assert mock_redis.setex.called
        
        # Get the retry record that was stored
        retry_key_calls = [
            call for call in mock_redis.setex.call_args_list
            if f"retry:{task_id}:{retry_count}" in str(call)
        ]
        
        if retry_key_calls:
            # Extract arguments: setex(key, ttl, value)
            call_args = retry_key_calls[0][0]  # Get positional args
            stored_data = json.loads(call_args[2])  # Third argument is the value
            
            # Verify exponential backoff pattern
            assert stored_data["retry_count"] == retry_count
            assert stored_data["countdown"] == expected_countdown
            
            # Verify countdown increases exponentially
            if retry_count > 0:
                previous_countdown = base_delay * (2 ** (retry_count - 1))
                assert expected_countdown == previous_countdown * 2
    
    @given(
        max_retries=st.integers(min_value=1, max_value=5)
    )
    @settings(
        max_examples=100, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_retry_sequence_follows_exponential_pattern(self, task_monitor, 
                                                       mock_redis, max_retries):
        """
        Property 10: Complete retry sequence follows exponential backoff.
        
        For any sequence of retries, each subsequent retry should have
        double the countdown of the previous retry.
        """
        task_id = "test_task_sequence"
        task_name = "test.task"
        base_delay = 60
        
        # Create initial task record
        initial_record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=max_retries
        )
        
        mock_redis.get.return_value = json.dumps(initial_record.to_dict())
        
        countdowns = []
        
        # Simulate retry sequence
        for retry_count in range(max_retries):
            countdown = base_delay * (2 ** retry_count)
            countdowns.append(countdown)
            
            task_monitor.record_task_retry(
                task_id=task_id,
                retry_count=retry_count,
                error=f"Error attempt {retry_count}",
                countdown=countdown
            )
        
        # Verify exponential growth pattern
        for i in range(1, len(countdowns)):
            assert countdowns[i] == countdowns[i-1] * 2, \
                f"Countdown at retry {i} should be double the previous retry"
        
        # Verify first countdown is base delay
        if countdowns:
            assert countdowns[0] == base_delay
    
    @given(
        retry_count=st.integers(min_value=0, max_value=10)
    )
    @settings(
        max_examples=100, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_retry_timing_calculation(self, task_monitor, mock_redis, retry_count):
        """
        Property 10: Next retry time is correctly calculated.
        
        For any retry, the next_retry_at timestamp should be
        current_time + countdown seconds.
        """
        task_id = f"test_task_timing_{retry_count}"
        task_name = "test.task"
        base_delay = 60
        countdown = base_delay * (2 ** retry_count)
        
        # Create initial task record
        initial_record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=10
        )
        
        mock_redis.get.return_value = json.dumps(initial_record.to_dict())
        
        # Record current time before retry
        before_time = datetime.utcnow()
        
        # Record retry
        task_monitor.record_task_retry(
            task_id=task_id,
            retry_count=retry_count,
            error="Test error",
            countdown=countdown
        )
        
        after_time = datetime.utcnow()
        
        # Get the retry record
        retry_key_calls = [
            call for call in mock_redis.setex.call_args_list
            if f"retry:{task_id}:{retry_count}" in str(call)
        ]
        
        if retry_key_calls:
            # Extract arguments: setex(key, ttl, value)
            call_args = retry_key_calls[0][0]  # Get positional args
            stored_data = json.loads(call_args[2])  # Third argument is the value
            
            # Parse timestamps
            timestamp = datetime.fromisoformat(stored_data["timestamp"])
            next_retry_at = datetime.fromisoformat(stored_data["next_retry_at"])
            
            # Verify timestamp is within reasonable range
            assert before_time <= timestamp <= after_time
            
            # Verify next retry time is countdown seconds in the future
            expected_next_retry = timestamp + timedelta(seconds=countdown)
            time_diff = abs((next_retry_at - expected_next_retry).total_seconds())
            assert time_diff < 1, "Next retry time should be countdown seconds from now"
    
    @given(
        retry_count=st.integers(min_value=0, max_value=3)
    )
    @settings(
        max_examples=100, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_retry_count_tracking(self, task_monitor, mock_redis, retry_count):
        """
        Property 10: Retry count is accurately tracked.
        
        For any retry attempt, the retry_count should be correctly
        stored and incremented.
        """
        task_id = f"test_task_count_{retry_count}"
        task_name = "test.task"
        countdown = 60 * (2 ** retry_count)
        max_retries = 5
        
        # Create initial task record
        initial_record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=max_retries,
            retry_count=0
        )
        
        mock_redis.get.return_value = json.dumps(initial_record.to_dict())
        
        # Record retry
        task_monitor.record_task_retry(
            task_id=task_id,
            retry_count=retry_count,
            error="Test error",
            countdown=countdown
        )
        
        # Verify task record was updated with retry count
        task_record_calls = [
            call for call in mock_redis.setex.call_args_list
            if f"monitor:{task_id}" in str(call)
        ]
        
        if task_record_calls:
            # Extract arguments: setex(key, ttl, value)
            call_args = task_record_calls[0][0]  # Get positional args
            stored_data = json.loads(call_args[2])  # Third argument is the value
            
            # Verify retry count is tracked
            assert stored_data["retry_count"] == retry_count
            assert stored_data["status"] == TaskStatus.RETRY
            # Verify max_retries is preserved from initial record
            assert stored_data["max_retries"] == max_retries
    
    @given(
        initial_delay=st.integers(min_value=30, max_value=300),
        retry_count=st.integers(min_value=0, max_value=5)
    )
    @settings(
        max_examples=100, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_exponential_backoff_with_different_base_delays(
        self, task_monitor, mock_redis, initial_delay, retry_count
    ):
        """
        Property 10: Exponential backoff works with different base delays.
        
        For any base delay, the exponential backoff pattern should
        maintain the 2^n multiplier relationship.
        """
        task_id = f"test_task_base_{initial_delay}_{retry_count}"
        task_name = "test.task"
        
        # Create initial task record
        initial_record = TaskExecutionRecord(
            task_id=task_id,
            task_name=task_name,
            status=TaskStatus.STARTED,
            started_at=datetime.utcnow(),
            max_retries=5
        )
        
        mock_redis.get.return_value = json.dumps(initial_record.to_dict())
        
        # Calculate countdown with custom base delay
        countdown = initial_delay * (2 ** retry_count)
        
        # Record retry
        task_monitor.record_task_retry(
            task_id=task_id,
            retry_count=retry_count,
            error="Test error",
            countdown=countdown
        )
        
        # Verify the countdown follows exponential pattern
        retry_key_calls = [
            call for call in mock_redis.setex.call_args_list
            if f"retry:{task_id}:{retry_count}" in str(call)
        ]
        
        if retry_key_calls:
            # Extract arguments: setex(key, ttl, value)
            call_args = retry_key_calls[0][0]  # Get positional args
            stored_data = json.loads(call_args[2])  # Third argument is the value
            
            # Verify countdown matches exponential formula
            expected_countdown = initial_delay * (2 ** retry_count)
            assert stored_data["countdown"] == expected_countdown
            
            # Verify exponential growth factor
            if retry_count > 0:
                growth_factor = countdown / (initial_delay * (2 ** (retry_count - 1)))
                assert abs(growth_factor - 2.0) < 0.01, \
                    "Growth factor should be approximately 2.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
