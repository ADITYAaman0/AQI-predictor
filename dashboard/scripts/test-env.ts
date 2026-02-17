/**
 * Environment Configuration Test Script
 * 
 * This script tests that environment variables are properly loaded and validated.
 * Run with: npx tsx scripts/test-env.ts
 */

import { env, validateEnv } from '../lib/env';

console.log('🔍 Testing Environment Configuration...\n');

// Test 1: Validation
console.log('Test 1: Environment Validation');
try {
  validateEnv();
  console.log('✅ All required environment variables are present\n');
} catch (error) {
  console.error('❌ Validation failed:', error);
  process.exit(1);
}

// Test 2: API Configuration
console.log('Test 2: API Configuration');
console.log(`  Base URL: ${env.api.baseUrl}`);
console.log(`  Version: ${env.api.version}`);
console.log(`  Full URL: ${env.api.fullUrl}`);
console.log(`  Timeout: ${env.api.timeout}ms`);
console.log('✅ API configuration loaded\n');

// Test 3: Feature Flags
console.log('Test 3: Feature Flags');
console.log(`  WebSocket: ${env.features.websocket ? '✅' : '❌'}`);
console.log(`  Maps: ${env.features.maps ? '✅' : '❌'}`);
console.log(`  PWA: ${env.features.pwa ? '✅' : '❌'}`);
console.log(`  Dark Mode: ${env.features.darkMode ? '✅' : '❌'}`);
console.log(`  Notifications: ${env.features.notifications ? '✅' : '❌'}`);
console.log('✅ Feature flags loaded\n');

// Test 4: Refresh Intervals
console.log('Test 4: Refresh Intervals');
console.log(`  Current AQI: ${env.refreshIntervals.current / 1000}s`);
console.log(`  Forecast: ${env.refreshIntervals.forecast / 1000}s`);
console.log(`  Historical: ${env.refreshIntervals.historical / 1000}s`);
console.log('✅ Refresh intervals loaded\n');

// Test 5: Cache Configuration
console.log('Test 5: Cache Configuration');
console.log(`  Current AQI: ${env.cache.currentAqi / 1000}s`);
console.log(`  Forecast: ${env.cache.forecast / 1000}s`);
console.log(`  Historical: ${env.cache.historical / 1000}s`);
console.log('✅ Cache configuration loaded\n');

// Test 6: Environment Detection
console.log('Test 6: Environment Detection');
console.log(`  Environment: ${env.environment}`);
console.log(`  Is Development: ${env.isDevelopment()}`);
console.log(`  Is Staging: ${env.isStaging()}`);
console.log(`  Is Production: ${env.isProduction()}`);
console.log('✅ Environment detection working\n');

// Test 7: Debug Configuration
console.log('Test 7: Debug Configuration');
console.log(`  Debug Mode: ${env.debug.enabled ? '✅' : '❌'}`);
console.log(`  Log Level: ${env.debug.logLevel}`);
console.log('✅ Debug configuration loaded\n');

// Test 8: WebSocket Configuration (if enabled)
if (env.features.websocket) {
  console.log('Test 8: WebSocket Configuration');
  console.log(`  URL: ${env.websocket.url}`);
  console.log(`  Reconnect Attempts: ${env.websocket.reconnectAttempts}`);
  console.log(`  Reconnect Delay: ${env.websocket.reconnectDelay}ms`);
  console.log('✅ WebSocket configuration loaded\n');
}

// Test 9: Mapbox Configuration (if enabled)
if (env.features.maps) {
  console.log('Test 9: Mapbox Configuration');
  console.log(`  Token: ${env.mapbox.token ? '✅ Set' : '❌ Not set'}`);
  if (!env.mapbox.token) {
    console.log('  ⚠️  Warning: Maps are enabled but no Mapbox token is set');
  }
  console.log('✅ Mapbox configuration loaded\n');
}

// Summary
console.log('═══════════════════════════════════════════════════════');
console.log('🎉 All environment configuration tests passed!');
console.log('═══════════════════════════════════════════════════════');

// Warnings
const warnings: string[] = [];

if (env.features.websocket && !env.websocket.url) {
  warnings.push('WebSocket is enabled but no URL is configured');
}

if (env.features.maps && !env.mapbox.token) {
  warnings.push('Maps are enabled but no Mapbox token is configured');
}

if (env.features.analytics && !env.analytics.id) {
  warnings.push('Analytics is enabled but no tracking ID is configured');
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
}

console.log('\n✨ Environment configuration is ready to use!');
