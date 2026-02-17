# Google Cloud Platform (GCP) Deployment Guide

Deploy the AQI Predictor Streamlit dashboard to Google Cloud Platform.

## Deployment Options

1. **Cloud Run** - Simplest, fully managed, serverless
2. **Google Kubernetes Engine (GKE)** - Container orchestration
3. **Compute Engine** - Virtual machines
4. **App Engine** - Platform as a Service

## Option 1: Cloud Run (Recommended)

### Prerequisites

- GCP Account and Project
- gcloud CLI installed and configured
- Docker installed
- Artifact Registry repository created

### Steps

#### 1. Setup GCP Project

```bash
# Set project
gcloud config set project aqi-predictor-project

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

#### 2. Create Artifact Registry Repository

```bash
# Create repository
gcloud artifacts repositories create aqi-predictor \
  --repository-format=docker \
  --location=us-central1 \
  --description="AQI Predictor container images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

#### 3. Build and Push Docker Image

```bash
# Build image
docker build -t aqi-predictor-streamlit -f Dockerfile.streamlit .

# Tag for Artifact Registry
docker tag aqi-predictor-streamlit:latest \
  us-central1-docker.pkg.dev/aqi-predictor-project/aqi-predictor/streamlit:latest

# Push image
docker push us-central1-docker.pkg.dev/aqi-predictor-project/aqi-predictor/streamlit:latest
```

#### 4. Store Secrets

```bash
# Create secrets
echo -n "your_openweather_key" | \
  gcloud secrets create openweather-api-key --data-file=-

echo -n "your_sentry_dsn" | \
  gcloud secrets create sentry-dsn --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding openweather-api-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 5. Deploy to Cloud Run

```bash
# Deploy service
gcloud run deploy aqi-predictor-dashboard \
  --image=us-central1-docker.pkg.dev/aqi-predictor-project/aqi-predictor/streamlit:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8501 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --set-env-vars="ENVIRONMENT=production,API_BASE_URL=https://api.aqi-predictor.example.com" \
  --set-secrets="OPENWEATHER_API_KEY=openweather-api-key:latest,SENTRY_DSN=sentry-dsn:latest" \
  --timeout=300 \
  --concurrency=80

# Get service URL
gcloud run services describe aqi-predictor-dashboard \
  --region=us-central1 \
  --format='value(status.url)'
```

#### 6. Configure Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=aqi-predictor-dashboard \
  --domain=dashboard.aqi-predictor.com \
  --region=us-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain=dashboard.aqi-predictor.com \
  --region=us-central1
```

### Cloud Run Configuration File

Create `cloudrun.yaml`:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: aqi-predictor-dashboard
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: '1'
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/cpu-throttling: 'false'
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: us-central1-docker.pkg.dev/aqi-predictor-project/aqi-predictor/streamlit:latest
        ports:
        - containerPort: 8501
        env:
        - name: ENVIRONMENT
          value: production
        - name: API_BASE_URL
          value: https://api.aqi-predictor.example.com
        - name: OPENWEATHER_API_KEY
          valueFrom:
            secretKeyRef:
              name: openweather-api-key
              key: latest
        resources:
          limits:
            memory: 2Gi
            cpu: '2'
        startupProbe:
          httpGet:
            path: /_stcore/health
            port: 8501
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /_stcore/health
            port: 8501
          periodSeconds: 10
```

Deploy with:
```bash
gcloud run services replace cloudrun.yaml --region=us-central1
```

### Pricing

- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: $0.40/million requests
- **Free Tier**: 2 million requests/month

## Option 2: Google Kubernetes Engine (GKE)

### Steps

#### 1. Create GKE Cluster

```bash
# Create cluster
gcloud container clusters create aqi-predictor-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials aqi-predictor-cluster \
  --region=us-central1
```

#### 2. Deploy Using Kubernetes Manifests

```bash
# Use the k8s manifests from the k8s/ directory
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/dashboard-deployment.yaml
```

#### 3. Expose Service

```bash
# Create load balancer
kubectl expose deployment dashboard \
  --type=LoadBalancer \
  --port=80 \
  --target-port=8501 \
  --name=dashboard-lb \
  -n aqi-predictor

# Get external IP
kubectl get service dashboard-lb -n aqi-predictor
```

### Pricing

- **Cluster Management**: $0.10/hour
- **Nodes**: Based on Compute Engine pricing
- **Load Balancer**: $0.025/hour + $0.008/GB

## Option 3: Compute Engine

### Steps

#### 1. Create VM Instance

```bash
# Create instance
gcloud compute instances create aqi-dashboard-vm \
  --zone=us-central1-a \
  --machine-type=n1-standard-2 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server \
  --metadata-from-file=startup-script=startup-script.sh
