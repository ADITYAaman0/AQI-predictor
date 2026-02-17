/**
 * Device Management Property-Based Tests
 * 
 * Tests correctness properties using fast-check:
 * - Property 19: Device Card Completeness
 * - Property 20: Device Status Color Coding
 * 
 * Requirements: 11.1-11.7
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { DeviceCard } from '../DeviceCard';
import type { SensorDevice } from '@/lib/api/types';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

describe('Feature: glassmorphic-dashboard - Device Management Properties', () => {
  // Generators for property-based testing
  const deviceStatusArbitrary = fc.constantFrom<SensorDevice['status']>(
    'connected',
    'low_battery',
    'disconnected'
  );

  const deviceArbitrary = fc.record<SensorDevice>({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    status: deviceStatusArbitrary,
    location: fc.string({ minLength: 5, maxLength: 100 }),
    batteryLevel: fc.integer({ min: 0, max: 100 }),
    lastReading: fc.record({
      timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
      aqi: fc.integer({ min: 0, max: 500 }),
    }),
  });

  describe('Property 19: Device Card Completeness', () => {
    it('for any device, card should display name, status, location, and battery level', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          const { container, unmount } = render(<DeviceCard device={device} />);

          try {
            // Verify device name is displayed
            const deviceName = screen.getByTestId('device-name');
            expect(deviceName).toBeInTheDocument();
            expect(deviceName).toHaveTextContent(device.name);

            // Verify status is displayed
            const deviceStatus = screen.getByTestId('device-status');
            expect(deviceStatus).toBeInTheDocument();

            // Verify status indicator is present
            const statusIndicator = screen.getByTestId('status-indicator');
            expect(statusIndicator).toBeInTheDocument();

            // Verify location is displayed
            const deviceLocation = screen.getByTestId('device-location');
            expect(deviceLocation).toBeInTheDocument();
            expect(deviceLocation).toHaveTextContent(device.location);

            // Verify battery level is displayed
            const batteryLevel = screen.getByTestId('battery-level');
            expect(batteryLevel).toBeInTheDocument();
            expect(batteryLevel).toHaveTextContent(`${device.batteryLevel}%`);

            // Verify last reading is displayed
            const lastReading = screen.getByTestId('last-reading');
            expect(lastReading).toBeInTheDocument();

            // Verify last reading AQI is displayed
            const lastReadingAQI = screen.getByTestId('last-reading-aqi');
            expect(lastReadingAQI).toBeInTheDocument();
            expect(lastReadingAQI).toHaveTextContent(device.lastReading.aqi.toString());

            // Verify card has glassmorphic styling
            const card = container.querySelector('[data-testid="device-card"]');
            expect(card).toHaveClass('bg-white/10');
            expect(card).toHaveClass('backdrop-blur-glass');
            expect(card).toHaveClass('border');
            expect(card).toHaveClass('border-white/18');
          } finally {
            unmount();
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device, card should contain all required visual elements', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          const { container } = render(<DeviceCard device={device} />);

          // Check for all required elements
          const requiredElements = [
            'device-name',
            'device-status',
            'status-indicator',
            'device-location',
            'battery-level',
            'last-reading',
            'last-reading-aqi',
            'last-reading-time',
          ];

          requiredElements.forEach((testId) => {
            const element = screen.getByTestId(testId);
            expect(element).toBeInTheDocument();
          });

          // Verify card structure
          const card = container.querySelector('[data-testid="device-card"]');
          expect(card).toBeInTheDocument();
          expect(card).toHaveAttribute('data-device-id', device.id);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device with callbacks, card should display action buttons', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          const onViewDetails = jest.fn();
          const onRemove = jest.fn();

          render(
            <DeviceCard
              device={device}
              onViewDetails={onViewDetails}
              onRemove={onRemove}
            />
          );

          // Verify View Details button is present
          const viewDetailsButton = screen.getByTestId('view-details-button');
          expect(viewDetailsButton).toBeInTheDocument();
          expect(viewDetailsButton).toHaveTextContent('View Details');

          // Verify Remove button is present
          const removeButton = screen.getByTestId('remove-button');
          expect(removeButton).toBeInTheDocument();
          expect(removeButton).toHaveTextContent('Remove');
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device, battery level should be displayed with correct icon', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          render(<DeviceCard device={device} />);

          const batteryLevel = screen.getByTestId('battery-level');
          expect(batteryLevel).toBeInTheDocument();

          // Verify battery icon is present
          const batteryIcon = batteryLevel.querySelector('svg');
          expect(batteryIcon).toBeInTheDocument();

          // Verify battery percentage is displayed
          expect(batteryLevel).toHaveTextContent(`${device.batteryLevel}%`);

          // Verify low battery icon for levels <= 20%
          if (device.batteryLevel <= 20) {
            expect(batteryIcon).toHaveClass('text-red-400');
          } else {
            expect(batteryIcon).toHaveClass('text-white/80');
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device, last reading should display AQI and timestamp', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          render(<DeviceCard device={device} />);

          // Verify last reading section exists
          const lastReading = screen.getByTestId('last-reading');
          expect(lastReading).toBeInTheDocument();

          // Verify AQI value is displayed
          const aqiValue = screen.getByTestId('last-reading-aqi');
          expect(aqiValue).toHaveTextContent(device.lastReading.aqi.toString());

          // Verify timestamp is displayed
          const timestamp = screen.getByTestId('last-reading-time');
          expect(timestamp).toBeInTheDocument();
          expect(timestamp.textContent).toBeTruthy();
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Property 20: Device Status Color Coding', () => {
    it('for any device status, indicator dot should match status color', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          render(<DeviceCard device={device} />);

          const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
          expect(statusIndicator).toBeInTheDocument();

          // Define expected colors for each status
          const expectedColors: Record<SensorDevice['status'], string> = {
            connected: '#4ADE80',      // Green
            low_battery: '#FCD34D',    // Yellow
            disconnected: '#EF4444',   // Red
          };

          const expectedColor = expectedColors[device.status];
          expect(statusIndicator).toHaveStyle({ backgroundColor: expectedColor });
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for connected status, indicator should be green (#4ADE80)', () => {
      fc.assert(
        fc.property(
          deviceArbitrary.filter((d) => d.status === 'connected'),
          (device) => {
            render(<DeviceCard device={device} />);

            const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
            expect(statusIndicator).toHaveStyle({ backgroundColor: '#4ADE80' });

            // Verify status label
            const statusLabel = screen.getByTestId('device-status');
            expect(statusLabel).toHaveTextContent('Connected');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for low_battery status, indicator should be yellow (#FCD34D)', () => {
      fc.assert(
        fc.property(
          deviceArbitrary.filter((d) => d.status === 'low_battery'),
          (device) => {
            render(<DeviceCard device={device} />);

            const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
            expect(statusIndicator).toHaveStyle({ backgroundColor: '#FCD34D' });

            // Verify status label
            const statusLabel = screen.getByTestId('device-status');
            expect(statusLabel).toHaveTextContent('Low Battery');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for disconnected status, indicator should be red (#EF4444)', () => {
      fc.assert(
        fc.property(
          deviceArbitrary.filter((d) => d.status === 'disconnected'),
          (device) => {
            render(<DeviceCard device={device} />);

            const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
            expect(statusIndicator).toHaveStyle({ backgroundColor: '#EF4444' });

            // Verify status label
            const statusLabel = screen.getByTestId('device-status');
            expect(statusLabel).toHaveTextContent('Disconnected');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device status, status label should match status', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          render(<DeviceCard device={device} />);

          const statusLabel = screen.getByTestId('device-status');
          expect(statusLabel).toBeInTheDocument();

          // Define expected labels for each status
          const expectedLabels: Record<SensorDevice['status'], string> = {
            connected: 'Connected',
            low_battery: 'Low Battery',
            disconnected: 'Disconnected',
          };

          const expectedLabel = expectedLabels[device.status];
          expect(statusLabel).toHaveTextContent(expectedLabel);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for connected devices, pulsing animation should be present', () => {
      fc.assert(
        fc.property(
          deviceArbitrary.filter((d) => d.status === 'connected'),
          (device) => {
            const { container } = render(<DeviceCard device={device} />);

            // Verify pulsing animation is present for connected devices
            const pulsingDot = container.querySelector('.animate-ping');
            expect(pulsingDot).toBeInTheDocument();
            expect(pulsingDot).toHaveStyle({ backgroundColor: '#4ADE80' });
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for non-connected devices, pulsing animation should not be present', () => {
      fc.assert(
        fc.property(
          deviceArbitrary.filter((d) => d.status !== 'connected'),
          (device) => {
            const { container } = render(<DeviceCard device={device} />);

            // Verify pulsing animation is NOT present for non-connected devices
            const pulsingDot = container.querySelector('.animate-ping');
            expect(pulsingDot).not.toBeInTheDocument();
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for any device, status color should be consistent across all status indicators', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          render(<DeviceCard device={device} />);

          // Get status indicator color
          const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
          const indicatorColor = statusIndicator?.style.backgroundColor;

          // Get status label color
          const statusLabel = screen.getByTestId('device-status');
          const labelColor = statusLabel.style.color;

          // Define expected colors
          const expectedColors: Record<SensorDevice['status'], string> = {
            connected: '#4ADE80',
            low_battery: '#FCD34D',
            disconnected: '#EF4444',
          };

          const expectedColor = expectedColors[device.status];

          // Verify indicator has correct color
          expect(indicatorColor).toBe(expectedColor);

          // Verify label has correct color
          expect(labelColor).toBe(expectedColor);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Combined Properties', () => {
    it('for any device, all completeness and color coding properties hold simultaneously', () => {
      fc.assert(
        fc.property(deviceArbitrary, (device) => {
          const { container } = render(<DeviceCard device={device} />);

          // Property 19: Completeness
          expect(screen.getByTestId('device-name')).toHaveTextContent(device.name);
          expect(screen.getByTestId('device-status')).toBeInTheDocument();
          expect(screen.getByTestId('device-location')).toHaveTextContent(device.location);
          expect(screen.getByTestId('battery-level')).toHaveTextContent(`${device.batteryLevel}%`);
          expect(screen.getByTestId('last-reading-aqi')).toHaveTextContent(device.lastReading.aqi.toString());

          // Property 20: Color Coding
          const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');
          const expectedColors: Record<SensorDevice['status'], string> = {
            connected: '#4ADE80',
            low_battery: '#FCD34D',
            disconnected: '#EF4444',
          };
          expect(statusIndicator).toHaveStyle({ backgroundColor: expectedColors[device.status] });

          // Verify card structure
          const card = container.querySelector('[data-testid="device-card"]');
          expect(card).toHaveClass('bg-white/10');
          expect(card).toHaveClass('backdrop-blur-glass');
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles devices with extreme battery levels (0% and 100%)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1 }).chain(batteryLevel => 
            deviceArbitrary.map(device => ({
              ...device,
              batteryLevel: batteryLevel === 0 ? 0 : 100,
            }))
          ),
          (device) => {
            render(<DeviceCard device={device} />);

            const batteryLevel = screen.getByTestId('battery-level');
            expect(batteryLevel).toHaveTextContent(`${device.batteryLevel}%`);

            // Verify icon color based on level
            const batteryIcon = batteryLevel.querySelector('svg');
            if (device.batteryLevel <= 20) {
              expect(batteryIcon).toHaveClass('text-red-400');
            } else {
              expect(batteryIcon).toHaveClass('text-white/80');
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('handles devices with extreme AQI values (0 and 500)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1 }).chain(aqiChoice => 
            deviceArbitrary.map(device => ({
              ...device,
              lastReading: {
                ...device.lastReading,
                aqi: aqiChoice === 0 ? 0 : 500,
              },
            }))
          ),
          (device) => {
            const { container } = render(<DeviceCard device={device} />);

            const aqiValue = container.querySelector('[data-testid="last-reading-aqi"]');
            expect(aqiValue).toHaveTextContent(device.lastReading.aqi.toString());
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('handles devices with very long names and locations', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 40, maxLength: 50 }),
            location: fc.string({ minLength: 80, maxLength: 100 }),
          }).chain(({ name, location }) =>
            deviceArbitrary.map(device => ({
              ...device,
              name,
              location,
            }))
          ),
          (device) => {
            render(<DeviceCard device={device} />);

            // Verify long text is displayed (may be truncated by CSS)
            expect(screen.getByTestId('device-name')).toHaveTextContent(device.name);
            expect(screen.getByTestId('device-location')).toHaveTextContent(device.location);
          }
        ),
        {
          numRuns: 50, // Fewer runs for performance
          verbose: true,
        }
      );
    });
  });
});
