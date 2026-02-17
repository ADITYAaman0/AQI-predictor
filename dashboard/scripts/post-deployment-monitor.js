#!/usr/bin/env node

/**
 * Post-Deployment Monitoring Script
 * 
 * This script monitors the deployed application for errors, performance issues,
 * and other anomalies after deployment.
 * 
 * Usage:
 *   node scripts/post-deployment-monitor.js [staging|production] [--duration 60]
 */

const https = require('https');
const http = require('http');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const args = process.argv.slice(2);
const environment = args.find(arg => !arg.startsWith('--')) || 'staging';
const durationArg = args.find(arg => arg.startsWith('--duration'));
const monitoringDuration = durationArg
  ? parseInt(durationArg.split('=')[1] || args[args.indexOf(durationArg) + 1])
  : 60; // Default: 60 seconds

const urls = {
  staging: process.env.STAGING_URL || 'https://staging.aqi-dashboard.vercel.app',
  production: process.env.PRODUCTION_URL || 'https://aqi-dashboard.vercel.app',
};

const baseUrl = urls[environment];
const checkInterval = 5000; // Check every 5 seconds

// Monitoring data
const monitoring = {
  startTime: Date.now(),
  checks: 0,
  successful: 0,
  failed: 0,
  responseTimes: [],
  errors: [],
  statusCodes: {},
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
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
    };
    
    const startTime = Date.now();
    
    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime,
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      reject({ error, responseTime });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      reject({ error: new Error('Request timeout'), responseTime });
    });
    
    req.end();
  });
}

/**
 * Perform health check
 */
