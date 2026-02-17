#!/bin/bash
# Docker cleanup script for AQI Predictor

set -e

echo "🧹 Cleaning up Docker resources for AQI Predictor..."

# Stop and remove containers
echo "🛑 Stopping containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Remove images
echo "🗑️  Removing images..."
docker images | grep aqi | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

# Remove volumes (with confirmation)
read -p "🗄️  Remove persistent data volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing volumes..."
    docker volume ls | grep aqi | awk '{print $2}' | xargs docker volume rm 2>/dev/null || true
fi

# Remove networks
echo "🌐 Removing networks..."
docker network ls | grep aqi | awk '{print $2}' | xargs docker network rm 2>/dev/null || true

# Clean up dangling resources
echo "🧽 Cleaning up dangling resources..."
docker system prune -f

echo "✅ Cleanup complete!"