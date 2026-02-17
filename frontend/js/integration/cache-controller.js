/**
 * Cache Controller - Client-side caching and performance optimization
 * Implements browser-based caching with Redis integration
 */

import config from '../config/config.js';

class CacheController {
    constructor() {
        this.cacheName = 'aqi-predictor-cache';
        this.defaultTTL = config.CACHE_TTL;
        this.offlineCacheDuration = config.OFFLINE_CACHE_DURATION;
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB
        this.compressionEnabled = true;
        
        this.initializeCache();
    }

    /**
     * Initialize cache storage
     */
    async initializeCache() {
        try {
            // Check if Cache API is supported
            if ('caches' in window) {
                this.cache = await caches.open(this.cacheName);
                this.cacheType = 'cache-api';
            } else {
                // Fallback to localStorage
                this.cacheType = 'localstorage';
                this.cleanupExpiredEntries();
            }

            if (config.DEBUG) {
                console.log(`Cache initialized using ${this.cacheType}`);
            }
        } catch (error) {
            console.warn('Cache initialization failed:', error);
            this.cacheType = 'memory';
            this.memoryCache = new Map();
        }
    }

    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached data or null
     */
    async get(key) {
        try {
            const cacheKey = this.generateCacheKey(key);
            
            switch (this.cacheType) {
                case 'cache-api':
                    return await this.getCacheAPI(cacheKey);
                case 'localstorage':
                    return this.getLocalStorage(cacheKey);
                case 'memory':
                    return this.getMemoryCache(cacheKey);
                default:
                    return null;
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Cache get failed:', error);
            }
            return null;
        }
    }

    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async set(key, data, ttl = this.defaultTTL) {
        try {
            const cacheKey = this.generateCacheKey(key);
            const cacheEntry = this.createCacheEntry(data, ttl);
            
            switch (this.cacheType) {
                case 'cache-api':
                    return await this.setCacheAPI(cacheKey, cacheEntry);
                case 'localstorage':
                    return this.setLocalStorage(cacheKey, cacheEntry);
                case 'memory':
                    return this.setMemoryCache(cacheKey, cacheEntry);
                default:
                    return false;
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Cache set failed:', error);
            }
            return false;
        }
    }

    /**
     * Check if cache entry is stale
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - True if stale
     */
    async isStale(key) {
        try {
            const cacheKey = this.generateCacheKey(key);
            const entry = await this.getRawEntry(cacheKey);
            
            if (!entry) {
                return true;
            }

            const now = Date.now();
            return now > entry.expiresAt;
        } catch (error) {
            return true;
        }
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match keys
     * @returns {Promise<number>} - Number of invalidated entries
     */
    async invalidate(pattern) {
        try {
            let invalidatedCount = 0;
            
            switch (this.cacheType) {
                case 'cache-api':
                    invalidatedCount = await this.invalidateCacheAPI(pattern);
                    break;
                case 'localstorage':
                    invalidatedCount = this.invalidateLocalStorage(pattern);
                    break;
                case 'memory':
                    invalidatedCount = this.invalidateMemoryCache(pattern);
                    break;
            }

            if (config.DEBUG) {
                console.log(`Invalidated ${invalidatedCount} cache entries matching: ${pattern}`);
            }

            return invalidatedCount;
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Cache invalidation failed:', error);
            }
            return 0;
        }
    }

    /**
     * Get offline data for graceful degradation
     * @returns {Promise<Object>} - Offline data
     */
    async getOfflineData() {
        try {
            const offlineKey = 'offline-fallback';
            const data = await this.get(offlineKey);
            
            if (data && !this.isExpired(data, this.offlineCacheDuration)) {
                return data;
            }

            // Return sample data for demonstration
            return this.getSampleData();
        } catch (error) {
            return this.getSampleData();
        }
    }

    /**
     * Store data for offline use
     * @param {any} data - Data to store offline
     * @returns {Promise<boolean>} - Success status
     */
    async setOfflineData(data) {
        const offlineKey = 'offline-fallback';
        return await this.set(offlineKey, data, this.offlineCacheDuration);
    }

    /**
     * Cache API implementation
     */
    async getCacheAPI(key) {
        const response = await this.cache.match(key);
        if (!response) return null;

        const entry = await response.json();
        if (this.isExpired(entry)) {
            await this.cache.delete(key);
            return null;
        }

        return this.decompressData(entry.data);
    }

    async setCacheAPI(key, entry) {
        const response = new Response(JSON.stringify(entry), {
            headers: { 'Content-Type': 'application/json' }
        });
        await this.cache.put(key, response);
        return true;
    }

    async invalidateCacheAPI(pattern) {
        const keys = await this.cache.keys();
        let count = 0;
        
        for (const request of keys) {
            if (request.url.includes(pattern)) {
                await this.cache.delete(request);
                count++;
            }
        }
        
        return count;
    }

    /**
     * LocalStorage implementation
     */
    getLocalStorage(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const entry = JSON.parse(item);
        if (this.isExpired(entry)) {
            localStorage.removeItem(key);
            return null;
        }

        return this.decompressData(entry.data);
    }