async function performHealthCheck() {
  monitoring.checks++;
  
  try {
    const response = await makeRequest(baseUrl);
    
    // Track status code
    monitoring.statusCodes[response.statusCode] = 
      (monitoring.statusCodes[response.statusCode] || 0) + 1;
    
    // Track response time
    monitoring.responseTimes.push(response.responseTime);
    
    if (response.statusCode === 200) {
      monitoring.successful++;
      
      const avgResponseTime = monitoring.responseTimes.reduce((a, b) => a + b, 0) / 
        monitoring.responseTimes.length;
      
      const status = response.responseTime < 1000 ? colors.green : 
        response.responseTime < 2000 ? colors.yellow : colors.red;
      
      process.stdout.write(
        `\r${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
        `${status}●${colors.reset} ` +
        `Check ${monitoring.checks}: ` +
        `${status}${response.responseTime}ms${colors.reset} ` +
        `(avg: ${Math.round(avgResponseTime)}ms) ` +
        `${colors.green}✓ ${monitoring.successful}${colors.reset} | ` +
        `${colors.red}✗ ${monitoring.failed}${colors.reset}   `
      );
    } else {
      monitoring.failed++;
      monitoring.errors.push({
        time: new Date(),
        type: 'http_error',
        statusCode: response.statusCode,
        message: `HTTP ${response.statusCode}`,
      });
      
      process.stdout.write(
        `\r${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
        `${colors.red}●${colors.reset} ` +
        `Check ${monitoring.checks}: ` +
        `${colors.red}HTTP ${response.statusCode}${colors.reset} ` +
        `${colors.green}✓ ${monitoring.successful}${colors.reset} | ` +
        `${colors.red}✗ ${monitoring.failed}${colors.reset}   `
      );
    }
  } catch (error) {
    monitoring.failed++;
    monitoring.errors.push({
      time: new Date(),
      type: 'request_error',
      message: error.error?.message || 'Request failed',
      responseTime: error.responseTime,
    });
    
    process.stdout.write(
      `\r${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
      `${colors.red}●${colors.reset} ` +
      `Check ${monitoring.checks}: ` +
      `${colors.red}ERROR${colors.reset} ` +
      `${colors.green}✓ ${monitoring.successful}${colors.reset} | ` +
      `${colors.red}✗ ${monitoring.failed}${colors.reset}   `
    );
  }
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const stats = {
    totalChecks: monitoring.checks,
    successful: monitoring.successful,
    failed: monitoring.failed,
    successRate: monitoring.checks > 0 
      ? ((monitoring.successful / monitoring.checks) * 100).toFixed(2) + '%'
      : '0%',
    duration: ((Date.now() - monitoring.startTime) / 1000).toFixed(0) + 's',
  };
  
  if (monitoring.responseTimes.length > 0) {
    const sorted = [...monitoring.responseTimes].sort((a, b) => a - b);
    
    stats.responseTime = {
      min: Math.min(...monitoring.responseTimes),
      max: Math.max(...monitoring.responseTimes),
      avg: Math.round(
        monitoring.responseTimes.reduce((a, b) => a + b, 0) / monitoring.responseTimes.length
      ),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  return stats;
}

/**
 * Print monitoring summary
 */
function printSummary() {
  console.log(); // New line after monitoring output
  
  printHeader('POST-DEPLOYMENT MONITORING SUMMARY');
  
  const stats = calculateStats();
  
  console.log(`Environment: ${colors.bright}${environment.toUpperCase()}${colors.reset}`);
  console.log(`URL: ${colors.blue}${baseUrl}${colors.reset}`);
  console.log(`Duration: ${stats.duration}`);
  console.log();
  
  // Overall health
  console.log(`${colors.bright}Overall Health:${colors.reset}`);
  console.log(`  Total Checks: ${stats.totalChecks}`);
  console.log(`  ${colors.green}✓ Successful:${colors.reset} ${stats.successful}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset} ${stats.failed}`);
  
  const successRateNum = parseFloat(stats.successRate);
  const rateColor = successRateNum >= 99 ? colors.green :
    successRateNum >= 95 ? colors.yellow : colors.red;
  console.log(`  Success Rate: ${rateColor}${stats.successRate}${colors.reset}`);
  console.log();
  
  // Response times
  if (stats.responseTime) {
    console.log(`${colors.bright}Response Times:${colors.reset}`);
    console.log(`  Min: ${stats.responseTime.min}ms`);
    console.log(`  Avg: ${stats.responseTime.avg}ms`);
    console.log(`  Max: ${stats.responseTime.max}ms`);
    console.log(`  P50: ${stats.responseTime.p50}ms`);
    console.log(`  P95: ${stats.responseTime.p95}ms`);
    console.log(`  P99: ${stats.responseTime.p99}ms`);
    console.log();
  }
  
  // Status codes
  if (Object.keys(monitoring.statusCodes).length > 0) {
    console.log(`${colors.bright}Status Codes:${colors.reset}`);
    Object.entries(monitoring.statusCodes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const color = code === '200' ? colors.green : colors.red;
        console.log(`  ${color}${code}:${colors.reset} ${count}`);
      });
    console.log();
  }
  
  // Errors
  if (monitoring.errors.length > 0) {
    console.log(`${colors.bright}${colors.red}Errors (${monitoring.errors.length}):${colors.reset}`);
    monitoring.errors.slice(-10).forEach((error, i) => {
      console.log(
        `  ${i + 1}. [${error.time.toISOString()}] ` +
        `${error.type}: ${error.message}`
      );
    });
    
    if (monitoring.errors.length > 10) {
      console.log(`  ... and ${monitoring.errors.length - 10} more errors`);
    }
    console.log();
  }
  
  // Verdict
  console.log();
  
  if (stats.failed === 0) {
    console.log(`${colors.green}${colors.bright}✅ MONITORING PASSED${colors.reset}`);
    console.log(`${colors.green}No issues detected during monitoring period.${colors.reset}`);
    console.log(`${colors.green}Deployment appears healthy!${colors.reset}\n`);
    process.exit(0);
  } else if (successRateNum >= 99) {
    console.log(`${colors.yellow}${colors.bright}⚠️  MONITORING PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Some minor issues detected (${stats.failed} failures).${colors.reset}`);
    console.log(`${colors.yellow}Monitor closely and investigate if issues persist.${colors.reset}\n`);
    process.exit(0);
  } else if (successRateNum >= 95) {
    console.log(`${colors.yellow}${colors.bright}⚠️  MONITORING ISSUES DETECTED${colors.reset}`);
    console.log(`${colors.yellow}Success rate below 99% (${stats.successRate}).${colors.reset}`);
    console.log(`${colors.yellow}Investigation recommended.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.red}${colors.bright}❌ MONITORING FAILED${colors.reset}`);
    console.log(`${colors.red}Significant issues detected (success rate: ${stats.successRate}).${colors.reset}`);
    console.log(`${colors.red}Immediate investigation required!${colors.reset}`);
    console.log(`${colors.red}Consider rolling back the deployment.${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader(`Post-Deployment Monitoring - ${environment.toUpperCase()}`);
  
  console.log(`Monitoring: ${colors.blue}${baseUrl}${colors.reset}`);
  console.log(`Duration: ${monitoringDuration} seconds`);
  console.log(`Check Interval: ${checkInterval / 1000} seconds`);
  console.log();
  console.log(`${colors.dim}Press Ctrl+C to stop monitoring${colors.reset}\n`);
  
  const checksToPerform = Math.ceil((monitoringDuration * 1000) / checkInterval);
  let checkCount = 0;
  
  // Initial check
  await performHealthCheck();
  checkCount++;
  
  // Set up interval
  const interval = setInterval(async () => {
    await performHealthCheck();
    checkCount++;
    
    if (checkCount >= checksToPerform) {
      clearInterval(interval);
      printSummary();
    }
  }, checkInterval);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    printSummary();
  });
}

// Run monitoring
if (require.main === module) {
  main().catch(error => {
    console.error(`\n${colors.red}${colors.bright}Monitoring error:${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
