/**
 * Main Application - Entry point for the Leaflet.js AQI Predictor frontend
 * Initializes and coordinates all components
 */

import config from './config/config.js';
import MapController from './components/map-controller.js';
import DataLoader from './components/data-loader.js';
import LayerManager from './components/layer-manager.js';
import AnimationController from './components/animation-controller.js';
import FilterController from './components/filter-controller.js';
import ErrorHandler from './utils/error-handler.js';

class AQIApp {
    constructor() {
        this.mapController = null;
        this.dataLoader = null;
        this.layerManager = null;
        this.animationController = null;
        this.filterController = null;
        this.errorHandler = null;
        
        this.currentView = 'current';
        this.currentVisualization = 'markers';
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading(true);
            
            // Initialize error handler first
            this.errorHandler = new ErrorHandler();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            this.isInitialized = true;
            this.showLoading(false);
            
            if (config.DEBUG) {
                console.log('AQI App initialized successfully');
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Application Initialization');
            this.showLoading(false);
        }
    }

    /**
     * Initialize core components
     */
    async initializeComponents() {
        // Initialize data loader
        this.dataLoader = new DataLoader();
        
        // Initialize map controller
        this.mapController = new MapController('map');
        
        // Wait for map to be ready
        await new Promise((resolve) => {
            this.mapController.on('mapReady', resolve);
        });
        
        // Initialize layer manager
        this.layerManager = new LayerManager(this.mapController.map);
        
        // Initialize animation controller
        this.animationController = new AnimationController(
            this.layerManager, 
            this.dataLoader
        );
        
        // Initialize filter controller
        this.filterController = new FilterController(
            this.layerManager,
            this.dataLoader
        );
    }

    /**
     * Setup application event listeners
     */
    setupEventListeners() {
        // Map controller events
        this.mapController.on('viewChanged', (viewType) => {
            this.handleViewChange(viewType);
        });

        this.mapController.on('visualizationChanged', (vizType) => {
            this.handleVisualizationChange(vizType);
        });

        this.mapController.on('boundsChanged', (bounds) => {
            this.handleBoundsChange(bounds);
        });

        // Data loader events
        this.dataLoader.on('dataRefreshed', (data) => {
            this.handleDataRefresh(data);
        });

        this.dataLoader.on('networkStatusChanged', (isOnline) => {
            this.handleNetworkStatusChange(isOnline);
        });

        this.dataLoader.on('dataError', (error) => {
            this.errorHandler.handleError(error, 'Data Loading');
        });

        // Animation controller events
        this.animationController.on('hourChanged', (hour) => {
            this.updateDataFreshness(`Forecast: Hour ${hour}`);
        });

        // Filter controller events
        this.filterController.on('filterChanged', (filterData) => {
            if (config.DEBUG) {
                console.log('Filter changed:', filterData);
            }
        });

        this.filterController.on('filtersCleared', () => {
            if (config.DEBUG) {
                console.log('Filters cleared');
            }
        });

        // Error handler events
        this.errorHandler.on('retry', () => {
            this.retryLastOperation();
        });

        this.errorHandler.on('offlineMode', () => {
            this.enableOfflineMode();
        });

        // No longer need setupFilterControls - FilterController handles it
        
        // Window events
        window.addEventListener('resize', () => {
            this.mapController.handleResize();
        });

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space bar: play/pause animation
            if (e.code === 'Space' && this.currentView === 'forecast') {
                e.preventDefault();
                if (this.animationController.getState().isPlaying) {
                    this.animationController.pauseAnimation();
                } else {
                    this.animationController.startAnimation();
                }
            }
            
            // R key: reset animation
            if (e.code === 'KeyR' && this.currentView === 'forecast') {
                e.preventDefault();
                this.animationController.resetAnimation();
            }
            
            // M key: toggle markers/heatmap
            if (e.code === 'KeyM') {
                e.preventDefault();
                const newViz = this.currentVisualization === 'markers' ? 'heatmap' : 'markers';
                this.mapController.switchVisualization(newViz);
            }
            
            // F key: toggle current/forecast
            if (e.code === 'KeyF') {
                e.preventDefault();
                const newView = this.currentView === 'current' ? 'forecast' : 'current';
                this.mapController.switchView(newView);
            }
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load current AQI data
            const currentData = await this.dataLoader.fetchCurrentAQI();
            
            if (currentData && currentData.features) {
                // Create initial layer
                const layer = this.layerManager.createMarkerLayer(currentData);
                this.mapController.addLayer(layer, 'current-markers');
                
                // Load available districts into filter controller
                this.filterController.loadAvailableDistricts(currentData);
                
                // Update data freshness indicator
                this.updateDataFreshness(currentData.metadata?.generated_at);
                
                if (config.DEBUG) {
                    console.log(`Loaded ${currentData.features.length} stations`);
                }
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Initial Data Loading');
        }
    }

    /**
     * Handle view change (current/forecast)
     */
    async handleViewChange(viewType) {
        this.currentView = viewType;
        
        try {
            if (viewType === 'forecast') {
                // Load forecast data for animation
                const success = await this.animationController.loadForecastData('delhi');
                
                if (success) {
                    // Show first frame
                    this.animationController.setHour(0);
                } else {
                    this.errorHandler.handleError(
                        new Error('Failed to load forecast data'),
                        'Forecast Loading'
                    );
                }
            } else {
                // Switch back to current data
                await this.loadCurrentData();
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'View Change');
        }
    }

