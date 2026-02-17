# Heroku Deployment Guide

Deploy the AQI Predictor Streamlit dashboard to Heroku.

## Prerequisites

1. **Heroku Account**: Sign up at [heroku.com](https://heroku.com)
2. **Heroku CLI**: Install from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Your code in a Git repository
4. **Backend API**: Deployed and accessible

## Quick Start

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download installer from heroku.com

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
# Create new app
heroku create aqi-predictor-dashboard

# Or use existing app
heroku git:remote -a aqi-predictor-dashboard
```

### 4. Configure Environment Variables

```bash
# Set API URL
heroku config:set API_BASE_URL=https://api.aqi-predictor.example.com

# Set API keys
heroku config:set OPENWEATHER_API_KEY=your_key_here

# Set environment
heroku config:set ENVIRONMENT=production

# Optional: Sentry for monitoring
heroku config:set SENTRY_DSN=your_sentry_dsn
```

### 5. Deploy Files

Copy deployment files to your repository root:

```bash
cp deployment/heroku/Procfile .
cp deployment/heroku/setup.sh .
chmod +x setup.sh
```

### 6. Deploy to Heroku

```bash
# Add and commit files
git add Procfile setup.sh
git commit -m "Add Heroku deployment configuration"

# Push to Heroku
git push heroku main

# Or if using different branch
git push heroku your-branch:main
```

### 7. Open Your App

```bash
heroku open
```

## Configuration Files

### Procfile

Tells Heroku how to run your app:

```
web: sh setup.sh && streamlit run app.py --server.port=$PORT --server.address=0.0.0.0
```

### setup.sh

Configures Streamlit for Heroku:

```bash
#!/bin/bash

mkdir -p ~/.streamlit/

echo "\
[general]\n\
email = \"your-email@domain.com\"\n\
" > ~/.streamlit/credentials.toml

echo "\
[server]\n\
headless = true\n\
enableCORS = false\n\
port = $PORT\n\
" > ~/.streamlit/config.toml
```

### runtime.txt (Optional)

Specify Python version:

```
python-3.11.6
```

## Scaling

### Dyno Types

```bash
# Free tier (sleeps after 30 min inactivity)
heroku ps:scale web=1

# Hobby tier ($7/month, no sleeping)
heroku dyno:type hobby

# Standard tier (more resources)
heroku dyno:type standard-1x
```

### Multiple Dynos

```bash
# Scale to 2 dynos for higher availability
heroku ps:scale web=2
```

## Monitoring

### View Logs

```bash
# Real-time logs
heroku logs --tail

# Last 1000 lines
heroku logs -n 1000

# Filter by source
heroku logs --source app
```

### Metrics

```bash
# View app metrics
heroku metrics

# Or use dashboard
heroku dashboard
```

### Add-ons for Monitoring

```bash
# Papertrail for log management
heroku addons:create papertrail

# New Relic for APM
heroku addons:create newrelic

# Sentry for error tracking
heroku addons:create sentry
```

## Database (If Needed)

If your Streamlit app needs direct database access:

```bash
# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Get database URL
heroku config:get DATABASE_URL

# Set in environment
heroku config:set DATABASE_URL=<url>
```

## Custom Domain

### Add Domain

```bash
# Add custom domain
heroku domains:add dashboard.aqi-predictor.com

# Get DNS target
heroku domains
```

### Configure DNS

Add CNAME record:
```
dashboard.aqi-predictor.com -> your-app.herokuapp.com
```

### SSL Certificate

```bash
# Automatic SSL (requires paid dyno)
heroku certs:auto:enable
```

## Troubleshooting

### App Crashes on Startup

```bash
# Check logs
heroku logs --tail

# Common issues:
# - Missing dependencies in requirements.txt
# - Incorrect Procfile
# - Port binding issues
```

### Slug Size Too Large

```bash
# Check slug size
heroku builds:info

# Reduce size:
# - Remove unnecessary files with .slugignore
# - Optimize dependencies
# - Use smaller base images
```

### Memory Issues

```bash
# Check memory usage
heroku logs --tail | grep "Error R14"

# Solutions:
# - Upgrade dyno type
# - Optimize data loading
# - Use caching effectively
```

### Timeout Issues

```bash
# Heroku has 30-second request timeout
# Solutions:
# - Use async operations
# - Implement background jobs
# - Optimize API calls
```

## .slugignore

Create `.slugignore` to exclude files from deployment:

```
*.md
tests/
.git/
.github/
docs/
*.pyc
__pycache__/
.pytest_cache/
.hypothesis/
*.log
```

## Cost Optimization

### Free Tier
- 550-1000 dyno hours/month
- App sleeps after 30 min inactivity
- Suitable for development/testing

### Hobby Tier ($7/month)
- No sleeping
- Custom domains
- SSL certificates
- Better for production

### Standard Tier ($25-50/month)
- More memory and CPU
- Better performance
- Horizontal scaling

## CI/CD Integration

### GitHub Integration

```bash
# Enable GitHub integration
heroku git:remote -a aqi-predictor-dashboard

# Enable automatic deploys
# Go to Heroku Dashboard > Deploy > GitHub
# Connect repository and enable automatic deploys
```

### GitHub Actions

Create `.github/workflows/heroku-deploy.yml`:

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "aqi-predictor-dashboard"
        heroku_email: "your-email@example.com"
```

## Backup and Recovery

### Backup Configuration

```bash
# Export config
heroku config -s > .env.heroku

# Backup database (if using)
heroku pg:backups:capture
heroku pg:backups:download
```

### Rollback

```bash
# View releases
heroku releases

# Rollback to previous version
heroku rollback v123
```

## Performance Optimization

### Enable Caching

```python
import streamlit as st

@st.cache_data(ttl=300)
def fetch_data():
    # Expensive operation
    pass
```

### Optimize Startup

```python
# Load heavy libraries conditionally
if st.session_state.get('show_advanced'):
    import heavy_library
```

### Use CDN for Static Assets

Host images and large files on CDN instead of in app.

## Limitations

- **Request Timeout**: 30 seconds
- **Dyno Sleeping**: Free tier sleeps after 30 min
- **Memory**: Limited based on dyno type
- **Ephemeral Filesystem**: Files don't persist between restarts

## Migration from Heroku

If you need to migrate:

1. **To AWS**: See `deployment/aws/README.md`
2. **To GCP**: See `deployment/gcp/README.md`
3. **To Kubernetes**: See `k8s/README.md`

## Support

- **Heroku Docs**: [devcenter.heroku.com](https://devcenter.heroku.com)
- **Heroku Support**: Available on paid plans
- **Community**: [stackoverflow.com/questions/tagged/heroku](https://stackoverflow.com/questions/tagged/heroku)

## Next Steps

After deployment:

1. Test application thoroughly
2. Set up monitoring and alerts
3. Configure custom domain
4. Enable automatic SSL
5. Set up CI/CD pipeline
6. Monitor performance and costs
