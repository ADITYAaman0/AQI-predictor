/**
 * PollutantCard Icons and Color Coding Tests
 * 
 * Tests for Task 6.2: Add pollutant icons and color coding
 * 
 * Requirements tested:
 * - 3.3: Icon set for each pollutant (PM2.5, PM10, O3, NO2, SO2, CO)
 * - 3.6: Color coding based on AQI sub-index
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PollutantCard } from '../PollutantCard';
import { PollutantType } from '@/lib/api/types';

describe('PollutantCard - Icons and Color Coding (Task 6.2)', () => {
  // ============================================================================
  // Icon Tests - Requirement 3.3
  // ============================================================================

  describe('Pollutant Icons', () => {
    const pollutants: PollutantType[] = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];

    test.each(pollutants)('renders icon for %s pollutant', (pollutant) => {
      const { container } = render(
        <PollutantCard
          pollutant={pollutant}
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      // Check that an SVG icon is rendered
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label');
    });

    test('PM2.5 has distinct fine particle icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={35}
          unit="μg/m³"
          aqi={100}
          status="moderate"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // PM2.5 should have multiple small circles (fine particles)
      const circles = svg?.querySelectorAll('circle');
      expect(circles?.length).toBeGreaterThan(5); // Fine particles have more dots
    });

    test('PM10 has distinct coarse particle icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm10"
          value={85}
          unit="μg/m³"
          aqi={120}
          status="unhealthy"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // PM10 should have fewer, larger circles (coarse particles)
      const circles = svg?.querySelectorAll('circle');
      expect(circles?.length).toBe(5); // Coarse particles have 5 dots
    });

    test('O3 has sun/ozone icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="o3"
          value={120}
          unit="μg/m³"
          aqi={150}
          status="unhealthy"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // O3 should have circle and rays
      const circle = svg?.querySelector('circle');
      const paths = svg?.querySelectorAll('path');
      expect(circle).toBeInTheDocument();
      expect(paths?.length).toBeGreaterThan(0);
    });

    test('NO2 has gas/smoke wave icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="no2"
          value={60}
          unit="μg/m³"
          aqi={90}
          status="moderate"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // NO2 should have wave paths
      const paths = svg?.querySelectorAll('path');
      expect(paths?.length).toBeGreaterThan(3); // Multiple wave paths
    });

    test('SO2 has industrial smoke icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="so2"
          value={40}
          unit="μg/m³"
          aqi={70}
          status="moderate"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // SO2 should have factory/building structure
      const rect = svg?.querySelector('rect');
      expect(rect).toBeInTheDocument();
    });

    test('CO has exhaust/emission icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="co"
          value={2.5}
          unit="mg/m³"
          aqi={60}
          status="moderate"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // CO should have vehicle/exhaust structure
      const rect = svg?.querySelector('rect');
      const circles = svg?.querySelectorAll('circle');
      expect(rect).toBeInTheDocument();
      expect(circles?.length).toBeGreaterThan(0);
    });

    test('custom icon prop overrides default icon', () => {
      const customIcon = <div data-testid="custom-icon">Custom</div>;
      
      render(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
          icon={customIcon}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Color Coding Tests - Requirement 3.6
  // ============================================================================

  describe('Color Coding Based on AQI Sub-index', () => {
    test('Good (0-50): displays green color (#4ADE80)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={25}
          unit="μg/m³"
          aqi={40}
          status="good"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#4ADE80' });
    });

    test('Moderate (51-100): displays yellow color (#FCD34D)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#FCD34D' });
    });

    test('Unhealthy for Sensitive (101-150): displays orange color (#FB923C)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={75}
          unit="μg/m³"
          aqi={125}
          status="unhealthy_sensitive"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#FB923C' });
    });

    test('Unhealthy (151-200): displays red color (#EF4444)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={100}
          unit="μg/m³"
          aqi={175}
          status="unhealthy"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#EF4444' });
    });

    test('Very Unhealthy (201-300): displays dark red color (#B91C1C)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={150}
          unit="μg/m³"
          aqi={250}
          status="very_unhealthy"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#B91C1C' });
    });

    test('Hazardous (301+): displays brown color (#7C2D12)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={250}
          unit="μg/m³"
          aqi={400}
          status="hazardous"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#7C2D12' });
    });

    test('color is applied to icon', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      const iconContainer = container.querySelector('svg')?.parentElement;
      expect(iconContainer).toHaveStyle({ color: '#FCD34D' });
    });

    test('color is applied to status label', () => {
      const { getByTestId } = render(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      const statusLabel = getByTestId('pollutant-status');
      expect(statusLabel).toHaveStyle({ color: '#FCD34D' });
    });

    test('color is applied to progress bar gradient', () => {
      const { getByTestId } = render(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      const progressBar = getByTestId('progress-bar-fill');
      const background = progressBar.style.background;
      expect(background).toContain('#FCD34D');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Icons and Colors Integration', () => {
    test('each pollutant type displays correct icon with correct color', () => {
      const testCases: Array<{
        pollutant: PollutantType;
        aqi: number;
        expectedColor: string;
      }> = [
        { pollutant: 'pm25', aqi: 40, expectedColor: '#4ADE80' },
        { pollutant: 'pm10', aqi: 75, expectedColor: '#FCD34D' },
        { pollutant: 'o3', aqi: 125, expectedColor: '#FB923C' },
        { pollutant: 'no2', aqi: 175, expectedColor: '#EF4444' },
        { pollutant: 'so2', aqi: 250, expectedColor: '#B91C1C' },
        { pollutant: 'co', aqi: 400, expectedColor: '#7C2D12' },
      ];

      testCases.forEach(({ pollutant, aqi, expectedColor }) => {
        const { container } = render(
          <PollutantCard
            pollutant={pollutant}
            value={50}
            unit="μg/m³"
            aqi={aqi}
            status="test"
          />
        );

        // Check icon exists
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();

        // Check color is applied
        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: expectedColor });
      });
    });

    test('color changes dynamically with AQI value', () => {
      const { container, rerender } = render(
        <PollutantCard
          pollutant="pm25"
          value={25}
          unit="μg/m³"
          aqi={40}
          status="good"
        />
      );

      let card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#4ADE80' });

      // Update to moderate
      rerender(
        <PollutantCard
          pollutant="pm25"
          value={50}
          unit="μg/m³"
          aqi={75}
          status="moderate"
        />
      );

      card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#FCD34D' });

      // Update to unhealthy
      rerender(
        <PollutantCard
          pollutant="pm25"
          value={100}
          unit="μg/m³"
          aqi={175}
          status="unhealthy"
        />
      );

      card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#EF4444' });
    });

    test('all pollutants have accessible icon labels', () => {
      const pollutants: PollutantType[] = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];

      pollutants.forEach((pollutant) => {
        const { container } = render(
          <PollutantCard
            pollutant={pollutant}
            value={50}
            unit="μg/m³"
            aqi={75}
            status="moderate"
          />
        );

        const svg = container.querySelector('svg');
        const ariaLabel = svg?.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('icon');
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles AQI at exact threshold boundaries', () => {
      const thresholds = [
        { aqi: 50, color: '#4ADE80' },
        { aqi: 51, color: '#FCD34D' },
        { aqi: 100, color: '#FCD34D' },
        { aqi: 101, color: '#FB923C' },
        { aqi: 150, color: '#FB923C' },
        { aqi: 151, color: '#EF4444' },
        { aqi: 200, color: '#EF4444' },
        { aqi: 201, color: '#B91C1C' },
        { aqi: 300, color: '#B91C1C' },
        { aqi: 301, color: '#7C2D12' },
      ];

      thresholds.forEach(({ aqi, color }) => {
        const { container } = render(
          <PollutantCard
            pollutant="pm25"
            value={50}
            unit="μg/m³"
            aqi={aqi}
            status="test"
          />
        );

        const card = container.querySelector('.pollutant-card');
        expect(card).toHaveStyle({ borderColor: color });
      });
    });

    test('handles very high AQI values (500+)', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={500}
          unit="μg/m³"
          aqi={500}
          status="hazardous"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#7C2D12' });
    });

    test('handles AQI value of 0', () => {
      const { container } = render(
        <PollutantCard
          pollutant="pm25"
          value={0}
          unit="μg/m³"
          aqi={0}
          status="good"
        />
      );

      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#4ADE80' });
    });
  });
});
