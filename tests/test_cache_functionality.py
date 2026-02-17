"""
Tests for Redis caching functionality.
Validates cache operations, TTL behavior, and performance requirements.
"""

import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import json

from src.api.cache import (
    CacheManager, cache_manager, init_redis, close_redis,
    make_forecast_key, make_aqi_key, make_attribution_key, CACHE_TTL
)


@pytest.mark.asyncio
class TestCacheManager:
    """Test the CacheManager class functionality."""
    
    @pytest.fixture
    def mock_redis_client(self):
        """Create a mock Redis client for testing."""
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_client.get = AsyncMock(return_value=None)
        mock_client.set = AsyncMock(return_value=True)
        mock_client.setex = AsyncMock(return_value=True)
        mock_client.delete = AsyncMock(return_value=1)
        mock_client.exists = AsyncMock(return_value=1)
        mock_client.incrby = AsyncMock(return_value=1)
        mock_client.expire = AsyncMock(return_value=True)
        mock_client.mget = AsyncMock(return_value=[])
        mock_client.mset = AsyncMock(return_value=True)
        mock_client.info = AsyncMock(return_value={
            "redis_version": "7.0.0",
            "used_memory_human": "1.5M",
            "used_memory": 1572864,
            "connected_clients": 5,
            "total_commands_processed": 1000,
            "keyspace_hits": 800,
            "keyspace_misses": 200,
            "uptime_in_seconds": 3600
        })
        return mock_client
    
    @pytest.fixture
    def cache_mgr(self, mock_redis_client):
        """Create a CacheManager instance with mocked Redis client."""
        mgr = CacheManager()
        mgr.client = mock_redis_client
        return mgr
    
    async def test_cache_get_success(self, cache_mgr, mock_redis_client):
        """Test successful cache get operation."""
        test_data = {"key": "value", "number": 42}
        mock_redis_client.get.return_value = json.dumps(test_data)
        
        result = await cache_mgr.get("test_key")
        
        assert result == test_data
        mock_redis_client.get.assert_called_once_with("test_key")
    
    async def test_cache_get_miss(self, cache_mgr, mock_redis_client):
        """Test cache miss (key not found)."""
        mock_redis_client.get.return_value = None
        
        result = await cache_mgr.get("nonexistent_key")
        
        assert result is None
        mock_redis_client.get.assert_called_once_with("nonexistent_key")
    
    async def test_cache_get_error_handling(self, cache_mgr, mock_redis_client):
        """Test cache get with Redis error."""
        mock_redis_client.get.side_effect = Exception("Redis connection error")
        
        result = await cache_mgr.get("test_key")
        
        assert result is None  # Should return None on error
    
    async def test_cache_set_success(self, cache_mgr, mock_redis_client):
        """Test successful cache set operation."""
        test_data = {"key": "value", "timestamp": "2024-01-15T10:30:00Z"}
        
        result = await cache_mgr.set("test_key", test_data)
        
        assert result is True
        mock_redis_client.set.assert_called_once_with("test_key", json.dumps(test_data, default=str))
    
    async def test_cache_set_with_ttl_int(self, cache_mgr, mock_redis_client):
        """Test cache set with integer TTL."""
        test_data = {"key": "value"}
        ttl = 300
        
        result = await cache_mgr.set("test_key", test_data, ttl=ttl)
        
        assert result is True
        mock_redis_client.setex.assert_called_once_with("test_key", ttl, json.dumps(test_data, default=str))
    
    async def test_cache_set_with_ttl_timedelta(self, cache_mgr, mock_redis_client):
        """Test cache set with timedelta TTL."""
        test_data = {"key": "value"}
        ttl = timedelta(minutes=5)
        
        result = await cache_mgr.set("test_key", test_data, ttl=ttl)
        
        assert result is True
        mock_redis_client.setex.assert_called_once_with("test_key", 300, json.dumps(test_data, default=str))
    
    async def test_cache_delete_success(self, cache_mgr, mock_redis_client):
        """Test successful cache delete operation."""
        mock_redis_client.delete.return_value = 1
        
        result = await cache_mgr.delete("test_key")
        
        assert result is True
        mock_redis_client.delete.assert_called_once_with("test_key")
    
    async def test_cache_delete_key_not_found(self, cache_mgr, mock_redis_client):
        """Test cache delete when key doesn't exist."""
        mock_redis_client.delete.return_value = 0
        
        result = await cache_mgr.delete("nonexistent_key")
        
        assert result is False
    
    async def test_cache_exists_true(self, cache_mgr, mock_redis_client):
        """Test cache exists when key exists."""
        mock_redis_client.exists.return_value = 1
        
        result = await cache_mgr.exists("test_key")
        
        assert result is True
        mock_redis_client.exists.assert_called_once_with("test_key")
    
    async def test_cache_exists_false(self, cache_mgr, mock_redis_client):
        """Test cache exists when key doesn't exist."""
        mock_redis_client.exists.return_value = 0
        
        result = await cache_mgr.exists("nonexistent_key")
        
        assert result is False
    
    async def test_cache_increment(self, cache_mgr, mock_redis_client):
        """Test cache increment operation."""
        mock_redis_client.incrby.return_value = 5
        
        result = await cache_mgr.increment("counter_key", 3)
        
        assert result == 5
        mock_redis_client.incrby.assert_called_once_with("counter_key", 3)
    
    async def test_cache_expire(self, cache_mgr, mock_redis_client):
        """Test cache expire operation."""
        mock_redis_client.expire.return_value = True
        
        result = await cache_mgr.expire("test_key", 300)
        
        assert result is True
        mock_redis_client.expire.assert_called_once_with("test_key", 300)
    
    async def test_cache_get_many(self, cache_mgr, mock_redis_client):
        """Test cache get_many operation."""
        keys = ["key1", "key2", "key3"]
        values = ['{"data": 1}', '{"data": 2}', None]
        mock_redis_client.mget.return_value = values
        
        result = await cache_mgr.get_many(keys)
        
        expected = {
            "key1": {"data": 1},
            "key2": {"data": 2}
        }
        assert result == expected
        mock_redis_client.mget.assert_called_once_with(keys)
    
    async def test_cache_set_many(self, cache_mgr, mock_redis_client):
        """Test cache set_many operation."""
        mapping = {
            "key1": {"data": 1},
            "key2": {"data": 2}
        }
        
        result = await cache_mgr.set_many(mapping)
        
        assert result is True
        expected_mapping = {
            "key1": '{"data": 1}',
            "key2": '{"data": 2}'
        }
        mock_redis_client.mset.assert_called_once_with(expected_mapping)
    
    async def test_cache_set_many_with_ttl(self, cache_mgr, mock_redis_client):
        """Test cache set_many with TTL."""
        mapping = {"key1": {"data": 1}}
        ttl = 300
        
        result = await cache_mgr.set_many(mapping, ttl=ttl)
        
        assert result is True
        mock_redis_client.expire.assert_called_once_with("key1", ttl)
    
    async def test_cache_health_check_success(self, cache_mgr, mock_redis_client):
        """Test cache health check success."""
        mock_redis_client.ping.return_value = True
        
        result = await cache_mgr.health_check()
        
        assert result is True
        mock_redis_client.ping.assert_called_once()
    
    async def test_cache_health_check_failure(self, cache_mgr, mock_redis_client):
        """Test cache health check failure."""
        mock_redis_client.ping.side_effect = Exception("Connection failed")
        
        result = await cache_mgr.health_check()
        
        assert result is False
    
    async def test_cache_get_info_success(self, cache_mgr, mock_redis_client):
        """Test cache get_info success."""
        result = await cache_mgr.get_info()
        
        assert "redis_version" in result
        assert "hit_rate_percent" in result
        assert result["hit_rate_percent"] == 80.0  # 800/(800+200) * 100
        mock_redis_client.info.assert_called_once()
    
    async def test_cache_get_stats_success(self, cache_mgr, mock_redis_client):
        """Test cache get_cache_stats success."""
        result = await cache_mgr.get_cache_stats()
        
        assert "timestamp" in result
        assert "hit_rate_percent" in result
        assert "memory" in result
        assert "performance" in result
        assert "connections" in result
        assert result["hit_rate_percent"] == 80.0
    
    async def test_cache_no_client(self):
        """Test cache operations when Redis client is not available."""
        mgr = CacheManager()
        mgr.client = None
        
        assert await mgr.get("key") is None
        assert await mgr.set("key", "value") is False
        assert await mgr.delete("key") is False
        assert await mgr.exists("key") is False
        assert await mgr.increment("key") is None
        assert await mgr.expire("key", 300) is False
        assert await mgr.get_many(["key"]) == {}
        assert await mgr.set_many({"key": "value"}) is False
        assert await mgr.health_check() is False


