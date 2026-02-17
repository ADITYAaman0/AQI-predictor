/**
 * Property-Based Tests for Visualization Mode Switching and Interactive Features
 * Tests Property 8: Visualization Mode Switching
 * Tests Property 9: Interactive Feature Completeness
 * 
 * **Property 8 Validates: Requirements 4.1, 4.2, 4.4**
 * **Property 9 Validates: Requirements 4.3**
 * 
 * Property 8: For any visualization mode change (markers to heatmap or current to forecast), 
 * the Leaflet Frontend should correctly render the new visualization with proper data display 
 * and interactive functionality.
 * 
 * Property 9: For any station marker click interaction, the Leaflet Frontend should display 
 * a detailed popup containing all required information (pollutant levels, weather, and source attribution).
 */

import MapController from '../js/components/map-controller.js';
import LayerManager from '../js/components/layer-manager.js';
import config from '../js/config/config.js';

// Test data generators for property-based testing
const generators = {
    // Generate valid visualization modes
    visualizationMode: () => {
        const modes = ['markers', 'heatmap'];
        return modes[Math.floor(Math.random() * modes.length)];
    },

    // Generate valid view types
    viewType: () => {
        const views = ['current', 'forecast'];
        return views[Math.floor(Math.random() * views.length)];
    },

    // Generate valid GeoJSON feature for testing
    geoJSONFeature: () => {
        const aqiValue = Math.floor(Math.random() * 500);
        const pollutants = {
            pm25: { value: Math.random() * 300, unit: 'μg/m³', aqi: Math.floor(Math.random() * 500) },
            pm10: { value: Math.random() * 400, unit: 'μg/m³', aqi: Math.floor(Math.random() * 500) },
            no2: { value: Math.random() * 100, unit: 'μg/m³', aqi: Math.floor(Math.random() * 100) }
        };

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [77.2090 + (Math.random() - 0.5), 28.6139 + (Math.random() - 0.5)]
            },
            properties: {
                station_id: `TEST${Math.floor(Math.random() * 1000)}`,
                station_name: `Test Station ${Math.floor(Math.random() * 100)}`,
                district: ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'][Math.floor(Math.random() * 4)],
                aqi: aqiValue,
                category: generators.getAQICategory(aqiValue),
                color: generators.getAQIColor(aqiValue),
                pollutants: pollutants,
                weather: {
                    temperature: 15 + Math.random() * 25,
                    humidity: 30 + Math.random() * 60,
                    wind_speed: Math.random() * 10
                },
                source_attribution: {
                    vehicular: Math.floor(Math.random() * 50),
                    industrial: Math.floor(Math.random() * 30),
                    biomass: Math.floor(Math.random() * 30),
                    background: Math.floor(Math.random() * 20)
                },
                forecast: {
                    '1h': aqiValue + Math.floor(Math.random() * 20 - 10),
                    '6h': aqiValue + Math.floor(Math.random() * 40 - 20),
                    '24h': aqiValue + Math.floor(Math.random() * 60 - 30)
                },
                timestamp: new Date().toISOString()
            }
        };
    },

    // Generate GeoJSON FeatureCollection
    geoJSONFeatureCollection: (featureCount = 10) => {
        const features = [];
        for (let i = 0; i < featureCount; i++) {
            features.push(generators.geoJSONFeature());
        }

        return {
            type: 'FeatureCollection',
            features: features,
            metadata: {
                generated_at: new Date().toISOString(),
                count: featureCount
            }
        };
    },

    // Get AQI category from value
    getAQICategory: (aqi) => {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    },

    // Get AQI color from value
    getAQIColor: (aqi) => {
        if (aqi <= 50) return '#00e400';
        if (aqi <= 100) return '#ffff00';
        if (aqi <= 150) return '#ff7e00';
        if (aqi <= 200) return '#ff0000';
        if (aqi <= 300) return '#8f3f97';
        return '#7e0023';
    },

    // Generate mode switch scenario
    modeSwitchScenario: () => {
        return {
            fromMode: generators.visualizationMode(),
            toMode: generators.visualizationMode(),
            data: generators.geoJSONFeatureCollection(5 + Math.floor(Math.random() * 15))
        };
    },

    // Generate view switch scenario
    viewSwitchScenario: () => {
        return {
            fromView: generators.viewType(),
            toView: generators.viewType(),
            data: generators.geoJSONFeatureCollection(5 + Math.floor(Math.random() * 15))
        };
    }
};

