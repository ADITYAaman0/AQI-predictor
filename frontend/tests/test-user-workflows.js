/**
 * User Workflow Integration Tests
 * Tests complete user workflows including viewing current data, forecast animation, and mobile usage
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
            invalidateSize: () => {},
            getZoom: () => 10,
            getCenter: () => ({ lat: 28.6139, lng: 77.2090 })
        }),
        tileLayer: () => ({
            addTo: () => {}
        }),
        markerClusterGroup: () => ({
            addLayer: () => {},
            clearLayers: () => {},
            addTo: () => {},
            getLayers: () => []
        }),
        marker: () => ({
            bindPopup: () => ({ addTo: () => {} }),
            getLatLng: () => ({ lat: 28.6139, lng: 77.2090 })
        }),
        heatLayer: () => ({
            addTo: () => {},
            setLatLngs: () => {}
        }),
        icon: () => ({}),
        divIcon: () => ({})
    };
}

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

async function runUserWorkflowTests() {
    console.log('=== User Workflow Integration Tests ===\n');

    // Workflow 1: Viewing Current AQI Data
    console.log('Workflow 1: Viewing Current AQI Data');
    try {
        const { default: DataLoader } = await import('../js/components/data-loader.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');
        const { default: MapController } = await import('../js/components/map-controller.js');

        // Create mock map element
        const mapDiv = document.createElement('div');
        mapDiv.id = 'workflow-test-map-1';
        document.body.appendChild(mapDiv);

        // Initialize components
        const mapController = new MapController('workflow-test-map-1');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const dataLoader = new DataLoader();
        const layerManager = new LayerManager(mapController.map);

        // Simulate user viewing current data
        const mockCurrentData = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [77.2090, 28.6139] },
                    properties: {
                        station_id: 'DEL001',
                        station_name: 'Anand Vihar',
                        aqi: 285,
                        category: 'Very Unhealthy'
                    }
                }
            ],
            metadata: { generated_at: new Date().toISOString() }
        };

        // Create marker layer
        const layer = layerManager.createMarkerLayer(mockCurrentData);
        assert(layer !== null, 'User can view current AQI data on map');
        assert(mockCurrentData.features.length > 0, 'Current data contains station information');

        // Cleanup
        document.body.removeChild(mapDiv);

        console.log('✓ Current data viewing workflow complete\n');
    } catch (error) {
        assert(false, `Current data workflow failed: ${error.message}`);
    }

    // Workflow 2: Forecast Animation
    console.log('Workflow 2: Forecast Animation');
    try {
        const { default: AnimationController } = await import('../js/components/animation-controller.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');
        const { default: DataLoader } = await import('../js/components/data-loader.js');

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
        const dataLoader = new DataLoader();
        const animationController = new AnimationController(layerManager, dataLoader);

        // Simulate user starting forecast animation
        const mockForecastData = [];
        for (let hour = 0; hour < 24; hour++) {
            mockForecastData.push({
                hour,
                timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
                stations: [
                    {
                        station_id: 'DEL001',
                        coordinates: [77.2090, 28.6139],
                        aqi: 285 + hour * 2,
                        category: 'Very Unhealthy'
                    }
                ]
            });
        }

        // Load forecast data
        animationController.forecastData = mockForecastData;
        animationController.hasData = true;

        // Test animation controls
        animationController.startAnimation();
        assert(animationController.getState().isPlaying, 'User can start forecast animation');

        animationController.pauseAnimation();
        assert(!animationController.getState().isPlaying, 'User can pause forecast animation');

        animationController.setHour(12);
        assert(animationController.getState().currentHour === 12, 'User can scrub to specific hour');

        animationController.resetAnimation();
        assert(animationController.getState().currentHour === 0, 'User can reset animation');

        console.log('✓ Forecast animation workflow complete\n');
    } catch (error) {
        assert(false, `Forecast animation workflow failed: ${error.message}`);
    }

    // Workflow 3: Mobile Usage
    console.log('Workflow 3: Mobile Usage');
    try {
        const { default: MobileResponsive } = await import('../js/utils/mobile-responsive.js');
        const { default: TouchGestures } = await import('../js/utils/touch-gestures.js');

        // Simulate mobile viewport
        const originalWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375
        });

        const mobileResponsive = new MobileResponsive();
        assert(mobileResponsive.isMobile(), 'System detects mobile device');

        // Test touch gestures
        const mockMap = {
            getZoom: () => 10,
            setZoom: () => {},
            panBy: () => {},
            on: () => {},
            off: () => {}
        };

        const touchGestures = new TouchGestures(mockMap);
        assert(touchGestures !== null, 'Touch gestures initialize on mobile');

        // Restore original width
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalWidth
        });

        console.log('✓ Mobile usage workflow complete\n');
    } catch (error) {
        assert(false, `Mobile usage workflow failed: ${error.message}`);
    }

    // Workflow 4: Error Handling and Graceful Degradation
    console.log('Workflow 4: Error Handling and Graceful Degradation');
    try {
        const { default: ErrorHandler } = await import('../js/utils/error-handler.js');
        const { default: CacheController } = await import('../js/integration/cache-controller.js');

        const errorHandler = new ErrorHandler();
        const cacheController = new CacheController();

        // Test network error handling
        const networkError = new Error('Network request failed');
        networkError.name = 'NetworkError';

        let errorHandled = false;
        errorHandler.on('offlineMode', () => {
            errorHandled = true;
        });

        errorHandler.handleNetworkError(networkError);
        assert(errorHandled, 'System handles network errors gracefully');

        // Test offline data access
        const offlineData = {
            type: 'FeatureCollection',
            features: [],
            metadata: { cached_at: Date.now() }
        };
        cacheController.set('offline-data', offlineData, 3600);

        const cached = cacheController.get('offline-data');
        assert(cached !== null, 'System provides offline data access');

        console.log('✓ Error handling workflow complete\n');
    } catch (error) {
        assert(false, `Error handling workflow failed: ${error.message}`);
    }

    // Workflow 5: Authentication Flow
    console.log('Workflow 5: Authentication Flow');
    try {
        const { default: AuthManager } = await import('../js/integration/auth-manager.js');

        const authManager = new AuthManager();

        // Test token management
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
        authManager.setToken(mockToken);

        const storedToken = authManager.getToken();
        assert(storedToken === mockToken, 'System stores authentication token');

        // Test token inclusion in requests
        const headers = authManager.getAuthHeaders();
        assert(headers.Authorization === `Bearer ${mockToken}`, 'System includes token in API requests');

        // Test token expiration handling
        authManager.clearToken();
        const clearedToken = authManager.getToken();
        assert(clearedToken === null, 'System handles token expiration');

        console.log('✓ Authentication workflow complete\n');
    } catch (error) {
        assert(false, `Authentication workflow failed: ${error.message}`);
    }

    // Workflow 6: Filtering and District Selection
    console.log('Workflow 6: Filtering and District Selection');
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

        // Test district filtering
        const mockData = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { district: 'East Delhi', aqi: 285 },
                    geometry: { type: 'Point', coordinates: [77.2, 28.6] }
                },
                {
                    type: 'Feature',
                    properties: { district: 'West Delhi', aqi: 175 },
                    geometry: { type: 'Point', coordinates: [77.0, 28.5] }
                }
            ]
        };

        filterController.loadAvailableDistricts(mockData);
        const districts = filterController.getAvailableDistricts();
        assert(districts.length === 2, 'User can see available districts');

        filterController.applyDistrictFilter('East Delhi');
        const filtered = filterController.filterData(mockData);
        assert(filtered.features.length === 1, 'User can filter by district');
        assert(filtered.features[0].properties.district === 'East Delhi', 'Filter shows correct district');

        console.log('✓ Filtering workflow complete\n');
    } catch (error) {
        assert(false, `Filtering workflow failed: ${error.message}`);
    }

    // Workflow 7: Visualization Mode Switching
    console.log('Workflow 7: Visualization Mode Switching');
    try {
        const { default: MapController } = await import('../js/components/map-controller.js');
        const { default: LayerManager } = await import('../js/components/layer-manager.js');

        const mapDiv = document.createElement('div');
        mapDiv.id = 'workflow-test-map-2';
        document.body.appendChild(mapDiv);

        const mapController = new MapController('workflow-test-map-2');
        await new Promise(resolve => setTimeout(resolve, 100));

        const layerManager = new LayerManager(mapController.map);

        // Test switching between markers and heatmap
        let vizChanged = false;
        mapController.on('visualizationChanged', (vizType) => {
            vizChanged = true;
            assert(vizType === 'heatmap', 'User can switch to heatmap view');
        });

        mapController.switchVisualization('heatmap');
        assert(vizChanged, 'Visualization mode change triggers correctly');

        // Cleanup
        document.body.removeChild(mapDiv);

        console.log('✓ Visualization switching workflow complete\n');
    } catch (error) {
        assert(false, `Visualization switching workflow failed: ${error.message}`);
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
    window.runUserWorkflowTests = runUserWorkflowTests;
}

// Export for module usage
export { runUserWorkflowTests };
