/**
 * Test Runner for Mobile Responsiveness Property Tests
 */

import MobileResponsivenessTests from './test-mobile-responsiveness-properties.js';

console.log('Starting Mobile Responsiveness Property Tests...\n');

try {
    const testResults = MobileResponsivenessTests.runAll();
    
    // Exit with appropriate code
    if (testResults.summary.allSuccess) {
        console.log('\n✓ All mobile responsiveness property tests passed!');
        process.exit(0);
    } else {
        console.log('\n✗ Some mobile responsiveness property tests failed.');
        process.exit(1);
    }
} catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
}