// Property test runner
class PropertyTestRunner {
    constructor(testName, property, generator, iterations = 50) {
        this.testName = testName;
        this.property = property;
        this.generator = generator;
        this.iterations = iterations;
        this.failures = [];
    }

    async run() {
        console.log(`Running property test: ${this.testName}`);
        console.log(`Iterations: ${this.iterations}`);
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const testData = this.generator();
                const result = await this.property(testData);
                
                if (!result.success) {
                    this.failures.push({
                        iteration: i + 1,
                        input: testData,
                        error: result.error,
                        details: result.details
                    });
                }
            } catch (error) {
                this.failures.push({
                    iteration: i + 1,
                    input: 'Generator failed',
                    error: error.message,
                    details: error.stack
                });
            }
        }

        return this.getResults();
    }

    getResults() {
        const passed = this.iterations - this.failures.length;
        const success = this.failures.length === 0;
        
        return {
            testName: this.testName,
            success,
            iterations: this.iterations,
            passed,
            failed: this.failures.length,
            failures: this.failures.slice(0, 5), // Show first 5 failures
            summary: success ? 
                `✅ Property holds for all ${this.iterations} test cases` :
                `❌ Property failed in ${this.failures.length}/${this.iterations} cases`
        };
    }
}

// Property 8: Visualization Mode Switching
const visualizationModeSwitchingProperty = async (scenario) => {
    // Create a temporary container for testing
    const testContainer = document.createElement('div');
    testContainer.id = 'test-map-' + Date.now();
    testContainer.style.width = '800px';
    testContainer.style.height = '600px';
    testContainer.style.position = 'absolute';
    testContainer.style.left = '-9999px';
    document.body.appendChild(testContainer);

    let mapController = null;
    let layerManager = null;

    try {
        // Initialize map controller
        mapController = new MapController(testContainer.id);
        
        // Wait for map to be ready
        await new Promise((resolve) => {
            mapController.on('mapReady', resolve);
            setTimeout(resolve, 1000); // Fallback timeout
        });

        if (!mapController.map) {
            return {
                success: false,
                error: 'Map failed to initialize',
                details: 'MapController.map is null'
            };
        }

        // Initialize layer manager
        layerManager = new LayerManager(mapController.map);

        // Test visualization mode switching
        const { fromMode, toMode, data } = scenario;

        // Create initial layer
        let initialLayer;
        if (fromMode === 'markers') {
            initialLayer = layerManager.createMarkerLayer(data);
        } else {
            initialLayer = layerManager.createHeatmapLayer(data);
        }

        // Verify initial layer was created
        if (!initialLayer) {
            return {
                success: false,
                error: 'Failed to create initial layer',
                details: `Mode: ${fromMode}`
            };
        }

        // Add layer to map
        mapController.addLayer(initialLayer, fromMode);

        // Verify layer is on map
        if (!mapController.map.hasLayer(initialLayer)) {
            return {
                success: false,
                error: 'Initial layer not added to map',
                details: `Mode: ${fromMode}`
            };
        }

        // Switch visualization mode
        mapController.switchVisualization(toMode);

        // Verify mode changed
        const currentView = mapController.getCurrentView();
        if (currentView.visualization !== toMode) {
            return {
                success: false,
                error: 'Visualization mode did not change',
                details: `Expected: ${toMode}, Got: ${currentView.visualization}`
            };
        }

        // Create new layer for switched mode
        let newLayer;
        if (toMode === 'markers') {
            newLayer = layerManager.createMarkerLayer(data);
        } else {
            newLayer = layerManager.createHeatmapLayer(data);
        }

        // Verify new layer was created
        if (!newLayer) {
            return {
                success: false,
                error: 'Failed to create new layer after mode switch',
                details: `Mode: ${toMode}`
            };
        }

        // Verify layer has correct type
        if (toMode === 'markers') {
            // Marker cluster group should have layers
            const markerCount = newLayer.getLayers ? newLayer.getLayers().length : 0;
            if (markerCount === 0) {
                return {
                    success: false,
                    error: 'Marker layer has no markers',
                    details: `Expected markers from ${data.features.length} features`
                };
            }
        } else {
            // Heatmap layer should exist
            if (!newLayer._latlngs || newLayer._latlngs.length === 0) {
                return {
                    success: false,
                    error: 'Heatmap layer has no data points',
                    details: `Expected points from ${data.features.length} features`
                };
            }
        }

        // Verify data is preserved
        const stats = layerManager.getStats();
        if (stats.dataFeatures !== data.features.length) {
            return {
                success: false,
                error: 'Data not preserved during mode switch',
                details: `Expected: ${data.features.length}, Got: ${stats.dataFeatures}`
            };
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        // Cleanup
        if (mapController) {
            mapController.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    }
};

// Property 9: Interactive Feature Completeness
const interactiveFeatureCompletenessProperty = async (feature) => {
    // Create a temporary container for testing
    const testContainer = document.createElement('div');
    testContainer.id = 'test-map-' + Date.now();
    testContainer.style.width = '800px';
    testContainer.style.height = '600px';
    testContainer.style.position = 'absolute';
    testContainer.style.left = '-9999px';
    document.body.appendChild(testContainer);

    let mapController = null;
    let layerManager = null;

    try {
        // Initialize map controller
        mapController = new MapController(testContainer.id);
        
        // Wait for map to be ready
        await new Promise((resolve) => {
            mapController.on('mapReady', resolve);
            setTimeout(resolve, 1000); // Fallback timeout
        });

        if (!mapController.map) {
            return {
                success: false,
                error: 'Map failed to initialize',
                details: 'MapController.map is null'
            };
        }

        // Initialize layer manager
        layerManager = new LayerManager(mapController.map);

        // Create marker from feature
        const marker = layerManager.createMarker(feature);

        if (!marker) {
            return {
                success: false,
                error: 'Failed to create marker',
                details: 'createMarker returned null'
            };
        }

        // Verify marker has popup
        const popup = marker.getPopup();
        if (!popup) {
            return {
                success: false,
                error: 'Marker does not have popup',
                details: 'getPopup() returned null'
            };
        }

        // Get popup content
        const popupContent = popup.getContent();
        if (!popupContent) {
            return {
                success: false,
                error: 'Popup has no content',
                details: 'getContent() returned null'
            };
        }

        // Verify required information is in popup
        const requiredFields = [
            feature.properties.station_name,
            feature.properties.district,
            feature.properties.aqi.toString(),
            feature.properties.category
        ];

        for (const field of requiredFields) {
            if (!popupContent.includes(field)) {
                return {
                    success: false,
                    error: 'Popup missing required field',
                    details: `Missing: ${field}`
                };
            }
        }

        // Verify pollutant information is included
        if (feature.properties.pollutants) {
            const pollutantKeys = Object.keys(feature.properties.pollutants);
            for (const pollutant of pollutantKeys) {
                if (!popupContent.toLowerCase().includes(pollutant.toLowerCase())) {
                    return {
                        success: false,
                        error: 'Popup missing pollutant information',
                        details: `Missing pollutant: ${pollutant}`
                    };
                }
            }
        }

        // Verify weather information is included (if present)
        if (feature.properties.weather) {
            const hasTemperature = feature.properties.weather.temperature !== undefined;
            const hasHumidity = feature.properties.weather.humidity !== undefined;
            const hasWindSpeed = feature.properties.weather.wind_speed !== undefined;

            if (hasTemperature && !popupContent.toLowerCase().includes('temperature')) {
                return {
                    success: false,
                    error: 'Popup missing weather information',
                    details: 'Missing temperature'
                };
            }

            if (hasHumidity && !popupContent.toLowerCase().includes('humidity')) {
                return {
                    success: false,
                    error: 'Popup missing weather information',
                    details: 'Missing humidity'
                };
            }

            if (hasWindSpeed && !popupContent.toLowerCase().includes('wind')) {
                return {
                    success: false,
                    error: 'Popup missing weather information',
                    details: 'Missing wind speed'
                };
            }
        }

        // Verify marker has tooltip
        const tooltip = marker.getTooltip();
        if (!tooltip) {
            return {
                success: false,
                error: 'Marker does not have tooltip',
                details: 'getTooltip() returned null'
            };
        }

        // Verify tooltip content
        const tooltipContent = tooltip.getContent();
        if (!tooltipContent || !tooltipContent.includes(feature.properties.station_name)) {
            return {
                success: false,
                error: 'Tooltip missing station name',
                details: `Content: ${tooltipContent}`
            };
        }

        if (!tooltipContent.includes(feature.properties.aqi.toString())) {
            return {
                success: false,
                error: 'Tooltip missing AQI value',
                details: `Content: ${tooltipContent}`
            };
        }

        // Verify marker has correct styling
        const options = marker.options;
        if (!options.fillColor || options.fillColor !== feature.properties.color) {
            return {
                success: false,
                error: 'Marker has incorrect color',
                details: `Expected: ${feature.properties.color}, Got: ${options.fillColor}`
            };
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        // Cleanup
        if (mapController) {
            mapController.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    }
};

// Test suite
class VisualizationPropertyTests {
    async runAll() {
        console.log('🧪 Starting Visualization Property-Based Tests');
        console.log('=' .repeat(60));
        
        const tests = [
            new PropertyTestRunner(
                'Property 8: Visualization Mode Switching',
                visualizationModeSwitchingProperty,
                generators.modeSwitchScenario,
                50
            ),
            new PropertyTestRunner(
                'Property 9: Interactive Feature Completeness',
                interactiveFeatureCompletenessProperty,
                generators.geoJSONFeature,
                50
            )
        ];

        const results = [];
        
        for (const test of tests) {
            const result = await test.run();
            results.push(result);
            
            console.log(`\n${result.summary}`);
            
            if (!result.success) {
                console.log('\nFirst few failures:');
                result.failures.forEach((failure, index) => {
                    console.log(`  ${index + 1}. Iteration ${failure.iteration}:`);
                    console.log(`     Error: ${failure.error}`);
                    if (failure.details) {
                        console.log(`     Details: ${failure.details.substring(0, 200)}...`);
                    }
                });
            }
        }

        console.log('\n' + '=' .repeat(60));
        console.log('📊 Test Summary:');
        
        const totalTests = results.length;
        const passedTests = results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Properties Tested: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        
        if (failedTests === 0) {
            console.log('\n🎉 All properties hold! Visualization features are working correctly.');
        } else {
            console.log('\n⚠️  Some properties failed. Review the failures above.');
        }

        return {
            success: failedTests === 0,
            results
        };
    }
}

// Main test runner
async function runVisualizationTests() {
    console.log('🚀 Visualization Property-Based Testing Suite');
    console.log('Testing Property 8: Visualization Mode Switching');
    console.log('Testing Property 9: Interactive Feature Completeness');
    console.log('Validates Requirements: 4.1, 4.2, 4.3, 4.4\n');
    
    // Run property-based tests
    const propertyTests = new VisualizationPropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Overall results
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (propertyResults.success) {
        console.log('\n🎉 Visualization implementation satisfies all properties');
        console.log('Requirements 4.1, 4.2, 4.3, 4.4 are validated ✅');
    } else {
        console.log('\n⚠️  Visualization features need fixes to satisfy the properties');
    }
    
    return propertyResults.success;
}

// Export for use in test runners
export { runVisualizationTests, VisualizationPropertyTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runVisualizationTests();
}