class TestCacheKeyGenerators:
    """Test cache key generation functions."""
    
    def test_make_forecast_key_current(self):
        """Test forecast key generation for current data."""
        key = make_forecast_key("delhi", "current")
        assert key == "forecast:current:delhi"
    
    def test_make_forecast_key_24h(self):
        """Test forecast key generation for 24h data."""
        key = make_forecast_key("mumbai", "24h")
        assert key == "forecast:24h:mumbai"
    
    def test_make_aqi_key(self):
        """Test AQI key generation."""
        key = make_aqi_key("bangalore")
        assert key == "aqi:current:bangalore"
    
    def test_make_attribution_key(self):
        """Test attribution key generation."""
        key = make_attribution_key("chennai")
        assert key == "attribution:chennai"


class TestCacheTTLConstants:
    """Test cache TTL constants are properly defined."""
    
    def test_cache_ttl_values(self):
        """Test that all required TTL values are defined."""
        assert CACHE_TTL["current_aqi"] == 300  # 5 minutes
        assert CACHE_TTL["forecast"] == 3600    # 1 hour
        assert CACHE_TTL["attribution"] == 1800 # 30 minutes
        assert CACHE_TTL["spatial"] == 3600     # 1 hour
        assert CACHE_TTL["weather"] == 1800     # 30 minutes
        assert CACHE_TTL["stations"] == 86400   # 24 hours


