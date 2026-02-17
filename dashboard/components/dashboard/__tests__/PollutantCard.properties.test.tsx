/**
 * Property-Based Tests for PollutantCard Component
 * 
 * Tests correctness properties using fast-check:
 * - Property 5: Pollutant Card Completeness
 * - Property 6: Pollutant Color Coding
 * 
 * Each property is tested with 100 iterations to ensure correctness
 * across a wide range of inputs.
 * 
 * Requirements: 3.2, 3.6
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { PollutantCard } from '../PollutantCard';
import { PollutantType } from '@/lib/api/types';
import { getExpectedCategory, getExpectedColor } from '@/lib/test-utils/generators';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// ============================================================================
// Test Generators
// ============================================================================

/**
 * Generator for valid pollutant types
 */
const pollutantTypeArbitrary = fc.constantFrom<PollutantType>(
  'pm25',
  'pm10',
  'o3',
  'no2',
  'so2',
  'co'
);

/**
 * Generator for pollutant values (0-1000 μg/m³)
 */
const pollutantValueArbitrary = fc.double({ min: 0, max: 1000, noNaN: true });

/**
 * Generator for AQI sub-index values (0-500)
 */
const aqiSubIndexArbitrary = fc.integer({ min: 0, max: 500 });

/**
 * Generator for percentage values (0-100)
 */
const percentageArbitrary = fc.integer({ min: 0, max: 100 });

/**
 * Generator for complete pollutant card data
 */
const pollutantCardDataArbitrary = fc.record({
  pollutant: pollutantTypeArbitrary,
  value: pollutantValueArbitrary,
  unit: fc.constantFrom('μg/m³', 'mg/m³', 'ppm'),
  aqi: aqiSubIndexArbitrary,
  status: fc.constantFrom('good', 'moderate', 'unhealthy', 'very_unhealthy', 'hazardous'),
  percentage: fc.option(percentageArbitrary, { nil: undefined }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get expected pollutant name display
 */
function getExpectedPollutantName(pollutant: PollutantType): string {
  const names: Record<PollutantType, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    o3: 'O₃',
    no2: 'NO₂',
    so2: 'SO₂',
    co: 'CO',
  };
  return names[pollutant];
}

/**
 * Get expected color for AQI value
 */
function getExpectedColorForAQI(aqi: number): string {
  if (aqi <= 50) return '#4ADE80'; // Good
  if (aqi <= 100) return '#FCD34D'; // Moderate
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive
  if (aqi <= 200) return '#EF4444'; // Unhealthy
  if (aqi <= 300) return '#B91C1C'; // Very Unhealthy
  return '#7C2D12'; // Hazardous
}

/**
 * Check if element exists in the DOM
 */
function elementExists(testId: string): boolean {
  try {
    screen.getByTestId(testId);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Property 5: Pollutant Card Completeness
// ============================================================================

describe('Feature: glassmorphic-dashboard, Property 5: Pollutant Card Completeness', () => {
  it('for any pollutant data, card should contain name, icon, value, unit, progress bar, and status', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        // Render the component
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Property: Card must contain pollutant name
        const nameElement = container.querySelector('[data-testid="pollutant-name"]');
        expect(nameElement).toBeInTheDocument();
        expect(nameElement?.textContent).toBe(getExpectedPollutantName(data.pollutant));

        // Property: Card must contain icon
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('aria-label', expect.stringContaining(getExpectedPollutantName(data.pollutant)));

        // Property: Card must contain value
        const valueElement = container.querySelector('[data-testid="pollutant-value"]');
        expect(valueElement).toBeInTheDocument();
        expect(valueElement?.textContent).toBe(data.value.toFixed(1));

        // Property: Card must contain unit
        const unitElement = container.querySelector('[data-testid="pollutant-unit"]');
        expect(unitElement).toBeInTheDocument();
        expect(unitElement?.textContent).toBe(data.unit);

        // Property: Card must contain progress bar
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');

        // Property: Card must contain status
        const statusElement = container.querySelector('[data-testid="pollutant-status"]');
        expect(statusElement).toBeInTheDocument();
        expect(statusElement?.textContent).toBeTruthy();
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 42, // For reproducibility
      }
    );
  });

  it('for any pollutant data, all required elements should be visible and accessible', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Property: All elements must be visible (not hidden)
        const nameElement = container.querySelector('[data-testid="pollutant-name"]');
        const valueElement = container.querySelector('[data-testid="pollutant-value"]');
        const unitElement = container.querySelector('[data-testid="pollutant-unit"]');
        const statusElement = container.querySelector('[data-testid="pollutant-status"]');
        const progressBar = container.querySelector('[role="progressbar"]');

        expect(nameElement).toBeVisible();
        expect(valueElement).toBeVisible();
        expect(unitElement).toBeVisible();
        expect(statusElement).toBeVisible();
        expect(progressBar).toBeVisible();
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 43,
      }
    );
  });

  it('for any pollutant data, card should have proper ARIA attributes', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Property: Card must have article role
        const card = container.querySelector('[role="article"]');
        expect(card).toBeInTheDocument();

        // Property: Card must have aria-label
        expect(card).toHaveAttribute('aria-label', expect.stringContaining(getExpectedPollutantName(data.pollutant)));

        // Property: Progress bar must have proper ARIA attributes
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining(getExpectedPollutantName(data.pollutant)));
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 44,
      }
    );
  });
});

// ============================================================================
// Property 6: Pollutant Color Coding
// ============================================================================

