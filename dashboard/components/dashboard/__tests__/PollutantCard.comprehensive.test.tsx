/**
 * Comprehensive Unit Tests for PollutantCard Component
 * Task 6.7: Write PollutantCard unit tests
 * 
 * Test Coverage:
 * - Rendering with different pollutant types (Requirements 3.1-3.7)
 * - Color coding logic (Requirement 3.6)
 * - Hover interactions (Requirement 3.5)
 * - Progress bar animations (Requirement 3.4)
 * - Accessibility features (Requirement 13.1-13.5)
 * - Edge cases and error handling
 * 
 * This file consolidates and extends existing test coverage to ensure
 * comprehensive validation of all PollutantCard functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PollutantCard, PollutantCardProps } from '../PollutantCard';
import { PollutantType } from '@/lib/api/types';

describe('PollutantCard - Comprehensive Unit Tests (Task 6.7)', () => {
  // ============================================================================
  // Test Data Setup
  // ============================================================================

  const defaultProps: PollutantCardProps = {
    pollutant: 'pm25' as PollutantType,
    value: 85.5,
    unit: 'μg/m³',
    aqi: 120,
    status: 'unhealthy',
  };

  const allPollutants: Array<{
    type: PollutantType;
    name: string;
    testValue: number;
    testUnit: string;
  }> = [
    { type: 'pm25', name: 'PM2.5', testValue: 35.5, testUnit: 'μg/m³' },
    { type: 'pm10', name: 'PM10', testValue: 85.2, testUnit: 'μg/m³' },
    { type: 'o3', name: 'O₃', testValue: 120.8, testUnit: 'μg/m³' },
    { type: 'no2', name: 'NO₂', testValue: 60.3, testUnit: 'μg/m³' },
    { type: 'so2', name: 'SO₂', testValue: 40.7, testUnit: 'μg/m³' },
    { type: 'co', name: 'CO', testValue: 2.5, testUnit: 'mg/m³' },
  ];

  const aqiCategories = [
    { range: '0-50', aqi: 30, status: 'good', color: '#4ADE80', label: 'Good' },
    { range: '51-100', aqi: 75, status: 'moderate', color: '#FCD34D', label: 'Moderate' },
    { range: '101-150', aqi: 125, status: 'unhealthy_sensitive', color: '#FB923C', label: 'Unhealthy for Sensitive' },
    { range: '151-200', aqi: 175, status: 'unhealthy', color: '#EF4444', label: 'Unhealthy' },
    { range: '201-300', aqi: 250, status: 'very_unhealthy', color: '#B91C1C', label: 'Very Unhealthy' },
    { range: '301+', aqi: 400, status: 'hazardous', color: '#7C2D12', label: 'Hazardous' },
  ];

  // ============================================================================
  // 1. Rendering Tests - Different Pollutant Types
  // ============================================================================

  describe('1. Rendering with Different Pollutant Types', () => {
    test('renders all required elements for each pollutant type', () => {
      allPollutants.forEach(({ type, name, testValue, testUnit }) => {
        const { container } = render(
          <PollutantCard
            pollutant={type}
            value={testValue}
            unit={testUnit}
            aqi={75}
            status="moderate"
          />
        );

        // Verify pollutant name
        expect(screen.getByTestId('pollutant-name')).toHaveTextContent(name);

        // Verify value is displayed
        expect(screen.getByTestId('pollutant-value')).toHaveTextContent(testValue.toFixed(1));

        // Verify unit is displayed
        expect(screen.getByTestId('pollutant-unit')).toHaveTextContent(testUnit);

        // Verify status is displayed
        expect(screen.getByTestId('pollutant-status')).toBeInTheDocument();

        // Verify progress bar exists
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        // Verify icon exists
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();

        // Clean up for next iteration
        container.remove();
      });
    });

    test('displays correct pollutant names with proper formatting', () => {
      const expectedNames: Record<PollutantType, string> = {
        pm25: 'PM2.5',
        pm10: 'PM10',
        o3: 'O₃',
        no2: 'NO₂',
        so2: 'SO₂',
        co: 'CO',
      };

      Object.entries(expectedNames).forEach(([type, expectedName]) => {
        const { rerender } = render(
          <PollutantCard
            {...defaultProps}
            pollutant={type as PollutantType}
          />
        );

        expect(screen.getByTestId('pollutant-name')).toHaveTextContent(expectedName);
        rerender(<div />);
      });
    });

    test('formats numeric values to one decimal place', () => {
      const testValues = [
        { input: 123.456, expected: '123.5' },
        { input: 0.123, expected: '0.1' },
        { input: 99.999, expected: '100.0' },
        { input: 50, expected: '50.0' },
        { input: 0, expected: '0.0' },
      ];

      testValues.forEach(({ input, expected }) => {
        const { rerender } = render(
          <PollutantCard {...defaultProps} value={input} />
        );

        expect(screen.getByTestId('pollutant-value')).toHaveTextContent(expected);
        rerender(<div />);
      });
    });

    test('renders with different unit types', () => {
      const units = ['μg/m³', 'mg/m³', 'ppm', 'ppb'];

      units.forEach((unit) => {
        const { rerender } = render(
          <PollutantCard {...defaultProps} unit={unit} />
        );

        expect(screen.getByTestId('pollutant-unit')).toHaveTextContent(unit);
        rerender(<div />);
      });
    });

    test('each pollutant has unique icon', () => {
      const iconElements: Record<string, number> = {};

      allPollutants.forEach(({ type }) => {
        const { container } = render(
          <PollutantCard
            {...defaultProps}
            pollutant={type}
          />
        );

        const svg = container.querySelector('svg');
        const svgContent = svg?.innerHTML || '';
        iconElements[type] = svgContent.length;

        container.remove();
      });

      // Verify that icons are different (different content lengths)
      const uniqueLengths = new Set(Object.values(iconElements));
      expect(uniqueLengths.size).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // 2. Color Coding Logic Tests
  // ============================================================================

  describe('2. Color Coding Logic', () => {
    test('applies correct color for each AQI category', () => {
      aqiCategories.forEach(({ aqi, status, color, label }) => {
        const { container } = render(
          <PollutantCard
            {...defaultProps}
            aqi={aqi}
            status={status}
          />
        );

        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: color });

        container.remove();
      });
    });

    test('color is consistently applied to all colored elements', () => {
      aqiCategories.forEach(({ aqi, status, color }) => {
        const { container } = render(
          <PollutantCard
            {...defaultProps}
            aqi={aqi}
            status={status}
          />
        );

        // Border color
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: color });

        // Icon color
        const iconContainer = container.querySelector('svg')?.parentElement;
        expect(iconContainer).toHaveStyle({ color });

        // Status label color
        const statusLabel = screen.getByTestId('pollutant-status');
        expect(statusLabel).toHaveStyle({ color });

        // Progress bar gradient includes color
        const progressBar = screen.getByTestId('progress-bar-fill');
        expect(progressBar.style.background).toContain(color);

        container.remove();
      });
    });

    test('handles AQI threshold boundaries correctly', () => {
      const boundaries = [
        { aqi: 50, expectedColor: '#4ADE80' },
        { aqi: 51, expectedColor: '#FCD34D' },
        { aqi: 100, expectedColor: '#FCD34D' },
        { aqi: 101, expectedColor: '#FB923C' },
        { aqi: 150, expectedColor: '#FB923C' },
        { aqi: 151, expectedColor: '#EF4444' },
        { aqi: 200, expectedColor: '#EF4444' },
        { aqi: 201, expectedColor: '#B91C1C' },
        { aqi: 300, expectedColor: '#B91C1C' },
        { aqi: 301, expectedColor: '#7C2D12' },
      ];

      boundaries.forEach(({ aqi, expectedColor }) => {
        const { container } = render(
          <PollutantCard {...defaultProps} aqi={aqi} />
        );

        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: expectedColor });

        container.remove();
      });
    });

    test('color updates dynamically when AQI changes', () => {
      const { container, rerender } = render(
        <PollutantCard {...defaultProps} aqi={40} status="good" />
      );

      let card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#4ADE80' });

      rerender(<PollutantCard {...defaultProps} aqi={175} status="unhealthy" />);
      card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#EF4444' });

      rerender(<PollutantCard {...defaultProps} aqi={400} status="hazardous" />);
      card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#7C2D12' });
    });

    test('status labels are formatted correctly', () => {
      const statusMappings = [
        { input: 'good', expected: 'Good' },
        { input: 'moderate', expected: 'Moderate' },
        { input: 'unhealthy_sensitive', expected: 'Unhealthy for Sensitive' },
        { input: 'unhealthy', expected: 'Unhealthy' },
        { input: 'very_unhealthy', expected: 'Very Unhealthy' },
        { input: 'hazardous', expected: 'Hazardous' },
      ];

      statusMappings.forEach(({ input, expected }) => {
        const { rerender } = render(
          <PollutantCard {...defaultProps} status={input} />
        );

        expect(screen.getByTestId('pollutant-status')).toHaveTextContent(expected);
        rerender(<div />);
      });
    });
  });

  // ============================================================================
  // 3. Hover Interactions Tests
  // ============================================================================

  describe('3. Hover Interactions', () => {
    test('shows tooltip on mouse enter', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');

      // Tooltip should not be visible initially
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();

      // Hover over card
      fireEvent.mouseEnter(card);

      // Tooltip should now be visible
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();
    });

    test('hides tooltip on mouse leave', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');

      // Show tooltip
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(card);
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();
    });

    test('tooltip displays complete information', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');
      fireEvent.mouseEnter(card);

      const tooltip = screen.getByTestId('pollutant-tooltip');

      // Check all information is present
      expect(tooltip).toHaveTextContent('PM2.5');
      expect(tooltip).toHaveTextContent('Value: 85.50 μg/m³');
      expect(tooltip).toHaveTextContent('AQI: 120');
      expect(tooltip).toHaveTextContent('Status: Unhealthy');
    });

    test('tooltip shows correct information for different pollutants', () => {
      allPollutants.forEach(({ type, name, testValue, testUnit }) => {
        const { container } = render(
          <PollutantCard
            pollutant={type}
            value={testValue}
            unit={testUnit}
            aqi={75}
            status="moderate"
          />
        );

        const card = screen.getByTestId(`pollutant-card-${type}`);
        fireEvent.mouseEnter(card);

        const tooltip = screen.getByTestId('pollutant-tooltip');
        expect(tooltip).toHaveTextContent(name);
        expect(tooltip).toHaveTextContent(`Value: ${testValue.toFixed(2)} ${testUnit}`);

        container.remove();
      });
    });

    test('tooltip has proper styling and backdrop blur', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');
      fireEvent.mouseEnter(card);

      const tooltip = screen.getByTestId('pollutant-tooltip');

      // Check classes
      expect(tooltip).toHaveClass('absolute');
      expect(tooltip).toHaveClass('inset-0');
      expect(tooltip).toHaveClass('bg-black/80');
      expect(tooltip).toHaveClass('backdrop-blur-sm');
      expect(tooltip).toHaveClass('animate-fade-in');
    });

    test('card has hover-lift class for CSS hover effects', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('hover-lift');
    });

    test('multiple hover interactions work correctly', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');

      // First hover
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(card);
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();

      // Second hover
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(card);
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. Progress Bar Tests
  // ============================================================================

  describe('4. Progress Bar Functionality', () => {
    test('displays progress bar with correct percentage', async () => {
      render(<PollutantCard {...defaultProps} percentage={65} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '65%' });
      }, { timeout: 200 });
    });

    test('animates progress bar from 0 to target percentage', async () => {
      render(<PollutantCard {...defaultProps} percentage={75} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      // Initially at 0%
      expect(progressBar).toHaveStyle({ width: '0%' });

      // Animates to target
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '75%' });
      }, { timeout: 200 });
    });

    test('progress bar has correct height (8px)', () => {
      render(<PollutantCard {...defaultProps} />);

      const progressBarContainer = screen.getByRole('progressbar');
      expect(progressBarContainer).toHaveStyle({ height: '8px' });
    });

    test('progress bar has gradient fill', () => {
      render(<PollutantCard {...defaultProps} />);

      const progressBar = screen.getByTestId('progress-bar-fill');
      expect(progressBar.style.background).toContain('linear-gradient');
    });

    test('calculates percentage from AQI when not provided', async () => {
      const testCases = [
        { aqi: 250, expectedPercentage: 50 },
        { aqi: 100, expectedPercentage: 20 },
        { aqi: 500, expectedPercentage: 100 },
      ];

      for (const { aqi, expectedPercentage } of testCases) {
        const { container } = render(
          <PollutantCard {...defaultProps} aqi={aqi} />
        );

        const progressBar = screen.getByTestId('progress-bar-fill');

        await waitFor(() => {
          expect(progressBar).toHaveStyle({ width: `${expectedPercentage}%` });
        }, { timeout: 200 });

        container.remove();
      }
    });

    test('caps percentage at 100%', async () => {
      render(<PollutantCard {...defaultProps} aqi={600} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '100%' });
      }, { timeout: 200 });
    });

    test('progress bar has proper ARIA attributes', async () => {
      render(<PollutantCard {...defaultProps} percentage={75} />);

      const progressBar = screen.getByRole('progressbar');

      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      }, { timeout: 200 });

      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    test('progress bar animation has correct timing', () => {
      render(<PollutantCard {...defaultProps} percentage={50} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      // Check animation classes
      expect(progressBar).toHaveClass('transition-all');
      expect(progressBar).toHaveClass('duration-1000');
      expect(progressBar).toHaveClass('ease-out');
    });
  });

  // ============================================================================
  // 5. Styling and Layout Tests
  // ============================================================================

  describe('5. Styling and Layout', () => {
    test('has correct card dimensions (200x180px)', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({
        width: '200px',
        height: '180px',
      });
    });

    test('has glassmorphic styling classes', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('glass-card');
    });

    test('has hover-lift class for interactions', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('hover-lift');
    });

    test('has correct border width (2px)', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderWidth: '2px' });
    });

    test('has transition classes for smooth animations', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
    });

    test('value has correct font size (48px)', () => {
      render(<PollutantCard {...defaultProps} />);

      const value = screen.getByTestId('pollutant-value');
      expect(value).toHaveStyle({
        fontSize: '48px',
        fontWeight: '700',
        lineHeight: '1',
      });
    });
  });

  // ============================================================================
  // 6. Accessibility Tests
  // ============================================================================

  describe('6. Accessibility', () => {
    test('has proper ARIA role', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    test('has descriptive ARIA label', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'PM2.5 pollutant card');
    });

    test('all pollutants have unique ARIA labels', () => {
      allPollutants.forEach(({ type, name }) => {
        const { container } = render(
          <PollutantCard {...defaultProps} pollutant={type} />
        );

        const card = screen.getByRole('article');
        expect(card).toHaveAttribute('aria-label', `${name} pollutant card`);

        container.remove();
      });
    });

    test('icons have aria-label attributes', () => {
      allPollutants.forEach(({ type }) => {
        const { container } = render(
          <PollutantCard {...defaultProps} pollutant={type} />
        );

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-label');

        container.remove();
      });
    });

    test('progress bar has descriptive aria-label', () => {
      render(<PollutantCard {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      const ariaLabel = progressBar.getAttribute('aria-label');

      expect(ariaLabel).toContain('PM2.5');
      expect(ariaLabel).toContain('level');
    });

    test('has proper data attributes for testing', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');
      expect(card).toHaveAttribute('data-pollutant', 'pm25');
      expect(card).toHaveAttribute('data-aqi', '120');
    });
  });

  // ============================================================================
  // 7. Custom Icon Tests
  // ============================================================================

  describe('7. Custom Icon Support', () => {
    test('renders custom icon when provided', () => {
      const customIcon = <div data-testid="custom-icon">Custom Icon</div>;

      render(<PollutantCard {...defaultProps} icon={customIcon} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    test('custom icon overrides default icon', () => {
      const customIcon = <div data-testid="custom-icon">Custom</div>;

      const { container } = render(
        <PollutantCard {...defaultProps} icon={customIcon} />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();

      // Default SVG icon should not be present
      const defaultSvg = container.querySelector('svg[aria-label*="PM2.5 icon"]');
      expect(defaultSvg).not.toBeInTheDocument();
    });

    test('renders default icon when custom icon is not provided', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 8. Edge Cases and Error Handling
  // ============================================================================

  describe('8. Edge Cases', () => {
    test('handles zero values correctly', () => {
      render(<PollutantCard {...defaultProps} value={0} aqi={0} />);

      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('0.0');
    });

    test('handles very large values', () => {
      render(<PollutantCard {...defaultProps} value={9999.99} aqi={500} />);

      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('10000.0');
    });

    test('handles very small decimal values', () => {
      render(<PollutantCard {...defaultProps} value={0.001} />);

      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('0.0');
    });

    test('handles negative AQI values gracefully', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={-10} />
      );

      // Should still render without crashing
      const card = container.querySelector('.pollutant-card');
      expect(card).toBeInTheDocument();
    });

    test('handles extremely high AQI values (>500)', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={1000} />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#7C2D12' }); // Hazardous color
    });

    test('handles empty or undefined status gracefully', () => {
      render(<PollutantCard {...defaultProps} status="" />);

      const statusLabel = screen.getByTestId('pollutant-status');
      expect(statusLabel).toBeInTheDocument();
    });

    test('handles percentage of 0', async () => {
      render(<PollutantCard {...defaultProps} percentage={0} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '0%' });
      }, { timeout: 200 });
    });

    test('handles percentage of 100', async () => {
      render(<PollutantCard {...defaultProps} percentage={100} />);

      const progressBar = screen.getByTestId('progress-bar-fill');

      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '100%' });
      }, { timeout: 200 });
    });
  });

  // ============================================================================
  // 9. Integration Tests
  // ============================================================================

  describe('9. Component Integration', () => {
    test('all elements work together correctly', async () => {
      render(<PollutantCard {...defaultProps} />);

      // Check all elements are present
      expect(screen.getByTestId('pollutant-name')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-value')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-unit')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-status')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Check hover interaction
      const card = screen.getByTestId('pollutant-card-pm25');
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();

      // Check progress bar animation
      const progressBar = screen.getByTestId('progress-bar-fill');
      await waitFor(() => {
        const width = progressBar.style.width;
        expect(parseFloat(width)).toBeGreaterThan(0);
      }, { timeout: 200 });
    });

    test('component updates correctly when props change', async () => {
      const { rerender } = render(
        <PollutantCard {...defaultProps} value={50} aqi={75} />
      );

      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('50.0');

      rerender(<PollutantCard {...defaultProps} value={100} aqi={150} />);

      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('100.0');
    });

    test('component maintains state during interactions', () => {
      render(<PollutantCard {...defaultProps} />);

      const card = screen.getByTestId('pollutant-card-pm25');

      // Multiple hover interactions
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
      fireEvent.mouseEnter(card);

      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();
    });
  });
});
