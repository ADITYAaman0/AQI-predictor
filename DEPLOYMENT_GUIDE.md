# AQI Predictor Deployment Guide

Complete guide for deploying the AQI Predictor system to production.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment Options](#deployment-options)
4. [Prerequisites](#prerequisites)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Procedures](#deployment-procedures)
7. [Post-Deployment](#post-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

The AQI Predictor system consists of multiple components that can be deployed together or separately:

- **FastAPI Backend**: RESTful API service
- **Streamlit Dashboard**: Interactive web dashboard
- **Leaflet Frontend**: Map-based visualization
- **Celery Workers**: Background task processing
- **TimescaleDB**: Time-series database
- **Redis**: Cache and message broker
- **Prometheus/Grafana**: Monitoring stack

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
│                  (Nginx/ALB/Cloud LB)                    │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │  API Service    │          │   Dashboards   │
    │   (FastAPI)     │          │ (Streamlit +   │
    │                 │          │   Leaflet)     │
    └────────┬────────┘          └────────────────┘
             │
    ┌────────▼────────────────────────────────────┐
    │         Application Services                │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
    │  │  Celery  │  │  Celery  │  │  Redis   │ │
    │  │ Workers  │  │   Beat   │  │  Cache   │ │
    │  └──────────┘  └──────────┘  └──────────┘ │
    └────────┬────────────────────────────────────┘
             │
    ┌────────▼────────┐
    │  TimescaleDB    │
    │   (PostGIS)     │
    └─────────────────┘
```

## Deployment Options

### 1. Kubernetes (Production Recommended)

**Best for**: Production workloads, high availability, auto-scaling

**Pros**:
- Full control and flexibility
- Horizontal scaling
- High availability
- Multi-cloud support

**Cons**:
- Complex setup
- Requires Kubernetes expertise
- Higher operational overhead

**Guide**: See `k8s/README.md`

### 2. Docker Compose (Development/Small Production)

**Best for**: Development, staging, small production deployments

**Pros**:
- Simple setup
- Easy to understand
- Good for single-server deployments

**Cons**:
- Limited scaling
- Single point of failure
- Manual updates

**Guide**: See `DOCKER.md`

### 3. Cloud-Specific Services

#### Streamlit Cloud
**Best for**: Quick dashboard deployment, prototypes

**Pros**:
- Easiest deployment
- Free tier available
- Automatic updates

**Cons**:
- Limited resources
- Dashboard only
- Less control

**Guide**: See `deployment/streamlit-cloud/README.md`

#### Heroku
**Best for**: Simple deployments, startups

**Pros**:
- Easy deployment
- Good free tier
- Managed infrastructure

**Cons**:
- Can be expensive at scale
- Limited customization
- Dyno sleeping on free tier

**Guide**: See `deployment/heroku/README.md`

#### AWS
**Best for**: Enterprise deployments, AWS ecosystem

**Options**:
- App Runner (simplest)
- ECS Fargate (containers)
- EC2 (full control)
- Elastic Beanstalk (PaaS)

**Guide**: See `deployment/aws/README.md`

#### Google Cloud Platform
**Best for**: Google ecosystem, serverless

**Options**:
- Cloud Run (simplest)
- GKE (Kubernetes)
- Compute Engine (VMs)
- App Engine (PaaS)

**Guide**: See `deployment/gcp/README.md`

## Prerequisites

### Required

1. **Domain Name**: For production deployment
2. **SSL Certificate**: For HTTPS (Let's Encrypt recommended)
3. **API Keys**:
   - OpenWeatherMap API key
   - Google Maps API key (optional)
   - CPCB API key (if available)

### Optional

4. **Monitoring**:
   - Sentry account (error tracking)
   - Grafana Cloud (monitoring)
5. **Email/SMS**:
   - SMTP credentials (for email alerts)
   - SMS gateway API key (for SMS alerts)

## Environment Configuration

### Required Environment Variables

```bash
# Application
ENVIRONMENT=production
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

# Database
DATABASE_URL=postgresql://user:password@host:5432/aqi_predictor
POSTGRES_DB=aqi_predictor
POSTGRES_USER=aqi_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_URL=redis://host:6379/0

# External APIs
OPENWEATHER_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
CPCB_API_KEY=your_key

# API Configuration
API_BASE_URL=https://api.aqi-predictor.com
RATE_LIMIT_ANONYMOUS=1000
RATE_LIMIT_AUTHENTICATED=5000

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
GRAFANA_PASSWORD=your_grafana_password

# Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
SMS_API_KEY=your_sms_key
```

### Creating Environment Files

```bash
# Copy example file
cp .env.example .env.production

# Edit with your values
nano .env.production

# Secure the file
chmod 600 .env.production
```

## Deployment Procedures

### Option 1: Kubernetes Deployment

```bash
# 1. Build and push images
docker build -t your-registry/aqi-api:latest -f Dockerfile .
docker build -t your-registry/aqi-celery:latest -f Dockerfile.celery .
docker build -t your-registry/aqi-streamlit:latest -f Dockerfile.streamlit .
docker build -t your-registry/aqi-frontend:latest -f Dockerfile.frontend .

docker push your-registry/aqi-api:latest
docker push your-registry/aqi-celery:latest
docker push your-registry/aqi-streamlit:latest
docker push your-registry/aqi-frontend:latest

# 2. Update image references in k8s manifests
find k8s/ -name "*.yaml" -type f -exec sed -i 's|aqi-predictor-|your-registry/aqi-predictor-|g' {} +

# 3. Create secrets
kubectl create namespace aqi-predictor
kubectl create secret generic aqi-secrets \
  --from-env-file=.env.production \
  --namespace=aqi-predictor

# 4. Deploy using script
cd k8s
chmod +x deploy.sh
./deploy.sh

# 5. Verify deployment
kubectl get pods -n aqi-predictor
kubectl get svc -n aqi-predictor
kubectl get ingress -n aqi-predictor
```

### Option 2: Docker Compose Deployment

```bash
# 1. Clone repository
git clone https://github.com/your-org/aqi-predictor.git
cd aqi-predictor

# 2. Create environment file
cp .env.example .env.production

# 3. Build images
docker-compose -f docker-compose.prod.yml build

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker-compose -f docker-compose.prod.yml exec api python scripts/migrate-database.py

# 6. Verify services
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:8000/health
```

### Option 3: Cloud Platform Deployment

Follow the specific guide for your chosen platform:

- **Streamlit Cloud**: `deployment/streamlit-cloud/README.md`
- **Heroku**: `deployment/heroku/README.md`
- **AWS**: `deployment/aws/README.md`
- **GCP**: `deployment/gcp/README.md`

## Post-Deployment

### 1. Database Initialization

```bash
# Run migrations
python scripts/migrate-database.py

# Verify database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM monitoring_stations;"
```

### 2. Load Initial Data

```bash
# Load monitoring stations
python scripts/load_initial_data.py

# Verify data
curl http://your-api-url/api/v1/forecast/stations
```

### 3. Configure DNS

Update your DNS records:

```
# A Records (if using IP)
api.aqi-predictor.com     -> API_SERVER_IP
dashboard.aqi-predictor.com -> DASHBOARD_SERVER_IP

# CNAME Records (if using load balancer)
api.aqi-predictor.com     -> your-lb.example.com
dashboard.aqi-predictor.com -> your-lb.example.com
```

### 4. SSL Certificate

#### Let's Encrypt (Recommended)

```bash
# Using cert-manager (Kubernetes)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Using certbot (Docker Compose)
certbot certonly --standalone -d api.aqi-predictor.com -d dashboard.aqi-predictor.com
```

### 5. Verify Deployment

```bash
# Check API health
curl https://api.aqi-predictor.com/health

# Check dashboard
curl https://dashboard.aqi-predictor.com

# Test API endpoint
curl https://api.aqi-predictor.com/api/v1/forecast/current/Delhi

# Check monitoring
curl https://api.aqi-predictor.com/metrics
```

## Monitoring and Maintenance

### Health Checks

Set up automated health checks:

```bash
# API health check
*/5 * * * * curl -f https://api.aqi-predictor.com/health || alert

# Dashboard health check
*/5 * * * * curl -f https://dashboard.aqi-predictor.com/_stcore/health || alert
```

### Log Monitoring

```bash
# Kubernetes
kubectl logs -f deployment/api -n aqi-predictor

# Docker Compose
docker-compose -f docker-compose.prod.yml logs -f api

# View error logs only
kubectl logs deployment/api -n aqi-predictor | grep ERROR
```

### Performance Monitoring

Access monitoring dashboards:

- **Grafana**: https://grafana.aqi-predictor.com
- **Prometheus**: https://prometheus.aqi-predictor.com
- **Sentry**: https://sentry.io/your-org/aqi-predictor

### Backup Procedures

```bash
# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/aqi-$(date +%Y%m%d).sql.gz

# Backup retention (keep 30 days)
find /backups -name "aqi-*.sql.gz" -mtime +30 -delete
```

### Updates and Rollbacks

```bash
# Kubernetes rolling update
kubectl set image deployment/api api=your-registry/aqi-api:v1.2.0 -n aqi-predictor
kubectl rollout status deployment/api -n aqi-predictor

# Rollback if needed
kubectl rollout undo deployment/api -n aqi-predictor

# Docker Compose update
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database is running
kubectl get pods -l app=timescaledb -n aqi-predictor

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check credentials
kubectl get secret aqi-secrets -n aqi-predictor -o yaml
```

#### 2. API Not Responding

```bash
# Check API logs
kubectl logs deployment/api -n aqi-predictor --tail=100

# Check resource usage
kubectl top pods -n aqi-predictor

# Restart API
kubectl rollout restart deployment/api -n aqi-predictor
```

#### 3. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n aqi-predictor

# Increase memory limits
kubectl edit deployment/api -n aqi-predictor

# Scale horizontally
kubectl scale deployment/api --replicas=5 -n aqi-predictor
```

#### 4. Slow Response Times

```bash
# Check API metrics
curl https://api.aqi-predictor.com/metrics

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check Redis cache
redis-cli INFO stats

# Enable query logging
kubectl logs deployment/api -n aqi-predictor | grep "slow query"
```

### Getting Help

1. **Check Logs**: Always start with application logs
2. **Review Metrics**: Check Grafana dashboards
3. **Test Components**: Isolate the failing component
4. **Check Documentation**: Review relevant deployment guide
5. **Community Support**: Ask in project discussions

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Secrets stored securely (not in code)
- [ ] Database credentials rotated regularly
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Regular security updates applied
- [ ] Backup and disaster recovery tested
- [ ] Monitoring and alerting configured
- [ ] Access logs enabled

## Performance Checklist

- [ ] Caching enabled (Redis)
- [ ] Database indexes optimized
- [ ] CDN configured for static assets
- [ ] Auto-scaling configured
- [ ] Resource limits set appropriately
- [ ] Connection pooling enabled
- [ ] Query optimization performed
- [ ] Load testing completed

## Compliance Checklist

- [ ] Data retention policies configured
- [ ] Privacy policy published
- [ ] GDPR compliance verified
- [ ] Audit logging enabled
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Regular compliance audits

## Next Steps

After successful deployment:

1. **Monitor Performance**: Watch metrics for first 24-48 hours
2. **Load Testing**: Test with expected traffic levels
3. **User Acceptance Testing**: Verify all features work
4. **Documentation**: Update any deployment-specific docs
5. **Team Training**: Train team on operations
6. **Incident Response**: Set up on-call rotation
7. **Continuous Improvement**: Gather feedback and iterate

## Support

For deployment issues:

1. Check this guide and specific deployment guides
2. Review application logs and metrics
3. Search existing GitHub issues
4. Create new issue with deployment details
5. Contact DevOps team for urgent issues

## Additional Resources

- **Kubernetes Guide**: `k8s/README.md`
- **Docker Guide**: `DOCKER.md`
- **Infrastructure Guide**: `INFRASTRUCTURE.md`
- **Monitoring Guide**: `MONITORING_OBSERVABILITY_GUIDE.md`
- **API Documentation**: `https://api.aqi-predictor.com/docs`
