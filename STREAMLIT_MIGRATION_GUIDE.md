# Streamlit Dashboard Migration Guide

## Overview

The Streamlit dashboard has been migrated to use the FastAPI backend service instead of direct data access. This provides better separation of concerns, improved scalability, and consistent data access patterns.

## Architecture Changes

### Before Migration
```
Streamlit App → Direct Data Access → External APIs
                ↓
                Local Models
```

### After Migration
```
Streamlit App → API Client → FastAPI Backend → External APIs
                                              → Database
                                              → ML Models
```

## Key Changes

### 1. API Client Integration
- New `src/ui/api_client.py` module provides HTTP client for backend communication
- Singleton pattern ensures single client instance across app
- Automatic retry logic for failed requests
- Comprehensive error handling

### 2. Error Handling
- Connection errors display user-friendly messages
- API errors show specific error details
- Graceful degradation when backend unavailable
- Health check on app startup

### 3. Authentication Support
- Optional API key authentication
- Configured via environment variables
- Supports both authenticated and anonymous access

## Configuration

### Environment Variables

Create `.env.streamlit` file:

```bash
# API Backend URL
API_BASE_URL=http://localhost:8000

# Optional API Key
API_KEY=your_api_key_here

# Environment
ENVIRONMENT=development
```

### Streamlit Configuration

The `.streamlit/config.toml` file configures:
- Server port (8501)
- CORS settings
- Theme colors
- Security settings

## Running the Dashboard

### Prerequisites

1. **Start the FastAPI backend**:
   ```bash
   uvicorn src.api.main:app --reload
   ```

2. **Verify backend is running**:
   ```bash
   curl http://localhost:8000/health
   ```

### Start Dashboard

```bash
streamlit run app.py
```

The dashboard will:
1. Check API health on startup
2. Display error if backend unavailable
3. Provide instructions to start backend

## API Endpoints Used

The dashboard uses the following backend endpoints:

### Forecast Endpoints
- `GET /api/v1/forecast/current/{location}` - Current AQI data
- `GET /api/v1/forecast/24h/{location}` - 24-hour forecast
- `GET /api/v1/forecast/spatial` - Spatial grid predictions

### Attribution Endpoints
- `GET /api/v1/attribution/{location}` - Source attribution
- `POST /api/v1/attribution/scenario` - Policy scenario analysis

### Data Endpoints
- `GET /api/v1/data/historical/{location}` - Historical data
- `GET /api/v1/cities` - Supported cities list

### Alert Endpoints
- `POST /api/v1/alerts/subscribe` - Create alert subscription
- `GET /api/v1/alerts/history` - Alert history

## Error Handling

### Connection Errors
```python
try:
    data = api_client.get_current_forecast("Delhi")
except APIConnectionError as e:
    st.error(f"Connection Error: {str(e)}")
    st.info("Please ensure API service is running")
```

### API Response Errors
```python
try:
    data = api_client.get_current_forecast("InvalidCity")
except APIResponseError as e:
    st.error(f"API Error: {str(e)}")
```

## Features

### Implemented
- ✅ Current AQI display via API
- ✅ 24-hour forecast from backend
- ✅ Source attribution analysis
- ✅ Historical data browser
- ✅ Alert subscription management
- ✅ API health monitoring
- ✅ Error handling and retry logic

### Pending (Task 12.2 & 12.3)
- ⏳ Interactive spatial heatmaps
- ⏳ Route-based analysis
- ⏳ Data export functionality
- ⏳ Mobile-responsive enhancements
- ⏳ Offline mode with caching
- ⏳ PWA features

## Troubleshooting

### Dashboard shows "Unable to connect to API"
1. Check if FastAPI backend is running: `curl http://localhost:8000/health`
2. Verify API_BASE_URL in `.env.streamlit`
3. Check firewall/network settings

### "API Error (401): Unauthorized"
1. Check if API requires authentication
2. Set API_KEY in `.env.streamlit`
3. Verify API key is valid

### Slow response times
1. Check backend logs for performance issues
2. Verify database connection
3. Check Redis cache status
4. Monitor network latency

## Development

### Adding New API Endpoints

1. **Add method to API client**:
```python
# src/ui/api_client.py
@retry_on_failure(max_retries=3, delay=1)
def get_new_feature(self, param: str) -> Dict[str, Any]:
    return self._make_request("GET", f"/api/v1/new-feature/{param}")
```

2. **Use in Streamlit app**:
```python
# app.py
api_client = get_api_client()
data = api_client.get_new_feature("value")
```

### Testing

Test API client independently:
```python
from src.ui.api_client import AQIAPIClient

client = AQIAPIClient("http://localhost:8000")
assert client.health_check()

data = client.get_current_forecast("Delhi")
print(data)
```

## Migration Checklist

- [x] Create API client module
- [x] Update main app to use API client
- [x] Add error handling for API failures
- [x] Add health check on startup
- [x] Update dashboard page
- [x] Update forecast page
- [x] Update sources page
- [x] Update history page
- [x] Update settings page
- [x] Add configuration files
- [x] Create migration documentation
- [ ] Add spatial heatmap integration (Task 12.2)
- [ ] Add route analysis (Task 12.2)
- [ ] Add data export (Task 12.2)
- [ ] Add mobile responsiveness (Task 12.3)
- [ ] Add offline mode (Task 12.3)
- [ ] Add PWA features (Task 12.3)

## Next Steps

See Task 12.2 and 12.3 for:
- Advanced dashboard features
- Mobile-responsive enhancements
- Offline capabilities
- PWA implementation
