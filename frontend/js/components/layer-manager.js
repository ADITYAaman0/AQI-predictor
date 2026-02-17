/**
 * Layer Manager - Map layer creation and management
 * Handles marker clusters, heatmaps, and popups
 */

import config from '../config/config.js';
import mobileResponsive from '../utils/mobile-responsive.js';

class LayerManager {
    constructor(map) {
        this.map = map;
        this.layers = new Map();
        this.markerClusterGroup = null;
        this.heatmapLayer = null;
        this.currentData = null;
        this.mobileResponsive = mobileResponsive;
        
        this.initializeClusterGroup();
        this.setupMobileResponsiveness();
    }

    /**
     * Initialize marker cluster group
     */
    initializeClusterGroup() {
        const clusterRadius = this.mobileResponsive.getOptimalClusterRadius();
        const clusterMaxZoom = this.mobileResponsive.getOptimalClusterMaxZoom();
        
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: clusterRadius,
            disableClusteringAtZoom: clusterMaxZoom,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            // Mobile-specific optimizations
            animate: !this.mobileResponsive.isMobileDevice(),
            animateAddingMarkers: false,
            removeOutsideVisibleBounds: this.mobileResponsive.isMobileDevice(),
            iconCreateFunction: (cluster) => {
                return this.createClusterIcon(cluster);
            }
        });
        
        if (config.DEBUG) {
            console.log('Cluster group initialized', {
                radius: clusterRadius,
                maxZoom: clusterMaxZoom,
                mobile: this.mobileResponsive.isMobileDevice()
            });
        }
    }

    /**
     * Create marker layer from GeoJSON data
     * @param {Object} data - GeoJSON FeatureCollection
     * @param {Object} options - Layer options
     * @returns {Object} - Leaflet layer
     */
    createMarkerLayer(data, options = {}) {
        if (!data || !data.features) {
            throw new Error('Invalid GeoJSON data');
        }

        this.currentData = data;
        
        // Clear existing markers
        this.markerClusterGroup.clearLayers();

        // Create markers for each feature
        const markers = data.features.map(feature => {
            return this.createMarker(feature, options);
        }).filter(marker => marker !== null);

        // Add markers to cluster group
        this.markerClusterGroup.addLayers(markers);

        // Store layer reference
        this.layers.set('markers', this.markerClusterGroup);

        if (config.DEBUG) {
            console.log(`Created marker layer with ${markers.length} markers`);
        }

        return this.markerClusterGroup;
    }

    /**
     * Create individual marker from GeoJSON feature
     * @param {Object} feature - GeoJSON feature
     * @param {Object} options - Marker options
     * @returns {Object} - Leaflet marker
     */
    createMarker(feature, options = {}) {
        try {
            const { geometry, properties } = feature;
            
            if (!geometry || !geometry.coordinates) {
                return null;
            }

            const [lng, lat] = geometry.coordinates;
            const marker = L.circleMarker([lat, lng], {
                radius: this.getMarkerRadius(properties.aqi),
                fillColor: properties.color || '#666',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8,
                ...options
            });

            // Add popup with mobile-optimized max width
            const popupContent = this.createPopupContent(properties);
            const popupMaxWidth = this.mobileResponsive.getOptimalPopupMaxWidth();
            
            marker.bindPopup(popupContent, {
                maxWidth: popupMaxWidth,
                className: 'aqi-popup',
                autoPan: true,
                autoPanPadding: this.mobileResponsive.isMobileDevice() ? [10, 60] : [5, 5]
            });

            // Add tooltip for hover
            marker.bindTooltip(
                `${properties.station_name}: AQI ${properties.aqi}`,
                { 
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10]
                }
            );

            // Store feature data
            marker.feature = feature;

            return marker;
        } catch (error) {
            if (config.DEBUG) {
                console.warn('Failed to create marker:', error, feature);
            }
            return null;
        }
    }

    /**
     * Create heatmap layer from GeoJSON data
     * @param {Object} data - GeoJSON FeatureCollection
     * @param {Object} options - Heatmap options
     * @returns {Object} - Leaflet heatmap layer
     */
    createHeatmapLayer(data, options = {}) {
        if (!data || !data.features) {
            throw new Error('Invalid GeoJSON data');
        }

        // Remove existing heatmap
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }

        // Convert features to heatmap points
        const heatmapPoints = data.features.map(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const intensity = feature.properties.intensity || 
                             this.normalizeAQI(feature.properties.aqi);
            
            return [lat, lng, intensity];
        }).filter(point => point[2] > 0);

        // Create heatmap layer
        this.heatmapLayer = L.heatLayer(heatmapPoints, {
            radius: config.HEATMAP_RADIUS,
            blur: config.HEATMAP_BLUR,
            maxZoom: config.MAP_MAX_ZOOM,
            gradient: this.getHeatmapGradient(),
            ...options
        });

        // Store layer reference
        this.layers.set('heatmap', this.heatmapLayer);

        if (config.DEBUG) {
            console.log(`Created heatmap layer with ${heatmapPoints.length} points`);
        }

        return this.heatmapLayer;
    }

    /**
     * Update existing layer with new data
     * @param {string} layerType - 'markers' | 'heatmap'
     * @param {Object} newData - New GeoJSON data
     * @returns {Object} - Updated layer
     */
    updateLayer(layerType, newData) {
        switch (layerType) {
            case 'markers':
                return this.createMarkerLayer(newData);
            case 'heatmap':
                return this.createHeatmapLayer(newData);
            default:
                throw new Error(`Unknown layer type: ${layerType}`);
        }
    }

    /**
     * Apply filters to layer
     * @param {string} layerType - Layer type
     * @param {Object} filters - Filter criteria
     */
    applyFilters(layerType, filters) {
        if (!this.currentData) return;

        // Filter features based on criteria
        const filteredFeatures = this.currentData.features.filter(feature => {
            return this.matchesFilters(feature, filters);
        });

        const filteredData = {
            ...this.currentData,
            features: filteredFeatures
        };

        // Update layer with filtered data
        this.updateLayer(layerType, filteredData);

        if (config.DEBUG) {
            console.log(`Applied filters, showing ${filteredFeatures.length} features`);
        }
    }

    /**
     * Create popup content for marker
     * @param {Object} properties - Feature properties
     * @returns {string} - HTML popup content
     */
    createPopupContent(properties) {
        const {
            station_name,
            district,
            aqi,
            category,
            color,
            pollutants,
            weather,
            source_attribution,
            forecast,
            timestamp
        } = properties;

        let html = `
            <div class="aqi-popup">
                <h4>${station_name}</h4>
                <p><strong>District:</strong> ${district}</p>
                
                <div class="aqi-value" style="color: ${color};">${aqi}</div>
                <div class="aqi-category ${this.getAQICategoryClass(aqi)}">${category}</div>
        `;

        // Add pollutant information
        if (pollutants && Object.keys(pollutants).length > 0) {
            html += '<div class="pollutant-grid">';
            Object.entries(pollutants).forEach(([pollutant, data]) => {
                html += `
                    <div class="pollutant-item">
                        <div class="pollutant-name">${pollutant.toUpperCase()}</div>
                        <div class="pollutant-value">${data.value} ${data.unit}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Add weather information
        if (weather && (weather.temperature || weather.humidity || weather.wind_speed)) {
            html += '<div class="weather-info">';
            if (weather.temperature) {
                html += `<div>Temperature: ${weather.temperature}°C</div>`;
            }
            if (weather.humidity) {
                html += `<div>Humidity: ${weather.humidity}%</div>`;
            }
            if (weather.wind_speed) {
                html += `<div>Wind: ${weather.wind_speed} m/s</div>`;
            }
            html += '</div>';
        }

        // Add forecast information
        if (forecast && (forecast['1h'] || forecast['6h'] || forecast['24h'])) {
            html += '<div class="forecast-info"><strong>Forecast:</strong>';
            if (forecast['1h']) html += ` 1h: ${forecast['1h']}`;
            if (forecast['6h']) html += ` 6h: ${forecast['6h']}`;
            if (forecast['24h']) html += ` 24h: ${forecast['24h']}`;
            html += '</div>';
        }

        // Add timestamp
        if (timestamp) {
            const date = new Date(timestamp);
            html += `<div class="timestamp">Updated: ${date.toLocaleString()}</div>`;
        }

        html += '</div>';
        return html;
    }

    /**
     * Create cluster icon
     * @param {Object} cluster - Marker cluster
     * @returns {Object} - Leaflet icon
     */
    createClusterIcon(cluster) {
        const markers = cluster.getAllChildMarkers();
        const avgAQI = this.calculateAverageAQI(markers);
        const color = this.getAQIColor(avgAQI);
        const size = Math.min(40 + (markers.length / 10), 60);

        return L.divIcon({
            html: `
                <div style="
                    background-color: ${color};
                    color: white;
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    border: 2px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">
                    ${markers.length}
                </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: [size, size]
        });
    }

    /**
     * Get marker radius based on AQI value
     * @param {number} aqi - AQI value
     * @returns {number} - Marker radius
     */
    getMarkerRadius(aqi) {
        if (aqi <= 50) return 6;
        if (aqi <= 100) return 8;
        if (aqi <= 150) return 10;
        if (aqi <= 200) return 12;
        if (aqi <= 300) return 14;
        return 16;
    }

    /**
     * Get AQI color
     * @param {number} aqi - AQI value
     * @returns {string} - Color hex code
     */
    getAQIColor(aqi) {
        if (aqi <= 50) return '#00e400';
        if (aqi <= 100) return '#ffff00';
        if (aqi <= 150) return '#ff7e00';
        if (aqi <= 200) return '#ff0000';
        if (aqi <= 300) return '#8f3f97';
        return '#7e0023';
    }

    /**
     * Get AQI category CSS class
     * @param {number} aqi - AQI value
     * @returns {string} - CSS class name
     */
    getAQICategoryClass(aqi) {
        if (aqi <= 50) return 'aqi-good';
        if (aqi <= 100) return 'aqi-moderate';
        if (aqi <= 150) return 'aqi-unhealthy-sensitive';
        if (aqi <= 200) return 'aqi-unhealthy';
        if (aqi <= 300) return 'aqi-very-unhealthy';
        return 'aqi-hazardous';
    }

    /**
     * Get heatmap gradient
     * @returns {Object} - Gradient configuration
     */
    getHeatmapGradient() {
        return {
            0.0: '#00e400',
            0.2: '#ffff00',
            0.4: '#ff7e00',
            0.6: '#ff0000',
            0.8: '#8f3f97',
            1.0: '#7e0023'
        };
    }

    /**
     * Normalize AQI value for heatmap intensity
     * @param {number} aqi - AQI value
     * @returns {number} - Normalized intensity (0-1)
     */
    normalizeAQI(aqi) {
        return Math.min(1, Math.max(0, aqi / 500));
    }

    /**
     * Calculate average AQI from markers
     * @param {Array} markers - Array of markers
     * @returns {number} - Average AQI
     */
    calculateAverageAQI(markers) {
        if (!markers || markers.length === 0) return 0;
        
        const total = markers.reduce((sum, marker) => {
            return sum + (marker.feature?.properties?.aqi || 0);
        }, 0);
        
        return Math.round(total / markers.length);
    }

    /**
     * Check if feature matches filters
     * @param {Object} feature - GeoJSON feature
     * @param {Object} filters - Filter criteria
     * @returns {boolean} - Match result
     */
    matchesFilters(feature, filters) {
        const { properties } = feature;
        
        // District filter
        if (filters.district && filters.district !== '') {
            if (properties.district !== filters.district) {
                return false;
            }
        }

        // AQI range filter
        if (filters.minAQI !== undefined && properties.aqi < filters.minAQI) {
            return false;
        }
        
        if (filters.maxAQI !== undefined && properties.aqi > filters.maxAQI) {
            return false;
        }

        // Category filter
        if (filters.category && filters.category !== '') {
            if (properties.category !== filters.category) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get layer by name
     * @param {string} name - Layer name
     * @returns {Object|null} - Leaflet layer
     */
    getLayer(name) {
        return this.layers.get(name) || null;
    }

    /**
     * Remove layer by name
     * @param {string} name - Layer name
     */
    removeLayer(name) {
        const layer = this.layers.get(name);
        if (layer && this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
        }
        this.layers.delete(name);
    }

    /**
     * Clear all layers
     */
    clearAllLayers() {
        this.layers.forEach((layer, name) => {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
        this.layers.clear();
        
        if (this.markerClusterGroup) {
            this.markerClusterGroup.clearLayers();
        }
    }

    /**
     * Get layer statistics
     * @returns {Object} - Layer statistics
     */
    getStats() {
        return {
            totalLayers: this.layers.size,
            markerCount: this.markerClusterGroup ? 
                this.markerClusterGroup.getLayers().length : 0,
            hasHeatmap: !!this.heatmapLayer,
            dataFeatures: this.currentData ? this.currentData.features.length : 0
        };
    }

    /**
     * Get current active layer type
     * @returns {string|null} - Current layer type ('markers' or 'heatmap')
     */
    getCurrentLayerType() {
        if (this.map.hasLayer(this.markerClusterGroup)) {
            return 'markers';
        }
        if (this.heatmapLayer && this.map.hasLayer(this.heatmapLayer)) {
            return 'heatmap';
        }
        return null;
    }

    /**
     * Setup mobile responsiveness handlers
     */
    setupMobileResponsiveness() {
        // Listen for device type changes
        this.mobileResponsive.on('deviceTypeChanged', (data) => {
            if (config.DEBUG) {
                console.log('LayerManager: Device type changed, reinitializing clusters');
            }
            
            // Reinitialize cluster group with new settings
            const currentLayerType = this.getCurrentLayerType();
            const hadData = this.currentData !== null;
            
            if (hadData && currentLayerType === 'markers') {
                // Remove old cluster group
                if (this.map.hasLayer(this.markerClusterGroup)) {
                    this.map.removeLayer(this.markerClusterGroup);
                }
                
                // Reinitialize with mobile-optimized settings
                this.initializeClusterGroup();
                
                // Recreate markers with current data
                this.createMarkerLayer(this.currentData);
                this.map.addLayer(this.markerClusterGroup);
            }
        });
    }

    /**
     * Get mobile responsive instance
     * @returns {Object} - MobileResponsive instance
     */
    getMobileResponsive() {
        return this.mobileResponsive;
    }
}

export default LayerManager;