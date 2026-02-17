/**
 * Property-Based Tests for Security Compliance
 * Tests Property 14: Rate Limiting Compliance and Property 15: CORS Handling
 * 
 * **Validates: Requirements 7.4, 7.5**
 * 
 * Property 14: For any API request pattern, the Leaflet Frontend should respect existing 
 * rate limiting configured in Backend API middleware and not exceed the allowed request rates.
 * 
 * Property 15: For any cross-origin request between frontend and backend, the Integration Layer 
 * should handle CORS configuration correctly to allow proper communication.
 */

import AuthManager from '../js/integration/auth-manager.js';
import CORSRateLimitCompliance from '../js/integration/cors-rate-limit-compliance.js';

// Mock fetch for testing
const originalFetch = window.fetch;
const originalLocalStorage = window.localStorage;

// Test data generators for property-based testing
const generators = {
    // Generate API request patterns
    apiRequestPattern: () => {
        const patterns = [
            { url: '/api/v1/data/air-quality/latest', method: 'GET', authenticated: true },
            { url: '/api/v1/forecast/24h/Delhi', method: 'GET', authenticated: true },
            { url: '/api/v1/forecast/spatial', method: 'GET', authenticated: true },
            { url: '/api/v1/data/stations', method: 'GET', authenticated: true },
            { url: '/api/v1/auth/me', method: 'GET', authenticated: true },
            { url: '/health', method: 'GET', authenticated: false },
            { url: '/api/v1/auth/login', method: 'POST', authenticated: false },
            { url: '/api/v1/auth/refresh', method: 'POST', authenticated: false }
        ];
        return patterns[Math.floor(Math.random() * patterns.length)];
    },

    // Generate request burst patterns for rate limiting
    requestBurstPattern: () => {
        const burstSizes = [5, 10, 25, 50, 100, 200];
        const intervals = [100, 500, 1000, 2000]; // milliseconds
        
        return {
            burstSize: burstSizes[Math.floor(Math.random() * burstSizes.length)],
            interval: intervals[Math.floor(Math.random() * intervals.length)],
            authenticated: Math.random() > 0.5
        };
    },

    // Generate CORS scenarios
    corsScenario: () => {
        const origins = [
            'http://localhost:3000',
            'https://example.com',
            'https://aqi-frontend.com',
            'http://127.0.0.1:8080',
            'https://localhost:8443'
        ];
        
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
        const headers = [
            { 'Content-Type': 'application/json' },
            { 'Authorization': 'Bearer token123' },
            { 'X-Custom-Header': 'value' },
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer token123' }
        ];
        
        return {
            origin: origins[Math.floor(Math.random() * origins.length)],
            method: methods[Math.floor(Math.random() * methods.length)],
            headers: headers[Math.floor(Math.random() * headers.length)],
            credentials: Math.random() > 0.5
        };
    },

    // Generate rate limit scenarios
    rateLimitScenario: () => {
        return {
            userType: Math.random() > 0.5 ? 'authenticated' : 'anonymous',
            requestCount: Math.floor(Math.random() * 150) + 1, // 1-150 requests
            timeWindow: Math.floor(Math.random() * 3600) + 60, // 1 minute to 1 hour
            expectedLimit: Math.random() > 0.5 ? 1000 : 5000 // Anonymous vs authenticated limits
        };
    }
};

