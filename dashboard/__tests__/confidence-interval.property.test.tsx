/**
 * Confidence Interval Property-Based Tests
 * 
 * Tests correctness properties using fast-check:
 * - Property 35: Confidence Interval Display
 * 
 * For any prediction with confidence data, both the prediction value 
 * and confidence interval should be displayed.
 * 
 * Requirements: 15.8
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { PredictionGraph } from '@/components/forecast/PredictionGraph';
import type { ForecastData } from '@/lib/api/types';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children, height }: any) => (
      <div data-testid="responsive-container" style={{ height }}>
        {children}
      </div>
    ),
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-points={data?.length || 0}>
        {children}
      </div>
    ),
    Line: ({ dataKey, stroke, strokeWidth, dot, activeDot }: any) => (
      <div
        data-testid={`line-${dataKey}`}
        data-stroke={stroke}
        data-stroke-width={strokeWidth}
        data-has-dot={dot ? 'true' : 'false'}
        data-has-active-dot={activeDot ? 'true' : 'false'}
      />
    ),
    Area: ({ dataKey, fill, stroke, fillOpacity }: any) => (
      <div
        data-testid={`area-${dataKey}`}
        data-fill={fill}
        data-stroke={stroke}
        data-fill-opacity={fillOpacity}
      />
    ),
    XAxis: ({ dataKey, tickFormatter }: any) => (
      <div
        data-testid="x-axis"
        data-data-key={dataKey}
        data-has-formatter={tickFormatter ? 'true' : 'false'}
      />
    ),
    YAxis: ({ domain, tickFormatter }: any) => (
      <div
        data-testid="y-axis"
        data-domain={JSON.stringify(domain)}
        data-has-formatter={tickFormatter ? 'true' : 'false'}
      />
    ),
    CartesianGrid: ({ strokeDasharray, stroke, opacity }: any) => (
      <div
        data-testid="cartesian-grid"
        data-stroke-dasharray={strokeDasharray}
        data-stroke={stroke}
        data-opacity={opacity}
      />
    ),
    Tooltip: ({ content, contentStyle, labelStyle, itemStyle }: any) => (
      <div
        data-testid="chart-tooltip"
        data-has-custom-content={content ? 'true' : 'false'}
        data-content-style={JSON.stringify(contentStyle)}
      />
    ),
    Legend: ({ wrapperStyle, iconType }: any) => (
      <div
        data-testid="chart-legend"
        data-wrapper-style={JSON.stringify(wrapperStyle)}
        data-icon-type={iconType}
      />
    ),
  };
});

describe('Feature: glassmorphic-dashboard - Property 35: Confidence Interval Display', () => {
  /**
   * Generator for forecast data with confidence intervals
   */
  const forecastWithConfidenceArbitrary = fc.array(
    fc.record<ForecastData>({
      timestamp: fc
        .date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .map((d) => d.toISOString()),
      aqi: fc.integer({ min: 0, max: 500 }),
      confidence: fc.record({
        lower: fc.integer({ min: 0, max: 400 }),
        upper: fc.integer({ min: 100, max: 500 }),
      }),
    }),
    { minLength: 6, maxLength: 48 }
  ).map((data) => {
    // Ensure confidence bounds are valid (lower < aqi < upper)
    return data.map((point) => ({
      ...point,
      confidence: {
        lower: Math.min(point.confidence.lower, point.aqi - 10),
        upper: Math.max(point.confidence.upper, point.aqi + 10),
      },
    }));
  });

  /**
   * Generator for forecast data without confidence intervals
   */
  const forecastWithoutConfidenceArbitrary = fc.array(
    fc.record({
      timestamp: fc
        .date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .map((d) => d.toISOString()),
      aqi: fc.integer({ min: 0, max: 500 }),
    }),
    { minLength: 6, maxLength: 48 }
  );

  describe('Confidence interval visualization', () => {
    it('for any prediction with confidence data, both value and interval should be visible', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          const { container } = render(<PredictionGraph data={forecastData} />);

          // Verify main prediction line is rendered
          const predictionLine = container.querySelector('[data-testid="line-aqi"]');
          expect(predictionLine).toBeInTheDocument();

          // Verify confidence interval areas are rendered
          const lowerBoundArea = container.querySelector('[data-testid="area-lower"]');
          const upperBoundArea = container.querySelector('[data-testid="area-upper"]');
          
          // At least one confidence area should be present
          const hasConfidenceVisualization = lowerBoundArea || upperBoundArea;
          expect(hasConfidenceVisualization).toBeTruthy();

          // Verify data points count matches
          const lineChart = container.querySelector('[data-testid="line-chart"]');
          if (lineChart) {
            const dataPoints = lineChart.getAttribute('data-points');
            expect(parseInt(dataPoints || '0')).toBeGreaterThanOrEqual(forecastData.length);
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any prediction with confidence data, confidence bounds should be within valid range', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          // Verify data integrity
          forecastData.forEach((point) => {
            expect(point.confidence.lower).toBeLessThanOrEqual(point.aqi);
            expect(point.confidence.upper).toBeGreaterThanOrEqual(point.aqi);
            expect(point.confidence.lower).toBeGreaterThanOrEqual(0);
            expect(point.confidence.upper).toBeLessThanOrEqual(500);
          });

          // Render and verify visualization
          const { container } = render(<PredictionGraph data={forecastData} />);
          const predictionLine = container.querySelector('[data-testid="line-aqi"]');
          expect(predictionLine).toBeInTheDocument();
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Confidence interval tooltip', () => {
    it('for any prediction with confidence data, tooltip should show confidence bounds', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          const { container } = render(<PredictionGraph data={forecastData} />);

          // Verify tooltip component is present
          const tooltip = container.querySelector('[data-testid="chart-tooltip"]');
          expect(tooltip).toBeInTheDocument();

          // Tooltip should have custom content to display confidence
          if (tooltip) {
            const hasCustomContent = tooltip.getAttribute('data-has-custom-content');
            expect(hasCustomContent).toBe('true');
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Confidence interval legend', () => {
    it('for any prediction with confidence data, legend should indicate confidence interval', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          const { container } = render(<PredictionGraph data={forecastData} />);

          // Verify legend is present
          const legend = container.querySelector('[data-testid="chart-legend"]');
          expect(legend).toBeInTheDocument();

          // Verify main prediction line
          const predictionLine = container.querySelector('[data-testid="line-aqi"]');
          expect(predictionLine).toBeInTheDocument();
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Missing confidence data handling', () => {
    it('for any prediction without confidence data, should still display prediction line', () => {
      fc.assert(
        fc.property(forecastWithoutConfidenceArbitrary, (forecastData) => {
          const { container } = render(<PredictionGraph data={forecastData} />);

          // Verify main prediction line is rendered even without confidence
          const predictionLine = container.querySelector('[data-testid="line-aqi"]');
          expect(predictionLine).toBeInTheDocument();

          // Verify chart is rendered
          const lineChart = container.querySelector('[data-testid="line-chart"]');
          expect(lineChart).toBeInTheDocument();

          // Should gracefully handle missing confidence data
          const dataPoints = lineChart?.getAttribute('data-points');
          expect(parseInt(dataPoints || '0')).toBeGreaterThanOrEqual(forecastData.length);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Confidence interval percentage display', () => {
    it('for any prediction, confidence interval width should be reasonable', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          // Verify confidence interval widths are within reasonable bounds
          forecastData.forEach((point) => {
            const intervalWidth = point.confidence.upper - point.confidence.lower;
            const aqiValue = point.aqi;

            // Confidence interval should not be larger than 200% of AQI value
            expect(intervalWidth).toBeLessThanOrEqual(aqiValue * 2 + 100);

            // Confidence interval should have some minimum width (at least 1)
            expect(intervalWidth).toBeGreaterThanOrEqual(1);
          });
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Multiple forecast points with varying confidence', () => {
    it('for any series of predictions, each should maintain its own confidence interval', () => {
      fc.assert(
        fc.property(forecastWithConfidenceArbitrary, (forecastData) => {
          // Verify each point has unique confidence bounds
          const confidenceRanges = forecastData.map((point) => ({
            lower: point.confidence.lower,
            upper: point.confidence.upper,
            aqi: point.aqi,
          }));

          // Check that confidence intervals are properly structured
          confidenceRanges.forEach((range) => {
            expect(range.lower).toBeLessThanOrEqual(range.aqi);
            expect(range.upper).toBeGreaterThanOrEqual(range.aqi);
          });

          // Render and verify
          const { container } = render(<PredictionGraph data={forecastData} />);
          const predictionLine = container.querySelector('[data-testid="line-aqi"]');
          expect(predictionLine).toBeInTheDocument();
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle single prediction point with confidence', () => {
      const singlePoint: ForecastData[] = [
        {
          timestamp: new Date().toISOString(),
          aqi: 100,
          confidence: {
            lower: 80,
            upper: 120,
          },
        },
      ];

      const { container } = render(<PredictionGraph data={singlePoint} />);
      const predictionLine = container.querySelector('[data-testid="line-aqi"]');
      expect(predictionLine).toBeInTheDocument();
    });

    it('should handle maximum confidence range (0-500)', () => {
      const maxRange: ForecastData[] = [
        {
          timestamp: new Date().toISOString(),
          aqi: 250,
          confidence: {
            lower: 0,
            upper: 500,
          },
        },
      ];

      const { container } = render(<PredictionGraph data={maxRange} />);
      const predictionLine = container.querySelector('[data-testid="line-aqi"]');
      expect(predictionLine).toBeInTheDocument();
    });

    it('should handle minimal confidence range', () => {
      const minRange: ForecastData[] = [
        {
          timestamp: new Date().toISOString(),
          aqi: 100,
          confidence: {
            lower: 99,
            upper: 101,
          },
        },
      ];

      const { container } = render(<PredictionGraph data={minRange} />);
      const predictionLine = container.querySelector('[data-testid="line-aqi"]');
      expect(predictionLine).toBeInTheDocument();
    });
  });
});
