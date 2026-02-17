#!/bin/bash
# Stop script for automated data ingestion system

echo "========================================"
echo "Stopping Automated Data Ingestion"
echo "========================================"
echo ""

# Check if PID files exist
if [ ! -f logs/celery_worker.pid ] && [ ! -f logs/celery_beat.pid ]; then
    echo "[WARNING] No PID files found"
    echo "System may not be running or was started differently"
    echo ""
    echo "Attempting to find and stop Celery processes..."
    pkill -f "celery.*worker"
    pkill -f "celery.*beat"
    echo "[OK] Sent stop signal to all Celery processes"
    exit 0
fi

# Stop worker
if [ -f logs/celery_worker.pid ]; then
    WORKER_PID=$(cat logs/celery_worker.pid)
    echo "Stopping Celery worker (PID: $WORKER_PID)..."
    kill $WORKER_PID 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "[OK] Worker stopped"
    else
        echo "[WARNING] Worker process not found"
    fi
    rm logs/celery_worker.pid
fi

# Stop beat
if [ -f logs/celery_beat.pid ]; then
    BEAT_PID=$(cat logs/celery_beat.pid)
    echo "Stopping Celery beat (PID: $BEAT_PID)..."
    kill $BEAT_PID 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "[OK] Beat stopped"
    else
        echo "[WARNING] Beat process not found"
    fi
    rm logs/celery_beat.pid
fi

echo ""
echo "[OK] Automated ingestion system stopped"
echo ""
