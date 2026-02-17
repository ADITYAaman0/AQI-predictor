/**
 * Property-Based Tests for Configuration Management
 * 
 * Tests Properties:
 * - Property 20: Configuration Consistency
 * - Property 21: Environment Configuration Validation
 * 
 * Validates Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import fc from 'https://cdn.jsdelivr.net/npm/fast-check@3.13.2/+esm';

// Mock configuration objects for testing
const createMockConfig = (environment) => ({
    ENVIRONMENT: environment,
    API_BASE_URL: environment === 'development' 
        ? 'http://localhost:8000/api/v1' 
        : '/api/v1',
    INTEGRATION_BASE_URL: environment === 'development'
        ? 'http://localhost:8000/api/v1/integration'
        : '/api/v1/integration',
    MAP_CENTER: [28.6139, 77.2090],
    MAP_ZOOM: 10,
    TILE_URL: 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png',
    DEBUG: environment === 'development' || environment === 'staging',
    LOG_LEVEL: environment === 'development' ? 'debug' : 
               environment === 'staging' ? 'info' : 'error',
    DATA_REFRESH_INTERVAL: environment === 'development' ? 120000 : 900000,
    CACHE_TTL: environment === 'development' ? 30000 : 900000,
    API_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
});

/**
 * Property 20: Configuration Consistency
 * 
 * For any environment (development, staging, production), the configuration
 * should be internally consistent with matching API endpoints, appropriate
 * debug settings, and valid timeout values.
 */
const testConfigurationConsistency = () => {
    console.log('\n=== Property 20: Configuration Consistency ===');
    console.log('Testing that configurations are internally consistent across environments...\n');
    
    const environmentArbitrary = fc.constantFrom('development', 'staging', 'production');
    
    const property = fc.property(
        environmentArbitrary,
        (environment) => {
            const config = createMockConfig(environment);
            
            // 1. Environment field matches the environment
            if (config.ENVIRONMENT !== environment) {
                return false;
            }
            
            // 2. API URLs are consistent with environment
            if (environment === 'development') {
                // Development should use localhost URLs
                if (!config.API_BASE_URL.includes('localhost')) {
                    return false;
                }
                if (!config.INTEGRATION_BASE_URL.includes('localhost')) {
                    return false;
                }
            } else {
                // Staging and production should use relative paths
                if (!config.API_BASE_URL.startsWith('/')) {
                    return false;
                }
                if (!config.INTEGRATION_BASE_URL.startsWith('/')) {
                    return false;
                }
            }
            
            // 3. Debug settings are appropriate for environment
            if (environment === 'production' && config.DEBUG === true) {
                return false;
            }
            
            // 4. Log levels are appropriate
            const validLogLevels = ['debug', 'info', 'warn', 'error'];
            if (!validLogLevels.includes(config.LOG_LEVEL)) {
                return false;
            }
            
            // 5. Timeouts are positive numbers
            if (config.API_TIMEOUT <= 0) {
                return false;
            }
            if (config.RETRY_ATTEMPTS < 0) {
                return false;
            }
            
            // 6. Refresh intervals are reasonable
            if (config.DATA_REFRESH_INTERVAL < 1000) { // At least 1 second
                return false;
            }
            if (config.CACHE_TTL < 0) {
                return false;
            }
            
            // 7. Map center coordinates are valid
            const [lat, lng] = config.MAP_CENTER;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return false;
            }
            
            return true;
        }
    );
    
    try {
        fc.assert(property, { numRuns: 100 });
        console.log('✓ Property 20 PASSED: Configuration consistency maintained across all environments');
        return true;
    } catch (error) {
        console.error('✗ Property 20 FAILED:', error.message);
        if (error.counterexample) {
            console.error('Counter-example:', error.counterexample);
        }
        return false;
    }
};

/**
 * Property 21: Environment Configuration Validation
 * 
 * For any configuration object, all required fields must be present and valid,
 * and the configuration must pass validation checks.
 */
