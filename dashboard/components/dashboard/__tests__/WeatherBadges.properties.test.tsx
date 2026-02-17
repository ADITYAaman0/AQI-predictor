/**
 * WeatherBadges Property-Based Tests
 * 
 * Property-based tests for the WeatherBadges component using fast-check.
 * Tests correctness properties that should hold for all valid inputs.
 * 
 * Property 11: Weather Data Synchronization
 * For any AQI update, weather data should also update in same cycle
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { WeatherBadges } from '../WeatherBadges';
import { weatherDataArbitrary } from '@/lib/test-utils/generators';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

describe('Feature: glassmorphic-dashboard, WeatherBadges Property-Based Tests', () => {
  describe('Property 11: Weather Data Synchronization', () => {
    it('for any weather data update, all badges should display the new values', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          weatherDataArbitrary,
          (initialWeather, updatedWeather) => {
            // Render with initial weather data
            const { rerender } = render(<WeatherBadges {...initialWeather} />);
            
            // Verify initial values are displayed
            expect(screen.getByTestId('temperature-value')).toHaveTextContent(
              Math.round(initialWeather.temperature).toString()
            );
            expect(screen.getByTestId('humidity-value')).toHaveTextContent(
              Math.round(initialWeather.humidity).toString()
            );
            expect(screen.getByTestId('wind-speed-value')).toHaveTextContent(
              Math.round(initialWeather.windSpeed).toString()
            );
            expect(screen.getByTestId('pressure-value')).toHaveTextContent(
              Math.round(initialWeather.pressure).toString()
            );
            
            // Update with new weather data (simulating AQI update cycle)
            rerender(<WeatherBadges {...updatedWeather} />);
            
            // Verify all values updated synchronously
            expect(screen.getByTestId('temperature-value')).toHaveTextContent(
              Math.round(updatedWeather.temperature).toString()
            );
            expect(screen.getByTestId('humidity-value')).toHaveTextContent(
              Math.round(updatedWeather.humidity).toString()
            );
            expect(screen.getByTestId('wind-speed-value')).toHaveTextContent(
              Math.round(updatedWeather.windSpeed).toString()
            );
            expect(screen.getByTestId('pressure-value')).toHaveTextContent(
              Math.round(updatedWeather.pressure).toString()
            );
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, all four badges should render simultaneously', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            render(<WeatherBadges {...weather} />);
            
            // All badges should be present in the same render cycle
            expect(screen.getByTestId('weather-badge-temperature')).toBeInTheDocument();
            expect(screen.getByTestId('weather-badge-humidity')).toBeInTheDocument();
            expect(screen.getByTestId('weather-badge-wind')).toBeInTheDocument();
            expect(screen.getByTestId('weather-badge-pressure')).toBeInTheDocument();
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data update, wind direction should update synchronously with wind speed', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          weatherDataArbitrary,
          (initialWeather, updatedWeather) => {
            const { rerender } = render(<WeatherBadges {...initialWeather} />);
            
            // Update weather data
            rerender(<WeatherBadges {...updatedWeather} />);
            
            // Verify wind direction updated synchronously
            const updatedWindArrow = screen.getByTestId('wind-arrow');
            const expectedRotation = updatedWeather.windDirection % 360;
            expect(updatedWindArrow).toHaveStyle({ transform: `rotate(${expectedRotation}deg)` });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Value Formatting Properties', () => {
    it('for any weather data, temperature should be rounded to nearest integer', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container, unmount } = render(<WeatherBadges {...weather} />);
            
            const tempValue = container.querySelector('[data-testid="temperature-value"]');
            const displayedValue = parseInt(tempValue?.textContent || '0', 10);
            const expectedValue = Math.round(weather.temperature);
            
            // Handle -0 vs 0 edge case (both should be treated as 0)
            expect(displayedValue).toEqual(expectedValue === -0 ? 0 : expectedValue);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, humidity should be rounded to nearest integer', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container, unmount } = render(<WeatherBadges {...weather} />);
            
            const humidityValue = container.querySelector('[data-testid="humidity-value"]');
            const displayedValue = parseInt(humidityValue?.textContent || '0', 10);
            const expectedValue = Math.round(weather.humidity);
            
            expect(displayedValue).toBe(expectedValue);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, wind speed should be rounded to nearest integer', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container, unmount } = render(<WeatherBadges {...weather} />);
            
            const windValue = container.querySelector('[data-testid="wind-speed-value"]');
            const displayedValue = parseInt(windValue?.textContent || '0', 10);
            const expectedValue = Math.round(weather.windSpeed);
            
            expect(displayedValue).toBe(expectedValue);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, pressure should be rounded to nearest integer', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container, unmount } = render(<WeatherBadges {...weather} />);
            
            const pressureValue = container.querySelector('[data-testid="pressure-value"]');
            const displayedValue = parseInt(pressureValue?.textContent || '0', 10);
            const expectedValue = Math.round(weather.pressure);
            
            expect(displayedValue).toBe(expectedValue);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Wind Direction Properties', () => {
    it('for any wind direction, compass label should be one of 8 cardinal directions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 720 }), // Test wrapping beyond 360
          (windDirection) => {
            const weather = {
              temperature: 25,
              humidity: 60,
              windSpeed: 10,
              windDirection,
              pressure: 1013,
            };
            
            render(<WeatherBadges {...weather} />);
            
            const windLabel = screen.getByTestId('wind-direction-label');
            const validDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            
            expect(validDirections).toContain(windLabel.textContent);
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any wind direction, arrow rotation should be between 0 and 359 degrees', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -360, max: 720 }), // Test negative and large values
          (windDirection) => {
            const weather = {
              temperature: 25,
              humidity: 60,
              windSpeed: 10,
              windDirection,
              pressure: 1013,
            };
            
            render(<WeatherBadges {...weather} />);
            
            const windArrow = screen.getByTestId('wind-arrow');
            const style = windArrow.getAttribute('style');
            const rotationMatch = style?.match(/rotate\((\d+)deg\)/);
            
            if (rotationMatch) {
              const rotation = parseInt(rotationMatch[1], 10);
              expect(rotation).toBeGreaterThanOrEqual(0);
              expect(rotation).toBeLessThan(360);
            }
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Badge Structure Properties', () => {
    it('for any weather data, all badges should have glassmorphic styling', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            const badges = container.querySelectorAll('.weather-badge');
            expect(badges).toHaveLength(4);
            
            badges.forEach(badge => {
              expect(badge).toHaveClass('glass-card');
              expect(badge).toHaveClass('rounded-full');
              expect(badge).toHaveClass('w-14'); // 56px
              expect(badge).toHaveClass('h-14'); // 56px
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, all badges should have hover effects', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            const badges = container.querySelectorAll('.weather-badge');
            
            badges.forEach(badge => {
              expect(badge).toHaveClass('hover:scale-105');
              expect(badge).toHaveClass('transition-all');
              expect(badge).toHaveClass('duration-300');
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, all icons should be 20px size', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            const icons = container.querySelectorAll('svg');
            expect(icons.length).toBeGreaterThanOrEqual(4);
            
            icons.forEach(icon => {
              expect(icon).toHaveClass('w-5'); // 20px
              expect(icon).toHaveClass('h-5'); // 20px
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Accessibility Properties', () => {
    it('for any weather data, all badges should have descriptive title attributes', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            render(<WeatherBadges {...weather} />);
            
            const tempBadge = screen.getByTestId('weather-badge-temperature');
            const humidityBadge = screen.getByTestId('weather-badge-humidity');
            const windBadge = screen.getByTestId('weather-badge-wind');
            const pressureBadge = screen.getByTestId('weather-badge-pressure');
            
            expect(tempBadge).toHaveAttribute('title');
            expect(humidityBadge).toHaveAttribute('title');
            expect(windBadge).toHaveAttribute('title');
            expect(pressureBadge).toHaveAttribute('title');
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, container should have semantic role and label', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            render(<WeatherBadges {...weather} />);
            
            const container = screen.getByRole('group', { name: 'Weather conditions' });
            expect(container).toBeInTheDocument();
            expect(container).toHaveAttribute('aria-label', 'Weather conditions');
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any weather data, all icons should be marked as decorative', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            const icons = container.querySelectorAll('svg');
            
            icons.forEach(icon => {
              expect(icon).toHaveAttribute('aria-hidden', 'true');
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirements Validation Properties', () => {
    it('Requirement 5.2: for any weather data, badges should be 56px diameter circles with glassmorphic background', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            const badges = container.querySelectorAll('.weather-badge');
            
            badges.forEach(badge => {
              expect(badge).toHaveClass('w-14'); // 56px (14 * 4px)
              expect(badge).toHaveClass('h-14'); // 56px
              expect(badge).toHaveClass('glass-card');
              expect(badge).toHaveClass('rounded-full');
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Requirement 5.3: for any weather data, should show icons at 20px with values in 14px font', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            const { container } = render(<WeatherBadges {...weather} />);
            
            // Check icon size (20px = w-5 h-5)
            const icons = container.querySelectorAll('svg');
            icons.forEach(icon => {
              expect(icon).toHaveClass('w-5');
              expect(icon).toHaveClass('h-5');
            });
            
            // Check value font size (14px = text-sm)
            const values = [
              screen.getByTestId('temperature-value'),
              screen.getByTestId('humidity-value'),
              screen.getByTestId('wind-speed-value'),
              screen.getByTestId('pressure-value'),
            ];
            
            values.forEach(value => {
              expect(value).toHaveClass('text-sm');
            });
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Requirement 5.4: for any weather data, badges should be arranged horizontally with 12px gap', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          (weather) => {
            render(<WeatherBadges {...weather} />);
            
            const container = screen.getByTestId('weather-badges');
            expect(container).toHaveClass('flex');
            expect(container).toHaveClass('gap-3'); // 12px (3 * 4px)
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Requirement 5.5: for any weather data update, all weather values should update synchronously', () => {
      fc.assert(
        fc.property(
          weatherDataArbitrary,
          weatherDataArbitrary,
          (weather1, weather2) => {
            const { rerender } = render(<WeatherBadges {...weather1} />);
            
            // Update weather data
            rerender(<WeatherBadges {...weather2} />);
            
            // Verify all values reflect the new weather data
            expect(screen.getByTestId('temperature-value')).toHaveTextContent(
              Math.round(weather2.temperature).toString()
            );
            expect(screen.getByTestId('humidity-value')).toHaveTextContent(
              Math.round(weather2.humidity).toString()
            );
            expect(screen.getByTestId('wind-speed-value')).toHaveTextContent(
              Math.round(weather2.windSpeed).toString()
            );
            expect(screen.getByTestId('pressure-value')).toHaveTextContent(
              Math.round(weather2.pressure).toString()
            );
            
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
