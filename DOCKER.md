# Docker Containerization Guide

This document provides comprehensive instructions for running the AQI Predictor application using Docker containers.

## Overview

The AQI Predictor is containerized using Docker with the following services:

- **FastAPI Backend**: RESTful API service
- **Streamlit Dashboard**: Web-based user interface
- **TimescaleDB**: Time-series database with PostGIS
- **Redis**: Caching and message broker
- **Celery Workers**: Background task processing
- **Celery Beat**: Task scheduler
- **Nginx**: Reverse proxy and load balancer (production)
- **Prometheus**: Metrics collection (production)
- **Grafana**: Monitoring dashboards (production)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- OpenWeatherMap API key (required)
- Google Maps API key (optional, for traffic data)

## Quick Start (Development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd aqi-predictor
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker .env.local

# Edit .env.local with your API keys
# Required: OPENWEATHER_API_KEY
# Optional: GOOGLE_MAPS_API_KEY, CPCB_API_KEY
```

### 3. Start Development Environment

**Linux/macOS:**
```bash
./scripts/docker-dev.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\docker-dev.ps1
```

**Manual:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Access Services

- **Streamlit Dashboard**: http://localhost:8501
- **API Documentation**: http://localhost:8000/docs
- **Celery Monitor**: http://localhost:5555
- **Health Check**: http://localhost:8000/health

## Production Deployment

### 1. Production Configuration

Create `.env.prod` with production settings:

```bash
# Database
POSTGRES_DB=aqi_predictor_prod
POSTGRES_USER=aqi_user
POSTGRES_PASSWORD=secure_production_password
DATABASE_URL=postgresql+asyncpg://aqi_user:secure_production_password@timescaledb:5432/aqi_predictor_prod

# Security
SECRET_KEY=your_production_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
ENFORCE_HTTPS=true

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=secure_redis_password

# API Keys
OPENWEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CPCB_API_KEY=your_cpcb_api_key

# Monitoring
GRAFANA_PASSWORD=secure_grafana_password
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# Environment
ENVIRONMENT=production
```

### 2. SSL Certificates

Place SSL certificates in `docker/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

Or let the script generate self-signed certificates for testing.

### 3. Deploy to Production

**Linux/macOS:**
```bash
./scripts/docker-prod.sh
```

**Manual:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Access Production Services

- **Main Application**: https://localhost
- **API Documentation**: https://localhost/docs
- **Grafana Monitoring**: http://localhost:3000
- **Prometheus Metrics**: http://localhost:9090

## Service Architecture

### Development Services

```yaml
services:
  timescaledb:    # Database (port 5432)
  redis:          # Cache/Broker (port 6379)
  api:            # FastAPI Backend (port 8000)
  dashboard:      # Streamlit UI (port 8501)
  celery_worker:  # Background Tasks
  celery_beat:    # Task Scheduler
  flower:         # Celery Monitor (port 5555)
```

### Production Services

Includes all development services plus:

```yaml
services:
  nginx:          # Reverse Proxy (ports 80, 443)
  prometheus:     # Metrics (port 9090)
  grafana:        # Dashboards (port 3000)
```

## Container Details

### FastAPI Backend (`api`)

- **Image**: Custom Python 3.11 with dependencies
- **Port**: 8000
- **Health Check**: `/health` endpoint
- **Environment**: Database, Redis, API keys
- **Volumes**: Logs, model data

### Streamlit Dashboard (`dashboard`)

- **Image**: Custom Python 3.11 with Streamlit
- **Port**: 8501
- **Health Check**: `/_stcore/health`
- **Environment**: API base URL, API keys
- **Volumes**: Logs

### TimescaleDB (`timescaledb`)

- **Image**: `timescale/timescaledb-ha:pg15-latest`
- **Port**: 5432
- **Extensions**: PostGIS for geospatial data
- **Volumes**: Persistent data storage
- **Init Script**: `docker/init-db.sql`

### Redis (`redis`)

- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Configuration**: `docker/redis.conf`
- **Volumes**: Persistent data
- **Memory Limit**: 512MB (dev), 1GB (prod)

### Celery Workers (`celery_worker`)

- **Image**: Custom Python 3.11 with Celery
- **Queues**: data_ingestion, model_training, predictions, alerts
- **Concurrency**: 2 (dev), 4 (prod)
- **Volumes**: Logs, model data

