#!/bin/bash

# AQI Predictor Kubernetes Deployment Script
# This script automates the deployment of the AQI Predictor system to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="aqi-predictor"
TIMEOUT=300

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please configure kubectl."
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    kubectl apply -f namespace.yaml
}

create_secrets() {
    log_info "Creating secrets..."
    
    if [ ! -f "../.env.production" ]; then
        log_error ".env.production file not found. Please create it first."
        exit 1
    fi
    
    # Check if secret already exists
    if kubectl get secret aqi-secrets -n $NAMESPACE &> /dev/null; then
        log_warn "Secret 'aqi-secrets' already exists. Skipping creation."
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete secret aqi-secrets -n $NAMESPACE
            kubectl create secret generic aqi-secrets \
                --from-env-file=../.env.production \
                --namespace=$NAMESPACE
            log_info "Secret updated"
        fi
    else
        kubectl create secret generic aqi-secrets \
            --from-env-file=../.env.production \
            --namespace=$NAMESPACE
        log_info "Secret created"
    fi
}

deploy_config() {
    log_info "Deploying configuration..."
    kubectl apply -f configmap.yaml
}

deploy_storage() {
    log_info "Deploying persistent volumes..."
    kubectl apply -f persistent-volumes.yaml
}

deploy_databases() {
    log_info "Deploying databases..."
    
    # Deploy TimescaleDB
    kubectl apply -f timescaledb-statefulset.yaml
    
    # Deploy Redis
    kubectl apply -f redis-statefulset.yaml
    
    # Wait for databases to be ready
    log_info "Waiting for TimescaleDB to be ready..."
    kubectl wait --for=condition=ready pod -l app=timescaledb \
        -n $NAMESPACE --timeout=${TIMEOUT}s || {
        log_error "TimescaleDB failed to start"
        exit 1
    }
    
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis \
        -n $NAMESPACE --timeout=${TIMEOUT}s || {
        log_error "Redis failed to start"
        exit 1
    }
    
    log_info "Databases are ready"
}

deploy_applications() {
    log_info "Deploying application services..."
    
    # Deploy API
    kubectl apply -f api-deployment.yaml
    
    # Deploy Celery workers
    kubectl apply -f celery-worker-deployment.yaml
    kubectl apply -f celery-beat-deployment.yaml
    
    # Deploy frontends
    kubectl apply -f dashboard-deployment.yaml
    kubectl apply -f frontend-deployment.yaml
    
    # Wait for API to be ready
    log_info "Waiting for API to be ready..."
    kubectl wait --for=condition=available deployment/api \
        -n $NAMESPACE --timeout=${TIMEOUT}s || {
        log_warn "API deployment timeout, but continuing..."
    }
}

deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    kubectl apply -f prometheus-deployment.yaml
    kubectl apply -f grafana-deployment.yaml
    
    log_info "Monitoring stack deployed"
}

deploy_ingress() {
    log_info "Deploying ingress..."
    
    log_warn "Please ensure you have updated the domain names in ingress.yaml"
    read -p "Have you updated the domains? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Skipping ingress deployment. Update domains and run: kubectl apply -f ingress.yaml"
        return
    fi
    
    kubectl apply -f ingress.yaml
    log_info "Ingress deployed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Get first API pod
    API_POD=$(kubectl get pod -l app=api -n $NAMESPACE -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
    
    if [ -z "$API_POD" ]; then
        log_warn "No API pod found. Skipping migrations."
        log_warn "Run migrations manually later: kubectl exec -it <api-pod> -n $NAMESPACE -- python scripts/migrate-database.py"
        return
    fi
    
    kubectl exec -it $API_POD -n $NAMESPACE -- python scripts/migrate-database.py || {
        log_warn "Migration failed or not available. You may need to run it manually."
    }
}

show_status() {
    log_info "Deployment Status:"
    echo ""
    
    log_info "Pods:"
    kubectl get pods -n $NAMESPACE
    echo ""
    
    log_info "Services:"
    kubectl get svc -n $NAMESPACE
    echo ""
    
    log_info "Ingress:"
    kubectl get ingress -n $NAMESPACE
    echo ""
    
    log_info "HPA:"
    kubectl get hpa -n $NAMESPACE
}

show_access_info() {
    log_info "Access Information:"
    echo ""
    
    INGRESS_IP=$(kubectl get ingress aqi-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    
    if [ -z "$INGRESS_IP" ]; then
        log_warn "Ingress IP not yet assigned. Check later with: kubectl get ingress -n $NAMESPACE"
    else
        log_info "Ingress IP: $INGRESS_IP"
        log_info "Update your DNS records to point to this IP"
    fi
    
    echo ""
    log_info "Port Forward Commands (for local access):"
    echo "  API:        kubectl port-forward svc/api-service 8000:8000 -n $NAMESPACE"
    echo "  Dashboard:  kubectl port-forward svc/dashboard-service 8501:8501 -n $NAMESPACE"
    echo "  Grafana:    kubectl port-forward svc/grafana-service 3000:3000 -n $NAMESPACE"
    echo "  Prometheus: kubectl port-forward svc/prometheus-service 9090:9090 -n $NAMESPACE"
}

# Main deployment flow
main() {
    log_info "Starting AQI Predictor Kubernetes Deployment"
    echo ""
    
    check_prerequisites
    
    # Deployment steps
    create_namespace
    create_secrets
    deploy_config
    deploy_storage
    deploy_databases
    deploy_applications
    deploy_monitoring
    deploy_ingress
    
    # Post-deployment
    run_migrations
    
    echo ""
    log_info "Deployment completed!"
    echo ""
    
    show_status
    echo ""
    show_access_info
    
    echo ""
    log_info "Next steps:"
    echo "  1. Verify all pods are running: kubectl get pods -n $NAMESPACE"
    echo "  2. Check logs: kubectl logs -f deployment/api -n $NAMESPACE"
    echo "  3. Configure DNS records for your domains"
    echo "  4. Set up monitoring alerts in Grafana"
    echo "  5. Test the application endpoints"
}

# Run main function
main
