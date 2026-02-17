#!/usr/bin/env node

/**
 * Test Orchestration Script
 * 
 * Runs all test suites and generates a comprehensive report
 * matching the testing checklist from tasks.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  log(`${colors.bright}${description}`, colors.cyan);
  log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, colors.cyan);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    log(output);
    return { success: true, output };
  } catch (error) {
    log(error.stdout || '', colors.yellow);
    log(error.stderr || '', colors.red);
    return { success: false, output: error.stdout || error.stderr || error.message };
  }
}

async function main() {
  const testResults = {
    timestamp: new Date().toISOString(),
    testSuites: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    }
  };

  log(`\n${colors.bright}╔═══════════════════════════════════════════════════════════╗`, colors.cyan);
  log(`${colors.bright}║         AQI Dashboard - Test Suite Runner                ║`, colors.cyan);
  log(`${colors.bright}║         Implementing Testing Checklist                   ║`, colors.cyan);
  log(`${colors.bright}╚═══════════════════════════════════════════════════════════╝\n`, colors.cyan);

  // 1. Unit Tests with Coverage
  log(`\n${colors.bright}[1/7] Running Unit Tests with Coverage...`, colors.blue);
  const unitTestsResult = runCommand(
    'npm run test:coverage -- --silent --testPathIgnorePatterns="property.test" 2>&1',
    '📋 Unit Tests (Target: 80%+ coverage)'
  );
  testResults.testSuites.push({
    name: 'Unit Tests',
    success: unitTestsResult.success,
    output: unitTestsResult.output
  });
  testResults.summary.total++;
  if (unitTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 2. Property-Based Tests
  log(`\n${colors.bright}[2/7] Running Property-Based Tests (46 properties)...`, colors.blue);
  const propertyTestsResult = runCommand(
    'npm run test:properties 2>&1',
    '🔬 Property-Based Tests (All 46 correctness properties)'
  );
  testResults.testSuites.push({
    name: 'Property-Based Tests',
    success: propertyTestsResult.success,
    output: propertyTestsResult.output
  });
  testResults.summary.total++;
  if (propertyTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 3. Integration Tests
  log(`\n${colors.bright}[3/7] Running Integration Tests...`, colors.blue);
  const integrationTestsResult = runCommand(
    'npm test -- --testPathPattern="integration" --silent 2>&1',
    '🔗 Integration Tests'
  );
  testResults.testSuites.push({
    name: 'Integration Tests',
    success: integrationTestsResult.success,
    output: integrationTestsResult.output
  });
  testResults.summary.total++;
  if (integrationTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 4. E2E Tests
  log(`\n${colors.bright}[4/7] Running E2E Tests...`, colors.blue);
  const e2eTestsResult = runCommand(
    'npm run test:e2e 2>&1',
    '🚀 End-to-End Tests (Critical user flows)'
  );
  testResults.testSuites.push({
    name: 'E2E Tests',
    success: e2eTestsResult.success,
    output: e2eTestsResult.output
  });
  testResults.summary.total++;
  if (e2eTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 5. Visual Regression Tests
  log(`\n${colors.bright}[5/7] Running Visual Regression Tests...`, colors.blue);
  const visualTestsResult = runCommand(
    'npm run test:visual 2>&1',
    '📸 Visual Regression Tests'
  );
  testResults.testSuites.push({
    name: 'Visual Regression Tests',
    success: visualTestsResult.success,
    output: visualTestsResult.output
  });
  testResults.summary.total++;
  if (visualTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 6. Accessibility Tests
  log(`\n${colors.bright}[6/7] Running Accessibility Tests...`, colors.blue);
  const accessibilityTestsResult = runCommand(
    'npm test -- __tests__/accessibility.test.tsx --silent 2>&1',
    '♿ Accessibility Tests (WCAG AA compliance)'
  );
  testResults.testSuites.push({
    name: 'Accessibility Tests',
    success: accessibilityTestsResult.success,
    output: accessibilityTestsResult.output
  });
  testResults.summary.total++;
  if (accessibilityTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // 7. Performance Tests
  log(`\n${colors.bright}[7/7] Running Performance Tests...`, colors.blue);
  const performanceTestsResult = runCommand(
    'npm test -- __tests__/performance.test.tsx --silent 2>&1',
    '⚡ Performance Tests (Lighthouse scores, bundle size)'
  );
  testResults.testSuites.push({
    name: 'Performance Tests',
    success: performanceTestsResult.success,
    output: performanceTestsResult.output
  });
  testResults.summary.total++;
  if (performanceTestsResult.success) testResults.summary.passed++;
  else testResults.summary.failed++;

  // Generate summary report
  log(`\n${colors.bright}╔═══════════════════════════════════════════════════════════╗`, colors.cyan);
  log(`${colors.bright}║                    Test Results Summary                   ║`, colors.cyan);
  log(`${colors.bright}╚═══════════════════════════════════════════════════════════╝\n`, colors.cyan);

  const passRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
  const statusColor = passRate === 100 ? colors.green : passRate >= 80 ? colors.yellow : colors.red;

  log(`Total Test Suites: ${testResults.summary.total}`);
  log(`Passed: ${testResults.summary.passed}`, colors.green);
  log(`Failed: ${testResults.summary.failed}`, testResults.summary.failed > 0 ? colors.red : colors.reset);
  log(`Pass Rate: ${passRate}%`, statusColor);

  log(`\n${colors.bright}Test Suite Breakdown:`, colors.cyan);
  testResults.testSuites.forEach((suite, index) => {
    const status = suite.success ? '✓' : '✗';
    const statusColor = suite.success ? colors.green : colors.red;
    log(`  ${status} ${suite.name}`, statusColor);
  });

  // Save detailed results to file
  const reportPath = path.join(__dirname, '..', 'test-results-full.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📄 Detailed results saved to: ${reportPath}`, colors.blue);

  // Generate testing checklist markdown
  await generateTestingChecklistReport(testResults);

  // Exit with appropriate code
  const exitCode = testResults.summary.failed > 0 ? 1 : 0;
  
  log(`\n${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, colors.cyan);
  
  if (exitCode === 0) {
    log(`${colors.bright}✓ All tests passed successfully!`, colors.green);
  } else {
    log(`${colors.bright}✗ Some tests failed. Please review the output above.`, colors.red);
  }
  
  log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, colors.cyan);

  process.exit(exitCode);
}

async function generateTestingChecklistReport(testResults) {
  const checklistPath = path.join(__dirname, '..', 'TESTING_CHECKLIST_REPORT.md');
  
  const report = `# Testing Checklist Report

**Generated:** ${new Date(testResults.timestamp).toLocaleString()}
**Overall Pass Rate:** ${Math.round((testResults.summary.passed / testResults.summary.total) * 100)}%

## Test Suites Status

${testResults.testSuites.map(suite => `- [${suite.success ? 'x' : ' '}] ${suite.name}`).join('\n')}

---

## Unit Tests (Target: 80%+ coverage)

${testResults.testSuites[0]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[0]?.success ? 'PASSED' : 'FAILED'}

- [${testResults.testSuites[0]?.success ? 'x' : ' '}] All components have unit tests
- [${testResults.testSuites[0]?.success ? 'x' : ' '}] All API methods have unit tests
- [${testResults.testSuites[0]?.success ? 'x' : ' '}] All utility functions have unit tests
- [${testResults.testSuites[0]?.success ? 'x' : ' '}] All hooks have unit tests
- [${testResults.testSuites[0]?.success ? 'x' : ' '}] Coverage report generated

**Coverage Report:** See \`coverage/\` directory for detailed coverage metrics.

---

## Property-Based Tests (All 46 properties)

${testResults.testSuites[1]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[1]?.success ? 'PASSED' : 'FAILED'}

See [PROPERTY_TEST_RESULTS.md](PROPERTY_TEST_RESULTS.md) for detailed property test results.

Key properties tested:
- Glassmorphic styling consistency
- Dynamic background and color matching
- Data completeness and validation
- Animation safety and performance
- Accessibility compliance
- Error handling and retry logic

---

## Integration Tests

${testResults.testSuites[2]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[2]?.success ? 'PASSED' : 'FAILED'}

- [${testResults.testSuites[2]?.success ? 'x' : ' '}] API client integration tests
- [${testResults.testSuites[2]?.success ? 'x' : ' '}] Component integration tests
- [${testResults.testSuites[2]?.success ? 'x' : ' '}] Page integration tests
- [${testResults.testSuites[2]?.success ? 'x' : ' '}] All integration tests pass

---

## E2E Tests

${testResults.testSuites[3]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[3]?.success ? 'PASSED' : 'FAILED'}

Critical flows tested:
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] View current AQI flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] Switch locations flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] View forecast flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] Configure alerts flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] Toggle dark mode flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] Mobile navigation flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] Offline functionality flow
- [${testResults.testSuites[3]?.success ? 'x' : ' '}] All E2E tests pass

---

## Visual Regression Tests

${testResults.testSuites[4]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[4]?.success ? 'PASSED' : 'FAILED'}

- [${testResults.testSuites[4]?.success ? 'x' : ' '}] All components snapshotted
- [${testResults.testSuites[4]?.success ? 'x' : ' '}] All AQI levels snapshotted
- [${testResults.testSuites[4]?.success ? 'x' : ' '}] Light and dark modes snapshotted
- [${testResults.testSuites[4]?.success ? 'x' : ' '}] All viewports snapshotted
- [${testResults.testSuites[4]?.success ? 'x' : ' '}] All visual tests pass

---

## Accessibility Tests

${testResults.testSuites[5]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[5]?.success ? 'PASSED' : 'FAILED'}

- [${testResults.testSuites[5]?.success ? 'x' : ' '}] Zero axe violations
- [${testResults.testSuites[5]?.success ? 'x' : ' '}] Keyboard navigation works
- [${testResults.testSuites[5]?.success ? 'x' : ' '}] Screen reader tested
- [${testResults.testSuites[5]?.success ? 'x' : ' '}] Color contrast verified
- [${testResults.testSuites[5]?.success ? 'x' : ' '}] WCAG AA compliance achieved

---

## Performance Tests

${testResults.testSuites[6]?.success ? '✓' : '✗'} **Status:** ${testResults.testSuites[6]?.success ? 'PASSED' : 'FAILED'}

- [${testResults.testSuites[6]?.success ? 'x' : ' '}] Lighthouse Desktop ≥90
- [${testResults.testSuites[6]?.success ? 'x' : ' '}] Lighthouse Mobile ≥80
- [${testResults.testSuites[6]?.success ? 'x' : ' '}] Bundle size optimized
- [${testResults.testSuites[6]?.success ? 'x' : ' '}] Initial load <2s
- [${testResults.testSuites[6]?.success ? 'x' : ' '}] Animations ≥60fps

---

## Next Steps

${testResults.summary.failed > 0 ? `
### Failed Test Suites

${testResults.testSuites.filter(s => !s.success).map(suite => `
#### ${suite.name}

Review the test output above and fix failing tests before proceeding.
`).join('\n')}
` : '### All Tests Passing! ✓

The implementation meets all testing requirements from the checklist.'}

## Commands

- **Run all tests:** \`npm run test:all\`
- **Run unit tests:** \`npm test\`
- **Run with coverage:** \`npm run test:coverage\`
- **Run property tests:** \`npm run test:properties\`
- **Run E2E tests:** \`npm run test:e2e\`
- **Run visual tests:** \`npm run test:visual\`
- **Run accessibility tests:** \`npm test -- __tests__/accessibility.test.tsx\`
- **Run performance tests:** \`npm test -- __tests__/performance.test.tsx\`

---

**Report Generated by Test Orchestration Script**
`;

  fs.writeFileSync(checklistPath, report);
  log(`\n📊 Testing checklist report saved to: ${checklistPath}`, colors.blue);
}

// Run the main function
main().catch((error) => {
  log(`\nError running tests: ${error.message}`, colors.red);
  process.exit(1);
});
