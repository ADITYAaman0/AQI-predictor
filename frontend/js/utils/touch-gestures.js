/**
 * Touch Gesture Handler
 * Handles touch gestures for mobile devices including pinch-to-zoom and pan navigation
 */

import config from '../config/config.js';
import mobileResponsive from './mobile-responsive.js';

class TouchGestureHandler {
    constructor(map) {
        this.map = map;
        this.touchStartDistance = 0;
        this.touchStartZoom = 0;
        this.touchStartCenter = null;
        this.isPinching = false;
        this.isPanning = false;
        this.touchStartTime = 0;
        this.lastTap = 0;
        this.tapTimeout = null;
        
        // Only enable on touch devices
        if (mobileResponsive.isTouchDevice()) {
            this.setupTouchHandlers();
        }
    }

    /**
     * Setup touch event handlers
     */
    setupTouchHandlers() {
        const mapContainer = this.map.getContainer();
        
        // Touch start
        mapContainer.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });
        
        // Touch move
        mapContainer.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });
        
        // Touch end
        mapContainer.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });
        
        // Touch cancel
        mapContainer.addEventListener('touchcancel', (e) => {
            this.handleTouchCancel(e);
        }, { passive: false });
        
        if (config.DEBUG) {
            console.log('Touch gesture handlers initialized');
        }
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        
        if (e.touches.length === 2) {
            // Two-finger touch - prepare for pinch
            this.isPinching = true;
            this.isPanning = false;
            
            this.touchStartDistance = this.getTouchDistance(e.touches);
            this.touchStartZoom = this.map.getZoom();
            this.touchStartCenter = this.map.getCenter();
            
            // Prevent default to avoid browser zoom
            e.preventDefault();
            
            if (config.DEBUG) {
                console.log('Pinch gesture started', {
                    distance: this.touchStartDistance,
                    zoom: this.touchStartZoom
                });
            }
        } else if (e.touches.length === 1) {
            // Single finger touch - prepare for pan or tap
            this.isPanning = true;
            this.isPinching = false;
            
            // Check for double tap
            const now = Date.now();
            const timeSinceLastTap = now - this.lastTap;
            
            if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                // Double tap detected - zoom in
                this.handleDoubleTap(e);
                this.lastTap = 0;
            } else {
                this.lastTap = now;
            }
        }
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        if (this.isPinching && e.touches.length === 2) {
            // Handle pinch-to-zoom
            this.handlePinchZoom(e);
            e.preventDefault();
        } else if (this.isPanning && e.touches.length === 1) {
            // Leaflet handles single-finger panning by default
            // We just track the state
        }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        const touchDuration = Date.now() - this.touchStartTime;
        
        if (this.isPinching) {
            // End pinch gesture
            this.isPinching = false;
            
            if (config.DEBUG) {
                console.log('Pinch gesture ended', {
                    finalZoom: this.map.getZoom(),
                    duration: touchDuration
                });
            }
        }
        
        if (this.isPanning && touchDuration < 200 && e.touches.length === 0) {
            // Quick tap - might be a tap gesture
            // Leaflet handles this by default
        }
        
        // Reset states if no touches remain
        if (e.touches.length === 0) {
            this.isPinching = false;
            this.isPanning = false;
        }
    }

    /**
     * Handle touch cancel event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchCancel(e) {
        // Reset all gesture states
        this.isPinching = false;
        this.isPanning = false;
        this.touchStartDistance = 0;
        this.touchStartZoom = 0;
        this.touchStartCenter = null;
        
        if (config.DEBUG) {
            console.log('Touch gesture cancelled');
        }
    }

    /**
     * Handle pinch-to-zoom gesture
     * @param {TouchEvent} e - Touch event
     */
    handlePinchZoom(e) {
        const currentDistance = this.getTouchDistance(e.touches);
        const distanceRatio = currentDistance / this.touchStartDistance;
        
        // Calculate new zoom level
        const zoomDelta = Math.log2(distanceRatio);
        let newZoom = this.touchStartZoom + zoomDelta;
        
        // Clamp zoom to map limits
        newZoom = Math.max(this.map.getMinZoom(), Math.min(this.map.getMaxZoom(), newZoom));
        
        // Get center point between two touches
        const centerPoint = this.getTouchCenter(e.touches);
        const centerLatLng = this.map.containerPointToLatLng(centerPoint);
        
        // Apply zoom with smooth animation
        this.map.setZoomAround(centerLatLng, newZoom, {
            animate: false // Disable animation for smooth pinch
        });
        
        if (config.DEBUG && Math.abs(zoomDelta) > 0.1) {
            console.log('Pinch zoom', {
                ratio: distanceRatio.toFixed(2),
                zoom: newZoom.toFixed(2)
            });
        }
    }

    /**
     * Handle double tap gesture
     * @param {TouchEvent} e - Touch event
     */
    handleDoubleTap(e) {
        const touch = e.touches[0];
        const point = L.point(touch.clientX, touch.clientY);
        const latLng = this.map.containerPointToLatLng(point);
        
        // Zoom in by one level
        const currentZoom = this.map.getZoom();
        const newZoom = Math.min(currentZoom + 1, this.map.getMaxZoom());
        
        this.map.setZoomAround(latLng, newZoom, {
            animate: true
        });
        
        if (config.DEBUG) {
            console.log('Double tap zoom', {
                from: currentZoom,
                to: newZoom
            });
        }
        
        e.preventDefault();
    }

    /**
     * Get distance between two touch points
     * @param {TouchList} touches - Touch list
     * @returns {number} - Distance in pixels
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get center point between two touches
     * @param {TouchList} touches - Touch list
     * @returns {Object} - Point {x, y}
     */
    getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    /**
     * Enable touch gestures
     */
    enable() {
        if (mobileResponsive.isTouchDevice()) {
            this.setupTouchHandlers();
            
            if (config.DEBUG) {
                console.log('Touch gestures enabled');
            }
        }
    }

    /**
     * Disable touch gestures
     */
    disable() {
        const mapContainer = this.map.getContainer();
        
        // Remove all touch event listeners
        mapContainer.removeEventListener('touchstart', this.handleTouchStart);
        mapContainer.removeEventListener('touchmove', this.handleTouchMove);
        mapContainer.removeEventListener('touchend', this.handleTouchEnd);
        mapContainer.removeEventListener('touchcancel', this.handleTouchCancel);
        
        if (config.DEBUG) {
            console.log('Touch gestures disabled');
        }
    }

    /**
     * Check if currently performing a gesture
     * @returns {boolean}
     */
    isGestureActive() {
        return this.isPinching || this.isPanning;
    }

    /**
     * Get current gesture state
     * @returns {Object} - Gesture state
     */
    getGestureState() {
        return {
            isPinching: this.isPinching,
            isPanning: this.isPanning,
            touchStartDistance: this.touchStartDistance,
            touchStartZoom: this.touchStartZoom
        };
    }
}

export default TouchGestureHandler;