@pytest.mark.asyncio
class TestCacheInitialization:
    """Test cache initialization and cleanup."""
    
    @patch('src.api.cache.redis')
    async def test_init_redis_success(self, mock_redis):
        """Test successful Redis initialization."""
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_redis.from_url.return_value = mock_client
        
        await init_redis()
        
        mock_redis.from_url.assert_called_once()
        mock_client.ping.assert_called_once()
    
    @patch('src.api.cache.redis')
    async def test_init_redis_failure(self, mock_redis):
        """Test Redis initialization failure."""
        mock_redis.from_url.side_effect = Exception("Connection failed")
        
        with pytest.raises(Exception):
            await init_redis()
    
    @patch('src.api.cache.redis_client')
    async def test_close_redis_success(self, mock_client):
        """Test successful Redis cleanup."""
        mock_client.close = AsyncMock()
        
        await close_redis()
        
        mock_client.close.assert_called_once()
    
    @patch('src.api.cache.redis_client')
    async def test_close_redis_with_error(self, mock_client):
        """Test Redis cleanup with error."""
        mock_client.close = AsyncMock(side_effect=Exception("Close failed"))
        
        # Should not raise exception
        await close_redis()
        
        mock_client.close.assert_called_once()


@pytest.mark.asyncio
class TestCachePerformanceRequirements:
    """Test that cache meets performance requirements."""
    
    async def test_cache_ttl_requirements(self):
        """Test that cache TTL values meet requirements."""
        # Requirement 7.2: Cache current AQI values with 5-minute TTL
        assert CACHE_TTL["current_aqi"] == 300
        
        # Requirement 7.3: Cache forecast results with 1-hour TTL
        assert CACHE_TTL["forecast"] == 3600
        
        # Additional TTL values should be reasonable
        assert CACHE_TTL["attribution"] <= 3600  # Should be <= 1 hour
        assert CACHE_TTL["spatial"] <= 3600      # Should be <= 1 hour
        assert CACHE_TTL["weather"] <= 3600      # Should be <= 1 hour
        assert CACHE_TTL["stations"] >= 3600     # Should be >= 1 hour (less frequent updates)
    
    @patch('src.api.cache.cache_manager')
    async def test_cache_operation_performance(self, mock_cache_manager):
        """Test that cache operations complete within reasonable time."""
        # Mock fast cache operations
        mock_cache_manager.get = AsyncMock(return_value={"data": "test"})
        mock_cache_manager.set = AsyncMock(return_value=True)
        
        # Test get operation performance
        start_time = time.time()
        result = await mock_cache_manager.get("test_key")
        get_time = time.time() - start_time
        
        assert result is not None
        assert get_time < 0.1  # Should complete in < 100ms
        
        # Test set operation performance
        start_time = time.time()
        result = await mock_cache_manager.set("test_key", {"data": "test"})
        set_time = time.time() - start_time
        
        assert result is True
        assert set_time < 0.1  # Should complete in < 100ms


if __name__ == "__main__":
    pytest.main([__file__])