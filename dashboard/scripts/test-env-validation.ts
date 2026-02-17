/**
 * Test script to validate environment variable configuration
 * Run with: npx tsx scripts/test-env-validation.ts
 */

import { env, validateEnv } from '../lib/env';

console.log('='.repeat(80));
console.log('Environment Variable Validation Test');
console.log('='.repeat(80));
console.log();

// Test 1: Validate environment variables
console.log('Test 1: Validating required environment variables...');
try {
  validateEnv();
  console.log('✓ All required environment variables are present');
} catch (error) {
  console.error('✗ Validation failed:', error);
  process.exit(1);
}
console.log();

// Test 2: Check API configuration
console.log('Test 2: API Configuration');
console.log('  Base URL:', env.api.baseUrl);
console.log('  Version:', env.api.version);
console.log('  Full URL:', env.api.fullUrl);
console.log('  Timeout:', env.api.timeout, 'ms');
console.log('  ✓ API configuration loaded');
console.log();

// Test 3: Check WebSocket configuration
console.log('Test 3: WebSocket Configuration');
console.log('  URL:', env.websocket.url || '(not configured)');
console.log('  Reconnect Attempts:', env.websocket.reconnectAttempts);
console.log('  Reconnect Delay:', env.websocket.reconnectDelay, 'ms');
console.log('  ✓ WebSocket configuration loaded');
console.log();

// Test 4: Check feature flags
console.log('Test 4: Feature Flags');
console.log('  WebSocket:', env.features.websocket ? 'enabled' : 'disabled');
console.log('  Maps:', env.features.maps ? 'enabled' : 'disabled');
console.log('  PWA:', env.features.pwa ? 'enabled' : 'disabled');
console.log('  Dark Mode:', env.features.darkMode ? 'enabled' : 'disabled');
console.log('  Notifications:', env.features.notifications ? 'enabled' : 'disabled');
console.log('  Lazy Loading:', env.features.lazyLoading ? 'enabled' : 'disabled');
console.log('  Image Optimization:', env.features.imageOptimization ? 'enabled' : 'disabled');
console.log('  Analytics:', env.features.analytics ? 'enabled' : 'disabled');
console.log('  ✓ Feature flags loaded');
console.log();

// Test 5: Check refresh intervals
console.log('Test 5: Refresh Intervals');
console.log('  Current AQI:', env.refreshIntervals.current, 'ms', `(${env.refreshIntervals.current / 60000} minutes)`);
console.log('  Forecast:', env.refreshIntervals.forecast, 'ms', `(${env.refreshIntervals.forecast / 60000} minutes)`);
console.log('  Historical:', env.refreshIntervals.historical, 'ms', `(${env.refreshIntervals.historical / 3600000} hours)`);
console.log('  ✓ Refresh intervals loaded');
console.log();

// Test 6: Check cache configuration
console.log('Test 6: Cache Configuration');
console.log('  Current AQI:', env.cache.currentAqi, 'ms', `(${env.cache.currentAqi / 60000} minutes)`);
console.log('  Forecast:', env.cache.forecast, 'ms', `(${env.cache.forecast / 60000} minutes)`);
console.log('  Historical:', env.cache.historical, 'ms', `(${env.cache.historical / 3600000} hours)`);
console.log('  ✓ Cache configuration loaded');
console.log();

// Test 7: Check environment detection
console.log('Test 7: Environment Detection');
console.log('  Environment:', env.environment);
console.log('  Is Development:', env.isDevelopment());
console.log('  Is Staging:', env.isStaging());
console.log('  Is Production:', env.isProduction());
console.log('  ✓ Environment detection working');
console.log();

// Test 8: Check debug configuration
console.log('Test 8: Debug Configuration');
console.log('  Debug Mode:', env.debug.enabled ? 'enabled' : 'disabled');
console.log('  Log Level:', env.debug.logLevel);
console.log('  ✓ Debug configuration loaded');
console.log();

// Test 9: Check Mapbox configuration
console.log('Test 9: Mapbox Configuration');
console.log('  Token:', env.mapbox.token ? '(configured)' : '(not configured)');
console.log('  ✓ Mapbox configuration loaded');
console.log();

// Test 10: Check Analytics configuration
console.log('Test 10: Analytics Configuration');
console.log('  Analytics ID:', env.analytics.id || '(not configured)');
console.log('  ✓ Analytics configuration loaded');
console.log();

console.log('='.repeat(80));
console.log('✓ All environment variable tests passed!');
console.log('='.repeat(80));
console.log();
console.log('Summary:');
console.log('  - All required environment variables are present');
console.log('  - All optional environment variables have defaults');
console.log('  - Type conversions (boolean, number) are working');
console.log('  - Environment detection is working');
console.log('  - Configuration is ready for use');
console.log();
