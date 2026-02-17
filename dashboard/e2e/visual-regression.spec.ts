/**
 * Visual Regression Tests
 * 
 * Tests for detecting visual changes in components and layouts
 * Implements Task 27.1, 27.2 - Visual Regression Testing
 * 
 * Features:
 * - Component snapshot comparison
 * - Different AQI level visuals
 * - Light and dark mode comparison
 * - Loading and error state snapshots
 * - Cross-browser visual testing
 * 
 * Requirements: Testing Strategy
 * Related Tasks: 27.1, 27.2
 * 
 * Usage:
 * - Initial run: npm run test:visual
 * - Update snapshots: npm run test:visual:update
 * - View report: npm run test:e2e:report
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper to wait for network idle and animations
 */
async function waitForStableUI(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait a bit for animations to complete
  await page.waitForTimeout(500);
}

/**
 * Helper to mock API response with specific AQI data
 */
async function mockAQIData(page: Page, aqi: number, category: string) {
  await page.route('**/api/aqi/current*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          aqi: aqi,
          category: category,
          dominant_pollutant: 'PM2.5',
          timestamp: new Date().toISOString(),
          location: {
            lat: 28.6139,
            lon: 77.2090,
            name: 'New Delhi'
          }
        }
      })
    });
  });

  await page.route('**/api/pollutants/current*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          pm25: 75.5,
          pm10: 120.3,
          o3: 45.2,
          no2: 35.8,
          so2: 15.6,
          co: 1.2,
          timestamp: new Date().toISOString()
        }
      })
    });
  });

  await page.route('**/api/forecast*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          predictions: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() + i * 3600000).toISOString(),
            aqi: aqi + Math.floor(Math.random() * 20 - 10),
            confidence_lower: aqi - 10,
            confidence_upper: aqi + 10
          }))
        }
      })
    });
  });

  await page.route('**/api/weather/current*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          temperature: 25,
          humidity: 60,
          wind_speed: 10,
          wind_direction: 'NW',
          pressure: 1013,
          timestamp: new Date().toISOString()
        }
      })
    });
  });
}

