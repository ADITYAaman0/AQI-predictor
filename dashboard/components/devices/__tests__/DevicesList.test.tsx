/**
 * DevicesList Component Tests
 * 
 * Tests for the DevicesList component including:
 * - Loading state
 * - Error state
 * - Empty state
 * - Devices grid display
 * - Add device button
 * - Device removal
 * - Modal integration
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DevicesList } from '../DevicesList';
import * as useDevicesHook from '@/lib/api/hooks/useDevices';
import type { SensorDevice } from '@/lib/api/types';

// Mock the hooks
jest.mock('@/lib/api/hooks/useDevices');

// Mock the modal components
jest.mock('../AddDeviceModal', () => ({
  AddDeviceModal: ({ isOpen, onClose }: any) => 
    isOpen ? <div data-testid="add-device-modal"><button onClick={onClose}>Close</button></div> : null,
}));

jest.mock('../DeviceDetailsModal', () => ({
  DeviceDetailsModal: ({ device, isOpen, onClose }: any) => 
    isOpen && device ? (
      <div data-testid="device-details-modal">
        <h2>{device.name}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const mockUseDevices = useDevicesHook.useDevices as jest.MockedFunction<
  typeof useDevicesHook.useDevices
>;
const mockUseRemoveDevice = useDevicesHook.useRemoveDevice as jest.MockedFunction<
  typeof useDevicesHook.useRemoveDevice
>;
const mockUseAddDevice = useDevicesHook.useAddDevice as jest.MockedFunction<
  typeof useDevicesHook.useAddDevice
>;

// Mock devices data
const mockDevices: SensorDevice[] = [
  {
    id: 'device-1',
    name: 'Living Room Sensor',
    status: 'connected',
    location: 'Living Room',
    batteryLevel: 85,
    lastReading: {
      timestamp: '2024-01-15T10:30:00Z',
      aqi: 45,
    },
  },
  {
    id: 'device-2',
    name: 'Bedroom Sensor',
    status: 'low_battery',
    location: 'Bedroom',
    batteryLevel: 15,
    lastReading: {
      timestamp: '2024-01-15T10:25:00Z',
      aqi: 52,
    },
  },
  {
    id: 'device-3',
    name: 'Office Sensor',
    status: 'disconnected',
    location: 'Office',
    batteryLevel: 0,
    lastReading: {
      timestamp: '2024-01-14T15:00:00Z',
      aqi: 38,
    },
  },
];

// Helper to create a test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('DevicesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for removeDevice
    mockUseRemoveDevice.mockReturnValue({
      mutateAsync: jest.fn(),
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
  });

  describe('Loading State', () => {
    it('should display loading spinner when fetching devices', () => {
      mockUseDevices.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('devices-list-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading devices...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      const mockRefetch = jest.fn();
      mockUseDevices.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('devices-list-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to Load Devices')).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('should allow retry on error', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();
      mockUseDevices.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<DevicesList />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no devices', () => {
      mockUseDevices.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('devices-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No Devices Connected')).toBeInTheDocument();
      expect(
        screen.getByText(/Connect your first air quality sensor/)
      ).toBeInTheDocument();
    });

    it('should show add device button in empty state', () => {
      mockUseDevices.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('add-device-button-empty')).toBeInTheDocument();
    });
  });

  describe('Devices Grid', () => {
    it('should display devices in a grid', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('devices-list')).toBeInTheDocument();
      expect(screen.getByTestId('devices-grid')).toBeInTheDocument();

      // Check all devices are rendered
      expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      expect(screen.getByText('Bedroom Sensor')).toBeInTheDocument();
      expect(screen.getByText('Office Sensor')).toBeInTheDocument();
    });

    it('should display correct number of device cards', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const deviceCards = screen.getAllByTestId('device-card');
      expect(deviceCards).toHaveLength(3);
    });

    it('should apply responsive grid classes', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const grid = screen.getByTestId('devices-grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Add Device Button', () => {
    it('should display add device button', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      expect(screen.getByTestId('add-device-button')).toBeInTheDocument();
      expect(screen.getByText('Add Device')).toBeInTheDocument();
      expect(
        screen.getByText('Connect a new air quality sensor')
      ).toBeInTheDocument();
    });

    it('should open add device modal when button clicked', async () => {
      const user = userEvent.setup();
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const addButton = screen.getByTestId('add-device-button');
      await user.click(addButton);

      // Modal should be rendered (we'll test modal separately)
      expect(screen.getByTestId('add-device-modal')).toBeInTheDocument();
    });

    it('should have dashed border styling', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const addButton = screen.getByTestId('add-device-button');
      expect(addButton).toHaveClass('border-dashed');
    });
  });

  describe('Device Removal', () => {
    it('should show confirmation dialog when removing device', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const deviceCards = screen.getAllByTestId('device-card');
      const firstCard = deviceCards[0];
      const removeButton = within(firstCard).getByTestId('remove-button');

      await user.click(removeButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Living Room Sensor')
      );

      mockConfirm.mockRestore();
    });

    it('should call removeDevice mutation when confirmed', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseRemoveDevice.mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: jest.fn(),
        status: 'idle',
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: true,
        isPaused: false,
        submittedAt: 0,
      } as any);

      renderWithProviders(<DevicesList />);

      const deviceCards = screen.getAllByTestId('device-card');
      const firstCard = deviceCards[0];
      const removeButton = within(firstCard).getByTestId('remove-button');

      await user.click(removeButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('device-1');
      });

      mockConfirm.mockRestore();
    });

    it('should not call removeDevice when cancelled', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const mockMutateAsync = jest.fn();
      
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseRemoveDevice.mockReturnValue({
        mutateAsync: mockMutateAsync,
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: jest.fn(),
        status: 'idle',
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: true,
        isPaused: false,
        submittedAt: 0,
      } as any);

      renderWithProviders(<DevicesList />);

      const deviceCards = screen.getAllByTestId('device-card');
      const firstCard = deviceCards[0];
      const removeButton = within(firstCard).getByTestId('remove-button');

      await user.click(removeButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('View Details', () => {
    it('should open device details modal when view details button clicked', async () => {
      const user = userEvent.setup();
      
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList />);

      const deviceCards = screen.getAllByTestId('device-card');
      const firstCard = deviceCards[0];
      const viewDetailsButton = within(firstCard).getByTestId('view-details-button');

      await user.click(viewDetailsButton);

      // Modal should be rendered with device details
      expect(screen.getByTestId('device-details-modal')).toBeInTheDocument();
      // Check for device name in modal (using getAllByText since it appears in both card and modal)
      const deviceNames = screen.getAllByText('Living Room Sensor');
      expect(deviceNames.length).toBeGreaterThan(1); // Should appear in card and modal
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      mockUseDevices.mockReturnValue({
        data: mockDevices,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<DevicesList className="custom-class" />);

      const devicesList = screen.getByTestId('devices-list');
      expect(devicesList).toHaveClass('custom-class');
    });
  });
});
