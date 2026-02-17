/**
 * Authentication Manager - JWT token handling and authentication integration
 * Integrates with existing FastAPI authentication system using /api/v1/auth endpoints
 * 
 * Requirements: 1.6, 7.1, 7.2, 7.3
 */

import config from '../config/config.js';
import CORSRateLimitCompliance from './cors-rate-limit-compliance.js';

class AuthManager {
    constructor() {
        this.tokenKey = 'aqi-auth-token';
        this.refreshTokenKey = 'aqi-refresh-token';
        this.userKey = 'aqi-user-data';
        this.baseURL = config.API_BASE_URL;
        this.refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
        
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        this.refreshTimer = null;
        
        // Initialize CORS and rate limiting compliance
        this.compliance = new CORSRateLimitCompliance();
        
        // Bind methods to preserve context
        this.handleAuthError = this.handleAuthError.bind(this);
        this.refreshAuthToken = this.refreshAuthToken.bind(this);
        
        this.loadStoredAuth();
    }

    /**
     * Load authentication data from storage
     */
    loadStoredAuth() {
        try {
            const tokenData = localStorage.getItem(this.tokenKey);
            const refreshTokenData = localStorage.getItem(this.refreshTokenKey);
            const userData = localStorage.getItem(this.userKey);

            if (tokenData) {
                const parsed = JSON.parse(tokenData);
                if (this.isTokenValid(parsed)) {
                    this.token = parsed;
                    this.scheduleTokenRefresh();
                } else {
                    this.clearStoredAuth();
                }
            }

            if (refreshTokenData) {
                this.refreshToken = JSON.parse(refreshTokenData);
            }

            if (userData) {
                this.user = JSON.parse(userData);
            }

            if (config.DEBUG) {
                console.log('Auth state loaded:', {
                    hasToken: !!this.token,
                    hasRefreshToken: !!this.refreshToken,
                    hasUser: !!this.user,
                    tokenExpiry: this.token ? new Date(this.token.expiresAt).toISOString() : null
                });
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Failed to load stored auth:', error);
            }
            this.clearStoredAuth();
        }
    }

