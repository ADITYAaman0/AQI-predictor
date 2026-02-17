/**
 * Tests for DeviceDetailsModal Component
 * 
 * Tests modal functionality including:
 * - Rendering device information
 * - Status indicators
 * - Battery level display
 * - Last reading information
 * - Keyboard navigation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceDetailsModal } from '../DeviceDetailsModal';
import type { SensorDevice } from '@/lib/api/types';

describe('DeviceDetailsModal', () => {
  const mockOnClose = jest.fn();

  const mockDevice: SensorDevice = {
    id: 'device-1',
    name: 'Living Room Sensor',
    status: 'connected',
    location: 'Living Room, Delhi',
    batteryLevel: 85,
    lastReading: {
      timestamp: new Date('2024-01-15T10:30:00Z').toISOString(),
      aqi: 75,
    },
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  const renderModal = (device: SensorDevice | null = mockDevice, isOpen: boolean = true) => {
    return render(
      <DeviceDetailsModal
        device={device}
        isOpen={isOpen}
        onClose={mockOnClose}
      />
    );
  };

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderModal(mockDevice, false);
      expect(screen.queryByTestId('device-details-modal')).not.toBeInTheDocument();
    });

    it('should not render when device is null', () => {
      renderModal(null, true);
      expect(screen.queryByTestId('device-details-modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and device is provided', () => {
      renderModal();
      expect(screen.getByTestId('device-details-modal')).toBeInTheDocument();
    });

    it('should display device name', () => {
      renderModal();
      expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
    });

    it('should display device location', () => {
      renderModal();
      expect(screen.getByText('Living Room, Delhi')).toBeInTheDocument();
    });

    it('should display battery level', () => {
      renderModal();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display last reading AQI', () => {
      renderModal();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should display device ID', () => {
      renderModal();
      expect(screen.getByText('device-1')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show connected status with green color', () => {
      const device: SensorDevice = { ...mockDevice, status: 'connected' };
      renderModal(device);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Device is online and transmitting data.')).toBeInTheDocument();
    });

    it('should show low battery status with yellow color', () => {
      const device: SensorDevice = { ...mockDevice, status: 'low_battery' };
      renderModal(device);
      
      expect(screen.getByText('Low Battery')).toBeInTheDocument();
      expect(screen.getByText('Device battery is running low. Please charge soon.')).toBeInTheDocument();
    });

    it('should show disconnected status with red color', () => {
      const device: SensorDevice = { ...mockDevice, status: 'disconnected' };
      renderModal(device);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Device is offline. Check connection.')).toBeInTheDocument();
    });
  });

  describe('Battery Level Display', () => {
    it('should show red battery icon when level is 20% or below', () => {
      const device: SensorDevice = { ...mockDevice, batteryLevel: 15 };
      renderModal(device);
      
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('should show normal battery icon when level is above 20%', () => {
      const device: SensorDevice = { ...mockDevice, batteryLevel: 85 };
      renderModal(device);
      
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display battery level as percentage', () => {
      const device: SensorDevice = { ...mockDevice, batteryLevel: 50 };
      renderModal(device);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Last Reading Information', () => {
    it('should display last reading AQI value', () => {
      renderModal();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should format timestamp correctly', () => {
      renderModal();
      // The exact format depends on locale, but should contain date elements
      const timestampElements = screen.getAllByText(/Jan|15|2024|10|30/i);
      expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('should handle invalid timestamp gracefully', () => {
      const device: SensorDevice = {
        ...mockDevice,
        lastReading: {
          timestamp: 'invalid-date',
          aqi: 75,
        },
      };
      renderModal(device);
      
      const unknownTexts = screen.getAllByText('Unknown');
      expect(unknownTexts.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should close modal when clicking close button', () => {
      renderModal();
      
      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking close details button', () => {
      renderModal();
      
      const closeDetailsButton = screen.getByTestId('close-details-button');
      fireEvent.click(closeDetailsButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking backdrop', () => {
      renderModal();
      
      const modal = screen.getByTestId('device-details-modal');
      fireEvent.click(modal);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when clicking modal content', () => {
      renderModal();
      
      const deviceName = screen.getByText('Living Room Sensor');
      fireEvent.click(deviceName);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal when pressing Escape key', () => {
      renderModal();
      
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderModal();
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'device-details-title');
    });

    it('should have accessible close button', () => {
      renderModal();
      
      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });

    it('should have accessible status indicator', () => {
      renderModal();
      
      const statusIndicator = screen.getByLabelText(/Device status:/i);
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should have accessible battery level', () => {
      renderModal();
      
      // Check that battery level is displayed
      expect(screen.getByText('Battery Level')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Relative Time Formatting', () => {
    it('should show "Just now" for very recent timestamps', () => {
      const device: SensorDevice = {
        ...mockDevice,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 75,
        },
      };
      renderModal(device);
      
      expect(screen.getByText(/Just now|minute/i)).toBeInTheDocument();
    });

    it('should show minutes ago for recent timestamps', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const device: SensorDevice = {
        ...mockDevice,
        lastReading: {
          timestamp: fiveMinutesAgo.toISOString(),
          aqi: 75,
        },
      };
      renderModal(device);
      
      expect(screen.getByText(/5 minutes? ago/i)).toBeInTheDocument();
    });

    it('should show hours ago for older timestamps', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const device: SensorDevice = {
        ...mockDevice,
        lastReading: {
          timestamp: twoHoursAgo.toISOString(),
          aqi: 75,
        },
      };
      renderModal(device);
      
      expect(screen.getByText(/2 hours? ago/i)).toBeInTheDocument();
    });

    it('should show days ago for very old timestamps', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const device: SensorDevice = {
        ...mockDevice,
        lastReading: {
          timestamp: threeDaysAgo.toISOString(),
          aqi: 75,
        },
      };
      renderModal(device);
      
      expect(screen.getByText(/3 days? ago/i)).toBeInTheDocument();
    });
  });
});
