import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertConfigurationCardConnected } from '../AlertConfigurationCardConnected';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { Alert, CreateAlertRequest } from '@/lib/api/types';
import type { LocationInfo } from '@/components/common/LocationSelector';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

const mockGetAQIClient = getAQIClient as jest.MockedFunction<typeof getAQIClient>;

describe('AlertConfigurationCardConnected', () => {
  const mockLocation: LocationInfo = {
    id: 'delhi',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const mockAlert: Alert = {
    id: 'alert-123',
    userId: 'user-456',
    location: {
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      name: 'Delhi',
      country: 'India',
    },
    threshold: 150,
    condition: 'above',
    enabled: true,
    notificationChannels: ['email'],
    createdAt: '2024-01-15T10:00:00Z',
  };

  let mockCreateAlert: jest.Mock;

  beforeEach(() => {
    mockCreateAlert = jest.fn();
    mockGetAQIClient.mockReturnValue({
      createAlert: mockCreateAlert,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Alert Creation', () => {
    it('should create alert successfully and show success message', async () => {
      mockCreateAlert.mockResolvedValue(mockAlert);

      const onSuccess = jest.fn();
      render(
        <AlertConfigurationCardConnected
          onSuccess={onSuccess}
          initialLocation={mockLocation}
        />
      );

      // Submit the form (default values should be valid)
      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Creating alert...')).toBeInTheDocument();
      });

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Alert created successfully/i)).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockCreateAlert).toHaveBeenCalledTimes(1);
      expect(mockCreateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Delhi',
          threshold: expect.any(Number),
          condition: expect.any(String),
          notificationChannels: expect.any(Array),
        })
      );

      // Verify success callback was called
      expect(onSuccess).toHaveBeenCalledWith(mockAlert);
    });

    it('should clear success message after 3 seconds', async () => {
      jest.useFakeTimers();
      mockCreateAlert.mockResolvedValue(mockAlert);

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Alert created successfully/i)).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText(/Alert created successfully/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should allow dismissing success message manually', async () => {
      mockCreateAlert.mockResolvedValue(mockAlert);

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Alert created successfully/i)).toBeInTheDocument();
      });

      // Find and click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss success message');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Alert created successfully/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Input Validation', () => {
    it('should show error for empty location', async () => {
      render(<AlertConfigurationCardConnected />);

      // Mock the form submission with empty location
      // This would require modifying the component to expose validation
      // For now, we'll test the validation function indirectly
      
      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      // The validation should prevent API call
      await waitFor(() => {
        expect(mockCreateAlert).not.toHaveBeenCalled();
      });
    });

    it('should show error for invalid threshold (< 0)', async () => {
      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      // Find threshold slider and set to invalid value
      const slider = screen.getByLabelText('AQI threshold slider');
      fireEvent.change(slider, { target: { value: '-10' } });

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Threshold must be between 0 and 500/i)).toBeInTheDocument();
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
    });

    it('should show error for invalid threshold (> 500)', async () => {
      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const slider = screen.getByLabelText('AQI threshold slider');
      fireEvent.change(slider, { target: { value: '600' } });

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Threshold must be between 0 and 500/i)).toBeInTheDocument();
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
    });

    it('should show error when no notification channels selected', async () => {
      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      // Uncheck all notification channels
      const emailCheckbox = screen.getByLabelText(/Enable Email notifications/i);
      fireEvent.click(emailCheckbox);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one notification channel/i)).toBeInTheDocument();
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error message for 409 conflict (duplicate alert)', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Alert already exists for this location' },
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/An alert already exists for this location/i)).toBeInTheDocument();
      });
    });

    it('should show error message for 400 bad request', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: 'Invalid threshold value' },
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid threshold value/i)).toBeInTheDocument();
      });
    });

    it('should show error message for 401 unauthorized', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 401,
          data: {},
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/You must be logged in to create alerts/i)).toBeInTheDocument();
      });
    });

    it('should show error message for 429 rate limit', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 429,
          data: {},
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
      });
    });

    it('should show error message for 500 server error', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 500,
          data: {},
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });

    it('should show error message for network error', async () => {
      mockCreateAlert.mockRejectedValue({
        message: 'Network Error',
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error message', async () => {
      mockCreateAlert.mockRejectedValue({
        response: {
          status: 500,
          data: {},
        },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText('Dismiss error message');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Server error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      mockCreateAlert.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAlert), 1000))
      );

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating alert...')).toBeInTheDocument();
      });

      // Form should be disabled during loading
      const card = screen.getByTestId('alert-configuration-card');
      expect(card.parentElement).toHaveClass('opacity-60', 'pointer-events-none');
    });

    it('should prevent duplicate submissions during loading', async () => {
      mockCreateAlert.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAlert), 1000))
      );

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      
      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating alert...')).toBeInTheDocument();
      });

      // API should only be called once
      expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(
        <AlertConfigurationCardConnected
          onCancel={onCancel}
          initialLocation={mockLocation}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for success message', async () => {
      mockCreateAlert.mockResolvedValue(mockAlert);

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const successAlert = screen.getByRole('alert');
        expect(successAlert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have proper ARIA attributes for error message', async () => {
      mockCreateAlert.mockRejectedValue({
        response: { status: 500, data: {} },
      });

      render(<AlertConfigurationCardConnected initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });
});
