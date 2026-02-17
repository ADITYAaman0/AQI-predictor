/**
 * Mobile Responsive Utilities
 * Handles mobile-specific behavior, viewport detection, and touch optimization
 */

import config from '../config/config.js';

class MobileResponsive {
    constructor() {
        this.isMobile = false;
        this.isTablet = false;
        this.isLandscape = false;
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        this.touchDevice = false;
        
        this.detectDevice();
        this.setupEventListeners();
    }

    /**
     * Detect device type and capabilities
     */
    detectDevice() {
        // Check viewport width
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        
        // Determine device type
        this.isMobile = this.viewportWidth <= 480;
        this.isTablet = this.viewportWidth > 480 && this.viewportWidth <= 768;
        this.isLandscape = this.viewportWidth > this.viewportHeight;
        
        // Check for touch support
        this.touchDevice = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) || 
                          (navigator.msMaxTouchPoints > 0);
        
        // Update body classes
        this.updateBodyClasses();
        
        if (config.DEBUG) {
            console.log('Device detection:', {
                isMobile: this.isMobile,
                isTablet: this.isTablet,
                isLandscape: this.isLandscape,
                touchDevice: this.touchDevice,
                viewport: `${this.viewportWidth}x${this.viewportHeight}`
            });
        }
    }

    /**
     * Update body classes based on device type
     */
    updateBodyClasses() {
        const body = document.body;
        
        // Remove existing classes
        body.classList.remove('mobile', 'tablet', 'desktop', 'touch', 'landscape', 'portrait');
        
        // Add device type classes
        if (this.isMobile) {
            body.classList.add('mobile');
        } else if (this.isTablet) {
            body.classList.add('tablet');
        } else {
            body.classList.add('desktop');
        }
        
        // Add touch class
        if (this.touchDevice) {
            body.classList.add('touch');
        }
        
        // Add orientation class
        body.classList.add(this.isLandscape ? 'landscape' : 'portrait');
    }

    /**
     * Setup event listeners for responsive behavior
     */
    setupEventListeners() {
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Handle visibility change (for mobile battery optimization)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const oldIsMobile = this.isMobile;
        const oldIsTablet = this.isTablet;
        
        this.detectDevice();
        
        // Emit resize event if device type changed
        if (oldIsMobile !== this.isMobile || oldIsTablet !== this.isTablet) {
            this.emitEvent('deviceTypeChanged', {
                isMobile: this.isMobile,
                isTablet: this.isTablet,
                viewportWidth: this.viewportWidth,
                viewportHeight: this.viewportHeight
            });
        }
        
        this.emitEvent('viewportResized', {
            width: this.viewportWidth,
            height: this.viewportHeight
        });
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        const oldIsLandscape = this.isLandscape;
        
        this.detectDevice();
        
        if (oldIsLandscape !== this.isLandscape) {
            this.emitEvent('orientationChanged', {
                isLandscape: this.isLandscape,
                orientation: this.isLandscape ? 'landscape' : 'portrait'
            });
        }
        
        if (config.DEBUG) {
            console.log('Orientation changed:', this.isLandscape ? 'landscape' : 'portrait');
        }
    }

    /**
     * Handle visibility change (page hidden/visible)
     */
    handleVisibilityChange() {
        const isHidden = document.hidden;
        
        this.emitEvent('visibilityChanged', {
            hidden: isHidden,
            visible: !isHidden
        });
        
        if (config.DEBUG) {
            console.log('Page visibility:', isHidden ? 'hidden' : 'visible');
        }
    }

    /**
     * Get optimal marker cluster radius for current viewport
     * @returns {number} - Cluster radius in pixels
     */
    getOptimalClusterRadius() {
        if (this.isMobile) {
            return 60; // Larger clusters for mobile
        } else if (this.isTablet) {
            return 50;
        } else {
            return config.MARKER_CLUSTER_RADIUS || 40;
        }
    }

    /**
     * Get optimal marker cluster max zoom for current viewport
     * @returns {number} - Max zoom level for clustering
     */
    getOptimalClusterMaxZoom() {
        if (this.isMobile) {
            return 14; // Cluster more aggressively on mobile
        } else if (this.isTablet) {
            return 15;
        } else {
            return config.MARKER_CLUSTER_MAX_ZOOM || 16;
        }
    }

    /**
     * Get optimal map zoom level for current viewport
     * @returns {number} - Zoom level
     */
    getOptimalMapZoom() {
        if (this.isMobile) {
            return Math.max(config.MAP_ZOOM - 1, config.MAP_MIN_ZOOM);
        } else if (this.isTablet) {
            return config.MAP_ZOOM;
        } else {
            return config.MAP_ZOOM;
        }
    }

    /**
     * Check if control panel should be collapsed by default
     * @returns {boolean}
     */
    shouldCollapseControlPanel() {
        return this.isMobile && !this.isLandscape;
    }

    /**
     * Get optimal popup max width for current viewport
     * @returns {number} - Max width in pixels
     */
    getOptimalPopupMaxWidth() {
        if (this.isMobile) {
            return Math.min(240, this.viewportWidth - 40);
        } else if (this.isTablet) {
            return 280;
        } else {
            return config.POPUP_MAX_WIDTH || 300;
        }
    }

    /**
     * Check if device is mobile or tablet
     * @returns {boolean}
     */
    isMobileDevice() {
        return this.isMobile || this.isTablet;
    }

    /**
     * Check if device supports touch
     * @returns {boolean}
     */
    isTouchDevice() {
        return this.touchDevice;
    }

    /**
     * Get viewport dimensions
     * @returns {Object} - {width, height}
     */
    getViewportDimensions() {
        return {
            width: this.viewportWidth,
            height: this.viewportHeight
        };
    }

    /**
     * Get device info
     * @returns {Object} - Device information
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isDesktop: !this.isMobile && !this.isTablet,
            isLandscape: this.isLandscape,
            touchDevice: this.touchDevice,
            viewportWidth: this.viewportWidth,
            viewportHeight: this.viewportHeight
        };
    }

    /**
     * Optimize map for mobile viewport
     * @param {Object} map - Leaflet map instance
     */
    optimizeMapForMobile(map) {
        if (!map) return;
        
        if (this.isMobileDevice()) {
            // Disable double-click zoom on mobile (use pinch instead)
            map.doubleClickZoom.disable();
            
            // Enable tap tolerance for better touch interaction
            map.options.tapTolerance = 15;
            
            // Adjust zoom animation duration for mobile
            map.options.zoomAnimationThreshold = 4;
            
            if (config.DEBUG) {
                console.log('Map optimized for mobile viewport');
            }
        } else {
            // Re-enable double-click zoom on desktop
            map.doubleClickZoom.enable();
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail data
     */
    emitEvent(eventName, detail) {
        const event = new CustomEvent(`mobileResponsive:${eventName}`, {
            detail,
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    /**
     * Add event listener for mobile responsive events
     * @param {string} eventName - Event name (without prefix)
     * @param {Function} callback - Event callback
     */
    on(eventName, callback) {
        window.addEventListener(`mobileResponsive:${eventName}`, (e) => {
            callback(e.detail);
        });
    }

    /**
     * Remove event listener
     * @param {string} eventName - Event name (without prefix)
     * @param {Function} callback - Event callback
     */
    off(eventName, callback) {
        window.removeEventListener(`mobileResponsive:${eventName}`, callback);
    }
}

// Create singleton instance
const mobileResponsive = new MobileResponsive();

export default mobileResponsive;