test.describe('Visual Regression - AQI Levels', () => {
  test('Good AQI (0-50) - Green', async ({ page }) => {
    await mockAQIData(page, 35, 'Good');
    await page.goto('/');
    await waitForStableUI(page);
    
    // Full page snapshot
    await expect(page).toHaveScreenshot('aqi-good-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Hero section snapshot
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-good-hero.png', {
      animations: 'disabled',
    });
  });

  test('Moderate AQI (51-100) - Yellow', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('aqi-moderate-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-moderate-hero.png', {
      animations: 'disabled',
    });
  });

  test('Unhealthy for Sensitive Groups (101-150) - Orange', async ({ page }) => {
    await mockAQIData(page, 125, 'Unhealthy for Sensitive Groups');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('aqi-unhealthy-sensitive-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-unhealthy-sensitive-hero.png', {
      animations: 'disabled',
    });
  });

  test('Unhealthy AQI (151-200) - Red', async ({ page }) => {
    await mockAQIData(page, 175, 'Unhealthy');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('aqi-unhealthy-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-unhealthy-hero.png', {
      animations: 'disabled',
    });
  });

  test('Very Unhealthy AQI (201-300) - Purple', async ({ page }) => {
    await mockAQIData(page, 250, 'Very Unhealthy');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('aqi-very-unhealthy-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-very-unhealthy-hero.png', {
      animations: 'disabled',
    });
  });

  test('Hazardous AQI (301+) - Maroon', async ({ page }) => {
    await mockAQIData(page, 350, 'Hazardous');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('aqi-hazardous-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('aqi-hazardous-hero.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.use({ colorScheme: 'dark' });

  test('Dark mode - Good AQI', async ({ page }) => {
    await mockAQIData(page, 35, 'Good');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('dark-mode-good.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Dark mode - Unhealthy AQI', async ({ page }) => {
    await mockAQIData(page, 175, 'Unhealthy');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('dark-mode-unhealthy.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Dark mode - Hazardous AQI', async ({ page }) => {
    await mockAQIData(page, 350, 'Hazardous');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('dark-mode-hazardous.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Component Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
  });

  test('Hero Section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toBeVisible();
    await expect(hero).toHaveScreenshot('component-hero.png', {
      animations: 'disabled',
    });
  });

  test('Pollutant Cards Grid', async ({ page }) => {
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toBeVisible();
    await expect(pollutantGrid).toHaveScreenshot('component-pollutant-grid.png', {
      animations: 'disabled',
    });
  });

  test('Individual Pollutant Card', async ({ page }) => {
    const pollutantCard = page.locator('[data-testid="pollutant-card"]').first();
    await expect(pollutantCard).toBeVisible();
    await expect(pollutantCard).toHaveScreenshot('component-pollutant-card.png', {
      animations: 'disabled',
    });
  });

  test('Forecast Chart', async ({ page }) => {
    const forecast = page.locator('[data-testid="forecast-chart"]').first();
    await expect(forecast).toBeVisible();
    await expect(forecast).toHaveScreenshot('component-forecast-chart.png', {
      animations: 'disabled',
    });
  });

  test('Weather Widget', async ({ page }) => {
    const weather = page.locator('[data-testid="weather-widget"]').first();
    if (await weather.isVisible()) {
      await expect(weather).toHaveScreenshot('component-weather-widget.png', {
        animations: 'disabled',
      });
    }
  });

  test('Health Recommendations', async ({ page }) => {
    const health = page.locator('[data-testid="health-recommendations"]').first();
    if (await health.isVisible()) {
      await expect(health).toHaveScreenshot('component-health-recommendations.png', {
        animations: 'disabled',
      });
    }
  });

  test('Location Selector', async ({ page }) => {
    const locationBtn = page.locator('[data-testid="location-selector"]').first();
    if (await locationBtn.isVisible()) {
      await expect(locationBtn).toHaveScreenshot('component-location-selector.png', {
        animations: 'disabled',
      });
    }
  });

  test('Navigation Header', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot('component-header.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - State Snapshots', () => {
  test('Loading State', async ({ page }) => {
    // Block API calls to show loading state
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 10000));
    });

    await page.goto('/');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('state-loading.png', {
      animations: 'disabled',
    });
  });

  test('Error State - Network Error', async ({ page }) => {
    await page.route('**/api/aqi/current*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('state-error-network.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Error State - API Error', async ({ page }) => {
    await page.route('**/api/aqi/current*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal Server Error'
        })
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('state-error-api.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Offline State', async ({ page, context }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);

    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('state-offline.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Interactive States', () => {
  test.beforeEach(async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
  });

  test('Pollutant Card - Hover State', async ({ page }) => {
    const pollutantCard = page.locator('[data-testid="pollutant-card"]').first();
    await pollutantCard.hover();
    await page.waitForTimeout(300); // Wait for hover animation
    
    await expect(pollutantCard).toHaveScreenshot('interactive-pollutant-hover.png', {
      animations: 'disabled',
    });
  });

  test('Button - Hover State', async ({ page }) => {
    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    if (await refreshBtn.isVisible()) {
      await refreshBtn.hover();
      await page.waitForTimeout(300);
      
      await expect(refreshBtn).toHaveScreenshot('interactive-button-hover.png', {
        animations: 'disabled',
      });
    }
  });

  test('Chart - Tooltip Visible', async ({ page }) => {
    const chart = page.locator('[data-testid="forecast-chart"]').first();
    if (await chart.isVisible()) {
      // Hover over chart to show tooltip
      const chartRect = await chart.boundingBox();
      if (chartRect) {
        await page.mouse.move(
          chartRect.x + chartRect.width / 2,
          chartRect.y + chartRect.height / 2
        );
        await page.waitForTimeout(300);
        
        await expect(chart).toHaveScreenshot('interactive-chart-tooltip.png', {
          animations: 'disabled',
        });
      }
    }
  });
});

test.describe('Visual Regression - Glassmorphism Effects', () => {
  test.beforeEach(async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
  });

  test('Glass Effect - Light Mode', async ({ page }) => {
    const glassCard = page.locator('.backdrop-blur-md').first();
    await expect(glassCard).toBeVisible();
    await expect(glassCard).toHaveScreenshot('glass-effect-light.png', {
      animations: 'disabled',
    });
  });

  test('Glass Effect - Dark Mode', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    const glassCard = page.locator('.backdrop-blur-md').first();
    await expect(glassCard).toBeVisible();
    await expect(glassCard).toHaveScreenshot('glass-effect-dark.png', {
      animations: 'disabled',
    });
  });

  test('Card Shadows and Borders', async ({ page }) => {
    const card = page.locator('[data-testid="pollutant-card"]').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot('glass-card-styling.png', {
      animations: 'disabled',
    });
  });
});
