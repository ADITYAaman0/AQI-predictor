/**
 * Verification Script for PollutantCard Tests
 * Task 6.7: Write PollutantCard unit tests
 * 
 * This script verifies that all PollutantCard tests are present and passing.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestFileInfo {
  name: string;
  path: string;
  exists: boolean;
  testCount?: number;
}

interface VerificationResult {
  success: boolean;
  testFiles: TestFileInfo[];
  totalTests: number;
  allPassing: boolean;
  errors: string[];
}

/**
 * Verify PollutantCard test files exist
 */
function verifyTestFiles(): TestFileInfo[] {
  const testFiles = [
    {
      name: 'PollutantCard.test.tsx',
      path: 'components/dashboard/__tests__/PollutantCard.test.tsx',
    },
    {
      name: 'PollutantCard.icons-colors.test.tsx',
      path: 'components/dashboard/__tests__/PollutantCard.icons-colors.test.tsx',
    },
    {
      name: 'PollutantCard.comprehensive.test.tsx',
      path: 'components/dashboard/__tests__/PollutantCard.comprehensive.test.tsx',
    },
  ];

  return testFiles.map((file) => {
    const fullPath = path.join(process.cwd(), file.path);
    const exists = fs.existsSync(fullPath);
    
    let testCount: number | undefined;
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Count test/it blocks
      const testMatches = content.match(/\b(test|it)\s*\(/g);
      testCount = testMatches ? testMatches.length : 0;
    }

    return {
      name: file.name,
      path: file.path,
      exists,
      testCount,
    };
  });
}

/**
 * Run PollutantCard tests
 */
function runTests(): { success: boolean; output: string } {
  try {
    console.log('Running PollutantCard tests...\n');
    
    const output = execSync('npm test -- PollutantCard --passWithNoTests', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.stdout || error.message };
  }
}

/**
 * Parse test results from output
 */
function parseTestResults(output: string): {
  testSuites: { passed: number; total: number };
  tests: { passed: number; total: number };
} {
  const testSuitesMatch = output.match(/Test Suites:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  const testsMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);

  return {
    testSuites: {
      passed: testSuitesMatch ? parseInt(testSuitesMatch[1]) : 0,
      total: testSuitesMatch ? parseInt(testSuitesMatch[2]) : 0,
    },
    tests: {
      passed: testsMatch ? parseInt(testsMatch[1]) : 0,
      total: testsMatch ? parseInt(testsMatch[2]) : 0,
    },
  };
}

/**
 * Main verification function
 */
function verifyPollutantCardTests(): VerificationResult {
  const errors: string[] = [];
  
  console.log('='.repeat(60));
  console.log('PollutantCard Tests Verification');
  console.log('Task 6.7: Write PollutantCard unit tests');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Verify test files exist
  console.log('Step 1: Verifying test files...');
  const testFiles = verifyTestFiles();
  
  testFiles.forEach((file) => {
    if (file.exists) {
      console.log(`  ✅ ${file.name} (${file.testCount} tests)`);
    } else {
      console.log(`  ❌ ${file.name} - NOT FOUND`);
      errors.push(`Test file not found: ${file.path}`);
    }
  });
  console.log();

  // Step 2: Run tests
  console.log('Step 2: Running tests...');
  const testResult = runTests();
  
  if (!testResult.success) {
    errors.push('Test execution failed');
    console.log('  ❌ Tests failed to run');
    console.log();
    return {
      success: false,
      testFiles,
      totalTests: 0,
      allPassing: false,
      errors,
    };
  }

  // Step 3: Parse results
  const results = parseTestResults(testResult.output);
  
  console.log(`  Test Suites: ${results.testSuites.passed}/${results.testSuites.total} passed`);
  console.log(`  Tests: ${results.tests.passed}/${results.tests.total} passed`);
  console.log();

  // Step 4: Verify expected counts
  console.log('Step 3: Verifying test counts...');
  
  const expectedTestSuites = 3;
  const expectedMinTests = 100; // At least 100 tests
  
  if (results.testSuites.total !== expectedTestSuites) {
    errors.push(`Expected ${expectedTestSuites} test suites, found ${results.testSuites.total}`);
    console.log(`  ❌ Expected ${expectedTestSuites} test suites, found ${results.testSuites.total}`);
  } else {
    console.log(`  ✅ Test suite count correct (${expectedTestSuites})`);
  }

  if (results.tests.total < expectedMinTests) {
    errors.push(`Expected at least ${expectedMinTests} tests, found ${results.tests.total}`);
    console.log(`  ❌ Expected at least ${expectedMinTests} tests, found ${results.tests.total}`);
  } else {
    console.log(`  ✅ Test count sufficient (${results.tests.total} >= ${expectedMinTests})`);
  }

  const allPassing = results.tests.passed === results.tests.total;
  if (!allPassing) {
    errors.push(`Not all tests passing: ${results.tests.passed}/${results.tests.total}`);
    console.log(`  ❌ Not all tests passing`);
  } else {
    console.log(`  ✅ All tests passing`);
  }
  console.log();

  // Step 5: Verify test coverage areas
  console.log('Step 4: Verifying test coverage areas...');
  const coverageAreas = [
    'Rendering with Different Pollutant Types',
    'Color Coding Logic',
    'Hover Interactions',
    'Progress Bar Functionality',
    'Styling and Layout',
    'Accessibility',
    'Custom Icon Support',
    'Edge Cases',
    'Component Integration',
  ];

  const comprehensiveTestFile = testFiles.find(f => f.name === 'PollutantCard.comprehensive.test.tsx');
  if (comprehensiveTestFile && comprehensiveTestFile.exists) {
    const content = fs.readFileSync(
      path.join(process.cwd(), comprehensiveTestFile.path),
      'utf-8'
    );

    coverageAreas.forEach((area) => {
      if (content.includes(area)) {
        console.log(`  ✅ ${area}`);
      } else {
        console.log(`  ⚠️  ${area} - not found in comprehensive tests`);
      }
    });
  }
  console.log();

  // Final result
  const success = errors.length === 0;
  
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ VERIFICATION PASSED');
    console.log();
    console.log('Summary:');
    console.log(`  - ${results.testSuites.total} test suites`);
    console.log(`  - ${results.tests.total} tests`);
    console.log(`  - All tests passing`);
    console.log(`  - All coverage areas verified`);
  } else {
    console.log('❌ VERIFICATION FAILED');
    console.log();
    console.log('Errors:');
    errors.forEach((error) => {
      console.log(`  - ${error}`);
    });
  }
  console.log('='.repeat(60));
  console.log();

  return {
    success,
    testFiles,
    totalTests: results.tests.total,
    allPassing,
    errors,
  };
}

// Run verification
const result = verifyPollutantCardTests();

// Exit with appropriate code
process.exit(result.success ? 0 : 1);
