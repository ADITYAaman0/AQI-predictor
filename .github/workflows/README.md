# AQI Predictor CI/CD Pipeline

This directory contains the complete CI/CD pipeline configuration for the AQI Predictor project, implementing automated testing, building, and deployment workflows.

## 🚀 Pipeline Overview

The CI/CD pipeline consists of several workflows that handle different aspects of the development and deployment process:

### Main Workflows

1. **`ci-cd-pipeline.yml`** - Main CI/CD pipeline
2. **`manual-deployment.yml`** - Manual deployment workflow
3. **`database-migration.yml`** - Database migration workflow
4. **`docker-build-matrix.yml`** - Docker image building
5. **`streamlit-deploy.yml`** - Legacy Streamlit deployment

## 📋 Pipeline Stages

### 1. Code Quality & Testing
- **Linting**: flake8 for code style
- **Type Checking**: mypy for static type analysis
- **Unit Tests**: pytest with coverage reporting
- **Property-Based Tests**: Hypothesis for correctness validation
- **Security Scanning**: Trivy and bandit for vulnerability detection

### 2. Docker Image Building
- **Multi-service builds**: API, Dashboard, Celery workers
- **Multi-platform**: linux/amd64, linux/arm64
- **Registry**: GitHub Container Registry (ghcr.io)
- **Caching**: GitHub Actions cache for faster builds
- **Vulnerability scanning**: Trivy integration

### 3. Database Migration
- **Automated migrations**: Alembic-based schema updates
- **Backup creation**: Pre-migration backup points
- **Validation**: Post-migration integrity checks
- **Rollback capability**: Automatic rollback on failure

### 4. Deployment
- **Staging deployment**: Automatic on `develop` branch
- **Production deployment**: Automatic on `main` branch
- **Manual deployment**: Workflow dispatch for specific services
- **Health checks**: Comprehensive post-deployment validation
- **Rollback**: Automatic rollback on deployment failure

## 🔧 Configuration

### Environment Variables

The pipeline requires the following secrets to be configured in GitHub:

#### Database
- `DATABASE_URL` - Database connection string
- `STAGING_DATABASE_URL` - Staging database URL
- `PRODUCTION_DATABASE_URL` - Production database URL

#### Kubernetes
- `STAGING_KUBECONFIG` - Base64 encoded kubeconfig for staging
- `PRODUCTION_KUBECONFIG` - Base64 encoded kubeconfig for production

#### External APIs
- `OPENWEATHER_API_KEY` - OpenWeatherMap API key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `CPCB_API_KEY` - CPCB API key

#### Monitoring & Notifications
- `SENTRY_DSN` - Sentry error tracking DSN
- `SLACK_WEBHOOK` - Slack webhook for notifications

### Branch Strategy

- **`main`** - Production branch, triggers production deployment
- **`develop`** - Development branch, triggers staging deployment
- **`feature/*`** - Feature branches, run tests only
- **Pull Requests** - Run full test suite

## 🏗️ Services Architecture

The pipeline builds and deploys the following services:

### API Service (`api`)
- **Base Image**: Python 3.11 slim
- **Framework**: FastAPI
- **Port**: 8000
- **Health Check**: `/health`

### Dashboard Service (`dashboard`)
- **Base Image**: Python 3.11 slim
- **Framework**: Streamlit
- **Port**: 8501
- **Health Check**: `/_stcore/health`

### Celery Workers (`celery`)
- **Base Image**: Python 3.11 slim
- **Components**: Worker, Beat scheduler
- **Background Tasks**: Data ingestion, ML training, alerts

## 🧪 Testing Strategy

### Unit Tests
```bash
pytest tests/ -v --cov=src --cov-report=xml
```

### Property-Based Tests
```bash
pytest tests/test_*_properties.py -v
```

### Integration Tests
```bash
pytest tests/integration/ --staging-url=<url>
```

### Smoke Tests
```bash
python tests/integration/test_deployment_smoke.py <base_url>
```

