/**
 * Node.js test runner for backward compatibility property tests
 */

const { properties, runBackwardCompatibilityTests } = require('./test-backward-compatibility-properties.js');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   Backward Compatibility Property Tests                       ║');
console.log('║   Property 16: Backward Compatibility Preservation            ║');
console.log('║   Validates: Requirements 8.1, 8.2                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// Run the tests
const results = runBackwardCompatibilityTests();

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