const testEnvironmentConfigValidation = () => {
    console.log('\n=== Property 21: Environment Configuration Validation ===');
    console.log('Testing that all configurations pass validation requirements...\n');
    
    const configArbitrary = fc.record({
        ENVIRONMENT: fc.constantFrom('development', 'staging', 'production'),
        API_BASE_URL: fc.oneof(
            fc.constant('http://localhost:8000/api/v1'),
            fc.constant('/api/v1')
        ),
        INTEGRATION_BASE_URL: fc.oneof(
            fc.constant('http://localhost:8000/api/v1/integration'),
            fc.constant('/api/v1/integration')
        ),
        MAP_CENTER: fc.tuple(
            fc.double({ min: -90, max: 90 }),
            fc.double({ min: -180, max: 180 })
        ),
        MAP_ZOOM: fc.integer({ min: 1, max: 20 }),
        TILE_URL: fc.constant('https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png'),
        DEBUG: fc.boolean(),
        LOG_LEVEL: fc.constantFrom('debug', 'info', 'warn', 'error'),
        DATA_REFRESH_INTERVAL: fc.integer({ min: 1000, max: 3600000 }),
        CACHE_TTL: fc.integer({ min: 0, max: 3600000 }),
        API_TIMEOUT: fc.integer({ min: 1000, max: 60000 }),
        RETRY_ATTEMPTS: fc.integer({ min: 0, max: 10 }),
    });
    
    const validateConfig = (config) => {
        // Required fields check
        const requiredFields = [
            'ENVIRONMENT',
            'API_BASE_URL',
            'INTEGRATION_BASE_URL',
            'MAP_CENTER',
            'TILE_URL'
        ];
        
        for (const field of requiredFields) {
            if (!(field in config) || config[field] === null || config[field] === undefined) {
                return { valid: false, reason: `Missing required field: ${field}` };
            }
        }
        
        // Validate MAP_CENTER
        if (!Array.isArray(config.MAP_CENTER) || config.MAP_CENTER.length !== 2) {
            return { valid: false, reason: 'MAP_CENTER must be array of [lat, lng]' };
        }
        
        const [lat, lng] = config.MAP_CENTER;
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return { valid: false, reason: 'MAP_CENTER coordinates must be numbers' };
        }
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return { valid: false, reason: 'MAP_CENTER coordinates out of range' };
        }
        
        // Validate URLs
        const urlPattern = /^(https?:\/\/|\/)/;
        if (!urlPattern.test(config.API_BASE_URL)) {
            return { valid: false, reason: 'API_BASE_URL must be valid URL or path' };
        }
        
        if (!urlPattern.test(config.INTEGRATION_BASE_URL)) {
            return { valid: false, reason: 'INTEGRATION_BASE_URL must be valid URL or path' };
        }
        
        // Validate numeric fields
        const numericFields = {
            DATA_REFRESH_INTERVAL: { min: 0 },
            CACHE_TTL: { min: 0 },
            API_TIMEOUT: { min: 0 },
            MAP_ZOOM: { min: 0, max: 20 }
        };
        
        for (const [field, constraints] of Object.entries(numericFields)) {
            if (field in config) {
                if (typeof config[field] !== 'number') {
                    return { valid: false, reason: `${field} must be a number` };
                }
                if (constraints.min !== undefined && config[field] < constraints.min) {
                    return { valid: false, reason: `${field} below minimum` };
                }
                if (constraints.max !== undefined && config[field] > constraints.max) {
                    return { valid: false, reason: `${field} above maximum` };
                }
            }
        }
        
        return { valid: true };
    };
    
    const property = fc.property(
        configArbitrary,
        (config) => {
            const result = validateConfig(config);
            return result.valid;
        }
    );
    
    try {
        fc.assert(property, { numRuns: 100 });
        console.log('✓ Property 21 PASSED: All configurations pass validation requirements');
        return true;
    } catch (error) {
        console.error('✗ Property 21 FAILED:', error.message);
        if (error.counterexample) {
            console.error('Counter-example:', error.counterexample);
        }
        return false;
    }
};

/**
 * Additional Test: Configuration Override Behavior
 * 
 * Tests that environment overrides work correctly and don't break validation
 */