```

#### 2. Startup Script

Create `startup-script.sh`:

```bash
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository
cd /opt
git clone https://github.com/your-org/aqi-predictor.git
cd aqi-predictor

# Create environment file
cat > .env.production <<EOF
ENVIRONMENT=production
API_BASE_URL=https://api.aqi-predictor.example.com
OPENWEATHER_API_KEY=$(gcloud secrets versions access latest --secret=openweather-api-key)
EOF

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d dashboard
```

#### 3. Configure Firewall

```bash
# Allow HTTP/HTTPS
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 \
  --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 \
  --target-tags=https-server
```

### Pricing

- **n1-standard-2**: ~$0.095/hour (~$70/month)
- **Persistent Disk**: $0.04/GB-month
- **Network Egress**: $0.12/GB (after 1GB free)

## Option 4: App Engine

### Steps

#### 1. Create app.yaml

```yaml
runtime: custom
env: flex

automatic_scaling:
  min_num_instances: 1
  max_num_instances: 10
  cpu_utilization:
    target_utilization: 0.7

resources:
  cpu: 2
  memory_gb: 2
  disk_size_gb: 10

env_variables:
  ENVIRONMENT: 'production'
  API_BASE_URL: 'https://api.aqi-predictor.example.com'

beta_settings:
  cloud_sql_instances: PROJECT:REGION:INSTANCE
```

#### 2. Deploy

```bash
# Deploy to App Engine
gcloud app deploy app.yaml

# View application
gcloud app browse
```

### Pricing

- **Instance Hours**: Based on resource configuration
- **Network**: Standard GCP rates
- **Free Tier**: 28 instance hours/day

## Monitoring and Logging

### Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aqi-predictor-dashboard" \
  --limit=50 \
  --format=json

# Create log-based metric
gcloud logging metrics create error_count \
  --description="Count of error logs" \
  --log-filter='severity>=ERROR'
```

### Cloud Monitoring

```bash
# Create uptime check
gcloud monitoring uptime create aqi-dashboard-uptime \
  --resource-type=uptime-url \
  --host=dashboard.aqi-predictor.com \
  --path=/_stcore/health

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

### Cloud Trace

Enable tracing in your application:

```python
from google.cloud import trace_v1

tracer = trace_v1.TraceServiceClient()
```

## CI/CD with Cloud Build

### cloudbuild.yaml

```yaml
steps:
# Build Docker image
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/aqi-predictor/streamlit:$COMMIT_SHA', '-f', 'Dockerfile.streamlit', '.']

# Push to Artifact Registry
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/aqi-predictor/streamlit:$COMMIT_SHA']

# Deploy to Cloud Run
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
  - 'run'
  - 'deploy'
  - 'aqi-predictor-dashboard'
  - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/aqi-predictor/streamlit:$COMMIT_SHA'
  - '--region=us-central1'
  - '--platform=managed'

images:
- 'us-central1-docker.pkg.dev/$PROJECT_ID/aqi-predictor/streamlit:$COMMIT_SHA'

options:
  machineType: 'N1_HIGHCPU_8'
```

### Setup Trigger

```bash
# Create build trigger
gcloud builds triggers create github \
  --repo-name=aqi-predictor \
  --repo-owner=your-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## Security Best Practices

1. **Use Secret Manager**: Store sensitive data
2. **Enable VPC**: Use VPC Service Controls
3. **IAM Roles**: Principle of least privilege
4. **Binary Authorization**: Verify container images
5. **Cloud Armor**: DDoS protection

## Cost Optimization

1. **Use Committed Use Discounts**: For predictable workloads
2. **Enable Autoscaling**: Scale down during low traffic
3. **Use Preemptible VMs**: For non-critical workloads
4. **Cloud CDN**: Cache static content
5. **Monitor Costs**: Use Cost Management tools

## Backup and Disaster Recovery

1. **Snapshots**: Regular disk snapshots
2. **Multi-Region**: Deploy across regions
3. **Cloud Storage**: Backup configurations
4. **Deployment Manager**: Infrastructure as Code

## Next Steps

1. Set up Cloud Monitoring dashboards
2. Configure alerting policies
3. Implement CI/CD pipeline
4. Set up custom domain
5. Enable Cloud CDN
6. Configure Cloud Armor
