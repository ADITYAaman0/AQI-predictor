/**
 * Test script to validate environment variable configuration
 * This version loads .env files using dotenv
 * Run with: npx tsx scripts/test-env-with-dotenv.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
const envPath = resolve(__dirname, '..', '.env.local');
console.log('Loading environment from:', envPath);
config({ path: envPath });

console.log('='.repeat(80));
console.log('Environment Variable Validation Test');
console.log('='.repeat(80));
console.log();

// Test 1: Check if environment variables are loaded
console.log('Test 1: Checking environment variables...');
const requiredVars = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_API_VERSION',
  'NEXT_PUBLIC_ENVIRONMENT',
];

let allPresent = true;
for (const varName of requiredVars) {
  if (process.env[varName]) {
    console.log(`  ✓ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`  ✗ ${varName}: NOT SET`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.error('\n✗ Some required environment variables are missing!');
  process.exit(1);
}

console.log('  ✓ All required environment variables are present');
console.log();

// Test 2: Check optional variables
console.log('Test 2: Checking optional environment variables...');
const optionalVars = [
  'NEXT_PUBLIC_API_TIMEOUT',
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_ENABLE_WEBSOCKET',
  'NEXT_PUBLIC_ENABLE_MAPS',
  'NEXT_PUBLIC_ENABLE_PWA',
  'NEXT_PUBLIC_MAPBOX_TOKEN',
];

for (const varName of optionalVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✓ ${varName}: ${value}`);
  } else {
    console.log(`  - ${varName}: (using default)`);
  }
}
console.log();

// Test 3: Validate API URL format
console.log('Test 3: Validating API URL format...');
const apiUrl = process.env['NEXT_PUBLIC_API_BASE_URL'];
if (apiUrl) {
  try {
    new URL(apiUrl);
    console.log(`  ✓ API URL is valid: ${apiUrl}`);
  } catch (error) {
    console.error(`  ✗ API URL is invalid: ${apiUrl}`);
    process.exit(1);
  }
}
console.log();

// Test 4: Check environment value
console.log('Test 4: Checking environment value...');
const environment = process.env['NEXT_PUBLIC_ENVIRONMENT'];
const validEnvironments = ['local', 'development', 'staging', 'production'];
if (validEnvironments.includes(environment || '')) {
  console.log(`  ✓ Environment is valid: ${environment}`);
} else {
  console.error(`  ✗ Environment is invalid: ${environment}`);
  console.error(`     Valid values: ${validEnvironments.join(', ')}`);
  process.exit(1);
}
console.log();

// Test 5: Check boolean values
console.log('Test 5: Checking boolean values...');
const booleanVars = [
  'NEXT_PUBLIC_ENABLE_WEBSOCKET',
  'NEXT_PUBLIC_ENABLE_MAPS',
  'NEXT_PUBLIC_ENABLE_PWA',
  'NEXT_PUBLIC_ENABLE_DARK_MODE',
  'NEXT_PUBLIC_ENABLE_NOTIFICATIONS',
];

for (const varName of booleanVars) {
  const value = process.env[varName];
  if (value === 'true' || value === 'false' || !value) {
    console.log(`  ✓ ${varName}: ${value || '(default)'}`);
  } else {
    console.error(`  ✗ ${varName}: Invalid boolean value: ${value}`);
    process.exit(1);
  }
}
console.log();

// Test 6: Check numeric values
console.log('Test 6: Checking numeric values...');
const numericVars = [
  'NEXT_PUBLIC_API_TIMEOUT',
  'NEXT_PUBLIC_REFRESH_INTERVAL_CURRENT',
  'NEXT_PUBLIC_CACHE_CURRENT_AQI',
];

for (const varName of numericVars) {
  const value = process.env[varName];
  if (value) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      console.log(`  ✓ ${varName}: ${value}`);
    } else {
      console.error(`  ✗ ${varName}: Invalid numeric value: ${value}`);
      process.exit(1);
    }
  } else {
    console.log(`  - ${varName}: (using default)`);
  }
}
console.log();

console.log('='.repeat(80));
console.log('✓ All environment variable tests passed!');
console.log('='.repeat(80));
console.log();
console.log('Summary:');
console.log('  - All required environment variables are present and valid');
console.log('  - Optional environment variables are properly formatted');
console.log('  - API URL is valid');
console.log('  - Environment value is valid');
console.log('  - Boolean values are valid');
console.log('  - Numeric values are valid');
console.log();
console.log('✨ Environment configuration is ready to use!');
console.log();
