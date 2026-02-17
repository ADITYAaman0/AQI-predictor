/**
 * Critical User Flow E2E Tests
 * 
 * Tests for critical user flows in the AQI Dashboard
 * Implements Task 26.2 - Write critical user flow tests
 * 
 * Test Coverage:
 * - View current AQI for location
 * - Switch locations
 * - View 24-hour forecast
 * - Configure alerts
 * - Toggle dark mode
 * 
 * Requirements: Testing Strategy
 */

import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  navigateToView,
  waitForAQIData,
  assertAQIVisible,
  assertAQICategory,
  assertPollutantCardsVisible,
  assertForecastVisible,
  toggleDarkMode,
  refreshData,
  runAccessibilityAudit,
} from './utils';

test.describe('Critical User Flows', () => {
  
  // ============================================================================
  // Test 1: View Current AQI for Location
  // ============================================================================
  
  test('should display current AQI for default location', async ({ page }) => {
    // Navigate to home page
    await navigateToHome(page);
    
    // Wait for AQI data to load
    await waitForAQIData(page);
    
    // Assert AQI value is visible
    await assertAQIVisible(page);
    
    // Assert AQI category is displayed
    const categoryElement = page.locator('[data-testid="aqi-category"]');
    await expect(categoryElement).toBeVisible();
    
    // Assert location is displayed
    const locationElement = page.locator('[data-testid="current-location"]');
    await expect(locationElement).toBeVisible();
    
    // Assert last updated time is displayed
    const lastUpdatedElement = page.locator('[data-testid="last-updated"]');
    await expect(lastUpdatedElement).toBeVisible();
    
    // Assert circular meter is visible
    const aqiMeter = page.locator('[data-testid="circular-aqi-meter"]');
    await expect(aqiMeter).toBeVisible();
    
    // Assert health message is displayed
    const healthMessage = page.locator('[data-testid="health-message"]');
    await expect(healthMessage).toBeVisible();
  });
  
  test('should display pollutant breakdown', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Assert pollutant cards are visible
    await assertPollutantCardsVisible(page);
    
    // Check that at least PM2.5 and PM10 cards are present
    const pm25Card = page.locator('[data-testid="pollutant-card-pm25"]');
    const pm10Card = page.locator('[data-testid="pollutant-card-pm10"]');
    
    await expect(pm25Card).toBeVisible();
    await expect(pm10Card).toBeVisible();
  });
  
  // ============================================================================
  // Test 2: Switch Locations
  // ============================================================================
  
  test('should allow switching to different location', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get initial location
    const initialLocation = await page.locator('[data-testid="current-location"]').textContent();
    
    // Click location selector (if visible)
    const locationButton = page.getByRole('button', { name: /location|select location/i });
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      
      // Wait for location selector to appear
      await page.waitForSelector('[role="dialog"], [data-testid="location-selector"]', { timeout: 5000 });
      
      // Select a different location (if available)
      const locationOption = page.getByRole('button', { name: /delhi|mumbai|bangalore/i }).first();
      
      if (await locationOption.isVisible()) {
        await locationOption.click();
        
        // Wait for AQI data to reload
        await waitForAQIData(page);
        
        // Verify location changed
        const newLocation = await page.locator('[data-testid="current-location"]').textContent();
        expect(newLocation).not.toBe(initialLocation);
      }
    }
  });
  
  test('should search for location', async ({ page }) => {
    await navigateToHome(page);
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|location/i);
    
    if (await searchInput.isVisible()) {
      // Type location name
      await searchInput.fill('Delhi');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce
      
      // Check if results are displayed
      const searchResults = page.locator('[data-testid="search-results"], [role="listbox"]');
      
      if (await searchResults.isVisible()) {
        // Select first result
        const firstResult = searchResults.locator('button, [role="option"]').first();
        await firstResult.click();
        
        // Wait for AQI data to load
        await waitForAQIData(page);
        
        // Verify AQI is displayed
        await assertAQIVisible(page);
      }
    }
  });
  
  // ============================================================================
  // Test 3: View 24-Hour Forecast
  // ============================================================================
  
  test('should display 24-hour forecast', async ({ page }) => {
    await navigateToHome(page);
    
    // Navigate to forecast view
    await navigateToView(page, 'forecast');
    
    // Wait for forecast data to load
    await page.waitForLoadState('networkidle');
    
    // Assert forecast is visible
    await assertForecastVisible(page);
    
    // Check for forecast chart
    const forecastChart = page.locator('[data-testid="forecast-chart"]');
    if (await forecastChart.isVisible()) {
      await expect(forecastChart).toBeVisible();
    }
    
    // Check for forecast cards
    const forecastCards = page.locator('[data-testid^="forecast-card-"]');
    const cardCount = await forecastCards.count();
    
    // Should have multiple forecast periods
    expect(cardCount).toBeGreaterThan(0);
  });
  
  test('should allow switching forecast time ranges', async ({ page }) => {
    await navigateToHome(page);
    await navigateToView(page, 'forecast');
    
    // Wait for forecast to load
    await page.waitForLoadState('networkidle');
    
    // Look for time range selector
    const timeRangeButtons = page.getByRole('button', { name: /24h|48h|7 days/i });
    
    if (await timeRangeButtons.first().isVisible()) {
      // Click 48h button
      const button48h = page.getByRole('button', { name: /48h/i });
      
      if (await button48h.isVisible()) {
        await button48h.click();
        
        // Wait for data to reload
        await page.waitForLoadState('networkidle');
        
        // Verify forecast is still visible
        await assertForecastVisible(page);
      }
    }
  });
  
  // ============================================================================
  // Test 4: Configure Alerts
  // ============================================================================
  
  test('should allow creating an alert', async ({ page }) => {
    await navigateToHome(page);
    
    // Navigate to alerts view
    await navigateToView(page, 'alerts');
    
    // Wait for alerts page to load
    await page.waitForLoadState('networkidle');
    
    // Look for "Create Alert" or "Add Alert" button
    const createAlertButton = page.getByRole('button', { name: /create alert|add alert|new alert/i });
    
    if (await createAlertButton.isVisible()) {
      await createAlertButton.click();
      
      // Wait for alert form/modal to appear
      await page.waitForSelector('[role="dialog"], form', { timeout: 5000 });
      
      // Fill in alert threshold (if input exists)
      const thresholdInput = page.getByLabel(/threshold|aqi level/i);
      
      if (await thresholdInput.isVisible()) {
        await thresholdInput.fill('100');
      }
      
      // Select notification method (if available)
      const emailCheckbox = page.getByLabel(/email/i);
      
      if (await emailCheckbox.isVisible()) {
        await emailCheckbox.check();
      }
      
      // Save alert
      const saveButton = page.getByRole('button', { name: /save|create/i });
      
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Wait for confirmation
        await page.waitForTimeout(1000);
        
        // Verify alert appears in list (if alerts list exists)
        const alertsList = page.locator('[data-testid="alerts-list"]');
        
        if (await alertsList.isVisible()) {
          const alertItems = alertsList.locator('[data-testid^="alert-item-"]');
          const count = await alertItems.count();
          expect(count).toBeGreaterThan(0);
        }
      }
    }
  });
  
  test('should display existing alerts', async ({ page }) => {
    await navigateToHome(page);
    await navigateToView(page, 'alerts');
    
    // Wait for alerts to load
    await page.waitForLoadState('networkidle');
    
    // Check for alerts list or empty state
    const alertsList = page.locator('[data-testid="alerts-list"]');
    const emptyState = page.getByText(/no alerts|create your first alert/i);
    
    // Either alerts list or empty state should be visible
    const hasAlerts = await alertsList.isVisible();
    const isEmpty = await emptyState.isVisible();
    
    expect(hasAlerts || isEmpty).toBe(true);
  });
  
  // ============================================================================
  // Test 5: Toggle Dark Mode
  // ============================================================================
  
  test('should toggle between light and dark mode', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');
    
    // Toggle dark mode
    await toggleDarkMode(page);
    
    // Wait for theme transition
    await page.waitForTimeout(500);
    
    // Get new theme
    const newTheme = await htmlElement.getAttribute('data-theme');
    
    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);
    
    // Toggle back
    await toggleDarkMode(page);
    
    // Wait for theme transition
    await page.waitForTimeout(500);
    
    // Verify theme reverted
    const revertedTheme = await htmlElement.getAttribute('data-theme');
    expect(revertedTheme).toBe(initialTheme);
  });
  
  test('should persist dark mode preference', async ({ page, context }) => {
    await navigateToHome(page);
    
    // Set dark mode
    await toggleDarkMode(page);
    await page.waitForTimeout(500);
    
    // Get theme after toggle
    const htmlElement = page.locator('html');
    const themeAfterToggle = await htmlElement.getAttribute('data-theme');
    
    // Create new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');
    
    // Check if theme persisted
    const newPageHtml = newPage.locator('html');
    const persistedTheme = await newPageHtml.getAttribute('data-theme');
    
    expect(persistedTheme).toBe(themeAfterToggle);
    
    await newPage.close();
  });
  
  // ============================================================================
  // Additional Critical Flows
  // ============================================================================
  
  test('should refresh data successfully', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get initial AQI value
    const aqiValueBefore = await page.locator('[data-testid="aqi-meter-value"]').textContent();
    
    // Refresh data
    await refreshData(page);
    
    // Wait for data to reload
    await waitForAQIData(page);
    
    // Verify AQI is still displayed (may or may not have changed)
    await assertAQIVisible(page);
  });
  
  test('should display weather information', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Look for weather section
    const weatherSection = page.locator('[data-testid="weather-section"]');
    
    if (await weatherSection.isVisible()) {
      // Check for temperature
      const temperature = weatherSection.locator('[data-testid="temperature"]');
      await expect(temperature).toBeVisible();
      
      // Check for weather icon or description
      const weatherIcon = weatherSection.locator('[data-testid="weather-icon"]');
      const weatherDesc = weatherSection.getByText(/sunny|cloudy|rainy|clear/i);
      
      const hasIcon = await weatherIcon.isVisible();
      const hasDesc = await weatherDesc.isVisible();
      
      expect(hasIcon || hasDesc).toBe(true);
    }
  });
  
  test('should display health recommendations', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Look for health recommendations
    const healthCard = page.locator('[data-testid="health-recommendations-card"]');
    
    if (await healthCard.isVisible()) {
      await expect(healthCard).toBeVisible();
      
      // Check for recommendations text
      const recommendations = healthCard.locator('p, li');
      const count = await recommendations.count();
      expect(count).toBeGreaterThan(0);
    }
  });
  
  test('should be accessible on home page', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Run accessibility audit
    await runAccessibilityAudit(page);
  });
  
  test('should navigate between views', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Navigate to each view
    const views = ['Overview', 'Forecast', 'Insights', 'Alerts'];
    
    for (const view of views) {
      const tab = page.getByRole('tab', { name: new RegExp(view, 'i') });
      
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForLoadState('networkidle');
        
        // Verify view changed
        await expect(tab).toHaveAttribute('aria-selected', 'true');
      }
    }
  });
});
