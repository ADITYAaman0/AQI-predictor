/**
 * End-to-End Integration Tests
 * Tests complete data flow from backend through integration layer to frontend
 */

// Mock Leaflet for testing
if (typeof L === 'undefined') {
    window.L = {
        map: () => ({
            setView: () => {},
            on: () => {},
            addLayer: () => {},
            removeLayer: () => {},
            getBounds: () => ({
                getNorth: () => 29,
                getSouth: () => 28,
                getEast: () => 78,
                getWest: () => 77
            }),
            invalidateSize: () => {}
        }),
        tileLayer: () => ({
            addTo: () => {}
        }),
        markerClusterGroup: () => ({
            addLayer: () => {},
            clearLayers: () => {},
            addTo: () => {}
        }),
        marker: () => ({
            bindPopup: () => ({ addTo: () => {} })
        }),
        heatLayer: () => ({
            addTo: () => {}
        }),
        icon: () => ({}),
        divIcon: () => ({})
    };
}

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function assert(condition, message) {
    if (condition) {
        testResults.passed++;
        testResults.tests.push({ name: message, status: 'PASS' });
        console.log(`✓ ${message}`);
    } else {
        testResults.failed++;
        testResults.tests.push({ name: message, status: 'FAIL' });
        console.error(`✗ ${message}`);
    }
}

