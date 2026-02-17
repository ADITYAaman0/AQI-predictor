"""
Run Performance Optimization Script
Executes comprehensive performance tuning for the AQI Predictor system
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.api.database import get_db, init_db
from src.api.cache import cache_manager, init_redis
from src.utils.performance_optimizer import (
    run_performance_optimization,
    performance_monitor,
    DatabaseOptimizer,
    CacheOptimizer,
    MLInferenceOptimizer
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main optimization routine"""
    
    logger.info("AQI Predictor Performance Optimization Tool")
    logger.info("=" * 70)
    
    try:
        # Initialize database connection
        logger.info("Initializing database connection...")
        await init_db()
        logger.info("✓ Database connected")
        
        # Initialize Redis cache
        logger.info("Initializing Redis cache...")
        await init_redis()
        logger.info("✓ Redis connected")
        
        # Get database session
        async for db in get_db():
            # Run comprehensive optimization
            await run_performance_optimization(db, cache_manager)
            break  # Only need one iteration
        
        # Display final statistics
        logger.info("\n" + "=" * 70)
        logger.info("PERFORMANCE OPTIMIZATION RESULTS")
        logger.info("=" * 70)
        
        # API Response Times
        api_stats = performance_monitor.get_statistics('api_response_times')
        if api_stats:
            logger.info("\nAPI Response Times:")
            logger.info(f"  Mean:   {api_stats.get('mean', 0):.2f}ms")
            logger.info(f"  Median: {api_stats.get('median', 0):.2f}ms")
            logger.info(f"  P95:    {api_stats.get('p95', 0):.2f}ms")
            logger.info(f"  P99:    {api_stats.get('p99', 0):.2f}ms")
            logger.info(f"  Target: <500ms (p95)")
            
            if api_stats.get('p95', 0) < 500:
                logger.info("  Status: ✓ MEETING TARGET")
            else:
                logger.info("  Status: ✗ NEEDS IMPROVEMENT")
        
        # Database Query Times
        db_stats = performance_monitor.get_statistics('db_query_times')
        if db_stats:
            logger.info("\nDatabase Query Times:")
            logger.info(f"  Mean:   {db_stats.get('mean', 0):.2f}ms")
            logger.info(f"  Median: {db_stats.get('median', 0):.2f}ms")
            logger.info(f"  P95:    {db_stats.get('p95', 0):.2f}ms")
            logger.info(f"  Target: <100ms (p95)")
            
            if db_stats.get('p95', 0) < 100:
                logger.info("  Status: ✓ MEETING TARGET")
            else:
                logger.info("  Status: ✗ NEEDS IMPROVEMENT")
        
        # ML Inference Times
        ml_stats = performance_monitor.get_statistics('ml_inference_times')
        if ml_stats:
            logger.info("\nML Inference Times:")
            logger.info(f"  Mean:   {ml_stats.get('mean', 0):.2f}ms")
            logger.info(f"  Median: {ml_stats.get('median', 0):.2f}ms")
            logger.info(f"  P95:    {ml_stats.get('p95', 0):.2f}ms")
            logger.info(f"  Target: <200ms (p95)")
            
            if ml_stats.get('p95', 0) < 200:
                logger.info("  Status: ✓ MEETING TARGET")
            else:
                logger.info("  Status: ✗ NEEDS IMPROVEMENT")
        
        # Cache Statistics
        cache_stats = await cache_manager.get_cache_stats()
        if cache_stats and 'error' not in cache_stats:
            logger.info("\nCache Performance:")
            logger.info(f"  Hit Rate:       {cache_stats.get('hit_rate_percent', 0):.2f}%")
            logger.info(f"  Total Hits:     {cache_stats.get('performance', {}).get('keyspace_hits', 0):,}")
            logger.info(f"  Total Misses:   {cache_stats.get('performance', {}).get('keyspace_misses', 0):,}")
            logger.info(f"  Evicted Keys:   {cache_stats.get('performance', {}).get('evicted_keys', 0):,}")
            logger.info(f"  Memory Used:    {cache_stats.get('memory', {}).get('used_memory', 0) / 1024 / 1024:.2f} MB")
            logger.info(f"  Target:         >70% hit rate")
            
            hit_rate = cache_stats.get('hit_rate_percent', 0)
            if hit_rate > 70:
                logger.info("  Status: ✓ MEETING TARGET")
            else:
                logger.info("  Status: ✗ NEEDS IMPROVEMENT")
        
        logger.info("\n" + "=" * 70)
        logger.info("OPTIMIZATION RECOMMENDATIONS")
        logger.info("=" * 70)
        
        recommendations = []
        
        # Check API response times
        if api_stats and api_stats.get('p95', 0) >= 500:
            recommendations.append("• Increase cache TTL for frequently accessed endpoints")
            recommendations.append("• Review slow database queries and add indexes")
            recommendations.append("• Consider implementing response compression")
        
        # Check database performance
        if db_stats and db_stats.get('p95', 0) >= 100:
            recommendations.append("• Run VACUUM ANALYZE on large tables")
            recommendations.append("• Review and optimize slow queries")
            recommendations.append("• Consider increasing database connection pool size")
        
        # Check cache hit rate
        if cache_stats and cache_stats.get('hit_rate_percent', 0) < 70:
            recommendations.append("• Increase cache TTL for stable data")
            recommendations.append("• Implement cache warming for critical data")
            recommendations.append("• Review cache key strategy")
        
        # Check ML inference
        if ml_stats and ml_stats.get('p95', 0) >= 200:
            recommendations.append("• Enable TensorFlow XLA compilation")
            recommendations.append("• Implement model output caching")
            recommendations.append("• Consider model quantization for faster inference")
        
        if recommendations:
            logger.info("\nSuggested Actions:")
            for rec in recommendations:
                logger.info(f"  {rec}")
        else:
            logger.info("\n✓ All performance targets are being met!")
            logger.info("  System is optimally configured.")
        
        logger.info("\n" + "=" * 70)
        logger.info("Optimization complete!")
        logger.info("=" * 70)
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
