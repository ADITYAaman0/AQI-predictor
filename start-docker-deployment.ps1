# AQI Predictor - Full Docker Deployment Script
# This script starts all services with PostgreSQL, Redis, and ML capabilities

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AQI PREDICTOR - DOCKER DEPLOYMENT" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = $false
$ErrorActionPreference = "SilentlyContinue"
$result = docker ps 2>&1
$ErrorActionPreference = "Continue"

if ($LASTEXITCODE -eq 0) {
    $dockerRunning = $true
    Write-Host "✓ Docker is running" -ForegroundColor Green
}
else {
    Write-Host "✗ Docker is not running" -ForegroundColor Red
    Write-Host "`nPlease start Docker Desktop manually:" -ForegroundColor Yellow
    Write-Host "  1. Open Docker Desktop from Start Menu" -ForegroundColor White
    Write-Host "  2. Wait for Docker to fully start (whale icon in system tray)" -ForegroundColor White
    Write-Host "  3. Run this script again`n" -ForegroundColor White
    
    Write-Host "Would you like to try starting Docker Desktop now? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Cyan
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
        Write-Host "Waiting 60 seconds for Docker Desktop to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 60
        
        $ErrorActionPreference = "SilentlyContinue"
        $result = docker ps 2>&1
        $ErrorActionPreference = "Continue"
        
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
            Write-Host "✓ Docker is now running" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Docker still not ready. Please wait and try again." -ForegroundColor Red
            exit 1
        }
    }
    else {
        exit 1
    }
}

if (-not $dockerRunning) {
    exit 1
}

# Check if .env file exists
Write-Host "`nChecking configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env"
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host "`nIMPORTANT: Edit .env file to add your API keys!" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# Stop any existing containers
Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Pull latest images
Write-Host "`nPulling Docker images..." -ForegroundColor Yellow
docker-compose pull

# Build custom images
Write-Host "`nBuilding application images..." -ForegroundColor Yellow
docker-compose build

# Start all services
Write-Host "`nStarting all services..." -ForegroundColor Yellow
Write-Host "This includes:" -ForegroundColor Cyan
Write-Host "  • TimescaleDB (PostgreSQL with time-series)" -ForegroundColor White
Write-Host "  • Redis (Caching)" -ForegroundColor White
Write-Host "  • FastAPI Backend" -ForegroundColor White
Write-Host "  • Celery Worker (Background tasks)" -ForegroundColor White
Write-Host "  • Celery Beat (Scheduled tasks)" -ForegroundColor White
Write-Host "  • Prometheus (Metrics)" -ForegroundColor White
Write-Host "  • Grafana (Dashboards)" -ForegroundColor White
Write-Host "  • Jaeger (Tracing)`n" -ForegroundColor White

docker-compose up -d

# Wait for services to be healthy
Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check service status
Write-Host "`nChecking service status..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Access your services at:" -ForegroundColor Green
Write-Host "  • API Documentation:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  • Prometheus:         " -NoNewline -ForegroundColor White
Write-Host "http://localhost:9090" -ForegroundColor Yellow
Write-Host "  • Grafana:            " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Yellow
Write-Host "    (Default login: admin/admin)" -ForegroundColor Gray
Write-Host "  • Jaeger Tracing:     " -NoNewline -ForegroundColor White
Write-Host "http://localhost:16686" -ForegroundColor Yellow

Write-Host "`n" -NoNewline
Write-Host "View logs: " -NoNewline -ForegroundColor Cyan
Write-Host "docker-compose logs -f" -ForegroundColor White
Write-Host "Stop services: " -NoNewline -ForegroundColor Cyan
Write-Host "docker-compose down" -ForegroundColor White
Write-Host "Restart services: " -NoNewline -ForegroundColor Cyan
Write-Host "docker-compose restart" -ForegroundColor White
Write-Host "`n"
