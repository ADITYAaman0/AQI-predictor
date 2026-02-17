/**
 * Integration test script for API Client
 * Tests connection to the existing FastAPI backend
 */

import { APIClient } from '../lib/api/client';

async function testAPIClient() {
  console.log('🧪 Testing API Client Integration\n');
  console.log('='.repeat(50));

  // Create API client instance
  const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000';
  const client = new APIClient(apiBaseUrl);

  console.log(`\n📡 API Base URL: ${apiBaseUrl}\n`);

  // Test 1: Health Check
  console.log('Test 1: Health Check');
  console.log('-'.repeat(50));
  try {
    const health = await client.get('/health');
    console.log('✅ Health check passed');
    console.log('Response:', JSON.stringify(health, null, 2));
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: Root Endpoint
  console.log('\nTest 2: Root Endpoint');
  console.log('-'.repeat(50));
  try {
    const root = await client.get('/');
    console.log('✅ Root endpoint passed');
    console.log('Response:', JSON.stringify(root, null, 2));
  } catch (error: any) {
    console.error('❌ Root endpoint failed:', error.message);
  }

  // Test 3: Info Endpoint
  console.log('\nTest 3: Info Endpoint');
  console.log('-'.repeat(50));
  try {
    const info = await client.get('/info');
    console.log('✅ Info endpoint passed');
    console.log('Response:', JSON.stringify(info, null, 2));
  } catch (error: any) {
    console.error('❌ Info endpoint failed:', error.message);
  }

  // Test 4: Test Connection Method
  console.log('\nTest 4: Test Connection Method');
  console.log('-'.repeat(50));
  try {
    const isConnected = await client.testConnection();
    if (isConnected) {
      console.log('✅ Connection test passed');
    } else {
      console.log('❌ Connection test failed');
    }
  } catch (error: any) {
    console.error('❌ Connection test error:', error.message);
  }

  // Test 5: Error Handling (404)
  console.log('\nTest 5: Error Handling (404)');
  console.log('-'.repeat(50));
  try {
    await client.get('/nonexistent-endpoint');
    console.log('❌ Should have thrown an error');
  } catch (error: any) {
    console.log('✅ Error handling works correctly');
    console.log('Error message:', error.message);
    console.log('Status code:', error.statusCode);
  }

  // Test 6: Authentication Token
  console.log('\nTest 6: Authentication Token Management');
  console.log('-'.repeat(50));
  try {
    client.setAuthToken('test-token-123');
    const token = client.getAuthToken();
    if (token === 'test-token-123') {
      console.log('✅ Token set correctly');
    }

    client.clearAuthToken();
    const clearedToken = client.getAuthToken();
    if (clearedToken === null) {
      console.log('✅ Token cleared correctly');
    }
  } catch (error: any) {
    console.error('❌ Token management failed:', error.message);
  }

  // Test 7: Retry Logic (simulate with timeout)
  console.log('\nTest 7: Timeout Handling');
  console.log('-'.repeat(50));
  try {
    const shortTimeoutClient = new APIClient(apiBaseUrl, 1); // 1ms timeout
    await shortTimeoutClient.get('/api/v1/forecast/current/Delhi');
    console.log('❌ Should have timed out');
  } catch (error: any) {
    console.log('✅ Timeout handling works correctly');
    console.log('Error message:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ API Client Integration Tests Complete\n');
}

// Run tests
testAPIClient().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
