"""
Health check endpoints for AQI Predictor API.
Provides system health and status information.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from datetime import datetime, timezone
import logging
import os

from src.api.database import health_check as db_health_check, db_manager
from src.api.cache import cache_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns:
        Basic health status
    """
    return {
        "status": "healthy",
        "service": "AQI Predictor API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check including database and cache status.
    
    Returns:
        Comprehensive health status of all system components
    """
    health_status = {
        "status": "healthy",
        "service": "AQI Predictor API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {}
    }
    
    overall_healthy = True
    
    # Check database health
    try:
        db_healthy = await db_health_check()
        health_status["components"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "type": "TimescaleDB with PostGIS",
            "connection": db_healthy
        }
        if not db_healthy:
            overall_healthy = False
    except Exception as e:
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "type": "TimescaleDB with PostGIS",
            "connection": False,
            "error": str(e)
        }
        overall_healthy = False
    
    # Check cache health
    try:
        cache_healthy = await cache_manager.health_check()
        health_status["components"]["cache"] = {
            "status": "healthy" if cache_healthy else "unhealthy",
            "type": "Redis",
            "connection": cache_healthy
        }
        if not cache_healthy:
            overall_healthy = False
    except Exception as e:
        health_status["components"]["cache"] = {
            "status": "unhealthy",
            "type": "Redis",
            "connection": False,
            "error": str(e)
        }
        overall_healthy = False
    
    # Check environment
    health_status["components"]["environment"] = {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "python_version": "3.13.6"  # Would get from sys.version in real implementation
    }
    
    # Set overall status
    health_status["status"] = "healthy" if overall_healthy else "unhealthy"
    
    return health_status


@router.get("/database")
async def database_health() -> Dict[str, Any]:
    """
    Database-specific health check with detailed information.
    
    Returns:
        Database health status and statistics
    """
    try:
        # Get database health information
        db_health = await db_manager.check_database_health()
        
        # Get table statistics
        table_stats = await db_manager.get_table_stats()
        
        return {
            "status": db_health.get("status", "unknown"),
            "connection": db_health.get("connection", False),
            "extensions": db_health.get("extensions", {}),
            "tables": db_health.get("tables", {}),
            "hypertables": db_health.get("hypertables", []),
            "statistics": table_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Database health check failed: {str(e)}"
        )


@router.get("/cache")
async def cache_health() -> Dict[str, Any]:
    """
    Cache-specific health check.
    
    Returns:
        Cache health status and information
    """
    try:
        cache_healthy = await cache_manager.health_check()
        cache_info = await cache_manager.get_info()
        
        return {
            "status": "healthy" if cache_healthy else "unhealthy",
            "connection": cache_healthy,
            "type": "Redis",
            "info": cache_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Cache health check failed: {str(e)}"
        )


@router.get("/cache/stats")
async def cache_stats() -> Dict[str, Any]:
    """
    Detailed cache statistics for monitoring and performance analysis.
    
    Returns:
        Comprehensive cache statistics including hit rates, memory usage, and performance metrics
    """
    try:
        stats = await cache_manager.get_cache_stats()
        
        if "error" in stats:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to get cache statistics: {stats['error']}"
            )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache stats retrieval failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve cache statistics: {str(e)}"
        )


@router.get("/readiness")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check for Kubernetes/container orchestration.
    
    Returns:
        Service readiness status
    """
    try:
        # Check if all critical components are ready
        db_ready = await db_health_check()
        cache_ready = await cache_manager.health_check()
        
        ready = db_ready and cache_ready
        
        return {
            "ready": ready,
            "components": {
                "database": db_ready,
                "cache": cache_ready
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "ready": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/liveness")
async def liveness_check() -> Dict[str, Any]:
    """
    Liveness check for Kubernetes/container orchestration.
    
    Returns:
        Service liveness status
    """
    # Simple liveness check - if we can respond, we're alive
    return {
        "alive": True,
        "service": "AQI Predictor API",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }