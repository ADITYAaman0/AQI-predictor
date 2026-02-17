# Automated Data Ingestion System - Complete Guide

## Overview

The AQI Predictor system includes a fully automated data ingestion pipeline that continuously collects air quality and weather data from multiple sources. This guide explains how the system works and how to operate it.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTOMATED DATA INGESTION                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CELERY BEAT SCHEDULER                   │
│  • Triggers tasks at scheduled intervals                     │
│  • Manages task timing and coordination                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      REDIS MESSAGE BROKER                    │
│  • Queues tasks for processing                               │
│  • Manages task distribution                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CELERY WORKERS                          │
│  • Execute data ingestion tasks                              │
│  • Handle retries and error recovery                         │
│  • Process tasks from multiple queues                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                            │
│  • CPCB Monitoring Stations                                  │
│  • IMD Weather Stations                                      │
│  • OpenAQ API                                                │
│  • TROPOMI Satellite Data                                    │
│  • VIIRS Satellite Data                                      │
│  • Google Maps Traffic Data                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TIMESCALEDB + POSTGIS                      │
│  • Stores time-series air quality data                       │
│  • Stores weather data                                       │
│  • Stores satellite measurements                             │
└─────────────────────────────────────────────────────────────┘
```

## Automated Ingestion Schedule

The system automatically ingests data from various sources at the following intervals:

### Air Quality Data
- **CPCB Data**: Every 15 minutes
  - Task: `ingest-cpcb-data`
  - Sources: Central Pollution Control Board monitoring stations
  - Parameters: PM2.5, PM10, NO2, SO2, O3, CO
  - Coverage: Delhi, Mumbai, Bangalore, Chennai, Kolkata

- **OpenAQ Data**: Every 20 minutes
  - Task: `ingest-openaq-data`
  - Sources: OpenAQ global air quality database
  - Parameters: PM2.5, PM10, NO2, SO2, O3, CO
  - Coverage: Major Indian cities

### Weather Data
- **IMD Weather Data**: Every 30 minutes
  - Task: `ingest-weather-data`
  - Sources: India Meteorological Department stations (via OpenWeatherMap)
  - Parameters: Temperature, humidity, wind speed/direction, pressure, precipitation
  - Coverage: Major IMD stations across India

### Satellite Data
- **TROPOMI Data**: On-demand (can be scheduled)
  - Task: `ingest-tropomi-data`
  - Sources: Sentinel-5P TROPOMI satellite
  - Parameters: NO2, SO2, CO, aerosol index
  - Coverage: India bounding box

- **VIIRS Data**: On-demand (can be scheduled)
  - Task: `ingest-viirs-data`
  - Sources: Suomi NPP VIIRS satellite
  - Parameters: Aerosol optical depth, fire radiative power
  - Coverage: India bounding box

### Traffic Data
- **Google Maps Traffic**: On-demand (can be scheduled)
  - Task: `ingest-traffic-data`
  - Sources: Google Maps API
  - Parameters: Traffic density, congestion levels
  - Coverage: Major urban areas

## Starting the Automated Ingestion System

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services including automated ingestion
docker-compose up -d

# Or start only the ingestion components
docker-compose up -d redis celery_worker celery_beat

# View logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat
```

### Option 2: Manual Startup

```bash
# 1. Ensure Redis is running
redis-server

# 2. Start Celery worker (in one terminal)
celery -A src.tasks.celery_app worker --loglevel=info --concurrency=4

# 3. Start Celery beat scheduler (in another terminal)
celery -A src.tasks.celery_app beat --loglevel=info

# 4. (Optional) Start Flower for monitoring
celery -A src.tasks.celery_app flower --port=5555
```

### Option 3: Development Mode

```bash
# Start with auto-reload for development
celery -A src.tasks.celery_app worker --loglevel=debug --concurrency=2 --autoreload

# Start beat with debug logging
celery -A src.tasks.celery_app beat --loglevel=debug
```

## Verifying the System

Run the verification script to check that everything is configured correctly:

```bash
python scripts/verify_automated_ingestion.py
```

This will verify:
- ✓ Celery configuration
- ✓ Registered tasks
- ✓ Beat schedule
- ✓ Task queues
- ✓ Retry configuration
- ✓ Monitoring setup

## Monitoring Automated Ingestion

### Using Flower (Web UI)

```bash
# Start Flower
celery -A src.tasks.celery_app flower --port=5555

# Access at http://localhost:5555
```

Flower provides:
- Real-time task monitoring
- Task history and statistics
- Worker status and performance
- Task retry and failure tracking

### Using Celery Inspect Commands

```bash
# Check active tasks
celery -A src.tasks.celery_app inspect active

# Check scheduled tasks
celery -A src.tasks.celery_app inspect scheduled

# Check registered tasks
celery -A src.tasks.celery_app inspect registered

# Check worker stats
celery -A src.tasks.celery_app inspect stats

# Check task queues
celery -A src.tasks.celery_app inspect active_queues
```

### Viewing Logs

```bash
# Docker logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat

# Or if running manually, check the terminal output
```

## Manual Task Triggering

You can manually trigger any ingestion task for testing or immediate data collection:

### Using Python

```python
from src.tasks.data_ingestion import (
    ingest_cpcb_data,
    ingest_weather_data,
    ingest_openaq_data,
    ingest_satellite_data,
    ingest_all_sources
)

# Trigger CPCB data ingestion
result = ingest_cpcb_data.delay()
print(f"Task ID: {result.id}")
print(f"Status: {result.status}")

# Trigger comprehensive ingestion from all sources
result = ingest_all_sources.delay()
print(f"Task ID: {result.id}")

# Wait for result
result.wait(timeout=300)  # Wait up to 5 minutes
print(f"Result: {result.result}")
```

