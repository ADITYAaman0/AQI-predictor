# Docker Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available
- OpenWeatherMap API key (required)

## Development Setup (5 minutes)

### 1. Configure Environment
```bash
# Copy environment template
cp .env.docker .env.local

# Edit .env.local with your API keys
# Required: OPENWEATHER_API_KEY=your_key_here
```

### 2. Start Development Environment

**Windows (PowerShell):**
```powershell
.\scripts\docker-dev.ps1
```

**Linux/macOS:**
```bash
./scripts/docker-dev.sh
```

**Manual:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Access Services
- **Dashboard**: http://localhost:8501
- **API Docs**: http://localhost:8000/docs
- **Celery Monitor**: http://localhost:5555

## Production Deployment

### 1. Create Production Config
```bash
# Create .env.prod with secure passwords
cp .env.docker .env.prod
# Edit .env.prod with production values
```

### 2. Deploy
```bash
./scripts/docker-prod.sh
```

### 3. Access Production
- **Main App**: https://localhost
- **Monitoring**: http://localhost:3000

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml up --build

# Clean up everything
./scripts/docker-cleanup.sh
```

## Troubleshooting

### Port Conflicts
```bash
# Check what's using port 8000
netstat -ano | findstr :8000

# Kill process using port
taskkill /PID <PID> /F
```

### Memory Issues
- Increase Docker Desktop memory limit to 6GB+
- Close other applications

### API Key Issues
- Verify .env.local has correct API keys
- Test API key: `curl "http://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=YOUR_KEY"`

## Next Steps
1. Set up monitoring (Grafana/Prometheus)
2. Configure SSL certificates
3. Set up automated backups
4. Implement CI/CD pipeline

For detailed documentation, see [DOCKER.md](DOCKER.md)