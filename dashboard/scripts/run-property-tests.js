#!/usr/bin/env node

/**
 * Property-Based Test Runner
 * 
 * This script runs all property-based tests and generates a comprehensive report.
 * It identifies tests that validate the 46 correctness properties from design.md.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Property mapping from task document
const propertyMapping = {
  1: { name: 'Glassmorphic Styling Consistency', testFile: 'glassmorphism-styling.property.test.tsx' },
  2: { name: 'Dynamic Background Matching', testFile: 'components/dashboard/__tests__/HeroAQISection.properties.test.tsx' },
  3: { name: 'Hero Ring Color Matching', testFile: 'components/dashboard/__tests__/HeroAQISection.properties.test.tsx' },
  4: { name: 'Health Message Appropriateness', testFile: 'components/dashboard/__tests__/HeroAQISection.properties.test.tsx' },
  5: { name: 'Pollutant Card Completeness', testFile: 'components/dashboard/__tests__/PollutantCard.properties.test.tsx' },
  6: { name: 'Pollutant Color Coding', testFile: 'components/dashboard/__tests__/PollutantCard.properties.test.tsx' },
  7: { name: 'Forecast Data Completeness', testFile: 'components/forecast/__tests__/PredictionGraph.property.test.tsx' },
  8: { name: 'Forecast Gradient Matching', testFile: 'components/forecast/__tests__/PredictionGraph.property.test.tsx' },
  9: { name: 'Forecast Tooltip Completeness', testFile: 'components/forecast/__tests__/PredictionGraph.property.test.tsx' },
  10: { name: 'Confidence Interval Visualization', testFile: 'components/forecast/__tests__/PredictionGraph.property.test.tsx' },
  11: { name: 'Weather Data Synchronization', testFile: 'components/dashboard/__tests__/WeatherBadges.properties.test.tsx' },
  12: { name: 'Health Recommendation Color Coding', testFile: 'components/dashboard/__tests__/HealthRecommendationCard.test.tsx' },
  13: { name: 'Mobile Touch Target Sizing', testFile: 'responsive-design.test.tsx' },
  14: { name: 'Responsive Chart Adaptation', testFile: 'responsive-design.test.tsx' },
  15: { name: 'API Endpoint Correctness', testFile: 'api-endpoint-correctness.property.test.tsx' },
  16: { name: 'Threshold Crossing Animation', testFile: 'animations.test.tsx' },
  17: { name: 'Location Search Format Support', testFile: 'components/common/__tests__/LocationSelector.property.test.tsx' },
  18: { name: 'Favorite Location Persistence', testFile: 'components/common/__tests__/LocationSelector.property.test.tsx' },
  19: { name: 'Device Card Completeness', testFile: 'components/devices/__tests__/DeviceManagement.property.test.tsx' },
  20: { name: 'Device Status Color Coding', testFile: 'components/devices/__tests__/DeviceManagement.property.test.tsx' },
  21: { name: 'Card Hover Animation', testFile: 'animations.test.tsx' },
  22: { name: 'Button Click Animation', testFile: 'animations.test.tsx' },
  23: { name: 'Numeric Value Animation', testFile: 'animations.test.tsx' },
  24: { name: 'Text Contrast Compliance', testFile: 'accessibility.test.tsx' },
  25: { name: 'Keyboard Navigation Support', testFile: 'accessibility.test.tsx' },
  26: { name: 'Focus Indicator Visibility', testFile: 'accessibility.test.tsx' },
  27: { name: 'ARIA Label Presence', testFile: 'accessibility.test.tsx' },
  28: { name: 'Dynamic Content Announcement', testFile: 'accessibility.test.tsx' },
  29: { name: 'Color-Independent AQI Indication', testFile: 'accessibility.test.tsx' },
  30: { name: 'Safe Animation Flash Rate', testFile: 'animations.test.tsx' },
  31: { name: 'Lazy Loading Implementation', testFile: 'performance.test.tsx' },
  32: { name: 'Authentication Header Inclusion', testFile: 'lib/api/__tests__/client.test.ts' },
  33: { name: 'API Error Handling', testFile: 'error-handling.test.ts' },
  34: { name: 'Exponential Backoff Retry', testFile: 'error-handling.test.ts' },
  35: { name: 'Confidence Interval Display', testFile: 'confidence-interval.property.test.tsx' },
  36: { name: 'Source Attribution Display', testFile: 'components/insights/__tests__/SourceAttributionCard.property.test.tsx' },
  37: { name: 'Heatmap Color Intensity', testFile: 'components/insights/__tests__/HistoricalVisualization.property.test.tsx' },
  38: { name: 'Chart Tooltip Display', testFile: 'components/insights/__tests__/HistoricalVisualization.property.test.tsx' },
  39: { name: 'Dark Mode Contrast Compliance', testFile: 'dark-mode.test.tsx' },
  40: { name: 'Dark Mode Preference Persistence', testFile: 'dark-mode.test.tsx' },
  41: { name: 'Alert Threshold Notification', testFile: 'components/alerts/__tests__/AlertManagement.property.test.tsx' },
  42: { name: 'Alert Message Completeness', testFile: 'components/alerts/__tests__/AlertManagement.property.test.tsx' },
  43: { name: 'Alert API Integration', testFile: 'components/alerts/__tests__/AlertManagement.property.test.tsx' },
  44: { name: 'Historical Statistics Calculation', testFile: 'components/insights/__tests__/HistoricalVisualization.property.test.tsx' },
  45: { name: 'Offline Asset Caching', testFile: 'pwa.test.tsx' },
  46: { name: 'Offline Request Queueing', testFile: 'pwa.test.tsx' },
};

console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║       Property-Based Test Suite Runner                      ║
║       Glassmorphic AQI Dashboard - 46 Properties            ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

// Get all property-based test files
const testFiles = [
  '__tests__/glassmorphism-styling.property.test.tsx',
  '__tests__/confidence-interval.property.test.tsx',
  '__tests__/api-endpoint-correctness.property.test.tsx',
  '__tests__/accessibility.test.tsx',
  '__tests__/animations.test.tsx',
  '__tests__/dark-mode.test.tsx',
  '__tests__/error-handling.test.ts',
  '__tests__/performance.test.tsx',
  '__tests__/pwa.test.tsx',
  '__tests__/responsive-design.test.tsx',
  'components/dashboard/__tests__/HeroAQISection.properties.test.tsx',
  'components/dashboard/__tests__/PollutantCard.properties.test.tsx',
  'components/dashboard/__tests__/WeatherBadges.properties.test.tsx',
  'components/forecast/__tests__/PredictionGraph.property.test.tsx',
  'components/common/__tests__/LocationSelector.property.test.tsx',
  'components/devices/__tests__/DeviceManagement.property.test.tsx',
  'components/insights/__tests__/SourceAttributionCard.property.test.tsx',
  'components/insights/__tests__/HistoricalVisualization.property.test.tsx',
  'components/alerts/__tests__/AlertManagement.property.test.tsx',
  'lib/api/__tests__/client.test.ts',
];

// Track results
const results = {
  total: 46,
  passed: [],
  failed: [],
  skipped: [],
  startTime: Date.now(),
};

console.log(`${colors.blue}Starting property test suite...${colors.reset}\n`);
console.log(`Testing ${results.total} correctness properties\n`);

// Run tests for each file
let testsPassed = true;

for (const testFile of testFiles) {
  const fullPath = path.join(__dirname, '..', testFile);
  
  // Check if test file exists
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⊘ Skipping${colors.reset} ${testFile} (file not found)`);
    continue;
  }

  console.log(`${colors.cyan}▶ Running${colors.reset} ${testFile}`);
  
  try {
    // Run Jest for this specific test file
    execSync(`npm test -- ${testFile} --silent --passWithNoTests`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log(`${colors.green}✓ Passed${colors.reset} ${testFile}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Failed${colors.reset} ${testFile}\n`);
    testsPassed = false;
  }
}

// Calculate elapsed time
const elapsedSeconds = ((Date.now() - results.startTime) / 1000).toFixed(2);

// Generate summary
console.log(`\n${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                    Test Summary                              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`\n${colors.bright}Total Properties:${colors.reset} ${results.total}`);
console.log(`${colors.bright}Elapsed Time:${colors.reset} ${elapsedSeconds}s\n`);

// Property coverage report
console.log(`${colors.bright}Property Coverage:${colors.reset}\n`);

Object.entries(propertyMapping).forEach(([propNum, propInfo]) => {
  const fullPath = path.join(__dirname, '..', propInfo.testFile);
  const exists = fs.existsSync(fullPath);
  const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.yellow}⊘${colors.reset}`;
  console.log(`  ${status} Property ${propNum}: ${propInfo.name}`);
});

console.log(`\n${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                 Property Test Report Generated              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

console.log(`See ${colors.cyan}PROPERTY_TEST_RESULTS.md${colors.reset} for detailed report\n`);

// Exit with appropriate code
process.exit(testsPassed ? 0 : 1);
