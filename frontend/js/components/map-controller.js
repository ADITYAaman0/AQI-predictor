/**
 * Map Controller - Core map initialization and event handling
 * Manages Leaflet map with OpenFreeMap tiles
 */

import config from '../config/config.js';
import mobileResponsive from '../utils/mobile-responsive.js';
import TouchGestureHandler from '../utils/touch-gestures.js';

class MapController {
    constructor(containerId = 'map') {
        this.containerId = containerId;
        this.map = null;
        this.currentView = 'current'; // 'current' | 'forecast'
        this.currentVisualization = 'markers'; // 'markers' | 'heatmap'
        this.bounds = null;
        this.eventListeners = new Map();
        this.mobileResponsive = mobileResponsive;
        this.touchGestureHandler = null;
        
        this.initializeMap();
        this.setupEventHandlers();
        this.setupMobileResponsiveness();
        this.setupTouchGestures();
    }

    /**
     * Initialize Leaflet map with OpenFreeMap tiles
     */
    initializeMap() {
        try {
            // Get optimal zoom for device
            const initialZoom = this.mobileResponsive.getOptimalMapZoom();
            
            // Initialize map
            this.map = L.map(this.containerId, {
                center: config.MAP_CENTER,
                zoom: initialZoom,
                minZoom: config.MAP_MIN_ZOOM,
                maxZoom: config.MAP_MAX_ZOOM,
                zoomControl: true,
                attributionControl: true,
                // Mobile-specific options
                tap: this.mobileResponsive.isTouchDevice(),
                tapTolerance: this.mobileResponsive.isMobileDevice() ? 15 : 10,
                touchZoom: this.mobileResponsive.isTouchDevice(),
                scrollWheelZoom: !this.mobileResponsive.isMobileDevice()
            });

            // Optimize map for mobile
            this.mobileResponsive.optimizeMapForMobile(this.map);

            // Add OpenFreeMap tile layer
            L.tileLayer(config.TILE_URL, {
                attribution: config.TILE_ATTRIBUTION,
                maxZoom: config.MAP_MAX_ZOOM,
                tileSize: 256,
                zoomOffset: 0
            }).addTo(this.map);

            // Set initial bounds
            this.bounds = this.map.getBounds();

            // Add map event listeners
            this.map.on('moveend', () => {
                this.bounds = this.map.getBounds();
                this.emit('boundsChanged', this.bounds);
            });

            this.map.on('zoomend', () => {
                this.emit('zoomChanged', this.map.getZoom());
            });

            this.map.on('click', (e) => {
                this.emit('mapClick', e.latlng);
            });

            if (config.DEBUG) {
                console.log('Map initialized successfully', {
                    zoom: initialZoom,
                    mobile: this.mobileResponsive.isMobileDevice()
                });
            }

            this.emit('mapReady', this.map);
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.emit('mapError', error);
        }
    }

    /**
     * Setup UI event handlers
     */
    setupEventHandlers() {
        // View toggle buttons
        const currentViewBtn = document.getElementById('current-view');
        const forecastViewBtn = document.getElementById('forecast-view');

        if (currentViewBtn) {
            currentViewBtn.addEventListener('click', () => {
                this.switchView('current');
            });
        }

        if (forecastViewBtn) {
            forecastViewBtn.addEventListener('click', () => {
                this.switchView('forecast');
            });
        }

        // Visualization toggle buttons
        const markersVizBtn = document.getElementById('markers-viz');
        const heatmapVizBtn = document.getElementById('heatmap-viz');

        if (markersVizBtn) {
            markersVizBtn.addEventListener('click', () => {
                this.switchVisualization('markers');
            });
        }

        if (heatmapVizBtn) {
            heatmapVizBtn.addEventListener('click', () => {
                this.switchVisualization('heatmap');
            });
        }
    }

    /**
     * Switch between current and forecast views
     * @param {string} viewType - 'current' | 'forecast'
     */
    switchView(viewType) {
        if (this.currentView === viewType) return;

        this.currentView = viewType;

        // Update UI buttons
        this.updateViewButtons();

        // Show/hide animation controls
        const animationControls = document.getElementById('animation-controls');
        if (animationControls) {
            if (viewType === 'forecast') {
                animationControls.classList.remove('hidden');
            } else {
                animationControls.classList.add('hidden');
            }
        }

        this.emit('viewChanged', viewType);

        if (config.DEBUG) {
            console.log(`Switched to ${viewType} view`);
        }
    }

    /**
     * Switch between markers and heatmap visualizations
     * @param {string} vizType - 'markers' | 'heatmap'
     */
    switchVisualization(vizType) {
        if (this.currentVisualization === vizType) return;

        this.currentVisualization = vizType;

        // Update UI buttons
        this.updateVisualizationButtons();

        this.emit('visualizationChanged', vizType);

        if (config.DEBUG) {
            console.log(`Switched to ${vizType} visualization`);
        }
    }

