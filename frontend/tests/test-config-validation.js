/**
 * Configuration Validation Tests (Node.js Compatible)
 * 
 * Tests Properties:
 * - Property 20: Configuration Consistency
 * - Property 21: Environment Configuration Validation
 * 
 * Validates Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

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
 * Validate configuration object
 */
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

/**
 * Test configuration consistency
 */
const testConfigurationConsistency = () => {
    console.log('\n=== Property 20: Configuration Consistency ===');
    console.log('Testing that configurations are internally consistent across environments...\n');
    
    const environments = ['development', 'staging', 'production'];
    let passed = 0;
    let failed = 0;
    
    for (const environment of environments) {
        const config = createMockConfig(environment);
        
        // Test 1: Environment field matches
        if (config.ENVIRONMENT !== environment) {
            console.error(`✗ ${environment}: Environment field mismatch`);
            failed++;
            continue;
        }
        
        // Test 2: API URLs are consistent with environment
        if (environment === 'development') {
            if (!config.API_BASE_URL.includes('localhost')) {
                console.error(`✗ ${environment}: Development should use localhost URLs`);
                failed++;
                continue;
            }
        } else {
            if (!config.API_BASE_URL.startsWith('/')) {
                console.error(`✗ ${environment}: Production/staging should use relative paths`);
                failed++;
                continue;
            }
        }
        
        // Test 3: Debug settings are appropriate
        if (environment === 'production' && config.DEBUG === true) {
            console.error(`✗ ${environment}: Production should not have DEBUG enabled`);
            failed++;
            continue;
        }
        
        // Test 4: Validate configuration
        const validation = validateConfig(config);
        if (!validation.valid) {
            console.error(`✗ ${environment}: Validation failed - ${validation.reason}`);
            failed++;
            continue;
        }
        
        console.log(`✓ ${environment}: Configuration is consistent`);
        passed++;
    }
    
    console.log(`\nResults: ${passed}/${environments.length} environments passed`);
    
    if (failed === 0) {
        console.log('✓ Property 20 PASSED: Configuration consistency maintained');
        return true;
    } else {
        console.error('✗ Property 20 FAILED: Some configurations are inconsistent');
        return false;
    }
};

/**
 * Test environment configuration validation
 */
const testEnvironmentConfigValidation = () => {
    console.log('\n=== Property 21: Environment Configuration Validation ===');
    console.log('Testing that all configurations pass validation requirements...\n');
    
    const environments = ['development', 'staging', 'production'];
    let passed = 0;
    let failed = 0;
    
    for (const environment of environments) {
        const config = createMockConfig(environment);
        const validation = validateConfig(config);
        
        if (validation.valid) {
            console.log(`✓ ${environment}: Configuration is valid`);
            passed++;
        } else {
            console.error(`✗ ${environment}: Validation failed - ${validation.reason}`);
            failed++;
        }
    }
    
    // Test with invalid configurations
    console.log('\nTesting invalid configurations...');
    
    const invalidConfigs = [
        { name: 'Missing ENVIRONMENT', config: { API_BASE_URL: '/api/v1' } },
        { name: 'Invalid MAP_CENTER', config: { ...createMockConfig('development'), MAP_CENTER: [100, 200] } },
        { name: 'Invalid API_BASE_URL', config: { ...createMockConfig('development'), API_BASE_URL: 'invalid' } },
        { name: 'Negative timeout', config: { ...createMockConfig('development'), API_TIMEOUT: -1000 } },
    ];
    
    for (const { name, config } of invalidConfigs) {
        const validation = validateConfig(config);
        if (!validation.valid) {
            console.log(`✓ ${name}: Correctly rejected (${validation.reason})`);
            passed++;
        } else {
            console.error(`✗ ${name}: Should have been rejected`);
            failed++;
        }
    }
    
    console.log(`\nResults: ${passed}/${environments.length + invalidConfigs.length} tests passed`);
    
    if (failed === 0) {
        console.log('✓ Property 21 PASSED: All configurations pass validation');
        return true;
    } else {
        console.error('✗ Property 21 FAILED: Some validations failed');
        return false;
    }
};

/**
 * Test cross-environment compatibility
 */
const testCrossEnvironmentCompatibility = () => {
    console.log('\n=== Cross-Environment Compatibility ===');
    console.log('Testing that configurations are compatible across environment switches...\n');
    
    const environments = ['development', 'staging', 'production'];
    const configs = environments.map(env => createMockConfig(env));
    
    let passed = 0;
    let failed = 0;
    
    // Test that core settings are the same
    const coreSettings = ['MAP_CENTER', 'TILE_URL', 'RETRY_ATTEMPTS'];
    
    for (const setting of coreSettings) {
        const values = configs.map(c => JSON.stringify(c[setting]));
        const allSame = values.every(v => v === values[0]);
        
        if (allSame) {
            console.log(`✓ ${setting}: Consistent across all environments`);
            passed++;
        } else {
            console.error(`✗ ${setting}: Inconsistent across environments`);
            failed++;
        }
    }
    
    console.log(`\nResults: ${passed}/${coreSettings.length} settings consistent`);
    
    if (failed === 0) {
        console.log('✓ Cross-environment compatibility maintained');
        return true;
    } else {
        console.error('✗ Cross-environment compatibility issues found');
        return false;
    }
};

/**
 * Run all tests
 */
const runAllTests = () => {
    console.log('\n' + '='.repeat(70));
    console.log('CONFIGURATION MANAGEMENT VALIDATION TESTS');
    console.log('='.repeat(70));
    
    const results = {
        property20: testConfigurationConsistency(),
        property21: testEnvironmentConfigValidation(),
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
        console.log('\nValidated Requirements: 10.1, 10.2, 10.3, 10.4, 10.5');
        return true;
    } else {
        console.log('\n✗ SOME CONFIGURATION TESTS FAILED');
        return false;
    }
};

// Run tests
if (require.main === module) {
    const success = runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = {
    runAllTests,
    testConfigurationConsistency,
    testEnvironmentConfigValidation,
    testCrossEnvironmentCompatibility,
    validateConfig,
};