    /**
     * Authenticate user with credentials using existing /api/v1/auth/login endpoint
     * @param {Object} credentials - Login credentials {email, password}
     * @returns {Promise<Object>} - Authentication result
     */
    async authenticate(credentials) {
        try {
            const response = await this.compliance.makeCompliantRequest(
                `${this.baseURL}/auth/login`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email: credentials.email,
                        password: credentials.password
                    })
                },
                false // Not authenticated yet
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Authentication failed: ${response.status}`);
            }

            const authData = await response.json();
            
            // Fetch user profile after successful login
            await this.fetchUserProfile(authData.access_token);
            
            // Store authentication data
            this.setAuthData(authData);
            
            // Update compliance module with authentication status
            this.compliance.setAuthenticationStatus(true);
            
            if (config.DEBUG) {
                console.log('Authentication successful for user:', this.user?.email);
            }
            
            return {
                success: true,
                user: this.user,
                token: this.token
            };
        } catch (error) {
            if (config.DEBUG) {
                console.error('Authentication error:', error);
            }
            
            this.handleAuthError(error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh authentication token using existing /api/v1/auth/refresh endpoint
     * @returns {Promise<boolean>} - Success status
     */
    async refreshAuthToken() {
        if (!this.refreshToken || !this.isTokenValid(this.refreshToken)) {
            if (config.DEBUG) {
                console.warn('No valid refresh token available');
            }
            this.clearStoredAuth();
            return false;
        }

        try {
            const response = await this.compliance.makeCompliantRequest(
                `${this.baseURL}/auth/refresh`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        refresh_token: this.refreshToken.token
                    })
                },
                true // Using refresh token, so consider as authenticated
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Token refresh failed: ${response.status}`);
            }

            const authData = await response.json();
            
            // Update token data (refresh endpoint only returns new access token)
            this.token = {
                token: authData.access_token,
                type: authData.token_type || 'bearer',
                expiresAt: Date.now() + (authData.expires_in * 1000)
            };
            
            localStorage.setItem(this.tokenKey, JSON.stringify(this.token));
            this.scheduleTokenRefresh();
            
            if (config.DEBUG) {
                console.log('Token refreshed successfully');
            }
            
            return true;
        } catch (error) {
            if (config.DEBUG) {
                console.error('Token refresh error:', error);
            }
            
            this.handleAuthError(error);
            this.clearStoredAuth();
            return false;
        }
    }

    /**
     * Logout user and clear authentication data
     * @returns {Promise<boolean>} - Success status
     */
    async logout() {
        try {
            // Note: Backend doesn't have explicit logout endpoint, just clear local data
            if (config.DEBUG) {
                console.log('Logging out user:', this.user?.email);
            }
            
            // Update compliance module with authentication status
            this.compliance.setAuthenticationStatus(false);
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Logout request failed:', error);
            }
        } finally {
            this.clearStoredAuth();
            
            // Emit logout event
            window.dispatchEvent(new CustomEvent('auth-logout', {
                detail: { message: 'User logged out' }
            }));
            
            return true;
        }
    }

    /**
     * Get authorization header for API requests
     * @returns {Object} - Authorization header object
     */
    getAuthHeader() {
        if (!this.token || !this.isTokenValid(this.token)) {
            return {};
        }

        return {
            'Authorization': `Bearer ${this.token.token}`
        };
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    isAuthenticated() {
        return this.token && this.isTokenValid(this.token);
    }

    /**
     * Get current user data
     * @returns {Object|null} - User data
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Set authentication data from server response
     * @param {Object} authData - Authentication data from server
     */
    setAuthData(authData) {
        // Parse access token data
        if (authData.access_token) {
            this.token = {
                token: authData.access_token,
                type: authData.token_type || 'bearer',
                expiresAt: Date.now() + ((authData.expires_in || 1800) * 1000) // Default 30 minutes
            };
            localStorage.setItem(this.tokenKey, JSON.stringify(this.token));
            this.scheduleTokenRefresh();
        }

        // Parse refresh token data
        if (authData.refresh_token) {
            this.refreshToken = {
                token: authData.refresh_token,
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days default
            };
            localStorage.setItem(this.refreshTokenKey, JSON.stringify(this.refreshToken));
        }

        // User data should already be set by fetchUserProfile
        if (config.DEBUG) {
            console.log('Auth data stored:', {
                hasToken: !!this.token,
                hasRefreshToken: !!this.refreshToken,
                hasUser: !!this.user,
                tokenExpiry: this.token ? new Date(this.token.expiresAt).toISOString() : null
            });
        }
    }

    /**
     * Clear stored authentication data
     */
    clearStoredAuth() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Check if token is valid (not expired)
     * @param {Object} token - Token object
     * @returns {boolean} - Validity status
     */
    isTokenValid(token) {
        if (!token || !token.token || !token.expiresAt) {
            return false;
        }

        const now = Date.now();
        const buffer = 30 * 1000; // 30 second buffer
        return now < (token.expiresAt - buffer);
    }

    /**
     * Schedule automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (!this.token || !this.refreshToken) {
            return;
        }

        const now = Date.now();
        const refreshTime = this.token.expiresAt - this.refreshThreshold;
        const delay = Math.max(0, refreshTime - now);

        this.refreshTimer = setTimeout(async () => {
            if (config.DEBUG) {
                console.log('Attempting automatic token refresh...');
            }
            
            const success = await this.refreshAuthToken();
            if (!success) {
                // Emit authentication error event
                window.dispatchEvent(new CustomEvent('auth-error', {
                    detail: { 
                        message: 'Automatic token refresh failed',
                        code: 'TOKEN_REFRESH_FAILED'
                    }
                }));
            }
        }, delay);

        if (config.DEBUG) {
            console.log(`Token refresh scheduled in ${Math.round(delay / 1000)} seconds`);
        }
    }

    /**
     * Verify token with server using /api/v1/auth/me endpoint
     * @returns {Promise<boolean>} - Verification result
     */
    async verifyToken() {
        if (!this.token || !this.isTokenValid(this.token)) {
            return false;
        }

        try {
            const response = await this.compliance.makeCompliantRequest(
                `${this.baseURL}/auth/me`,
                {
                    method: 'GET',
                    headers: this.getAuthHeader()
                },
                true
            );

            if (response.ok) {
                const userData = await response.json();
                this.user = userData;
                localStorage.setItem(this.userKey, JSON.stringify(this.user));
                return true;
            }
            
            return false;
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Token verification failed:', error);
            }
            return false;
        }
    }

    /**
     * Fetch user profile using /api/v1/auth/me endpoint
     * @param {string} accessToken - Access token to use for request
     * @returns {Promise<Object|null>} - User profile data
     */
    async fetchUserProfile(accessToken = null) {
        const token = accessToken || this.token?.token;
        if (!token) {
            return null;
        }

        try {
            const response = await this.compliance.makeCompliantRequest(
                `${this.baseURL}/auth/me`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                },
                true
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch user profile: ${response.status}`);
            }

            const userData = await response.json();
            this.user = userData;
            localStorage.setItem(this.userKey, JSON.stringify(this.user));
            
            if (config.DEBUG) {
                console.log('User profile fetched:', userData.email);
            }
            
            return userData;
        } catch (error) {
            if (config.DEBUG) {
                console.error('Failed to fetch user profile:', error);
            }
            return null;
        }
    }

    /**
     * Handle authentication errors
     * @param {Error} error - Authentication error
     */
    handleAuthError(error) {
        if (config.DEBUG) {
            console.error('Authentication error:', error);
        }

        // Clear invalid authentication data
        if (error.message.includes('401') || error.message.includes('403')) {
            this.clearStoredAuth();
        }

        // Emit authentication error event
        window.dispatchEvent(new CustomEvent('auth-error', {
            detail: { 
                message: error.message,
                code: this.getErrorCode(error)
            }
        }));
    }

    /**
     * Get error code from error
     * @param {Error} error - Error object
     * @returns {string} - Error code
     */
    getErrorCode(error) {
        if (error.message.includes('401')) return 'UNAUTHORIZED';
        if (error.message.includes('403')) return 'FORBIDDEN';
        if (error.message.includes('Network')) return 'NETWORK_ERROR';
        return 'AUTH_ERROR';
    }

    /**
     * Add authentication to request options with rate limiting compliance
     * @param {Object} options - Request options
     * @returns {Object} - Modified request options
     */
    addAuthToRequest(options = {}) {
        const authHeader = this.getAuthHeader();
        
        // Add rate limiting headers for compliance
        const rateLimitHeaders = {
            'X-Client-Type': 'leaflet-frontend',
            'X-Client-Version': config.VERSION || '1.0.0'
        };
        
        return {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...rateLimitHeaders,
                ...options.headers,
                ...authHeader
            }
        };
    }

    /**
     * Make authenticated request with automatic retry and error handling
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} - Fetch response
     */
    async makeAuthenticatedRequest(url, options = {}) {
        // Check if token needs refresh before making request
        if (this.token && !this.isTokenValid(this.token)) {
            const refreshed = await this.refreshAuthToken();
            if (!refreshed) {
                throw new Error('Authentication required');
            }
        }

        const requestOptions = this.addAuthToRequest(options);
        
        try {
            const response = await this.compliance.makeCompliantRequest(
                url, 
                requestOptions, 
                this.isAuthenticated()
            );
            
            // Handle authentication errors
            if (response.status === 401) {
                // Try to refresh token once
                const refreshed = await this.refreshAuthToken();
                if (refreshed) {
                    // Retry request with new token
                    const retryOptions = this.addAuthToRequest(options);
                    return await this.compliance.makeCompliantRequest(
                        url, 
                        retryOptions, 
                        true
                    );
                } else {
                    this.handleAuthError(new Error('Authentication failed'));
                    throw new Error('Authentication required');
                }
            }
            
            // Handle rate limiting (already handled by compliance module)
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const error = new Error('Rate limit exceeded');
                error.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
                throw error;
            }
            
            return response;
        } catch (error) {
            if (error.message.includes('401') || error.message.includes('403')) {
                this.handleAuthError(error);
            }
            throw error;
        }
    }

    /**
     * Check rate limiting status
     * @returns {Promise<Object>} - Rate limit information
     */
    async checkRateLimit() {
        return this.compliance.getRateLimitStatus();
    }

    /**
     * Get CORS configuration
     * @returns {Object} - CORS configuration
     */
    getCORSConfig() {
        return this.compliance.getCORSConfig();
    }

    /**
     * Handle CORS preflight request
     * @param {string} url - Request URL
     * @returns {Promise<boolean>} - Whether preflight succeeded
     */
    async handleCORSPreflight(url) {
        return this.compliance.handlePreflight(url);
    }
}

// Export as both default and named export for compatibility
export default AuthManager;
export { AuthManager };