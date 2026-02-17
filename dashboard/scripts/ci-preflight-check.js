#!/usr/bin/env node

/**
 * CI/CD Pre-flight Check Script
 * 
 * Runs all CI checks locally before pushing to verify everything will pass in CI
 * Implements Task 29 - CI/CD Pipeline
 * 
 * Usage: node scripts/ci-preflight-check.js
 * 
 * This script runs the same checks that GitHub Actions will run:
 * 1. ESLint (code quality)
 * 2. TypeScript type checking
 * 3. Unit tests with coverage
 * 4. Property-based tests
 * 5. Build verification
 * 6. E2E tests (optional)
 * 7. Visual regression tests (optional)
 * 8. Lighthouse audit (optional)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${color}${text}${COLORS.reset}`;
}

function printHeader(text) {
  console.log('\n' + colorize('═'.repeat(60), COLORS.cyan));
  console.log(colorize(`  ${text}`, COLORS.bright));
  console.log(colorize('═'.repeat(60), COLORS.cyan) + '\n');
}

function printSuccess(text) {
  console.log(colorize(`✓ ${text}`, COLORS.green));
}

function printError(text) {
  console.log(colorize(`✗ ${text}`, COLORS.red));
}

function printWarning(text) {
  console.log(colorize(`⚠ ${text}`, COLORS.yellow));
}

function printInfo(text) {
  console.log(colorize(`ℹ ${text}`, COLORS.blue));
}

function runCommand(command, description, required = true) {
  printInfo(`Running: ${description}...`);
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    printSuccess(`${description} passed`);
    return true;
  } catch (error) {
    if (required) {
      printError(`${description} failed`);
      return false;
    } else {
      printWarning(`${description} failed (non-critical)`);
      return true;
    }
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    printWarning('node_modules not found. Installing dependencies...');
    return runCommand('npm ci', 'Install dependencies');
  }
  printSuccess('Dependencies already installed');
  return true;
}

async function main() {
  console.clear();
  printHeader('🚀 CI/CD Pre-flight Check');
  
  printInfo('This script will run all CI checks locally');
  printInfo('Estimated time: 2-5 minutes\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };

  const checks = [
    // Required checks
    {
      name: 'Node Modules',
      fn: checkNodeModules,
      required: true,
    },
    {
      name: 'ESLint',
      command: 'npm run lint',
      required: true,
    },
    {
      name: 'TypeScript Type Check',
      command: 'npx tsc --noEmit',
      required: true,
    },
    {
      name: 'Unit Tests',
      command: 'npm test -- --coverage --passWithNoTests',
      required: true,
    },
    {
      name: 'Property-Based Tests',
      command: 'npm run test:properties',
      required: true,
    },
    {
      name: 'Build',
      command: 'npm run build',
      required: true,
    },
  ];

  // Run required checks
  printHeader('Required Checks');
  
  for (const check of checks) {
    results.total++;
    
    let success;
    if (check.fn) {
      success = check.fn();
    } else {
      success = runCommand(check.command, check.name, check.required);
    }
    
    if (success) {
      results.passed++;
    } else {
      results.failed++;
      if (check.required) {
        printError(`\n❌ Pre-flight check failed at: ${check.name}`);
        printInfo('Fix the errors above and try again\n');
        process.exit(1);
      }
    }
  }

  // Optional checks
  printHeader('Optional Checks');
  printInfo('These checks take longer and are optional for pre-flight');
  printInfo('Skipping by default. Run manually if needed:\n');

  const optionalChecks = [
    {
      name: 'E2E Tests',
      command: 'npm run test:e2e',
      info: 'Run with: npm run test:e2e',
    },
    {
      name: 'Visual Regression',
      command: 'npm run test:visual',
      info: 'Run with: npm run test:visual',
    },
    {
      name: 'Lighthouse Audit',
      command: 'npx @lhci/cli@0.13.x autorun',
      info: 'Run with: npm run start & npx @lhci/cli@0.13.x autorun',
    },
  ];

  for (const check of optionalChecks) {
    printWarning(`⊘ ${check.name} - Skipped`);
    console.log(`  ${colorize(check.info, COLORS.cyan)}`);
    results.skipped++;
    results.total++;
  }

  // Summary
  printHeader('Summary');
  
  console.log(colorize(`Passed:  ${results.passed}/${results.total - results.skipped}`, COLORS.green));
  console.log(colorize(`Failed:  ${results.failed}/${results.total - results.skipped}`, results.failed > 0 ? COLORS.red : COLORS.green));
  console.log(colorize(`Skipped: ${results.skipped}/${results.total}`, COLORS.yellow));

  if (results.failed === 0) {
    console.log('\n' + colorize('✅ All required checks passed!', COLORS.bright + COLORS.green));
    console.log(colorize('🚀 Ready to push to GitHub', COLORS.green));
    console.log('\n' + colorize('Recommended next steps:', COLORS.cyan));
    console.log('1. Commit your changes: git add . && git commit -m "Your message"');
    console.log('2. Push to remote: git push origin your-branch');
    console.log('3. Create a pull request on GitHub\n');
    process.exit(0);
  } else {
    console.log('\n' + colorize('❌ Some checks failed', COLORS.bright + COLORS.red));
    console.log(colorize('Fix the errors above before pushing', COLORS.red) + '\n');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  printError(`\nScript error: ${error.message}`);
  process.exit(1);
});
