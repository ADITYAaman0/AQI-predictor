/**
 * Configuration management for different environments
 * Automatically loads the appropriate configuration based on environment detection
 */

// Import environment-specific configurations
import developmentConfig from './config.development.js';
import stagingConfig from './config.staging.js';
import productionConfig from './config.production.js';

/**
 * Detect the current environment based on hostname and URL
 * @returns {string} Environment name: 'development', 'staging', or 'production'
 */
const detectEnvironment = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Development: localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }
    
    // Staging: hostname contains 'staging'
    if (hostname.includes('staging')) {
        return 'staging';
    }
    
    // Production: everything else
    return 'production';
};

/**
 * Get configuration for the detected environment
 * @returns {Object} Configuration object
 */
const getEnvironmentConfig = () => {
    const environment = detectEnvironment();
    
    switch (environment) {
        case 'development':
            return developmentConfig;
        case 'staging':
            return stagingConfig;
        case 'production':
            return productionConfig;
        default:
            console.warn(`Unknown environment: ${environment}, using production config`);
            return productionConfig;
    }
};

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
const validateConfig = (config) => {
    // Required fields
    const required = [
        'ENVIRONMENT',
        'API_BASE_URL',
        'INTEGRATION_BASE_URL',
        'MAP_CENTER',
        'TILE_URL'
    ];
    
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    // Validate map center coordinates
    if (!Array.isArray(config.MAP_CENTER) || config.MAP_CENTER.length !== 2) {
        throw new Error('MAP_CENTER must be an array of [latitude, longitude]');
    }
    
    const [lat, lng] = config.MAP_CENTER;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('MAP_CENTER coordinates must be numbers');
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('MAP_CENTER coordinates are out of valid range');
    }
    
    // Validate URLs
    if (!config.API_BASE_URL.startsWith('http://') && 
        !config.API_BASE_URL.startsWith('https://') && 
        !config.API_BASE_URL.startsWith('/')) {
        throw new Error('API_BASE_URL must be a valid URL or path');
    }
    
    // Validate numeric values
    const numericFields = [
        'DATA_REFRESH_INTERVAL',
        'CACHE_TTL',
        'API_TIMEOUT',
        'MAP_ZOOM'
    ];
    
    for (const field of numericFields) {
        if (config[field] !== undefined && typeof config[field] !== 'number') {
            throw new Error(`${field} must be a number`);
        }
    }
};

/**
 * Override configuration with environment variables if available
 * This allows runtime configuration through environment variables
 * @param {Object} config - Base configuration
 * @returns {Object} Configuration with overrides applied
 */
const applyEnvironmentOverrides = (config) => {
    const overrides = {};
    
    // Check for environment variable overrides
    // These would be set by the build process or container environment
    if (typeof window !== 'undefined' && window.ENV_CONFIG) {
        Object.assign(overrides, window.ENV_CONFIG);
    }
    
    return { ...config, ...overrides };
};

// Load and validate configuration
let config;
try {
    config = getEnvironmentConfig();
    config = applyEnvironmentOverrides(config);
    validateConfig(config);
    
    if (config.DEBUG && config.ENABLE_CONSOLE_LOGS) {
        console.log(`[Config] Loaded ${config.ENVIRONMENT} configuration:`, config);
    }
} catch (error) {
    console.error('[Config] Configuration validation failed:', error);
    throw error;
}

// Freeze configuration to prevent modifications
Object.freeze(config);

// Export configuration
export default config;

// Export individual components for convenience
export const {
    ENVIRONMENT,
    API_BASE_URL,
    INTEGRATION_BASE_URL,
    MAP_CENTER,
    MAP_ZOOM,
    TILE_URL,
    TILE_ATTRIBUTION,
    DEBUG,
    LOG_LEVEL
} = config;