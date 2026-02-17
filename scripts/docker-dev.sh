#!/bin/bash
# Development Docker setup script for AQI Predictor

set -e

echo "🚀 Starting AQI Predictor development environment..."

# Check if .env.local exists, if not copy from .env.docker
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.docker template..."
    cp .env.docker .env.local
    echo "⚠️  Please edit .env.local with your API keys before continuing!"
    echo "   Required: OPENWEATHER_API_KEY, GOOGLE_MAPS_API_KEY"
    read -p "Press Enter when you've updated .env.local..."
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Build and start services
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.dev.yml ps

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

echo "✅ Development environment is ready!"
echo ""
echo "🌐 Services available at:"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Streamlit Dashboard: http://localhost:8501"
echo "   • Flower (Celery Monitor): http://localhost:5555"
echo "   • API Health Check: http://localhost:8000/health"
echo ""
echo "📊 To view logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f [service_name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.dev.yml down"