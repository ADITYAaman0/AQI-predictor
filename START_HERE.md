# MANUAL DOCKER DEPLOYMENT STEPS

## Step 1: Start Docker Desktop
1. Open Start Menu
2. Search for "Docker Desktop"
3. Click to launch Docker Desktop
4. Wait until you see "Docker Desktop is running" in the system tray (whale icon)
5. This may take 1-2 minutes

## Step 2: Deploy the Application
Once Docker Desktop is running, open PowerShell in this directory and run:

```powershell
# Pull images
docker-compose pull

# Build custom images
docker-compose build

# Start all services
docker-compose up -d

# Wait 30 seconds for services to start
Start-Sleep -Seconds 30

# Check status
docker-compose ps
```

## Step 3: Access Your Services

### Main Services
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health

### Monitoring & Analytics
- **Grafana Dashboards**: http://localhost:3000 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090
- **Jaeger Tracing**: http://localhost:16686

### Databases
- **PostgreSQL**: localhost:5432
  - Database: aqi_predictor
  - User: aqi_user
  - Password: aqi_password

- **Redis**: localhost:6379

## Step 4: Verify Everything is Running

```powershell
# Check all containers
docker-compose ps

# View logs
docker-compose logs -f

# Check API health
Invoke-WebRequest http://localhost:8000/health | Select-Object -ExpandProperty Content
```

## Useful Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f celery-worker
docker-compose logs -f timescaledb
```

### Restart Services
```powershell
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
```

### Stop Services
```powershell
# Stop (keeps data)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

### Access Container Shell
```powershell
# API container
docker-compose exec api /bin/bash

# Database container
docker-compose exec timescaledb psql -U aqi_user -d aqi_predictor

# Redis container
docker-compose exec redis redis-cli
```

## Troubleshooting

### If services won't start:
```powershell
docker-compose down -v
docker-compose up -d
```

### If you see port conflicts:
```powershell
# Check what's using a port
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <ProcessID> /F
```

### To rebuild after code changes:
```powershell
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## What's Included

This deployment includes:

1. **TimescaleDB** - PostgreSQL with time-series extensions
2. **Redis** - Caching and message broker
3. **FastAPI Backend** - Main API server with ML models
4. **Celery Worker** - Background task processing
5. **Celery Beat** - Scheduled tasks (data ingestion, model retraining)
6. **Prometheus** - Metrics collection
7. **Grafana** - Monitoring dashboards
8. **Jaeger** - Distributed tracing

All services will start automatically and communicate with each other.