### Nginx (`nginx`) - Production Only

- **Image**: `nginx:alpine`
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Configuration**: `docker/nginx.conf`
- **Features**: SSL termination, load balancing, rate limiting

## Data Persistence

### Volumes

- `timescale_data`: Database storage
- `redis_data`: Redis persistence
- `api_logs`: API service logs
- `dashboard_logs`: Streamlit logs
- `celery_logs`: Background task logs
- `model_data`: ML model artifacts

### Backup Strategy

```bash
# Database backup
docker-compose exec timescaledb pg_dump -U aqi_user aqi_predictor > backup.sql

# Volume backup
docker run --rm -v aqi_timescale_data:/data -v $(pwd):/backup alpine tar czf /backup/timescale_backup.tar.gz /data
```

## Monitoring and Logging

### Development Monitoring

```bash
# View all service logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f api

# Monitor Celery tasks
# Visit http://localhost:5555
```

### Production Monitoring

- **Grafana**: http://localhost:3000 (admin/password from .env.prod)
- **Prometheus**: http://localhost:9090
- **Application Logs**: Structured JSON logs in volumes

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:8000/health
curl http://localhost:8501/_stcore/health
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :8000
   
   # Stop conflicting services
   sudo systemctl stop apache2  # if using port 80
   ```

2. **Memory Issues**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

3. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs timescaledb
   
   # Test connection
   docker-compose exec timescaledb psql -U aqi_user -d aqi_predictor_dev
   ```

4. **API Key Issues**
   ```bash
   # Verify environment variables
   docker-compose exec api env | grep API_KEY
   
   # Test API key
   curl "http://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=YOUR_API_KEY"
   ```

### Service Dependencies

Services start in order based on health checks:

1. TimescaleDB and Redis (infrastructure)
2. API service (depends on database and Redis)
3. Dashboard (depends on API)
4. Celery workers (depends on database and Redis)

### Performance Tuning

#### Development
- Reduce Celery concurrency: `--concurrency=1`
- Disable debug logging: `--loglevel=warning`
- Limit container memory: Add `mem_limit` to services

#### Production
- Scale API service: `docker-compose up --scale api=3`
- Increase worker concurrency: `--concurrency=8`
- Enable Redis persistence: `appendonly yes`
- Configure Nginx caching

## Cleanup

### Stop Services

```bash
# Development
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose -f docker-compose.prod.yml down
```

### Complete Cleanup

**Linux/macOS:**
```bash
./scripts/docker-cleanup.sh
```

**Manual:**
```bash
# Stop all containers
docker-compose -f docker-compose.dev.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Remove images
docker images | grep aqi | awk '{print $3}' | xargs docker rmi -f

# Remove volumes (WARNING: This deletes all data)
docker volume ls | grep aqi | awk '{print $2}' | xargs docker volume rm

# Clean up system
docker system prune -f
```

## Security Considerations

### Development
- Default passwords are used (change for any external access)
- HTTP only (no SSL)
- Permissive CORS settings

### Production
- Strong passwords required in `.env.prod`
- HTTPS enforced with SSL certificates
- Rate limiting enabled
- Security headers configured
- Non-root users in containers

### Best Practices

1. **Secrets Management**
   - Use Docker secrets or external secret management
   - Never commit `.env.prod` to version control
   - Rotate API keys regularly

2. **Network Security**
   - Use custom Docker networks
   - Limit exposed ports
   - Configure firewall rules

3. **Container Security**
   - Regular image updates
   - Vulnerability scanning
   - Non-root users
   - Read-only filesystems where possible

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          echo "${{ secrets.ENV_PROD }}" > .env.prod
          ./scripts/docker-prod.sh
```

### Docker Registry

```bash
# Build and tag images
docker build -t your-registry/aqi-predictor:latest .

# Push to registry
docker push your-registry/aqi-predictor:latest

# Update production compose file to use registry images
```

## Support

For issues with Docker containerization:

1. Check service logs: `docker-compose logs [service]`
2. Verify environment configuration
3. Ensure all required API keys are set
4. Check Docker system resources
5. Review this documentation for troubleshooting steps

## Next Steps

After successful containerization:

1. Set up monitoring and alerting
2. Configure automated backups
3. Implement CI/CD pipeline
4. Set up log aggregation
5. Configure SSL certificates for production
6. Implement secrets management
7. Set up container orchestration (Kubernetes)