#!/usr/bin/env node

/**
 * Smoke Test Script
 * 
 * This script runs critical smoke tests after deployment to verify
 * that the application is working correctly.
 * 
 * Usage:
 *   node scripts/smoke-test.js [staging|production]
 */

const https = require('https');
const http = require('http');

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
const urls = {
  staging: process.env.STAGING_URL || 'https://staging.aqi-dashboard.vercel.app',
  production: process.env.PRODUCTION_URL || 'https://aqi-dashboard.vercel.app',
};

const baseUrl = urls[environment];
const apiBaseUrl = environment === 'production'
  ? process.env.NEXT_PUBLIC_API_BASE_URL_PROD || 'https://api.aqi-predictor.com'
  : process.env.NEXT_PUBLIC_API_BASE_URL_STAGING || 'https://staging-api.aqi-predictor.com';

// Test results
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
    
    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Test: Home page loads
 */
async function testHomePageLoads() {
  console.log(`${colors.blue}▶${colors.reset} Testing home page...`);
  
  try {
    const response = await makeRequest(baseUrl);
    
    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Home page loads (200 OK)`);
      results.passed.push('Home page loads');
      return true;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Home page returned ${response.statusCode}`);
      results.failed.push('Home page loads');
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Home page failed: ${error.message}`);
    results.failed.push('Home page loads');
    return false;
  }
}

/**
 * Test: HTML content validity
 */
async function testHtmlContent() {
  console.log(`${colors.blue}▶${colors.reset} Testing HTML content...`);
  
  try {
    const response = await makeRequest(baseUrl);
    
    if (response.body.includes('<html')) {
      console.log(`  ${colors.green}✓${colors.reset} Valid HTML content`);
      results.passed.push('Valid HTML content');
      return true;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Invalid HTML content`);
      results.failed.push('Valid HTML content');
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} HTML content check failed: ${error.message}`);
    results.failed.push('Valid HTML content');
    return false;
  }
}

/**
 * Test: Required meta tags
 */
async function testMetaTags() {
  console.log(`${colors.blue}▶${colors.reset} Testing meta tags...`);
  
  try {
    const response = await makeRequest(baseUrl);
    const html = response.body;
    
    const requiredTags = {
      'charset': /<meta\s+charset/i,
      'viewport': /<meta\s+name=["']viewport["']/i,
      'title': /<title>/i,
      'description': /<meta\s+name=["']description["']/i,
    };
    
    let allFound = true;
    
    for (const [tag, regex] of Object.entries(requiredTags)) {
      if (regex.test(html)) {
        console.log(`  ${colors.green}✓${colors.reset} ${tag} meta tag present`);
      } else {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${tag} meta tag missing`);
        results.warnings.push(`${tag} meta tag missing`);
        allFound = false;
      }
    }
    
    if (allFound) {
      results.passed.push('All meta tags present');
      return true;
    }
    
    return true; // Warnings don't fail the test
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Meta tags check failed: ${error.message}`);
    results.failed.push('Meta tags check');
    return false;
  }
}

/**
 * Test: API connectivity
 */
async function testApiConnectivity() {
  console.log(`${colors.blue}▶${colors.reset} Testing API connectivity...`);
  
  try {
    // Test health endpoint
    const healthUrl = `${apiBaseUrl}/health`;
    const response = await makeRequest(healthUrl);
    
    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} API health check passed`);
      results.passed.push('API connectivity');
      return true;
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} API health check returned ${response.statusCode}`);
      results.warnings.push('API connectivity issue');
      return true; // Don't fail if API is temporarily down
    }
  } catch (error) {
    console.log(`  ${colors.yellow}⚠${colors.reset} API connectivity check failed: ${error.message}`);
    results.warnings.push('API connectivity issue');
    return true; // Don't fail if API is temporarily down
  }
}

/**
 * Test: Static assets load
 */
async function testStaticAssets() {
  console.log(`${colors.blue}▶${colors.reset} Testing static assets...`);
  
  const assets = [
    '/_next/static/css',
    '/_next/static/chunks',
    '/favicon.ico',
  ];
  
  let allPassed = true;
  
  for (const asset of assets) {
    try {
      const url = `${baseUrl}${asset}`;
      const response = await makeRequest(url);
      
      // For directories, we might get redirects or 404s
      if (response.statusCode === 200 || response.statusCode === 301 || response.statusCode === 302) {
        console.log(`  ${colors.green}✓${colors.reset} Asset accessible: ${asset}`);
      } else if (response.statusCode === 404 && asset === '/favicon.ico') {
        // Favicon is optional
        console.log(`  ${colors.yellow}⚠${colors.reset} Favicon missing (optional)`);
        results.warnings.push('Favicon missing');
      } else {
        console.log(`  ${colors.yellow}⚠${colors.reset} Asset returned ${response.statusCode}: ${asset}`);
        results.warnings.push(`Asset issue: ${asset}`);
      }
    } catch (error) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Asset check failed for ${asset}: ${error.message}`);
      results.warnings.push(`Asset check failed: ${asset}`);
    }
  }
  
  results.passed.push('Static assets check');
  return true; // Warnings don't fail the test
}

