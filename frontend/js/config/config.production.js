/**
 * Production environment configuration
 * Optimized for performance and security
 */

export default {
    // Environment identifier
    ENVIRONMENT: 'production',
    
    // API endpoints - relative paths for same-origin requests
    API_BASE_URL: '/api/v1',
    INTEGRATION_BASE_URL: '/api/v1/integration',
    
    // Debug settings - minimal logging in production
    DEBUG: false,
    LOG_LEVEL: 'error',
    ENABLE_CONSOLE_LOGS: false,
    
    // Performance settings - optimized for production
    DATA_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes
    CACHE_TTL: 15 * 60 * 1000, // 15 minutes
    
    // API timeouts
    API_TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
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
    ANIMATION_SPEED: 1000, // Fast for production
    ANIMATION_PRELOAD_FRAMES: 3,
    
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
    ERROR_DISPLAY_DURATION: 5000,
    
    // Feature flags
    ENABLE_MOCK_DATA: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_REPORTING: true,
};
