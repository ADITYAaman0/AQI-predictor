/**
 * Property-Based Tests for Animation Functionality
 * Tests Property 7: Animation Smoothness
 * 
 * **Property 7 Validates: Requirements 3.3, 9.3**
 * 
 * Property 7: For any forecast animation playback, the Leaflet Frontend should smoothly 
 * transition between hourly predictions and preload next frames to ensure uninterrupted playback.
 */

import AnimationController from '../js/components/animation-controller.js';
import LayerManager from '../js/components/layer-manager.js';
import DataLoader from '../js/components/data-loader.js';
import MapController from '../js/components/map-controller.js';
import config from '../js/config/config.js';

// Test data generators for property-based testing
const generators = {
    // Generate forecast data for multiple hours
    forecastData: (hours = 24) => {
        const data = [];
        const baseTime = new Date();
        
        for (let i = 0; i < hours; i++) {
            const timestamp = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
            const stationCount = 5 + Math.floor(Math.random() * 15);
            const stations = [];
            
            for (let j = 0; j < stationCount; j++) {
                const aqiValue = Math.floor(Math.random() * 500);
                stations.push({
                    station_id: `STATION${j}`,
                    station_name: `Test Station ${j}`,
                    coordinates: [77.2090 + (Math.random() - 0.5), 28.6139 + (Math.random() - 0.5)],
                    aqi: aqiValue,
                    category: generators.getAQICategory(aqiValue),
                    color: generators.getAQIColor(aqiValue),
                    confidence: {
                        lower: aqiValue - 20,
                        upper: aqiValue + 20,
                        level: 'high'
                    }
                });
            }
            
            data.push({
                hour: i,
                timestamp: timestamp.toISOString(),
                stations: stations
            });
        }
        
        return data;
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

    // Generate animation scenario
    animationScenario: () => {
        const hours = 12 + Math.floor(Math.random() * 13); // 12-24 hours
        return {
            forecastData: generators.forecastData(hours),
            animationSpeed: 500 + Math.floor(Math.random() * 2000), // 500-2500ms
            targetHour: Math.floor(Math.random() * hours)
        };
    }
};

// Property test runner
class PropertyTestRunner {
    constructor(testName, property, generator, iterations = 30) {
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

// Property 7: Animation Smoothness
const animationSmoothnessProperty = async (scenario) => {
    // Create a temporary container for testing
    const testContainer = document.createElement('div');
    testContainer.id = 'test-map-' + Date.now();
    testContainer.style.width = '800px';
    testContainer.style.height = '600px';
    testContainer.style.position = 'absolute';
    testContainer.style.left = '-9999px';
    document.body.appendChild(testContainer);

    // Create animation controls in DOM
    const controlsContainer = document.createElement('div');
    controlsContainer.innerHTML = `
        <button id="play-btn">Play</button>
        <button id="pause-btn" class="hidden">Pause</button>
        <button id="reset-btn">Reset</button>
        <input type="range" id="timeline-slider" min="0" max="23" value="0" />
        <span id="current-hour">00:00</span>
    `;
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.left = '-9999px';
    document.body.appendChild(controlsContainer);

    let mapController = null;
    let layerManager = null;
    let dataLoader = null;
    let animationController = null;

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

        // Initialize layer manager and data loader
        layerManager = new LayerManager(mapController.map);
        dataLoader = new DataLoader();

        // Initialize animation controller
        animationController = new AnimationController(layerManager, dataLoader);

        // Set animation speed
        animationController.setAnimationSpeed(scenario.animationSpeed);

        // Load forecast data directly
        animationController.forecastData = scenario.forecastData;

        // Verify forecast data loaded
        if (animationController.forecastData.length === 0) {
            return {
                success: false,
                error: 'Forecast data not loaded',
                details: 'forecastData array is empty'
            };
        }

        // Test 1: Verify preloading functionality
        await animationController.preloadFrames(0, Math.min(3, scenario.forecastData.length));
        
        if (animationController.preloadedFrames.size === 0) {
            return {
                success: false,
                error: 'Frame preloading failed',
                details: 'No frames were preloaded'
            };
        }

        // Test 2: Verify smooth frame transitions
        const initialHour = 0;
        animationController.setHour(initialHour);
        
        const state1 = animationController.getState();
        if (state1.currentHour !== initialHour) {
            return {
                success: false,
                error: 'Failed to set initial hour',
                details: `Expected: ${initialHour}, Got: ${state1.currentHour}`
            };
        }

        // Move to next frame
        const nextHour = 1;
        animationController.setHour(nextHour);
        
        const state2 = animationController.getState();
        if (state2.currentHour !== nextHour) {
            return {
                success: false,
                error: 'Failed to transition to next frame',
                details: `Expected: ${nextHour}, Got: ${state2.currentHour}`
            };
        }

        // Test 3: Verify animation controls work
        animationController.startAnimation();
        
        if (!animationController.isPlaying) {
            return {
                success: false,
                error: 'Animation failed to start',
                details: 'isPlaying is false after startAnimation()'
            };
        }

        // Wait for at least one frame transition
        await new Promise(resolve => setTimeout(resolve, scenario.animationSpeed + 100));

        const stateAfterPlay = animationController.getState();
        if (stateAfterPlay.currentHour === initialHour && scenario.forecastData.length > 1) {
            return {
                success: false,
                error: 'Animation not progressing',
                details: 'Hour did not advance during playback'
            };
        }

        // Pause animation
        animationController.pauseAnimation();
        
        if (animationController.isPlaying) {
            return {
                success: false,
                error: 'Animation failed to pause',
                details: 'isPlaying is true after pauseAnimation()'
            };
        }

        const hourAfterPause = animationController.currentHour;
        
        // Wait to ensure animation stopped
        await new Promise(resolve => setTimeout(resolve, scenario.animationSpeed + 100));
        
        if (animationController.currentHour !== hourAfterPause) {
            return {
                success: false,
                error: 'Animation did not stop after pause',
                details: 'Hour continued advancing after pause'
            };
        }

        // Test 4: Verify reset functionality
        animationController.resetAnimation();
        
        const stateAfterReset = animationController.getState();
        if (stateAfterReset.currentHour !== 0) {
            return {
                success: false,
                error: 'Reset failed to return to hour 0',
                details: `Current hour: ${stateAfterReset.currentHour}`
            };
        }

        if (stateAfterReset.isPlaying) {
            return {
                success: false,
                error: 'Animation still playing after reset',
                details: 'isPlaying should be false after reset'
            };
        }

        // Test 5: Verify scrubbing to specific hour
        const targetHour = Math.min(scenario.targetHour, scenario.forecastData.length - 1);
        animationController.setHour(targetHour);
        
        const stateAfterScrub = animationController.getState();
        if (stateAfterScrub.currentHour !== targetHour) {
            return {
                success: false,
                error: 'Failed to scrub to target hour',
                details: `Expected: ${targetHour}, Got: ${stateAfterScrub.currentHour}`
            };
        }

        // Test 6: Verify preloading of upcoming frames
        await animationController.preloadUpcomingFrames();
        
        const expectedPreloadCount = Math.min(
            config.ANIMATION_PRELOAD_FRAMES,
            scenario.forecastData.length - targetHour - 1
        );
        
        if (expectedPreloadCount > 0 && animationController.preloadedFrames.size === 0) {
            return {
                success: false,
                error: 'Upcoming frames not preloaded',
                details: `Expected at least some preloaded frames, got ${animationController.preloadedFrames.size}`
            };
        }

        // Test 7: Verify animation speed can be changed
        const newSpeed = 1000;
        animationController.setAnimationSpeed(newSpeed);
        
        if (animationController.animationSpeed !== newSpeed) {
            return {
                success: false,
                error: 'Failed to change animation speed',
                details: `Expected: ${newSpeed}, Got: ${animationController.animationSpeed}`
            };
        }

        // Test 8: Verify animation loops correctly at end
        animationController.setHour(scenario.forecastData.length - 1);
        animationController.startAnimation();
        
        // Wait for animation to reach end
        await new Promise(resolve => setTimeout(resolve, scenario.animationSpeed + 200));
        
        // Animation should pause at end
        if (animationController.isPlaying) {
            return {
                success: false,
                error: 'Animation did not pause at end',
                details: 'Animation should pause when reaching last frame'
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
        if (animationController) {
            animationController.destroy();
        }
        if (mapController) {
            mapController.destroy();
        }
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        if (controlsContainer && controlsContainer.parentNode) {
            controlsContainer.parentNode.removeChild(controlsContainer);
        }
    }
};

// Test suite
class AnimationPropertyTests {
    async runAll() {
        console.log('🧪 Starting Animation Property-Based Tests');
        console.log('=' .repeat(60));
        
        const tests = [
            new PropertyTestRunner(
                'Property 7: Animation Smoothness',
                animationSmoothnessProperty,
                generators.animationScenario,
                30
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
            console.log('\n🎉 All properties hold! Animation features are working correctly.');
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
async function runAnimationTests() {
    console.log('🚀 Animation Property-Based Testing Suite');
    console.log('Testing Property 7: Animation Smoothness');
    console.log('Validates Requirements: 3.3, 9.3\n');
    
    // Run property-based tests
    const propertyTests = new AnimationPropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Overall results
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (propertyResults.success) {
        console.log('\n🎉 Animation implementation satisfies all properties');
        console.log('Requirements 3.3, 9.3 are validated ✅');
    } else {
        console.log('\n⚠️  Animation features need fixes to satisfy the properties');
    }
    
    return propertyResults.success;
}

// Export for use in test runners
export { runAnimationTests, AnimationPropertyTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runAnimationTests();
}
