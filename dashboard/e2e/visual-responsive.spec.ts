/**
 * Responsive Visual Regression Tests
 * 
 * Tests for detecting visual changes across different viewports
 * Implements Task 27.3 - Responsive Snapshots
 * 
 * Features:
 * - Desktop layout testing (1440px)
 * - Tablet layout testing (768px)
 * - Mobile layout testing (375px)
 * - Cross-device consistency
 * - Responsive component behavior
 * 
 * Requirements: 7.1-7.4, Testing Strategy
 * Related Tasks: 27.3
 * 
 * Usage:
 * npm run test:visual:responsive
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper to wait for network idle and animations
 */
async function waitForStableUI(page: Page) {
  await page.waitForLoadState('networkidle');
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

test.describe('Responsive Visual Regression - Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Desktop - Home Page - Good AQI', async ({ page }) => {
    await mockAQIData(page, 35, 'Good');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1440-good.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Desktop - Home Page - Moderate AQI', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1440-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Desktop - Home Page - Hazardous AQI', async ({ page }) => {
    await mockAQIData(page, 350, 'Hazardous');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1440-hazardous.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Desktop - Hero Section', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('responsive-desktop-1440-hero.png', {
      animations: 'disabled',
    });
  });

  test('Desktop - Pollutant Grid Layout', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-desktop-1440-pollutants.png', {
      animations: 'disabled',
    });
  });

  test('Desktop - Dark Mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1440-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Laptop (1024px)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('Laptop - Home Page - Moderate AQI', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-laptop-1024-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Laptop - Pollutant Grid Layout', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-laptop-1024-pollutants.png', {
      animations: 'disabled',
    });
  });

  test('Laptop - Dark Mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-laptop-1024-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('Tablet - Home Page - Good AQI', async ({ page }) => {
    await mockAQIData(page, 35, 'Good');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-768-good.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet - Home Page - Moderate AQI', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-768-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet - Home Page - Hazardous AQI', async ({ page }) => {
    await mockAQIData(page, 350, 'Hazardous');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-768-hazardous.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet - Hero Section', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('responsive-tablet-768-hero.png', {
      animations: 'disabled',
    });
  });

  test('Tablet - Pollutant Grid Layout (2-column)', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-tablet-768-pollutants.png', {
      animations: 'disabled',
    });
  });

  test('Tablet - Forecast Chart', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const forecast = page.locator('[data-testid="forecast-chart"]').first();
    await expect(forecast).toHaveScreenshot('responsive-tablet-768-forecast.png', {
      animations: 'disabled',
    });
  });

  test('Tablet - Dark Mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-768-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet - Portrait Orientation', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-768-portrait.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Tablet Landscape (1024x768)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('Tablet Landscape - Home Page', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-tablet-landscape-1024x768.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet Landscape - Pollutant Grid', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-tablet-landscape-pollutants.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Mobile - Home Page - Good AQI', async ({ page }) => {
    await mockAQIData(page, 35, 'Good');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-good.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mobile - Home Page - Moderate AQI', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mobile - Home Page - Hazardous AQI', async ({ page }) => {
    await mockAQIData(page, 350, 'Hazardous');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-hazardous.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mobile - Hero Section', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('responsive-mobile-375-hero.png', {
      animations: 'disabled',
    });
  });

  test('Mobile - Pollutant Grid Layout (1-column)', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-mobile-375-pollutants.png', {
      animations: 'disabled',
    });
  });

  test('Mobile - Individual Pollutant Card', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantCard = page.locator('[data-testid="pollutant-card"]').first();
    await expect(pollutantCard).toHaveScreenshot('responsive-mobile-375-card.png', {
      animations: 'disabled',
    });
  });

  test('Mobile - Forecast Chart', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const forecast = page.locator('[data-testid="forecast-chart"]').first();
    await expect(forecast).toHaveScreenshot('responsive-mobile-375-forecast.png', {
      animations: 'disabled',
    });
  });

  test('Mobile - Navigation Header', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('responsive-mobile-375-header.png', {
      animations: 'disabled',
    });
  });

  test('Mobile - Dark Mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mobile - Loading State', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 10000));
    });

    await page.goto('/');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-loading.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mobile - Error State', async ({ page }) => {
    await page.route('**/api/aqi/current*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('responsive-mobile-375-error.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Small Mobile (320px)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('Small Mobile - Home Page', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-mobile-320-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Small Mobile - Hero Section', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const hero = page.locator('[data-testid="hero-section"]').first();
    await expect(hero).toHaveScreenshot('responsive-mobile-320-hero.png', {
      animations: 'disabled',
    });
  });

  test('Small Mobile - Pollutant Cards', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-mobile-320-pollutants.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Large Desktop (1920px)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Large Desktop - Home Page', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1920-moderate.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Large Desktop - Pollutant Grid Layout', async ({ page }) => {
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    const pollutantGrid = page.locator('[data-testid="pollutant-grid"]').first();
    await expect(pollutantGrid).toHaveScreenshot('responsive-desktop-1920-pollutants.png', {
      animations: 'disabled',
    });
  });

  test('Large Desktop - Dark Mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mockAQIData(page, 75, 'Moderate');
    await page.goto('/');
    await waitForStableUI(page);
    
    await expect(page).toHaveScreenshot('responsive-desktop-1920-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression - Cross-Device Consistency', () => {
  test('Component Consistency - Hero AQI Display', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await mockAQIData(page, 75, 'Moderate');
      await page.goto('/');
      await waitForStableUI(page);
      
      const hero = page.locator('[data-testid="hero-section"]').first();
      await expect(hero).toHaveScreenshot(`consistency-hero-${viewport.name}.png`, {
        animations: 'disabled',
      });
    }
  });

  test('Component Consistency - Pollutant Card', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await mockAQIData(page, 75, 'Moderate');
      await page.goto('/');
      await waitForStableUI(page);
      
      const card = page.locator('[data-testid="pollutant-card"]').first();
      await expect(card).toHaveScreenshot(`consistency-card-${viewport.name}.png`, {
        animations: 'disabled',
      });
    }
  });
});
