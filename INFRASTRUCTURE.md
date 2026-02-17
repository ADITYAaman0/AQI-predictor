# AQI Predictor Infrastructure Setup

This document describes the production infrastructure foundation for the AQI Predictor system.

## Architecture Overview

The system uses a microservices architecture with the following components:

- **FastAPI Backend**: RESTful API service for air quality predictions
- **TimescaleDB**: Time-series database with PostGIS for geospatial data
- **Redis**: Caching layer and message broker
- **Celery**: Background task processing for data ingestion and ML training
- **Docker**: Containerization for consistent deployment

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Make (optional, for convenience commands)

### Development Setup

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd aqi-predictor
   cp .env.example .env.development
   ```

2. **Start development environment**:
   ```bash
   make setup
   # OR manually:
   docker-compose build
   docker-compose up -d
   ```

3. **Verify services**:
   ```bash
   make health
   # OR visit: http://localhost:8000/health/detailed
   ```

### Service Endpoints

- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **TimescaleDB**: localhost:5432
- **Redis**: localhost:6379

## Services

### FastAPI Backend (`api`)

**Purpose**: RESTful API service providing air quality predictions and data access.

**Key Features**:
- Async request handling with FastAPI
- Database connection pooling
- Redis caching integration
- Rate limiting (1000 requests/hour/user)
- OpenAPI documentation
- Health check endpoints

**Endpoints**:
- `GET /` - Service information
- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive health check
- `GET /api/v1/forecast/current/{location}` - Current AQI data
- `GET /api/v1/forecast/24h/{location}` - 24-hour forecast
- `GET /api/v1/forecast/stations` - Monitoring stations

### TimescaleDB (`timescaledb`)

**Purpose**: Time-series database for storing air quality measurements, weather data, and predictions.

**Key Features**:
- TimescaleDB hypertables for time-series data
- PostGIS extension for geospatial operations
- Automated data retention policies
- Continuous aggregates for performance
- Sample monitoring stations for Delhi

**Tables**:
- `air_quality_measurements` - Raw air quality data
- `weather_data` - Meteorological data
- `predictions` - ML model predictions
- `monitoring_stations` - Station metadata
- `users` - User accounts
- `alert_subscriptions` - Alert preferences

### Redis (`redis`)

**Purpose**: Caching layer and message broker for Celery tasks.

**Key Features**:
- API response caching with TTL
- Session storage
- Celery task queue
- Rate limiting counters
- Persistent storage with AOF

**Cache Keys**:
- `forecast:current:{location}` - Current AQI data (5 min TTL)
- `forecast:24h:{location}` - 24-hour forecasts (1 hour TTL)
- `rate_limit:{client_id}` - Rate limiting counters
- `celery:*` - Task queue data

### Celery Workers (`celery-worker`)

**Purpose**: Background task processing for data ingestion, ML training, and alerts.

**Task Queues**:
- `data_ingestion` - CPCB, weather, and OpenAQ data collection
- `model_training` - ML model retraining
- `predictions` - Forecast generation
- `alerts` - Notification processing

**Scheduled Tasks**:
- Data ingestion: Every 15-30 minutes
- Predictions: Every hour
- Model retraining: Daily at 2 AM
- Alert checks: Every 5 minutes
- Maintenance: Daily at 1 AM

### Celery Beat (`celery-beat`)

**Purpose**: Task scheduler for periodic background jobs.

**Schedule**:
- `ingest-cpcb-data`: Every 15 minutes
- `ingest-weather-data`: Every 30 minutes
- `generate-hourly-predictions`: Every hour
- `check-alert-thresholds`: Every 5 minutes
- `retrain-models`: Daily at 2 AM

## Environment Configuration

### Development (`.env.development`)

- Local database and Redis
- Debug mode enabled
- Mock external API keys
- Verbose logging

### Staging (`.env.staging`)

- Containerized services
- Production-like configuration
- Environment variable injection
- Security headers enabled

### Production

- External managed services (RDS, ElastiCache)
- Load balancing and auto-scaling
- Monitoring and alerting
- Backup and disaster recovery

## Database Schema

### Hypertables (Time-series)

```sql
-- Air quality measurements
CREATE TABLE air_quality_measurements (
    time TIMESTAMPTZ NOT NULL,
    station_id TEXT NOT NULL,
    parameter TEXT NOT NULL,
    value DOUBLE PRECISION,
    location GEOMETRY(POINT, 4326)
);

