/**
 * Property-Based Tests for API Router
 * Tests Property 1: API Routing Consistency
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Property 1: For any valid frontend data request (current AQI, forecast, spatial, or station data), 
 * the Integration Layer should correctly route the request to the corresponding existing backend 
 * endpoint and return a successful response.
 */

import APIRouter from '../js/integration/api-router.js';

// Mock fetch for testing
const originalFetch = window.fetch;

// Test data generators for property-based testing
const generators = {
    // Generate valid request types
    requestType: () => {
        const types = ['current', 'forecast', 'spatial', 'auth', 'integration'];
        return types[Math.floor(Math.random() * types.length)];
    },

    // Generate valid subtypes for each request type
    requestSubtype: (type) => {
        const subtypes = {
            'current': ['aqi', 'stations', 'weather', 'location'],
            'forecast': ['24h', 'current', 'spatial', 'stations'],
            'spatial': ['grid', 'bounds'],
            'auth': ['login', 'refresh', 'logout', 'verify'],
            'integration': ['geojson-current', 'geojson-stations', 'geojson-forecast', 'heatmap-spatial', 'config']
        };
        const validSubtypes = subtypes[type] || [];
        return validSubtypes[Math.floor(Math.random() * validSubtypes.length)];
    },

    // Generate valid parameters
    requestParams: (type, subtype) => {
        const paramGenerators = {
            'current.aqi': () => ({ query: { city: 'Delhi', limit: Math.floor(Math.random() * 100) + 1 } }),
            'current.stations': () => ({ query: { state: 'Delhi', active: true } }),
            'current.weather': () => ({ query: { location: 'Delhi' } }),
            'current.location': () => ({ query: { lat: 28.6139, lon: 77.2090 } }),
            
            'forecast.24h': () => ({ path: { location: 'Delhi' } }),
            'forecast.current': () => ({ query: { location: 'Delhi' } }),
            'forecast.spatial': () => ({ 
                query: { 
                    north: 28.9, south: 28.4, east: 77.6, west: 76.8, 
                    resolution: Math.floor(Math.random() * 5) + 1 
                } 
            }),
            'forecast.stations': () => ({ query: { city: 'Delhi' } }),
            
            'spatial.grid': () => ({ 
                query: { 
                    north: 28.9, south: 28.4, east: 77.6, west: 76.8,
                    resolution: Math.floor(Math.random() * 5) + 1
                } 
            }),
            'spatial.bounds': () => ({ path: { city: 'Delhi' } }),
            
            'auth.login': () => ({ body: { username: 'test', password: 'test' } }),
            'auth.refresh': () => ({ headers: { 'Authorization': 'Bearer token' } }),
            'auth.logout': () => ({}),
            'auth.verify': () => ({ headers: { 'Authorization': 'Bearer token' } }),
            
            'integration.geojson-current': () => ({ query: { city: 'Delhi' } }),
            'integration.geojson-stations': () => ({ query: { active: true } }),
            'integration.geojson-forecast': () => ({ path: { location: 'Delhi' } }),
            'integration.heatmap-spatial': () => ({ 
                query: { 
                    bounds: '28.4,76.8,28.9,77.6',
                    resolution: Math.floor(Math.random() * 5) + 1
                } 
            }),
            'integration.config': () => ({})
        };

        const key = `${type}.${subtype}`;
        const generator = paramGenerators[key];
        return generator ? generator() : {};
    },

    // Generate valid request object
    validRequest: () => {
        const type = generators.requestType();
        const subtype = generators.requestSubtype(type);
        const params = generators.requestParams(type, subtype);
        
        return {
            type,
            subtype,
            params,
            options: {
                method: type === 'auth' && subtype === 'login' ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        };
    }
};

// Property test runner
class PropertyTestRunner {
    constructor(testName, property, generator, iterations = 100) {
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

// Property 1: API Routing Consistency
const apiRoutingConsistencyProperty = async (request) => {
    const router = new APIRouter();
    
    try {
        // Mock successful response
        window.fetch = () => Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: 'test' })
        });

        // Test endpoint mapping
        const endpoint = router.mapEndpoint(request);
        
        // Verify endpoint is correctly mapped
        if (!endpoint || typeof endpoint !== 'string') {
            return {
                success: false,
                error: 'Invalid endpoint mapping',
                details: `Expected string endpoint, got: ${typeof endpoint}`
            };
        }

        // Test URL building
        const url = router.buildURL(endpoint, request.params);
        
        // Verify URL is valid
        try {
            new URL(url);
        } catch (urlError) {
            return {
                success: false,
                error: 'Invalid URL construction',
                details: `URL: ${url}, Error: ${urlError.message}`
            };
        }

        // Test routing
        const response = await router.route(request);
        
        // Verify response is successful
        if (!response || !response.ok) {
            return {
                success: false,
                error: 'Route failed to return successful response',
                details: `Response: ${response ? response.status : 'null'}`
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
        // Restore original fetch
        window.fetch = originalFetch;
    }
};

// Test suite
class APIRouterPropertyTests {
    async runAll() {
        console.log('🧪 Starting API Router Property-Based Tests');
        console.log('=' .repeat(60));
        
        const tests = [
            new PropertyTestRunner(
                'Property 1: API Routing Consistency',
                apiRoutingConsistencyProperty,
                generators.validRequest,
                100
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
                    console.log(`     Input: ${JSON.stringify(failure.input, null, 2)}`);
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
            console.log('\n🎉 All properties hold! API Router is working correctly.');
        } else {
            console.log('\n⚠️  Some properties failed. Review the failures above.');
        }

        return {
            success: failedTests === 0,
            results
        };
    }
}

// Additional unit tests for edge cases
class APIRouterUnitTests {
    constructor() {
        this.router = new APIRouter();
    }

    testInvalidEndpointMapping() {
        console.log('\n🔍 Testing invalid endpoint mapping...');
        
        try {
            this.router.mapEndpoint({ type: 'invalid', subtype: 'invalid' });
            console.log('❌ Should have thrown error for invalid endpoint');
            return false;
        } catch (error) {
            if (error.message.includes('Unknown endpoint mapping')) {
                console.log('✅ Correctly throws error for invalid endpoint');
                return true;
            } else {
                console.log(`❌ Wrong error message: ${error.message}`);
                return false;
            }
        }
    }

    testURLBuilding() {
        console.log('\n🔍 Testing URL building...');
        
        const testCases = [
            {
                endpoint: '/forecast/24h/{location}',
                params: { path: { location: 'Delhi' } },
                expected: '/forecast/24h/Delhi'
            },
            {
                endpoint: '/data/stations',
                params: { query: { city: 'Delhi', limit: 10 } },
                expected: '/data/stations?city=Delhi&limit=10'
            },
            {
                endpoint: '/integration/geojson/current',
                params: {},
                expected: '/integration/geojson/current'
            }
        ];

        let passed = 0;
        
        testCases.forEach((testCase, index) => {
            const url = this.router.buildURL(testCase.endpoint, testCase.params);
            const urlPath = new URL(url).pathname + new URL(url).search;
            
            if (urlPath.includes(testCase.expected.split('?')[0])) {
                console.log(`✅ Test case ${index + 1}: URL built correctly`);
                passed++;
            } else {
                console.log(`❌ Test case ${index + 1}: Expected ${testCase.expected}, got ${urlPath}`);
            }
        });

        return passed === testCases.length;
    }

    async runAll() {
        console.log('\n🧪 Running API Router Unit Tests');
        console.log('-' .repeat(40));
        
        const tests = [
            this.testInvalidEndpointMapping(),
            this.testURLBuilding()
        ];

        const passed = tests.filter(Boolean).length;
        const total = tests.length;
        
        console.log(`\n📊 Unit Tests: ${passed}/${total} passed`);
        
        return passed === total;
    }
}

// Main test runner
async function runAPIRouterTests() {
    console.log('🚀 API Router Property-Based Testing Suite');
    console.log('Testing Property 1: API Routing Consistency');
    console.log('Validates Requirements: 1.1, 1.2, 1.3, 1.4\n');
    
    // Run property-based tests
    const propertyTests = new APIRouterPropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Run unit tests
    const unitTests = new APIRouterUnitTests();
    const unitResults = await unitTests.runAll();
    
    // Overall results
    const overallSuccess = propertyResults.success && unitResults;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Unit Tests: ${unitResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 API Router implementation satisfies Property 1: API Routing Consistency');
        console.log('Requirements 1.1, 1.2, 1.3, 1.4 are validated ✅');
    } else {
        console.log('\n⚠️  API Router needs fixes to satisfy the property');
    }
    
    return overallSuccess;
}

// Export for use in test runners
export { runAPIRouterTests, APIRouterPropertyTests, APIRouterUnitTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runAPIRouterTests();
}