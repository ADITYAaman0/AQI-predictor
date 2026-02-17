# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the AQI Predictor system to production.

## Architecture Overview

The deployment consists of:

- **API Service**: FastAPI backend (3-10 replicas with HPA)
- **Celery Workers**: Background task processing (3-10 replicas with HPA)
- **Celery Beat**: Task scheduler (1 replica)
- **Dashboard**: Streamlit UI (2-5 replicas with HPA)
- **Frontend**: Leaflet map interface (2 replicas)
- **TimescaleDB**: Time-series database (StatefulSet)
- **Redis**: Cache and message broker (StatefulSet)
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## Prerequisites

1. **Kubernetes Cluster** (v1.24+)
   - GKE, EKS, AKS, or self-hosted
   - Minimum 3 nodes with 4 CPU / 16GB RAM each

2. **kubectl** configured to access your cluster
   ```bash
   kubectl version --client
   kubectl cluster-info
   ```

3. **Container Registry**
   - Docker Hub, GCR, ECR, or ACR
   - Images built and pushed:
     - `aqi-predictor-api:latest`
     - `aqi-predictor-celery:latest`
     - `aqi-predictor-streamlit:latest`
     - `aqi-predictor-frontend:latest`

4. **Ingress Controller** (NGINX recommended)
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

5. **Cert-Manager** for TLS certificates
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

6. **Storage Class** configured for persistent volumes
   ```bash
   kubectl get storageclass
   ```

## Quick Start

### 1. Build and Push Docker Images

```bash
# Build images
docker build -t your-registry/aqi-predictor-api:latest -f Dockerfile .
docker build -t your-registry/aqi-predictor-celery:latest -f Dockerfile.celery .
docker build -t your-registry/aqi-predictor-streamlit:latest -f Dockerfile.streamlit .
docker build -t your-registry/aqi-predictor-frontend:latest -f Dockerfile.frontend .

# Push to registry
docker push your-registry/aqi-predictor-api:latest
docker push your-registry/aqi-predictor-celery:latest
docker push your-registry/aqi-predictor-streamlit:latest
docker push your-registry/aqi-predictor-frontend:latest
```

### 2. Update Image References

Update all deployment YAML files to use your registry:

```bash
# Replace image references
find k8s/ -name "*.yaml" -type f -exec sed -i 's|aqi-predictor-|your-registry/aqi-predictor-|g' {} +
```

### 3. Configure Secrets

Create a `.env.production` file with your actual secrets:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://aqi_user:your_secure_password@timescaledb-service:5432/aqi_predictor

# Redis
REDIS_URL=redis://redis-service:6379/0

# Application
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

# External APIs
OPENWEATHER_API_KEY=your_openweather_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
CPCB_API_KEY=your_cpcb_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
GRAFANA_PASSWORD=your_grafana_password

# Notifications
SMTP_PASSWORD=your_smtp_password
SMS_API_KEY=your_sms_api_key
```

Create the secret in Kubernetes:

```bash
kubectl create namespace aqi-predictor
kubectl create secret generic aqi-secrets \
  --from-env-file=.env.production \
  --namespace=aqi-predictor
```

### 4. Deploy to Kubernetes

Deploy in order:

```bash
# 1. Namespace and configuration
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# 2. Persistent volumes
kubectl apply -f k8s/persistent-volumes.yaml

# 3. Databases (wait for ready)
kubectl apply -f k8s/timescaledb-statefulset.yaml
kubectl apply -f k8s/redis-statefulset.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=timescaledb -n aqi-predictor --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n aqi-predictor --timeout=300s

# 4. Application services
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/celery-worker-deployment.yaml
kubectl apply -f k8s/celery-beat-deployment.yaml
kubectl apply -f k8s/dashboard-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 5. Monitoring
kubectl apply -f k8s/prometheus-deployment.yaml
kubectl apply -f k8s/grafana-deployment.yaml

# 6. Ingress (update domains first!)
kubectl apply -f k8s/ingress.yaml
```

### 5. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n aqi-predictor

# Check services
kubectl get svc -n aqi-predictor

# Check ingress
kubectl get ingress -n aqi-predictor

# View logs
kubectl logs -f deployment/api -n aqi-predictor
kubectl logs -f deployment/celery-worker -n aqi-predictor
```

## Configuration

### Update Domains

Edit `k8s/ingress.yaml` and replace `aqi-predictor.example.com` with your actual domain:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    - dashboard.your-domain.com
```

### Configure TLS Certificates

Create a ClusterIssuer for Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply it:

```bash
kubectl apply -f letsencrypt-issuer.yaml
```

### Scaling Configuration

Adjust HPA settings in deployment files:

```yaml
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Resource Limits