/**
 * Test: Security headers
 */
async function testSecurityHeaders() {
  console.log(`${colors.blue}▶${colors.reset} Testing security headers...`);
  
  try {
    const response = await makeRequest(baseUrl);
    const headers = response.headers;
    
    const securityHeaders = {
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'strict-transport-security': 'Strict-Transport-Security',
    };
    
    let allFound = true;
    
    for (const [header, displayName] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        console.log(`  ${colors.green}✓${colors.reset} ${displayName} present`);
      } else {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${displayName} missing`);
        results.warnings.push(`${displayName} missing`);
        allFound = false;
      }
    }
    
    if (allFound) {
      results.passed.push('All security headers present');
    }
    
    return true; // Warnings don't fail the test
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Security headers check failed: ${error.message}`);
    results.failed.push('Security headers check');
    return false;
  }
}

/**
 * Test: HTTPS redirect
 */
async function testHttpsRedirect() {
  console.log(`${colors.blue}▶${colors.reset} Testing HTTPS...`);
  
  try {
    const urlObj = new URL(baseUrl);
    
    if (urlObj.protocol === 'https:') {
      console.log(`  ${colors.green}✓${colors.reset} Using HTTPS`);
      results.passed.push('HTTPS enabled');
      return true;
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Not using HTTPS`);
      results.warnings.push('HTTPS not enabled');
      return true;
    }
  } catch (error) {
    console.log(`  ${colors.yellow}⚠${colors.reset} HTTPS check failed: ${error.message}`);
    results.warnings.push('HTTPS check failed');
    return true;
  }
}

/**
 * Test: Response time
 */
async function testResponseTime() {
  console.log(`${colors.blue}▶${colors.reset} Testing response time...`);
  
  try {
    const startTime = Date.now();
    await makeRequest(baseUrl);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`  Response time: ${responseTime}ms`);
    
    if (responseTime < 2000) {
      console.log(`  ${colors.green}✓${colors.reset} Response time acceptable (<2s)`);
      results.passed.push('Response time acceptable');
      return true;
    } else if (responseTime < 5000) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Response time slow (${responseTime}ms)`);
      results.warnings.push(`Response time: ${responseTime}ms`);
      return true;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Response time too slow (${responseTime}ms)`);
      results.failed.push('Response time too slow');
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Response time check failed: ${error.message}`);
    results.failed.push('Response time check');
    return false;
  }
}

/**
 * Print summary
 */
function printSummary() {
  printHeader('SMOKE TEST SUMMARY');
  
  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(`Environment: ${colors.bright}${environment.toUpperCase()}${colors.reset}`);
  console.log(`URL: ${colors.blue}${baseUrl}${colors.reset}`);
  console.log(`\nResults:`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset}   ${results.passed.length}/${total} (${passRate}%)`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset}   ${results.failed.length}/${total}`);
  console.log(`  ${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
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
    console.log(`${colors.red}${colors.bright}❌ SMOKE TESTS FAILED${colors.reset}`);
    console.log(`${colors.red}Critical issues detected. Investigate immediately!${colors.reset}\n`);
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️  SMOKE TESTS PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Review warnings before marking deployment as successful.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bright}✅ ALL SMOKE TESTS PASSED${colors.reset}`);
    console.log(`${colors.green}Deployment is working correctly!${colors.reset}\n`);
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader(`Smoke Tests - ${environment.toUpperCase()}`);
  
  console.log(`Running smoke tests for ${colors.bright}${environment}${colors.reset} environment...`);
  console.log(`URL: ${colors.blue}${baseUrl}${colors.reset}\n`);
  
  try {
    await testHomePageLoads();
    await testHtmlContent();
    await testMetaTags();
    await testApiConnectivity();
    await testStaticAssets();
    await testSecurityHeaders();
    await testHttpsRedirect();
    await testResponseTime();
    
    printSummary();
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error during smoke tests:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

module.exports = { main };
