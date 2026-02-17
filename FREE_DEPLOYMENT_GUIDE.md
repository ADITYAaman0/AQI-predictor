# 🚀 Free Deployment Guide - AQI Predictor

Complete guide to deploy your AQI Predictor app **100% FREE** with various options and their trade-offs.

## 📊 Deployment Options Comparison

| Platform | Services | Database | Background Jobs | ML Models | Cost (Monthly) |
|----------|----------|----------|-----------------|-----------|----------------|
| **Render** | ✅ API + Dashboard | ✅ PostgreSQL (90 days) | ✅ Celery | ⚠️ Limited | $0 (then $7) |
| **Railway** | ✅ API + Dashboard | ✅ PostgreSQL | ✅ Workers | ⚠️ Limited | $5 credit |
| **Streamlit Cloud** | ✅ Dashboard Only | ❌ | ❌ | ✅ | $0 |
| **Vercel + Supabase** | ⚠️ Serverless API | ✅ PostgreSQL | ❌ | ❌ | $0 |
| **Heroku** | ✅ | ✅ | ✅ | ⚠️ | $0 (550 hrs) |
| **PythonAnywhere** | ⚠️ Limited | ✅ MySQL | ❌ | ❌ | $0 |

---

## 🎯 **Option 1: Render.com (BEST for Full-Stack)**

**What You Get FREE:**
- ✅ FastAPI Backend
- ✅ Streamlit Dashboard
- ✅ PostgreSQL Database (90 days free)
- ✅ Redis (25MB, 30 days)
- ✅ Celery Background Workers
- ⚠️ Limited: Services sleep after 15min, 512MB RAM

### Step-by-Step Setup:

#### 1. Create `render.yaml` Blueprint

```yaml
# render.yaml - Infrastructure as Code
services:
  - type: web
    name: aqi-api
    runtime: python
    buildCommand: "pip install -r requirements-minimal.txt"
    startCommand: "uvicorn src.api.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.10.0
      - key: DATABASE_URL
        fromDatabase:
          name: aqi-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: aqi-redis
          type: redis
          property: connectionString
    healthCheckPath: /health

  - type: web
    name: aqi-dashboard
    runtime: python
    buildCommand: "pip install -r requirements-minimal.txt"
    startCommand: "streamlit run app.py --server.port $PORT --server.address 0.0.0.0"
    envVars:
      - key: API_URL
        fromService:
          name: aqi-api
          type: web
          property: host

  - type: worker
    name: aqi-celery
    runtime: python
    buildCommand: "pip install -r requirements-minimal.txt"
    startCommand: "celery -A src.tasks.celery_app worker --loglevel=info"
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: aqi-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: aqi-redis
          type: redis
          property: connectionString

databases:
  - name: aqi-db
    databaseName: aqi_predictor
    user: aqi_user
    plan: free  # 90 days free, then $7/month

  - name: aqi-redis
    type: redis
    plan: free  # 25MB, 30 days free
```

#### 2. Create Lightweight Requirements

```bash
# requirements-minimal.txt
# Reduce memory footprint for free tier
streamlit>=1.30.0
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
psycopg2-binary==2.9.9
redis==5.0.1
celery==5.3.4
pandas>=2.1.0
numpy>=1.26.0
xgboost>=2.0.0  # Lighter than TensorFlow
scikit-learn>=1.3.0
plotly>=5.18.0
requests>=2.31.0
python-dotenv>=1.0.0
python-jose[cryptography]==3.3.0

# Remove heavy packages for free tier:
# tensorflow - Use joblib models instead
# torch - Too large for 512MB RAM
# h5py, netCDF4 - Satellite features disabled
```

#### 3. Deploy to Render

```bash
# Connect GitHub repo and deploy
1. Go to https://render.com
2. Connect your GitHub repository
3. Click "New" → "Blueprint"
4. Select your repo with render.yaml
5. Click "Apply" - Done!
```

**Free Tier Limits:**
- ⏱️ Services spin down after 15 min inactivity (cold start: 30s)
- 💾 512 MB RAM per service
- 🔄 Automatic deploys on git push
- 📊 Database: 90 days free (256 MB), then $7/month

---

## 🌟 **Option 2: Railway.app (Best ML Support)**

**What You Get:**
- $5 free credit (≈100 hours)
- Better ML model support (higher memory)
- All services supported
- PostgreSQL + Redis included

### Deploy Command:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis

