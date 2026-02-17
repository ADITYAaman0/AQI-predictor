# Development Docker setup script for AQI Predictor (PowerShell)

Write-Host "🚀 Starting AQI Predictor development environment..." -ForegroundColor Green

# Check if .env.local exists, if not copy from .env.docker
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local from .env.docker template..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env.local"
    Write-Host "⚠️  Please edit .env.local with your API keys before continuing!" -ForegroundColor Yellow
    Write-Host "   Required: OPENWEATHER_API_KEY, GOOGLE_MAPS_API_KEY" -ForegroundColor Yellow
    Read-Host "Press Enter when you've updated .env.local"
}

# Build and start services
Write-Host "🔨 Building Docker images..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml build

Write-Host "🚀 Starting services..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml ps

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

Write-Host "✅ Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Services available at:" -ForegroundColor Cyan
Write-Host "   • API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   • Streamlit Dashboard: http://localhost:8501" -ForegroundColor White
Write-Host "   • Flower (Celery Monitor): http://localhost:5555" -ForegroundColor White
Write-Host "   • API Health Check: http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "📊 To view logs:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.dev.yml logs -f [service_name]" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.dev.yml down" -ForegroundColor White