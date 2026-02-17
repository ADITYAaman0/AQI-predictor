/**
 * Device Management CRUD Operations Tests
 * 
 * Comprehensive tests for Create, Read, Update, Delete operations
 * on device management functionality.
 * 
 * Requirements: 11.1-11.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDevices, useAddDevice, useRemoveDevice } from '@/lib/api/hooks/useDevices';
import type { SensorDevice, AddDeviceRequest } from '@/lib/api/types';
import * as aqiClient from '@/lib/api/aqi-client';

// Mock the AQI client
jest.mock('@/lib/api/aqi-client');

// Test component that uses the hooks
const TestDeviceManager: React.FC = () => {
  const { data: devices, isLoading, error, refetch } = useDevices();
  const addDevice = useAddDevice();
  const removeDevice = useRemoveDevice();

  const handleAdd = async () => {
    await addDevice.mutateAsync({
      name: 'Test Device',
      deviceId: 'test-123',
      location: 'Test Location',
    });
  };

  const handleRemove = async (deviceId: string) => {
    await removeDevice.mutateAsync(deviceId);
  };

  if (isLoading) return <div>Loading devices...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Device Manager</h1>
      <button onClick={handleAdd} data-testid="add-device-btn">
        Add Device
      </button>
      <button onClick={() => refetch()} data-testid="refresh-btn">
        Refresh
      </button>
      <div data-testid="device-list">
        {devices?.map((device) => (
          <div key={device.id} data-testid={`device-${device.id}`}>
            <span>{device.name}</span>
            <span>{device.status}</span>
            <button
              onClick={() => handleRemove(device.id)}
              data-testid={`remove-${device.id}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {addDevice.isPending && <div data-testid="adding">Adding device...</div>}
      {addDevice.isError && <div data-testid="add-error">Add failed</div>}
      {removeDevice.isPending && <div data-testid="removing">Removing device...</div>}
      {removeDevice.isError && <div data-testid="remove-error">Remove failed</div>}
    </div>
  );
};

describe('Device Management CRUD Operations', () => {
  let queryClient: QueryClient;

  const mockDevices: SensorDevice[] = [
    {
      id: 'device-1',
      name: 'Living Room Sensor',
      status: 'connected',
      location: 'New Delhi, India',
      batteryLevel: 85,
      lastReading: {
        timestamp: new Date().toISOString(),
        aqi: 125,
      },
    },
    {
      id: 'device-2',
      name: 'Bedroom Sensor',
      status: 'low_battery',
      location: 'Mumbai, India',
      batteryLevel: 15,
      lastReading: {
        timestamp: new Date().toISOString(),
        aqi: 78,
      },
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('CREATE Operations', () => {
    it('successfully creates a new device', async () => {
      const newDevice: SensorDevice = {
        id: 'device-3',
        name: 'Test Device',
        status: 'connected',
        location: 'Test Location',
        batteryLevel: 100,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 50,
        },
      };

      const mockAddDevice = jest.fn().mockResolvedValue(newDevice);
      const mockGetDevices = jest.fn()
        .mockResolvedValueOnce(mockDevices)
        .mockResolvedValueOnce([...mockDevices, newDevice]);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Click add device button
      fireEvent.click(screen.getByTestId('add-device-btn'));

      // Wait for adding state
      await waitFor(() => {
        expect(screen.getByTestId('adding')).toBeInTheDocument();
      });

      // Wait for device to be added
      await waitFor(() => {
        expect(mockAddDevice).toHaveBeenCalledWith({
          name: 'Test Device',
          deviceId: 'test-123',
          location: 'Test Location',
        });
      });

      // Verify devices list is refetched
      await waitFor(() => {
        expect(mockGetDevices).toHaveBeenCalledTimes(2);
      });
    });

    it('handles validation errors during device creation', async () => {
      const mockAddDevice = jest.fn().mockRejectedValue(
        new Error('Device name is required')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Click add device button
      fireEvent.click(screen.getByTestId('add-device-btn'));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('add-error')).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockAddDevice).toHaveBeenCalled();
    });

    it('handles duplicate device errors', async () => {
      const mockAddDevice = jest.fn().mockRejectedValue(
        new Error('Device already exists')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-device-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('add-error')).toBeInTheDocument();
      });
    });

    it('handles network errors during device creation', async () => {
      const mockAddDevice = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-device-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('add-error')).toBeInTheDocument();
      });
    });
  });

  describe('READ Operations', () => {
    it('successfully fetches all devices', async () => {
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      renderWithQueryClient(<TestDeviceManager />);

      // Wait for devices to load
      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
        expect(screen.getByText('Bedroom Sensor')).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockGetDevices).toHaveBeenCalledTimes(1);
    });

    it('displays loading state while fetching', () => {
      const mockGetDevices = jest.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      renderWithQueryClient(<TestDeviceManager />);

      expect(screen.getByText('Loading devices...')).toBeInTheDocument();
    });

    it('displays error state when fetch fails', async () => {
      const mockGetDevices = jest.fn().mockRejectedValue(
        new Error('Failed to fetch devices')
      );

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('handles empty device list', async () => {
      const mockGetDevices = jest.fn().mockResolvedValue([]);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        const deviceList = screen.getByTestId('device-list');
        expect(deviceList.children.length).toBe(0);
      });
    });

    it('refetches devices when refresh button is clicked', async () => {
      const mockGetDevices = jest.fn()
        .mockResolvedValueOnce(mockDevices)
        .mockResolvedValueOnce(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Click refresh button
      fireEvent.click(screen.getByTestId('refresh-btn'));

      // Wait for refetch
      await waitFor(() => {
        expect(mockGetDevices).toHaveBeenCalledTimes(2);
      });
    });

    it('caches devices data for 5 minutes', async () => {
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
      });

      const { unmount } = renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Unmount and remount within cache time
      unmount();
      renderWithQueryClient(<TestDeviceManager />);

      // Should use cached data, not call API again immediately
      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // API should have been called only once (cached on second render)
      expect(mockGetDevices).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE Operations', () => {
    it('successfully removes a device', async () => {
      const mockRemoveDevice = jest.fn().mockResolvedValue(undefined);
      const mockGetDevices = jest.fn()
        .mockResolvedValueOnce(mockDevices)
        .mockResolvedValueOnce([mockDevices[1]]); // Only second device remains

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Click remove button for first device
      fireEvent.click(screen.getByTestId('remove-device-1'));

      // Wait for removing state
      await waitFor(() => {
        expect(screen.getByTestId('removing')).toBeInTheDocument();
      });

      // Wait for device to be removed
      await waitFor(() => {
        expect(mockRemoveDevice).toHaveBeenCalledWith('device-1');
      });

      // Verify devices list is refetched
      await waitFor(() => {
        expect(mockGetDevices).toHaveBeenCalledTimes(2);
      });
    });

    it('handles errors during device removal', async () => {
      const mockRemoveDevice = jest.fn().mockRejectedValue(
        new Error('Failed to remove device')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-device-1'));

      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toBeInTheDocument();
      });
    });

    it('handles removal of non-existent device', async () => {
      const mockRemoveDevice = jest.fn().mockRejectedValue(
        new Error('Device not found')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-device-1'));

      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toBeInTheDocument();
      });
    });

    it('handles network errors during device removal', async () => {
      const mockRemoveDevice = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-device-1'));

      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toBeInTheDocument();
      });
    });
  });

  describe('Complex CRUD Workflows', () => {
    it('handles add then remove workflow', async () => {
      const newDevice: SensorDevice = {
        id: 'device-3',
        name: 'Test Device',
        status: 'connected',
        location: 'Test Location',
        batteryLevel: 100,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 50,
        },
      };

      const mockAddDevice = jest.fn().mockResolvedValue(newDevice);
      const mockRemoveDevice = jest.fn().mockResolvedValue(undefined);
      const mockGetDevices = jest.fn()
        .mockResolvedValueOnce(mockDevices)
        .mockResolvedValueOnce([...mockDevices, newDevice])
        .mockResolvedValueOnce(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Add device
      fireEvent.click(screen.getByTestId('add-device-btn'));

      await waitFor(() => {
        expect(mockAddDevice).toHaveBeenCalled();
      });

      // Wait for refetch after add
      await waitFor(() => {
        expect(mockGetDevices).toHaveBeenCalledTimes(2);
      });

      // Remove the newly added device
      fireEvent.click(screen.getByTestId('remove-device-3'));

      await waitFor(() => {
        expect(mockRemoveDevice).toHaveBeenCalledWith('device-3');
      });

      // Wait for refetch after remove
      await waitFor(() => {
        expect(mockGetDevices).toHaveBeenCalledTimes(3);
      });
    });

    it('handles multiple rapid add operations', async () => {
      const mockAddDevice = jest.fn()
        .mockResolvedValueOnce({ id: 'device-3', name: 'Device 3' } as SensorDevice)
        .mockResolvedValueOnce({ id: 'device-4', name: 'Device 4' } as SensorDevice);
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Click add button multiple times rapidly
      fireEvent.click(screen.getByTestId('add-device-btn'));
      fireEvent.click(screen.getByTestId('add-device-btn'));

      // Both operations should be queued
      await waitFor(() => {
        expect(mockAddDevice).toHaveBeenCalledTimes(2);
      });
    });

    it('handles concurrent add and remove operations', async () => {
      const newDevice: SensorDevice = {
        id: 'device-3',
        name: 'Test Device',
        status: 'connected',
        location: 'Test Location',
        batteryLevel: 100,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 50,
        },
      };

      const mockAddDevice = jest.fn().mockResolvedValue(newDevice);
      const mockRemoveDevice = jest.fn().mockResolvedValue(undefined);
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      // Trigger add and remove simultaneously
      fireEvent.click(screen.getByTestId('add-device-btn'));
      fireEvent.click(screen.getByTestId('remove-device-1'));

      // Both operations should complete
      await waitFor(() => {
        expect(mockAddDevice).toHaveBeenCalled();
        expect(mockRemoveDevice).toHaveBeenCalled();
      });
    });
  });

  describe('Data Consistency', () => {
    it('maintains data consistency after failed add operation', async () => {
      const mockAddDevice = jest.fn().mockRejectedValue(new Error('Add failed'));
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        addDevice: mockAddDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      const initialDeviceCount = screen.getByTestId('device-list').children.length;

      // Try to add device (will fail)
      fireEvent.click(screen.getByTestId('add-device-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('add-error')).toBeInTheDocument();
      });

      // Device count should remain the same
      expect(screen.getByTestId('device-list').children.length).toBe(initialDeviceCount);
    });

    it('maintains data consistency after failed remove operation', async () => {
      const mockRemoveDevice = jest.fn().mockRejectedValue(new Error('Remove failed'));
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);

      (aqiClient.getAQIClient as jest.Mock).mockReturnValue({
        getDevices: mockGetDevices,
        removeDevice: mockRemoveDevice,
      });

      renderWithQueryClient(<TestDeviceManager />);

      await waitFor(() => {
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });

      const initialDeviceCount = screen.getByTestId('device-list').children.length;

      // Try to remove device (will fail)
      fireEvent.click(screen.getByTestId('remove-device-1'));

      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toBeInTheDocument();
      });

      // Device count should remain the same
      expect(screen.getByTestId('device-list').children.length).toBe(initialDeviceCount);
    });
  });
});
