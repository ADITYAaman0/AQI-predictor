/**
 * Data Loader - API communication and data fetching
 * Handles authentication, caching, and retry logic
 */

import config from '../config/config.js';
import APIRouter from '../integration/api-router.js';
import AuthManager from '../integration/auth-manager.js';
import CacheController from '../integration/cache-controller.js';

class DataLoader {
    constructor() {
        this.apiRouter = new APIRouter();
        this.authManager = new AuthManager();
        this.cacheController = new CacheController();
        this.refreshInterval = null;
        this.isOnline = navigator.onLine;
        
        this.setupNetworkListeners();
    }

    /**
     * Setup network status listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.emit('networkStatusChanged', true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.emit('networkStatusChanged', false);
        });
    }

    /**
     * Fetch current AQI data
     * @param {Object} filters - Filter parameters
     * @returns {Promise<Object>} - AQI data
     */
    async fetchCurrentAQI(filters = {}) {
        const cacheKey = `current-aqi-${JSON.stringify(filters)}`;
        
        try {
            // Try cache first
            const cachedData = await this.cacheController.get(cacheKey);
            if (cachedData && !await this.cacheController.isStale(cacheKey)) {
                if (config.DEBUG) {
                    console.log('Returning cached AQI data');
                }
                return cachedData;
            }

            // Fetch from API
            if (!this.isOnline) {
                return await this.handleOfflineRequest(cacheKey);
            }

            const request = this.apiRouter.createRequest.geoJsonCurrent(filters);
            const authOptions = this.authManager.addAuthToRequest();
            request.options = authOptions;

            const response = await this.apiRouter.route(request);
            const data = await response.json();

            // Cache the response
            await this.cacheController.set(cacheKey, data);
            
            // Store for offline use
            await this.cacheController.setOfflineData(data);

            return data;
        } catch (error) {
            return await this.handleRequestError(error, cacheKey);
        }
    }

    /**
     * Fetch monitoring stations
     * @param {Object} filters - Filter parameters
     * @returns {Promise<Object>} - Stations data
     */
    async fetchStations(filters = {}) {
        const cacheKey = `stations-${JSON.stringify(filters)}`;
        
        try {
            // Try cache first
            const cachedData = await this.cacheController.get(cacheKey);
            if (cachedData && !await this.cacheController.isStale(cacheKey)) {
                return cachedData;
            }

            if (!this.isOnline) {
                return await this.handleOfflineRequest(cacheKey);
            }

            const request = this.apiRouter.createRequest.geoJsonStations(filters);
            const authOptions = this.authManager.addAuthToRequest();
            request.options = authOptions;

            const response = await this.apiRouter.route(request);
            const data = await response.json();

            await this.cacheController.set(cacheKey, data);
            return data;
        } catch (error) {
            return await this.handleRequestError(error, cacheKey);
        }
    }

    /**
     * Fetch 24-hour forecast
     * @param {string} location - Location identifier
     * @returns {Promise<Object>} - Forecast data
     */
    async fetchForecast(location) {
        const cacheKey = `forecast-${location}`;
        
        try {
            const cachedData = await this.cacheController.get(cacheKey);
            if (cachedData && !await this.cacheController.isStale(cacheKey)) {
                return cachedData;
            }

            if (!this.isOnline) {
                return await this.handleOfflineRequest(cacheKey);
            }

            const request = this.apiRouter.createRequest.forecast24h(location);
            const authOptions = this.authManager.addAuthToRequest();
            request.options = authOptions;

            const response = await this.apiRouter.route(request);
            const data = await response.json();

            await this.cacheController.set(cacheKey, data);
            return data;
        } catch (error) {
            return await this.handleRequestError(error, cacheKey);
        }
    }

    /**
     * Fetch spatial data for heatmap
     * @param {Array} bounds - Map bounds [south, west, north, east]
     * @param {number} resolution - Grid resolution in km
     * @returns {Promise<Object>} - Spatial data
     */
    async fetchSpatialData(bounds, resolution = 1.0) {
        const cacheKey = `spatial-${bounds?.join(',')}-${resolution}`;
        
        try {
            const cachedData = await this.cacheController.get(cacheKey);
            if (cachedData && !await this.cacheController.isStale(cacheKey)) {
                return cachedData;
            }

            if (!this.isOnline) {
                return await this.handleOfflineRequest(cacheKey);
            }

            const request = this.apiRouter.createRequest.heatmapSpatial(bounds, resolution);
            const authOptions = this.authManager.addAuthToRequest();
            request.options = authOptions;

            const response = await this.apiRouter.route(request);
            const data = await response.json();

            await this.cacheController.set(cacheKey, data);
            return data;
        } catch (error) {
            return await this.handleRequestError(error, cacheKey);
        }
    }

