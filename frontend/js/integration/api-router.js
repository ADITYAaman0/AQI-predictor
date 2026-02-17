/**
 * API Router - Routes frontend requests to appropriate backend endpoints
 * Maps frontend data requests to existing FastAPI endpoints
 */

import config from '../config/config.js';

class APIRouter {
    constructor() {
        this.baseURL = config.API_BASE_URL;
        this.integrationURL = config.INTEGRATION_BASE_URL;
        this.timeout = config.API_TIMEOUT;
        this.retryAttempts = config.RETRY_ATTEMPTS;
        this.retryDelay = config.RETRY_DELAY;
    }

    /**
     * Route a frontend request to the appropriate backend endpoint
     * @param {Object} request - Frontend request object
     * @returns {Promise<Response>} - Backend response
     */
    async route(request) {
        const endpoint = this.mapEndpoint(request);
        const url = this.buildURL(endpoint, request.params);
        
        try {
            const response = await this.makeRequest(url, request.options);
            this.validateResponse(response);
            return response;
        } catch (error) {
            return this.handleError(error, request);
        }
    }

    /**
     * Map frontend request to backend endpoint
     * @param {Object} request - Frontend request object
     * @returns {string} - Backend endpoint path
     */
    mapEndpoint(request) {
        const { type, subtype } = request;
        
        const endpointMap = {
            // Current AQI data requests
            'current': {
                'aqi': '/data/air-quality/latest',
                'stations': '/data/stations',
                'weather': '/data/weather/latest',
                'location': '/data/air-quality/location'
            },
            
            // Forecast data requests
            'forecast': {
                '24h': '/forecast/24h/{location}',
                'current': '/forecast/current',
                'spatial': '/forecast/spatial',
                'stations': '/forecast/stations'
            },
            
            // Spatial data requests
            'spatial': {
                'grid': '/forecast/spatial',
                'bounds': '/forecast/spatial/bounds/{city}'
            },
            
            // Authentication requests
            'auth': {
                'login': '/auth/login',
                'refresh': '/auth/refresh',
                'logout': '/auth/logout',
                'verify': '/auth/verify'
            },
            
            // Integration layer specific endpoints (future implementation)
            'integration': {
                'geojson-current': '/integration/geojson/current',
                'geojson-stations': '/integration/geojson/stations',
                'geojson-forecast': '/integration/geojson/forecast/{location}',
                'heatmap-spatial': '/integration/heatmap/spatial',
                'config': '/integration/config/frontend'
            }
        };

        const endpoint = endpointMap[type]?.[subtype];
        if (!endpoint) {
            throw new Error(`Unknown endpoint mapping: ${type}.${subtype}`);
        }

        return endpoint;
    }

    /**
     * Build complete URL with parameters
     * @param {string} endpoint - API endpoint path
     * @param {Object} params - URL parameters
     * @returns {string} - Complete URL
     */
    buildURL(endpoint, params = {}) {
        const baseURL = endpoint.startsWith('/integration') ? 
            this.integrationURL : this.baseURL;
        
        let url = `${baseURL}${endpoint}`;
        
        // Add path parameters (e.g., /forecast/24h/{location})
        if (params.path) {
            Object.entries(params.path).forEach(([key, value]) => {
                // Handle both {key} and /{key} patterns
                url = url.replace(`{${key}}`, encodeURIComponent(value));
                url = url.replace(`/${key}`, `/${encodeURIComponent(value)}`);
            });
        }
        
        // Add query parameters
        if (params.query && Object.keys(params.query).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params.query).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    searchParams.append(key, value);
                }
            });
            url += `?${searchParams.toString()}`;
        }
        
        return url;
    }

    /**
     * Make HTTP request with timeout and retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} - Response object
     */
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal,
            ...options
        };

        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Validate API response
     * @param {Response} response - HTTP response
     * @throws {Error} - If response is invalid
     */
    validateResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response content type');
        }
    }

    /**
     * Handle API errors with retry logic
     * @param {Error} error - Original error
     * @param {Object} request - Original request
     * @returns {Promise<Response>} - Retry response or throws error
     */
    async handleError(error, request) {
        if (config.DEBUG) {
            console.error('API Router Error:', error, request);
        }

        // Don't retry certain error types
        const nonRetryableErrors = [
            'Unknown endpoint mapping',
            'Invalid response content type',
            'HTTP 400',
            'HTTP 401',
            'HTTP 403',
            'HTTP 404'
        ];

        const shouldRetry = !nonRetryableErrors.some(errorType => 
            error.message.includes(errorType)
        );

        if (shouldRetry && request.retryCount < this.retryAttempts) {
            request.retryCount = (request.retryCount || 0) + 1;
            
            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, request.retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            if (config.DEBUG) {
                console.log(`Retrying request (attempt ${request.retryCount}):`, request);
            }
            
            return this.route(request);
        }

        // Create structured error response
        const errorResponse = {
            error: {
                code: this.getErrorCode(error),
                message: error.message,
                timestamp: new Date().toISOString(),
                request_id: this.generateRequestId()
            }
        };

        throw new Error(JSON.stringify(errorResponse));
    }

    /**
     * Get error code from error message
     * @param {Error} error - Error object
     * @returns {string} - Error code
     */
    getErrorCode(error) {
        if (error.message.includes('timeout')) return 'TIMEOUT_ERROR';
        if (error.message.includes('Network')) return 'NETWORK_ERROR';
        if (error.message.includes('HTTP 4')) return 'CLIENT_ERROR';
        if (error.message.includes('HTTP 5')) return 'SERVER_ERROR';
        if (error.message.includes('Unknown endpoint')) return 'ROUTING_ERROR';
        return 'UNKNOWN_ERROR';
    }

    /**
     * Generate unique request ID for tracking
     * @returns {string} - Request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create request object for common operations
     */
    createRequest = {
        currentAQI: (filters = {}) => ({
            type: 'current',
            subtype: 'aqi',
            params: { query: filters }
        }),

        stations: (filters = {}) => ({
            type: 'current',
            subtype: 'stations',
            params: { query: filters }
        }),

        forecast24h: (location) => ({
            type: 'forecast',
            subtype: '24h',
            params: { path: { location } }
        }),

        spatialGrid: (bounds, resolution) => ({
            type: 'spatial',
            subtype: 'grid',
            params: { 
                query: { 
                    north: bounds.north,
                    south: bounds.south,
                    east: bounds.east,
                    west: bounds.west,
                    resolution 
                }
            }
        }),

        spatialBounds: (city) => ({
            type: 'spatial',
            subtype: 'bounds',
            params: { path: { city } }
        }),

        geoJsonCurrent: (filters = {}) => ({
            type: 'integration',
            subtype: 'geojson-current',
            params: { query: filters }
        }),

        geoJsonStations: (filters = {}) => ({
            type: 'integration',
            subtype: 'geojson-stations',
            params: { query: filters }
        }),

        heatmapSpatial: (bounds, resolution) => ({
            type: 'integration',
            subtype: 'heatmap-spatial',
            params: { 
                query: { 
                    bounds: bounds ? bounds.join(',') : undefined,
                    resolution 
                }
            }
        })
    };
}

export default APIRouter;