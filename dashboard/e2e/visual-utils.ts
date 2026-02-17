/**
 * Visual Regression Test Utilities
 * 
 * Utilities for managing visual regression tests
 * Implements Task 27.4 - Review and Approve Snapshots
 * 
 * Features:
 * - Snapshot comparison utilities
 * - Baseline management
 * - Diff reporting
 * 
 * Requirements: Testing Strategy
 * Related Tasks: 27.4
 */

/**
 * Configuration for visual comparison
 */
export const visualConfig = {
  // Maximum pixel difference allowed (0-1)
  maxDiffPixelRatio: 0.01, // 1% difference allowed
  
  // Threshold for individual pixel comparison (0-1)
  threshold: 0.2,
  
  // Default screenshot options
  defaultScreenshotOptions: {
    animations: 'disabled' as const,
    fullPage: false,
  },
  
  // Full page screenshot options
  fullPageScreenshotOptions: {
    animations: 'disabled' as const,
    fullPage: true,
  },
};

/**
 * Viewport configurations for responsive testing
 */
export const viewports = {
  mobile: {
    small: { width: 320, height: 568, name: 'Small Mobile' },
    standard: { width: 375, height: 667, name: 'Mobile' },
    large: { width: 414, height: 896, name: 'Large Mobile' },
  },
  tablet: {
    portrait: { width: 768, height: 1024, name: 'Tablet Portrait' },
    landscape: { width: 1024, height: 768, name: 'Tablet Landscape' },
  },
  desktop: {
    laptop: { width: 1024, height: 768, name: 'Laptop' },
    standard: { width: 1440, height: 900, name: 'Desktop' },
    large: { width: 1920, height: 1080, name: 'Large Desktop' },
    ultrawide: { width: 2560, height: 1440, name: 'Ultrawide' },
  },
};

/**
 * AQI test data configurations
 */
export const aqiTestData = {
  good: { aqi: 35, category: 'Good', color: 'green' },
  moderate: { aqi: 75, category: 'Moderate', color: 'yellow' },
  unhealthySensitive: { aqi: 125, category: 'Unhealthy for Sensitive Groups', color: 'orange' },
  unhealthy: { aqi: 175, category: 'Unhealthy', color: 'red' },
  veryUnhealthy: { aqi: 250, category: 'Very Unhealthy', color: 'purple' },
  hazardous: { aqi: 350, category: 'Hazardous', color: 'maroon' },
};

/**
 * Component test IDs for visual testing
 */
export const testIds = {
  hero: 'hero-section',
  pollutantGrid: 'pollutant-grid',
  pollutantCard: 'pollutant-card',
  forecastChart: 'forecast-chart',
  weatherWidget: 'weather-widget',
  healthRecommendations: 'health-recommendations',
  locationSelector: 'location-selector',
  refreshButton: 'refresh-button',
  darkModeToggle: 'dark-mode-toggle',
};

/**
 * Generate snapshot filename
 */
export function getSnapshotName(
  component: string,
  variant: string,
  viewport?: string,
  theme?: 'light' | 'dark'
): string {
  const parts = [component, variant];
  if (viewport) parts.push(viewport);
  if (theme) parts.push(theme);
  return `${parts.join('-')}.png`;
}

/**
 * Wait for animations and network to settle
 */
export async function waitForStableUI(page: any, timeout = 500) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(timeout);
}

/**
 * Mock API responses for consistent visual testing
 */
export async function setupAPIMocks(page: any, aqiLevel: keyof typeof aqiTestData) {
  const { aqi, category } = aqiTestData[aqiLevel];
  
  // Mock AQI data
  await page.route('**/api/aqi/current*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          aqi,
          category,
          dominant_pollutant: 'PM2.5',
          timestamp: new Date('2026-02-16T12:00:00Z').toISOString(),
          location: {
            lat: 28.6139,
            lon: 77.2090,
            name: 'New Delhi'
          }
        }
      })
    });
  });

  // Mock pollutant data
  await page.route('**/api/pollutants/current*', async (route: any) => {
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
          timestamp: new Date('2026-02-16T12:00:00Z').toISOString()
        }
      })
    });
  });

  // Mock forecast data
  await page.route('**/api/forecast*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          predictions: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() + i * 3600000).toISOString(),
            aqi: aqi + (i % 2 === 0 ? 5 : -5), // Consistent variation
            confidence_lower: aqi - 10,
            confidence_upper: aqi + 10
          }))
        }
      })
    });
  });

  // Mock weather data
  await page.route('**/api/weather/current*', async (route: any) => {
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
          timestamp: new Date('2026-02-16T12:00:00Z').toISOString()
        }
      })
    });
  });
}

/**
 * Compare visual snapshots
 */
export interface VisualComparisonOptions {
  maxDiffPixelRatio?: number;
  threshold?: number;
  updateBaseline?: boolean;
}

/**
 * Test data generator for visual tests
 */
export class VisualTestDataGenerator {
  static getAQIData(level: keyof typeof aqiTestData) {
    return aqiTestData[level];
  }

  static getAllAQILevels() {
    return Object.keys(aqiTestData) as Array<keyof typeof aqiTestData>;
  }

  static getViewport(device: 'mobile' | 'tablet' | 'desktop', size: string) {
    return viewports[device][size as keyof typeof viewports[typeof device]];
  }

  static getAllViewports() {
    return [
      ...Object.values(viewports.mobile),
      ...Object.values(viewports.tablet),
      ...Object.values(viewports.desktop),
    ];
  }
}

/**
 * Visual test report generator
 */
export interface VisualTestResult {
  testName: string;
  passed: boolean;
  viewport?: string;
  theme?: string;
  diffPixelRatio?: number;
  snapshotPath: string;
}

export class VisualTestReporter {
  private results: VisualTestResult[] = [];

  addResult(result: VisualTestResult) {
    this.results.push(result);
  }

  getResults() {
    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      passRate: passRate.toFixed(2) + '%',
    };
  }

  generateReport() {
    const summary = this.getSummary();
    const failedTests = this.results.filter(r => !r.passed);

    return {
      summary,
      failedTests,
      allResults: this.results,
    };
  }
}

/**
 * Snapshot management utilities
 */
export class SnapshotManager {
  /**
   * Get snapshot directory
   */
  static getSnapshotDir() {
    return './e2e/__snapshots__';
  }

  /**
   * Get snapshot path
   */
  static getSnapshotPath(testFile: string, snapshotName: string) {
    return `${this.getSnapshotDir()}/${testFile}/${snapshotName}`;
  }

  /**
   * Check if snapshot exists
   */
  static async snapshotExists(testFile: string, snapshotName: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      const path = this.getSnapshotPath(testFile, snapshotName);
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }
}
