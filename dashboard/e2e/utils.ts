/**
 * Playwright Test Utilities
 * 
 * Helper functions and utilities for E2E tests
 * Implements Task 26.1 - Set up Playwright
 * 
 * Features:
 * - Common test setup and teardown
 * - Navigation helpers
 * - Element interaction helpers
 * - Accessibility testing helpers
 * - Mock data helpers
 * 
 * Requirements: Testing Strategy
 */

import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to the dashboard home page
 */
export async function navigateToHome(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a specific view/tab
 */
export async function navigateToView(page: Page, viewName: string): Promise<void> {
  const tabButton = page.getByRole('tab', { name: new RegExp(viewName, 'i') });
  await tabButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for AQI data to load
 */
export async function waitForAQIData(page: Page): Promise<void> {
  // Wait for the hero AQI section to be visible and not showing loading state
  await page.waitForSelector('[data-testid="hero-aqi-section"]', { timeout: 10000 });
  
  // Wait for loading skeleton to disappear
  await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 });
  
  // Wait for AQI value to be displayed
  await page.waitForSelector('[data-testid="aqi-meter-value"]', { timeout: 10000 });
}

// ============================================================================
// Element Interaction Helpers
// ============================================================================

/**
 * Fill location search input
 */
export async function searchLocation(page: Page, location: string): Promise<void> {
  const searchInput = page.getByPlaceholder(/search location/i);
  await searchInput.fill(location);
  await page.waitForTimeout(500); // Wait for debounce
}

/**
 * Select a location from search results
 */
export async function selectLocationFromResults(page: Page, location: string): Promise<void> {
  const result = page.getByText(location).first();
  await result.click();
  await waitForAQIData(page);
}

/**
 * Toggle dark mode
 */
export async function toggleDarkMode(page: Page): Promise<void> {
  const themeToggle = page.getByRole('button', { name: /theme|dark mode|light mode/i });
  await themeToggle.click();
  await page.waitForTimeout(300); // Wait for animation
}

/**
 * Click refresh button
 */
export async function refreshData(page: Page): Promise<void> {
  const refreshButton = page.getByRole('button', { name: /refresh/i });
  await refreshButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Open mobile navigation menu
 */
export async function openMobileMenu(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: /menu|hamburger/i });
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await page.waitForTimeout(300); // Wait for menu animation
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that AQI value is displayed
 */
export async function assertAQIVisible(page: Page): Promise<void> {
  const aqiValue = page.locator('[data-testid="aqi-meter-value"]');
  await expect(aqiValue).toBeVisible();
  
  // Check that AQI is a number
  const aqiText = await aqiValue.textContent();
  expect(parseInt(aqiText || '0')).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that a specific AQI category is displayed
 */
export async function assertAQICategory(page: Page, category: string): Promise<void> {
  const categoryElement = page.locator('[data-testid="aqi-category"]');
  await expect(categoryElement).toContainText(new RegExp(category, 'i'));
}

/**
 * Assert that pollutant cards are visible
 */
export async function assertPollutantCardsVisible(page: Page): Promise<void> {
  const pollutantCards = page.locator('[data-testid^="pollutant-card-"]');
  const count = await pollutantCards.count();
  expect(count).toBeGreaterThan(0);
}

/**
 * Assert that forecast is visible
 */
export async function assertForecastVisible(page: Page): Promise<void> {
  // Check for forecast chart or forecast data
  const forecast = page.locator('[data-testid="forecast-chart"], [data-testid="forecast-section"]');
  await expect(forecast.first()).toBeVisible();
}

// ============================================================================
// Accessibility Testing Helpers
// ============================================================================

/**
 * Run accessibility audit on current page
 */
export async function runAccessibilityAudit(page: Page): Promise<void> {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
    
  expect(accessibilityScanResults.violations).toEqual([]);
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page): Promise<void> {
  // Tab through interactive elements
  await page.keyboard.press('Tab');
  
  // Check that focus is visible
  const focusedElement = await page.locator(':focus');
  await expect(focusedElement).toBeVisible();
}

// ============================================================================
// Mobile Testing Helpers
// ============================================================================

/**
 * Simulate swipe gesture
 */
export async function swipe(
  page: Page,
  selector: string,
  direction: 'left' | 'right' | 'up' | 'down'
): Promise<void> {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) {
    throw new Error(`Element ${selector} not found`);
  }
  
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  switch (direction) {
    case 'left':
      endX = startX - box.width / 2;
      break;
    case 'right':
      endX = startX + box.width / 2;
      break;
    case 'up':
      endY = startY - box.height / 2;
      break;
    case 'down':
      endY = startY + box.height / 2;
      break;
  }
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY);
  await page.mouse.up();
}

/**
 * Check if element is within touch target size (44x44px minimum)
 */
export async function assertTouchTargetSize(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) {
    throw new Error(`Element ${selector} not found`);
  }
  
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

// ============================================================================
// Offline Testing Helpers
// ============================================================================

/**
 * Simulate offline mode
 */
export async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
  await page.waitForTimeout(500);
}

/**
 * Restore online mode
 */
export async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
  await page.waitForTimeout(500);
}

/**
 * Assert that offline indicator is visible
 */
export async function assertOfflineIndicatorVisible(page: Page): Promise<void> {
  const offlineIndicator = page.getByText(/offline|no connection/i);
  await expect(offlineIndicator).toBeVisible();
}

/**
 * Assert that cached data is displayed
 */
export async function assertCachedDataDisplayed(page: Page): Promise<void> {
  // Check that some AQI data is still visible even when offline
  await assertAQIVisible(page);
}

// ============================================================================
// Mock Data Helpers
// ============================================================================

/**
 * Mock API response
 */
export async function mockAPIResponse(
  page: Page,
  endpoint: string,
  response: any
): Promise<void> {
  await page.route(`**/${endpoint}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock API error
 */
export async function mockAPIError(
  page: Page,
  endpoint: string,
  status: number = 500
): Promise<void> {
  await page.route(`**/${endpoint}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, duration: number = 1500): Promise<void> {
  await page.waitForTimeout(duration);
}

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForStable(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  
  // Wait for animations to complete
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const animations = el.getAnimations();
      return animations.length === 0;
    },
    selector,
    { timeout: 5000 }
  );
}

// ============================================================================
// Screenshot Helpers
// ============================================================================

/**
 * Take a full page screenshot
 */
export async function takeFullScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Take an element screenshot
 */
export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string
): Promise<void> {
  const element = page.locator(selector);
  await element.screenshot({
    path: `screenshots/${name}.png`,
  });
}
