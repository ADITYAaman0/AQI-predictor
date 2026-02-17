/**
 * Standalone Test Runner for Filtering Property Tests
 * Run this file with Node.js to execute filtering property-based tests
 */

import { runFilteringTests } from './test-filtering-properties.js';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Filtering Functionality Property-Based Test Runner      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Run the tests
runFilteringTests()
    .then(success => {
        if (success) {
            console.log('\n✅ All filtering property tests passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Some filtering property tests failed.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test runner encountered an error:');
        console.error(error);
        process.exit(1);
    });
