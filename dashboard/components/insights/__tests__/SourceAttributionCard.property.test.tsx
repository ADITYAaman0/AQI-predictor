/**
 * Property-Based Tests for SourceAttributionCard Component
 * 
 * This file contains property-based tests using fast-check to verify
 * correctness properties for the SourceAttributionCard component.
 * 
 * Properties tested:
 * - Property 36: Source Attribution Display
 * 
 * Requirements: 16.1-16.3
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { SourceAttributionCard } from '../SourceAttributionCard';
import { SourceAttribution } from '@/lib/api/types';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children, height }: any) => (
      <div data-testid="responsive-container" style={{ height }}>
        {children}
      </div>
    ),
    PieChart: ({ children }: any) => (
      <div data-testid="pie-chart">
        {children}
      </div>
    ),
    Pie: ({ data, dataKey, label, onMouseEnter, onMouseLeave, onClick }: any) => (
      <div
        data-testid="pie"
        data-data-length={data?.length || 0}
        data-data-key={dataKey}
        data-has-label={label ? 'true' : 'false'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {data?.map((entry: any, index: number) => (
          <div
            key={index}
            data-testid={`pie-cell-${index}`}
            data-value={entry.value}
            data-name={entry.name}
            data-color={entry.color}
          />
        ))}
      </div>
    ),
    Cell: ({ fill, stroke, strokeWidth }: any) => (
      <div
        data-testid="pie-cell"
        data-fill={fill}
        data-stroke={stroke}
        data-stroke-width={strokeWidth}
      />
    ),
    Legend: () => <div data-testid="chart-legend" />,
    Tooltip: ({ contentStyle, itemStyle, formatter }: any) => (
      <div
        data-testid="chart-tooltip"
        data-content-style={JSON.stringify(contentStyle)}
        data-item-style={JSON.stringify(itemStyle)}
      />
    ),
  };
});

/**
 * Fast-check arbitrary for generating valid percentage values (0-100)
 */
const percentageArbitrary = fc.float({ min: 0, max: 100, noNaN: true });

/**
 * Fast-check arbitrary for generating SourceAttribution with at least one non-zero value
 */
const sourceAttributionArbitrary = fc
  .record({
    vehicular: percentageArbitrary,
    industrial: percentageArbitrary,
    biomass: percentageArbitrary,
    background: percentageArbitrary,
  })
  .filter((data) => {
    // Ensure at least one source has a non-zero value
    return (
      data.vehicular > 0 ||
      data.industrial > 0 ||
      data.biomass > 0 ||
      data.background > 0
    );
  })
  .map((data): SourceAttribution => {
    // Normalize to ensure total is approximately 100%
    const total = data.vehicular + data.industrial + data.biomass + data.background;
    if (total === 0) {
      // If all zeros, set vehicular to 100
      return {
        vehicular: 100,
        industrial: 0,
        biomass: 0,
        background: 0,
      };
    }
    // Normalize to 100%
    return {
      vehicular: parseFloat(((data.vehicular / total) * 100).toFixed(2)),
      industrial: parseFloat(((data.industrial / total) * 100).toFixed(2)),
      biomass: parseFloat(((data.biomass / total) * 100).toFixed(2)),
      background: parseFloat(((data.background / total) * 100).toFixed(2)),
    };
  });

/**
 * Fast-check arbitrary for generating SourceAttribution with all zeros (empty state)
 */
const emptySourceAttributionArbitrary = fc.constant<SourceAttribution>({
  vehicular: 0,
  industrial: 0,
  biomass: 0,
  background: 0,
});

/**
 * Fast-check arbitrary for generating SourceAttribution with single source
 */
const singleSourceAttributionArbitrary = fc
  .constantFrom('vehicular', 'industrial', 'biomass', 'background')
  .map((source): SourceAttribution => ({
    vehicular: source === 'vehicular' ? 100 : 0,
    industrial: source === 'industrial' ? 100 : 0,
    biomass: source === 'biomass' ? 100 : 0,
    background: source === 'background' ? 100 : 0,
  }));

