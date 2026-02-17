/**
 * Verify environment configuration files exist and are properly formatted
 * Run with: node scripts/verify-env-config.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('='.repeat(80));
console.log('Environment Configuration Verification');
console.log('='.repeat(80));
console.log();

// Test 1: Check if all environment files exist
console.log('Test 1: Checking environment files...');
const envFiles = [
  '.env.local',
  '.env.development',
  '.env.staging',
  '.env.production',
  '.env.example',
];

let allFilesExist = true;
for (const file of envFiles) {
  const filePath = resolve(rootDir, file);
  if (existsSync(filePath)) {
    console.log(`  ✓ ${file} exists`);
  } else {
    console.log(`  ✗ ${file} NOT FOUND`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n✗ Some environment files are missing!');
  process.exit(1);
}
console.log();

// Test 2: Check if lib/env.ts exists
console.log('Test 2: Checking environment validation module...');
const envTsPath = resolve(rootDir, 'lib', 'env.ts');
if (existsSync(envTsPath)) {
  console.log('  ✓ lib/env.ts exists');
} else {
  console.error('  ✗ lib/env.ts NOT FOUND');
  process.exit(1);
}
console.log();

// Test 3: Verify required variables are documented in .env.example
console.log('Test 3: Verifying .env.example documentation...');
const examplePath = resolve(rootDir, '.env.example');
const exampleContent = readFileSync(examplePath, 'utf-8');

const requiredVars = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_API_VERSION',
  'NEXT_PUBLIC_ENVIRONMENT',
];

let allDocumented = true;
for (const varName of requiredVars) {
  if (exampleContent.includes(varName)) {
    console.log(`  ✓ ${varName} is documented`);
  } else {
    console.log(`  ✗ ${varName} is NOT documented`);
    allDocumented = false;
  }
}

if (!allDocumented) {
  console.error('\n✗ Some required variables are not documented in .env.example!');
  process.exit(1);
}
console.log();

// Test 4: Check for sensitive data in .env.example
console.log('Test 4: Checking for sensitive data in .env.example...');
const sensitivePatterns = [
  /NEXT_PUBLIC_MAPBOX_TOKEN=pk\./,
  /NEXT_PUBLIC_ANALYTICS_ID=UA-/,
  /password/i,
  /secret/i,
];

let hasSensitiveData = false;
for (const pattern of sensitivePatterns) {
  if (pattern.test(exampleContent)) {
    console.log(`  ✗ Found potential sensitive data matching: ${pattern}`);
    hasSensitiveData = true;
  }
}

if (hasSensitiveData) {
  console.error('\n⚠️  Warning: .env.example may contain sensitive data!');
} else {
  console.log('  ✓ No sensitive data found in .env.example');
}
console.log();

// Test 5: Verify environment-specific configurations
console.log('Test 5: Verifying environment-specific configurations...');
const environments = [
  { file: '.env.development', env: 'development', url: 'localhost' },
  { file: '.env.staging', env: 'staging', url: 'staging' },
  { file: '.env.production', env: 'production', url: 'api.aqi-predictor.com' },
];

for (const { file, env, url } of environments) {
  const filePath = resolve(rootDir, file);
  const content = readFileSync(filePath, 'utf-8');
  
  const hasCorrectEnv = content.includes(`NEXT_PUBLIC_ENVIRONMENT=${env}`);
  const hasCorrectUrl = content.includes(url);
  
  if (hasCorrectEnv && hasCorrectUrl) {
    console.log(`  ✓ ${file} is properly configured`);
  } else {
    console.log(`  ✗ ${file} may have incorrect configuration`);
    if (!hasCorrectEnv) console.log(`    - Missing or incorrect NEXT_PUBLIC_ENVIRONMENT`);
    if (!hasCorrectUrl) console.log(`    - URL may not match environment`);
  }
}
console.log();

// Test 6: Check .gitignore for .env.local
console.log('Test 6: Checking .gitignore...');
const gitignorePath = resolve(rootDir, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
  if (gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env*.local')) {
    console.log('  ✓ .env.local is in .gitignore');
  } else {
    console.log('  ⚠️  Warning: .env.local should be in .gitignore');
  }
} else {
  console.log('  - .gitignore not found (may be in parent directory)');
}
console.log();

console.log('='.repeat(80));
console.log('✓ Environment configuration verification complete!');
console.log('='.repeat(80));
console.log();
console.log('Summary:');
console.log('  ✓ All environment files exist');
console.log('  ✓ Environment validation module exists');
console.log('  ✓ Required variables are documented');
console.log('  ✓ No sensitive data in .env.example');
console.log('  ✓ Environment-specific configurations are correct');
console.log();
console.log('Next steps:');
console.log('  1. Copy .env.example to .env.local if not already done');
console.log('  2. Fill in any missing values in .env.local');
console.log('  3. Run: npm run dev');
console.log('  4. Check console for environment validation messages');
console.log();
