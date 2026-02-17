#!/usr/bin/env pwsh
# Push to GitHub script

Write-Host "`n🚀 Pushing AQI Predictor to GitHub..." -ForegroundColor Cyan
Write-Host "Repository: https://github.com/ADITYAaman0/aqi-predictor`n" -ForegroundColor Green

# Check if user is ready
$ready = Read-Host "Have you created the GitHub repository? (y/n)"

if ($ready -ne "y") {
    Write-Host "`n⚠️  Please create the repository first:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/new"
    Write-Host "2. Name: aqi-predictor"
    Write-Host "3. Make it PUBLIC"
    Write-Host "4. DO NOT initialize with anything"
    Write-Host "5. Click 'Create repository'"
    Write-Host "`nThen run this script again!`n"
    Start-Process "https://github.com/new"
    exit 0
}

Write-Host "`n📤 Pushing code..." -ForegroundColor Cyan

# Push to GitHub
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Success! Code pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/ADITYAaman0/aqi-predictor" -ForegroundColor Cyan
    Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://render.com/register"
    Write-Host "2. Sign up with your GitHub account"
    Write-Host "3. Click 'New +' → 'Blueprint'"
    Write-Host "4. Select 'aqi-predictor' repository"
    Write-Host "5. Click 'Apply' - Done!"
    Write-Host "`nYour app will be live in ~10 minutes! 🎉`n" -ForegroundColor Green
    
    $openRender = Read-Host "Open Render.com now? (y/n)"
    if ($openRender -eq "y") {
        Start-Process "https://render.com/register"
    }
} else {
    Write-Host "`n❌ Push failed!" -ForegroundColor Red
    Write-Host "Make sure:"
    Write-Host "1. Repository exists on GitHub"
    Write-Host "2. You're logged into GitHub in your browser"
    Write-Host "3. Try authenticating with: gh auth login"
    Write-Host ""
}
