/**
 * Development environment configuration
 * Used when running locally or in development containers
 */

export default {
    // Environment identifier
    ENVIRONMENT: 'development',
    
    // API endpoints - point to local backend
    API_BASE_URL: 'http://localhost:8000/api/v1',
    INTEGRATION_BASE_URL: 'http://localhost:8000/api/v1/integration',
    
    // Debug settings
    DEBUG: true,
    LOG_LEVEL: 'debug',
    ENABLE_CONSOLE_LOGS: true,
    
    // Performance settings - faster refresh for development
    DATA_REFRESH_INTERVAL: 2 * 60 * 1000, // 2 minutes
    CACHE_TTL: 30 * 1000, // 30 seconds
    
    // API timeouts - more lenient for debugging
    API_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000,
    
    // Map settings
    MAP_CENTER: [28.6139, 77.2090], // Delhi
    MAP_ZOOM: 10,
    MAP_MIN_ZOOM: 6,
    MAP_MAX_ZOOM: 18,
    
    // Tile configuration
    TILE_URL: 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://openfreemap.org">OpenFreeMap</a>',
    
    // Animation settings
    ANIMATION_SPEED: 2000, // Slower for debugging
    ANIMATION_PRELOAD_FRAMES: 2,
    
    // Clustering and visualization
    MARKER_CLUSTER_MAX_ZOOM: 15,
    MARKER_CLUSTER_RADIUS: 50,
    HEATMAP_RADIUS: 25,
    HEATMAP_BLUR: 15,
    
    // UI settings
    POPUP_MAX_WIDTH: 300,
    MOBILE_BREAKPOINT: 768,
    
    // Data limits
    MAX_STATIONS: 1000,
    MAX_FORECAST_HOURS: 24,
    
    // Error handling
    OFFLINE_CACHE_DURATION: 24 * 60 * 60 * 1000,
    ERROR_DISPLAY_DURATION: 10000, // 10 seconds for debugging
    
    // Feature flags
    ENABLE_MOCK_DATA: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_REPORTING: false,
};
