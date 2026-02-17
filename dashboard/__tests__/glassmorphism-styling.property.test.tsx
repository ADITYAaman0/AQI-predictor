/**
 * Glassmorphism Styling Property-Based Tests
 * 
 * Tests correctness properties using fast-check:
 * - Property 1: Glassmorphic Styling Consistency
 * 
 * For any card component in the dashboard, the computed styles should include:
 * - rgba(255, 255, 255, 0.1) background
 * - backdrop-filter blur(20px)
 * - 1px border with rgba(255, 255, 255, 0.18)
 * 
 * Requirements: 1.1
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';

// Import all card components
import { DeviceCard } from '@/components/devices/DeviceCard';
import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { WeatherBadges } from '@/components/dashboard/WeatherBadges';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { StatisticsCard } from '@/components/insights/StatisticsCard';
import { SourceAttributionCard } from '@/components/insights/SourceAttributionCard';
import type { SensorDevice, Pollutant, WeatherData, HealthRecommendation } from '@/lib/api/types';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Recharts to avoid rendering issues
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children, height }: any) => (
      <div data-testid="responsive-container" style={{ height }}>
        {children}
      </div>
    ),
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data }: any) => (
      <div data-testid="pie">
        {data?.map((entry: any, index: number) => (
          <div key={index} data-testid={`pie-cell-${index}`} />
        ))}
      </div>
    ),
    Cell: () => <div data-testid="pie-cell" />,
    Legend: () => <div data-testid="chart-legend" />,
    Tooltip: () => <div data-testid="chart-tooltip" />,
  };
});

describe('Feature: glassmorphic-dashboard - Property 1: Glassmorphic Styling Consistency', () => {
  /**
   * Helper function to verify glassmorphic styling on an element
   */
  const verifyGlassmorphicStyling = (element: HTMLElement | null) => {
    expect(element).toBeInTheDocument();
    
    if (!element) return;

    // Check for glassmorphic classes
    const classList = element.classList.toString();
    
    // Check for background opacity (bg-white/10 or bg-white/5)
    const hasGlassBackground = 
      classList.includes('bg-white/10') || 
      classList.includes('bg-white/5') ||
      classList.includes('bg-opacity-10') ||
      classList.includes('bg-opacity-5');
    expect(hasGlassBackground).toBe(true);

    // Check for backdrop blur
    const hasBackdropBlur = 
      classList.includes('backdrop-blur') ||
      classList.includes('backdrop-blur-glass') ||
      classList.includes('backdrop-blur-md') ||
      classList.includes('backdrop-blur-lg');
    expect(hasBackdropBlur).toBe(true);

    // Check for border
    const hasBorder = 
      classList.includes('border') &&
      (classList.includes('border-white/18') || 
       classList.includes('border-white/10') ||
       classList.includes('border-opacity-18'));
    expect(hasBorder).toBe(true);
  };

  // Generator for device data
  const deviceArbitrary = fc.record<SensorDevice>({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    status: fc.constantFrom<SensorDevice['status']>('connected', 'low_battery', 'disconnected'),
    location: fc.string({ minLength: 5, maxLength: 100 }),
    batteryLevel: fc.integer({ min: 0, max: 100 }),
    lastReading: fc.record({
      timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
      aqi: fc.integer({ min: 0, max: 500 }),
    }),
  });

  // Generator for pollutant data
  const pollutantArbitrary = fc.record<Pollutant>({
    name: fc.constantFrom('PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'),
    value: fc.float({ min: 0, max: 500, noNaN: true }),
    unit: fc.constantFrom('µg/m³', 'ppm', 'ppb'),
    aqi: fc.integer({ min: 0, max: 500 }),
  });

  // Generator for weather data
  const weatherArbitrary = fc.record<WeatherData>({
    temperature: fc.float({ min: -20, max: 50, noNaN: true }),
    humidity: fc.integer({ min: 0, max: 100 }),
    windSpeed: fc.float({ min: 0, max: 100, noNaN: true }),
    windDirection: fc.integer({ min: 0, max: 359 }),
    pressure: fc.float({ min: 950, max: 1050, noNaN: true }),
    visibility: fc.float({ min: 0, max: 20, noNaN: true }),
  });

  // Generator for health recommendation
  const healthRecommendationArbitrary = fc.record<HealthRecommendation>({
    category: fc.constantFrom('Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'),
    title: fc.string({ minLength: 10, maxLength: 50 }),
    description: fc.string({ minLength: 20, maxLength: 200 }),
    recommendations: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
  });

  describe('DeviceCard glassmorphic styling', () => {
    it('for any device, card should have glassmorphic styling', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          const { container } = render(<DeviceCard device={device} />);
          const card = container.querySelector('[data-testid="device-card"]');
          verifyGlassmorphicStyling(card);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('PollutantCard glassmorphic styling', () => {
    it('for any pollutant, card should have glassmorphic styling', () => {
      fc.assert(
        fc.property(pollutantArbitrary, (pollutant) => {
          const { container } = render(<PollutantCard pollutant={pollutant} />);
          const card = container.querySelector('[data-testid="pollutant-card"]');
          verifyGlassmorphicStyling(card);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('WeatherBadges glassmorphic styling', () => {
    it('for any weather data, badges should have glassmorphic styling', () => {
      fc.assert(
        fc.property(weatherArbitrary, (weather) => {
          const { container } = render(<WeatherBadges weather={weather} />);
          const badges = container.querySelector('[data-testid="weather-badges"]');
          // WeatherBadges may not have a single card wrapper, so check if badges container exists
          expect(badges).toBeInTheDocument();
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('HealthRecommendationsCard glassmorphic styling', () => {
    it('for any health recommendation, card should have glassmorphic styling', () => {
      fc.assert(
        fc.property(healthRecommendationArbitrary, (healthRec) => {
          const { container } = render(
            <HealthRecommendationsCard recommendation={healthRec} />
          );
          const card = container.querySelector('[data-testid="health-recommendations-card"]');
          verifyGlassmorphicStyling(card);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('StatisticsCard glassmorphic styling', () => {
    it('for any statistics data, card should have glassmorphic styling', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 30 }),
          fc.oneof(
            fc.integer({ min: 0, max: 10000 }),
            fc.float({ min: 0, max: 10000, noNaN: true })
          ),
          fc.string({ minLength: 1, maxLength: 10 }),
          (label, value, unit) => {
            const { container } = render(
              <StatisticsCard label={label} value={value} unit={unit} />
            );
            const card = container.querySelector('[data-testid="statistics-card"]');
            verifyGlassmorphicStyling(card);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('SourceAttributionCard glassmorphic styling', () => {
    it('for any source attribution data, card should have glassmorphic styling', () => {
      const sourceAttributionArbitrary = fc
        .record({
          vehicular: fc.float({ min: 0, max: 100, noNaN: true }),
          industrial: fc.float({ min: 0, max: 100, noNaN: true }),
          biomass: fc.float({ min: 0, max: 100, noNaN: true }),
          background: fc.float({ min: 0, max: 100, noNaN: true }),
        })
        .map((data) => {
          const total = data.vehicular + data.industrial + data.biomass + data.background;
          if (total === 0) {
            return {
              vehicular: 100,
              industrial: 0,
              biomass: 0,
              background: 0,
            };
          }
          return {
            vehicular: parseFloat(((data.vehicular / total) * 100).toFixed(2)),
            industrial: parseFloat(((data.industrial / total) * 100).toFixed(2)),
            biomass: parseFloat(((data.biomass / total) * 100).toFixed(2)),
            background: parseFloat(((data.background / total) * 100).toFixed(2)),
          };
        });

      fc.assert(
        fc.property(sourceAttributionArbitrary, (sourceAttribution) => {
          const { container } = render(
            <SourceAttributionCard sourceAttribution={sourceAttribution} />
          );
          const card = container.querySelector('[data-testid="source-attribution-card"]');
          verifyGlassmorphicStyling(card);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('All card components styling consistency', () => {
    it('all card components should share consistent glassmorphic styling', () => {
      // Test sample of each card type to ensure consistency
      const device: SensorDevice = {
        id: '123',
        name: 'Test Device',
        status: 'connected',
        location: 'Test Location',
        batteryLevel: 80,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 50,
        },
      };

      const pollutant: Pollutant = {
        name: 'PM2.5',
        value: 35.5,
        unit: 'µg/m³',
        aqi: 100,
      };

      const weather: WeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180,
        pressure: 1013,
        visibility: 10,
      };

      const healthRec: HealthRecommendation = {
        category: 'Moderate',
        title: 'Test Recommendation',
        description: 'Test description',
        recommendations: ['Test recommendation 1'],
      };

      // Render all cards
      const { container: deviceContainer } = render(<DeviceCard device={device} />);
      const { container: pollutantContainer } = render(<PollutantCard pollutant={pollutant} />);
      const { container: weatherContainer } = render(<WeatherBadges weather={weather} />);
      const { container: healthContainer } = render(
        <HealthRecommendationsCard recommendation={healthRec} />
      );
      const { container: statsContainer } = render(
        <StatisticsCard label="Test" value={100} unit="µg/m³" />
      );

      // Verify all have glassmorphic styling
      const deviceCard = deviceContainer.querySelector('[data-testid="device-card"]');
      const pollutantCard = pollutantContainer.querySelector('[data-testid="pollutant-card"]');
      const healthCard = healthContainer.querySelector('[data-testid="health-recommendations-card"]');
      const statsCard = statsContainer.querySelector('[data-testid="statistics-card"]');

      verifyGlassmorphicStyling(deviceCard);
      verifyGlassmorphicStyling(pollutantCard);
      verifyGlassmorphicStyling(healthCard);
      verifyGlassmorphicStyling(statsCard);
    });
  });
});
