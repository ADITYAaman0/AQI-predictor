#!/usr/bin/env pwsh
# Quick Deployment Script for AQI Predictor
# Choose your deployment platform and deploy

Write-Host "`n🚀 AQI Predictor - Free Deployment Wizard`n" -ForegroundColor Cyan

Write-Host "Choose your deployment platform:" -ForegroundColor Yellow
Write-Host "1. Render.com (Recommended - Full stack, 90 days free)"
Write-Host "2. Railway.app (Best ML support, `$5 credit)"
Write-Host "3. Streamlit Cloud (Simplest - Dashboard only, forever free)"
Write-Host "4. Hybrid Approach (Multi-platform, forever free)"
Write-Host "5. Local Docker (Development)"
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n📦 Deploying to Render.com...`n" -ForegroundColor Green
        Write-Host "Steps to complete:"
        Write-Host "1. Go to https://render.com"
        Write-Host "2. Sign up/Login (use GitHub)"
        Write-Host "3. Click 'New +' → 'Blueprint'"
        Write-Host "4. Connect your GitHub repository"
        Write-Host "5. Select the repo containing render.yaml"
        Write-Host "6. Click 'Apply' - Done!"
        Write-Host ""
        Write-Host "📄 Configuration file: render.yaml (already created)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Note: Free PostgreSQL expires after 90 days" -ForegroundColor Yellow
        Write-Host "Then costs `$7/month or migrate to Supabase (free forever)"
        Write-Host ""
        
        $open = Read-Host "Open Render.com now? (y/n)"
        if ($open -eq "y") {
            Start-Process "https://render.com/register"
        }
    }
    
    "2" {
        Write-Host "`n🚂 Deploying to Railway.app...`n" -ForegroundColor Green
        Write-Host "Installing Railway CLI..."
        
        # Check if npm is installed
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            npm install -g @railway/cli
            
            Write-Host "`nRailway CLI installed. Run these commands:" -ForegroundColor Cyan
            Write-Host "railway login"
            Write-Host "railway init"
            Write-Host "railway up"
            Write-Host "railway add --plugin postgresql"
            Write-Host "railway add --plugin redis"
            Write-Host ""
        } else {
            Write-Host "❌ npm not found. Install Node.js first:" -ForegroundColor Red
            Write-Host "https://nodejs.org/"
            Write-Host ""
            Write-Host "Or deploy via GitHub:"
            Write-Host "1. Go to https://railway.app"
            Write-Host "2. Sign up with GitHub"
            Write-Host "3. New Project → Deploy from GitHub repo"
            Write-Host "4. Add PostgreSQL and Redis plugins"
            Write-Host ""
        }
        
        $open = Read-Host "Open Railway.app now? (y/n)"
        if ($open -eq "y") {
            Start-Process "https://railway.app"
        }
    }
    
    "3" {
        Write-Host "`n☁️  Deploying to Streamlit Cloud...`n" -ForegroundColor Green
        Write-Host "This is the SIMPLEST option - Dashboard only"
        Write-Host ""
        Write-Host "Steps:"
        Write-Host "1. Push your code to GitHub"
        Write-Host "2. Go to https://share.streamlit.io"
        Write-Host "3. Click 'New app'"
        Write-Host "4. Select: Repository → Branch → app.py"
        Write-Host "5. Click 'Deploy'"
        Write-Host "6. Done in 2 minutes!"
        Write-Host ""
        Write-Host "⚠️  Limitations:" -ForegroundColor Yellow
        Write-Host "- No FastAPI backend (API features disabled)"
        Write-Host "- No PostgreSQL (use SQLite or Supabase)"
        Write-Host "- No background workers (manual refresh only)"
        Write-Host "- 1 GB RAM limit"
        Write-Host ""
        
        # Check git status
        Write-Host "Checking git status..." -ForegroundColor Cyan
        git status --short
        Write-Host ""
        
        $push = Read-Host "Push to GitHub now? (y/n)"
        if ($push -eq "y") {
            git add .
            $msg = Read-Host "Commit message (or press Enter for default)"
            if ([string]::IsNullOrWhiteSpace($msg)) {
                $msg = "Prepare for Streamlit Cloud deployment"
            }
            git commit -m $msg
            git push
            Write-Host "`n✅ Pushed to GitHub!" -ForegroundColor Green
        }
        
        $open = Read-Host "Open Streamlit Cloud now? (y/n)"
        if ($open -eq "y") {
            Start-Process "https://share.streamlit.io"
        }
    }
    
    "4" {
        Write-Host "`n🔥 Hybrid Deployment (Maximum Free Tier)`n" -ForegroundColor Green
        Write-Host "This uses multiple free tiers for a complete solution:"
        Write-Host ""
        Write-Host "Components:"
        Write-Host "✅ Dashboard: Streamlit Cloud (forever free)"
        Write-Host "✅ API: Render.com (90 days free)"
        Write-Host "✅ Database: Supabase (forever free, 500MB)"
        Write-Host "✅ Redis: Upstash (forever free, 10K commands/day)"
        Write-Host "✅ Background Jobs: GitHub Actions (forever free)"
        Write-Host ""
        Write-Host "Setup steps:"
        Write-Host ""
        Write-Host "1️⃣  Create Supabase Database:"
        Write-Host "   - Go to https://supabase.com"
        Write-Host "   - Create new project"
        Write-Host "   - Copy DATABASE_URL from Settings"
        Write-Host ""
        Write-Host "2️⃣  Create Upstash Redis:"
        Write-Host "   - Go to https://upstash.com"
        Write-Host "   - Create Redis database"
        Write-Host "   - Copy REDIS_URL"
        Write-Host ""
        Write-Host "3️⃣  Deploy API to Render.com:"
        Write-Host "   - Follow Option 1 instructions"
        Write-Host "   - Add DATABASE_URL and REDIS_URL as env vars"
        Write-Host ""
        Write-Host "4️⃣  Deploy Dashboard to Streamlit Cloud:"
        Write-Host "   - Follow Option 3 instructions"
        Write-Host "   - Add API_URL in secrets"
        Write-Host ""
        Write-Host "5️⃣  Enable GitHub Actions:"
        Write-Host "   - Go to repo Settings → Secrets"
        Write-Host "   - Add DATABASE_URL, API_URL, DASHBOARD_URL"
        Write-Host "   - Actions will auto-run for data ingestion"
        Write-Host ""
        
        Write-Host "📚 Full guide: FREE_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
        Write-Host ""
        
        $open = Read-Host "Open deployment guide? (y/n)"
        if ($open -eq "y") {
            code "FREE_DEPLOYMENT_GUIDE.md"
        }
    }
    
    "5" {
        Write-Host "`n🐳 Starting Local Docker Deployment...`n" -ForegroundColor Green
        Write-Host "This runs everything locally with all features enabled"
        Write-Host ""
        
        # Check if Docker is installed
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            Write-Host "✅ Docker found" -ForegroundColor Green
            
            $start = Read-Host "Start all services now? (y/n)"
            if ($start -eq "y") {
                Write-Host "`nStarting Docker containers..." -ForegroundColor Cyan
                docker-compose up -d
                
                Start-Sleep -Seconds 5
                
                Write-Host "`n✅ Services started!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Access your application:"
                Write-Host "📊 Dashboard: http://localhost:8501"
                Write-Host "🔌 API: http://localhost:8000"
                Write-Host "🔌 API Docs: http://localhost:8000/docs"
                Write-Host "🗄️  Database: localhost:5432"
                Write-Host "📦 Redis: localhost:6379"
                Write-Host ""
                Write-Host "To stop: docker-compose down"
                Write-Host "To view logs: docker-compose logs -f"
                Write-Host ""
                
                $open = Read-Host "Open dashboard in browser? (y/n)"
                if ($open -eq "y") {
                    Start-Process "http://localhost:8501"
                }
            }
        } else {
            Write-Host "❌ Docker not found. Install Docker Desktop:" -ForegroundColor Red
            Write-Host "https://www.docker.com/products/docker-desktop/"
            Write-Host ""
        }
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run again and choose 1-5." -ForegroundColor Red
    }
}

Write-Host "`n📖 For detailed guides, see:" -ForegroundColor Cyan
Write-Host "   - FREE_DEPLOYMENT_GUIDE.md (comprehensive free options)"
Write-Host "   - DEPLOYMENT_GUIDE.md (production deployment)"
Write-Host "   - DOCKER_DEPLOYMENT_GUIDE.md (Docker setup)"
Write-Host ""
Write-Host "Need help? Check the documentation or ask for assistance!" -ForegroundColor Yellow
Write-Host ""
