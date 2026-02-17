# End-to-End Tests

This directory contains E2E tests for the AQI Dashboard using Playwright.

## 📁 Structure

```
e2e/
├── utils.ts                     # Test utilities and helpers
├── critical-flows.spec.ts       # Critical user flow tests
├── mobile.spec.ts               # Mobile-specific tests
├── offline.spec.ts              # Offline functionality tests
├── visual-regression.spec.ts    # Visual regression tests
├── visual-responsive.spec.ts    # Responsive visual tests
└── visual-utils.ts              # Visual testing utilities
```

## 🚀 Quick Start

### 1. Install Playwright Browsers

```bash
npx playwright install
```

### 2. Start Dev Server

```bash
npm run dev
```

### 3. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see the browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug
```

## 📋 Test Suites

### Critical Flows (`critical-flows.spec.ts`)
Tests for essential user journeys:
- View current AQI
- Switch locations
- View forecast
- Configure alerts
- Toggle dark mode

### Mobile Tests (`mobile.spec.ts`)
Tests for mobile-specific interactions:
- Touch interactions
- Swipe gestures
- Mobile navigation
- Responsive layouts

### Offline Tests (`offline.spec.ts`)
Tests for offline capabilities:
- Offline detection
- Cached data display
- Request queueing
- Service Worker behavior

### Visual Regression Tests (`visual-regression.spec.ts`)
Tests for detecting visual changes in UI:
- Component snapshots (Hero, Pollutant Cards, Forecast, etc.)
- Different AQI levels (Good, Moderate, Unhealthy, etc.)
- Light and dark mode comparison
- Loading and error state snapshots
- Interactive state snapshots (hover, tooltips)
- Glassmorphism effects testing

### Responsive Visual Tests (`visual-responsive.spec.ts`)
Tests for responsive layout consistency:
- Desktop layouts (1920px, 1440px, 1024px)
- Tablet layouts (768px portrait/landscape)
- Mobile layouts (375px, 320px)
- Cross-device consistency tests
- Dark mode on all viewports

**Learn more**: See [VISUAL_REGRESSION_TESTING_GUIDE.md](../VISUAL_REGRESSION_TESTING_GUIDE.md) for detailed documentation.

## 🎯 Running Specific Tests

### Run specific test file
```bash
npx playwright test e2e/mobile.spec.ts
```

### Run specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run mobile tests only
```bash
npm run test:e2e:mobile
```

### Run visual regression tests
```bash
# Run all visual tests
npm run test:visual

# Run only responsive tests
npm run test:visual:responsive

# Update visual baselines
npm run test:visual:update

# View visual test report
npm run test:visual:report
```

### Run tests matching a pattern
```bash
npx playwright test --grep "offline"
npx playwright test --grep "dark mode"
```

## 🔧 Test Utilities

The `utils.ts` file provides helper functions:

### Navigation
- `navigateToHome(page)` - Navigate to dashboard home
- `navigateToView(page, viewName)` - Navigate to specific view
- `waitForAQIData(page)` - Wait for AQI data to load

### Interactions
- `toggleDarkMode(page)` - Toggle dark mode
- `refreshData(page)` - Click refresh button
- `searchLocation(page, location)` - Search for location

### Assertions
- `assertAQIVisible(page)` - Assert AQI is displayed
- `assertPollutantCardsVisible(page)` - Assert pollutants shown
- `assertForecastVisible(page)` - Assert forecast displayed

### Mobile
- `swipe(page, selector, direction)` - Perform swipe gesture
- `assertTouchTargetSize(page, selector)` - Check touch target size

### Offline
- `goOffline(page)` - Simulate offline mode
- `goOnline(page)` - Restore online mode
- `assertOfflineIndicatorVisible(page)` - Check offline indicator

### Accessibility
- `runAccessibilityAudit(page)` - Run axe accessibility audit

## 📊 Viewing Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

Or open `playwright-report/index.html` in your browser.

## 🐛 Debugging

### Method 1: UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

Benefits:
- Interactive test runner
- Time-travel debugging
- Watch mode
- Pick specific tests

### Method 2: Debug Mode
```bash
npm run test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Method 3: Headed Mode
```bash
npm run test:e2e:headed
```

See the browser while tests run.

### Method 4: Add Breakpoints
Add `await page.pause()` in your test to pause execution:

```typescript
test('my test', async ({ page }) => {
  await navigateToHome(page);
  await page.pause(); // Pauses here
  await assertAQIVisible(page);
});
```

## 📝 Writing New Tests

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { navigateToHome, waitForAQIData, assertAQIVisible } from './utils';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Interact
    const button = page.getByRole('button', { name: /click me/i });
    await button.click();
    
    // Assert
    await assertAQIVisible(page);
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors:
   ```typescript
   const element = page.locator('[data-testid="my-element"]');
   ```

2. **Use semantic selectors** when possible:
   ```typescript
   const button = page.getByRole('button', { name: /submit/i });
   const heading = page.getByRole('heading', { name: /title/i });
   ```

3. **Wait for elements** before interacting:
   ```typescript
   await page.waitForSelector('[data-testid="element"]');
   await element.click();
   ```

4. **Use helper functions** from utils.ts:
   ```typescript
   await navigateToHome(page);
   await assertAQIVisible(page);
   ```

5. **Group related tests** with describe blocks:
   ```typescript
   test.describe('Feature Name', () => {
     test('scenario 1', async ({ page }) => { ... });
     test('scenario 2', async ({ page }) => { ... });
   });
   ```

## 🌐 Browser Configuration

Tests run on multiple browsers by default:
- Chromium (Chrome-like)
- Firefox
- WebKit (Safari-like)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

Configure in `playwright.config.ts`.

## ⚙️ Configuration

Edit `playwright.config.ts` to customize:
- Base URL
- Timeout settings
- Number of workers
- Screenshot/video settings
- Browser projects

## 🔒 Environment Variables

Set `PLAYWRIGHT_TEST_BASE_URL` to override the base URL:

```bash
PLAYWRIGHT_TEST_BASE_URL=http://localhost:4000 npm run test:e2e
```

## 🚨 Troubleshooting

### Tests timing out
Increase timeouts in `playwright.config.ts`:
```typescript
use: {
  navigationTimeout: 60000,
  actionTimeout: 20000,
}
```

### Browsers not installed
```bash
npx playwright install --with-deps
```

### Dev server not starting
Check if port 3000 is available or update `baseURL` in config.

### Flaky tests
Add explicit waits:
```typescript
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="element"]');
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-page)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Task 26 Completion Summary](../TASK_26_COMPLETION_SUMMARY.md)

## 🆘 Need Help?

- Check test output and error messages
- Use UI mode for debugging: `npm run test:e2e:ui`
- Review existing tests for examples
- Consult Playwright documentation
- Check screenshots/videos in `test-results/` folder
