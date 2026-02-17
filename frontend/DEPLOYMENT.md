# Leaflet Frontend Deployment Guide

This guide explains how to deploy the Leaflet.js frontend alongside the existing AQI Predictor backend infrastructure.

## Overview

The Leaflet frontend is deployed as a static web application served through Nginx, integrated with the existing Docker-based infrastructure. It supports three environments:

- **Development**: Local development with hot-reload
- **Staging**: Pre-production testing environment
- **Production**: Optimized production deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80/443)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   /map       │  │   /api       │  │  /dashboard  │      │
│  │  (Frontend)  │  │  (Backend)   │  │ (Streamlit)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
   Frontend Container   API Container    Dashboard Container
   (Static Files)       (FastAPI)        (Streamlit)
```

## Configuration Files

### Environment-Specific Configurations

1. **Development** (`frontend/js/config/config.development.js`)
   - API URL: `http://localhost:8000/api/v1`
   - Debug mode enabled
   - Fast refresh intervals (2 minutes)
   - Verbose logging

2. **Staging** (`frontend/js/config/config.staging.js`)
   - API URL: `/api/v1` (relative)
   - Limited debugging
   - Moderate refresh intervals (10 minutes)
   - Info-level logging

3. **Production** (`frontend/js/config/config.production.js`)
   - API URL: `/api/v1` (relative)
   - Debug mode disabled
   - Optimized refresh intervals (15 minutes)
   - Error-only logging

### Docker Configuration

- **Dockerfile.frontend**: Multi-stage build for frontend
- **docker-compose.dev.yml**: Development environment
- **docker-compose.staging.yml**: Staging environment
- **docker-compose.prod.yml**: Production environment

### Nginx Configuration

- **docker/nginx.conf**: Reverse proxy configuration
  - `/map` → Frontend static files
  - `/api` → Backend API
  - `/dashboard` → Streamlit dashboard (legacy)

## Deployment Instructions

### Development Deployment

1. **Start all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Access the frontend:**
   - Frontend: http://localhost:8080
   - API: http://localhost:8000
   - Dashboard: http://localhost:8501

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f frontend
   ```

### Staging Deployment

1. **Set environment variables:**
   ```bash
   export DB_USER=your_db_user
   export DB_PASSWORD=your_db_password
   export SECRET_KEY=your_secret_key
   ```

2. **Start services:**
   ```bash
   docker-compose -f docker-compose.staging.yml up -d
   ```

3. **Validate configuration:**
   ```bash
   python scripts/validate-config.py staging
   ```

### Production Deployment

1. **Set all required environment variables:**
   ```bash
   # Copy and customize production environment file
   cp .env.production .env
   # Edit .env with your production values
   ```

2. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Validate deployment:**
   ```bash
   python scripts/validate-config.py production
   ```

4. **Check service health:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   curl http://localhost/health
   curl http://localhost/map
   ```

## Configuration Validation

Use the validation script to ensure configuration consistency:

```bash
# Validate development configuration
python scripts/validate-config.py development

# Validate staging configuration
python scripts/validate-config.py staging

# Validate production configuration
python scripts/validate-config.py production
```

The validator checks:
- ✓ Backend environment variables
- ✓ Frontend configuration files
- ✓ Docker Compose configuration
- ✓ Nginx configuration
- ✓ Configuration consistency between frontend and backend

## Environment Variables

### Backend Environment Variables

Required for all environments:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
DB_USER=aqi_user
DB_PASSWORD=secure_password
DB_NAME=aqi_predictor
DB_HOST=timescaledb
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# API
SECRET_KEY=your_secret_key_here
API_HOST=0.0.0.0
API_PORT=8000

# External APIs
CPCB_API_KEY=your_cpcb_key
OPENWEATHER_API_KEY=your_openweather_key
OPENAQ_API_KEY=your_openaq_key
```

### Frontend Configuration

Frontend configuration is managed through JavaScript files and automatically selected based on hostname detection:

- `localhost` or `127.0.0.1` → Development
- Hostname contains `staging` → Staging
- Everything else → Production

## URL Structure

### Development
- Frontend: http://localhost:8080
- API: http://localhost:8000/api/v1
- Dashboard: http://localhost:8501

### Staging
- Frontend: https://staging.example.com/map
- API: https://staging.example.com/api/v1
- Dashboard: https://staging.example.com/dashboard

### Production
- Frontend: https://example.com/map
- API: https://example.com/api/v1
- Dashboard: https://example.com/dashboard

## Backward Compatibility

The deployment maintains full backward compatibility with the existing Streamlit dashboard:

- Streamlit dashboard remains accessible at `/dashboard`
- All existing API endpoints unchanged
- Both frontends can run simultaneously
- No database schema changes required

## Monitoring

### Health Checks

All services include health checks:

```bash
# Frontend health
curl http://localhost:8080/

# API health
curl http://localhost:8000/health

# Dashboard health
curl http://localhost:8501/_stcore/health
```

### Logs

View logs for each service:

```bash
# Frontend logs
docker logs aqi_frontend_prod

# API logs
docker logs aqi_api_prod

# Nginx logs
docker logs aqi_nginx_prod
```

## Troubleshooting

### Frontend not loading

1. Check if frontend container is running:
   ```bash
   docker ps | grep frontend
   ```

2. Check frontend logs:
   ```bash
   docker logs aqi_frontend_prod
   ```

3. Verify Nginx configuration:
   ```bash
   docker exec aqi_nginx_prod nginx -t
   ```

### API connection errors

1. Verify API is accessible:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check CORS configuration in backend
3. Verify API_BASE_URL in frontend config matches environment

### Configuration issues

1. Run validation script:
   ```bash
   python scripts/validate-config.py production
   ```

2. Check environment variables:
   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```

## Performance Optimization

### Production Optimizations

1. **Static file caching**: 1-year cache for JS/CSS/images
2. **Gzip compression**: Enabled for all text-based content
3. **HTTP/2**: Enabled in Nginx for better performance
4. **Connection pooling**: Nginx keepalive connections
5. **Resource limits**: Docker resource constraints applied

### Monitoring Performance

- Use browser DevTools Network tab
- Check Nginx access logs for response times
- Monitor Docker container resource usage

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Properly configured for same-origin requests
3. **Rate limiting**: Applied at Nginx level
4. **Security headers**: X-Frame-Options, CSP, etc.
5. **Secrets management**: Never commit secrets to version control

## Rollback Procedure

If issues occur in production:

1. **Stop new deployment:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore previous version:**
   ```bash
   git checkout <previous-tag>
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify services:**
   ```bash
   python scripts/validate-config.py production
   ```

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Run validation: `python scripts/validate-config.py <env>`
3. Review this documentation
4. Check GitHub issues
