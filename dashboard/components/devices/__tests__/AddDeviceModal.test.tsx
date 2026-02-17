/**
 * Tests for AddDeviceModal Component
 * 
 * Tests modal functionality including:
 * - Rendering and visibility
 * - Form validation
 * - Form submission
 * - Error handling
 * - Keyboard navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddDeviceModal } from '../AddDeviceModal';
import { useAddDevice } from '@/lib/api/hooks/useDevices';

// Mock the useAddDevice hook
jest.mock('@/lib/api/hooks/useDevices', () => ({
  useAddDevice: jest.fn(),
}));

const mockUseAddDevice = useAddDevice as jest.MockedFunction<typeof useAddDevice>;

describe('AddDeviceModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockOnClose.mockClear();
    mockOnSuccess.mockClear();
    mockMutateAsync.mockClear();

    mockUseAddDevice.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  const renderModal = (isOpen: boolean = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddDeviceModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderModal(false);
      expect(screen.queryByTestId('add-device-modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderModal(true);
      expect(screen.getByTestId('add-device-modal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderModal(true);
      expect(screen.getByTestId('device-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('device-id-input')).toBeInTheDocument();
      expect(screen.getByTestId('device-location-input')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderModal(true);
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when device name is empty', async () => {
      renderModal(true);
      
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent('Device name is required');
      });
    });

    it('should show error when device name is too short', async () => {
      renderModal(true);
      
      const nameInput = screen.getByTestId('device-name-input');
      fireEvent.change(nameInput, { target: { value: 'AB' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent('Device name must be at least 3 characters');
      });
    });

    it('should show error when device ID is empty', async () => {
      renderModal(true);
      
      const nameInput = screen.getByTestId('device-name-input');
      fireEvent.change(nameInput, { target: { value: 'Test Device' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('device-id-error')).toHaveTextContent('Device ID is required');
      });
    });

    it('should show error when device ID is too short', async () => {
      renderModal(true);
      
      const nameInput = screen.getByTestId('device-name-input');
      const idInput = screen.getByTestId('device-id-input');
      
      fireEvent.change(nameInput, { target: { value: 'Test Device' } });
      fireEvent.change(idInput, { target: { value: '1234' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('device-id-error')).toHaveTextContent('Device ID must be at least 5 characters');
      });
    });

    it('should show error when location is empty', async () => {
      renderModal(true);
      
      const nameInput = screen.getByTestId('device-name-input');
      const idInput = screen.getByTestId('device-id-input');
      
      fireEvent.change(nameInput, { target: { value: 'Test Device' } });
      fireEvent.change(idInput, { target: { value: '12345' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('location-error')).toHaveTextContent('Location is required');
      });
    });

    it('should clear error when user types in field', async () => {
      renderModal(true);
      
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('device-name-input');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(screen.queryByTestId('name-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      mockMutateAsync.mockResolvedValue({
        id: 'device-1',
        name: 'Test Device',
        status: 'connected',
        location: 'Test Location',
        batteryLevel: 100,
        lastReading: {
          timestamp: new Date().toISOString(),
          aqi: 50,
        },
      });

      renderModal(true);
      
      const nameInput = screen.getByTestId('device-name-input');
      const idInput = screen.getByTestId('device-id-input');
      const locationInput = screen.getByTestId('device-location-input');
      
      fireEvent.change(nameInput, { target: { value: 'Test Device' } });
      fireEvent.change(idInput, { target: { value: 'device-123' } });
      fireEvent.change(locationInput, { target: { value: 'Test Location' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Test Device',
          deviceId: 'device-123',
          location: 'Test Location',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      mockUseAddDevice.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as any);

      renderModal(true);
      
      expect(screen.getByText('Adding...')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should show error message on submission failure', async () => {
      const errorMessage = 'Failed to add device';
      mockUseAddDevice.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: new Error(errorMessage),
      } as any);

      renderModal(true);
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when clicking close button', () => {
      renderModal(true);
      
      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking cancel button', () => {
      renderModal(true);
      
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking backdrop', () => {
      renderModal(true);
      
      const modal = screen.getByTestId('add-device-modal');
      fireEvent.click(modal);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when clicking modal content', () => {
      renderModal(true);
      
      const form = screen.getByTestId('add-device-form');
      fireEvent.click(form);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal when pressing Escape key', () => {
      renderModal(true);
      
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('should reset form when modal opens', () => {
      const { rerender } = renderModal(false);
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <AddDeviceModal
            isOpen={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
        </QueryClientProvider>
      );

      const nameInput = screen.getByTestId('device-name-input') as HTMLInputElement;
      const idInput = screen.getByTestId('device-id-input') as HTMLInputElement;
      const locationInput = screen.getByTestId('device-location-input') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(idInput.value).toBe('');
      expect(locationInput.value).toBe('');
    });
  });
});
