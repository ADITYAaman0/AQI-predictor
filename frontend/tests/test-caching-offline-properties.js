/**
 * Property-Based Tests for Caching and Offline Handling
 * Tests Properties 5, 6, 13, and 18
 * 
 * **Validates: Requirements 3.2, 3.4, 3.5, 5.5, 9.2, 9.5**
 * 
 * Property 5: Real-Time Data Updates
 * Property 6: Offline Graceful Degradation
 * Property 13: Data Usage Optimization
 * Property 18: Caching Integration
 */

import DataLoader from '../js/components/data-loader.js';
import CacheController from '../js/integration/cache-controller.js';
import config from '../js/config/config.js';

// Mock fetch for testing
const originalFetch = window.fetch;

// Test data generators
const generators = {
    // Generate realistic AQI response data
    aqiResponse: (stationCount = 10) => {
        const features = [];
        
        for (let i = 0; i < stationCount; i++) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [
                        77.0 + Math.random() * 0.5,
                        28.5 + Math.random() * 0.5
                    ]
                },
                properties: {
                    station_id: `DEL${String(i).padStart(3, '0')}`,
                    station_name: `Station ${i}`,
                    district: 'Delhi',
                    aqi: Math.floor(Math.random() * 400) + 50,
                    category: 'Unhealthy',
                    color: '#ff7e00',
                    pollutants: {
                        pm25: { value: Math.random() * 200, unit: 'μg/m³', aqi: Math.floor(Math.random() * 400) }
                    },
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        return {
            type: 'FeatureCollection',
            features,
            metadata: {
                count: stationCount,
                generated_at: new Date().toISOString()
            }
        };
    },

    // Generate test scenarios
    testScenario: () => {
        const scenarios = [
            { stations: 5, description: 'small dataset' },
            { stations: 20, description: 'medium dataset' },
            { stations: 50, description: 'large dataset' }
        ];
        return scenarios[Math.floor(Math.random() * scenarios.length)];
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
            failures: this.failures.slice(0, 5),
            summary: success ? 
                `✅ Property holds for all ${this.iterations} test cases` :
                `❌ Property failed in ${this.failures.length}/${this.iterations} cases`
        };
    }
}

