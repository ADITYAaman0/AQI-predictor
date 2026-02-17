#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * 
 * This script runs comprehensive checks before deployment to ensure
 * the application is ready for staging or production.
 * 
 * Usage:
 *   node scripts/pre-deployment-check.js [staging|production]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configuration
const environment = process.argv[2] || 'staging';
const rootDir = path.join(__dirname, '..');

// Tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

/**
 * Print formatted header
 */
function printHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Print formatted section
 */
function printSection(text) {
  console.log(`\n${colors.bright}${colors.blue}▶ ${text}${colors.reset}\n`);
}

/**
 * Run a command and return the result
 */
function runCommand(command, description, options = {}) {
  try {
    console.log(`  Checking: ${description}...`);
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    
    if (!options.silent) {
      console.log(`  ${colors.green}✓${colors.reset} ${description} - PASSED`);
    }
    
    results.passed.push(description);
    return { success: true, output };
  } catch (error) {
    if (!options.silent) {
      console.error(`  ${colors.red}✗${colors.reset} ${description} - FAILED`);
      if (options.showError && error.stdout) {
        console.error(`    ${error.stdout}`);
      }
    }
    
    results.failed.push(description);
    return { success: false, error };
  }
}

/**
 * Check if a file exists
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);
  
  console.log(`  Checking: ${description}...`);
  
  if (exists) {
    console.log(`  ${colors.green}✓${colors.reset} ${description} - EXISTS`);
    results.passed.push(description);
    return true;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} ${description} - MISSING`);
    results.failed.push(description);
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  printSection('Environment Variables');
  
  const envFile = environment === 'production' ? '.env.production' : '.env.staging';
  const envPath = path.join(rootDir, envFile);
  
  checkFileExists(envFile, `${envFile} exists`);
  
  if (!fs.existsSync(envPath)) {
    return;
  }
  
  const requiredVars = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_ENVIRONMENT',
  ];
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    const found = regex.test(envContent);
    
    console.log(`  Checking: ${varName}...`);
    
    if (found) {
      console.log(`  ${colors.green}✓${colors.reset} ${varName} - DEFINED`);
      results.passed.push(`${varName} defined`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${varName} - MISSING`);
      results.failed.push(`${varName} missing`);
    }
  });
}

/**
 * Check code quality
 */
function checkCodeQuality() {
  printSection('Code Quality');
  
  // TypeScript type checking
  runCommand(
    'npx tsc --noEmit',
    'TypeScript type checking',
    { silent: false }
  );
  
  // ESLint
  runCommand(
    'npm run lint',
    'ESLint checks',
    { silent: false }
  );
  
  // Format check (if available)
  const hasFormatCheck = fs.existsSync(path.join(rootDir, '.prettierrc'));
  if (hasFormatCheck) {
    runCommand(
      'npm run format:check',
      'Code formatting',
      { silent: false }
    );
  }
}

/**
 * Check tests
 */
function checkTests() {
  printSection('Tests');
  
  // Run all tests
  const testResult = runCommand(
    'npm test -- --coverage --passWithNoTests',
    'All tests',
    { silent: false }
  );
  
  if (testResult.success && testResult.output) {
    // Check coverage
    const coverageMatch = testResult.output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    if (coverageMatch) {
      const coverage = parseFloat(coverageMatch[1]);
      console.log(`\n  Coverage: ${coverage}%`);
      
      if (coverage < 80) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Coverage below 80% - WARNING`);
        results.warnings.push(`Code coverage: ${coverage}% (target: 80%)`);
      }
    }
  }
}

/**
 * Check dependencies
 */
function checkDependencies() {
  printSection('Dependencies');
  
  // Check for outdated dependencies
  console.log('  Checking for outdated dependencies...');
  try {
    const output = execSync('npm outdated --json', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    const outdated = JSON.parse(output || '{}');
    const count = Object.keys(outdated).length;
    
    if (count > 0) {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${count} outdated dependencies - WARNING`);
      results.warnings.push(`${count} outdated dependencies`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} All dependencies up to date`);
      results.passed.push('Dependencies up to date');
    }
  } catch (error) {
    // npm outdated exits with 1 if there are outdated packages
    if (error.stdout) {
      const outdated = JSON.parse(error.stdout || '{}');
      const count = Object.keys(outdated).length;
      
      if (count > 0) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${count} outdated dependencies - WARNING`);
        results.warnings.push(`${count} outdated dependencies`);
      }
    }
  }
  
  // Security audit
  console.log('\n  Running security audit...');
  const auditResult = runCommand(
    'npm audit --audit-level=high',
    'Security audit',
    { silent: true }
  );
  
  if (!auditResult.success) {
    console.log(`  ${colors.red}✗${colors.reset} Security vulnerabilities found`);
    console.log(`  ${colors.yellow}Run 'npm audit' for details${colors.reset}`);
  }
}