// Mock storage for testing
class MockStorage {
    constructor() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = value;
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

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

// Property 14: Rate Limiting Compliance
const rateLimitingComplianceProperty = async (testData) => {
    // Setup mock environment
    const mockStorage = new MockStorage();
    window.localStorage = mockStorage;
    
    let requestCount = 0;
    const requestTimes = [];
    let rateLimitExceeded = false;
    
    // Mock fetch with rate limiting simulation
    window.fetch = (url, options = {}) => {
        requestCount++;
        requestTimes.push(Date.now());
        
        // Simulate rate limiting based on request pattern
        const isAuthenticated = testData.userType === 'authenticated';
        const limit = isAuthenticated ? 5000 : 1000; // Per hour
        const windowSize = 3600000; // 1 hour in milliseconds
        
        // Check if we're within rate limit
        const now = Date.now();
        const windowStart = now - windowSize;
        const recentRequests = requestTimes.filter(time => time > windowStart);
        
        if (recentRequests.length > limit) {
            rateLimitExceeded = true;
            return Promise.resolve({
                ok: false,
                status: 429,
                headers: new Map([
                    ['Retry-After', '3600'],
                    ['X-RateLimit-Remaining', '0'],
                    ['X-RateLimit-Limit', limit.toString()],
                    ['X-RateLimit-Reset', Math.floor((now + windowSize) / 1000).toString()]
                ]),
                json: () => Promise.resolve({
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Rate limit exceeded. Maximum ${limit} requests per hour.`
                    }
                })
            });
        }
        
        // Simulate successful response
        return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Map([
                ['X-RateLimit-Remaining', (limit - recentRequests.length).toString()],
                ['X-RateLimit-Limit', limit.toString()],
                ['X-RateLimit-Reset', Math.floor((now + windowSize) / 1000).toString()]
            ]),
            json: () => Promise.resolve({ data: 'test' })
        });
    };
    
    try {
        const compliance = new CORSRateLimitCompliance();
        
        // Set authentication status
        compliance.setAuthenticationStatus(testData.userType === 'authenticated');
        
        // Test rate limiting compliance
        const requestPromises = [];
        const requestInterval = Math.max(10, testData.timeWindow / testData.requestCount);
        
        for (let i = 0; i < testData.requestCount; i++) {
            const delay = i * requestInterval;
            const requestPromise = new Promise(async (resolve) => {
                setTimeout(async () => {
                    try {
                        const response = await compliance.makeCompliantRequest(
                            '/api/v1/test',
                            { method: 'GET' },
                            testData.userType === 'authenticated'
                        );
                        resolve({ success: response.ok, status: response.status });
                    } catch (error) {
                        resolve({ success: false, error: error.message });
                    }
                }, delay);
            });
            requestPromises.push(requestPromise);
        }
        
        const results = await Promise.all(requestPromises);
        
        // Verify rate limiting behavior
        const successfulRequests = results.filter(r => r.success).length;
        const rateLimitedRequests = results.filter(r => r.status === 429).length;
        
        // Check if rate limiting was properly enforced
        const expectedLimit = testData.userType === 'authenticated' ? 5000 : 1000;
        
        if (testData.requestCount > expectedLimit) {
            // Should have been rate limited
            if (rateLimitedRequests === 0) {
                return {
                    success: false,
                    error: 'Rate limiting not enforced when it should have been',
                    details: `Made ${testData.requestCount} requests, expected limit: ${expectedLimit}, rate limited: ${rateLimitedRequests}`
                };
            }
        } else {
            // Should not have been rate limited
            if (rateLimitedRequests > 0) {
                return {
                    success: false,
                    error: 'Rate limiting enforced when it should not have been',
                    details: `Made ${testData.requestCount} requests, expected limit: ${expectedLimit}, rate limited: ${rateLimitedRequests}`
                };
            }
        }
        
        // Check rate limit status tracking
        const rateLimitStatus = compliance.getRateLimitStatus();
        if (typeof rateLimitStatus.remaining !== 'number' || typeof rateLimitStatus.limit !== 'number') {
            return {
                success: false,
                error: 'Rate limit status not properly tracked',
                details: `Status: ${JSON.stringify(rateLimitStatus)}`
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
        // Restore original environment
        window.fetch = originalFetch;
        window.localStorage = originalLocalStorage;
    }
};

// Property 15: CORS Handling
const corsHandlingProperty = async (testData) => {
    // Setup mock environment
    const mockStorage = new MockStorage();
    window.localStorage = mockStorage;
    
    let corsHeadersChecked = false;
    let preflightMade = false;
    
    // Mock fetch with CORS simulation
    window.fetch = (url, options = {}) => {
        const method = options.method || 'GET';
        const headers = options.headers || {};
        
        // Check for preflight request
        if (method === 'OPTIONS') {
            preflightMade = true;
            return Promise.resolve({
                ok: true,
                status: 200,
                headers: new Map([
                    ['Access-Control-Allow-Origin', '*'],
                    ['Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'],
                    ['Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Type, X-Client-Version'],
                    ['Access-Control-Allow-Credentials', 'true']
                ])
            });
        }
        
        // Check CORS headers in actual request
        corsHeadersChecked = true;
        
        // Verify required headers are present
        const requiredHeaders = ['Content-Type', 'X-Client-Type'];
        for (const header of requiredHeaders) {
            if (!headers[header] && !headers[header.toLowerCase()]) {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({
                        error: `Missing required header: ${header}`
                    })
                });
            }
        }
        
        // Simulate CORS validation
        const origin = headers['Origin'] || headers['origin'];
        if (testData.origin && testData.origin !== window.location.origin) {
            // Cross-origin request
            if (!origin) {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({
                        error: 'Missing Origin header for cross-origin request'
                    })
                });
            }
        }
        
        // Successful response with CORS headers
        return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Map([
                ['Access-Control-Allow-Origin', '*'],
                ['Access-Control-Allow-Credentials', 'true']
            ]),
            json: () => Promise.resolve({ data: 'test' })
        });
    };
    
    try {
        const compliance = new CORSRateLimitCompliance();
        
        // Test CORS compliance
        const requestUrl = `${testData.origin || 'http://localhost:8000'}/api/v1/test`;
        
        // Configure request options
        const requestOptions = compliance.configureCORSHeaders({
            method: testData.method,
            headers: testData.headers
        });
        
        // Check CORS compliance before making request
        const isCORSCompliant = compliance.isCORSCompliant(requestUrl, requestOptions);
        
        if (!isCORSCompliant) {
            return {
                success: false,
                error: 'Request not CORS compliant',
                details: `URL: ${requestUrl}, Options: ${JSON.stringify(requestOptions)}`
            };
        }
        
        // Make the request
        const response = await compliance.makeCompliantRequest(
            requestUrl,
            requestOptions,
            false
        );
        
        // Verify CORS headers were added
        if (!corsHeadersChecked) {
            return {
                success: false,
                error: 'CORS headers not checked in request',
                details: 'Request was not processed through CORS validation'
            };
        }
        
        // Verify response CORS validation
        const isValidCORSResponse = compliance.validateCORSResponse(response, testData.origin);
        if (!isValidCORSResponse) {
            return {
                success: false,
                error: 'Response failed CORS validation',
                details: `Origin: ${testData.origin}, Response headers checked`
            };
        }
        
        // Test preflight handling for complex requests
        if (testData.method !== 'GET' && testData.method !== 'HEAD') {
            const preflightSuccess = await compliance.handlePreflight(requestUrl);
            if (!preflightSuccess) {
                return {
                    success: false,
                    error: 'Preflight request failed',
                    details: `Method: ${testData.method}, URL: ${requestUrl}`
                };
            }
        }
        
        // Verify CORS configuration
        const corsConfig = compliance.getCORSConfig();
        if (!corsConfig.allowedMethods.includes(testData.method.toUpperCase())) {
            return {
                success: false,
                error: 'Method not allowed by CORS configuration',
                details: `Method: ${testData.method}, Allowed: ${corsConfig.allowedMethods}`
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
        // Restore original environment
        window.fetch = originalFetch;
        window.localStorage = originalLocalStorage;
    }
};

// Test suite for Security Compliance
class SecurityCompliancePropertyTests {
    async runAll() {
        console.log('🧪 Starting Security Compliance Property-Based Tests');
        console.log('Testing Property 14: Rate Limiting Compliance');
        console.log('Testing Property 15: CORS Handling');
        console.log('Validates Requirements: 7.4, 7.5\n');
        console.log('=' .repeat(60));
        
        const tests = [
            // Test rate limiting compliance
            new PropertyTestRunner(
                'Property 14: Rate Limiting Compliance',
                rateLimitingComplianceProperty,
                generators.rateLimitScenario,
                30
            ),
            
            // Test CORS handling
            new PropertyTestRunner(
                'Property 15: CORS Handling',
                corsHandlingProperty,
                generators.corsScenario,
                40
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
        
        const overallSuccess = failedTests === 0;
        
        if (overallSuccess) {
            console.log('\n🎉 All security compliance properties hold!');
            console.log('✅ Property 14: Rate Limiting Compliance is validated');
            console.log('✅ Property 15: CORS Handling is validated');
            console.log('✅ Requirements 7.4, 7.5 are satisfied');
        } else {
            console.log('\n⚠️  Some security compliance properties failed. Review the failures above.');
        }

        return {
            success: overallSuccess,
            results,
            summary: {
                totalTests,
                passedTests,
                failedTests,
                overallSuccess
            }
        };
    }
}

// Additional unit tests for specific security scenarios
class SecurityComplianceUnitTests {
    constructor() {
        this.mockStorage = new MockStorage();
    }

    async testRateLimitQueueing() {
        console.log('\n🔍 Testing rate limit request queueing...');
        
        // Setup mock environment
        window.localStorage = this.mockStorage;
        
        let requestCount = 0;
        window.fetch = () => {
            requestCount++;
            if (requestCount > 5) {
                return Promise.resolve({
                    ok: false,
                    status: 429,
                    headers: new Map([['Retry-After', '1']]),
                    json: () => Promise.resolve({ error: 'Rate limited' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        };
        
        try {
            const compliance = new CORSRateLimitCompliance();
            
            // Make multiple requests that should trigger queueing
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(compliance.makeCompliantRequest('/test', {}, false));
            }
            
            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;
            
            if (successCount < 5) {
                console.log('❌ Rate limit queueing not working properly');
                return false;
            }
            
            console.log('✅ Rate limit queueing works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ Rate limit queueing test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async testCORSPreflightHandling() {
        console.log('\n🔍 Testing CORS preflight handling...');
        
        window.localStorage = this.mockStorage;
        
        let preflightReceived = false;
        window.fetch = (url, options) => {
            if (options?.method === 'OPTIONS') {
                preflightReceived = true;
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Map([
                        ['Access-Control-Allow-Origin', '*'],
                        ['Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'],
                        ['Access-Control-Allow-Headers', 'Content-Type, Authorization']
                    ])
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        };
        
        try {
            const compliance = new CORSRateLimitCompliance();
            
            // Test preflight request
            const success = await compliance.handlePreflight('https://api.example.com/test');
            
            if (!success || !preflightReceived) {
                console.log('❌ CORS preflight handling failed');
                return false;
            }
            
            console.log('✅ CORS preflight handling works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ CORS preflight test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async testSecurityHeaderCompliance() {
        console.log('\n🔍 Testing security header compliance...');
        
        window.localStorage = this.mockStorage;
        
        let requestHeaders = null;
        window.fetch = (url, options) => {
            requestHeaders = options?.headers;
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        };
        
        try {
            const compliance = new CORSRateLimitCompliance();
            
            // Make request and check headers
            await compliance.makeCompliantRequest('/test', {}, false);
            
            // Check required security headers
            if (!requestHeaders['X-Client-Type']) {
                console.log('❌ Missing X-Client-Type header');
                return false;
            }
            
            if (!requestHeaders['X-Client-Version']) {
                console.log('❌ Missing X-Client-Version header');
                return false;
            }
            
            if (requestHeaders['Content-Type'] !== 'application/json') {
                console.log('❌ Incorrect Content-Type header');
                return false;
            }
            
            console.log('✅ Security header compliance works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ Security header compliance test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async runAll() {
        console.log('\n🧪 Running Security Compliance Unit Tests');
        console.log('-' .repeat(40));
        
        const tests = [
            await this.testRateLimitQueueing(),
            await this.testCORSPreflightHandling(),
            await this.testSecurityHeaderCompliance()
        ];

        const passed = tests.filter(Boolean).length;
        const total = tests.length;
        
        console.log(`\n📊 Unit Tests: ${passed}/${total} passed`);
        
        return passed === total;
    }
}

// Main test runner
async function runSecurityComplianceTests() {
    console.log('🚀 Security Compliance Property-Based Testing Suite');
    console.log('Testing Property 14: Rate Limiting Compliance');
    console.log('Testing Property 15: CORS Handling');
    console.log('Validates Requirements: 7.4, 7.5\n');
    
    // Run property-based tests
    const propertyTests = new SecurityCompliancePropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Run unit tests
    const unitTests = new SecurityComplianceUnitTests();
    const unitResults = await unitTests.runAll();
    
    // Overall results
    const overallSuccess = propertyResults.success && unitResults;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Unit Tests: ${unitResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 Security compliance implementation satisfies both properties');
        console.log('✅ Property 14: Rate Limiting Compliance');
        console.log('✅ Property 15: CORS Handling');
        console.log('Requirements 7.4, 7.5 are validated ✅');
    } else {
        console.log('\n⚠️  Security compliance needs fixes to satisfy the properties');
    }
    
    return {
        success: overallSuccess,
        propertyResults,
        unitResults
    };
}

// Export for use in test runners
export { runSecurityComplianceTests, SecurityCompliancePropertyTests, SecurityComplianceUnitTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runSecurityComplianceTests();
}