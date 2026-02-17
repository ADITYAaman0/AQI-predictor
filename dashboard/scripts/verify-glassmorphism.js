/**
 * Verification script for Task 3.3: Global CSS and Glassmorphism Utilities
 * 
 * This script verifies that all required CSS classes and styles are present
 * in the globals.css file.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function verifyGlassmorphism() {
  log('\n🔍 Verifying Glassmorphism Utilities (Task 3.3)\n', 'cyan');
  
  const globalsPath = path.join(__dirname, '..', 'app', 'globals.css');
  const content = checkFile(globalsPath);
  
  if (!content) {
    log('❌ Cannot proceed without globals.css', 'red');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // Test 1: Glassmorphic Card Classes
  log('1. Checking Glassmorphic Card Classes...', 'blue');
  const glassCardTests = [
    { name: '.glass-card', pattern: /\.glass-card\s*{/ },
    { name: '.glass-card background', pattern: /background:\s*var\(--color-glass-light\)|background:\s*rgba\(255,\s*255,\s*255,\s*0\.1\)/ },
    { name: '.glass-card backdrop-filter', pattern: /backdrop-filter:\s*blur\(var\(--blur-glass\)\)|backdrop-filter:\s*blur\(20px\)/ },
    { name: '.glass-card border', pattern: /border:\s*1px\s+solid/ },
    { name: '.glass-card-dark', pattern: /\.glass-card-dark\s*{/ },
  ];

  glassCardTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 2: Dynamic Background Gradients
  log('\n2. Checking Dynamic Background Gradients...', 'blue');
  const gradientTests = [
    { name: '.bg-gradient-good', pattern: /\.bg-gradient-good/ },
    { name: '.bg-gradient-moderate', pattern: /\.bg-gradient-moderate/ },
    { name: '.bg-gradient-unhealthy', pattern: /\.bg-gradient-unhealthy/ },
    { name: '.bg-gradient-very-unhealthy', pattern: /\.bg-gradient-very-unhealthy/ },
    { name: '.bg-gradient-hazardous', pattern: /\.bg-gradient-hazardous/ },
  ];

  gradientTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 3: Animation Keyframes
  log('\n3. Checking Animation Keyframes...', 'blue');
  const animationTests = [
    { name: '@keyframes fadeIn', pattern: /@keyframes\s+fadeIn/ },
    { name: '@keyframes slideUp', pattern: /@keyframes\s+slideUp/ },
    { name: '@keyframes drawLine', pattern: /@keyframes\s+drawLine/ },
    { name: '@keyframes pulseGlow', pattern: /@keyframes\s+pulseGlow/ },
    { name: '.animate-fade-in', pattern: /\.animate-fade-in/ },
    { name: '.animate-slide-up', pattern: /\.animate-slide-up/ },
    { name: '.animate-pulse-glow', pattern: /\.animate-pulse-glow/ },
  ];

  animationTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 4: Hover Effects
  log('\n4. Checking Hover Effects...', 'blue');
  const hoverTests = [
    { name: '.hover-lift', pattern: /\.hover-lift/ },
    { name: '.hover-lift:hover', pattern: /\.hover-lift:hover/ },
    { name: '.hover-scale', pattern: /\.hover-scale/ },
    { name: '.hover-scale:active', pattern: /\.hover-scale:active/ },
  ];

  hoverTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 5: AQI Color Utilities
  log('\n5. Checking AQI Color Utilities...', 'blue');
  const colorTests = [
    { name: '.text-aqi-good', pattern: /\.text-aqi-good/ },
    { name: '.text-aqi-moderate', pattern: /\.text-aqi-moderate/ },
    { name: '.bg-aqi-good', pattern: /\.bg-aqi-good/ },
    { name: '.border-aqi-good', pattern: /\.border-aqi-good/ },
  ];

  colorTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 6: Typography Utilities
  log('\n6. Checking Typography Utilities...', 'blue');
  const typographyTests = [
    { name: '.text-display', pattern: /\.text-display/ },
    { name: '.text-h1', pattern: /\.text-h1/ },
    { name: '.text-h2', pattern: /\.text-h2/ },
    { name: '.text-body', pattern: /\.text-body/ },
    { name: '.text-caption', pattern: /\.text-caption/ },
    { name: '.text-micro', pattern: /\.text-micro/ },
  ];

  typographyTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 7: Focus Indicators
  log('\n7. Checking Focus Indicators...', 'blue');
  const focusTests = [
    { name: '.focus-glow:focus', pattern: /\.focus-glow:focus/ },
    { name: '.focus-ring:focus', pattern: /\.focus-ring:focus/ },
  ];

  focusTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 8: Accessibility Features
  log('\n8. Checking Accessibility Features...', 'blue');
  const a11yTests = [
    { name: 'prefers-reduced-motion', pattern: /@media\s*\(prefers-reduced-motion:\s*reduce\)/ },
    { name: 'prefers-contrast', pattern: /@media\s*\(prefers-contrast:\s*high\)/ },
  ];

  a11yTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Test 9: Design Tokens
  log('\n9. Checking Design Tokens...', 'blue');
  const tokenTests = [
    { name: 'AQI colors', pattern: /--color-aqi-good/ },
    { name: 'Glass colors', pattern: /--color-glass-light/ },
    { name: 'Spacing scale', pattern: /--spacing-xs/ },
    { name: 'Typography scale', pattern: /--font-size-display/ },
    { name: 'Shadow levels', pattern: /--shadow-level-1/ },
    { name: 'Animation durations', pattern: /--duration-fast/ },
  ];

  tokenTests.forEach(test => {
    if (test.pattern.test(content)) {
      log(`  ✓ ${test.name}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${test.name}`, 'red');
      failed++;
    }
  });

  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log(`Total Tests: ${passed + failed}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('='.repeat(50) + '\n', 'cyan');

  if (failed === 0) {
    log('✅ All glassmorphism utilities verified successfully!', 'green');
    log('✅ Task 3.3 requirements met:', 'green');
    log('   - Glassmorphic card classes ✓', 'green');
    log('   - Dynamic background classes ✓', 'green');
    log('   - Animation keyframes ✓', 'green');
    log('   - Hover effects ✓', 'green');
    log('   - AQI color utilities ✓', 'green');
    log('   - Typography utilities ✓', 'green');
    log('   - Focus indicators ✓', 'green');
    log('   - Accessibility features ✓', 'green');
    return true;
  } else {
    log('❌ Some tests failed. Please review the globals.css file.', 'red');
    return false;
  }
}

// Run verification
const success = verifyGlassmorphism();
process.exit(success ? 0 : 1);
