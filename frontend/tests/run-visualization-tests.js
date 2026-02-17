/**
 * Test Runner for Visualization Property Tests
 * Runs in Node.js environment using jsdom for DOM simulation
 */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.L = {
    map: () => ({
        setView: () => {},
        getBounds: () => ({
            getSouth: () => 28.4,
            getWest: () => 76.8,
            getNorth: () => 28.9,
            getEast: () => 77.6
        }),
        on: () => {},
        remove: () => {},
        hasLayer: () => true,
        removeLayer: () => {},
        invalidateSize: () => {}
    }),
    tileLayer: () => ({
        addTo: () => {}
    }),
    circleMarker: (latlng, options) => ({
        bindPopup: function(content, opts) {
            this._popup = { content, options: opts };
            return this;
        },
        bindTooltip: function(content, opts) {
            this._tooltip = { content, options: opts };
            return this;
        },
        getPopup: function() {
            return this._popup ? {
                getContent: () => this._popup.content
            } : null;
        },
        getTooltip: function() {
            return this._tooltip ? {
                getContent: () => this._tooltip.content
            } : null;
        },
        options: options,
        feature: null
    }),
    markerClusterGroup: (options) => ({
        clearLayers: () => {},
        addLayers: () => {},
        getLayers: () => [],
        addTo: () => {}
    }),
    heatLayer: (points, options) => ({
        _latlngs: points,
        addTo: () => {}
    }),
    divIcon: (options) => options
};

// Mock config
const mockConfig = {
    MAP_CENTER: [28.6139, 77.2090],
    MAP_ZOOM: 10,
    MAP_MIN_ZOOM: 5,
    MAP_MAX_ZOOM: 18,
    TILE_URL: 'https://tiles.openfreemap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: 'OpenFreeMap',
    MARKER_CLUSTER_RADIUS: 80,
    MARKER_CLUSTER_MAX_ZOOM: 15,
    HEATMAP_RADIUS: 25,
    HEATMAP_BLUR: 15,
    POPUP_MAX_WIDTH: 300,
    DEBUG: false
};

// Load and execute test file
async function runTests() {
    try {
        console.log('🚀 Starting Visualization Property Tests\n');
        
        // Import test module (we'll need to mock the imports)
        const { runVisualizationTests } = await import('./test-visualization-properties.js');
        
        // Run tests
        const success = await runVisualizationTests();
        
        // Exit with appropriate code
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runTests();
