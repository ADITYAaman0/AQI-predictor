# Makefile for AQI Predictor development and deployment

.PHONY: help build up down logs shell test clean install dev staging prod

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install Python dependencies"
	@echo "  dev         - Start development environment"
	@echo "  staging     - Start staging environment"
	@echo "  build       - Build Docker images"
	@echo "  up          - Start all services"
	@echo "  down        - Stop all services"
	@echo "  logs        - Show service logs"
	@echo "  shell       - Open shell in API container"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean up containers and volumes"
	@echo "  db-init     - Initialize database"
	@echo "  db-migrate  - Run database migrations"
	@echo "  celery-monitor - Monitor Celery tasks"

# Install dependencies
install:
	pip install -r requirements.txt

# Development environment
dev:
	docker-compose -f docker-compose.yml up -d
	@echo "Development environment started"
	@echo "API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@echo "Health: http://localhost:8000/health"

# Staging environment
staging:
	docker-compose -f docker-compose.staging.yml up -d
	@echo "Staging environment started"
	@echo "API: http://localhost:8001"

# Build Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Open shell in API container
shell:
	docker-compose exec api bash

# Run tests
test:
	docker-compose exec api pytest tests/ -v

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Database initialization
db-init:
	docker-compose exec timescaledb psql -U aqi_user -d aqi_predictor -f /docker-entrypoint-initdb.d/init-db.sql

# Database migrations (when implemented)
db-migrate:
	docker-compose exec api alembic upgrade head

# Monitor Celery tasks
celery-monitor:
	docker-compose exec celery-worker celery -A src.tasks.celery_app inspect active

# Check service health
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health/detailed | python -m json.tool

# View API documentation
docs:
	@echo "Opening API documentation..."
	@echo "Visit: http://localhost:8000/docs"

# Development setup (first time)
setup: build dev db-init
	@echo "Development environment setup complete!"
	@echo "API: http://localhost:8000"
	@echo "Docs: http://localhost:8000/docs"

# Production deployment helpers
prod-build:
	docker build -t aqi-predictor:latest .

prod-push:
	docker tag aqi-predictor:latest your-registry/aqi-predictor:latest
	docker push your-registry/aqi-predictor:latest

# Backup database
backup:
	docker-compose exec timescaledb pg_dump -U aqi_user aqi_predictor > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Restore database
restore:
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T timescaledb psql -U aqi_user aqi_predictor < $$backup_file