### Using Celery CLI

```bash
# Trigger CPCB data ingestion
celery -A src.tasks.celery_app call src.tasks.data_ingestion.ingest_cpcb_data

# Trigger weather data ingestion
celery -A src.tasks.celery_app call src.tasks.data_ingestion.ingest_weather_data

# Trigger comprehensive ingestion
celery -A src.tasks.celery_app call src.tasks.data_ingestion.ingest_all_sources
```

## Task Queues

The system uses multiple queues for task organization:

- **data_ingestion**: All data ingestion tasks
- **model_training**: Model training and retraining tasks
- **predictions**: Prediction generation tasks
- **alerts**: Alert checking and notification tasks
- **maintenance**: Data cleanup and maintenance tasks
- **monitoring**: System monitoring tasks

## Error Handling and Retries

The automated ingestion system includes robust error handling:

### Retry Configuration
- **Max Retries**: 3 attempts
- **Retry Delay**: Exponential backoff (60s, 120s, 240s)
- **Task Timeout**: 30 minutes
- **Soft Timeout**: 25 minutes

### Graceful Degradation
- If a data source fails, the system continues with other sources
- Failed tasks are automatically retried with exponential backoff
- Circuit breaker pattern prevents repeated failures
- Fallback to simulated data when real-time data is unavailable

### Error Notifications
- Task failures are logged with full stack traces
- Failed tasks can trigger alerts (if configured)
- Task monitor tracks failure rates and patterns

## Data Quality Validation

All ingested data goes through quality validation:

1. **Outlier Detection**: Values beyond 3 standard deviations are flagged
2. **Missing Data Handling**: Spatial/temporal imputation for gaps
3. **Quality Flags**: Each data point is tagged with quality status
4. **Data Lineage**: Full tracking of data source and processing

## Performance Optimization

### Caching
- Redis caches frequently accessed data
- API responses cached with appropriate TTL
- Reduces load on external APIs

### Batch Processing
- Data points are batched for efficient database insertion
- Reduces database connection overhead
- Improves overall throughput

### Concurrent Processing
- Multiple workers process tasks in parallel
- Configurable concurrency level
- Scales horizontally with additional workers

## Troubleshooting

### Workers Not Starting

```bash
# Check Redis connection
redis-cli ping

# Check Celery configuration
python -c "from src.tasks.celery_app import celery_app; print(celery_app.conf.broker_url)"

# Check for port conflicts
netstat -an | grep 6379  # Redis port
```

### Tasks Not Executing

```bash
# Check if beat scheduler is running
celery -A src.tasks.celery_app inspect scheduled

# Check worker status
celery -A src.tasks.celery_app inspect active

# Check task registration
celery -A src.tasks.celery_app inspect registered
```

### High Failure Rate

```bash
# Check task failures
celery -A src.tasks.celery_app events

# Review logs for errors
docker-compose logs celery_worker | grep ERROR

# Check external API status
python scripts/test_api_keys.py
```

### Database Connection Issues

```bash
# Check database connectivity
python -c "from src.api.database import engine; engine.connect()"

# Check TimescaleDB status
docker-compose ps timescaledb

# Review database logs
docker-compose logs timescaledb
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/aqi_predictor

# API Keys (optional, system works without them)
CPCB_API_KEY=your_cpcb_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Customizing Schedule

Edit `src/tasks/celery_app.py` to modify the beat schedule:

```python
beat_schedule={
    "ingest-cpcb-data": {
        "task": "src.tasks.data_ingestion.ingest_cpcb_data",
        "schedule": crontab(minute="*/15"),  # Change interval here
    },
    # ... other schedules
}
```

## Production Deployment

### Scaling Workers

```bash
# Increase worker concurrency
celery -A src.tasks.celery_app worker --concurrency=8

# Run multiple worker instances
celery -A src.tasks.celery_app worker --hostname=worker1@%h
celery -A src.tasks.celery_app worker --hostname=worker2@%h
```

### High Availability

- Run multiple worker instances across different servers
- Use Redis Sentinel for broker high availability
- Configure database connection pooling
- Implement health checks and auto-restart

### Monitoring in Production

- Use Prometheus for metrics collection
- Set up Grafana dashboards for visualization
- Configure alerting for task failures
- Monitor queue lengths and processing times

## API Integration

The automated ingestion system can be monitored and controlled via API:

```python
# Check ingestion status
GET /api/v1/tasks/status

# Trigger manual ingestion
POST /api/v1/tasks/ingest
{
  "source": "cpcb",
  "immediate": true
}

# Get ingestion statistics
GET /api/v1/tasks/stats
```

## Summary

The automated data ingestion system is **fully implemented and operational**. It provides:

✓ **Continuous Data Collection**: Automatic ingestion every 15-30 minutes
✓ **Multiple Data Sources**: CPCB, IMD, OpenAQ, satellite, traffic
✓ **Robust Error Handling**: Automatic retries with exponential backoff
✓ **Quality Validation**: Outlier detection and data quality flags
✓ **Scalable Architecture**: Horizontal scaling with multiple workers
✓ **Comprehensive Monitoring**: Flower UI, logs, and metrics
✓ **Production Ready**: Docker deployment with health checks

The system is ready for production use and requires minimal manual intervention once started.
