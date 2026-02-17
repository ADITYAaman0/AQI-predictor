# Automated Data Ingestion Scripts

This directory contains scripts for managing the automated data ingestion system.

## Quick Start Scripts

### Windows
```bash
# Start the automated ingestion system
scripts\start_automated_ingestion.bat

# This will open two windows:
# - Celery Worker: Processes ingestion tasks
# - Celery Beat: Schedules tasks at intervals
```

### Linux/Mac
```bash
# Make scripts executable
chmod +x scripts/start_automated_ingestion.sh
chmod +x scripts/stop_automated_ingestion.sh

# Start the system
./scripts/start_automated_ingestion.sh

# Stop the system
./scripts/stop_automated_ingestion.sh
```

## Verification Script

### Verify System Configuration
```bash
# Run comprehensive verification
python scripts/verify_automated_ingestion.py

# This checks:
# - Celery configuration
# - Registered tasks
# - Beat schedule
# - Task queues
# - Retry configuration
# - Monitoring setup
```

## Manual Task Execution Scripts

### Test Individual Data Sources
```bash
# Test CPCB API integration
python scripts/test_cpcb_api_detailed.py

# Test OpenAQ API
python scripts/test_openaq_v3_final.py

# Test weather APIs
python scripts/test_working_apis.py

# Test all APIs
python scripts/test_api_keys.py
```

### Run Comprehensive Integration Tests
```bash
# Test complete data integration pipeline
python scripts/comprehensive_real_data_integration.py

# Test final integration
python scripts/final_comprehensive_integration_test.py
```

### Test Specific Components
```bash
# Test data quality validation
python scripts/test_data_quality_validation.py

# Test LSTM model integration
python scripts/test_lstm_integration.py

# Test GNN model integration
python scripts/test_gnn_integration.py

# Test ensemble model
python scripts/test_ensemble_integration.py
```

## Docker Deployment

### Using Docker Compose
```bash
# Start all services including automated ingestion
docker-compose up -d

# Start only ingestion components
docker-compose up -d redis celery_worker celery_beat

# View logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat

# Stop services
docker-compose down
```

### Production Deployment
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=8

# View logs
docker-compose -f docker-compose.prod.yml logs -f celery_worker
```

## Monitoring

### Flower Web UI
```bash
# Start Flower for monitoring
celery -A src.tasks.celery_app flower --port=5555

# Access at http://localhost:5555
```

### Celery Inspect Commands
```bash
# Check active tasks
celery -A src.tasks.celery_app inspect active

# Check scheduled tasks
celery -A src.tasks.celery_app inspect scheduled

# Check registered tasks
celery -A src.tasks.celery_app inspect registered

# Check worker stats
celery -A src.tasks.celery_app inspect stats
```

## Manual Task Triggering

### Using Python
```python
from src.tasks.data_ingestion import (
    ingest_cpcb_data,
    ingest_weather_data,
    ingest_openaq_data,
    ingest_all_sources
)

# Trigger CPCB data ingestion
result = ingest_cpcb_data.delay()
print(f"Task ID: {result.id}")

# Trigger comprehensive ingestion
result = ingest_all_sources.delay()
result.wait(timeout=300)
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

## Troubleshooting

### Check Redis Connection
```bash
# Test Redis
redis-cli ping

# Should return: PONG
```

### Check Database Connection
```bash
# Test database
python -c "from src.api.database import engine; engine.connect()"

# Should complete without errors
```

### View Logs
```bash
# Docker logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat

# Manual startup logs
# Check terminal output or logs/ directory
tail -f logs/celery_worker.log
tail -f logs/celery_beat.log
```

### Check Task Status
```bash
# List all tasks
celery -A src.tasks.celery_app inspect registered

# Check active tasks
celery -A src.tasks.celery_app inspect active

# Check scheduled tasks
celery -A src.tasks.celery_app inspect scheduled
```

## Configuration

### Environment Variables
Create a `.env` file in the project root:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/aqi_predictor

# API Keys (optional)
CPCB_API_KEY=your_cpcb_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Customizing Schedule
Edit `src/tasks/celery_app.py` to modify ingestion intervals:

```python
beat_schedule={
    "ingest-cpcb-data": {
        "task": "src.tasks.data_ingestion.ingest_cpcb_data",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    "ingest-weather-data": {
        "task": "src.tasks.data_ingestion.ingest_weather_data",
        "schedule": crontab(minute="*/30"),  # Every 30 minutes
    },
    "ingest-openaq-data": {
        "task": "src.tasks.data_ingestion.ingest_openaq_data",
        "schedule": crontab(minute="*/20"),  # Every 20 minutes
    },
}
```

## Data Ingestion Schedule

The automated system runs the following tasks:

| Task | Frequency | Description |
|------|-----------|-------------|
| CPCB Data | Every 15 minutes | Air quality from CPCB stations |
| Weather Data | Every 30 minutes | Weather from IMD stations |
| OpenAQ Data | Every 20 minutes | Global air quality data |
| Satellite Data | On-demand | TROPOMI and VIIRS satellite data |
| Traffic Data | On-demand | Google Maps traffic data |
| Data Cleanup | Daily at 1 AM | Remove expired data |
| Model Retraining | Daily at 2 AM | Retrain ML models |
| Predictions | Every hour | Generate forecasts |
| Alerts | Every 5 minutes | Check alert thresholds |

## Performance

### Expected Ingestion Rates
- **CPCB Data**: ~100-200 data points per run
- **Weather Data**: ~50-100 data points per run
- **OpenAQ Data**: ~50-150 data points per run
- **Total**: ~200-450 data points per hour

### Processing Times
- **Single Station**: < 1 second
- **City (10 stations)**: < 5 seconds
- **All Sources**: < 30 seconds
- **Satellite Data**: 1-2 minutes

### Resource Usage
- **Worker Memory**: ~512 MB per worker
- **Redis Memory**: ~100 MB
- **Database Storage**: ~1 GB per month
- **CPU**: < 10% average utilization

## Documentation

For more detailed information, see:

- **AUTOMATED_DATA_INGESTION_GUIDE.md**: Complete user guide
- **AUTOMATED_INGESTION_IMPLEMENTATION_SUMMARY.md**: Implementation details
- **automated_ingestion_verification_report.txt**: Latest verification results

## Support

If you encounter issues:

1. Run the verification script: `python scripts/verify_automated_ingestion.py`
2. Check the logs for errors
3. Verify Redis and database connectivity
4. Review the troubleshooting section in AUTOMATED_DATA_INGESTION_GUIDE.md
