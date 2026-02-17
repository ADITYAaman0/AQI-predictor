# Deployment Monitoring Script
# This script monitors the deployment and notifies when complete

param(
    [int]$CheckIntervalSeconds = 30,
    [int]$MaxWaitMinutes = 60
)

$startTime = Get-Date
$maxWaitTime = $startTime.AddMinutes($MaxWaitMinutes)

Write-Host "Starting deployment monitoring..." -ForegroundColor Cyan
Write-Host "Will check every $CheckIntervalSeconds seconds (max $MaxWaitMinutes minutes)" -ForegroundColor Yellow
Write-Host ""

$expectedServices = @("timescaledb", "redis", "api", "dashboard", "celery_worker")
$iteration = 0

while ((Get-Date) -lt $maxWaitTime) {
    $iteration++
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
    
    Write-Host "[$elapsed min] Checking deployment status..." -ForegroundColor Gray
    
    # Check how many AQI containers are running
    $runningContainers = docker ps --filter "name=aqi" --format "{{.Names}}" 2>$null
    $runningCount = ($runningContainers | Measure-Object).Count
    
    # Check for healthy containers
    $healthyContainers = docker ps --filter "name=aqi" --filter "health=healthy" --format "{{.Names}}" 2>$null
    $healthyCount = ($healthyContainers | Measure-Object).Count
    
    Write-Host "  Running: $runningCount containers" -ForegroundColor White
    Write-Host "  Healthy: $healthyCount containers" -ForegroundColor White
    
    # Check if deployment is complete (at least 5 core services running)
    if ($runningCount -ge 5) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Total deployment time: $elapsed minutes" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Running services:" -ForegroundColor Yellow
        docker ps --filter "name=aqi" --format "  • {{.Names}}: {{.Status}}"
        Write-Host ""
        Write-Host "Access your application:" -ForegroundColor Cyan
        Write-Host "  🌐 API Documentation: http://localhost:8000/docs" -ForegroundColor White
        Write-Host "  🌐 API Health: http://localhost:8000/health" -ForegroundColor White
        Write-Host "  📊 Dashboard: http://localhost:8501" -ForegroundColor White
        Write-Host ""
        Write-Host "To view logs: docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
        
        # Try to open browser (optional)
        try {
            Start-Process "http://localhost:8000/docs"
        } catch {
            # Silently fail if browser can't be opened
        }
        
        exit 0
    }
    
    # Check for failed containers
    $failedContainers = docker ps -a --filter "name=aqi" --filter "status=exited" --format "{{.Names}}" 2>$null
    if ($failedContainers) {
        Write-Host ""
        Write-Host "⚠️  Warning: Some containers have exited:" -ForegroundColor Yellow
        $failedContainers | ForEach-Object { Write-Host "  • $_" -ForegroundColor Red }
        Write-Host ""
        Write-Host "Check logs with: docker compose -f docker-compose.prod.yml logs [service-name]" -ForegroundColor Gray
    }
    
    Write-Host ""
    Start-Sleep -Seconds $CheckIntervalSeconds
}

Write-Host ""
Write-Host "⏱️  Maximum wait time ($MaxWaitMinutes minutes) reached." -ForegroundColor Yellow
Write-Host "Deployment may still be in progress. Check manually with:" -ForegroundColor Yellow
Write-Host "  .\scripts\check-deployment.ps1" -ForegroundColor White
exit 1