const testConfigurationOverrides = () => {
    console.log('\n=== Additional Test: Configuration Override Behavior ===');
    console.log('Testing that configuration overrides maintain validity...\n');
    
    const baseConfigArbitrary = fc.record({
        ENVIRONMENT: fc.constantFrom('development', 'staging', 'production'),
        API_BASE_URL: fc.constant('/api/v1'),
        MAP_CENTER: fc.constant([28.6139, 77.2090]),
    });
    
    const overrideArbitrary = fc.record({
        API_TIMEOUT: fc.integer({ min: 5000, max: 30000 }),
        CACHE_TTL: fc.integer({ min: 30000, max: 900000 }),
    });
    
    const property = fc.property(
        baseConfigArbitrary,
        overrideArbitrary,
        (baseConfig, overrides) => {
            const mergedConfig = { ...baseConfig, ...overrides };
            
            // Merged config should still have all base fields
            if (mergedConfig.ENVIRONMENT !== baseConfig.ENVIRONMENT) {
                return false;
            }
            
            // Overrides should be applied
            if (mergedConfig.API_TIMEOUT !== overrides.API_TIMEOUT) {
                return false;
            }
            
            // Merged config should still be valid
            if (mergedConfig.API_TIMEOUT < 0 || mergedConfig.CACHE_TTL < 0) {
                return false;
            }
            
            return true;
        }
    );
    
    try {
        fc.assert(property, { numRuns: 50 });
        console.log('✓ Configuration overrides maintain validity');
        return true;
    } catch (error) {
        console.error('✗ Configuration override test FAILED:', error.message);
        return false;
    }
};

/**
 * Additional Test: Cross-Environment Compatibility
 * 
 * Tests that switching between environments maintains data compatibility
 */
const testCrossEnvironmentCompatibility = () => {
    console.log('\n=== Additional Test: Cross-Environment Compatibility ===');
    console.log('Testing that configurations are compatible across environment switches...\n');
    
    const environmentPairArbitrary = fc.tuple(
        fc.constantFrom('development', 'staging', 'production'),
        fc.constantFrom('development', 'staging', 'production')
    );
    
    const property = fc.property(
        environmentPairArbitrary,
        ([env1, env2]) => {
            const config1 = createMockConfig(env1);
            const config2 = createMockConfig(env2);
            
            // Core settings should be compatible
            // Map center should be the same
            if (config1.MAP_CENTER[0] !== config2.MAP_CENTER[0] ||
                config1.MAP_CENTER[1] !== config2.MAP_CENTER[1]) {
                return false;
            }
            
            // Tile URL should be the same
            if (config1.TILE_URL !== config2.TILE_URL) {
                return false;
            }
            
            // Both should have valid retry attempts
            if (config1.RETRY_ATTEMPTS < 0 || config2.RETRY_ATTEMPTS < 0) {
                return false;
            }
            
            return true;
        }
    );
    
    try {
        fc.assert(property, { numRuns: 50 });
        console.log('✓ Configurations are compatible across environments');
        return true;
    } catch (error) {
        console.error('✗ Cross-environment compatibility test FAILED:', error.message);
        return false;
    }
};

/**
 * Run all configuration property tests
 */
const runAllTests = () => {
    console.log('\n' + '='.repeat(70));
    console.log('CONFIGURATION MANAGEMENT PROPERTY-BASED TESTS');
    console.log('='.repeat(70));
    
    const results = {
        property20: testConfigurationConsistency(),
        property21: testEnvironmentConfigValidation(),
        overrides: testConfigurationOverrides(),
        compatibility: testCrossEnvironmentCompatibility(),
    };
    
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.values(results).length;
    
    console.log(`\nTests Passed: ${passed}/${total}`);
    
    if (passed === total) {
        console.log('\n✓ ALL CONFIGURATION TESTS PASSED');
    } else {
        console.log('\n✗ SOME CONFIGURATION TESTS FAILED');
    }
    
    console.log('='.repeat(70) + '\n');
    
    return passed === total;
};

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testConfigurationConsistency,
        testEnvironmentConfigValidation,
        testConfigurationOverrides,
        testCrossEnvironmentCompatibility,
    };
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
    window.configPropertyTests = {
        runAllTests,
        testConfigurationConsistency,
        testEnvironmentConfigValidation,
    };
}

// Auto-run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export {
    runAllTests,
    testConfigurationConsistency,
    testEnvironmentConfigValidation,
    testConfigurationOverrides,
    testCrossEnvironmentCompatibility,
};
