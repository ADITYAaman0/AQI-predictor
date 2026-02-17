"""
FastAPI main application for AQI Predictor backend service.
Provides RESTful API endpoints for air quality predictions and data access.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging
import os
from typing import Dict, Any

from src.api.database import init_db, close_db
from src.api.cache import init_redis, close_redis
from src.api.routers import health, forecast, data, auth, api_keys, tasks, attribution, alerts, models, ab_testing, monitoring, automated_retraining, lineage, cities, devices
from src.api import websocket
from src.api.middleware import (
    LoggingMiddleware, EnhancedRateLimitMiddleware, SecurityHeadersMiddleware,
    RequestValidationMiddleware, HTTPSRedirectMiddleware, ErrorHandlingMiddleware,
    RequestIDMiddleware, CacheHeadersMiddleware
)
from src.api.ab_testing_middleware import ABTestingMiddleware
from src.api.monitoring import PerformanceMiddleware, get_performance_monitor
from src.api.prometheus_metrics import metrics_endpoint, get_metrics_collector

# Configure logging (before tracing imports)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import tracing (optional dependency)
try:
    from src.api.tracing import setup_tracing, instrument_fastapi, instrument_libraries
    TRACING_AVAILABLE = True
except ImportError:
    TRACING_AVAILABLE = False
    logger.warning("OpenTelemetry not available - tracing disabled")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info("Starting AQI Predictor API service...")
    
    # Initialize OpenTelemetry tracing
    otlp_endpoint = os.getenv("OTLP_ENDPOINT")
    if otlp_endpoint and TRACING_AVAILABLE:
        setup_tracing(
            service_name="aqi-predictor-api",
            service_version="1.0.0",
            otlp_endpoint=otlp_endpoint
        )
        instrument_libraries()
        logger.info("OpenTelemetry tracing initialized")
    
    # Initialize database connection
    await init_db()
    logger.info("Database connection initialized")
    
    # Initialize Redis connection
    await init_redis()
    logger.info("Redis connection initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AQI Predictor API service...")
    await close_redis()
    await close_db()
    logger.info("Connections closed")

# Create FastAPI application
app = FastAPI(
    title="AQI Predictor API",
    description="Production-ready API for air quality predictions and monitoring",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Instrument FastAPI with OpenTelemetry
if os.getenv("OTLP_ENDPOINT") and TRACING_AVAILABLE:
    instrument_fastapi(app)

# Add middleware (order matters - first added is outermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure appropriately for production
)

# Security and request processing middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(CacheHeadersMiddleware)
app.add_middleware(ABTestingMiddleware, enabled=os.getenv("AB_TESTING_ENABLED", "true").lower() == "true")
app.add_middleware(PerformanceMiddleware, monitor=get_performance_monitor())
app.add_middleware(HTTPSRedirectMiddleware, enforce_https=os.getenv("ENFORCE_HTTPS", "false").lower() == "true")
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestValidationMiddleware)
app.add_middleware(EnhancedRateLimitMiddleware, 
                  requests_per_hour=int(os.getenv("RATE_LIMIT_ANONYMOUS", "1000")),
                  authenticated_requests_per_hour=int(os.getenv("RATE_LIMIT_AUTHENTICATED", "5000")))
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(api_keys.router, prefix="/api/v1/api-keys", tags=["api-keys"])
app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["forecast"])
app.include_router(data.router, prefix="/api/v1/data", tags=["data"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["alerts"])
app.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
app.include_router(attribution.router, prefix="/api/v1/attribution", tags=["attribution"])
app.include_router(cities.router, tags=["cities"])
app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(automated_retraining.router, prefix="/api/v1", tags=["automated-retraining"])
app.include_router(ab_testing.router, prefix="/api/v1", tags=["ab-testing"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])
app.include_router(lineage.router, prefix="/api/v1", tags=["lineage"])
app.include_router(websocket.router, tags=["websocket"])

# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return await metrics_endpoint()

@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint providing API information."""
    return {
        "service": "AQI Predictor API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/info")
async def info() -> Dict[str, Any]:
    """Service information endpoint."""
    return {
        "service": "AQI Predictor API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database": "TimescaleDB with PostGIS",
        "cache": "Redis",
        "features": [
            "Air Quality Forecasting",
            "Source Attribution",
            "Spatial Predictions",
            "Real-time Monitoring",
            "Task Management",
            "Policy Simulation",
            "A/B Testing Framework",
            "Performance Monitoring",
            "Data Lineage Tracking",
            "Audit Logging",
            "Multi-City Support"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )