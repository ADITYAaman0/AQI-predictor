@echo off
REM Quick start script for automated data ingestion system
REM This script starts the Celery worker and beat scheduler

echo ========================================
echo AQI Predictor - Automated Data Ingestion
echo ========================================
echo.

REM Check if Redis is running
echo Checking Redis connection...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Redis is not running!
    echo Please start Redis first:
    echo   redis-server
    echo.
    pause
    exit /b 1
)
echo [OK] Redis is running
echo.

REM Check if database is accessible
echo Checking database connection...
python -c "from src.api.database import engine; engine.connect()" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Database connection failed
    echo Make sure TimescaleDB is running
    echo.
)

echo Starting automated data ingestion system...
echo.
echo This will start:
echo   - Celery Worker (background task processing)
echo   - Celery Beat (task scheduler)
echo.
echo Press Ctrl+C to stop
echo.

REM Start Celery worker and beat in separate windows
start "Celery Worker" cmd /k "celery -A src.tasks.celery_app worker --loglevel=info --concurrency=4"
timeout /t 3 /nobreak >nul
start "Celery Beat" cmd /k "celery -A src.tasks.celery_app beat --loglevel=info"

echo.
echo [OK] Automated ingestion system started!
echo.
echo Monitoring:
echo   - Worker window: Check for task execution
echo   - Beat window: Check for scheduled tasks
echo   - Flower UI: http://localhost:5555 (if running)
echo.
echo Data ingestion schedule:
echo   - CPCB Data: Every 15 minutes
echo   - Weather Data: Every 30 minutes
echo   - OpenAQ Data: Every 20 minutes
echo.
echo Close the worker and beat windows to stop the system
echo.
pause
