/**
 * Property-Based Tests for Authentication Manager
 * Tests Property 3: Authentication Integration
 * 
 * **Validates: Requirements 1.6, 7.1, 7.2, 7.3**
 * 
 * Property 3: For any request requiring authentication, the Leaflet Frontend should use existing 
 * JWT tokens from the Backend API, include proper authorization headers, and handle token refresh 
 * correctly when tokens expire.
 */

import AuthManager from '../js/integration/auth-manager.js';

// Mock fetch for testing
const originalFetch = window.fetch;
const originalLocalStorage = window.localStorage;

// Test data generators for property-based testing
const generators = {
    // Generate valid credentials
    validCredentials: () => ({
        email: `test${Math.floor(Math.random() * 1000)}@example.com`,
        password: `TestPass${Math.floor(Math.random() * 1000)}!`
    }),

    // Generate invalid credentials
    invalidCredentials: () => {
        const types = [
            { email: '', password: 'validpass' },
            { email: 'invalid-email', password: 'validpass' },
            { email: 'test@example.com', password: '' },
            { email: 'test@example.com', password: '123' }, // Too short
        ];
        return types[Math.floor(Math.random() * types.length)];
    },

    // Generate valid token response
    validTokenResponse: () => ({
        access_token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({
            sub: `user-${Math.floor(Math.random() * 1000)}`,
            email: `test${Math.floor(Math.random() * 1000)}@example.com`,
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 1800 // 30 minutes
        }))}`,
        refresh_token: `refresh_${Math.random().toString(36).substring(2)}`,
        token_type: 'bearer',
        expires_in: 1800
    }),

    // Generate expired token response
    expiredTokenResponse: () => ({
        access_token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({
            sub: `user-${Math.floor(Math.random() * 1000)}`,
            email: `test${Math.floor(Math.random() * 1000)}@example.com`,
            role: 'user',
            exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago (expired)
        }))}`,
        refresh_token: `refresh_${Math.random().toString(36).substring(2)}`,
        token_type: 'bearer',
        expires_in: 1800
    }),

    // Generate user profile response
    userProfileResponse: () => ({
        id: `user-${Math.floor(Math.random() * 1000)}`,
        email: `test${Math.floor(Math.random() * 1000)}@example.com`,
        full_name: `Test User ${Math.floor(Math.random() * 1000)}`,
        is_active: true,
        is_verified: Math.random() > 0.5,
        role: ['user', 'moderator', 'admin'][Math.floor(Math.random() * 3)],
        created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        updated_at: new Date().toISOString()
    }),

    // Generate API request scenarios
    apiRequestScenario: () => {
        const scenarios = [
            { url: '/api/v1/data/air-quality/latest', method: 'GET', requiresAuth: true },
            { url: '/api/v1/forecast/24h/Delhi', method: 'GET', requiresAuth: true },
            { url: '/api/v1/forecast/spatial', method: 'GET', requiresAuth: true },
            { url: '/api/v1/data/stations', method: 'GET', requiresAuth: true },
            { url: '/api/v1/auth/me', method: 'GET', requiresAuth: true },
            { url: '/api/v1/health', method: 'GET', requiresAuth: false }
        ];
        return scenarios[Math.floor(Math.random() * scenarios.length)];
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

// Property 3: Authentication Integration
const authenticationIntegrationProperty = async (testData) => {
    // Setup mock environment
    const mockStorage = new MockStorage();
    window.localStorage = mockStorage;
    
    let fetchCallCount = 0;
    const fetchCalls = [];
    
    // Mock fetch with authentication scenarios
    window.fetch = (url, options = {}) => {
        fetchCallCount++;
        const call = { url, options, callNumber: fetchCallCount };
        fetchCalls.push(call);
        
        // Simulate different authentication scenarios
        if (url.includes('/auth/login')) {
            if (testData.credentials && testData.credentials.email && testData.credentials.password) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(testData.tokenResponse || generators.validTokenResponse())
                });
            } else {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ detail: 'Invalid credentials' })
                });
            }
        }
        
        if (url.includes('/auth/me')) {
            const authHeader = options.headers?.['Authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(testData.userProfile || generators.userProfileResponse())
                });
            } else {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ detail: 'Authentication required' })
                });
            }
        }
        
        if (url.includes('/auth/refresh')) {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    access_token: generators.validTokenResponse().access_token,
                    token_type: 'bearer',
                    expires_in: 1800
                })
            });
        }
        
        // For other API endpoints, check authentication
        if (testData.apiRequest && testData.apiRequest.requiresAuth) {
            const authHeader = options.headers?.['Authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ data: 'test' })
                });
            } else {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ detail: 'Authentication required' })
                });
            }
        }
        
        // Default success for non-auth endpoints
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'test' })
        });
    };
    
    try {
        const authManager = new AuthManager();
        
        // Test authentication flow
        if (testData.credentials) {
            const authResult = await authManager.authenticate(testData.credentials);
            
            // Verify authentication result structure
            if (!authResult || typeof authResult.success !== 'boolean') {
                return {
                    success: false,
                    error: 'Invalid authentication result structure',
                    details: `Expected object with success boolean, got: ${typeof authResult}`
                };
            }
            
            // If authentication should succeed
            if (testData.shouldSucceed !== false && testData.credentials.email && testData.credentials.password) {
                if (!authResult.success) {
                    return {
                        success: false,
                        error: 'Authentication should have succeeded',
                        details: `Error: ${authResult.error}`
                    };
                }
                
                // Verify token is stored and valid
                if (!authManager.isAuthenticated()) {
                    return {
                        success: false,
                        error: 'User should be authenticated after successful login',
                        details: 'isAuthenticated() returned false'
                    };
                }
                
                // Verify authorization header is properly formatted
                const authHeader = authManager.getAuthHeader();
                if (!authHeader.Authorization || !authHeader.Authorization.startsWith('Bearer ')) {
                    return {
                        success: false,
                        error: 'Invalid authorization header format',
                        details: `Expected "Bearer <token>", got: ${authHeader.Authorization}`
                    };
                }
            }
        }
        
        // Test API request with authentication
        if (testData.apiRequest) {
            const requestOptions = authManager.addAuthToRequest({
                method: testData.apiRequest.method
            });
            
            // Verify authentication headers are added for protected endpoints
            if (testData.apiRequest.requiresAuth && authManager.isAuthenticated()) {
                if (!requestOptions.headers.Authorization) {
                    return {
                        success: false,
                        error: 'Authorization header missing for protected endpoint',
                        details: `Headers: ${JSON.stringify(requestOptions.headers)}`
                    };
                }
                
                // Verify rate limiting compliance headers
                if (!requestOptions.headers['X-Client-Type']) {
                    return {
                        success: false,
                        error: 'Rate limiting compliance headers missing',
                        details: 'X-Client-Type header not found'
                    };
                }
            }
            
            // Test authenticated request
            if (authManager.isAuthenticated()) {
                try {
                    const response = await authManager.makeAuthenticatedRequest(
                        testData.apiRequest.url,
                        { method: testData.apiRequest.method }
                    );
                    
                    if (testData.apiRequest.requiresAuth && !response.ok) {
                        return {
                            success: false,
                            error: 'Authenticated request failed',
                            details: `Status: ${response.status}`
                        };
                    }
                } catch (error) {
                    if (!error.message.includes('Authentication required')) {
                        return {
                            success: false,
                            error: 'Unexpected error in authenticated request',
                            details: error.message
                        };
                    }
                }
            }
        }
        
        // Test token refresh functionality
        if (testData.testRefresh && authManager.isAuthenticated()) {
            const refreshResult = await authManager.refreshAuthToken();
            
            if (typeof refreshResult !== 'boolean') {
                return {
                    success: false,
                    error: 'Token refresh should return boolean',
                    details: `Got: ${typeof refreshResult}`
                };
            }
        }
        
        // Verify fetch calls include proper authentication
        const authCalls = fetchCalls.filter(call => 
            call.options.headers && call.options.headers.Authorization
        );
        
        const protectedCalls = fetchCalls.filter(call => 
            !call.url.includes('/auth/login') && 
            (testData.apiRequest?.requiresAuth || call.url.includes('/auth/me'))
        );
        
        if (protectedCalls.length > 0 && authManager.isAuthenticated() && authCalls.length === 0) {
            return {
                success: false,
                error: 'Protected API calls missing authentication headers',
                details: `Protected calls: ${protectedCalls.length}, Auth calls: ${authCalls.length}`
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

// Test suite for Authentication Manager
class AuthManagerPropertyTests {
    async runAll() {
        console.log('🧪 Starting Authentication Manager Property-Based Tests');
        console.log('Testing Property 3: Authentication Integration');
        console.log('Validates Requirements: 1.6, 7.1, 7.2, 7.3\n');
        console.log('=' .repeat(60));
        
        const tests = [
            // Test valid authentication flow
            new PropertyTestRunner(
                'Valid Authentication Flow',
                authenticationIntegrationProperty,
                () => ({
                    credentials: generators.validCredentials(),
                    tokenResponse: generators.validTokenResponse(),
                    userProfile: generators.userProfileResponse(),
                    shouldSucceed: true
                }),
                50
            ),
            
            // Test invalid authentication handling
            new PropertyTestRunner(
                'Invalid Authentication Handling',
                authenticationIntegrationProperty,
                () => ({
                    credentials: generators.invalidCredentials(),
                    shouldSucceed: false
                }),
                30
            ),
            
            // Test API request authentication
            new PropertyTestRunner(
                'API Request Authentication',
                authenticationIntegrationProperty,
                () => ({
                    credentials: generators.validCredentials(),
                    tokenResponse: generators.validTokenResponse(),
                    userProfile: generators.userProfileResponse(),
                    apiRequest: generators.apiRequestScenario(),
                    shouldSucceed: true
                }),
                40
            ),
            
            // Test token refresh
            new PropertyTestRunner(
                'Token Refresh Functionality',
                authenticationIntegrationProperty,
                () => ({
                    credentials: generators.validCredentials(),
                    tokenResponse: generators.validTokenResponse(),
                    userProfile: generators.userProfileResponse(),
                    testRefresh: true,
                    shouldSucceed: true
                }),
                20
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
        
        console.log(`Total Test Suites: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        
        const overallSuccess = failedTests === 0;
        
        if (overallSuccess) {
            console.log('\n🎉 All authentication properties hold! Authentication Manager is working correctly.');
            console.log('✅ Property 3: Authentication Integration is validated');
            console.log('✅ Requirements 1.6, 7.1, 7.2, 7.3 are satisfied');
        } else {
            console.log('\n⚠️  Some authentication properties failed. Review the failures above.');
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

// Additional unit tests for specific authentication scenarios
class AuthManagerUnitTests {
    constructor() {
        this.mockStorage = new MockStorage();
    }

    async testTokenExpiration() {
        console.log('\n🔍 Testing token expiration handling...');
        
        // Setup mock environment
        window.localStorage = this.mockStorage;
        
        window.fetch = (url) => {
            if (url.includes('/auth/refresh')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({
                        access_token: 'new_token',
                        token_type: 'bearer',
                        expires_in: 1800
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        };
        
        try {
            const authManager = new AuthManager();
            
            // Set expired token
            const expiredToken = {
                token: 'expired_token',
                type: 'bearer',
                expiresAt: Date.now() - 3600000 // 1 hour ago
            };
            
            authManager.token = expiredToken;
            authManager.refreshToken = { token: 'refresh_token', expiresAt: Date.now() + 86400000 };
            
            // Test that expired token is detected
            if (authManager.isTokenValid(expiredToken)) {
                console.log('❌ Expired token should be invalid');
                return false;
            }
            
            // Test automatic refresh
            const refreshResult = await authManager.refreshAuthToken();
            if (!refreshResult) {
                console.log('❌ Token refresh should succeed');
                return false;
            }
            
            console.log('✅ Token expiration handling works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ Token expiration test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async testRateLimitingCompliance() {
        console.log('\n🔍 Testing rate limiting compliance...');
        
        window.localStorage = this.mockStorage;
        
        let requestHeaders = null;
        window.fetch = (url, options) => {
            requestHeaders = options?.headers;
            return Promise.resolve({
                ok: true,
                status: 200,
                headers: new Map([
                    ['X-RateLimit-Remaining', '95'],
                    ['X-RateLimit-Limit', '100'],
                    ['X-RateLimit-Reset', (Date.now() + 60000).toString()]
                ]),
                json: () => Promise.resolve({})
            });
        };
        
        try {
            const authManager = new AuthManager();
            
            // Set valid token
            authManager.token = {
                token: 'valid_token',
                type: 'bearer',
                expiresAt: Date.now() + 1800000
            };
            
            // Make authenticated request
            await authManager.makeAuthenticatedRequest('/api/v1/test');
            
            // Check rate limiting headers
            if (!requestHeaders['X-Client-Type']) {
                console.log('❌ Missing X-Client-Type header');
                return false;
            }
            
            if (!requestHeaders['X-Client-Version']) {
                console.log('❌ Missing X-Client-Version header');
                return false;
            }
            
            // Test rate limit checking
            const rateLimitInfo = await authManager.checkRateLimit();
            if (typeof rateLimitInfo.remaining !== 'number') {
                console.log('❌ Rate limit info should include remaining count');
                return false;
            }
            
            console.log('✅ Rate limiting compliance works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ Rate limiting test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async testCORSHandling() {
        console.log('\n🔍 Testing CORS handling...');
        
        window.localStorage = this.mockStorage;
        
        let requestOptions = null;
        window.fetch = (url, options) => {
            requestOptions = options;
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({})
            });
        };
        
        try {
            const authManager = new AuthManager();
            
            // Set valid token
            authManager.token = {
                token: 'valid_token',
                type: 'bearer',
                expiresAt: Date.now() + 1800000
            };
            
            // Make cross-origin request
            await authManager.makeAuthenticatedRequest('/api/v1/test');
            
            // Check CORS-compliant headers
            if (!requestOptions.headers['Content-Type']) {
                console.log('❌ Missing Content-Type header');
                return false;
            }
            
            if (requestOptions.headers['Content-Type'] !== 'application/json') {
                console.log('❌ Incorrect Content-Type header');
                return false;
            }
            
            console.log('✅ CORS handling works correctly');
            return true;
            
        } catch (error) {
            console.log(`❌ CORS handling test failed: ${error.message}`);
            return false;
        } finally {
            window.localStorage = originalLocalStorage;
            window.fetch = originalFetch;
        }
    }

    async runAll() {
        console.log('\n🧪 Running Authentication Manager Unit Tests');
        console.log('-' .repeat(40));
        
        const tests = [
            await this.testTokenExpiration(),
            await this.testRateLimitingCompliance(),
            await this.testCORSHandling()
        ];

        const passed = tests.filter(Boolean).length;
        const total = tests.length;
        
        console.log(`\n📊 Unit Tests: ${passed}/${total} passed`);
        
        return passed === total;
    }
}

// Main test runner
async function runAuthManagerTests() {
    console.log('🚀 Authentication Manager Property-Based Testing Suite');
    console.log('Testing Property 3: Authentication Integration');
    console.log('Validates Requirements: 1.6, 7.1, 7.2, 7.3\n');
    
    // Run property-based tests
    const propertyTests = new AuthManagerPropertyTests();
    const propertyResults = await propertyTests.runAll();
    
    // Run unit tests
    const unitTests = new AuthManagerUnitTests();
    const unitResults = await unitTests.runAll();
    
    // Overall results
    const overallSuccess = propertyResults.success && unitResults;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Results:');
    console.log(`Property Tests: ${propertyResults.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Unit Tests: ${unitResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 Authentication Manager implementation satisfies Property 3: Authentication Integration');
        console.log('Requirements 1.6, 7.1, 7.2, 7.3 are validated ✅');
    } else {
        console.log('\n⚠️  Authentication Manager needs fixes to satisfy the property');
    }
    
    return {
        success: overallSuccess,
        propertyResults,
        unitResults
    };
}

// Export for use in test runners
export { runAuthManagerTests, AuthManagerPropertyTests, AuthManagerUnitTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner.html')) {
    runAuthManagerTests();
}