/**
 * Check build
 */
function checkBuild() {
  printSection('Build');
  
  // Clean previous build
  console.log('  Cleaning previous build...');
  try {
    const nextDir = path.join(rootDir, '.next');
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true });
    }
    console.log(`  ${colors.green}✓${colors.reset} Cleaned .next directory`);
  } catch (error) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Could not clean .next directory`);
  }
  
  // Build
  runCommand(
    'npm run build',
    'Production build',
    { silent: false, timeout: 300000 } // 5 minute timeout
  );
  
  // Check build output
  const buildDir = path.join(rootDir, '.next');
  if (fs.existsSync(buildDir)) {
    console.log(`  ${colors.green}✓${colors.reset} Build output exists`);
    results.passed.push('Build output exists');
    
    // Check bundle size
    try {
      const stats = JSON.parse(
        fs.readFileSync(path.join(buildDir, 'build-manifest.json'), 'utf-8')
      );
      console.log(`  ${colors.green}✓${colors.reset} Build manifest valid`);
      results.passed.push('Build manifest valid');
    } catch (error) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Could not read build manifest`);
    }
  }
}

/**
 * Check required files
 */
function checkRequiredFiles() {
  printSection('Required Files');
  
  const requiredFiles = [
    'package.json',
    'next.config.ts',
    'tsconfig.json',
    'tailwind.config.ts',
    'README.md',
    '.gitignore',
  ];
  
  requiredFiles.forEach(file => {
    checkFileExists(file, file);
  });
}

/**
 * Print summary
 */
function printSummary() {
  printHeader('PRE-DEPLOYMENT CHECK SUMMARY');
  
  const total = results.passed.length + results.failed.length;
  const passRate = ((results.passed.length / total) * 100).toFixed(1);
  
  console.log(`Environment: ${colors.bright}${environment.toUpperCase()}${colors.reset}`);
  console.log(`\nResults:`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset}   ${results.passed.length}/${total} (${passRate}%)`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset}   ${results.failed.length}/${total}`);
  console.log(`  ${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Checks:${colors.reset}`);
    results.failed.forEach(item => {
      console.log(`  ${colors.red}✗${colors.reset} ${item}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}Warnings:${colors.reset}`);
    results.warnings.forEach(item => {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${item}`);
    });
  }
  
  console.log();
  
  if (results.failed.length > 0) {
    console.log(`${colors.red}${colors.bright}❌ PRE-DEPLOYMENT CHECK FAILED${colors.reset}`);
    console.log(`${colors.red}Please fix the issues above before deploying.${colors.reset}\n`);
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️  PRE-DEPLOYMENT CHECK PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Review warnings before proceeding with deployment.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bright}✅ PRE-DEPLOYMENT CHECK PASSED${colors.reset}`);
    console.log(`${colors.green}Ready to deploy to ${environment}!${colors.reset}\n`);
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader(`Pre-Deployment Check - ${environment.toUpperCase()}`);
  
  console.log(`Starting pre-deployment checks for ${colors.bright}${environment}${colors.reset} environment...\n`);
  
  try {
    checkRequiredFiles();
    checkEnvironmentVariables();
    checkCodeQuality();
    checkTests();
    checkDependencies();
    checkBuild();
    
    printSummary();
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error during pre-deployment check:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the checks
if (require.main === module) {
  main();
}

module.exports = { main };
