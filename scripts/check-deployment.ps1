# Check Deployment Status Script
# Run this to check the status of your AQI Predictor deployment

Write-Host "Checking AQI Predictor Deployment Status..." -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "=== Running Containers ===" -ForegroundColor Green
docker ps --filter "name=aqi" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "=== All AQI Containers (including stopped) ===" -ForegroundColor Yellow
docker ps -a --filter "name=aqi" --format "table {{.Names}}\t{{.Status}}"

Write-Host ""
Write-Host "=== Service Health ===" -ForegroundColor Blue
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

Write-Host ""
Write-Host "=== Quick Access URLs ===" -ForegroundColor Cyan
Write-Host "  API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  API Health Check: http://localhost:8000/health" -ForegroundColor White
Write-Host "  Streamlit Dashboard: http://localhost:8501" -ForegroundColor White
Write-Host "  Grafana Monitoring: http://localhost:3000 (if configured)" -ForegroundColor White

Write-Host ""
Write-Host "=== Useful Commands ===" -ForegroundColor Cyan
Write-Host "  View logs: docker compose -f docker-compose.prod.yml logs -f [service]" -ForegroundColor White
Write-Host "  Restart service: docker compose -f docker-compose.prod.yml restart [service]" -ForegroundColor White
Write-Host "  Stop all: docker compose -f docker-compose.prod.yml down" -ForegroundColor White
