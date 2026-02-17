/**
 * CORS and Rate Limiting Compliance Module
 * Handles frontend compliance with backend CORS and rate limiting policies
 * 
 * Requirements: 7.4, 7.5
 */

import config from '../config/config.js';

class CORSRateLimitCompliance {
    constructor() {
        this.rateLimitInfo = {
            remaining: 100,
            limit: 100,
            resetTime: Date.now() + 3600000, // 1 hour from now
            isAuthenticated: false
        };
        
        this.corsConfig = {
            allowedOrigins: ['*'], // Backend allows all origins
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type', 'X-Client-Version'],
            allowCredentials: true
        };
        
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.retryDelays = [1000, 2000, 5000]; // Progressive retry delays
        
        if (config.DEBUG) {
            console.log('CORS and Rate Limit Compliance initialized');
        }
    }

    /**
     * Configure CORS-compliant request headers
     * @param {Object} options - Request options
     * @returns {Object} - CORS-compliant request options
     */
    configureCORSHeaders(options = {}) {
        const corsHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Client-Type': 'leaflet-frontend',
            'X-Client-Version': config.VERSION || '1.0.0'
        };

        // Add origin header for cross-origin requests
        if (window.location.origin !== config.API_BASE_URL) {
            corsHeaders['Origin'] = window.location.origin;
        }

