#!/bin/bash
# Production Docker deployment script for AQI Predictor

set -e

echo "🚀 Deploying AQI Predictor to production..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod file not found!"
    echo "   Please create .env.prod with production configuration"
    exit 1
fi

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "SECRET_KEY" "OPENWEATHER_API_KEY" "REDIS_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Create SSL directory if it doesn't exist
mkdir -p docker/ssl

# Check for SSL certificates
if [ ! -f docker/ssl/cert.pem ] || [ ! -f docker/ssl/key.pem ]; then
    echo "⚠️  SSL certificates not found in docker/ssl/"
    echo "   Generating self-signed certificates for testing..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/ssl/key.pem \
        -out docker/ssl/cert.pem \
        -subj "/C=IN/ST=Delhi/L=Delhi/O=AQI Predictor/CN=localhost"
fi

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build application images
echo "🔨 Building application images..."
docker-compose -f docker-compose.prod.yml build

# Start services
echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Production deployment complete!"
echo ""
echo "🌐 Services available at:"
echo "   • Main Application: https://localhost"
echo "   • API Documentation: https://localhost/docs"
echo "   • Grafana Monitoring: http://localhost:3000"
echo "   • Prometheus Metrics: http://localhost:9090"
echo ""
echo "📊 To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service_name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.prod.yml down"