// Property 5: Real-Time Data Updates
const realTimeDataUpdatesProperty = async (testData) => {
    try {
        const responseData = generators.aqiResponse(testData.stations);
        let updateCount = 0;
        
        // Mock fetch to simulate data updates
        window.fetch = async (url, options) => {
            updateCount++;
            
            // Simulate different data on each update
            const updatedData = {
                ...responseData,
                metadata: {
                    ...responseData.metadata,
                    update_number: updateCount,
                    generated_at: new Date().toISOString()
                }
            };
            
            return {
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => updatedData
            };
        };

        const dataLoader = new DataLoader();
        
        // Initial fetch
        const initialData = await dataLoader.fetchCurrentAQI();
        
        // Verify initial data
        if (!initialData || !initialData.features) {
            return {
                success: false,
                error: 'Failed to fetch initial data',
                details: 'Initial data is invalid'
            };
        }

        // Simulate cache expiration by invalidating cache
        await dataLoader.cacheController.invalidate('current-aqi');
        
        // Fetch updated data
        const updatedData = await dataLoader.fetchCurrentAQI();
        
        // Verify data was updated
        if (!updatedData || !updatedData.metadata) {
            return {
                success: false,
                error: 'Failed to fetch updated data',
                details: 'Updated data is invalid'
            };
        }

        // Verify update mechanism works
        if (updateCount < 2) {
            return {
                success: false,
                error: 'Data update mechanism not working',
                details: `Expected at least 2 fetches, got ${updateCount}`
            };
        }

        // Verify data structure is preserved
        if (updatedData.type !== 'FeatureCollection') {
            return {
                success: false,
                error: 'Data structure not preserved during update',
                details: `Expected FeatureCollection, got ${updatedData.type}`
            };
        }

        return {
            success: true,
            details: {
                initialFetch: 'success',
                updateFetch: 'success',
                updateCount,
                dataStructure: 'preserved'
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        window.fetch = originalFetch;
    }
};

// Property 6: Offline Graceful Degradation
const offlineGracefulDegradationProperty = async (testData) => {
    try {
        const responseData = generators.aqiResponse(testData.stations);
        
        // Mock fetch for initial data load
        window.fetch = async () => ({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => responseData
        });

        const dataLoader = new DataLoader();
        
        // Load initial data
        await dataLoader.fetchCurrentAQI();
        
        // Simulate offline by making fetch fail
        window.fetch = async () => {
            throw new Error('Network request failed');
        };
        
        // Simulate offline state
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
        });
        dataLoader.isOnline = false;
        
        // Try to fetch data while offline
        const offlineData = await dataLoader.fetchCurrentAQI();
        
        // Verify offline data is returned
        if (!offlineData) {
            return {
                success: false,
                error: 'No data returned in offline mode',
                details: 'Expected cached or fallback data'
            };
        }

        // Verify offline indicator is present
        if (!offlineData.metadata || !offlineData.metadata.offline) {
            return {
                success: false,
                error: 'Offline indicator not present',
                details: 'Data should be marked as offline'
            };
        }

        // Verify data structure is valid
        if (offlineData.type !== 'FeatureCollection') {
            return {
                success: false,
                error: 'Invalid offline data structure',
                details: `Expected FeatureCollection, got ${offlineData.type}`
            };
        }

        // Verify features are present
        if (!offlineData.features || offlineData.features.length === 0) {
            return {
                success: false,
                error: 'No features in offline data',
                details: 'Offline data should contain cached features'
            };
        }

        return {
            success: true,
            details: {
                offlineDataReturned: true,
                offlineIndicator: true,
                dataStructure: 'valid',
                featureCount: offlineData.features.length
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        window.fetch = originalFetch;
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    }
};

// Property 13: Data Usage Optimization
const dataUsageOptimizationProperty = async (testData) => {
    try {
        const responseData = generators.aqiResponse(testData.stations);
        let fetchCount = 0;
        let totalBytesTransferred = 0;
        
        // Mock fetch to track data usage
        window.fetch = async (url, options) => {
            fetchCount++;
            const responseSize = JSON.stringify(responseData).length;
            totalBytesTransferred += responseSize;
            
            return {
                ok: true,
                status: 200,
                headers: new Headers({
                    'content-type': 'application/json',
                    'content-length': responseSize.toString()
                }),
                json: async () => responseData
            };
        };

        const dataLoader = new DataLoader();
        
        // Make multiple requests for the same data
        const requests = 5;
        for (let i = 0; i < requests; i++) {
            await dataLoader.fetchCurrentAQI();
        }
        
        // Verify caching reduced network requests
        if (fetchCount >= requests) {
            return {
                success: false,
                error: 'Cache not reducing network requests',
                details: `Expected < ${requests} fetches, got ${fetchCount}`
            };
        }

        // Calculate data savings
        const responseSize = JSON.stringify(responseData).length;
        const expectedBytes = responseSize * requests;
        const savedBytes = expectedBytes - totalBytesTransferred;
        const savingsPercent = (savedBytes / expectedBytes) * 100;
        
        // Verify significant data savings (at least 50%)
        if (savingsPercent < 50) {
            return {
                success: false,
                error: 'Insufficient data usage optimization',
                details: `Data savings: ${savingsPercent.toFixed(1)}% (expected: >50%)`
            };
        }

        return {
            success: true,
            details: {
                totalRequests: requests,
                networkFetches: fetchCount,
                dataSavings: `${savingsPercent.toFixed(1)}%`,
                bytesTransferred: totalBytesTransferred,
                bytesSaved: savedBytes
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        window.fetch = originalFetch;
    }
};

// Property 18: Caching Integration
const cachingIntegrationProperty = async (testData) => {
    try {
        const cacheController = new CacheController();
        
        // Test cache set and get
        const testKey = 'test-cache-key';
        const testValue = generators.aqiResponse(testData.stations);
        
        // Set cache entry
        const setSuccess = await cacheController.set(testKey, testValue, 5000);
        
        if (!setSuccess) {
            return {
                success: false,
                error: 'Failed to set cache entry',
                details: 'Cache set operation returned false'
            };
        }

        // Get cache entry
        const cachedValue = await cacheController.get(testKey);
        
        if (!cachedValue) {
            return {
                success: false,
                error: 'Failed to retrieve cache entry',
                details: 'Cache get operation returned null'
            };
        }

        // Verify data integrity
        if (JSON.stringify(cachedValue) !== JSON.stringify(testValue)) {
            return {
                success: false,
                error: 'Cache data integrity compromised',
                details: 'Retrieved data does not match stored data'
            };
        }

        // Test cache expiration
        const isStale = await cacheController.isStale(testKey);
        
        if (isStale) {
            return {
                success: false,
                error: 'Cache entry marked as stale prematurely',
                details: 'Entry should not be stale within TTL'
            };
        }

        // Test cache invalidation
        const invalidatedCount = await cacheController.invalidate(testKey);
        
        if (invalidatedCount === 0) {
            return {
                success: false,
                error: 'Cache invalidation failed',
                details: 'Expected at least 1 entry to be invalidated'
            };
        }

        // Verify entry was invalidated
        const afterInvalidation = await cacheController.get(testKey);
        
        if (afterInvalidation !== null) {
            return {
                success: false,
                error: 'Cache entry not removed after invalidation',
                details: 'Get should return null after invalidation'
            };
        }

        // Test offline data storage
        const offlineData = generators.aqiResponse(5);
        await cacheController.setOfflineData(offlineData);
        
        const retrievedOfflineData = await cacheController.getOfflineData();
        
        if (!retrievedOfflineData || !retrievedOfflineData.features) {
            return {
                success: false,
                error: 'Offline data storage failed',
                details: 'Failed to retrieve offline data'
            };
        }

        return {
            success: true,
            details: {
                cacheSet: 'success',
                cacheGet: 'success',
                dataIntegrity: 'verified',
                expiration: 'working',
                invalidation: 'working',
                offlineStorage: 'working'
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    }
};

// Property 18b: Cache Performance
const cachePerformanceProperty = async (testData) => {
    try {
        const responseData = generators.aqiResponse(testData.stations);
        let networkFetchTime = 0;
        let cacheFetchTime = 0;
        
        // Mock fetch with delay
        window.fetch = async () => {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            return {
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => responseData
            };
        };

        const dataLoader = new DataLoader();
        
        // First fetch - network
        const networkStart = performance.now();
        await dataLoader.fetchCurrentAQI();
        networkFetchTime = performance.now() - networkStart;
        
        // Second fetch - cache
        const cacheStart = performance.now();
        await dataLoader.fetchCurrentAQI();
        cacheFetchTime = performance.now() - cacheStart;
        
        // Cache should be significantly faster
        const speedup = networkFetchTime / cacheFetchTime;
        
        if (speedup < 2) {
            return {
                success: false,
                error: 'Cache not providing sufficient performance improvement',
                details: `Speedup: ${speedup.toFixed(2)}x (expected: >2x)`
            };
        }

        return {
            success: true,
            details: {
                networkFetch: `${networkFetchTime.toFixed(0)}ms`,
                cacheFetch: `${cacheFetchTime.toFixed(0)}ms`,
                speedup: `${speedup.toFixed(2)}x`
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    } finally {
        window.fetch = originalFetch;
    }
};

// Test suite
class CachingOfflinePropertyTests {
    async runAll() {
        console.log('🧪 Starting Caching and Offline Property-Based Tests');
        console.log('=' .repeat(60));
        
        const tests = [
            new PropertyTestRunner(
                'Property 5: Real-Time Data Updates',
                realTimeDataUpdatesProperty,
                generators.testScenario,
                30
            ),
            new PropertyTestRunner(
                'Property 6: Offline Graceful Degradation',
                offlineGracefulDegradationProperty,
                generators.testScenario,
                30
            ),
            new PropertyTestRunner(
                'Property 13: Data Usage Optimization',
                dataUsageOptimizationProperty,
                generators.testScenario,
                30
            ),
            new PropertyTestRunner(
                'Property 18a: Caching Integration',
                cachingIntegrationProperty,
                generators.testScenario,
                30
            ),
            new PropertyTestRunner(
                'Property 18b: Cache Performance',
                cachePerformanceProperty,
                generators.testScenario,
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
                    console.log(`     Input: ${JSON.stringify(failure.input)}`);
                    console.log(`     Error: ${failure.error}`);
                    if (failure.details) {
                        console.log(`     Details: ${JSON.stringify(failure.details, null, 2)}`);
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
            console.log('\n🎉 All caching and offline properties hold!');
        } else {
            console.log('\n⚠️  Some properties failed. Review the failures above.');
        }

        return {
            success: failedTests === 0,
            results
        };
    }
}

// Unit tests
class CachingOfflineUnitTests {
    async testCacheController() {
        console.log('\n🔍 Testing Cache Controller...');
        
        const cache = new CacheController();
        
        // Test basic operations
        await cache.set('test-key', { data: 'test' }, 5000);
        const value = await cache.get('test-key');
        
        if (value && value.data === 'test') {
            console.log('✅ Cache Controller basic operations work');
            return true;
        } else {
            console.log('❌ Cache Controller basic operations failed');
            return false;
        }
    }

    async testOfflineData() {
        console.log('\n🔍 Testing Offline Data Storage...');
        
        const cache = new CacheController();
        const testData = { type: 'FeatureCollection', features: [] };
        
        await cache.setOfflineData(testData);
        const retrieved = await cache.getOfflineData();
        
        if (retrieved && retrieved.type === 'FeatureCollection') {
            console.log('✅ Offline data storage works');
            return true;
        } else {
            console.log('❌ Offline data storage failed');
            return false;
        }
    }

    async runAll() {
        console.log('\n🧪 Running Caching and Offline Unit Tests');
        console.log('-' .repeat(40));
        
        const tests = [
            await this.testCacheController(),
            await this.testOfflineData()
        ];

        const passed = tests.filter(Boolean).length;
        const total = tests.length;
        
        console.log(`\n📊 Unit Tests: ${passed}/${total} passed`);
        
        return passed === total;
    }
}

// Main test runner
async function runCachingOfflineTests() {
    console.log('🚀 Caching and Offline Property-Based Testing Suite');
    console.log('Testing Properties: 5, 6, 13, 18');
    console.log('Validates Requirements: 3.2, 3.4, 3.5, 5.5, 9.2, 9.5\n');
    
    // Run property-based tests
    const propertyTests = new CachingOfflinePropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Run unit tests
    const unitTests = new CachingOfflineUnitTests();
    const unitResults = await unitTests.runAll();
    
    // Overall results
    const overallSuccess = propertyResults.success && unitResults;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Unit Tests: ${unitResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 Implementation satisfies all caching and offline properties!');
        console.log('✅ Property 5: Real-Time Data Updates');
        console.log('✅ Property 6: Offline Graceful Degradation');
        console.log('✅ Property 13: Data Usage Optimization');
        console.log('✅ Property 18: Caching Integration');
        console.log('Requirements 3.2, 3.4, 3.5, 5.5, 9.2, 9.5 are validated ✅');
    } else {
        console.log('\n⚠️  Implementation needs fixes to satisfy the properties');
    }
    
    return overallSuccess;
}

// Export for use in test runners
export { runCachingOfflineTests, CachingOfflinePropertyTests, CachingOfflineUnitTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runCachingOfflineTests();
}