Adjust resource requests/limits based on your workload:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Database Initialization

Run database migrations after first deployment:

```bash
# Get API pod name
API_POD=$(kubectl get pod -l app=api -n aqi-predictor -o jsonpath="{.items[0].metadata.name}")

# Run migrations
kubectl exec -it $API_POD -n aqi-predictor -- python scripts/migrate-database.py
```

## Monitoring

### Access Grafana

```bash
# Port forward to access locally
kubectl port-forward svc/grafana-service 3000:3000 -n aqi-predictor

# Open http://localhost:3000
# Username: admin
# Password: (from GRAFANA_PASSWORD secret)
```

### Access Prometheus

```bash
kubectl port-forward svc/prometheus-service 9090:9090 -n aqi-predictor
# Open http://localhost:9090
```

### View Metrics

Key metrics to monitor:

- API request rate and latency
- Celery task queue length
- Database connection pool usage
- Redis memory usage
- Pod CPU and memory usage

## Maintenance

### Update Application

```bash
# Build and push new image
docker build -t your-registry/aqi-predictor-api:v1.2.0 .
docker push your-registry/aqi-predictor-api:v1.2.0

# Update deployment
kubectl set image deployment/api api=your-registry/aqi-predictor-api:v1.2.0 -n aqi-predictor

# Check rollout status
kubectl rollout status deployment/api -n aqi-predictor

# Rollback if needed
kubectl rollout undo deployment/api -n aqi-predictor
```

### Database Backup

```bash
# Create backup
kubectl exec -it timescaledb-0 -n aqi-predictor -- \
  pg_dump -U aqi_user aqi_predictor > backup-$(date +%Y%m%d).sql

# Restore backup
kubectl exec -i timescaledb-0 -n aqi-predictor -- \
  psql -U aqi_user aqi_predictor < backup-20240115.sql
```

### Scale Services

```bash
# Manual scaling
kubectl scale deployment/api --replicas=5 -n aqi-predictor
kubectl scale deployment/celery-worker --replicas=5 -n aqi-predictor

# HPA will automatically scale based on metrics
kubectl get hpa -n aqi-predictor
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n aqi-predictor

# Check logs
kubectl logs <pod-name> -n aqi-predictor

# Check events
kubectl get events -n aqi-predictor --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it timescaledb-0 -n aqi-predictor -- psql -U aqi_user -d aqi_predictor -c "SELECT 1"

# Check database logs
kubectl logs timescaledb-0 -n aqi-predictor
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress aqi-ingress -n aqi-predictor

# Check certificate
kubectl describe certificate aqi-tls-cert -n aqi-predictor
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n aqi-predictor

# Adjust resource limits
kubectl edit deployment/api -n aqi-predictor
```

## Security Best Practices

1. **Use Secrets Management**: Consider using external secret managers (AWS Secrets Manager, HashiCorp Vault)
2. **Network Policies**: Implement network policies to restrict pod-to-pod communication
3. **RBAC**: Use role-based access control for service accounts
4. **Pod Security**: Enable Pod Security Standards
5. **Image Scanning**: Scan container images for vulnerabilities
6. **Regular Updates**: Keep Kubernetes and all components updated

## Cost Optimization

1. **Right-size Resources**: Monitor actual usage and adjust requests/limits
2. **Use Spot Instances**: For non-critical workloads (dev/staging)
3. **Enable Cluster Autoscaler**: Automatically scale nodes based on demand
4. **Set Resource Quotas**: Prevent resource exhaustion
5. **Use Horizontal Pod Autoscaling**: Scale based on actual load

## High Availability

The deployment is configured for high availability:

- Multiple replicas for all stateless services
- StatefulSets for databases with persistent storage
- Health checks and automatic restarts
- Rolling updates with zero downtime
- Load balancing across replicas

## Disaster Recovery

1. **Regular Backups**: Automated database backups
2. **Multi-Region**: Deploy to multiple regions for geo-redundancy
3. **Backup Secrets**: Store secrets in secure backup location
4. **Documentation**: Keep deployment procedures documented
5. **Testing**: Regularly test disaster recovery procedures

## Support

For issues or questions:

1. Check logs: `kubectl logs <pod-name> -n aqi-predictor`
2. Check events: `kubectl get events -n aqi-predictor`
3. Review documentation in this README
4. Contact DevOps team

## Next Steps

After successful deployment:

1. Configure monitoring alerts in Grafana
2. Set up log aggregation (ELK/Loki)
3. Configure backup automation
4. Set up CI/CD pipeline for automated deployments
5. Implement canary deployments for safer updates
