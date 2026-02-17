# Production Docker deployment script for AQI Predictor (PowerShell)
# Run this script to deploy the application to production

param(
    [switch]$SkipBuild,
    [switch]$SkipMigrations
)

Write-Host "Deploying AQI Predictor to production..." -ForegroundColor Green

# Check if .env.prod exists
if (-not (Test-Path ".env.prod")) {
    Write-Host ".env.prod file not found!" -ForegroundColor Red
    Write-Host "Creating .env.prod from .env.docker template..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env.prod"
    Write-Host ""
    Write-Host "IMPORTANT: Please edit .env.prod with production configuration!" -ForegroundColor Yellow
    Write-Host "Required settings:" -ForegroundColor Yellow
    Write-Host "  - POSTGRES_PASSWORD (use strong password)" -ForegroundColor White
    Write-Host "  - SECRET_KEY (use openssl rand -hex 32)" -ForegroundColor White
    Write-Host "  - OPENWEATHER_API_KEY" -ForegroundColor White
    Write-Host "  - REDIS_PASSWORD (use strong password)" -ForegroundColor White
    Write-Host "  - ENVIRONMENT=production" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Press Enter when updated .env.prod, or type exit to abort"
    if ($continue -eq 'exit') {
        exit 1
    }
}

# Load environment variables from .env.prod
Write-Host "Loading production configuration..." -ForegroundColor Blue

# Test if required variables are in the file
$envContent = Get-Content ".env.prod" -Raw
$hasPassword = $envContent -match 'POSTGRES_PASSWORD=(.+)'
$hasSecret = $envContent -match 'SECRET_KEY=(.+)'
$hasWeatherKey = $envContent -match 'OPENWEATHER_API_KEY=(.+)'

if (-not $hasPassword -or $matches[1] -match 'CHANGE_ME') {
    Write-Host "POSTGRES_PASSWORD not configured in .env.prod" -ForegroundColor Red
    exit 1
}

if (-not $hasSecret -or $envContent -match 'SECRET_KEY=CHANGE_ME') {
    Write-Host "SECRET_KEY not configured in .env.prod" -ForegroundColor Red
    exit 1
}

if (-not $hasWeatherKey -or $envContent -match 'OPENWEATHER_API_KEY=YOUR_') {
    Write-Host "OPENWEATHER_API_KEY not configured in .env.prod" -ForegroundColor Red
    exit 1
}

Write-Host "Environment configuration validated" -ForegroundColor Green

# Create necessary directories
Write-Host "Creating required directories..." -ForegroundColor Blue
$dirs = @("docker/ssl", "docker/backup", "logs")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Check for SSL certificates
if (-not (Test-Path "docker/ssl/cert.pem") -or -not (Test-Path "docker/ssl/key.pem")) {
    Write-Host "SSL certificates not found in docker/ssl/" -ForegroundColor Yellow
    Write-Host "For production obtain proper SSL certificates from LetsEncrypt or CA" -ForegroundColor Yellow
    Write-Host "Skipping SSL certificate generation..." -ForegroundColor Yellow
}

# Pull latest images
Write-Host "Pulling latest base images..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.prod pull --ignore-pull-failures

if (-not $SkipBuild) {
    # Build application images
    Write-Host "Building application images..." -ForegroundColor Blue
    docker-compose -f docker-compose.prod.yml --env-file .env.prod build --parallel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
}

# Start services
Write-Host "Starting production services..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start services!" -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

if (-not $SkipMigrations) {
    # Run database migrations
    Write-Host "Running database migrations..." -ForegroundColor Blue
    docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T api alembic upgrade head
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database migrations failed. Continue anyway? (y/n)" -ForegroundColor Yellow
        $continue = Read-Host
        if ($continue -ne 'y') {
            exit 1
        }
    }
}

# Check service health
Write-Host "Checking service health..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.prod ps

Write-Host ""
Write-Host "Production deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Services available at:" -ForegroundColor Cyan
Write-Host "  API Documentation: https://localhost:8000/docs" -ForegroundColor White
Write-Host "  Streamlit Dashboard: http://localhost:8501" -ForegroundColor White
Write-Host "  Grafana Monitoring: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f" -ForegroundColor White
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose.prod.yml --env-file .env.prod down" -ForegroundColor White
