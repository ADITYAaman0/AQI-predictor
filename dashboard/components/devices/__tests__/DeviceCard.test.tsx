import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeviceCard } from '../DeviceCard';
import type { SensorDevice } from '@/lib/api/types';

describe('DeviceCard', () => {
  // Mock device data
  const mockConnectedDevice: SensorDevice = {
    id: 'device-1',
    name: 'Living Room Sensor',
    status: 'connected',
    location: 'New Delhi, India',
    batteryLevel: 85,
    lastReading: {
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      aqi: 125,
    },
  };

  const mockLowBatteryDevice: SensorDevice = {
    id: 'device-2',
    name: 'Bedroom Sensor',
    status: 'low_battery',
    location: 'Mumbai, India',
    batteryLevel: 15,
    lastReading: {
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      aqi: 78,
    },
  };

  const mockDisconnectedDevice: SensorDevice = {
    id: 'device-3',
    name: 'Office Sensor',
    status: 'disconnected',
    location: 'Bangalore, India',
    batteryLevel: 0,
    lastReading: {
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      aqi: 95,
    },
  };

  describe('Rendering', () => {
    it('renders device card with all required elements', () => {
      render(<DeviceCard device={mockConnectedDevice} />);

      // Check for device name
      expect(screen.getByTestId('device-name')).toHaveTextContent('Living Room Sensor');

      // Check for status
      expect(screen.getByTestId('device-status')).toBeInTheDocument();

      // Check for location
      expect(screen.getByTestId('device-location')).toHaveTextContent('New Delhi, India');

      // Check for battery level
      expect(screen.getByTestId('battery-level')).toHaveTextContent('85%');

      // Check for last reading
      expect(screen.getByTestId('last-reading-aqi')).toHaveTextContent('125');
    });

    it('renders with glassmorphic styling', () => {
      const { container } = render(<DeviceCard device={mockConnectedDevice} />);
      const card = container.querySelector('[data-testid="device-card"]');

      expect(card).toHaveClass('bg-white/10');
      expect(card).toHaveClass('backdrop-blur-glass');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-white/18');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('shadow-glass');
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <DeviceCard device={mockConnectedDevice} className="custom-class" />
      );
      const card = container.querySelector('[data-testid="device-card"]');

      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Status Indicator', () => {
    it('displays green dot for connected status', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');

      expect(statusIndicator).toHaveStyle({ backgroundColor: '#4ADE80' });
    });

    it('displays yellow dot for low battery status', () => {
      render(<DeviceCard device={mockLowBatteryDevice} />);
      const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');

      expect(statusIndicator).toHaveStyle({ backgroundColor: '#FCD34D' });
    });

    it('displays red dot for disconnected status', () => {
      render(<DeviceCard device={mockDisconnectedDevice} />);
      const statusIndicator = screen.getByTestId('status-indicator').querySelector('div');

      expect(statusIndicator).toHaveStyle({ backgroundColor: '#EF4444' });
    });

    it('displays correct status label for connected device', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      expect(screen.getByTestId('device-status')).toHaveTextContent('Connected');
    });

    it('displays correct status label for low battery device', () => {
      render(<DeviceCard device={mockLowBatteryDevice} />);
      expect(screen.getByTestId('device-status')).toHaveTextContent('Low Battery');
    });

    it('displays correct status label for disconnected device', () => {
      render(<DeviceCard device={mockDisconnectedDevice} />);
      expect(screen.getByTestId('device-status')).toHaveTextContent('Disconnected');
    });

    it('shows pulsing animation for connected devices', () => {
      const { container } = render(<DeviceCard device={mockConnectedDevice} />);
      const pulsingDot = container.querySelector('.animate-ping');

      expect(pulsingDot).toBeInTheDocument();
    });

    it('does not show pulsing animation for disconnected devices', () => {
      const { container } = render(<DeviceCard device={mockDisconnectedDevice} />);
      const pulsingDot = container.querySelector('.animate-ping');

      expect(pulsingDot).not.toBeInTheDocument();
    });
  });

  describe('Battery Level Display', () => {
    it('displays battery level percentage', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      expect(screen.getByTestId('battery-level')).toHaveTextContent('85%');
    });

    it('shows low battery icon when battery is below 20%', () => {
      render(<DeviceCard device={mockLowBatteryDevice} />);
      const batteryIcon = screen.getByTestId('battery-level').querySelector('svg');

      expect(batteryIcon).toHaveClass('text-red-400');
    });

    it('shows normal battery icon when battery is above 20%', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      const batteryIcon = screen.getByTestId('battery-level').querySelector('svg');

      expect(batteryIcon).toHaveClass('text-white/80');
    });
  });

  describe('Last Reading Display', () => {
    it('displays last reading AQI value', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      expect(screen.getByTestId('last-reading-aqi')).toHaveTextContent('125');
    });

    it('formats recent timestamp correctly (minutes)', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      const timestamp = screen.getByTestId('last-reading-time').textContent;

      expect(timestamp).toMatch(/\d+m ago/);
    });

    it('formats older timestamp correctly (hours)', () => {
      const deviceWithOldReading = {
        ...mockConnectedDevice,
        lastReading: {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          aqi: 100,
        },
      };

      render(<DeviceCard device={deviceWithOldReading} />);
      const timestamp = screen.getByTestId('last-reading-time').textContent;

      expect(timestamp).toMatch(/\d+h ago/);
    });

    it('formats very old timestamp correctly (days)', () => {
      render(<DeviceCard device={mockDisconnectedDevice} />);
      const timestamp = screen.getByTestId('last-reading-time').textContent;

      expect(timestamp).toMatch(/\d+d ago/);
    });
  });

  describe('Action Buttons', () => {
    it('renders View Details button when onViewDetails is provided', () => {
      const onViewDetails = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onViewDetails={onViewDetails} />);

      expect(screen.getByTestId('view-details-button')).toBeInTheDocument();
    });

    it('does not render View Details button when onViewDetails is not provided', () => {
      render(<DeviceCard device={mockConnectedDevice} />);

      expect(screen.queryByTestId('view-details-button')).not.toBeInTheDocument();
    });

    it('calls onViewDetails with device id when View Details is clicked', () => {
      const onViewDetails = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onViewDetails={onViewDetails} />);

      fireEvent.click(screen.getByTestId('view-details-button'));

      expect(onViewDetails).toHaveBeenCalledWith('device-1');
      expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('renders Remove button when onRemove is provided', () => {
      const onRemove = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onRemove={onRemove} />);

      expect(screen.getByTestId('remove-button')).toBeInTheDocument();
    });

    it('does not render Remove button when onRemove is not provided', () => {
      render(<DeviceCard device={mockConnectedDevice} />);

      expect(screen.queryByTestId('remove-button')).not.toBeInTheDocument();
    });

    it('calls onRemove with device id when Remove is clicked', () => {
      const onRemove = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onRemove={onRemove} />);

      fireEvent.click(screen.getByTestId('remove-button'));

      expect(onRemove).toHaveBeenCalledWith('device-1');
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('renders both buttons when both callbacks are provided', () => {
      const onViewDetails = jest.fn();
      const onRemove = jest.fn();
      render(
        <DeviceCard
          device={mockConnectedDevice}
          onViewDetails={onViewDetails}
          onRemove={onRemove}
        />
      );

      expect(screen.getByTestId('view-details-button')).toBeInTheDocument();
      expect(screen.getByTestId('remove-button')).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover classes for lift effect', () => {
      const { container } = render(<DeviceCard device={mockConnectedDevice} />);
      const card = container.querySelector('[data-testid="device-card"]');

      expect(card).toHaveClass('hover:translate-y-[-4px]');
      expect(card).toHaveClass('hover:shadow-level2');
      expect(card).toHaveClass('hover:bg-white/15');
    });

    it('applies transition classes for smooth animations', () => {
      const { container } = render(<DeviceCard device={mockConnectedDevice} />);
      const card = container.querySelector('[data-testid="device-card"]');

      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
      expect(card).toHaveClass('ease-out');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for status indicator', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      const statusDot = screen.getByTestId('status-indicator').querySelector('div');

      expect(statusDot).toHaveAttribute('aria-label', 'Device status: Connected');
    });

    it('has proper ARIA label for battery level', () => {
      render(<DeviceCard device={mockConnectedDevice} />);
      const batteryLevel = screen.getByTestId('battery-level');

      expect(batteryLevel).toHaveAttribute('aria-label', 'Battery level: 85%');
    });

    it('has proper ARIA label for View Details button', () => {
      const onViewDetails = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onViewDetails={onViewDetails} />);

      expect(screen.getByTestId('view-details-button')).toHaveAttribute(
        'aria-label',
        'View details for Living Room Sensor'
      );
    });

    it('has proper ARIA label for Remove button', () => {
      const onRemove = jest.fn();
      render(<DeviceCard device={mockConnectedDevice} onRemove={onRemove} />);

      expect(screen.getByTestId('remove-button')).toHaveAttribute(
        'aria-label',
        'Remove Living Room Sensor'
      );
    });
  });

  describe('Data Attributes', () => {
    it('includes device-id data attribute', () => {
      const { container } = render(<DeviceCard device={mockConnectedDevice} />);
      const card = container.querySelector('[data-testid="device-card"]');

      expect(card).toHaveAttribute('data-device-id', 'device-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid timestamp gracefully', () => {
      const deviceWithInvalidTimestamp = {
        ...mockConnectedDevice,
        lastReading: {
          timestamp: 'invalid-date',
          aqi: 100,
        },
      };

      render(<DeviceCard device={deviceWithInvalidTimestamp} />);
      expect(screen.getByTestId('last-reading-time')).toHaveTextContent('Unknown');
    });

    it('handles zero battery level', () => {
      render(<DeviceCard device={mockDisconnectedDevice} />);
      expect(screen.getByTestId('battery-level')).toHaveTextContent('0%');
    });

    it('handles very high AQI values', () => {
      const deviceWithHighAQI = {
        ...mockConnectedDevice,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 450,
        },
      };

      render(<DeviceCard device={deviceWithHighAQI} />);
      expect(screen.getByTestId('last-reading-aqi')).toHaveTextContent('450');
    });

    it('handles very recent timestamp (just now)', () => {
      const deviceWithRecentReading = {
        ...mockConnectedDevice,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 100,
        },
      };

      render(<DeviceCard device={deviceWithRecentReading} />);
      expect(screen.getByTestId('last-reading-time')).toHaveTextContent('Just now');
    });
  });
});
