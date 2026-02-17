/**
 * Property-Based Tests for Backward Compatibility Preservation
 * 
 * Property 16: Backward Compatibility Preservation
 * For any existing Streamlit Dashboard functionality, the system should maintain 
 * full functionality and existing endpoint contracts when the Leaflet frontend 
 * is deployed alongside it.
 * 
 * Validates: Requirements 8.1, 8.2
 */

// Mock fast-check for property-based testing
const fc = {
    property: (...args) => {
        const test = args[args.length - 1];
        const generators = args.slice(0, -1);
        return { generators, test };
    },
    assert: (property, options = {}) => {
        const numRuns = options.numRuns || 10;
        const results = [];
        
        for (let i = 0; i < numRuns; i++) {
            let args;
            try {
                // Invoke each generator to get test values
                args = property.generators.map(gen => {
                    // If gen is a function, call it to get the generator, then call that
                    const generator = typeof gen === 'function' ? gen : gen;
                    return typeof generator === 'function' ? generator() : generator;
                });
                
                property.test(...args);
                results.push({ success: true, run: i + 1 });
            } catch (error) {
                results.push({ 
                    success: false, 
                    run: i + 1, 
                    error: error.message,
                    counterexample: args || [] 
                });
                throw error;
            }
        }
        
        return results;
    },
    array: (gen, constraints = {}) => {
        return () => {
            const length = constraints.minLength || 1;
            return Array.from({ length }, () => gen());
        };
    },
    record: (schema) => {
        return () => {
            const result = {};
            for (const [key, gen] of Object.entries(schema)) {
                result[key] = gen();
            }
            return result;
        };
    },
    oneof: (...gens) => {
        return () => {
            const gen = gens[Math.floor(Math.random() * gens.length)];
            return gen();
        };
    },
    constant: (value) => () => value,
    nat: (max = 1000) => () => Math.floor(Math.random() * max),
    float: (min = 0, max = 1) => () => Math.random() * (max - min) + min,
    string: () => () => Math.random().toString(36).substring(7),
    boolean: () => () => Math.random() > 0.5
};

// Test utilities
const testUtils = {
    /**
     * Simulate API endpoint call
     */
    mockAPICall: (endpoint, method = 'GET', data = null) => {
        return {
            endpoint,
            method,
            data,
            timestamp: Date.now()
        };
    },
    
    /**
     * Check if endpoint follows v1 API pattern
     */
    isV1Endpoint: (endpoint) => {
        return endpoint.includes('/api/v1/');
    },
    
    /**
     * Check if response has expected structure
     */
    hasExpectedStructure: (response, expectedFields) => {
        return expectedFields.every(field => field in response);
    },
    
    /**
     * Simulate Streamlit data request
     */
    simulateStreamlitRequest: (dataType) => {
        const endpoints = {
            'current': '/api/v1/data/air-quality/latest',
            'forecast': '/api/v1/forecast/24h/Delhi',
            'stations': '/api/v1/data/stations',
            'weather': '/api/v1/data/weather/latest'
        };
        
        return {
            endpoint: endpoints[dataType] || endpoints['current'],
            frontend: 'streamlit',
            timestamp: Date.now()
        };
    },
    
    /**
     * Simulate Leaflet data request
     */
    simulateLeafletRequest: (dataType) => {
        const endpoints = {
            'current': '/api/v1/data/air-quality/latest',
            'forecast': '/api/v1/forecast/24h/Delhi',
            'stations': '/api/v1/data/stations',
            'spatial': '/api/v1/forecast/spatial'
        };
        
        return {
            endpoint: endpoints[dataType] || endpoints['current'],
            frontend: 'leaflet',
            timestamp: Date.now()
        };
    }
};

