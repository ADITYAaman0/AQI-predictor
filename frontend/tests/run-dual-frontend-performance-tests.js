/**
 * Node.js test runner for dual frontend performance property tests
 */

const { properties, runDualFrontendPerformanceTests } = require('./test-dual-frontend-performance-properties.js');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   Dual Frontend Performance Property Tests                     ║');
console.log('║   Property 17: Dual Frontend Performance                       ║');
console.log('║   Validates: Requirement 8.3                                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// Run the tests
const results = runDualFrontendPerformanceTests();

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