# Set environment variables
railway variables set DATABASE_URL=${{POSTGRESQL_URL}}
railway variables set REDIS_URL=${{REDIS_URL}}
```

**Configuration:**

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn src.api.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create `Procfile`:
```procfile
web: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT
worker: celery -A src.tasks.celery_app worker --loglevel=info
beat: celery -A src.tasks.celery_app beat --loglevel=info
dashboard: streamlit run app.py --server.port $PORT --server.address 0.0.0.0
```

---

## 🎨 **Option 3: Streamlit Community Cloud (Easiest - Dashboard Only)**

**What You Get FREE:**
- ✅ Unlimited Streamlit apps
- ✅ Auto-deploy from GitHub
- ✅ HTTPS included
- ❌ Backend services (use external API)
- ❌ Database (use Supabase free tier)

### Setup:

1. **Simplify app.py to standalone:**

```python
# Use SQLite instead of PostgreSQL
# Use in-memory cache instead of Redis
# Use background threads instead of Celery
```

2. **Deploy:**
```bash
1. Push to GitHub
2. Go to https://share.streamlit.io
3. Connect repo → Select app.py → Deploy
4. Done in 2 minutes!
```

**Free Limits:**
- 1 GB RAM
- Unlimited apps
- No secrets

---

## 🔥 **Option 4: Hybrid Approach (MAXIMUM FREE)**

Combine multiple free tiers:

### Architecture:
```
┌─────────────────────────────────────────────┐
│  Streamlit Cloud (Dashboard) - FREE         │
│  https://yourapp.streamlit.app              │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────┐
│  Render.com (FastAPI) - FREE                 │
│  https://aqi-api.onrender.com                │
└──────────────────┬───────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ↓                   ↓
┌─────────────────┐  ┌──────────────────┐
│ Supabase (DB)   │  │  Upstash (Redis) │
│ FREE - 500MB    │  │  FREE - 10K cmds │
└─────────────────┘  └──────────────────┘
```

### Component Breakdown:

#### A. **Database: Supabase (PostgreSQL)**
- FREE: 500 MB storage, 2 GB bandwidth
- Sign up: https://supabase.com
- Get connection string

#### B. **Cache: Upstash Redis**
- FREE: 10,000 commands/day
- Sign up: https://upstash.com
- Get Redis URL

#### C. **API: Render.com**
Deploy FastAPI backend

#### D. **Dashboard: Streamlit Cloud**
Deploy Streamlit frontend

#### E. **Background Jobs: GitHub Actions (FREE)**
Use scheduled workflows for data ingestion:

```yaml
# .github/workflows/data-ingestion.yml
name: Automated Data Ingestion
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: pip install requests psycopg2-binary
      - name: Run ingestion
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python src/tasks/ingest_data.py
```

### Deploy Instructions:

```bash
# 1. Set up external services
# - Create Supabase project → Get DATABASE_URL
# - Create Upstash Redis → Get REDIS_URL

# 2. Deploy API to Render
git push origin main
# In Render dashboard: New Web Service → Connect repo

# 3. Deploy Dashboard to Streamlit Cloud
# Connect GitHub → Deploy

# 4. Set up GitHub Actions
# Add secrets in repo settings
```

---

## 💻 **Option 5: Local Docker (Development)**

Run locally with all features:

```bash
# Use docker-compose for full stack
docker-compose up -d

# Access:
# Dashboard: http://localhost:8501
# API: http://localhost:8000
# Database: localhost:5432
# Redis: localhost:6379
```

**Use Case:** Development and testing

---

## 🔧 **Option 6: Heroku (Classic)**

**Free Tier (Requires Credit Card):**
- 550 dyno hours/month
- PostgreSQL (10K rows)
- Redis (25 MB via Upstash addon)

### Deploy:

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create aqi-predictor-api
heroku create aqi-predictor-dashboard

# Add addons
heroku addons:create heroku-postgresql:mini
heroku addons:create upstash-redis:free

# Deploy
git push heroku main

# Scale workers
heroku ps:scale web=1 worker=1
```

Create `Procfile`:
```procfile
web: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT
worker: celery -A src.tasks.celery_app worker --loglevel=info
```

---

## 📦 **Optimizations for Free Tier**

### 1. Reduce Memory Usage

```python
# Use lightweight models
# Replace TensorFlow with joblib/pickle models

import joblib
model = joblib.load('model_xgboost.pkl')  # ~50MB vs TensorFlow ~500MB
```

### 2. Lazy Loading

```python
# Load models only when needed
@st.cache_resource
def load_model():
    return joblib.load('model.pkl')

model = load_model()  # Cached, loads once
```

### 3. Database Connection Pooling

```python
# Reduce database connections
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=2,  # Minimum for free tier
    max_overflow=0
)
```

