#!/bin/bash
# Quick start script for automated data ingestion system
# This script starts the Celery worker and beat scheduler

echo "========================================"
echo "AQI Predictor - Automated Data Ingestion"
echo "========================================"
echo ""

# Check if Redis is running
echo "Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "[ERROR] Redis is not running!"
    echo "Please start Redis first:"
    echo "  redis-server"
    echo ""
    exit 1
fi
echo "[OK] Redis is running"
echo ""

# Check if database is accessible
echo "Checking database connection..."
if ! python -c "from src.api.database import engine; engine.connect()" > /dev/null 2>&1; then
    echo "[WARNING] Database connection failed"
    echo "Make sure TimescaleDB is running"
    echo ""
fi

echo "Starting automated data ingestion system..."
echo ""
echo "This will start:"
echo "  - Celery Worker (background task processing)"
echo "  - Celery Beat (task scheduler)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Create log directory
mkdir -p logs

# Start Celery worker in background
celery -A src.tasks.celery_app worker --loglevel=info --concurrency=4 \
    --logfile=logs/celery_worker.log --pidfile=logs/celery_worker.pid &
WORKER_PID=$!

# Wait a bit for worker to start
sleep 3

# Start Celery beat in background
celery -A src.tasks.celery_app beat --loglevel=info \
    --logfile=logs/celery_beat.log --pidfile=logs/celery_beat.pid &
BEAT_PID=$!

echo ""
echo "[OK] Automated ingestion system started!"
echo ""
echo "Process IDs:"
echo "  - Worker PID: $WORKER_PID"
echo "  - Beat PID: $BEAT_PID"
echo ""
echo "Monitoring:"
echo "  - Worker log: tail -f logs/celery_worker.log"
echo "  - Beat log: tail -f logs/celery_beat.log"
echo "  - Flower UI: http://localhost:5555 (if running)"
echo ""
echo "Data ingestion schedule:"
echo "  - CPCB Data: Every 15 minutes"
echo "  - Weather Data: Every 30 minutes"
echo "  - OpenAQ Data: Every 20 minutes"
echo ""
echo "To stop the system:"
echo "  kill $WORKER_PID $BEAT_PID"
echo "  or run: ./scripts/stop_automated_ingestion.sh"
echo ""

# Save PIDs to file for easy stopping
echo "$WORKER_PID" > logs/celery_worker.pid
echo "$BEAT_PID" > logs/celery_beat.pid

# Wait for user interrupt
trap "echo ''; echo 'Stopping...'; kill $WORKER_PID $BEAT_PID; exit 0" INT TERM

# Keep script running
wait