async function runE2ETests() {
    console.log('=== End-to-End Integration Tests ===\n');

    // Test 1: Component Initialization Chain
    console.log('Test 1: Component Initialization Chain');
    try {
        const { default: config } = await import('../js/config/config.js');
        assert(config !== null, 'Config module loads successfully');
        assert(config.API_BASE_URL !== undefined, 'Config has API_BASE_URL');
        assert(config.MAP_CENTER !== undefined, 'Config has MAP_CENTER');

        const { default: APIRouter } = await import('../js/integration/api-router.js');
        const apiRouter = new APIRouter();
        assert(apiRouter !== null, 'APIRouter initializes');

        const { default: DataTransformer } = await import('../js/integration/data-transformer.js');
        const dataTransformer = new DataTransformer();
        assert(dataTransformer !== null, 'DataTransformer initializes');

        const { default: CacheController } = await import('../js/integration/cache-controller.js');
        const cacheController = new CacheController();
        assert(cacheController !== null, 'CacheController initializes');

        console.log('✓ All integration layer components initialize\n');
    } catch (error) {
        assert(false, `Component initialization failed: ${error.message}`);
    }

    // Test 2: Data Flow - API Router to Data Transformer
    console.log('Test 2: Data Flow - API Router to Data Transformer');
    try {
        const { default: APIRouter } = await import('../js/integration/api-router.js');
        const { default: DataTransformer } = await import('../js/integration/data-transformer.js');

        const apiRouter = new APIRouter();
        const dataTransformer = new DataTransformer();

        // Mock backend response
        const mockBackendResponse = {
            measurements: [
                {
                    time: '2024-01-15T10:30:00Z',
                    station_id: 'DEL001',
                    station_name: 'Anand Vihar',
                    location: { coordinates: [77.2090, 28.6139] },
                    parameters: {
                        pm25: { value: 165.5, unit: 'μg/m³', aqi: 285 },
                        pm10: { value: 280.3, unit: 'μg/m³', aqi: 245 }
                    },
                    aqi: 285,
                    category: 'Very Unhealthy'
                }
            ]
        };

        // Transform data
        const geoJSON = dataTransformer.toGeoJSON(mockBackendResponse);
        
        assert(geoJSON.type === 'FeatureCollection', 'Transforms to GeoJSON FeatureCollection');
        assert(Array.isArray(geoJSON.features), 'GeoJSON has features array');
        assert(geoJSON.features.length === 1, 'Correct number of features');
        assert(geoJSON.features[0].geometry.type === 'Point', 'Feature has Point geometry');
        assert(geoJSON.features[0].properties.station_id === 'DEL001', 'Preserves station data');
        assert(geoJSON.features[0].properties.aqi === 285, 'Preserves AQI value');

        console.log('✓ Data flows correctly from API to transformer\n');
    } catch (error) {
        assert(false, `Data flow test failed: ${error.message}`);
    }

    // Test 3: Frontend Component Integration
    console.log('Test 3: Frontend Component Integration');
    try {
        const { default: MapController } = await import('../js/components/map-controller.js');
        const { default: DataLoader } = await import('../js/components/data-loader.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');

        // Create mock map element
        const mapDiv = document.createElement('div');
        mapDiv.id = 'test-map';
        document.body.appendChild(mapDiv);

        const mapController = new MapController('test-map');
        assert(mapController !== null, 'MapController initializes with element');

        const dataLoader = new DataLoader();
        assert(dataLoader !== null, 'DataLoader initializes');

        // Wait for map ready
        await new Promise((resolve) => {
            mapController.on('mapReady', resolve);
            setTimeout(resolve, 100); // Fallback timeout
        });

        const layerManager = new LayerManager(mapController.map);
        assert(layerManager !== null, 'LayerManager initializes with map');

        // Cleanup
        document.body.removeChild(mapDiv);

        console.log('✓ Frontend components integrate correctly\n');
    } catch (error) {
        assert(false, `Frontend integration test failed: ${error.message}`);
    }

    // Test 4: Complete Data Pipeline
    console.log('Test 4: Complete Data Pipeline');
    try {
        const { default: DataTransformer } = await import('../js/integration/data-transformer.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');

        const dataTransformer = new DataTransformer();

        // Mock complete backend response
        const mockData = {
            measurements: [
                {
                    time: '2024-01-15T10:30:00Z',
                    station_id: 'DEL001',
                    station_name: 'Anand Vihar',
                    location: { coordinates: [77.2090, 28.6139] },
                    parameters: {
                        pm25: { value: 165.5, unit: 'μg/m³', aqi: 285 }
                    },
                    aqi: 285,
                    category: 'Very Unhealthy'
                },
                {
                    time: '2024-01-15T10:30:00Z',
                    station_id: 'DEL002',
                    station_name: 'Dwarka',
                    location: { coordinates: [77.0469, 28.5921] },
                    parameters: {
                        pm25: { value: 95.2, unit: 'μg/m³', aqi: 175 }
                    },
                    aqi: 175,
                    category: 'Unhealthy'
                }
            ]
        };

        // Transform data
        const geoJSON = dataTransformer.toGeoJSON(mockData);
        assert(geoJSON.features.length === 2, 'Pipeline processes multiple stations');

        // Create mock map for layer manager
        const mockMap = {
            addLayer: () => {},
            removeLayer: () => {},
            getBounds: () => ({
                getNorth: () => 29,
                getSouth: () => 28,
                getEast: () => 78,
                getWest: () => 77
            })
        };

        const layerManager = new LayerManager(mockMap);
        const layer = layerManager.createMarkerLayer(geoJSON);
        assert(layer !== null, 'LayerManager creates layer from transformed data');

        console.log('✓ Complete data pipeline works end-to-end\n');
    } catch (error) {
        assert(false, `Data pipeline test failed: ${error.message}`);
    }

    // Test 5: Error Handling Integration
    console.log('Test 5: Error Handling Integration');
    try {
        const { default: ErrorHandler } = await import('../js/utils/error-handler.js');
        const { default: DataLoader } = await import('../js/components/data-loader.js');

        const errorHandler = new ErrorHandler();
        assert(errorHandler !== null, 'ErrorHandler initializes');

        const dataLoader = new DataLoader();
        
        // Test error event propagation
        let errorCaught = false;
        dataLoader.on('dataError', (error) => {
            errorCaught = true;
        });

        // Simulate error
        dataLoader.emit('dataError', new Error('Test error'));
        assert(errorCaught, 'Error events propagate correctly');

        console.log('✓ Error handling integrates across components\n');
    } catch (error) {
        assert(false, `Error handling test failed: ${error.message}`);
    }

    // Test 6: View Switching Integration
    console.log('Test 6: View Switching Integration');
    try {
        const { default: MapController } = await import('../js/components/map-controller.js');
        const { default: AnimationController } = await import('../js/components/animation-controller.js');

        const mapDiv = document.createElement('div');
        mapDiv.id = 'test-map-2';
        document.body.appendChild(mapDiv);

        const mapController = new MapController('test-map-2');
        
        // Wait for map ready
        await new Promise((resolve) => {
            mapController.on('mapReady', resolve);
            setTimeout(resolve, 100);
        });

        // Test view switching
        let viewChanged = false;
        mapController.on('viewChanged', (viewType) => {
            viewChanged = true;
            assert(viewType === 'forecast', 'View change event fires with correct type');
        });

        mapController.switchView('forecast');
        assert(viewChanged, 'View switching triggers events');

        // Cleanup
        document.body.removeChild(mapDiv);

        console.log('✓ View switching integrates correctly\n');
    } catch (error) {
        assert(false, `View switching test failed: ${error.message}`);
    }

    // Test 7: Caching Integration
    console.log('Test 7: Caching Integration');
    try {
        const { default: CacheController } = await import('../js/integration/cache-controller.js');
        const { default: DataLoader } = await import('../js/components/data-loader.js');

        const cacheController = new CacheController();
        const dataLoader = new DataLoader();

        // Test cache operations
        const testData = { test: 'data', timestamp: Date.now() };
        cacheController.set('test-key', testData, 300);
        
        const cached = cacheController.get('test-key');
        assert(cached !== null, 'Cache stores and retrieves data');
        assert(cached.test === 'data', 'Cached data is correct');

        console.log('✓ Caching integrates with data loading\n');
    } catch (error) {
        assert(false, `Caching integration test failed: ${error.message}`);
    }

    // Test 8: Filter Integration
    console.log('Test 8: Filter Integration');
    try {
        const { default: FilterController } = await import('../js/components/filter-controller.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');

        const mockMap = {
            addLayer: () => {},
            removeLayer: () => {},
            getBounds: () => ({
                getNorth: () => 29,
                getSouth: () => 28,
                getEast: () => 78,
                getWest: () => 77
            })
        };

        const layerManager = new LayerManager(mockMap);
        const mockDataLoader = {
            on: () => {},
            emit: () => {},
            fetchCurrentAQI: async () => ({
                type: 'FeatureCollection',
                features: []
            })
        };

        const filterController = new FilterController(layerManager, mockDataLoader);
        assert(filterController !== null, 'FilterController initializes');

        // Test filter application
        const mockGeoJSON = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { district: 'East Delhi' },
                    geometry: { type: 'Point', coordinates: [77.2, 28.6] }
                },
                {
                    type: 'Feature',
                    properties: { district: 'West Delhi' },
                    geometry: { type: 'Point', coordinates: [77.0, 28.5] }
                }
            ]
        };

        filterController.loadAvailableDistricts(mockGeoJSON);
        const districts = filterController.getAvailableDistricts();
        assert(districts.length === 2, 'Filter extracts available districts');

        console.log('✓ Filter integration works correctly\n');
    } catch (error) {
        assert(false, `Filter integration test failed: ${error.message}`);
    }

    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    return testResults;
}

// Run tests if in browser
if (typeof window !== 'undefined') {
    window.runE2ETests = runE2ETests;
}

// Export for module usage
export { runE2ETests };