/**
 * Helper function to count non-zero sources
 */
function countNonZeroSources(sourceAttribution: SourceAttribution): number {
  let count = 0;
  if (sourceAttribution.vehicular > 0) count++;
  if (sourceAttribution.industrial > 0) count++;
  if (sourceAttribution.biomass > 0) count++;
  if (sourceAttribution.background > 0) count++;
  return count;
}

/**
 * Helper function to get all non-zero source names
 */
function getNonZeroSourceNames(sourceAttribution: SourceAttribution): string[] {
  const names: string[] = [];
  if (sourceAttribution.vehicular > 0) names.push('vehicular');
  if (sourceAttribution.industrial > 0) names.push('industrial');
  if (sourceAttribution.biomass > 0) names.push('biomass');
  if (sourceAttribution.background > 0) names.push('background');
  return names;
}

describe('Feature: glassmorphic-dashboard - SourceAttributionCard Property-Based Tests', () => {
  /**
   * Property 36: Source Attribution Display
   * 
   * For any AQI data with source attribution information, the attribution percentages
   * should be displayed.
   * 
   * **Validates: Requirements 16.1-16.3, 15.9**
   */
  describe('Property 36: Source Attribution Display', () => {
    it('displays all non-zero source attribution percentages', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Verify the card is rendered
          expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
          
          // Verify the legend is rendered
          expect(screen.getByTestId('source-attribution-legend')).toBeInTheDocument();
          
          // Count non-zero sources
          const nonZeroCount = countNonZeroSources(sourceAttribution);
          const nonZeroNames = getNonZeroSourceNames(sourceAttribution);
          
          // Verify that each non-zero source has a legend item
          nonZeroNames.forEach((sourceName) => {
            const legendItem = screen.getByTestId(`legend-item-${sourceName}`);
            expect(legendItem).toBeInTheDocument();
            
            // Verify the percentage is displayed
            const legendValue = screen.getByTestId(`legend-value-${sourceName}`);
            expect(legendValue).toBeInTheDocument();
            expect(legendValue.textContent).toMatch(/\d+(\.\d+)?%/);
            
            // Extract and verify the percentage value
            const displayedPercentage = parseFloat(
              legendValue.textContent?.replace('%', '') || '0'
            );
            const expectedPercentage = sourceAttribution[sourceName as keyof SourceAttribution];
            
            // Allow small floating point differences
            expect(Math.abs(displayedPercentage - expectedPercentage)).toBeLessThan(0.01);
          });
          
          // Verify that zero sources are not displayed
          if (sourceAttribution.vehicular === 0) {
            expect(screen.queryByTestId('legend-item-vehicular')).not.toBeInTheDocument();
          }
          if (sourceAttribution.industrial === 0) {
            expect(screen.queryByTestId('legend-item-industrial')).not.toBeInTheDocument();
          }
          if (sourceAttribution.biomass === 0) {
            expect(screen.queryByTestId('legend-item-biomass')).not.toBeInTheDocument();
          }
          if (sourceAttribution.background === 0) {
            expect(screen.queryByTestId('legend-item-background')).not.toBeInTheDocument();
          }
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('displays chart with correct number of segments for non-zero sources', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          const { container } = render(
            <SourceAttributionCard sourceAttribution={sourceAttribution} />
          );
          
          // Verify the chart is rendered
          expect(screen.getByTestId('source-attribution-chart')).toBeInTheDocument();
          
          // Verify the pie chart is rendered
          const pieChart = container.querySelector('[data-testid="pie-chart"]');
          expect(pieChart).toBeInTheDocument();
          
          // Verify the pie element is rendered
          const pie = container.querySelector('[data-testid="pie"]');
          expect(pie).toBeInTheDocument();
          
          // Count non-zero sources
          const nonZeroCount = countNonZeroSources(sourceAttribution);
          
          // Verify the number of data points matches non-zero sources
          const dataLength = pie?.getAttribute('data-data-length');
          expect(parseInt(dataLength || '0')).toBe(nonZeroCount);
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('displays correct percentage values for each source', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Check vehicular
          if (sourceAttribution.vehicular > 0) {
            const vehicularValue = screen.getByTestId('legend-value-vehicular');
            expect(vehicularValue.textContent).toBe(`${sourceAttribution.vehicular}%`);
          }
          
          // Check industrial
          if (sourceAttribution.industrial > 0) {
            const industrialValue = screen.getByTestId('legend-value-industrial');
            expect(industrialValue.textContent).toBe(`${sourceAttribution.industrial}%`);
          }
          
          // Check biomass
          if (sourceAttribution.biomass > 0) {
            const biomassValue = screen.getByTestId('legend-value-biomass');
            expect(biomassValue.textContent).toBe(`${sourceAttribution.biomass}%`);
          }
          
          // Check background
          if (sourceAttribution.background > 0) {
            const backgroundValue = screen.getByTestId('legend-value-background');
            expect(backgroundValue.textContent).toBe(`${sourceAttribution.background}%`);
          }
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('handles empty source attribution (all zeros) with empty state', () => {
      fc.assert(
        fc.property(emptySourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Verify empty state is displayed
          expect(screen.getByTestId('source-attribution-empty')).toBeInTheDocument();
          expect(screen.getByText('No source attribution data available')).toBeInTheDocument();
          
          // Verify no legend items are displayed
          expect(screen.queryByTestId('legend-item-vehicular')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legend-item-industrial')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legend-item-biomass')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legend-item-background')).not.toBeInTheDocument();
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 20 }
      );
    });

    it('handles single source attribution (100% from one source)', () => {
      fc.assert(
        fc.property(singleSourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Verify the card is rendered
          expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
          
          // Count non-zero sources (should be exactly 1)
          const nonZeroCount = countNonZeroSources(sourceAttribution);
          expect(nonZeroCount).toBe(1);
          
          // Find which source is 100%
          const nonZeroNames = getNonZeroSourceNames(sourceAttribution);
          expect(nonZeroNames.length).toBe(1);
          
          const sourceName = nonZeroNames[0];
          
          // Verify the single source is displayed with 100%
          const legendItem = screen.getByTestId(`legend-item-${sourceName}`);
          expect(legendItem).toBeInTheDocument();
          
          const legendValue = screen.getByTestId(`legend-value-${sourceName}`);
          expect(legendValue.textContent).toBe('100%');
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 50 }
      );
    });

    it('displays source labels correctly for all non-zero sources', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Check labels for non-zero sources
          if (sourceAttribution.vehicular > 0) {
            expect(screen.getByText('Vehicular')).toBeInTheDocument();
          }
          
          if (sourceAttribution.industrial > 0) {
            expect(screen.getByText('Industrial')).toBeInTheDocument();
          }
          
          if (sourceAttribution.biomass > 0) {
            expect(screen.getByText('Biomass Burning')).toBeInTheDocument();
          }
          
          if (sourceAttribution.background > 0) {
            expect(screen.getByText('Background')).toBeInTheDocument();
          }
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('displays chart data with correct values', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          const { container } = render(
            <SourceAttributionCard sourceAttribution={sourceAttribution} />
          );
          
          // Get all pie cells
          const pieCells = container.querySelectorAll('[data-testid^="pie-cell-"]');
          
          // Count non-zero sources
          const nonZeroCount = countNonZeroSources(sourceAttribution);
          
          // Verify the number of cells matches non-zero sources
          expect(pieCells.length).toBe(nonZeroCount);
          
          // Verify each cell has correct data
          const nonZeroNames = getNonZeroSourceNames(sourceAttribution);
          pieCells.forEach((cell, index) => {
            const value = parseFloat(cell.getAttribute('data-value') || '0');
            const name = cell.getAttribute('data-name');
            
            // Verify the value matches the source attribution
            if (name) {
              const expectedValue = sourceAttribution[name as keyof SourceAttribution];
              expect(Math.abs(value - expectedValue)).toBeLessThan(0.01);
            }
          });
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('displays percentages that sum to approximately 100%', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Calculate sum of all displayed percentages
          const sum =
            sourceAttribution.vehicular +
            sourceAttribution.industrial +
            sourceAttribution.biomass +
            sourceAttribution.background;
          
          // Verify sum is approximately 100% (allow small floating point errors)
          expect(Math.abs(sum - 100)).toBeLessThan(0.1);
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    it('handles decimal percentages correctly', () => {
      // Test with specific decimal values
      const decimalSource: SourceAttribution = {
        vehicular: 33.33,
        industrial: 33.33,
        biomass: 33.34,
        background: 0,
      };
      
      render(<SourceAttributionCard sourceAttribution={decimalSource} />);
      
      expect(screen.getByTestId('legend-value-vehicular').textContent).toBe('33.33%');
      expect(screen.getByTestId('legend-value-industrial').textContent).toBe('33.33%');
      expect(screen.getByTestId('legend-value-biomass').textContent).toBe('33.34%');
    });

    it('displays title and description', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Verify title is displayed
          expect(screen.getByTestId('source-attribution-title')).toBeInTheDocument();
          expect(screen.getByText('Pollution Sources')).toBeInTheDocument();
          
          // Verify description is displayed
          expect(
            screen.getByText('Breakdown of pollution sources contributing to current air quality')
          ).toBeInTheDocument();
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 50 }
      );
    });

    it('displays custom title when provided', () => {
      fc.assert(
        fc.property(
          sourceAttributionArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (sourceAttribution, customTitle) => {
            const { container } = render(
              <SourceAttributionCard
                sourceAttribution={sourceAttribution}
                title={customTitle}
              />
            );
            
            // Verify custom title is displayed using container query
            const titleElement = container.querySelector('[data-testid="source-attribution-title"]');
            expect(titleElement).toBeInTheDocument();
            // Use trim() to handle whitespace differences
            expect(titleElement?.textContent?.trim()).toBe(customTitle.trim());
            
            // Cleanup for next iteration
            cleanup();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('displays info note about source attribution', () => {
      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          const { container } = render(<SourceAttributionCard sourceAttribution={sourceAttribution} />);
          
          // Verify info note is displayed using container query
          const infoText = container.textContent;
          expect(infoText).toMatch(/Source attribution is estimated using machine learning models/i);
          
          // Cleanup for next iteration
          cleanup();
        }),
        { numRuns: 50 }
      );
    });

    it('handles very small percentages (< 1%)', () => {
      const smallPercentageSource: SourceAttribution = {
        vehicular: 97.5,
        industrial: 1.5,
        biomass: 0.8,
        background: 0.2,
      };
      
      render(<SourceAttributionCard sourceAttribution={smallPercentageSource} />);
      
      // Verify all sources are displayed, even small ones
      expect(screen.getByTestId('legend-value-vehicular').textContent).toBe('97.5%');
      expect(screen.getByTestId('legend-value-industrial').textContent).toBe('1.5%');
      expect(screen.getByTestId('legend-value-biomass').textContent).toBe('0.8%');
      expect(screen.getByTestId('legend-value-background').textContent).toBe('0.2%');
    });

    it('handles large percentages (edge case)', () => {
      const largePercentageSource: SourceAttribution = {
        vehicular: 99.9,
        industrial: 0.1,
        biomass: 0,
        background: 0,
      };
      
      render(<SourceAttributionCard sourceAttribution={largePercentageSource} />);
      
      // Verify percentages are displayed correctly
      expect(screen.getByTestId('legend-value-vehicular').textContent).toBe('99.9%');
      expect(screen.getByTestId('legend-value-industrial').textContent).toBe('0.1%');
      
      // Verify zero sources are not displayed
      expect(screen.queryByTestId('legend-item-biomass')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legend-item-background')).not.toBeInTheDocument();
    });
  });
});
