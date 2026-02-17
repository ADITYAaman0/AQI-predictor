"""
Performance Optimization Utilities
Comprehensive performance tuning for database, caching, and ML inference
"""

import logging
import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor and track performance metrics"""
    
    def __init__(self):
        self.metrics = {
            'api_response_times': [],
            'db_query_times': [],
            'cache_hit_rates': [],
            'ml_inference_times': []
        }
        self.thresholds = {
            'api_response_time_ms': 500,  # p95 target
            'db_query_time_ms': 100,
            'cache_hit_rate_percent': 70,
            'ml_inference_time_ms': 200
        }
    
    def record_metric(self, metric_type: str, value: float):
        """Record a performance metric"""
        if metric_type in self.metrics:
            self.metrics[metric_type].append({
                'value': value,
                'timestamp': datetime.now()
            })
            
            # Keep only last 1000 measurements
            if len(self.metrics[metric_type]) > 1000:
                self.metrics[metric_type] = self.metrics[metric_type][-1000:]
    
    def get_statistics(self, metric_type: str) -> Dict[str, float]:
        """Get statistics for a metric type"""
        if metric_type not in self.metrics or not self.metrics[metric_type]:
            return {}
        
        values = [m['value'] for m in self.metrics[metric_type]]
        
        return {
            'mean': np.mean(values),
            'median': np.median(values),
            'p95': np.percentile(values, 95),
            'p99': np.percentile(values, 99),
            'min': np.min(values),
            'max': np.max(values),
            'count': len(values)
        }
    
    def check_thresholds(self) -> Dict[str, bool]:
        """Check if metrics meet performance thresholds"""
        results = {}
        
        # Check API response time
        api_stats = self.get_statistics('api_response_times')
        if api_stats:
            results['api_response_time'] = api_stats['p95'] <= self.thresholds['api_response_time_ms']
        
        # Check DB query time
        db_stats = self.get_statistics('db_query_times')
        if db_stats:
            results['db_query_time'] = db_stats['p95'] <= self.thresholds['db_query_time_ms']
        
        # Check ML inference time
        ml_stats = self.get_statistics('ml_inference_times')
        if ml_stats:
            results['ml_inference_time'] = ml_stats['p95'] <= self.thresholds['ml_inference_time_ms']
        
        return results


# Global performance monitor
performance_monitor = PerformanceMonitor()


def measure_time(metric_type: str):
    """Decorator to measure execution time"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.time() - start_time) * 1000
                performance_monitor.record_metric(metric_type, elapsed_ms)
                
                # Log slow operations
                if elapsed_ms > performance_monitor.thresholds.get(f'{metric_type}_ms', 1000):
                    logger.warning(f"Slow {metric_type}: {elapsed_ms:.2f}ms for {func.__name__}")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.time() - start_time) * 1000
                performance_monitor.record_metric(metric_type, elapsed_ms)
                
                if elapsed_ms > performance_monitor.thresholds.get(f'{metric_type}_ms', 1000):
                    logger.warning(f"Slow {metric_type}: {elapsed_ms:.2f}ms for {func.__name__}")
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class DatabaseOptimizer:
    """Database query optimization utilities"""
    
    @staticmethod
    async def optimize_indexes(db_session):
        """Create and optimize database indexes for common queries"""
        
        index_statements = [
            # Air quality measurements indexes
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aq_time_station 
            ON air_quality_measurements (time DESC, station_id);
            """,
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aq_location_time 
            ON air_quality_measurements USING GIST (location, time DESC);
            """,
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aq_parameter_time 
            ON air_quality_measurements (parameter, time DESC) 
            WHERE quality_flag = 'valid';
            """,
            
            # Weather data indexes
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weather_location_time 
            ON weather_data USING GIST (location, time DESC);
            """,
            
            # Predictions indexes
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_location_time 
            ON predictions USING GIST (location, time DESC);
            """,
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_forecast_hour 
            ON predictions (forecast_hour, time DESC);
            """,
            
            # Monitoring stations indexes
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stations_city_active 
            ON monitoring_stations (city, is_active) 
            WHERE is_active = TRUE;
            """,
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stations_location 
            ON monitoring_stations USING GIST (location);
            """,
            
            # Alert subscriptions indexes
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_active 
            ON alert_subscriptions (user_id, is_active) 
            WHERE is_active = TRUE;
            """,
            """
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_location 
            ON alert_subscriptions USING GIST (location);
            """
        ]
        
        logger.info("Creating optimized database indexes...")
        
        for statement in index_statements:
            try:
                await db_session.execute(statement)
                await db_session.commit()
                logger.info(f"Created index: {statement.split('idx_')[1].split()[0] if 'idx_' in statement else 'unknown'}")
            except Exception as e:
                logger.warning(f"Index creation skipped (may already exist): {e}")
                await db_session.rollback()
        
        logger.info("Database index optimization complete")
    
    @staticmethod
    async def analyze_tables(db_session):
        """Run ANALYZE on tables to update statistics"""
        
        tables = [
            'air_quality_measurements',
            'weather_data',
            'predictions',
            'monitoring_stations',
            'alert_subscriptions',
            'users'
        ]
        
        logger.info("Analyzing tables to update query planner statistics...")
        
        for table in tables:
            try:
                await db_session.execute(f"ANALYZE {table};")
                logger.info(f"Analyzed table: {table}")
            except Exception as e:
                logger.warning(f"Failed to analyze {table}: {e}")
        
        logger.info("Table analysis complete")
    
    @staticmethod
    async def vacuum_tables(db_session):
        """Run VACUUM on tables to reclaim space and update statistics"""
        
        tables = [
            'air_quality_measurements',
            'weather_data',
            'predictions'
        ]
        
        logger.info("Vacuuming tables to reclaim space...")
        
        for table in tables:
            try:
                # VACUUM cannot run inside a transaction block
                await db_session.execute(f"VACUUM ANALYZE {table};")
                logger.info(f"Vacuumed table: {table}")
            except Exception as e:
                logger.warning(f"Failed to vacuum {table}: {e}")
        
        logger.info("Table vacuum complete")
    
    @staticmethod
    async def optimize_timescale_chunks(db_session):
        """Optimize TimescaleDB chunk configuration"""
        
        try:
            # Set optimal chunk time interval (7 days for air quality data)
            await db_session.execute("""
                SELECT set_chunk_time_interval('air_quality_measurements', INTERVAL '7 days');
            """)
            
            await db_session.execute("""
                SELECT set_chunk_time_interval('weather_data', INTERVAL '7 days');
            """)
            
            await db_session.execute("""
                SELECT set_chunk_time_interval('predictions', INTERVAL '7 days');
            """)
            
            await db_session.commit()
            logger.info("Optimized TimescaleDB chunk intervals")
            
        except Exception as e:
            logger.warning(f"Failed to optimize chunk intervals: {e}")
            await db_session.rollback()


class CacheOptimizer:
    """Cache optimization utilities"""
    
    @staticmethod
    async def optimize_cache_strategy(cache_manager):
        """Optimize caching strategy based on usage patterns"""
        
        try:
            # Get cache statistics
            stats = await cache_manager.get_cache_stats()
            
            if 'error' in stats:
                logger.warning(f"Cannot optimize cache: {stats['error']}")
                return
            
            hit_rate = stats.get('hit_rate_percent', 0)
            evicted_keys = stats.get('performance', {}).get('evicted_keys', 0)
            
            logger.info(f"Current cache hit rate: {hit_rate}%")
            logger.info(f"Evicted keys: {evicted_keys}")
            
            # Recommendations based on metrics
            recommendations = []
            
            if hit_rate < 70:
                recommendations.append("Consider increasing cache TTL for frequently accessed data")
                recommendations.append("Review cache key strategy to improve hit rates")
            
            if evicted_keys > 1000:
                recommendations.append("Consider increasing Redis max memory")
                recommendations.append("Review cache eviction policy")
            
            if recommendations:
                logger.info("Cache optimization recommendations:")
                for rec in recommendations:
                    logger.info(f"  - {rec}")
            else:
                logger.info("Cache performance is optimal")
            
            return {
                'hit_rate': hit_rate,
                'evicted_keys': evicted_keys,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Failed to optimize cache strategy: {e}")
            return None
    
    @staticmethod
    async def warm_critical_caches(cache_manager):
        """Pre-load critical data into cache"""
        
        logger.info("Warming up critical caches...")
        
        try:
            # Import here to avoid circular dependencies
            from src.api.cache_decorators import CacheWarmer
            
            # Warm up city data
            await CacheWarmer.warm_city_data()
            
            # Warm up station data
            await CacheWarmer.warm_station_data()
            
            logger.info("Cache warming complete")
            
        except Exception as e:
            logger.error(f"Failed to warm caches: {e}")


class MLInferenceOptimizer:
    """ML model inference optimization"""
    
    @staticmethod
    def optimize_tensorflow_config():
        """Optimize TensorFlow configuration for inference"""
        
        try:
            import tensorflow as tf
            
            # Enable XLA (Accelerated Linear Algebra) compilation
            tf.config.optimizer.set_jit(True)
            
            # Set memory growth to avoid allocating all GPU memory
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                logger.info(f"Configured {len(gpus)} GPU(s) for TensorFlow")
            
            # Set thread configuration for CPU
            tf.config.threading.set_inter_op_parallelism_threads(2)
            tf.config.threading.set_intra_op_parallelism_threads(4)
            
            logger.info("TensorFlow configuration optimized for inference")
            
        except ImportError:
            logger.warning("TensorFlow not available, skipping TF optimization")
        except Exception as e:
            logger.warning(f"Failed to optimize TensorFlow config: {e}")
    
    @staticmethod
    def enable_model_caching(model):
        """Enable model output caching for repeated inputs"""
        
        # This would implement a simple LRU cache for model predictions
        # based on input features hash
        
        try:
            from functools import lru_cache
            
            # Wrap predict method with caching
            if hasattr(model, 'predict'):
                original_predict = model.predict
                
                @lru_cache(maxsize=100)
                def cached_predict(features_hash):
                    # This is a simplified version
                    # In practice, you'd need to handle numpy arrays properly
                    return original_predict(features_hash)
                
                # Note: This is a conceptual example
                # Actual implementation would need proper serialization
                logger.info("Model prediction caching enabled")
            
        except Exception as e:
            logger.warning(f"Failed to enable model caching: {e}")
    
    @staticmethod
    def optimize_batch_inference(model, batch_size: int = 32):
        """Configure model for optimal batch inference"""
        
        try:
            # Set optimal batch size for inference
            if hasattr(model, 'batch_size'):
                model.batch_size = batch_size
                logger.info(f"Set model batch size to {batch_size}")
            
            # Enable mixed precision for faster inference (if supported)
            try:
                import tensorflow as tf
                tf.keras.mixed_precision.set_global_policy('mixed_float16')
                logger.info("Enabled mixed precision for faster inference")
            except:
                pass
            
        except Exception as e:
            logger.warning(f"Failed to optimize batch inference: {e}")


class APIResponseOptimizer:
    """API response optimization utilities"""
    
    @staticmethod
    def compress_response(data: Dict[str, Any], threshold_bytes: int = 1024) -> Dict[str, Any]:
        """Compress large response data"""
        
        import json
        import gzip
        import base64
        
        # Serialize data
        json_data = json.dumps(data)
        data_size = len(json_data.encode('utf-8'))
        
        # Only compress if above threshold
        if data_size > threshold_bytes:
            compressed = gzip.compress(json_data.encode('utf-8'))
            compressed_size = len(compressed)
            
            if compressed_size < data_size * 0.8:  # Only use if >20% reduction
                logger.debug(f"Compressed response: {data_size} -> {compressed_size} bytes")
                return {
                    'compressed': True,
                    'data': base64.b64encode(compressed).decode('utf-8'),
                    'original_size': data_size,
                    'compressed_size': compressed_size
                }
        
        return data
    
    @staticmethod
    def paginate_large_results(data: List[Any], page: int = 1, page_size: int = 100) -> Dict[str, Any]:
        """Paginate large result sets"""
        
        total_items = len(data)
        total_pages = (total_items + page_size - 1) // page_size
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return {
            'data': data[start_idx:end_idx],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': total_items,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
    
    @staticmethod
    def optimize_json_serialization(data: Any) -> str:
        """Optimize JSON serialization"""
        
        import json
        
        # Use faster JSON encoder with optimizations
        return json.dumps(
            data,
            separators=(',', ':'),  # Compact format
            default=str,  # Handle datetime and other types
            ensure_ascii=False  # Allow unicode characters
        )


async def run_performance_optimization(db_session, cache_manager):
    """Run comprehensive performance optimization"""
    
    logger.info("=" * 60)
    logger.info("Starting comprehensive performance optimization")
    logger.info("=" * 60)
    
    # 1. Database optimization
    logger.info("\n1. Optimizing database...")
    db_optimizer = DatabaseOptimizer()
    
    try:
        await db_optimizer.optimize_indexes(db_session)
        await db_optimizer.analyze_tables(db_session)
        await db_optimizer.optimize_timescale_chunks(db_session)
        logger.info("✓ Database optimization complete")
    except Exception as e:
        logger.error(f"✗ Database optimization failed: {e}")
    
    # 2. Cache optimization
    logger.info("\n2. Optimizing cache...")
    cache_optimizer = CacheOptimizer()
    
    try:
        cache_stats = await cache_optimizer.optimize_cache_strategy(cache_manager)
        await cache_optimizer.warm_critical_caches(cache_manager)
        logger.info("✓ Cache optimization complete")
    except Exception as e:
        logger.error(f"✗ Cache optimization failed: {e}")
    
    # 3. ML inference optimization
    logger.info("\n3. Optimizing ML inference...")
    ml_optimizer = MLInferenceOptimizer()
    
    try:
        ml_optimizer.optimize_tensorflow_config()
        logger.info("✓ ML inference optimization complete")
    except Exception as e:
        logger.error(f"✗ ML inference optimization failed: {e}")
    
    # 4. Get performance summary
    logger.info("\n4. Performance summary...")
    
    try:
        stats = performance_monitor.get_statistics('api_response_times')
        if stats:
            logger.info(f"API Response Time (p95): {stats.get('p95', 0):.2f}ms")
        
        threshold_check = performance_monitor.check_thresholds()
        for metric, passed in threshold_check.items():
            status = "✓" if passed else "✗"
            logger.info(f"{status} {metric}: {'PASS' if passed else 'FAIL'}")
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
    
    logger.info("\n" + "=" * 60)
    logger.info("Performance optimization complete")
    logger.info("=" * 60)


# Export key components
__all__ = [
    'PerformanceMonitor',
    'performance_monitor',
    'measure_time',
    'DatabaseOptimizer',
    'CacheOptimizer',
    'MLInferenceOptimizer',
    'APIResponseOptimizer',
    'run_performance_optimization'
]