## 🚀 Deployment Process

### Automatic Deployment

1. **Code Push** to `main` or `develop`
2. **Tests Run** - Unit, integration, property-based
3. **Security Scan** - Vulnerability assessment
4. **Docker Build** - Multi-service image creation
5. **Database Migration** - Schema updates with backup
6. **Kubernetes Deployment** - Rolling update deployment
7. **Health Checks** - Service validation
8. **Smoke Tests** - End-to-end validation

### Manual Deployment

Use the manual deployment workflow for:
- Hotfixes
- Specific service updates
- Database-only migrations
- Emergency deployments

```yaml
# Trigger via GitHub Actions UI
inputs:
  environment: staging|production
  service: all|api|dashboard|celery|database-only
  skip_tests: false
  force_migration: false
```

## 🔄 Database Migrations

### Automatic Migration Process

1. **Backup Creation** - Pre-migration backup point
2. **Migration Execution** - Alembic upgrade to head
3. **Validation** - Post-migration integrity checks
4. **Rollback** - Automatic rollback on failure

### Manual Migration

```bash
python scripts/migrate-database.py \
  --database-url "postgresql://..." \
  --create-backup \
  --target-revision head
```

### Migration Validation

```bash
python scripts/migrate-database.py \
  --database-url "postgresql://..." \
  --validate-only
```

## 🛡️ Security Features

### Code Security
- **Static Analysis**: bandit for Python security issues
- **Dependency Scanning**: Automated vulnerability detection
- **Secret Scanning**: GitHub secret detection

### Container Security
- **Image Scanning**: Trivy vulnerability scanner
- **Multi-stage Builds**: Minimal attack surface
- **Non-root User**: Security-hardened containers

### Runtime Security
- **HTTPS Enforcement**: TLS termination at load balancer
- **Security Headers**: OWASP recommended headers
- **Rate Limiting**: API protection against abuse

## 📊 Monitoring & Observability

### Health Checks
- **API Health**: `/health`, `/health/db`, `/health/redis`
- **Dashboard Health**: `/_stcore/health`
- **Database Health**: Connection and query validation

### Metrics Collection
- **Application Metrics**: Prometheus integration
- **Infrastructure Metrics**: Kubernetes metrics
- **Custom Metrics**: Business logic metrics

### Logging
- **Structured Logging**: JSON format logs
- **Log Aggregation**: Centralized log collection
- **Error Tracking**: Sentry integration

## 🔧 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
gh run view <run-id> --log

# Rebuild specific service
gh workflow run manual-deployment.yml \
  -f environment=staging \
  -f service=api
```

#### Deployment Failures
```bash
# Check deployment status
kubectl get pods -n aqi-staging
kubectl describe deployment aqi-api -n aqi-staging

# Manual rollback
kubectl rollout undo deployment/aqi-api -n aqi-staging
```

#### Database Migration Issues
```bash
# Check migration status
python scripts/migrate-database.py \
  --database-url "postgresql://..." \
  --dry-run

# Rollback to previous version
python scripts/migrate-database.py \
  --database-url "postgresql://..." \
  --rollback-to <revision>
```

### Debug Commands

```bash
# View workflow runs
gh run list --workflow=ci-cd-pipeline.yml

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>

# Trigger manual deployment
gh workflow run manual-deployment.yml \
  -f environment=staging \
  -f service=all \
  -f skip_tests=false
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Deployment Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Alembic Migration Guide](https://alembic.sqlalchemy.org/en/latest/tutorial.html)

## 🤝 Contributing

When contributing to the CI/CD pipeline:

1. **Test Changes** in a feature branch first
2. **Update Documentation** for any configuration changes
3. **Validate Workflows** using `act` or similar tools
4. **Monitor Deployments** after changes are merged

## 📞 Support

For CI/CD pipeline issues:
- **GitHub Issues**: Create an issue with the `ci-cd` label
- **Slack**: #devops channel
- **Email**: devops@aqi-predictor.com