describe('Feature: glassmorphic-dashboard, Property 6: Pollutant Color Coding', () => {
  it('for any pollutant with AQI sub-index, card color should match AQI category color', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        // Render the component
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Get the expected color based on AQI value
        const expectedColor = getExpectedColorForAQI(data.aqi);

        // Property: Card border color must match AQI category
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: expectedColor });

        // Property: Status text color must match AQI category
        const statusElement = container.querySelector('[data-testid="pollutant-status"]');
        expect(statusElement).toHaveStyle({ color: expectedColor });

        // Property: Icon color must match AQI category
        const icon = container.querySelector('svg');
        const iconParent = icon?.parentElement;
        expect(iconParent).toHaveStyle({ color: expectedColor });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 45,
      }
    );
  });

  it('for any AQI value, progress bar gradient should use the correct color', () => {
    fc.assert(
      fc.property(aqiSubIndexArbitrary, pollutantTypeArbitrary, (aqi, pollutant) => {
        // Render the component
        const { container } = render(
          <PollutantCard
            pollutant={pollutant}
            value={50}
            unit="μg/m³"
            aqi={aqi}
            status="moderate"
            percentage={50}
          />
        );

        // Get the expected color based on AQI value
        const expectedColor = getExpectedColorForAQI(aqi);

        // Get progress bar fill element
        const progressBarFill = container.querySelector('[data-testid="progress-bar-fill"]');
        const background = progressBarFill?.getAttribute('style') || '';
        
        // Property: Progress bar gradient must include the AQI category color
        expect(background).toContain(expectedColor);
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 46,
      }
    );
  });

  it('for any AQI category transition, color should change appropriately', () => {
    // Test AQI values at category boundaries
    const boundaryTests = [
      { aqi: 50, expectedColor: '#4ADE80' },   // Good
      { aqi: 51, expectedColor: '#FCD34D' },   // Moderate
      { aqi: 100, expectedColor: '#FCD34D' },  // Moderate
      { aqi: 101, expectedColor: '#FB923C' },  // Unhealthy for Sensitive
      { aqi: 150, expectedColor: '#FB923C' },  // Unhealthy for Sensitive
      { aqi: 151, expectedColor: '#EF4444' },  // Unhealthy
      { aqi: 200, expectedColor: '#EF4444' },  // Unhealthy
      { aqi: 201, expectedColor: '#B91C1C' },  // Very Unhealthy
      { aqi: 300, expectedColor: '#B91C1C' },  // Very Unhealthy
      { aqi: 301, expectedColor: '#7C2D12' },  // Hazardous
    ];

    fc.assert(
      fc.property(fc.constantFrom(...boundaryTests), (testCase) => {
        const { container } = render(
          <PollutantCard
            pollutant="pm25"
            value={50}
            unit="μg/m³"
            aqi={testCase.aqi}
            status="moderate"
          />
        );

        // Property: Color must match expected color for AQI category
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: testCase.expectedColor });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 47,
      }
    );
  });

  it('for any pollutant type, color coding should be consistent across all visual elements', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Get the expected color
        const expectedColor = getExpectedColorForAQI(data.aqi);

        // Property: All color-coded elements must use the same color
        const card = container.querySelector('.pollutant-card');
        const statusElement = container.querySelector('[data-testid="pollutant-status"]');
        const iconParent = container.querySelector('svg')?.parentElement;

        // All should use the expected color
        expect(card).toHaveStyle({ borderColor: expectedColor });
        expect(statusElement).toHaveStyle({ color: expectedColor });
        expect(iconParent).toHaveStyle({ color: expectedColor });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 48,
      }
    );
  });

  it('for extreme AQI values, color coding should remain valid', () => {
    const extremeValues = [
      { aqi: 0, expectedColor: '#4ADE80' },     // Minimum
      { aqi: 500, expectedColor: '#7C2D12' },   // Maximum
      { aqi: 999, expectedColor: '#7C2D12' },   // Beyond maximum (should cap at hazardous)
    ];

    fc.assert(
      fc.property(fc.constantFrom(...extremeValues), pollutantTypeArbitrary, (testCase, pollutant) => {
        const { container } = render(
          <PollutantCard
            pollutant={pollutant}
            value={50}
            unit="μg/m³"
            aqi={testCase.aqi}
            status="moderate"
          />
        );

        // Property: Extreme values should still have valid colors
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: testCase.expectedColor });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 49,
      }
    );
  });
});

// ============================================================================
// Additional Property Tests for Robustness
// ============================================================================

describe('Feature: glassmorphic-dashboard, Additional Pollutant Properties', () => {
  it('for any valid pollutant data, card should render without errors', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        // Property: Component should not throw errors for any valid input
        expect(() => {
          render(
            <PollutantCard
              pollutant={data.pollutant}
              value={data.value}
              unit={data.unit}
              aqi={data.aqi}
              status={data.status}
              percentage={data.percentage}
            />
          );
        }).not.toThrow();
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 50,
      }
    );
  });

  it('for any pollutant data, card dimensions should be consistent', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Property: Card dimensions must be 200x180px as per requirements
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ width: '200px', height: '180px' });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 51,
      }
    );
  });

  it('for any pollutant data, progress bar should have correct height', () => {
    fc.assert(
      fc.property(pollutantCardDataArbitrary, (data) => {
        const { container } = render(
          <PollutantCard
            pollutant={data.pollutant}
            value={data.value}
            unit={data.unit}
            aqi={data.aqi}
            status={data.status}
            percentage={data.percentage}
          />
        );

        // Property: Progress bar height must be 8px as per requirements
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toHaveStyle({ height: '8px' });
      }),
      {
        numRuns: 100,
        verbose: true,
        seed: 52,
      }
    );
  });
});
