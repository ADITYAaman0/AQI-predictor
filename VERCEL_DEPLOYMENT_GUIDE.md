# Vercel Deployment Guide — AQI Predictor

## Architecture Overview

Your AQI Predictor has **two main parts** that need separate deployment:

| Component | Technology | Deploy To |
|-----------|-----------|-----------|
| **Frontend Dashboard** | Next.js 16 + React 19 | **Vercel** (this guide) |
| **Backend API** | FastAPI + Python | Railway / Render / Fly.io (see [Backend Deployment](#step-5-deploy-the-backend-api)) |
| **Database** | PostgreSQL (TimescaleDB) | Neon / Supabase / Railway |
| **Cache/Queue** | Redis + Celery | Upstash / Railway |

> **Why not deploy everything to Vercel?**  
> Vercel is optimized for frontend frameworks. Your FastAPI backend requires persistent database connections, WebSockets, Celery workers, and heavy ML libraries (TensorFlow, PyTorch) that exceed Vercel's serverless limits (250MB bundle, 10s timeout on Hobby plan).

---

## Prerequisites

1. **GitHub account** with your code pushed to a repository  
2. **Vercel account** — sign up free at [vercel.com](https://vercel.com)
3. **Node.js 18+** installed locally
4. Backend API already deployed and running (see [Step 5](#step-5-deploy-the-backend-api))

---

## Step 1: Push Your Code to GitHub

If your code is not already on GitHub:

```powershell
# Navigate to project root
cd "E:\AQI Predictor"

# Initialize git (if not done)
git init

# Create .gitignore if missing (important!)
# Make sure these are ignored: .env.local, node_modules/, .next/, __pycache__/, .venv/

# Add all files
git add .
git commit -m "Initial commit - AQI Predictor"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/aqi-predictor.git
git branch -M main
git push -u origin main
```

### Important: Repository Structure

Vercel needs to know your Next.js app is in the `dashboard/` subdirectory. This is configured in Step 3.

---

## Step 2: Connect to Vercel

### Option A: Via Vercel Website (Recommended for first time)

1. Go to [vercel.com/new](https://vercel.com/new) (the page in your screenshot)
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account
4. Select your **aqi-predictor** repository
5. Click **"Import"**

### Option B: Via Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to the dashboard directory
cd "E:\AQI Predictor\dashboard"

# Deploy
vercel
```

---

## Step 3: Configure Project Settings on Vercel

After importing, Vercel will show a configuration screen. Set these values:

### 3.1 Root Directory

> **CRITICAL** — Since your Next.js app lives in `dashboard/`, not the repo root:

| Setting | Value |
|---------|-------|
| **Root Directory** | `dashboard` |

Click "Edit" next to Root Directory and type `dashboard`.

### 3.2 Framework Preset

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Next.js` (should auto-detect) |

### 3.3 Build & Output Settings

These should auto-populate from your `vercel.json`, but verify:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm ci` |

### 3.4 Environment Variables

Click **"Environment Variables"** and add these:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend-url.com` | Production |
| `NEXT_PUBLIC_API_VERSION` | `v1` | All |
| `NEXT_PUBLIC_ENVIRONMENT` | `production` | Production |
| `NEXT_PUBLIC_WS_URL` | `wss://your-backend-url.com/ws` | Production |
| `NEXT_PUBLIC_ENABLE_WEBSOCKET` | `true` | Production |
| `NEXT_PUBLIC_ENABLE_MAPS` | `true` | Production |
| `NEXT_PUBLIC_ENABLE_PWA` | `true` | Production |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `your-mapbox-token` | Production (optional) |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | All |

> **IMPORTANT:** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_VERSION`, and `NEXT_PUBLIC_ENVIRONMENT` are **required** — the build will fail without them.

> **Replace** `https://your-backend-url.com` with your actual backend API URL after deploying it (Step 5).

### 3.5 Click "Deploy"

Vercel will:
1. Clone your repo
2. Navigate to `dashboard/`
3. Run `npm ci`
4. Run `npm run build`
5. Deploy to a `.vercel.app` URL

---

## Step 4: Verify Deployment

After deployment completes:

1. Click the generated URL (e.g., `https://aqi-predictor-dashboard.vercel.app`)
2. Check the dashboard loads correctly
3. Check the health endpoint: `https://your-app.vercel.app/healthz`

### Common Build Errors & Fixes

| Error | Fix |
|-------|-----|
| `Module not found` | Run `npm install` locally first to verify all deps are in `package.json` |
| `Type errors` | Add `typescript.ignoreBuildErrors: true` to `next.config.ts` (temporary fix) |
| `ESLint errors blocking build` | Add `eslint.ignoreDuringBuilds: true` to `next.config.ts` (temporary fix) |
| `Root directory not found` | Make sure you set Root Directory to `dashboard` in Vercel settings |
| `NEXT_PUBLIC_API_BASE_URL undefined` | Ensure env vars are set in Vercel dashboard, redeploy |

---

## Step 5: Deploy the Backend API

Your FastAPI backend needs a platform that supports:
- Long-running Python processes
- PostgreSQL database connections
- Redis connections
- WebSocket support

### Recommended: Railway (Easiest)

1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repository
4. Railway will detect the `Dockerfile` — configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `/` (repo root) |
| **Start Command** | `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT` |

5. Add services:
   - **PostgreSQL** → Click "New" → "Database" → "PostgreSQL"
   - **Redis** → Click "New" → "Database" → "Redis"

6. Set environment variables on the API service:

```
DATABASE_URL=<auto-set from PostgreSQL service>
REDIS_URL=<auto-set from Redis service>
SECRET_KEY=<generate-a-strong-random-key>
ENVIRONMENT=production
```

7. After deploy, copy the public URL (e.g., `https://aqi-api-production.up.railway.app`)

### Alternative: Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `/` |
| **Runtime** | Docker |
| **Start Command** | `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT` |

4. Add PostgreSQL and Redis from Render dashboard
5. Set environment variables

### Alternative: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch from project root
cd "E:\AQI Predictor"
fly launch

# Create PostgreSQL
fly postgres create

# Create Redis (via Upstash)
fly redis create

# Deploy
fly deploy
```

---

## Step 6: Connect Frontend to Backend

After your backend is deployed:

1. Go to your Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Update these variables:

| Variable | New Value |
|----------|-----------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-railway-app.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://your-railway-app.up.railway.app/ws` |

3. Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**

### Configure CORS on Backend

Make sure your FastAPI backend allows requests from your Vercel domain. In `src/api/main.py`, verify the CORS middleware includes your Vercel URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-custom-domain.com",
        "http://localhost:3000",  # for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 7: Set Up Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `dashboard.aqi-predictor.com`)
4. Vercel will show DNS records to add:

| Type | Name | Value |
|------|------|-------|
| **CNAME** | `dashboard` | `cname.vercel-dns.com` |

5. Add these records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
6. Vercel auto-provisions SSL certificates

---

## Step 8: Set Up Automatic Deployments

Vercel automatically deploys when you push to GitHub:

| Branch | Environment |
|--------|-------------|
| `main` | **Production** deployment |
| Other branches | **Preview** deployment (unique URL per PR) |

### Enable Preview Deployments for PRs

This is enabled by default. Every pull request gets its own preview URL.

---

## Step 9: Vercel CLI Commands (Quick Reference)

```powershell
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy from dashboard directory
cd "E:\AQI Predictor\dashboard"
vercel                    # Preview deployment
vercel --prod             # Production deployment

# Pull env vars locally
vercel env pull .env.local

# View logs
vercel logs your-app.vercel.app

# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback
```

---

## Complete Deployment Checklist

```
PRE-DEPLOYMENT
[ ] Code pushed to GitHub repository
[ ] All dependencies in dashboard/package.json
[ ] Environment variables documented
[ ] .gitignore includes .env.local, node_modules/, .next/
[ ] Local build works: cd dashboard && npm run build

VERCEL (FRONTEND)
[ ] Vercel account created
[ ] GitHub repo connected
[ ] Root Directory set to "dashboard"
[ ] Framework detected as Next.js
[ ] Environment variables configured
[ ] First deployment successful
[ ] Dashboard loads in browser

BACKEND
[ ] Backend deployed to Railway/Render/Fly.io
[ ] PostgreSQL database provisioned
[ ] Redis instance provisioned
[ ] Backend API responds at /health
[ ] CORS configured to allow Vercel domain

CONNECTION
[ ] NEXT_PUBLIC_API_BASE_URL points to backend
[ ] NEXT_PUBLIC_WS_URL points to backend WebSocket
[ ] Frontend can fetch data from backend
[ ] Redeployed after env var changes

OPTIONAL
[ ] Custom domain configured
[ ] SSL certificate active
[ ] Monitoring/alerts set up
```

---

## Cost Estimates

### Vercel (Frontend)

| Plan | Cost | Includes |
|------|------|----------|
| **Hobby** (Free) | $0/mo | 100GB bandwidth, 1 project, good for personal/demo |
| **Pro** | $20/mo | Unlimited bandwidth, team features, analytics |

### Railway (Backend + DB + Redis)

| Service | Cost |
|---------|------|
| **API Service** | ~$5-10/mo (usage-based) |
| **PostgreSQL** | ~$5-10/mo |
| **Redis** | ~$3-5/mo |
| **Total** | ~$13-25/mo |

### Free Tier Alternative

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Frontend | Vercel Hobby | 100GB bandwidth |
| Backend | Render Free | 750 hrs/mo (spin-down after 15min idle) |
| Database | Neon Free | 0.5GB storage |
| Redis | Upstash Free | 10K commands/day |

---

## Troubleshooting

### "Build failed" on Vercel

```powershell
# Test the build locally first
cd "E:\AQI Predictor\dashboard"
npm ci
npm run build
```

If there are TypeScript or ESLint errors, you can temporarily bypass them. See the `next.config.ts` modifications in the files created alongside this guide.

### "504 Gateway Timeout" on API calls

Your backend is likely cold-starting (common on free tiers). Solutions:
- Upgrade to a paid plan for always-on
- Add a health check ping (cron job every 5 minutes)

### "CORS Error" in browser console

Add your Vercel URL to the backend's CORS `allow_origins` list and redeploy the backend.

### "Environment variables not working"

- Variables must start with `NEXT_PUBLIC_` to be available in the browser
- After adding/changing env vars, you must **redeploy** (Vercel doesn't hot-reload env vars)
- Check with: open browser console → `console.log(process.env.NEXT_PUBLIC_API_BASE_URL)`

---

## Quick Start Summary

```
1. Push code to GitHub
2. Go to vercel.com/new → Import your repo
3. Set Root Directory: dashboard
4. Add env vars (NEXT_PUBLIC_API_BASE_URL, etc.)
5. Click Deploy
6. Deploy backend to Railway/Render
7. Update NEXT_PUBLIC_API_BASE_URL in Vercel
8. Redeploy → Done!
```
