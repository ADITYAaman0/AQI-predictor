# Docker Deployment Guide - AQI Predictor

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Ensure Docker Desktop is running (whale icon in system tray)
   - Minimum 8GB RAM allocated to Docker
   - At least 20GB free disk space

2. **API Keys** (Optional but recommended for full functionality)
   - OpenWeatherMap API: https://openweathermap.org/api
   - OpenAQ API: https://openaq.org/

## Quick Start

### Option 1: Using PowerShell Script (Recommended)

```powershell
# From the project root directory
.\start-docker-deployment.ps1
```

This script will:
- Check if Docker is running
- Create .env file if needed
- Pull and build all images
- Start all services
- Display access URLs

### Option 2: Manual Deployment

1. **Start Docker Desktop**
   - Open Docker Desktop from Start Menu
   - Wait until it says "Docker Desktop is running"

2. **Create Environment File**
   ```powershell
   Copy-Item .env.docker .env
   # Edit .env and add your API keys
   ```

3. **Start Services**
   ```powershell
   docker-compose up -d
   ```

4. **Check Status**
   ```powershell
   docker-compose ps
   ```

## Services Included

| Service | Port | Description |
|---------|------|-------------|
| TimescaleDB | 5432 | PostgreSQL with time-series extensions |
| Redis | 6379 | Caching and message broker |
| FastAPI Backend | 8000 | Main API server |
| Celery Worker | - | Background task processor |
| Celery Beat | - | Scheduled task runner |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Monitoring dashboards |
| Jaeger | 16686 | Distributed tracing |

## Accessing Services

### API Documentation
- URL: http://localhost:8000/docs
- Interactive Swagger UI for testing API endpoints

### Prometheus Monitoring
- URL: http://localhost:9090
- View metrics and alerts

### Grafana Dashboards
- URL: http://localhost:3000
- Login: admin / admin (change on first login)
- Pre-configured dashboards for AQI monitoring

### Jaeger Tracing
- URL: http://localhost:16686
- View distributed traces and performance

## Common Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f celery-worker
```

### Restart Services
```powershell
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

### Stop Services
```powershell
# Stop but keep data
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### Check Service Status
```powershell
docker-compose ps
```

### Enter Container Shell
```powershell
docker-compose exec api /bin/bash
docker-compose exec timescaledb psql -U aqi_user -d aqi_predictor
```

## Data Management

### Database Access
```powershell
# Connect to database
docker-compose exec timescaledb psql -U aqi_user -d aqi_predictor

# Backup database
docker-compose exec timescaledb pg_dump -U aqi_user aqi_predictor > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T timescaledb psql -U aqi_user -d aqi_predictor
```

### View Data Volumes
```powershell
docker volume ls | Select-String "aqi"
```

## Troubleshooting

### Docker Desktop Not Starting
1. Check Task Manager for Docker processes
2. Restart Docker Desktop
3. Check Windows Services for "Docker Desktop Service"
4. Restart computer if needed

### Port Already in Use
```powershell
# Check what's using a port
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Services Won't Start
```powershell
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Remove and restart
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues
```powershell
# Check database is healthy
docker-compose exec timescaledb pg_isready -U aqi_user

# View database logs
docker-compose logs timescaledb
```

### Memory Issues
1. Open Docker Desktop Settings
2. Go to Resources → Advanced
3. Increase Memory to at least 8GB
4. Apply & Restart

## Health Checks

### Quick Health Check
```powershell
# Test API health
Invoke-WebRequest http://localhost:8000/health

# Test database
docker-compose exec timescaledb pg_isready -U aqi_user

# Test Redis
docker-compose exec redis redis-cli ping
```

### Full System Check
```powershell
# Run comprehensive tests
docker-compose exec api pytest

# Check all container health
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"
```

## Performance Tuning

### For Development
- Use docker-compose.dev.yml for faster rebuilds
- Enable file watching for auto-reload
- Reduce worker count

### For Production
- Use docker-compose.prod.yml
- Increase worker count based on CPU cores
- Enable connection pooling
- Configure Redis persistence

## Next Steps

1. **Access the API**: http://localhost:8000/docs
2. **View Monitoring**: http://localhost:3000 (Grafana)
3. **Check Logs**: Run `docker-compose logs -f`
4. **Test Endpoints**: Use the interactive Swagger UI
5. **Monitor Performance**: Check Prometheus metrics

## Support

- Check logs: `docker-compose logs -f`
- View container status: `docker-compose ps`
- Restart problematic services: `docker-compose restart <service-name>`
- Full reset: `docker-compose down -v && docker-compose up -d`
