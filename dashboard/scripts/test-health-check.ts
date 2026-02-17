/**
 * Test script for backend API health check
 * 
 * This script verifies connectivity to the FastAPI backend and tests all required endpoints.
 * 
 * Usage:
 *   npm run test:health-check
 *   or
 *   npx tsx dashboard/scripts/test-health-check.ts
 */

import { runHealthCheck, quickHealthCheck } from '../lib/api/health-check';
import { env } from '../lib/env';

async function main() {
  console.log('🚀 Backend API Health Check Test\n');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${env.api.baseUrl}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Run quick health check first
    console.log('Running quick health check...\n');
    const isHealthy = await quickHealthCheck(env.api.baseUrl);
    
    if (!isHealthy) {
      console.error('❌ Quick health check failed!');
      console.error('The backend may be down or unreachable.');
      console.error(`Please verify that the backend is running at: ${env.api.baseUrl}`);
      process.exit(1);
    }
    
    console.log('✅ Quick health check passed!\n');
    console.log('='.repeat(60));
    console.log('');

    // Run comprehensive health check
    console.log('Running comprehensive health check...\n');
    const result = await runHealthCheck(env.api.baseUrl);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Detailed Results:');
    console.log('='.repeat(60));
    console.log('');

    // Print detailed results
    result.endpoints.forEach((endpoint) => {
      const statusIcon = endpoint.status === 'success' ? '✅' : '❌';
      const statusText = endpoint.status === 'success' ? 'SUCCESS' : 'FAILED';
      
      console.log(`${statusIcon} ${endpoint.method} ${endpoint.endpoint}`);
      console.log(`   Status: ${statusText}`);
      console.log(`   Response Time: ${endpoint.responseTime}ms`);
      
      if (endpoint.statusCode) {
        console.log(`   Status Code: ${endpoint.statusCode}`);
      }
      
      if (endpoint.error) {
        console.log(`   Error: ${endpoint.error}`);
      }
      
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('📊 Final Summary:');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${result.overallStatus.toUpperCase()}`);
    console.log(`Total Endpoints: ${result.summary.total}`);
    console.log(`Successful: ${result.summary.successful}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log(`Average Response Time: ${result.summary.averageResponseTime}ms`);
    
    if (result.backendVersion) {
      console.log(`Backend Version: ${result.backendVersion}`);
    }
    
    console.log(`Timestamp: ${result.timestamp}`);
    console.log('='.repeat(60));
    console.log('');

    // Exit with appropriate code
    if (result.overallStatus === 'healthy') {
      console.log('✅ All health checks passed! Backend is fully operational.');
      process.exit(0);
    } else if (result.overallStatus === 'degraded') {
      console.log('⚠️  Some health checks failed. Backend is partially operational.');
      process.exit(0); // Still exit with 0 for degraded state
    } else {
      console.log('❌ Multiple health checks failed. Backend may not be operational.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Health check failed with error:');
    console.error(error);
    console.error('\nPlease ensure:');
    console.error('1. The backend server is running');
    console.error(`2. The backend is accessible at: ${env.api.baseUrl}`);
    console.error('3. Environment variables are configured correctly');
    console.error('4. Network connectivity is available');
    process.exit(1);
  }
}

// Run the test
main();