    /**
     * Authenticate with credentials
     * @param {Object} credentials - Login credentials
     * @returns {Promise<Object>} - Authentication result
     */
    async authenticate(credentials) {
        try {
            const result = await this.authManager.authenticate(credentials);
            
            if (result.success) {
                this.emit('authenticationSuccess', result.user);
            } else {
                this.emit('authenticationError', result.error);
            }
            
            return result;
        } catch (error) {
            const errorResult = { success: false, error: error.message };
            this.emit('authenticationError', error.message);
            return errorResult;
        }
    }

    /**
     * Refresh authentication token
     * @returns {Promise<boolean>} - Success status
     */
    async refreshToken() {
        try {
            const success = await this.authManager.refreshAuthToken();
            
            if (success) {
                this.emit('tokenRefreshed');
            } else {
                this.emit('tokenRefreshFailed');
            }
            
            return success;
        } catch (error) {
            this.emit('tokenRefreshFailed', error.message);
            return false;
        }
    }

    /**
     * Start automatic data refresh
     * @param {Function} callback - Callback function for data updates
     */
    startAutoRefresh(callback) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            try {
                if (this.isOnline) {
                    // Invalidate current data cache
                    await this.cacheController.invalidate('current-aqi');
                    
                    // Fetch fresh data
                    const data = await this.fetchCurrentAQI();
                    
                    if (callback && typeof callback === 'function') {
                        callback(data);
                    }
                    
                    this.emit('dataRefreshed', data);
                }
            } catch (error) {
                if (config.DEBUG) {
                    console.warn('Auto refresh failed:', error);
                }
            }
        }, config.DATA_REFRESH_INTERVAL);

        if (config.DEBUG) {
            console.log(`Auto refresh started (${config.DATA_REFRESH_INTERVAL / 1000}s interval)`);
        }
    }

    /**
     * Stop automatic data refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            
            if (config.DEBUG) {
                console.log('Auto refresh stopped');
            }
        }
    }

    /**
     * Handle offline requests
     * @param {string} cacheKey - Cache key to try
     * @returns {Promise<Object>} - Cached or sample data
     */
    async handleOfflineRequest(cacheKey) {
        // Try to get stale cached data
        const staleData = await this.cacheController.get(cacheKey);
        if (staleData) {
            staleData.metadata = staleData.metadata || {};
            staleData.metadata.offline = true;
            staleData.metadata.stale = true;
            return staleData;
        }

        // Return offline fallback data
        const offlineData = await this.cacheController.getOfflineData();
        offlineData.metadata = offlineData.metadata || {};
        offlineData.metadata.offline = true;
        
        return offlineData;
    }

    /**
     * Handle request errors
     * @param {Error} error - Request error
     * @param {string} cacheKey - Cache key for fallback
     * @returns {Promise<Object>} - Error response or cached data
     */
    async handleRequestError(error, cacheKey) {
        if (config.DEBUG) {
            console.error('Data loader error:', error);
        }

        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
            this.authManager.handleAuthError(error);
        }

        // Try to return cached data as fallback
        const cachedData = await this.cacheController.get(cacheKey);
        if (cachedData) {
            cachedData.metadata = cachedData.metadata || {};
            cachedData.metadata.error = true;
            cachedData.metadata.errorMessage = error.message;
            return cachedData;
        }

        // Return offline data as last resort
        const offlineData = await this.cacheController.getOfflineData();
        offlineData.metadata = offlineData.metadata || {};
        offlineData.metadata.error = true;
        offlineData.metadata.errorMessage = error.message;
        
        this.emit('dataError', error);
        return offlineData;
    }

    /**
     * Get data loading statistics
     * @returns {Promise<Object>} - Loading statistics
     */
    async getStats() {
        const cacheStats = await this.cacheController.getStats();
        
        return {
            isOnline: this.isOnline,
            isAuthenticated: this.authManager.isAuthenticated(),
            autoRefreshActive: !!this.refreshInterval,
            cache: cacheStats
        };
    }

    /**
     * Clear all cached data
     * @returns {Promise<void>}
     */
    async clearCache() {
        await this.cacheController.invalidate('');
        this.emit('cacheCleared');
    }

    /**
     * Event emitter functionality
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`dataLoader:${event}`, {
            detail: data
        });
        window.dispatchEvent(customEvent);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        window.addEventListener(`dataLoader:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        window.removeEventListener(`dataLoader:${event}`, callback);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopAutoRefresh();
        // Additional cleanup if needed
    }
}

export default DataLoader;