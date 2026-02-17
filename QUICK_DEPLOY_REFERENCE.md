# 🚀 Quick Deployment Reference - AQI Predictor

## ⚡ FASTEST: Streamlit Cloud (2 minutes)

```bash
# 1. Commit and push
git add .
git commit -m "Deploy to Streamlit"
git push

# 2. Go to: https://share.streamlit.io
# 3. Click "New app" → Select repo → Deploy
# ✅ Done! App live at: https://yourapp.streamlit.app
```

**Limitations:** Dashboard only, no background services

---

## 🏆 RECOMMENDED: Render.com (Full Stack)

```bash
# 1. Create render.yaml (✅ already created)
# 2. Push to GitHub
git add render.yaml requirements-minimal.txt
git commit -m "Add Render config"
git push

# 3. Deploy:
# - Go to: https://render.com
# - New → Blueprint → Select your repo
# - Click "Apply"
# ✅ All services deploy automatically!
```

**What you get:**
- ✅ FastAPI Backend
- ✅ Streamlit Dashboard  
- ✅ PostgreSQL (90 days)
- ✅ Redis (30 days)
- ✅ Background workers

**Cost:** Free → $7/month after 90 days

---

## 💎 BEST VALUE: Hybrid (Forever Free)

**Strategy:** Combine multiple free tiers

### Services:
1. **Database:** [Supabase](https://supabase.com) - 500MB forever
2. **Redis:** [Upstash](https://upstash.com) - 10K commands/day forever
3. **API:** [Render.com](https://render.com) - Free with sleep
4. **Dashboard:** [Streamlit Cloud](https://share.streamlit.io) - Forever free
5. **Cron Jobs:** GitHub Actions - Forever free

### Setup:

```bash
# 1. Create external services
# Supabase: Create project → Copy DATABASE_URL
# Upstash: Create Redis → Copy REDIS_URL

# 2. Deploy API to Render
# Add environment variables in Render dashboard:
# - DATABASE_URL (from Supabase)
# - REDIS_URL (from Upstash)

# 3. Deploy Dashboard to Streamlit Cloud
# Add secrets in Streamlit dashboard:
# - API_URL (from Render)

# 4. Enable GitHub Actions
# Add secrets in repo Settings → Secrets:
# - DATABASE_URL
# - API_URL
# - DASHBOARD_URL
```

**Cost:** $0 forever!

---

## 💻 LOCAL: Docker (Development)

```bash
# Start everything
docker-compose up -d

# Access:
# Dashboard: http://localhost:8501
# API: http://localhost:8000/docs
# Database: localhost:5432

# Stop
docker-compose down
```

**Cost:** $0 (local only)

---

## 🔑 Environment Variables Required

### For API:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/0
OPENWEATHERMAP_API_KEY=your_key
OPENAQ_API_KEY=optional
ENVIRONMENT=production
```

### For Dashboard:
```env
API_URL=https://your-api.onrender.com
DATABASE_URL=postgresql://... (if standalone)
```

### For GitHub Actions:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_URL=https://your-api.onrender.com
DASHBOARD_URL=https://yourapp.streamlit.app
OPENWEATHERMAP_API_KEY=your_key
```

---

## 📊 Cost Comparison

| Platform | Cost | Limitations | Best For |
|----------|------|-------------|----------|
| **Streamlit Cloud** | $0 | Dashboard only | Demos |
| **Render** | $0 → $7/mo | Sleep after 15min | Quick full-stack |
| **Railway** | ~$5/mo | Usage-based | Development |
| **Hybrid** | $0 forever | Complex setup | Production free |
| **Docker** | $0 | Local only | Development |

---

## 🎯 Recommendation by Use Case

### Quick Demo/Prototype
→ **Streamlit Cloud** (Option 3)
- Deploys in 2 minutes
- No backend needed
- Perfect for presentations

### Full Features (Temporarily)
→ **Render.com** (Option 1)
- Everything works
- 90 days free
- Easy setup with render.yaml

### Long-term Free Production
→ **Hybrid Approach** (Option 4)
- All features
- $0 forever
- More setup required

### Development
→ **Local Docker** (Option 5)
- Full control
- All features
- Fast iteration

---

## 🚦 Quick Start Commands

### Deploy to Render:
```bash
git clone your-repo
cd aqi-predictor
git add render.yaml requirements-minimal.txt
git commit -m "Deploy config"
git push
# Then: render.com → New Blueprint → Select repo
```

### Deploy to Streamlit:
```bash
git push origin main
# Then: share.streamlit.io → New app → Select repo
```

### Deploy to Railway:
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Run Locally:
```bash
docker-compose up -d
```

---

## 🆘 Troubleshooting

### "Service won't start"
- Check logs in platform dashboard
- Verify requirements-minimal.txt has all deps
- Check environment variables are set

### "Database connection failed"
- Verify DATABASE_URL format
- Check database is running (for local)
- Whitelist IP (for Supabase)

### "Module not found"
- Add missing package to requirements-minimal.txt
- Rebuild/redeploy

### "Out of memory"
- Remove heavy packages (TensorFlow, PyTorch)
- Use pre-computed models
- Reduce worker concurrency

### "Too many database connections"
- Reduce pool_size in SQLAlchemy
- Use connection pooling in Supabase

---

## 📞 Resources

- **Render Docs:** https://render.com/docs
- **Railway Docs:** https://docs.railway.app
- **Streamlit Docs:** https://docs.streamlit.io
- **Supabase Docs:** https://supabase.com/docs
- **Upstash Docs:** https://docs.upstash.com

---

## 🎬 Next Steps

1. **Choose deployment option** (see recommendations above)
2. **Run deployment script:** `.\quick-deploy.ps1`
3. **Set environment variables**
4. **Test deployment**
5. **Enable monitoring** (optional)

---

**Need help?** Read [FREE_DEPLOYMENT_GUIDE.md](FREE_DEPLOYMENT_GUIDE.md) for detailed instructions!

---

Generated by AQI Predictor Deployment Assistant
Last updated: 2026-02-17