        return {
            ...options,
            headers: {
                ...corsHeaders,
                ...options.headers
            },
            credentials: 'include', // Include credentials for CORS
            mode: 'cors' // Explicitly set CORS mode
        };
    }

    /**
     * Check if request complies with CORS policy
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {boolean} - Whether request is CORS compliant
     */
    isCORSCompliant(url, options = {}) {
        try {
            // Handle relative URLs by converting them to absolute URLs
            let requestUrl;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                requestUrl = new URL(url);
            } else {
                // Convert relative URL to absolute URL using current origin
                const baseUrl = (typeof window !== 'undefined' && window.location) 
                    ? window.location.origin 
                    : 'http://localhost:8000';
                requestUrl = new URL(url, baseUrl);
            }
            
            const currentOrigin = (typeof window !== 'undefined' && window.location) 
                ? window.location.origin 
                : 'http://localhost:8000';
            
            // Check if it's a cross-origin request
            const isCrossOrigin = requestUrl.origin !== currentOrigin;
            
            if (!isCrossOrigin) {
                return true; // Same-origin requests are always allowed
            }

            // Check method
            const method = options.method || 'GET';
            if (!this.corsConfig.allowedMethods.includes(method.toUpperCase())) {
                if (config.DEBUG) {
                    console.warn(`Method ${method} not allowed by CORS policy`);
                }
                return false;
            }

            // Check headers
            const headers = options.headers || {};
            for (const headerName of Object.keys(headers)) {
                const normalizedHeader = headerName.toLowerCase();
                const isSimpleHeader = ['accept', 'accept-language', 'content-language', 'content-type'].includes(normalizedHeader);
                const isAllowedHeader = this.corsConfig.allowedHeaders.some(allowed => 
                    allowed.toLowerCase() === normalizedHeader
                );
                
                if (!isSimpleHeader && !isAllowedHeader) {
                    if (config.DEBUG) {
                        console.warn(`Header ${headerName} not allowed by CORS policy`);
                    }
                    return false;
                }
            }

            return true;
        } catch (error) {
            if (config.DEBUG) {
                console.error('CORS compliance check failed:', error);
            }
            return false;
        }
    }

    /**
     * Update rate limit information from response headers
     * @param {Response} response - Fetch response
     */
    updateRateLimitInfo(response) {
        try {
            const remaining = response.headers.get('X-RateLimit-Remaining');
            const limit = response.headers.get('X-RateLimit-Limit');
            const reset = response.headers.get('X-RateLimit-Reset');
            const retryAfter = response.headers.get('Retry-After');

            if (remaining !== null) {
                this.rateLimitInfo.remaining = parseInt(remaining);
            }
            
            if (limit !== null) {
                this.rateLimitInfo.limit = parseInt(limit);
            }
            
            if (reset !== null) {
                this.rateLimitInfo.resetTime = parseInt(reset) * 1000; // Convert to milliseconds
            }
            
            if (retryAfter !== null) {
                this.rateLimitInfo.retryAfter = parseInt(retryAfter) * 1000;
            }

            if (config.DEBUG) {
                console.log('Rate limit info updated:', this.rateLimitInfo);
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Failed to update rate limit info:', error);
            }
        }
    }

    /**
     * Check if request should be rate limited
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {boolean} - Whether request should proceed
     */
    checkRateLimit(isAuthenticated = false) {
        const now = Date.now();
        
        // Reset rate limit info if window has passed
        if (now > this.rateLimitInfo.resetTime) {
            this.rateLimitInfo.remaining = isAuthenticated ? 5000 : 1000; // Backend defaults
            this.rateLimitInfo.resetTime = now + 3600000; // 1 hour from now
        }

        // Check if we have remaining requests
        if (this.rateLimitInfo.remaining <= 0) {
            if (config.DEBUG) {
                console.warn('Rate limit exceeded, queuing request');
            }
            return false;
        }

        // Decrement remaining count
        this.rateLimitInfo.remaining--;
        return true;
    }

    /**
     * Make rate-limited and CORS-compliant request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {Promise<Response>} - Fetch response
     */
    async makeCompliantRequest(url, options = {}, isAuthenticated = false) {
        // Configure CORS headers
        const corsOptions = this.configureCORSHeaders(options);
        
        // Check CORS compliance
        if (!this.isCORSCompliant(url, corsOptions)) {
            throw new Error('Request does not comply with CORS policy');
        }

        // Check rate limit
        if (!this.checkRateLimit(isAuthenticated)) {
            return this.queueRequest(url, corsOptions, isAuthenticated);
        }

        try {
            const response = await fetch(url, corsOptions);
            
            // Update rate limit info from response
            this.updateRateLimitInfo(response);
            
            // Handle rate limit exceeded response
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
                
                if (config.DEBUG) {
                    console.warn(`Rate limited, retrying after ${delay}ms`);
                }
                
                return this.retryAfterDelay(url, corsOptions, delay, isAuthenticated);
            }
            
            return response;
        } catch (error) {
            if (config.DEBUG) {
                console.error('Compliant request failed:', error);
            }
            throw error;
        }
    }

    /**
     * Queue request for later execution when rate limit resets
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {Promise<Response>} - Promise that resolves when request is executed
     */
    async queueRequest(url, options, isAuthenticated) {
        return new Promise((resolve, reject) => {
            const queuedRequest = {
                url,
                options,
                isAuthenticated,
                resolve,
                reject,
                timestamp: Date.now(),
                retryCount: 0
            };
            
            this.requestQueue.push(queuedRequest);
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queued requests
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            
            // Wait until rate limit resets
            if (now < this.rateLimitInfo.resetTime && this.rateLimitInfo.remaining <= 0) {
                const waitTime = this.rateLimitInfo.resetTime - now;
                if (config.DEBUG) {
                    console.log(`Waiting ${waitTime}ms for rate limit reset`);
                }
                await this.delay(Math.min(waitTime, 60000)); // Wait max 1 minute at a time
                continue;
            }

            const request = this.requestQueue.shift();
            
            try {
                const response = await this.makeCompliantRequest(
                    request.url, 
                    request.options, 
                    request.isAuthenticated
                );
                request.resolve(response);
            } catch (error) {
                // Retry with exponential backoff
                if (request.retryCount < this.retryDelays.length) {
                    const delay = this.retryDelays[request.retryCount];
                    request.retryCount++;
                    
                    if (config.DEBUG) {
                        console.log(`Retrying request after ${delay}ms (attempt ${request.retryCount})`);
                    }
                    
                    setTimeout(() => {
                        this.requestQueue.unshift(request); // Add back to front of queue
                    }, delay);
                } else {
                    request.reject(error);
                }
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Retry request after delay
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {number} delay - Delay in milliseconds
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {Promise<Response>} - Fetch response
     */
    async retryAfterDelay(url, options, delay, isAuthenticated) {
        await this.delay(delay);
        return this.makeCompliantRequest(url, options, isAuthenticated);
    }

    /**
     * Utility function to create delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current rate limit status
     * @returns {Object} - Rate limit status
     */
    getRateLimitStatus() {
        const now = Date.now();
        const timeUntilReset = Math.max(0, this.rateLimitInfo.resetTime - now);
        
        return {
            remaining: this.rateLimitInfo.remaining,
            limit: this.rateLimitInfo.limit,
            resetTime: this.rateLimitInfo.resetTime,
            timeUntilReset,
            queueLength: this.requestQueue.length,
            isLimited: this.rateLimitInfo.remaining <= 0 && timeUntilReset > 0
        };
    }

    /**
     * Handle preflight OPTIONS request
     * @param {string} url - Request URL
     * @returns {Promise<boolean>} - Whether preflight succeeded
     */
    async handlePreflight(url) {
        try {
            const response = await fetch(url, {
                method: 'OPTIONS',
                headers: {
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Content-Type, Authorization'
                }
            });

            if (response.ok) {
                // Check CORS headers in response
                const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
                const allowMethods = response.headers.get('Access-Control-Allow-Methods');
                const allowHeaders = response.headers.get('Access-Control-Allow-Headers');
                
                if (config.DEBUG) {
                    console.log('Preflight response:', {
                        allowOrigin,
                        allowMethods,
                        allowHeaders
                    });
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Preflight request failed:', error);
            }
            return false;
        }
    }

    /**
     * Set authentication status for rate limiting
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    setAuthenticationStatus(isAuthenticated) {
        this.rateLimitInfo.isAuthenticated = isAuthenticated;
        
        // Update rate limits based on authentication status
        if (isAuthenticated) {
            this.rateLimitInfo.limit = 5000; // Authenticated user limit
        } else {
            this.rateLimitInfo.limit = 1000; // Anonymous user limit
        }
        
        if (config.DEBUG) {
            console.log(`Authentication status updated: ${isAuthenticated}, new limit: ${this.rateLimitInfo.limit}`);
        }
    }

    /**
     * Clear rate limit state (useful for testing)
     */
    clearRateLimitState() {
        this.rateLimitInfo = {
            remaining: 100,
            limit: 100,
            resetTime: Date.now() + 3600000,
            isAuthenticated: false
        };
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        if (config.DEBUG) {
            console.log('Rate limit state cleared');
        }
    }

    /**
     * Get CORS configuration
     * @returns {Object} - CORS configuration
     */
    getCORSConfig() {
        return { ...this.corsConfig };
    }

    /**
     * Validate response for CORS compliance
     * @param {Response} response - Fetch response
     * @param {string} requestOrigin - Origin of the request
     * @returns {boolean} - Whether response is CORS compliant
     */
    validateCORSResponse(response, requestOrigin = window.location.origin) {
        try {
            const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
            
            // Check if origin is allowed
            if (allowOrigin !== '*' && allowOrigin !== requestOrigin) {
                if (config.DEBUG) {
                    console.warn(`CORS: Origin ${requestOrigin} not allowed. Allowed: ${allowOrigin}`);
                }
                return false;
            }

            // Check credentials
            const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');
            if (this.corsConfig.allowCredentials && allowCredentials !== 'true') {
                if (config.DEBUG) {
                    console.warn('CORS: Credentials not allowed but required');
                }
                return false;
            }

            return true;
        } catch (error) {
            if (config.DEBUG) {
                console.error('CORS response validation failed:', error);
            }
            return false;
        }
    }
}

export default CORSRateLimitCompliance;