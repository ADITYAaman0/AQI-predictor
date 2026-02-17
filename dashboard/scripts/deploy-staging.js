#!/usr/bin/env node

/**
 * Staging Deployment Script
 * 
 * This script handles deployment to the staging environment with
 * comprehensive checks and verification.
 * 
 * Usage:
 *   node scripts/deploy-staging.js [--skip-checks]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const rootDir = path.join(__dirname, '..');
const skipChecks = process.argv.includes('--skip-checks');

/**
 * Print formatted header
 */
function printHeader(text) {
  console.log(`\n${colors.bright}${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Print formatted step
 */
function printStep(number, text) {
  console.log(`\n${colors.bright}${colors.cyan}[Step ${number}] ${text}${colors.reset}\n`);
}

/**
 * Run a command
 */
function runCommand(command, description) {
  try {
    console.log(`${colors.blue}▶${colors.reset} ${description}...`);
    execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    console.log(`${colors.green}✓${colors.reset} ${description} - DONE\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} ${description} - FAILED\n`);
    return false;
  }
}

/**
 * Confirm deployment
 */
function confirmDeployment() {
  printHeader('STAGING DEPLOYMENT');
  
  console.log(`${colors.yellow}You are about to deploy to STAGING environment.${colors.reset}\n`);
  console.log('This will:');
  console.log('  - Run pre-deployment checks (unless --skip-checks)');
  console.log('  - Build the application');
  console.log('  - Deploy to Vercel staging environment');
  console.log('  - Run smoke tests\n');
  
  if (skipChecks) {
    console.log(`${colors.yellow}⚠️  WARNING: Pre-deployment checks will be SKIPPED${colors.reset}\n`);
  }
  
  // Auto-proceed in CI or if --yes flag is present
  if (process.env.CI || process.argv.includes('--yes')) {
    console.log('Auto-proceeding (CI environment or --yes flag)\n');
    return true;
  }
  
  // In interactive mode, would prompt user
  // For now, auto-proceed
  return true;
}

/**
 * Run pre-deployment checks
 */
function runPreDeploymentChecks() {
  printStep(1, 'Pre-Deployment Checks');
  
  if (skipChecks) {
    console.log(`${colors.yellow}Skipping pre-deployment checks (--skip-checks flag)${colors.reset}\n`);
    return true;
  }
  
  const checkScript = path.join(rootDir, 'scripts', 'pre-deployment-check.js');
  
  if (!fs.existsSync(checkScript)) {
    console.log(`${colors.yellow}⚠${colors.reset} Pre-deployment check script not found. Continuing...`);
    return true;
  }
  
  if (!runCommand(`node "${checkScript}" staging`, 'Running pre-deployment checks')) {
    console.log(`${colors.red}Pre-deployment checks failed!${colors.reset}`);
    console.log(`${colors.yellow}Fix the issues or use --skip-checks to bypass (not recommended)${colors.reset}\n`);
    process.exit(1);
  }
  
  return true;
}

/**
 * Build application
 */
function buildApplication() {
  printStep(2, 'Build Application');
  
  // Set environment
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_ENVIRONMENT = 'staging';
  
  if (!runCommand('npm run build', 'Building application')) {
    console.error(`${colors.red}Build failed!${colors.reset}\n`);
    process.exit(1);
  }
  
  return true;
}

/**
 * Deploy to Vercel
 */
function deployToVercel() {
  printStep(3, 'Deploy to Vercel Staging');
  
  // Check if Vercel CLI is available
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    console.error(`${colors.red}Vercel CLI not found!${colors.reset}`);
    console.log('Install it with: npm install -g vercel\n');
    process.exit(1);
  }
  
  // Deploy to staging (preview)
  console.log(`${colors.blue}▶${colors.reset} Deploying to Vercel staging environment...\n`);
  
  try {
    const output = execSync(
      'vercel --prod=false --yes',
      {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'inherit',
      }
    );
    
    console.log(`\n${colors.green}✓${colors.reset} Deployment successful!\n`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Deployment failed!\n`);
    process.exit(1);
  }
}

/**
 * Run smoke tests
 */
function runSmokeTests() {
  printStep(4, 'Run Smoke Tests');
  
  const smokeTestScript = path.join(rootDir, 'scripts', 'smoke-test.js');
  
  if (!fs.existsSync(smokeTestScript)) {
    console.log(`${colors.yellow}⚠${colors.reset} Smoke test script not found. Skipping smoke tests...`);
    return true;
  }
  
  console.log(`${colors.blue}▶${colors.reset} Running smoke tests on staging deployment...\n`);
  
  // Give the deployment a moment to be ready
  console.log('Waiting 10 seconds for deployment to be ready...');
  execSync('sleep 10 || timeout /t 10', { stdio: 'inherit' });
  
  if (!runCommand(`node "${smokeTestScript}" staging`, 'Running smoke tests')) {
    console.log(`${colors.yellow}⚠${colors.reset} Smoke tests failed!`);
    console.log(`${colors.yellow}Please verify the deployment manually.${colors.reset}\n`);
    return false;
  }
  
  return true;
}

/**
 * Print deployment summary
 */
function printSummary(success) {
  printHeader('DEPLOYMENT SUMMARY');
  
  if (success) {
    console.log(`${colors.green}${colors.bright}✅ STAGING DEPLOYMENT SUCCESSFUL!${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Verify the deployment manually');
    console.log('  2. Test all critical features');
    console.log('  3. Run manual tests on different devices/browsers');
    console.log('  4. If everything looks good, deploy to production\n');
    console.log(`${colors.cyan}Staging URL:${colors.reset} Check the Vercel deployment output above\n`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ STAGING DEPLOYMENT COMPLETED WITH WARNINGS${colors.reset}\n`);
    console.log('The deployment succeeded but smoke tests failed.');
    console.log('Please verify the deployment manually before proceeding.\n');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Confirm deployment
    if (!confirmDeployment()) {
      console.log('Deployment cancelled.\n');
      process.exit(0);
    }
    
    // Run pre-deployment checks
    runPreDeploymentChecks();
    
    // Build application
    buildApplication();
    
    // Deploy to Vercel
    deployToVercel();
    
    // Run smoke tests
    const smokeTestsPassed = runSmokeTests();
    
    // Print summary
    printSummary(smokeTestsPassed);
    
    process.exit(smokeTestsPassed ? 0 : 1);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Deployment error:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main();
}

module.exports = { main };