    /**
     * Handle visualization change (markers/heatmap)
     */
    async handleVisualizationChange(vizType) {
        this.currentVisualization = vizType;
        
        try {
            // Get current data
            let data;
            if (this.currentView === 'current') {
                data = await this.dataLoader.fetchCurrentAQI();
            } else {
                // For forecast, get current animation frame data
                const state = this.animationController.getState();
                if (state.hasData) {
                    // Animation controller will handle the visualization change
                    return;
                }
            }
            
            if (data) {
                // Remove existing layers
                this.layerManager.clearAllLayers();
                
                // Create new layer based on visualization type
                let layer;
                if (vizType === 'markers') {
                    layer = this.layerManager.createMarkerLayer(data);
                    this.mapController.addLayer(layer, 'markers');
                } else if (vizType === 'heatmap') {
                    // For heatmap, we might need spatial data
                    const bounds = this.mapController.getBoundsArray();
                    const spatialData = await this.dataLoader.fetchSpatialData(bounds);
                    layer = this.layerManager.createHeatmapLayer(spatialData || data);
                    this.mapController.addLayer(layer, 'heatmap');
                }
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Visualization Change');
        }
    }

    /**
     * Handle map bounds change
     */
    async handleBoundsChange(bounds) {
        // If using heatmap visualization, update with new bounds
        if (this.currentVisualization === 'heatmap') {
            try {
                const boundsArray = this.mapController.getBoundsArray();
                const spatialData = await this.dataLoader.fetchSpatialData(boundsArray);
                
                if (spatialData) {
                    this.layerManager.updateLayer('heatmap', spatialData);
                }
            } catch (error) {
                // Don't show error for bounds change failures
                if (config.DEBUG) {
                    console.warn('Failed to update heatmap for new bounds:', error);
                }
            }
        }
    }

    /**
     * Handle data refresh
     */
    handleDataRefresh(data) {
        if (this.currentView === 'current') {
            // Update current view with new data
            this.layerManager.updateLayer(this.currentVisualization, data);
            this.updateDataFreshness(data.metadata?.generated_at);
        }
    }

    /**
     * Handle network status change
     */
    handleNetworkStatusChange(isOnline) {
        if (isOnline) {
            // Reconnected - refresh data
            this.loadCurrentData();
        }
    }

    /**
     * Load current data
     */
    async loadCurrentData() {
        try {
            const data = await this.dataLoader.fetchCurrentAQI();
            if (data) {
                this.layerManager.updateLayer(this.currentVisualization, data);
                this.updateDataFreshness(data.metadata?.generated_at);
                
                // Update filter controller with new data
                this.filterController.loadAvailableDistricts(data);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Current Data Loading');
        }
    }

    /**
     * Update data freshness indicator
     */
    updateDataFreshness(timestamp) {
        const freshnessElement = document.getElementById('data-freshness');
        if (!freshnessElement) return;

        const textElement = freshnessElement.querySelector('.freshness-text');
        if (!textElement) return;

        if (timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMinutes = Math.floor((now - date) / (1000 * 60));
            
            let freshnessText;
            if (diffMinutes < 1) {
                freshnessText = 'Updated: Just now';
            } else if (diffMinutes < 60) {
                freshnessText = `Updated: ${diffMinutes}m ago`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                freshnessText = `Updated: ${diffHours}h ago`;
            }
            
            textElement.textContent = freshnessText;
        } else if (typeof timestamp === 'string') {
            textElement.textContent = timestamp;
        } else {
            textElement.textContent = 'Updated: --';
        }
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        this.dataLoader.startAutoRefresh((data) => {
            this.handleDataRefresh(data);
        });
    }

    /**
     * Retry last operation
     */
    async retryLastOperation() {
        if (this.currentView === 'current') {
            await this.loadCurrentData();
        } else {
            await this.handleViewChange('forecast');
        }
    }

    /**
     * Enable offline mode
     */
    enableOfflineMode() {
        // Stop auto-refresh
        this.dataLoader.stopAutoRefresh();
        
        // Load offline data
        this.loadOfflineData();
    }

    /**
     * Load offline data
     */
    async loadOfflineData() {
        try {
            const offlineData = await this.dataLoader.dataLoader.cacheController.getOfflineData();
            if (offlineData) {
                this.layerManager.updateLayer(this.currentVisualization, offlineData);
                this.updateDataFreshness('Offline Mode');
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Failed to load offline data:', error);
            }
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('hidden');
            } else {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    /**
     * Get application statistics
     */
    async getStats() {
        const stats = {
            initialized: this.isInitialized,
            currentView: this.currentView,
            currentVisualization: this.currentVisualization,
            mapState: this.mapController?.getCurrentView(),
            dataLoader: await this.dataLoader?.getStats(),
            layerManager: this.layerManager?.getStats(),
            animation: this.animationController?.getState()
        };

        return stats;
    }

    /**
     * Cleanup and destroy application
     */
    destroy() {
        // Stop auto-refresh
        if (this.dataLoader) {
            this.dataLoader.stopAutoRefresh();
            this.dataLoader.destroy();
        }

        // Destroy components
        if (this.animationController) {
            this.animationController.destroy();
        }

        if (this.filterController) {
            this.filterController.destroy();
        }

        if (this.layerManager) {
            this.layerManager.clearAllLayers();
        }

        if (this.mapController) {
            this.mapController.destroy();
        }

        if (this.errorHandler) {
            this.errorHandler.clear();
        }

        // Clear references
        this.mapController = null;
        this.dataLoader = null;
        this.layerManager = null;
        this.animationController = null;
        this.filterController = null;
        this.errorHandler = null;
        
        this.isInitialized = false;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aqiApp = new AQIApp();
    
    // Expose app to global scope for debugging
    if (config.DEBUG) {
        window.getAppStats = () => window.aqiApp.getStats();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.aqiApp) {
        window.aqiApp.destroy();
    }
});

export default AQIApp;