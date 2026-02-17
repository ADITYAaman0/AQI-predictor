# AWS Deployment Guide

Deploy the AQI Predictor Streamlit dashboard to AWS using various services.

## Deployment Options

1. **AWS App Runner** - Simplest, fully managed
2. **AWS ECS Fargate** - Container-based, more control
3. **AWS EC2** - Full control, more management
4. **AWS Elastic Beanstalk** - Platform as a Service

## Option 1: AWS App Runner (Recommended)

### Prerequisites

- AWS Account
- AWS CLI configured
- Docker installed
- ECR repository created

### Steps

#### 1. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name aqi-predictor-streamlit

# Build image
docker build -t aqi-predictor-streamlit -f Dockerfile.streamlit .

# Tag image
docker tag aqi-predictor-streamlit:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/aqi-predictor-streamlit:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/aqi-predictor-streamlit:latest
```

#### 2. Create App Runner Service

```bash
# Create service configuration
cat > apprunner-config.json <<EOF
{
  "ServiceName": "aqi-predictor-dashboard",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/aqi-predictor-streamlit:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8501",
        "RuntimeEnvironmentVariables": {
          "ENVIRONMENT": "production",
          "API_BASE_URL": "https://api.aqi-predictor.example.com"
        }
      }
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/_stcore/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

# Create service
aws apprunner create-service --cli-input-json file://apprunner-config.json
```

#### 3. Configure Environment Variables

```bash
# Update service with secrets
aws apprunner update-service \
  --service-arn <service-arn> \
  --source-configuration '{
    "ImageRepository": {
      "ImageConfiguration": {
        "RuntimeEnvironmentVariables": {
          "OPENWEATHER_API_KEY": "your_key",
          "SENTRY_DSN": "your_dsn"
        }
      }
    }
  }'
```

#### 4. Custom Domain

```bash
# Associate custom domain
aws apprunner associate-custom-domain \
  --service-arn <service-arn> \
  --domain-name dashboard.aqi-predictor.com

# Get validation records
aws apprunner describe-custom-domains \
  --service-arn <service-arn>

# Add CNAME records to your DNS
```

### Pricing

- **Compute**: $0.064/vCPU-hour + $0.007/GB-hour
- **Requests**: $0.40/million requests
- **Data Transfer**: Standard AWS rates

## Option 2: AWS ECS Fargate

### Prerequisites

- VPC with public subnets
- Application Load Balancer
- ECS Cluster

### Steps

#### 1. Create Task Definition

```json
{
  "family": "aqi-predictor-streamlit",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "streamlit",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/aqi-predictor-streamlit:latest",
      "portMappings": [
        {
          "containerPort": 8501,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "API_BASE_URL",
          "value": "https://api.aqi-predictor.example.com"
        }
      ],
      "secrets": [
        {
          "name": "OPENWEATHER_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account-id:secret:openweather-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aqi-predictor-streamlit",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8501/_stcore/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### 2. Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster aqi-predictor-cluster \
  --service-name streamlit-dashboard \
  --task-definition aqi-predictor-streamlit \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=streamlit,containerPort=8501"
```

#### 3. Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/aqi-predictor-cluster/streamlit-dashboard \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/aqi-predictor-cluster/streamlit-dashboard \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

### Pricing

- **Fargate**: $0.04048/vCPU-hour + $0.004445/GB-hour
- **ALB**: $0.0225/hour + $0.008/LCU-hour
- **Data Transfer**: Standard AWS rates

## Option 3: AWS EC2

### Steps

#### 1. Launch EC2 Instance

```bash
# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx \
  --user-data file://user-data.sh
```

#### 2. User Data Script

```bash
#!/bin/bash
# user-data.sh

# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository
cd /home/ec2-user
git clone https://github.com/your-org/aqi-predictor.git
cd aqi-predictor

# Create environment file
cat > .env.production <<EOF
ENVIRONMENT=production
API_BASE_URL=https://api.aqi-predictor.example.com
OPENWEATHER_API_KEY=your_key
EOF

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d dashboard
```

#### 3. Configure Security Group

```bash
# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Pricing

- **EC2 t3.medium**: ~$0.0416/hour (~$30/month)
- **EBS Storage**: $0.10/GB-month
- **Data Transfer**: Standard AWS rates

## Option 4: AWS Elastic Beanstalk

### Steps

#### 1. Create Application

```bash
# Initialize EB
eb init -p docker aqi-predictor-dashboard --region us-east-1

# Create environment
eb create production-env \
  --instance-type t3.medium \
  --envvars ENVIRONMENT=production,API_BASE_URL=https://api.aqi-predictor.example.com
```

#### 2. Configure Dockerrun.aws.json

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/aqi-predictor-streamlit:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 8501,
      "HostPort": 80
    }
  ],
  "Logging": "/var/log/streamlit"
}
```

#### 3. Deploy

```bash
# Deploy application
eb deploy

# Open in browser
eb open
```

## Secrets Management

### AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name aqi-predictor/openweather-key \
  --secret-string "your_api_key"

# Retrieve in application
import boto3

client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='aqi-predictor/openweather-key')
api_key = response['SecretString']
```

### AWS Systems Manager Parameter Store

```bash
# Store parameter
aws ssm put-parameter \
  --name /aqi-predictor/api-key \
  --value "your_api_key" \
  --type SecureString

# Retrieve in application
import boto3

ssm = boto3.client('ssm')
response = ssm.get_parameter(Name='/aqi-predictor/api-key', WithDecryption=True)
api_key = response['Parameter']['Value']
```

## Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /ecs/aqi-predictor-streamlit --follow

# Create metric filter
aws logs put-metric-filter \
  --log-group-name /ecs/aqi-predictor-streamlit \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=ErrorCount,metricNamespace=AQIPredictor,metricValue=1
```

### CloudWatch Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name aqi-dashboard-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Cost Optimization

1. **Use Spot Instances**: For non-critical workloads
2. **Right-size Instances**: Monitor and adjust based on usage
3. **Use Reserved Instances**: For predictable workloads
4. **Enable Auto Scaling**: Scale down during low traffic
5. **Use CloudFront**: Cache static assets

## Backup and Disaster Recovery

1. **AMI Snapshots**: Regular EC2 snapshots
2. **Multi-AZ Deployment**: Deploy across availability zones
3. **CloudFormation**: Infrastructure as Code for quick recovery
4. **S3 Backups**: Store configuration and data

## Next Steps

1. Set up CloudWatch monitoring
2. Configure auto-scaling
3. Implement CI/CD pipeline
4. Set up custom domain with Route 53
5. Enable CloudFront for CDN
6. Configure WAF for security
