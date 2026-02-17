/**
 * Visual Regression Snapshot Management Script
 * 
 * Script to help review and manage visual regression snapshots
 * Implements Task 27.4 - Review and Approve Snapshots
 * 
 * Usage:
 * - Review snapshots: node scripts/manage-visual-snapshots.js review
 * - Approve all: node scripts/manage-visual-snapshots.js approve
 * - Reject all: node scripts/manage-visual-snapshots.js reject
 * - Generate report: node scripts/manage-visual-snapshots.js report
 */

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

/**
 * Get visual regression test directories
 */
function getSnapshotDirectories() {
  const e2eDir = path.join(__dirname, '..', 'e2e');
  const snapshotDirs = [];

  // Look for snapshot directories
  const patterns = [
    path.join(e2eDir, '__snapshots__'),
    path.join(e2eDir, 'visual-regression.spec.ts-snapshots'),
    path.join(e2eDir, 'visual-responsive.spec.ts-snapshots'),
  ];

  for (const dir of patterns) {
    if (fs.existsSync(dir)) {
      snapshotDirs.push(dir);
    }
  }

  return snapshotDirs;
}

/**
 * Get all snapshot files
 */
function getAllSnapshots() {
  const snapshotDirs = getSnapshotDirectories();
  const snapshots = [];

  for (const dir of snapshotDirs) {
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      if (file.endsWith('.png')) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        snapshots.push({
          path: fullPath,
          name: file,
          directory: dir,
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }
  }

  return snapshots;
}

/**
 * Get snapshot differences
 */
function getSnapshotDiffs() {
  const snapshotDirs = getSnapshotDirectories();
  const diffs = [];

  for (const dir of snapshotDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      // Look for diff images (Playwright creates these)
      if (file.includes('-diff') && file.endsWith('.png')) {
        const fullPath = path.join(dir, file);
        const actualPath = fullPath.replace('-diff.png', '-actual.png');
        const expectedPath = fullPath.replace('-diff.png', '.png');

        diffs.push({
          diff: fullPath,
          actual: actualPath,
          expected: expectedPath,
          name: file.replace('-diff.png', ''),
        });
      }
    }
  }

  return diffs;
}

/**
 * Generate snapshot report
 */
function generateReport() {
  console.log(colorize('\n📊 Visual Regression Snapshot Report\n', COLORS.bright));
  console.log('='.repeat(60));

  const snapshots = getAllSnapshots();
  const diffs = getSnapshotDiffs();

  // Summary
  console.log(colorize('\n📈 Summary:', COLORS.bright));
  console.log(`   Total Snapshots: ${colorize(snapshots.length, COLORS.cyan)}`);
  console.log(`   Detected Diffs:  ${colorize(diffs.length, diffs.length > 0 ? COLORS.red : COLORS.green)}`);

  // Calculate total size
  const totalSize = snapshots.reduce((sum, s) => sum + s.size, 0);
  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`   Total Size:      ${colorize(sizeMB + ' MB', COLORS.cyan)}`);

  // Snapshot breakdown by category
  console.log(colorize('\n📁 Snapshot Categories:', COLORS.bright));
  
  const categories = {
    'AQI Levels': snapshots.filter(s => s.name.includes('aqi-')).length,
    'Dark Mode': snapshots.filter(s => s.name.includes('dark')).length,
    'Components': snapshots.filter(s => s.name.includes('component-')).length,
    'States': snapshots.filter(s => s.name.includes('state-')).length,
    'Responsive': snapshots.filter(s => s.name.includes('responsive-')).length,
    'Interactive': snapshots.filter(s => s.name.includes('interactive-')).length,
    'Glass Effects': snapshots.filter(s => s.name.includes('glass-')).length,
  };

  for (const [category, count] of Object.entries(categories)) {
    if (count > 0) {
      console.log(`   ${category.padEnd(20)} ${colorize(count, COLORS.cyan)}`);
    }
  }

  // Responsive breakdown
  console.log(colorize('\n📱 Responsive Snapshots:', COLORS.bright));
  const responsiveSnapshots = snapshots.filter(s => s.name.includes('responsive-'));
  const responsiveBySize = {
    'Desktop (1920px)': responsiveSnapshots.filter(s => s.name.includes('1920')).length,
    'Desktop (1440px)': responsiveSnapshots.filter(s => s.name.includes('1440')).length,
    'Laptop (1024px)': responsiveSnapshots.filter(s => s.name.includes('1024')).length,
    'Tablet (768px)': responsiveSnapshots.filter(s => s.name.includes('768')).length,
    'Mobile (375px)': responsiveSnapshots.filter(s => s.name.includes('375')).length,
    'Small Mobile (320px)': responsiveSnapshots.filter(s => s.name.includes('320')).length,
  };

  for (const [size, count] of Object.entries(responsiveBySize)) {
    if (count > 0) {
      console.log(`   ${size.padEnd(25)} ${colorize(count, COLORS.cyan)}`);
    }
  }

  // Detected differences
  if (diffs.length > 0) {
    console.log(colorize('\n⚠️  Detected Visual Differences:', COLORS.yellow));
    diffs.forEach((diff, index) => {
      console.log(`   ${index + 1}. ${colorize(diff.name, COLORS.red)}`);
      console.log(`      Diff:     ${diff.diff}`);
      console.log(`      Expected: ${diff.expected}`);
      console.log(`      Actual:   ${diff.actual}`);
    });
    console.log(colorize('\n   Review these differences carefully before approving!', COLORS.yellow));
    console.log(colorize('   To update snapshots, run:', COLORS.bright));
    console.log(colorize('   npm run test:visual:update\n', COLORS.cyan));
  } else {
    console.log(colorize('\n✅ No visual differences detected!', COLORS.green));
  }

  // Recent snapshots
  console.log(colorize('\n🕒 Recently Modified Snapshots (Last 5):', COLORS.bright));
  const recentSnapshots = snapshots
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 5);

  recentSnapshots.forEach((snapshot, index) => {
    const relativeTime = getRelativeTime(snapshot.modified);
    console.log(`   ${index + 1}. ${snapshot.name} (${colorize(relativeTime, COLORS.cyan)})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(colorize('\n✨ Report generated successfully!\n', COLORS.green));
}

/**
 * Get relative time string
 */
function getRelativeTime(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Review snapshots
 */
function reviewSnapshots() {
  console.log(colorize('\n🔍 Reviewing Visual Regression Snapshots\n', COLORS.bright));
  console.log('='.repeat(60));

  const diffs = getSnapshotDiffs();

  if (diffs.length === 0) {
    console.log(colorize('\n✅ No differences to review!', COLORS.green));
    console.log(colorize('   All visual regression tests passed.\n', COLORS.green));
    return;
  }

  console.log(colorize(`\nFound ${diffs.length} visual difference(s):\n`, COLORS.yellow));

  diffs.forEach((diff, index) => {
    console.log(colorize(`${index + 1}. ${diff.name}`, COLORS.bright));
    console.log(`   Diff Image:     ${diff.diff}`);
    console.log(`   Expected Image: ${diff.expected}`);
    console.log(`   Actual Image:   ${diff.actual}\n`);
  });

  console.log(colorize('Review Instructions:', COLORS.bright));
  console.log('1. Open the diff images to see what changed');
  console.log('2. Compare actual vs expected images');
  console.log('3. If changes are intentional, update snapshots:');
  console.log(colorize('   npm run test:visual:update', COLORS.cyan));
  console.log('4. If changes are bugs, fix the code and re-run tests:');
  console.log(colorize('   npm run test:visual\n', COLORS.cyan));
}

/**
 * Approve snapshots (update baselines)
 */
function approveSnapshots() {
  console.log(colorize('\n✅ Approving Visual Snapshots\n', COLORS.bright));
  console.log('='.repeat(60));

  const diffs = getSnapshotDiffs();

  if (diffs.length === 0) {
    console.log(colorize('\n✅ No differences to approve!\n', COLORS.green));
    return;
  }

  console.log(colorize('\nUpdating baseline snapshots...\n', COLORS.yellow));

  let approved = 0;
  for (const diff of diffs) {
    if (fs.existsSync(diff.actual) && fs.existsSync(diff.expected)) {
      // Copy actual to expected (update baseline)
      fs.copyFileSync(diff.actual, diff.expected);
      
      // Delete diff and actual files
      if (fs.existsSync(diff.diff)) fs.unlinkSync(diff.diff);
      if (fs.existsSync(diff.actual)) fs.unlinkSync(diff.actual);
      
      console.log(colorize(`✓ Approved: ${diff.name}`, COLORS.green));
      approved++;
    }
  }

  console.log(colorize(`\n✅ Approved ${approved} snapshot(s)!\n`, COLORS.green));
  console.log('Run tests again to verify:');
  console.log(colorize('npm run test:visual\n', COLORS.cyan));
}

/**
 * Reject snapshots (keep baseline, remove diffs)
 */
function rejectSnapshots() {
  console.log(colorize('\n❌ Rejecting Visual Changes\n', COLORS.bright));
  console.log('='.repeat(60));

  const diffs = getSnapshotDiffs();

  if (diffs.length === 0) {
    console.log(colorize('\n✅ No differences to reject!\n', COLORS.green));
    return;
  }

  console.log(colorize('\nRemoving diff and actual files...\n', COLORS.yellow));

  let rejected = 0;
  for (const diff of diffs) {
    // Delete diff and actual files, keep expected (baseline)
    if (fs.existsSync(diff.diff)) {
      fs.unlinkSync(diff.diff);
    }
    if (fs.existsSync(diff.actual)) {
      fs.unlinkSync(diff.actual);
    }
    
    console.log(colorize(`✓ Rejected: ${diff.name}`, COLORS.red));
    rejected++;
  }

  console.log(colorize(`\n✅ Rejected ${rejected} change(s)!\n`, COLORS.green));
  console.log('Fix the code and run tests again:');
  console.log(colorize('npm run test:visual\n', COLORS.cyan));
}

/**
 * Clean up old snapshots
 */
function cleanupSnapshots() {
  console.log(colorize('\n🧹 Cleaning Up Snapshots\n', COLORS.bright));
  console.log('='.repeat(60));

  const snapshotDirs = getSnapshotDirectories();
  let cleaned = 0;

  for (const dir of snapshotDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      // Remove diff and actual files
      if (file.includes('-diff.png') || file.includes('-actual.png')) {
        fs.unlinkSync(fullPath);
        console.log(colorize(`✓ Removed: ${file}`, COLORS.cyan));
        cleaned++;
      }
    }
  }

  if (cleaned === 0) {
    console.log(colorize('✨ No files to clean up!\n', COLORS.green));
  } else {
    console.log(colorize(`\n✅ Cleaned up ${cleaned} file(s)!\n`, COLORS.green));
  }
}

/**
 * Main command handler
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'report':
      generateReport();
      break;
    case 'review':
      reviewSnapshots();
      break;
    case 'approve':
      approveSnapshots();
      break;
    case 'reject':
      rejectSnapshots();
      break;
    case 'cleanup':
      cleanupSnapshots();
      break;
    default:
      console.log(colorize('\n📸 Visual Regression Snapshot Manager\n', COLORS.bright));
      console.log('='.repeat(60));
      console.log('\nAvailable commands:\n');
      console.log(`  ${colorize('report', COLORS.cyan)}   - Generate snapshot report`);
      console.log(`  ${colorize('review', COLORS.cyan)}   - Review snapshot differences`);
      console.log(`  ${colorize('approve', COLORS.cyan)}  - Approve all changes (update baselines)`);
      console.log(`  ${colorize('reject', COLORS.cyan)}   - Reject all changes (keep baselines)`);
      console.log(`  ${colorize('cleanup', COLORS.cyan)}  - Clean up diff files`);
      console.log('\nUsage:');
      console.log(colorize('  node scripts/manage-visual-snapshots.js [command]\n', COLORS.yellow));
      console.log('Examples:');
      console.log(colorize('  npm run test:visual:report', COLORS.cyan));
      console.log(colorize('  npm run test:visual:review', COLORS.cyan));
      console.log(colorize('  npm run test:visual:approve\n', COLORS.cyan));
  }
}

// Run the script
main();
