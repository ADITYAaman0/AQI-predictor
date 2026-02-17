@echo off
echo.
echo ========================================
echo   AQI PREDICTOR - DOCKER DEPLOYMENT
echo ========================================
echo.

echo Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop first:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for it to say "Docker Desktop is running"
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

echo Stopping existing containers...
docker-compose down 2>nul
echo.

echo Pulling images...
docker-compose pull
echo.

echo Building application...
docker-compose build
echo.

echo Starting all services...
docker-compose up -d
echo.

echo Waiting for services to be ready...
timeout /t 30 /nobreak >nul
echo.

echo Checking service status...
docker-compose ps
echo.

echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Access your services at:
echo   API Documentation:  http://localhost:8000/docs
echo   Grafana:           http://localhost:3000 (admin/admin)
echo   Prometheus:        http://localhost:9090
echo   Jaeger Tracing:    http://localhost:16686
echo.
echo Useful commands:
echo   View logs:    docker-compose logs -f
echo   Stop:         docker-compose down
echo   Restart:      docker-compose restart
echo.
pause