    /**
     * Update view toggle button states
     */
    updateViewButtons() {
        const currentBtn = document.getElementById('current-view');
        const forecastBtn = document.getElementById('forecast-view');

        if (currentBtn && forecastBtn) {
            currentBtn.classList.toggle('active', this.currentView === 'current');
            forecastBtn.classList.toggle('active', this.currentView === 'forecast');
        }
    }

    /**
     * Update visualization toggle button states
     */
    updateVisualizationButtons() {
        const markersBtn = document.getElementById('markers-viz');
        const heatmapBtn = document.getElementById('heatmap-viz');

        if (markersBtn && heatmapBtn) {
            markersBtn.classList.toggle('active', this.currentVisualization === 'markers');
            heatmapBtn.classList.toggle('active', this.currentVisualization === 'heatmap');
        }
    }

    /**
     * Update map bounds
     * @param {Object} bounds - Leaflet bounds object
     */
    updateBounds(bounds) {
        if (bounds && this.map) {
            this.map.fitBounds(bounds);
            this.bounds = bounds;
        }
    }

    /**
     * Get current map view information
     * @returns {Object} - Current view state
     */
    getCurrentView() {
        return {
            view: this.currentView,
            visualization: this.currentVisualization,
            center: this.map ? this.map.getCenter() : null,
            zoom: this.map ? this.map.getZoom() : null,
            bounds: this.bounds
        };
    }

    /**
     * Set map center and zoom
     * @param {Array} center - [latitude, longitude]
     * @param {number} zoom - Zoom level
     */
    setView(center, zoom) {
        if (this.map) {
            this.map.setView(center, zoom);
        }
    }

    /**
     * Add layer to map
     * @param {Object} layer - Leaflet layer
     * @param {string} name - Layer name for tracking
     */
    addLayer(layer, name) {
        if (this.map && layer) {
            layer.addTo(this.map);
            this.emit('layerAdded', { layer, name });
        }
    }

    /**
     * Remove layer from map
     * @param {Object} layer - Leaflet layer
     * @param {string} name - Layer name
     */
    removeLayer(layer, name) {
        if (this.map && layer) {
            this.map.removeLayer(layer);
            this.emit('layerRemoved', { layer, name });
        }
    }

    /**
     * Get map bounds in API format
     * @returns {Array} - [south, west, north, east]
     */
    getBoundsArray() {
        if (!this.bounds) return null;
        
        return [
            this.bounds.getSouth(),
            this.bounds.getWest(),
            this.bounds.getNorth(),
            this.bounds.getEast()
        ];
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
                
                // Re-optimize for new viewport size
                this.mobileResponsive.optimizeMapForMobile(this.map);
            }, 100);
        }
    }

    /**
     * Setup mobile responsiveness handlers
     */
    setupMobileResponsiveness() {
        // Listen for device type changes
        this.mobileResponsive.on('deviceTypeChanged', (data) => {
            if (config.DEBUG) {
                console.log('Device type changed:', data);
            }
            
            // Re-optimize map for new device type
            this.mobileResponsive.optimizeMapForMobile(this.map);
            
            // Adjust zoom if needed
            if (data.isMobile && this.map.getZoom() > 12) {
                this.map.setZoom(12);
            }
            
            this.emit('deviceTypeChanged', data);
        });
        
        // Listen for orientation changes
        this.mobileResponsive.on('orientationChanged', (data) => {
            if (config.DEBUG) {
                console.log('Orientation changed:', data.orientation);
            }
            
            // Invalidate map size after orientation change
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 200);
            
            this.emit('orientationChanged', data);
        });
        
        // Listen for viewport resize
        this.mobileResponsive.on('viewportResized', () => {
            this.handleResize();
        });
    }

    /**
     * Get mobile responsive instance
     * @returns {Object} - MobileResponsive instance
     */
    getMobileResponsive() {
        return this.mobileResponsive;
    }

    /**
     * Setup touch gesture handlers
     */
    setupTouchGestures() {
        if (this.map && this.mobileResponsive.isTouchDevice()) {
            this.touchGestureHandler = new TouchGestureHandler(this.map);
            
            if (config.DEBUG) {
                console.log('Touch gestures initialized for map');
            }
        }
    }

    /**
     * Get touch gesture handler
     * @returns {Object|null} - TouchGestureHandler instance
     */
    getTouchGestureHandler() {
        return this.touchGestureHandler;
    }

    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Destroy map and cleanup
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.eventListeners.clear();
    }
}

export default MapController;