### 4. Reduce Dependencies

Create `requirements-minimal.txt`:
```txt
# Core only
streamlit
fastapi
uvicorn
psycopg2-binary
xgboost
pandas
numpy
plotly
```

### 5. Use CDN for Static Assets

```python
# Store images on imgbb.com, postimages.org
# Store data on GitHub raw URLs
```

---

## 🎯 **Recommended Strategy: START SIMPLE**

### Phase 1: MVP (100% Free Forever)
**Deploy:**
1. **Streamlit Cloud** - Dashboard only
2. **Use SimplifiedSQLite locally** or **Supabase** for DB
3. **No background workers** - fetch data on-demand

**What Works:**
- ✅ Dashboard with predictions
- ✅ Manual data refresh
- ✅ Basic predictions (XGBoost)
- ❌ No automated ingestion
- ❌ No heavy ML models

### Phase 2: Add Backend (Free for 90 days)
**Deploy:**
1. Streamlit Cloud - Dashboard
2. **Render.com** - FastAPI + PostgreSQL
3. **Upstash** - Redis

**What Works:**
- ✅ Full API
- ✅ Database storage
- ✅ Advanced predictions
- ⚠️ Background jobs limited

### Phase 3: Scale (Paid ~$12/month)
**Deploy:**
- Everything on Railway or Render
- PostgreSQL ($7/month)
- Redis ($5/month)

---

## 🚀 **Quick Start: Deploy in 5 Minutes**

### Simplest Free Deployment:

```bash
# 1. Create standalone Streamlit app (no backend)
# 2. Push to GitHub
git add .
git commit -m "Streamlit standalone"
git push

# 3. Deploy to Streamlit Cloud
# Go to https://share.streamlit.io
# Click "New app" → Select repo → Deploy

# Done! Your app is live at:
# https://yourapp.streamlit.app
```

---

## 💡 **Cost-Benefit Analysis**

| Approach | Monthly Cost | Limitations | Best For |
|----------|--------------|-------------|----------|
| Streamlit Cloud Only | $0 | No backend services | Demos, prototypes |
| Render (90 days) | $0 → $7 | Services sleep, low RAM | Small apps |
| Railway (credit) | ~$5/mo | Usage-based billing | Development |
| Hybrid (Multi-Platform) | $0 | Complex setup | Production-ready free |
| Full Local Docker | $0 | Not publicly accessible | Development |

---

## 🛠️ **Next Steps**

### To Deploy Right Now:

1. **Choose your path:**
   - Quick demo? → Streamlit Cloud (Option 3)
   - Full features temporarily? → Render (Option 1)
   - Best free combo? → Hybrid (Option 4)

2. **Simplify dependencies:**
   ```bash
   # Create minimal requirements
   cp requirements.txt requirements-minimal.txt
   # Remove: tensorflow, torch, h5py, netCDF4
   ```

3. **Add deployment configs:**
   - For Render: Create `render.yaml`
   - For Railway: Create `railway.json` + `Procfile`
   - For Streamlit: Just push to GitHub

4. **Set environment variables:**
   - `DATABASE_URL`
   - `REDIS_URL`
   - `API_KEY` (if needed)

---

## 📞 **Support Resources**

- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app
- **Streamlit Cloud**: https://docs.streamlit.io/streamlit-community-cloud
- **Supabase**: https://supabase.com/docs
- **Upstash Redis**: https://docs.upstash.com/redis

---

## ⚠️ **Important Notes**

### Free Tier Gotchas:

1. **Render**: Services sleep after 15min → 30s cold start
2. **Railway**: $5 credit runs out → app stops
3. **Streamlit Cloud**: Public by default (set secrets properly)
4. **Supabase**: 500MB limit → implement data rotation
5. **Upstash**: 10K commands/day → cache aggressively

### Workarounds:

```python
# Keep service awake
# Create a GitHub Action to ping every 10 minutes
# .github/workflows/keep-alive.yml
name: Keep Alive
on:
  schedule:
    - cron: '*/10 * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping
        run: curl https://your-api.onrender.com/health
```

---

## 🎉 **Conclusion**

For **100% FREE deployment with ALL features**, I recommend:

### **Best Option: Hybrid Approach**
- ✅ Streamlit Cloud (Dashboard)
- ✅ Render.com (API) - Free for 90 days
- ✅ Supabase (Database) - Free forever
- ✅ Upstash (Redis) - Free forever
- ✅ GitHub Actions (Background jobs) - Free forever

This gives you a fully functional app for FREE!

---

Need help with deployment? Let me know which option you'd like to implement! 🚀