    setLocalStorage(key, entry) {
        try {
            // Check storage quota
            const serialized = JSON.stringify(entry);
            if (this.getStorageSize() + serialized.length > this.maxCacheSize) {
                this.cleanupOldEntries();
            }

            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            // Storage quota exceeded
            this.cleanupOldEntries();
            try {
                localStorage.setItem(key, JSON.stringify(entry));
                return true;
            } catch (retryError) {
                return false;
            }
        }
    }

    invalidateLocalStorage(pattern) {
        const keys = Object.keys(localStorage);
        let count = 0;
        
        keys.forEach(key => {
            if (key.includes(pattern)) {
                localStorage.removeItem(key);
                count++;
            }
        });
        
        return count;
    }

    /**
     * Memory cache implementation
     */
    getMemoryCache(key) {
        const entry = this.memoryCache.get(key);
        if (!entry) return null;

        if (this.isExpired(entry)) {
            this.memoryCache.delete(key);
            return null;
        }

        return entry.data;
    }

    setMemoryCache(key, entry) {
        // Limit memory cache size
        if (this.memoryCache.size > 100) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        this.memoryCache.set(key, entry);
        return true;
    }

    invalidateMemoryCache(pattern) {
        let count = 0;
        
        for (const [key] of this.memoryCache) {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
                count++;
            }
        }
        
        return count;
    }

    /**
     * Utility methods
     */
    generateCacheKey(key) {
        return `${this.cacheName}:${key}`;
    }

    createCacheEntry(data, ttl) {
        return {
            data: this.compressData(data),
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
            ttl: ttl
        };
    }

    async getRawEntry(key) {
        switch (this.cacheType) {
            case 'cache-api':
                const response = await this.cache.match(key);
                return response ? await response.json() : null;
            case 'localstorage':
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            case 'memory':
                return this.memoryCache.get(key) || null;
            default:
                return null;
        }
    }

    isExpired(entry, customTTL = null) {
        const now = Date.now();
        const expiresAt = customTTL ? 
            entry.createdAt + customTTL : 
            entry.expiresAt;
        return now > expiresAt;
    }

    compressData(data) {
        if (!this.compressionEnabled) return data;
        
        try {
            // Simple compression for JSON data
            const jsonString = JSON.stringify(data);
            return {
                compressed: true,
                data: this.simpleCompress(jsonString)
            };
        } catch (error) {
            return data;
        }
    }

    decompressData(data) {
        if (!data || !data.compressed) return data;
        
        try {
            const decompressed = this.simpleDecompress(data.data);
            return JSON.parse(decompressed);
        } catch (error) {
            return data;
        }
    }

    simpleCompress(str) {
        // Simple run-length encoding for demonstration
        return str.replace(/(.)\1+/g, (match, char) => {
            return match.length > 3 ? `${char}${match.length}` : match;
        });
    }

    simpleDecompress(str) {
        // Reverse of simple compression
        return str.replace(/(.)\d+/g, (match, char) => {
            const count = parseInt(match.slice(1));
            return char.repeat(count);
        });
    }

    getStorageSize() {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    cleanupExpiredEntries() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.cacheName)) {
                try {
                    const entry = JSON.parse(localStorage.getItem(key));
                    if (this.isExpired(entry)) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    cleanupOldEntries() {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith(this.cacheName));
        
        // Sort by creation time and remove oldest entries
        const entries = cacheKeys.map(key => {
            try {
                const entry = JSON.parse(localStorage.getItem(key));
                return { key, createdAt: entry.createdAt };
            } catch (error) {
                return { key, createdAt: 0 };
            }
        }).sort((a, b) => a.createdAt - b.createdAt);

        // Remove oldest 25% of entries
        const removeCount = Math.ceil(entries.length * 0.25);
        entries.slice(0, removeCount).forEach(entry => {
            localStorage.removeItem(entry.key);
        });
    }

    getSampleData() {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [77.2090, 28.6139]
                    },
                    properties: {
                        station_id: 'DEMO001',
                        station_name: 'Demo Station',
                        district: 'Demo District',
                        aqi: 150,
                        category: 'Unhealthy for Sensitive Groups',
                        color: '#ff7e00',
                        pollutants: {
                            pm25: { value: 65.5, unit: 'μg/m³', aqi: 150 }
                        },
                        timestamp: new Date().toISOString()
                    }
                }
            ],
            metadata: {
                count: 1,
                generated_at: new Date().toISOString(),
                offline: true
            }
        };
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    async getStats() {
        try {
            let stats = {
                type: this.cacheType,
                size: 0,
                entries: 0,
                hitRate: 0
            };

            switch (this.cacheType) {
                case 'cache-api':
                    const keys = await this.cache.keys();
                    stats.entries = keys.length;
                    break;
                case 'localstorage':
                    const cacheKeys = Object.keys(localStorage)
                        .filter(key => key.startsWith(this.cacheName));
                    stats.entries = cacheKeys.length;
                    stats.size = this.getStorageSize();
                    break;
                case 'memory':
                    stats.entries = this.memoryCache.size;
                    break;
            }

            return stats;
        } catch (error) {
            return { type: this.cacheType, error: error.message };
        }
    }
}

export default CacheController;