-- Weather data
CREATE TABLE weather_data (
    time TIMESTAMPTZ NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION
);

-- Predictions
CREATE TABLE predictions (
    time TIMESTAMPTZ NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    forecast_hour INTEGER NOT NULL,
    predicted_value DOUBLE PRECISION,
    confidence_lower DOUBLE PRECISION,
    confidence_upper DOUBLE PRECISION
);
```

### Regular Tables

```sql
-- Monitoring stations
CREATE TABLE monitoring_stations (
    id UUID PRIMARY KEY,
    station_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    city TEXT,
    parameters TEXT[]
);

-- Users and alerts
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE alert_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    threshold_value INTEGER NOT NULL,
    notification_channels TEXT[]
);
```

## Monitoring and Health Checks

### Health Check Endpoints

- `GET /health` - Basic service status
- `GET /health/detailed` - Comprehensive dependency checks
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Monitoring Tasks

- System health checks every 10 minutes
- Database optimization daily
- Performance metrics collection
- Alert delivery monitoring

## Security Features

### API Security

- Rate limiting (1000 requests/hour/user)
- Input validation and sanitization
- Security headers (HSTS, CSP, etc.)
- Request size limits (10MB max)
- CORS configuration

### Database Security

- Connection pooling with authentication
- Prepared statements (SQL injection prevention)
- Role-based access control
- Audit logging

### Container Security

- Non-root user execution
- Minimal base images
- Health checks
- Resource limits

## Deployment

### Development

```bash
make dev
```

### Staging

```bash
make staging
```

### Production (Kubernetes)

```bash
# Build and push images
make prod-build
make prod-push

# Deploy with Kubernetes manifests (to be created in task 14)
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

1. **Database connection failed**:
   ```bash
   docker-compose logs timescaledb
   make db-init
   ```

2. **Redis connection failed**:
   ```bash
   docker-compose logs redis
   docker-compose restart redis
   ```

3. **Celery tasks not processing**:
   ```bash
   docker-compose logs celery-worker
   make celery-monitor
   ```

4. **API not responding**:
   ```bash
   docker-compose logs api
   curl http://localhost:8000/health
   ```

### Useful Commands

```bash
# View all service logs
make logs

# Check service health
make health

# Monitor Celery tasks
make celery-monitor

# Database shell
docker-compose exec timescaledb psql -U aqi_user aqi_predictor

# Redis CLI
docker-compose exec redis redis-cli

# API container shell
make shell
```

## Next Steps

This infrastructure foundation provides:

✅ Docker containerization for all services  
✅ TimescaleDB with PostGIS for data persistence  
✅ Basic FastAPI backend service  
✅ Redis caching layer with HTTP cache headers middleware  
✅ Development and staging environments  

The next tasks will build upon this foundation to implement:

- Database schema and models (Task 2.1)
- Property-based testing (Task 2.2)
- FastAPI service expansion (Task 2.3)
- Authentication and rate limiting (Task 3)
- Data pipeline implementation (Task 4)

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.1**: Docker containerization ✅
- **Requirement 1.2**: Docker Compose configuration ✅
- **Requirement 1.3**: Kubernetes preparation ✅
- **Requirement 2.1**: TimescaleDB setup ✅
- **Requirement 2.2**: PostGIS extension ✅
- **Requirement 7.1**: Redis caching layer ✅