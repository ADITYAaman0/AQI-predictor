/**
 * Test Runner for Performance Property Tests
 * Executes Property 4: Performance Requirements tests
 */

import { runPerformanceTests } from './test-performance-properties.js';

// Run the tests
console.log('Starting Performance Property Tests...\n');

runPerformanceTests()
    .then(success => {
        if (success) {
            console.log('\n✅ All performance tests passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Some performance tests failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });
