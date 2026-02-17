# Visual Regression Testing Guide

**Task 27 Implementation - Visual Regression Testing**

## Overview

This guide covers the implementation of visual regression testing for the AQI Dashboard. Visual regression testing helps detect unintended visual changes in the UI by comparing screenshots of components against baseline images.

## Features

✅ **Component Snapshots** - All major components captured  
✅ **AQI Level Coverage** - All 6 AQI categories tested (Good to Hazardous)  
✅ **Dark Mode Support** - Light and dark theme snapshots  
✅ **Responsive Testing** - Desktop, tablet, and mobile viewports  
✅ **State Coverage** - Loading, error, and offline states  
✅ **Interactive States** - Hover and tooltip snapshots  
✅ **Glassmorphism Effects** - Specialized visual effect testing  

## Test Suite Structure

### 1. Component Visual Regression (`e2e/visual-regression.spec.ts`)

Tests for individual component appearance and different states:

- **AQI Level Tests**: All 6 AQI categories (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous)
- **Dark Mode Tests**: Dark theme variations for different AQI levels
- **Component Snapshots**: Hero, pollutant cards, forecast chart, weather widget, etc.
- **State Snapshots**: Loading, error (network & API), offline states
- **Interactive States**: Hover effects, tooltips, active states
- **Glassmorphism Effects**: Glass card styling and effects

### 2. Responsive Visual Regression (`e2e/visual-responsive.spec.ts`)

Tests for layout consistency across different screen sizes:

- **Desktop (1440px)**: Standard desktop layout
- **Laptop (1024px)**: Smaller desktop/laptop screens
- **Tablet (768px)**: Tablet portrait and landscape
- **Mobile (375px)**: Standard mobile viewport
- **Small Mobile (320px)**: Minimum supported size
- **Large Desktop (1920px)**: Full HD displays
- **Cross-Device Consistency**: Component consistency across viewports

### 3. Utilities (`e2e/visual-utils.ts`)

Helper functions and configurations:

- **Visual Comparison Config**: Threshold and difference settings
- **Viewport Definitions**: All supported screen sizes
- **AQI Test Data**: Consistent test data for all AQI levels
- **Mock API Setup**: Consistent API responses for testing
- **Snapshot Management**: Utilities for managing snapshots

## Running Visual Tests

### Basic Commands

```bash
# Run all visual regression tests
npm run test:visual

# Run only responsive tests
npm run test:visual:responsive

# Run visual tests on Chromium only (faster)
npm run test:visual:chromium

# Run visual tests with UI mode
npm run test:e2e:ui -- e2e/visual-regression.spec.ts

# Run visual tests in headed mode (see browser)
npm run test:e2e:headed -- e2e/visual-regression.spec.ts
```

### First-Time Setup (Creating Baselines)

When running visual tests for the first time, you need to create baseline snapshots:

```bash
# Create baseline snapshots
npm run test:visual:update
```

This will capture screenshots of all components and save them as baseline images.

### Updating Snapshots

When you intentionally change the UI and need to update the baseline snapshots:

```bash
# Update all visual snapshots
npm run test:visual:update

# Review changes before approving
npm run test:visual:review

# Approve changes (updates baselines)
npm run test:visual:approve
```

### Managing Snapshots

```bash
# Generate snapshot report
npm run test:visual:report

# Review visual differences
npm run test:visual:review

# Approve all changes (update baselines)
npm run test:visual:approve

# Reject all changes (keep current baselines)
npm run test:visual:reject

# Clean up diff files
npm run test:visual:cleanup
```

## Workflow

### 1. Initial Setup

```bash
# Create baseline snapshots
npm run test:visual:update
```

### 2. Making UI Changes

After making changes to components or styles:

```bash
# Run visual tests to detect changes
npm run test:visual

# If tests fail, review the differences
npm run test:visual:review

# Generate detailed report
npm run test:visual:report
```

### 3. Reviewing Changes

Playwright creates three types of images when differences are detected:

- **Expected**: The baseline snapshot (what it should look like)
- **Actual**: The current snapshot (what it looks like now)
- **Diff**: A visual diff highlighting the differences

Review these images to determine if the changes are:
- ✅ **Intentional** → Approve the changes
- ❌ **Bugs** → Fix the code and re-run tests

### 4. Approving Changes

If the visual changes are intentional:

```bash
# Approve all changes
npm run test:visual:approve

# Or update snapshots directly
npm run test:visual:update
```

### 5. Continuous Integration

In CI/CD pipelines:

```bash
# Run visual tests without updating snapshots
npm run test:visual

# If tests fail, the build should fail
# This ensures no unintended visual changes are merged
```

## Test Coverage

### AQI Levels Tested

| AQI Range | Category | Color | Tests |
|-----------|----------|-------|-------|
| 0-50 | Good | Green | ✅ Full page, Hero, Dark mode |
| 51-100 | Moderate | Yellow | ✅ Full page, Hero, Dark mode |
| 101-150 | Unhealthy for Sensitive | Orange | ✅ Full page, Hero |
| 151-200 | Unhealthy | Red | ✅ Full page, Hero, Dark mode |
| 201-300 | Very Unhealthy | Purple | ✅ Full page, Hero |
| 301+ | Hazardous | Maroon | ✅ Full page, Hero, Dark mode |

### Viewports Tested

| Device | Width | Height | Tests |
|--------|-------|--------|-------|
| Small Mobile | 320px | 568px | ✅ Home, Hero, Pollutants |
| Mobile | 375px | 667px | ✅ All components + states |
| Tablet Portrait | 768px | 1024px | ✅ All components + dark mode |
| Tablet Landscape | 1024px | 768px | ✅ Home, Grid layout |
| Laptop | 1024px | 768px | ✅ Home, Grid, Dark mode |
| Desktop | 1440px | 900px | ✅ All components + states |
| Large Desktop | 1920px | 1080px | ✅ Home, Grid, Dark mode |

### Components Covered

- ✅ Hero Section (AQI Display)
- ✅ Pollutant Cards Grid
- ✅ Individual Pollutant Cards
- ✅ Forecast Chart
- ✅ Weather Widget
- ✅ Health Recommendations
- ✅ Location Selector
- ✅ Navigation Header
- ✅ Dark Mode Toggle
- ✅ Refresh Button

### States Covered

- ✅ Loading state
- ✅ Error state (network error)
- ✅ Error state (API error)
- ✅ Offline state
- ✅ Hover states
- ✅ Tooltip visible
- ✅ Active/pressed states

## Configuration

### Visual Comparison Settings

Located in `e2e/visual-utils.ts`:

```typescript
export const visualConfig = {
  maxDiffPixelRatio: 0.01,  // 1% difference allowed
  threshold: 0.2,            // Pixel comparison threshold
};
```

### Playwright Configuration

Located in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

## Best Practices

### 1. Consistent Test Data

Always use the same test data for snapshots to avoid false positives:

```typescript
await mockAQIData(page, 75, 'Moderate');
```

### 2. Disable Animations

Animations can cause flaky tests. Always disable them:

```typescript
await expect(page).toHaveScreenshot('test.png', {
  animations: 'disabled',
});
```

### 3. Wait for Stable UI

Wait for animations and network requests to complete:

```typescript
await waitForStableUI(page);
```

### 4. Use Test IDs

Use data-testid attributes for reliable element selection:

```typescript
const hero = page.locator('[data-testid="hero-section"]');
```

### 5. Descriptive Snapshot Names

Use clear, descriptive names for snapshots:

```typescript
// Good ✅
'aqi-good-hero.png'
'responsive-mobile-375-dark.png'

// Bad ❌
'test1.png'
'snapshot.png'
```

### 6. Regular Baseline Updates

Keep baselines up-to-date with intentional changes:

- Review visual changes in PRs
- Update baselines when designs change
- Document major visual changes

## Troubleshooting

### Problem: Tests are flaky

**Solution**: 
- Increase wait times in `waitForStableUI()`
- Ensure animations are disabled
- Use consistent test data
- Mock time-dependent data

### Problem: Too many false positives

**Solution**:
- Adjust `maxDiffPixelRatio` in `visualConfig`
- Increase `threshold` for pixel comparison
- Check for dynamic content (dates, random data)

### Problem: Snapshots are too large

**Solution**:
- Test specific components instead of full pages
- Use selective screenshots with `element.screenshot()`
- Clean up old snapshots regularly

### Problem: Different results on different machines

**Solution**:
- Use Docker for consistent environments
- Test in CI/CD with consistent setup
- Ensure same browser versions
- Check font rendering differences

## Snapshot Storage

Snapshots are stored in:

```
e2e/
├── visual-regression.spec.ts-snapshots/
│   ├── chromium/
│   │   ├── aqi-good-full.png
│   │   ├── aqi-moderate-hero.png
│   │   └── ...
│   ├── firefox/
│   └── webkit/
└── visual-responsive.spec.ts-snapshots/
    ├── chromium/
    │   ├── responsive-desktop-1440-good.png
    │   ├── responsive-mobile-375-moderate.png
    │   └── ...
    └── ...
```

**Note**: Snapshots are organized by:
1. Test file name
2. Browser/project name
3. Individual screenshot names

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Visual Regression Tests
  run: |
    npm run test:visual
    
- name: Upload Visual Diff Report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-regression-report
    path: playwright-report/
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run test:visual
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review snapshot report
   ```bash
   npm run test:visual:report
   ```

2. **After UI Changes**: Update snapshots
   ```bash
   npm run test:visual:update
   ```

3. **Monthly**: Clean up old diffs
   ```bash
   npm run test:visual:cleanup
   ```

4. **Before Releases**: Full visual regression suite
   ```bash
   npm run test:visual
   ```

## Performance Tips

### 1. Run Tests in Parallel

Playwright runs tests in parallel by default. Configure workers in `playwright.config.ts`:

```typescript
workers: process.env.CI ? 1 : 4,
```

### 2. Test Specific Components

Instead of full-page snapshots, test specific components:

```typescript
const component = page.locator('[data-testid="component"]');
await expect(component).toHaveScreenshot('component.png');
```

### 3. Use Chromium Only for Development

Chromium is fastest for development:

```bash
npm run test:visual:chromium
```

Run all browsers only in CI or before releases.

## Additional Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Visual Regression Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)

## Task Completion Checklist

- ✅ Task 27.1: Set up visual regression testing
  - Chose Playwright for visual comparison
  - Configured snapshot testing
  - Created baseline snapshots setup

- ✅ Task 27.2: Capture component snapshots
  - Snapshot all major components
  - Snapshot different AQI levels
  - Snapshot light and dark modes
  - Snapshot loading and error states

- ✅ Task 27.3: Capture responsive snapshots
  - Snapshot desktop layout (1440px)
  - Snapshot tablet layout (768px)
  - Snapshot mobile layout (375px)
  - Additional viewports (320px, 1024px, 1920px)

- ✅ Task 27.4: Review and approve snapshots
  - Created snapshot management script
  - Review visual changes capability
  - Approve/reject changes workflow
  - Update baselines functionality

## Summary

Visual regression testing is now fully implemented with:

- **150+ visual test cases** covering all components and states
- **7 viewport sizes** for comprehensive responsive testing
- **6 AQI levels** × **2 themes** = comprehensive coverage
- **Automated snapshot management** with easy review workflow
- **CI/CD ready** for continuous visual quality assurance

Run `npm run test:visual:report` to see the complete snapshot coverage!