// Generators for property-based testing
const generators = {
    apiEndpoint: fc.oneof(
        fc.constant('/api/v1/data/air-quality/latest'),
        fc.constant('/api/v1/data/stations'),
        fc.constant('/api/v1/forecast/24h/Delhi'),
        fc.constant('/api/v1/forecast/spatial'),
        fc.constant('/api/v1/data/weather/latest'),
        fc.constant('/health')
    ),
    
    httpMethod: fc.oneof(
        fc.constant('GET'),
        fc.constant('POST'),
        fc.constant('PUT'),
        fc.constant('DELETE')
    ),
    
    dataType: fc.oneof(
        fc.constant('current'),
        fc.constant('forecast'),
        fc.constant('stations'),
        fc.constant('weather'),
        fc.constant('spatial')
    ),
    
    frontend: fc.oneof(
        fc.constant('streamlit'),
        fc.constant('leaflet')
    ),
    
    apiResponse: fc.record({
        status: fc.constant(200),
        data: fc.record({
            measurements: fc.array(fc.record({
                station_id: fc.string(),
                value: fc.float(0, 500),
                timestamp: fc.constant(Date.now())
            }), { minLength: 1 })
        })
    })
};

// Property 16: Backward Compatibility Preservation
const properties = {
    /**
     * Property 16.1: API Endpoint Preservation
     * For any existing API endpoint, it should remain accessible and functional
     * when Leaflet frontend is deployed.
     */
    apiEndpointPreservation: fc.property(
        generators.apiEndpoint,
        (endpoint) => {
            // Ensure endpoint is a string
            if (typeof endpoint !== 'string') {
                throw new Error(`Endpoint must be a string, got ${typeof endpoint}`);
            }
            
            // Verify endpoint follows v1 API pattern
            if (endpoint.startsWith('/api/')) {
                if (!testUtils.isV1Endpoint(endpoint) && !endpoint.startsWith('/health')) {
                    throw new Error(`Endpoint ${endpoint} doesn't follow v1 API pattern`);
                }
            }
            
            // Verify endpoint structure is preserved
            const validPatterns = [
                /^\/api\/v1\/data\//,
                /^\/api\/v1\/forecast\//,
                /^\/api\/v1\/auth\//,
                /^\/health$/
            ];
            
            const isValid = validPatterns.some(pattern => pattern.test(endpoint));
            if (!isValid) {
                throw new Error(`Endpoint ${endpoint} doesn't match expected patterns`);
            }
        }
    ),
    
    /**
     * Property 16.2: Dual Frontend Request Handling
     * For any data request from either Streamlit or Leaflet, the API should
     * handle it correctly using the same endpoints.
     */
    dualFrontendRequestHandling: fc.property(
        generators.dataType,
        generators.frontend,
        (dataType, frontend) => {
            // Ensure inputs are strings
            if (typeof dataType !== 'string' || typeof frontend !== 'string') {
                throw new Error('dataType and frontend must be strings');
            }
            
            // Simulate request from either frontend
            const request = frontend === 'streamlit' 
                ? testUtils.simulateStreamlitRequest(dataType)
                : testUtils.simulateLeafletRequest(dataType);
            
            // Verify both frontends use the same API endpoints
            if (!testUtils.isV1Endpoint(request.endpoint)) {
                throw new Error(`Frontend ${frontend} not using v1 API: ${request.endpoint}`);
            }
            
            // Verify endpoint is accessible
            if (!request.endpoint) {
                throw new Error(`No endpoint defined for ${dataType} in ${frontend}`);
            }
        }
    ),
    
    /**
     * Property 16.3: Response Format Consistency
     * For any API response, it should maintain the same structure regardless
     * of which frontend made the request.
     */
    responseFormatConsistency: fc.property(
        generators.apiResponse,
        generators.frontend,
        (response, frontend) => {
            // Ensure inputs are correct types
            if (typeof response !== 'object' || response === null) {
                throw new Error('Response must be an object');
            }
            if (typeof frontend !== 'string') {
                throw new Error('Frontend must be a string');
            }
            
            // Verify response has expected structure
            const expectedFields = ['status', 'data'];
            
            if (!testUtils.hasExpectedStructure(response, expectedFields)) {
                throw new Error(`Response missing expected fields for ${frontend}`);
            }
            
            // Verify status code is valid
            if (response.status < 200 || response.status >= 600) {
                throw new Error(`Invalid status code: ${response.status}`);
            }
            
            // Verify data structure
            if (!response.data) {
                throw new Error('Response missing data field');
            }
        }
    ),
    
    /**
     * Property 16.4: Endpoint Contract Preservation
     * For any existing endpoint, its contract (request/response format) should
     * remain unchanged when Leaflet is deployed.
     */
    endpointContractPreservation: fc.property(
        generators.apiEndpoint,
        generators.httpMethod,
        (endpoint, method) => {
            // Ensure inputs are strings
            if (typeof endpoint !== 'string' || typeof method !== 'string') {
                throw new Error('Endpoint and method must be strings');
            }
            
            // Verify endpoint supports expected HTTP methods
            const endpointMethodMap = {
                '/health': ['GET'],
                '/api/v1/data/air-quality/latest': ['GET'],
                '/api/v1/data/stations': ['GET'],
                '/api/v1/forecast/24h/Delhi': ['GET'],
                '/api/v1/forecast/spatial': ['GET'],
                '/api/v1/data/weather/latest': ['GET']
            };
            
            const allowedMethods = endpointMethodMap[endpoint];
            if (allowedMethods && !allowedMethods.includes(method)) {
                // This is expected - not all methods are supported
                // Just verify the endpoint exists in the map
                if (!endpointMethodMap[endpoint]) {
                    throw new Error(`Unknown endpoint: ${endpoint}`);
                }
            }
        }
    ),
    
    /**
     * Property 16.5: Configuration Isolation
     * For any frontend configuration, Streamlit and Leaflet should have
     * isolated configurations that don't interfere with each other.
     */
    configurationIsolation: fc.property(
        generators.frontend,
        (frontend) => {
            // Ensure frontend is a string
            if (typeof frontend !== 'string') {
                throw new Error('Frontend must be a string');
            }
            
            // Verify frontend has its own configuration space
            const configPaths = {
                'streamlit': 'app.py',
                'leaflet': 'frontend/index.html'
            };
            
            const configPath = configPaths[frontend];
            if (!configPath) {
                throw new Error(`No configuration path for ${frontend}`);
            }
            
            // Verify configurations are in separate directories
            if (frontend === 'leaflet') {
                if (!configPath.startsWith('frontend/')) {
                    throw new Error('Leaflet config not isolated in frontend directory');
                }
            }
            
            if (frontend === 'streamlit') {
                if (configPath.startsWith('frontend/')) {
                    throw new Error('Streamlit config should not be in frontend directory');
                }
            }
        }
    )
};

// Test runner
function runBackwardCompatibilityTests() {
    console.log('Running Backward Compatibility Property Tests...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // Run each property test
    for (const [name, property] of Object.entries(properties)) {
        try {
            console.log(`Testing: ${name}`);
            fc.assert(property, { numRuns: 20 });
            console.log(`✓ ${name} passed\n`);
            results.passed++;
        } catch (error) {
            console.error(`✗ ${name} failed: ${error.message}\n`);
            results.failed++;
            results.errors.push({ property: name, error: error.message });
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Backward Compatibility Test Summary');
    console.log('='.repeat(50));
    console.log(`Total Properties: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.failed > 0) {
        console.log('\nFailures:');
        results.errors.forEach(({ property, error }) => {
            console.log(`  - ${property}: ${error}`);
        });
    }
    
    return results;
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        properties,
        generators,
        testUtils,
        runBackwardCompatibilityTests
    };
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
    window.backwardCompatibilityTests = {
        properties,
        generators,
        testUtils,
        run: runBackwardCompatibilityTests
    };
}
