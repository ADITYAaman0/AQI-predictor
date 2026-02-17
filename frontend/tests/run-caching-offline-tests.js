/**
 * Test Runner for Caching and Offline Property Tests
 * Executes Properties 5, 6, 13, and 18 tests
 */

import { runCachingOfflineTests } from './test-caching-offline-properties.js';

// Run the tests
console.log('Starting Caching and Offline Property Tests...\n');

runCachingOfflineTests()
    .then(success => {
        if (success) {
            console.log('\n✅ All caching and offline tests passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Some caching and offline tests failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });
