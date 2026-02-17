"""
Redis caching layer for AQI Predictor API.
Provides caching functionality for frequently accessed data.
"""

import os
import json
import logging
from typing import Any, Optional, Union
import redis.asyncio as redis
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Global Redis connection
redis_client: Optional[redis.Redis] = None

async def init_redis() -> None:
    """Initialize Redis connection with optimized settings."""
    global redis_client
    try:
        redis_client = redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
            max_connections=50,  # Connection pool size
            socket_keepalive=True,  # Keep connections alive
            socket_keepalive_options={
                1: 1,  # TCP_KEEPIDLE
                2: 1,  # TCP_KEEPINTVL
                3: 3,  # TCP_KEEPCNT
            }
        )
        
        # Test connection
        await redis_client.ping()
        
        # Configure Redis for optimal performance
        try:
            # Set maxmemory policy to evict least recently used keys
            await redis_client.config_set('maxmemory-policy', 'allkeys-lru')
            
            # Enable lazy freeing for better performance
            await redis_client.config_set('lazyfree-lazy-eviction', 'yes')
            await redis_client.config_set('lazyfree-lazy-expire', 'yes')
            
            logger.info("Redis connection established with optimized configuration")
        except Exception as config_error:
            logger.warning(f"Could not set Redis config (may need admin privileges): {config_error}")
            logger.info("Redis connection established successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        redis_client = None
        raise

async def close_redis() -> None:
    """Close Redis connection."""
    global redis_client
    if redis_client:
        try:
            await redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

async def health_check() -> bool:
    """Check Redis health for health endpoints."""
    if not redis_client:
        return False
    
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False

class CacheManager:
    """Redis cache manager with common caching operations."""
    
    def __init__(self):
        self.client = redis_client
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.client:
            return None
        
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[Union[int, timedelta]] = None
    ) -> bool:
        """Set value in cache with optional TTL."""
        if not self.client:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            if ttl:
                if isinstance(ttl, timedelta):
                    ttl = int(ttl.total_seconds())
                await self.client.setex(key, ttl, serialized_value)
            else:
                await self.client.set(key, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.client:
            return False
        
        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self.client:
            return False
        
        try:
            result = await self.client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache."""
        if not self.client:
            return None
        
        try:
            result = await self.client.incrby(key, amount)
            return result
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return None
    
    async def expire(self, key: str, ttl: Union[int, timedelta]) -> bool:
        """Set expiration time for key."""
        if not self.client:
            return False
        
        try:
            if isinstance(ttl, timedelta):
                ttl = int(ttl.total_seconds())
            result = await self.client.expire(key, ttl)
            return result
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            return False
    
    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Get multiple values from cache."""
        if not self.client or not keys:
            return {}
        
        try:
            values = await self.client.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value:
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        result[key] = value
            return result
        except Exception as e:
            logger.error(f"Cache get_many error: {e}")
            return {}
    
    async def set_many(
        self, 
        mapping: dict[str, Any], 
        ttl: Optional[Union[int, timedelta]] = None
    ) -> bool:
        """Set multiple values in cache."""
        if not self.client or not mapping:
            return False
        
        try:
            # Serialize all values
            serialized_mapping = {
                key: json.dumps(value, default=str) 
                for key, value in mapping.items()
            }
            
            # Set all values
            await self.client.mset(serialized_mapping)
            
            # Set TTL if specified
            if ttl:
                if isinstance(ttl, timedelta):
                    ttl = int(ttl.total_seconds())
                for key in mapping.keys():
                    await self.client.expire(key, ttl)
            
            return True
        except Exception as e:
            logger.error(f"Cache set_many error: {e}")
            return False
    
    async def health_check(self) -> bool:
        """Check cache health."""
        if not self.client:
            return False
        
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return False
    
    async def get_info(self) -> dict:
        """Get cache information."""
        if not self.client:
            return {}
        
        try:
            info = await self.client.info()
            
            # Calculate hit rate
            hits = info.get("keyspace_hits", 0)
            misses = info.get("keyspace_misses", 0)
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "redis_version": info.get("redis_version", "unknown"),
                "used_memory": info.get("used_memory_human", "unknown"),
                "used_memory_bytes": info.get("used_memory", 0),
                "max_memory": info.get("maxmemory_human", "unknown"),
                "max_memory_bytes": info.get("maxmemory", 0),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": hits,
                "keyspace_misses": misses,
                "hit_rate_percent": round(hit_rate, 2),
                "uptime_seconds": info.get("uptime_in_seconds", 0),
                "role": info.get("role", "unknown"),
                "connected_slaves": info.get("connected_slaves", 0),
                "evicted_keys": info.get("evicted_keys", 0),
                "expired_keys": info.get("expired_keys", 0)
            }
        except Exception as e:
            logger.error(f"Cache info error: {e}")
            return {"error": str(e)}
    
    async def get_cache_stats(self) -> dict:
        """Get detailed cache statistics for monitoring."""
        if not self.client:
            return {"error": "Redis client not available"}
        
        try:
            info = await self.client.info()
            
            # Get memory usage breakdown
            memory_stats = {
                "used_memory": info.get("used_memory", 0),
                "used_memory_rss": info.get("used_memory_rss", 0),
                "used_memory_peak": info.get("used_memory_peak", 0),
                "used_memory_lua": info.get("used_memory_lua", 0),
                "mem_fragmentation_ratio": info.get("mem_fragmentation_ratio", 0)
            }
            
            # Get performance stats
            perf_stats = {
                "total_commands_processed": info.get("total_commands_processed", 0),
                "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "evicted_keys": info.get("evicted_keys", 0),
                "expired_keys": info.get("expired_keys", 0)
            }
            
            # Calculate derived metrics
            hits = perf_stats["keyspace_hits"]
            misses = perf_stats["keyspace_misses"]
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0
            
            # Get connection stats
            connection_stats = {
                "connected_clients": info.get("connected_clients", 0),
                "client_recent_max_input_buffer": info.get("client_recent_max_input_buffer", 0),
                "client_recent_max_output_buffer": info.get("client_recent_max_output_buffer", 0),
                "blocked_clients": info.get("blocked_clients", 0)
            }
            
            # Get persistence stats
            persistence_stats = {
                "rdb_changes_since_last_save": info.get("rdb_changes_since_last_save", 0),
                "rdb_last_save_time": info.get("rdb_last_save_time", 0),
                "aof_enabled": info.get("aof_enabled", 0),
                "aof_rewrite_in_progress": info.get("aof_rewrite_in_progress", 0)
            }
            
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "uptime_seconds": info.get("uptime_in_seconds", 0),
                "hit_rate_percent": round(hit_rate, 2),
                "memory": memory_stats,
                "performance": perf_stats,
                "connections": connection_stats,
                "persistence": persistence_stats,
                "server": {
                    "redis_version": info.get("redis_version", "unknown"),
                    "redis_mode": info.get("redis_mode", "unknown"),
                    "os": info.get("os", "unknown"),
                    "arch_bits": info.get("arch_bits", "unknown"),
                    "tcp_port": info.get("tcp_port", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}

# Global cache manager instance
cache_manager = CacheManager()

# Cache key generators
def make_forecast_key(location: str, forecast_type: str = "current") -> str:
    """Generate cache key for forecast data."""
    return f"forecast:{forecast_type}:{location}"

def make_aqi_key(location: str) -> str:
    """Generate cache key for current AQI data."""
    return f"aqi:current:{location}"

def make_attribution_key(location: str) -> str:
    """Generate cache key for source attribution data."""
    return f"attribution:{location}"

def make_spatial_key(bounds: str, resolution: float) -> str:
    """Generate cache key for spatial predictions."""
    return f"spatial:{bounds}:{resolution}"

# Cache TTL constants (in seconds) - OPTIMIZED FOR PERFORMANCE
CACHE_TTL = {
    "current_aqi": 180,      # 3 minutes (reduced from 5 for fresher data)
    "forecast": 1800,        # 30 minutes (reduced from 1 hour for better accuracy)
    "attribution": 1800,     # 30 minutes
    "spatial": 1800,         # 30 minutes (reduced from 1 hour)
    "weather": 900,          # 15 minutes (reduced from 30 for fresher data)
    "stations": 86400,       # 24 hours (static data)
    "city_config": 86400,    # 24 hours (static data)
    "user_profile": 3600,    # 1 hour
    "api_response": 300,     # 5 minutes (general API responses)
}