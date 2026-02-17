#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * This script handles deployment to the production environment with
 * comprehensive checks, backups, and verification.
 * 
 * Usage:
 *   node scripts/deploy-production.js [--skip-checks] [--yes]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

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
const autoYes = process.argv.includes('--yes');

/**
 * Print formatted header
 */
function printHeader(text) {
  console.log(`\n${colors.bright}${colors.red}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.red}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.red}${'='.repeat(60)}${colors.reset}\n`);
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
 * Ask for user confirmation
 */
async function askConfirmation(question) {
  if (process.env.CI || autoYes) {
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Confirm deployment
 */
async function confirmDeployment() {
  printHeader('⚠️  PRODUCTION DEPLOYMENT ⚠️');
  
  console.log(`${colors.red}${colors.bright}WARNING: You are about to deploy to PRODUCTION!${colors.reset}\n`);
  console.log('This will:');
  console.log('  - Run pre-deployment checks (unless --skip-checks)');
  console.log('  - Create a backup of current deployment');
  console.log('  - Build the application');
  console.log('  - Deploy to Vercel production environment');
  console.log('  - Run smoke tests');
  console.log('  - Make the new version live to all users\n');
  
  if (skipChecks) {
    console.log(`${colors.red}⚠️  WARNING: Pre-deployment checks will be SKIPPED${colors.reset}\n`);
  }
  
  console.log(`${colors.yellow}Before proceeding, ensure:${colors.reset}`);
  console.log('  ✓ All tests pass on staging');
  console.log('  ✓ Stakeholders have approved the deployment');
  console.log('  ✓ No critical bugs are known');
  console.log('  ✓ Rollback plan is ready\n');
  
  const confirmed = await askConfirmation(
    `${colors.red}${colors.bright}Are you ABSOLUTELY SURE you want to deploy to PRODUCTION?${colors.reset}`
  );
  
  if (!confirmed) {
    console.log(`\n${colors.yellow}Deployment cancelled.${colors.reset}\n`);
    process.exit(0);
  }
  
  // Second confirmation for safety
  if (!process.env.CI && !autoYes) {
    const doubleConfirm = await askConfirmation(
      `${colors.red}This is your last chance. Deploy to PRODUCTION?${colors.reset}`
    );
    
    if (!doubleConfirm) {
      console.log(`\n${colors.yellow}Deployment cancelled.${colors.reset}\n`);
      process.exit(0);
    }
  }
  
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
  
  if (!runCommand(`node "${checkScript}" production`, 'Running pre-deployment checks')) {
    console.log(`${colors.red}Pre-deployment checks failed!${colors.reset}`);
    console.log(`${colors.yellow}Fix the issues or use --skip-checks to bypass (NOT RECOMMENDED FOR PRODUCTION)${colors.reset}\n`);
    process.exit(1);
  }
  
  return true;
}

/**
 * Create backup
 */
function createBackup() {
  printStep(2, 'Create Backup');
  
  console.log(`${colors.blue}▶${colors.reset} Creating backup of current production deployment...\n`);
  
  // Save current deployment info
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(rootDir, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get current Vercel deployment info
    try {
      const deploymentInfo = execSync('vercel ls --prod --json', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      
      const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
      fs.writeFileSync(backupFile, deploymentInfo);
      
      console.log(`${colors.green}✓${colors.reset} Backup saved: ${backupFile}\n`);
    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Could not get deployment info. Continuing...\n`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Backup creation failed. Continuing...\n`);
  }
  
  return true;
}

/**
 * Build application
 */
function buildApplication() {
  printStep(3, 'Build Application');
  
  // Set environment
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_ENVIRONMENT = 'production';
  
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
  printStep(4, 'Deploy to Vercel Production');
  
  // Check if Vercel CLI is available
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    console.error(`${colors.red}Vercel CLI not found!${colors.reset}`);
    console.log('Install it with: npm install -g vercel\n');
    process.exit(1);
  }
  
  // Deploy to production
  console.log(`${colors.blue}▶${colors.reset} Deploying to Vercel production environment...\n`);
  console.log(`${colors.red}This will make the new version LIVE!${colors.reset}\n`);
  
  try {
    const output = execSync(
      'vercel --prod --yes',
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
    console.log(`${colors.yellow}You may need to rollback manually.${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Run smoke tests
 */
function runSmokeTests() {
  printStep(5, 'Run Smoke Tests');
  
  const smokeTestScript = path.join(rootDir, 'scripts', 'smoke-test.js');
  
  if (!fs.existsSync(smokeTestScript)) {
    console.log(`${colors.yellow}⚠${colors.reset} Smoke test script not found. Skipping smoke tests...`);
    return true;
  }
  
  console.log(`${colors.blue}▶${colors.reset} Running smoke tests on production deployment...\n`);
  
  // Give the deployment a moment to be ready
  console.log('Waiting 15 seconds for deployment to be ready...');
  execSync('sleep 15 || timeout /t 15', { stdio: 'inherit' });
  
  if (!runCommand(`node "${smokeTestScript}" production`, 'Running smoke tests')) {
    console.log(`${colors.yellow}⚠${colors.reset} Smoke tests failed!`);
    console.log(`${colors.red}${colors.bright}CRITICAL: Verify the deployment immediately!${colors.reset}`);
    console.log(`${colors.red}Consider rolling back if issues are found.${colors.reset}\n`);
    return false;
  }
  
  return true;
}

/**
 * Verify deployment
 */
async function verifyDeployment() {
  printStep(6, 'Verify Deployment');
  
  console.log('Please verify critical features manually:\n');
  console.log('  1. Open the production URL in a browser');
  console.log('  2. Check that the home page loads correctly');
  console.log('  3. Test critical user flows');
  console.log('  4. Monitor for errors in browser console');
  console.log('  5. Check API connectivity\n');
  
  if (process.env.CI || autoYes) {
    console.log('Skipping manual verification (CI mode)\n');
    return true;
  }
  
  const verified = await askConfirmation(
    `${colors.cyan}Have you verified that the deployment is working correctly?${colors.reset}`
  );
  
  if (!verified) {
    console.log(`\n${colors.red}Deployment verification failed!${colors.reset}`);
    console.log(`${colors.yellow}Consider rolling back if there are issues.${colors.reset}\n`);
    return false;
  }
  
  return true;
}

/**
 * Print deployment summary
 */
function printSummary(success, verified) {
  printHeader('DEPLOYMENT SUMMARY');
  
  if (success && verified) {
    console.log(`${colors.green}${colors.bright}✅ PRODUCTION DEPLOYMENT SUCCESSFUL!${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Monitor error rates and performance for 24 hours');
    console.log('  2. Check user feedback and support tickets');
    console.log('  3. Document any issues that arise');
    console.log('  4. Update team and stakeholders\n');
    console.log(`${colors.cyan}Production URL:${colors.reset} Check the Vercel deployment output above\n`);
    console.log(`${colors.green}Congratulations on the successful deployment! 🎉${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  PRODUCTION DEPLOYMENT COMPLETED WITH WARNINGS${colors.reset}\n`);
    console.log('The deployment succeeded but there were issues:');
    if (!success) {
      console.log('  - Smoke tests failed');
    }
    if (!verified) {
      console.log('  - Manual verification not confirmed');
    }
    console.log('\nACTION REQUIRED:');
    console.log('  1. Investigate the issues immediately');
    console.log('  2. Monitor error rates closely');
    console.log('  3. Be ready to rollback if needed');
    console.log(`  4. Rollback command: ${colors.cyan}vercel rollback [deployment-url]${colors.reset}\n`);
  }
  
  console.log(`${colors.yellow}Post-Deployment Monitoring:${colors.reset}`);
  console.log('  - Error tracking: Check your error monitoring tool');
  console.log('  - Performance: Monitor Core Web Vitals');
  console.log('  - Logs: Check application and server logs');
  console.log('  - Analytics: Monitor user behavior\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Confirm deployment
    await confirmDeployment();
    
    // Run pre-deployment checks
    runPreDeploymentChecks();
    
    // Create backup
    createBackup();
    
    // Build application
    buildApplication();
    
    // Deploy to Vercel
    deployToVercel();
    
    // Run smoke tests
    const smokeTestsPassed = runSmokeTests();
    
    // Verify deployment
    const verified = await verifyDeployment();
    
    // Print summary
    printSummary(smokeTestsPassed, verified);
    
    // Exit with appropriate code
    process.exit(smokeTestsPassed && verified ? 0 : 1);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Deployment error:${colors.reset}`);
    console.error(error);
    console.log(`\n${colors.red}Production deployment failed!${colors.reset}`);
    console.log(`${colors.yellow}Check the error above and try again.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main();
}

module.exports = { main };
