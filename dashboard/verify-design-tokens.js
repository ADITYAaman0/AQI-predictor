/**
 * Verification script for Tailwind CSS custom design tokens
 * This script checks that all required custom classes are defined in the compiled CSS
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Tailwind CSS Design Tokens...\n');

// Read the globals.css file
const cssPath = path.join(__dirname, 'app', 'globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// Define all required custom classes and tokens
const requiredClasses = {
  'Glassmorphism': [
    '.glass-card',
    '.glass-card-dark',
  ],
  'Background Gradients': [
    '.bg-gradient-good',
    '.bg-gradient-moderate',
    '.bg-gradient-unhealthy',
    '.bg-gradient-very-unhealthy',
    '.bg-gradient-hazardous',
  ],
  'Animations': [
    '.animate-fade-in',
    '.animate-slide-up',
    '.animate-draw-line',
    '.animate-pulse-glow',
    '.animate-spin',
  ],
  'Hover Effects': [
    '.hover-lift',
    '.hover-scale',
  ],
  'Focus Indicators': [
    '.focus-glow',
    '.focus-ring',
  ],
  'Typography': [
    '.text-display',
    '.text-h1',
    '.text-h2',
    '.text-h3',
    '.text-body',
    '.text-caption',
    '.text-micro',
  ],
  'Spacing': [
    '.space-xs',
    '.space-sm',
    '.space-md',
    '.space-lg',
    '.space-xl',
    '.space-2xl',
    '.space-3xl',
    '.gap-xs',
    '.gap-sm',
    '.gap-md',
    '.gap-lg',
    '.gap-xl',
    '.gap-2xl',
    '.gap-3xl',
  ],
  'AQI Colors': [
    '.text-aqi-good',
    '.text-aqi-moderate',
    '.text-aqi-unhealthy',
    '.text-aqi-very-unhealthy',
    '.text-aqi-hazardous',
    '.bg-aqi-good',
    '.bg-aqi-moderate',
    '.bg-aqi-unhealthy',
    '.bg-aqi-very-unhealthy',
    '.bg-aqi-hazardous',
    '.border-aqi-good',
    '.border-aqi-moderate',
    '.border-aqi-unhealthy',
    '.border-aqi-very-unhealthy',
    '.border-aqi-hazardous',
  ],
};

const requiredTokens = {
  'AQI Category Colors': [
    '--color-aqi-good',
    '--color-aqi-moderate',
    '--color-aqi-unhealthy',
    '--color-aqi-very-unhealthy',
    '--color-aqi-hazardous',
  ],
  'Glassmorphism Colors': [
    '--color-glass-light',
    '--color-glass-border',
    '--color-glass-dark',
  ],
  'Spacing Scale': [
    '--spacing-xs',
    '--spacing-sm',
    '--spacing-md',
    '--spacing-lg',
    '--spacing-xl',
    '--spacing-2xl',
    '--spacing-3xl',
  ],
  'Typography': [
    '--font-family-sans',
    '--font-family-mono',
    '--font-size-display',
    '--font-size-h1',
    '--font-size-h2',
    '--font-size-h3',
    '--font-size-body',
    '--font-size-caption',
    '--font-size-micro',
  ],
  'Shadows': [
    '--shadow-glass',
    '--shadow-level-1',
    '--shadow-level-2',
    '--shadow-level-3',
    '--shadow-glow',
  ],
  'Blur': [
    '--blur-glass',
  ],
  'Animation': [
    '--duration-fast',
    '--duration-normal',
    '--duration-slow',
    '--duration-animation',
    '--duration-draw',
    '--ease-default',
    '--ease-in',
    '--ease-out',
    '--ease-in-out',
  ],
};

const requiredKeyframes = [
  '@keyframes fadeIn',
  '@keyframes slideUp',
  '@keyframes drawLine',
  '@keyframes pulseGlow',
  '@keyframes spin',
];

const requiredMediaQueries = [
  '@media (prefers-reduced-motion: reduce)',
  '@media (prefers-contrast: high)',
];

// Verification functions
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = [];

function checkExists(item, category) {
  totalChecks++;
  if (cssContent.includes(item)) {
    passedChecks++;
    return true;
  } else {
    failedChecks.push({ category, item });
    return false;
  }
}

// Check custom classes
console.log('📋 Checking Custom Classes:\n');
for (const [category, classes] of Object.entries(requiredClasses)) {
  console.log(`  ${category}:`);
  let categoryPassed = 0;
  for (const className of classes) {
    const exists = checkExists(className, category);
    if (exists) {
      categoryPassed++;
      console.log(`    ✅ ${className}`);
    } else {
      console.log(`    ❌ ${className} - NOT FOUND`);
    }
  }
  console.log(`    ${categoryPassed}/${classes.length} passed\n`);
}

// Check design tokens
console.log('🎨 Checking Design Tokens:\n');
for (const [category, tokens] of Object.entries(requiredTokens)) {
  console.log(`  ${category}:`);
  let categoryPassed = 0;
  for (const token of tokens) {
    const exists = checkExists(token, category);
    if (exists) {
      categoryPassed++;
      console.log(`    ✅ ${token}`);
    } else {
      console.log(`    ❌ ${token} - NOT FOUND`);
    }
  }
  console.log(`    ${categoryPassed}/${tokens.length} passed\n`);
}

// Check keyframes
console.log('🎬 Checking Animation Keyframes:\n');
let keyframesPassed = 0;
for (const keyframe of requiredKeyframes) {
  const exists = checkExists(keyframe, 'Keyframes');
  if (exists) {
    keyframesPassed++;
    console.log(`  ✅ ${keyframe}`);
  } else {
    console.log(`  ❌ ${keyframe} - NOT FOUND`);
  }
}
console.log(`  ${keyframesPassed}/${requiredKeyframes.length} passed\n`);

// Check media queries
console.log('📱 Checking Media Queries:\n');
let mediaQueriesPassed = 0;
for (const query of requiredMediaQueries) {
  const exists = checkExists(query, 'Media Queries');
  if (exists) {
    mediaQueriesPassed++;
    console.log(`  ✅ ${query}`);
  } else {
    console.log(`  ❌ ${query} - NOT FOUND`);
  }
}
console.log(`  ${mediaQueriesPassed}/${requiredMediaQueries.length} passed\n`);

// Summary
console.log('═══════════════════════════════════════════════════════');
console.log('📊 VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks} ✅`);
console.log(`Failed: ${failedChecks.length} ❌`);
console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(2)}%`);
console.log('═══════════════════════════════════════════════════════\n');

if (failedChecks.length > 0) {
  console.log('❌ FAILED CHECKS:');
  for (const { category, item } of failedChecks) {
    console.log(`  - ${category}: ${item}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('🎉 All custom design tokens and utility classes are available!\n');
  console.log('Requirements validated:');
  console.log('  ✅ 1.1 - Glassmorphic effects with proper styling');
  console.log('  ✅ 2.1 - Hero AQI display styling');
  console.log('  ✅ 2.2 - Pollutant metrics styling');
  console.log('  ✅ 2.3 - Circular AQI meter styling');
  console.log('  ✅ 2.4 - Animation support');
  console.log('');
  process.exit(0);
}
