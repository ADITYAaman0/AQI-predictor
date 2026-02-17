# Streamlit Cloud Deployment Guide

This guide covers deploying the AQI Predictor dashboard to Streamlit Cloud.

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **Streamlit Cloud Account**: Sign up at [share.streamlit.io](https://share.streamlit.io)
3. **Backend API**: Your FastAPI backend must be deployed and accessible

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository has:

- `app.py` - Main Streamlit application
- `requirements.txt` - Python dependencies
- `.streamlit/config.toml` - Streamlit configuration
- `.streamlit/secrets.toml.example` - Secrets template

### 2. Configure Secrets

In Streamlit Cloud dashboard:

1. Go to your app settings
2. Click on "Secrets" in the left sidebar
3. Add the following secrets:

```toml
[api]
base_url = "https://api.aqi-predictor.example.com"
timeout = 30

[openweather]
api_key = "your_openweather_api_key"

[monitoring]
sentry_dsn = "your_sentry_dsn"  # Optional
```

### 3. Deploy to Streamlit Cloud

1. **Login to Streamlit Cloud**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Sign in with GitHub

2. **Create New App**
   - Click "New app"
   - Select your repository
   - Choose branch (usually `main` or `master`)
   - Set main file path: `app.py`
   - Click "Deploy"

3. **Configure Advanced Settings**
   - Python version: 3.11
   - Custom subdomain (optional)

### 4. Environment Variables

Set these in the Streamlit Cloud dashboard under "Advanced settings":

```
ENVIRONMENT=production
API_BASE_URL=https://api.aqi-predictor.example.com
```

### 5. Custom Domain (Optional)

To use a custom domain:

1. Go to app settings
2. Click "Custom domain"
3. Follow instructions to configure DNS
4. Add CNAME record pointing to your Streamlit Cloud URL

## Configuration Files

### .streamlit/config.toml

```toml
[server]
port = 8501
enableCORS = false
enableXsrfProtection = true
maxUploadSize = 200

[browser]
gatherUsageStats = false
serverAddress = "0.0.0.0"

[theme]
primaryColor = "#FF4B4B"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
font = "sans serif"
```

### requirements.txt

Ensure all dependencies are listed:

```
streamlit>=1.28.0
requests>=2.31.0
pandas>=2.0.0
plotly>=5.17.0
folium>=0.14.0
streamlit-folium>=0.15.0
pydeck>=0.8.0
```

## Monitoring and Logs

### View Logs

1. Go to your app in Streamlit Cloud
2. Click "Manage app"
3. View logs in real-time

### Error Tracking

If you configured Sentry:

```python
import sentry_sdk
from streamlit import secrets

if "monitoring" in secrets and "sentry_dsn" in secrets["monitoring"]:
    sentry_sdk.init(
        dsn=secrets["monitoring"]["sentry_dsn"],
        environment="production",
        traces_sample_rate=0.1
    )
```

## Limitations

Streamlit Cloud has some limitations:

- **Resources**: Limited CPU and memory
- **Concurrent Users**: May experience slowdowns with many users
- **Uptime**: Not guaranteed for free tier
- **Custom Domains**: Available on paid plans

For production workloads, consider:
- Streamlit Cloud Teams/Enterprise
- Self-hosted deployment (see other guides)

## Troubleshooting

### App Won't Start

1. Check logs for errors
2. Verify `requirements.txt` is complete
3. Ensure Python version compatibility
4. Check secrets are configured correctly

### API Connection Issues

1. Verify API URL is correct
2. Check API is accessible from internet
3. Verify CORS is configured on API
4. Check API authentication

### Performance Issues

1. Optimize data loading with caching
2. Use `@st.cache_data` for expensive operations
3. Limit data fetched from API
4. Consider pagination for large datasets

### Secrets Not Working

1. Verify secrets format in dashboard
2. Check for typos in secret keys
3. Restart app after updating secrets
4. Use `st.secrets` to access values

## Best Practices

1. **Use Caching**: Cache API responses and expensive computations
   ```python
   @st.cache_data(ttl=300)
   def fetch_current_aqi(location):
       return api_client.get_current_aqi(location)
   ```

2. **Error Handling**: Gracefully handle API failures
   ```python
   try:
       data = fetch_data()
   except Exception as e:
       st.error(f"Failed to load data: {e}")
       st.stop()
   ```

3. **Loading States**: Show progress to users
   ```python
   with st.spinner("Loading data..."):
       data = fetch_data()
   ```

4. **Session State**: Use for user preferences
   ```python
   if 'location' not in st.session_state:
       st.session_state.location = 'Delhi'
   ```

## Updating Your App

Streamlit Cloud automatically redeploys when you push to your repository:

1. Make changes locally
2. Commit and push to GitHub
3. Streamlit Cloud detects changes
4. App automatically redeploys

To manually trigger redeployment:
1. Go to app settings
2. Click "Reboot app"

## Cost Considerations

### Free Tier
- 1 private app
- Unlimited public apps
- Community support
- Basic resources

### Teams Plan
- Multiple private apps
- Custom domains
- Priority support
- More resources
- SSO authentication

### Enterprise Plan
- Dedicated resources
- SLA guarantees
- Advanced security
- Custom deployment options

## Migration to Self-Hosted

If you outgrow Streamlit Cloud:

1. Use Docker deployment (see `deployment/docker/`)
2. Deploy to cloud provider (see `deployment/aws/`, `deployment/gcp/`)
3. Use Kubernetes (see `k8s/`)

## Support

- **Streamlit Docs**: [docs.streamlit.io](https://docs.streamlit.io)
- **Community Forum**: [discuss.streamlit.io](https://discuss.streamlit.io)
- **GitHub Issues**: Report bugs in your repository

## Next Steps

After deployment:

1. Test all features work correctly
2. Monitor performance and errors
3. Set up custom domain (if needed)
4. Configure monitoring and alerts
5. Document any custom configuration
