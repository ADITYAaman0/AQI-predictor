# Leaflet.js Frontend - AQI Predictor

Interactive map-based frontend for the AQI Predictor system using Leaflet.js and OpenFreeMap.

## Features

- **Interactive Map**: Leaflet.js with OpenFreeMap tiles
- **Real-time Data**: Live AQI measurements and forecasts
- **Multiple Visualizations**: Markers with clustering and heatmap overlays
- **Forecast Animation**: 24-hour forecast with timeline controls
- **Mobile Responsive**: Touch-friendly interface for mobile devices
- **Offline Support**: Graceful degradation with cached data
- **Authentication**: JWT token integration with existing backend

## Architecture

```
frontend/
├── css/
│   └── styles.css              # Main stylesheet
├── js/
│   ├── components/             # Core UI components
│   │   ├── map-controller.js   # Map initialization and controls
│   │   ├── data-loader.js      # API communication
│   │   ├── layer-manager.js    # Map layers and popups
│   │   └── animation-controller.js # Forecast animation
│   ├── integration/            # Backend integration layer
│   │   ├── api-router.js       # API endpoint routing
│   │   ├── data-transformer.js # Data format conversion
│   │   ├── cache-controller.js # Client-side caching
│   │   └── auth-manager.js     # Authentication handling
│   ├── config/
│   │   └── config.js           # Environment configuration
│   ├── utils/
│   │   └── error-handler.js    # Error handling and user feedback
│   └── app.js                  # Main application entry point
├── index.html                  # Main HTML file
├── serve-dev.py               # Development server (Python)
├── serve-dev.bat              # Development server (Windows)
└── README.md                  # This file
```

## Development Setup

### Prerequisites

- Python 3.7+ (for development server)
- Running AQI Predictor backend (see main project README)

### Quick Start

1. **Start the backend services:**
   ```bash
   # From project root
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Start the frontend development server:**
   
   **On Windows:**
   ```cmd
   cd frontend
   serve-dev.bat
   ```
   
   **On Linux/Mac:**
   ```bash
   cd frontend
   python3 serve-dev.py
   ```

3. **Open your browser:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000/api/v1
   - API Documentation: http://localhost:8000/docs

### Configuration

The frontend automatically detects the environment and configures itself:

- **Development**: `localhost:8080` → API at `localhost:8000`
- **Production**: Same domain → API at `/api/v1`

Environment-specific settings are in `js/config/config.js`.

## Usage

### Basic Navigation

- **View Toggle**: Switch between Current and Forecast views
- **Visualization Toggle**: Switch between Markers and Heatmap
- **Map Controls**: Zoom, pan, and click for station details

### Forecast Animation

When in Forecast view:
- **Play/Pause**: Start/stop the 24-hour animation
- **Timeline Scrubber**: Jump to specific hours
- **Reset**: Return to hour 0

### Keyboard Shortcuts

- `Space`: Play/pause forecast animation
- `R`: Reset animation to beginning
- `M`: Toggle markers/heatmap visualization
- `F`: Toggle current/forecast view

### Mobile Features

- Touch-friendly controls
- Responsive layout
- Optimized marker clustering
- Reduced data usage

## API Integration

The frontend integrates with existing backend endpoints:

| Frontend Feature | Backend Endpoint | Purpose |
|------------------|------------------|---------|
| Current AQI Data | `/api/v1/data/air-quality/latest` | Live measurements |
| Monitoring Stations | `/api/v1/data/stations` | Station locations |
| 24h Forecast | `/api/v1/forecast/24h/{location}` | Forecast animation |
| Spatial Data | `/api/v1/forecast/spatial` | Heatmap visualization |
| Authentication | `/api/v1/auth/*` | JWT token management |

### Data Transformation

The integration layer automatically converts backend responses to GeoJSON format for map visualization while preserving all original data fields.

## Caching Strategy

- **Browser Cache API**: Primary caching mechanism
- **LocalStorage**: Fallback for older browsers
- **Memory Cache**: Last resort for unsupported environments
- **Offline Data**: Cached data for offline scenarios

Cache TTL:
- Development: 30 seconds
- Production: 15 minutes
- Offline fallback: 24 hours

## Error Handling

The frontend provides graceful error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Redirect to login with state preservation
- **Data Errors**: Fallback to cached data with user notification
- **Offline Mode**: Cached data with staleness indicators

## Performance Optimization

- **Marker Clustering**: Efficient handling of large datasets
- **Data Compression**: Client-side compression for cache storage
- **Progressive Loading**: Lazy loading of non-critical features
- **Frame Preloading**: Smooth forecast animation
- **Mobile Optimization**: Reduced data usage and touch-friendly UI

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile**: iOS Safari 13+, Android Chrome 80+
- **Features**: ES6 modules, Fetch API, Cache API, LocalStorage

## Troubleshooting

### Common Issues

1. **Map not loading**:
   - Check browser console for JavaScript errors
   - Verify backend is running at `localhost:8000`
   - Check network connectivity

2. **No data displayed**:
   - Verify backend API is accessible
   - Check browser network tab for failed requests
   - Look for authentication errors

3. **Animation not working**:
   - Ensure forecast data is available
   - Check console for loading errors
   - Verify you're in forecast view mode

### Debug Mode

Enable debug mode by setting `DEBUG: true` in `js/config/config.js`:
- Detailed console logging
- Error stack traces
- Performance metrics
- Cache statistics

### Development Tools

Access debug information in browser console:
```javascript
// Get application statistics
window.getAppStats()

// Access main app instance
window.aqiApp
```

## Contributing

When contributing to the frontend:

1. Follow the existing code structure
2. Add JSDoc comments for new functions
3. Test on both desktop and mobile
4. Verify offline functionality
5. Check browser console for errors

## Integration with Existing System

This frontend is designed to work alongside the existing Streamlit dashboard:

- **Backward Compatibility**: Existing API endpoints unchanged
- **Dual Frontend Support**: Both interfaces can run simultaneously
- **Shared Authentication**: Uses same JWT token system
- **Unified Deployment**: Served through same Nginx reverse proxy

The integration layer ensures no modifications are needed to the existing backend infrastructure.