import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsListConnected } from '../AlertsListConnected';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { AlertSubscriptionResponse } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

const mockAlerts: AlertSubscriptionResponse[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    location: {
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
      country: 'India',
    },
    location_name: 'Delhi',
    threshold: 150,
    channels: ['email', 'push'],
    is_active: true,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    location: {
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777,
      },
      country: 'India',
    },
    location_name: 'Mumbai',
    threshold: 100,
    channels: ['sms'],
    is_active: false,
    created_at: '2024-01-10T08:15:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AlertsListConnected', () => {
  let mockGetAlerts: jest.Mock;
  let mockDeleteAlert: jest.Mock;
  let mockUpdateAlert: jest.Mock;

  beforeEach(() => {
    mockGetAlerts = jest.fn().mockResolvedValue(mockAlerts);
    mockDeleteAlert = jest.fn().mockResolvedValue(undefined);
    mockUpdateAlert = jest.fn().mockResolvedValue(mockAlerts[0]);

    (getAQIClient as jest.Mock).mockReturnValue({
      getAlerts: mockGetAlerts,
      deleteAlert: mockDeleteAlert,
      updateAlert: mockUpdateAlert,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Fetching', () => {
    it('fetches and displays alerts on mount', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetAlerts).toHaveBeenCalled();
      });

      expect(screen.getByText('Delhi')).toBeInTheDocument();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
    });

    it('displays loading state while fetching', () => {
      mockGetAlerts.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAlerts), 100))
      );

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      // Check for loading animation
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('displays error message when fetch fails', async () => {
      mockGetAlerts.mockRejectedValue(new Error('Network error'));

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load alerts/)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('deletes alert when confirmed', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteAlert).toHaveBeenCalledWith(mockAlerts[0].id);
      });

      // Check for success message
      await waitFor(() => {
        expect(screen.getByText('Alert deleted successfully')).toBeInTheDocument();
      });
    });

    it('displays error message when delete fails', async () => {
      mockDeleteAlert.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Server error' },
        },
      });

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('handles 404 error when alert not found', async () => {
      mockDeleteAlert.mockRejectedValue({
        response: {
          status: 404,
          data: {},
        },
      });

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Alert not found/)).toBeInTheDocument();
      });
    });

    it('handles 401 error when not authenticated', async () => {
      mockDeleteAlert.mockRejectedValue({
        response: {
          status: 401,
          data: {},
        },
      });

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/You must be logged in/)).toBeInTheDocument();
      });
    });

    it('handles network error', async () => {
      mockDeleteAlert.mockRejectedValue(new Error('Network Error'));

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Toggle Active Functionality', () => {
    it('toggles alert from active to inactive', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Click toggle button for active alert
      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        expect(mockUpdateAlert).toHaveBeenCalledWith(
          mockAlerts[0].id,
          expect.objectContaining({
            is_active: false,
          })
        );
      });

      // Check for success message
      await waitFor(() => {
        expect(screen.getByText('Alert deactivated successfully')).toBeInTheDocument();
      });
    });

    it('toggles alert from inactive to active', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Mumbai')).toBeInTheDocument();
      });

      // Click toggle button for inactive alert
      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[1]);

      await waitFor(() => {
        expect(mockUpdateAlert).toHaveBeenCalledWith(
          mockAlerts[1].id,
          expect.objectContaining({
            is_active: true,
          })
        );
      });

      // Check for success message
      await waitFor(() => {
        expect(screen.getByText('Alert activated successfully')).toBeInTheDocument();
      });
    });

    it('displays error message when toggle fails', async () => {
      mockUpdateAlert.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Server error' },
        },
      });

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('handles 404 error when alert not found during toggle', async () => {
      mockUpdateAlert.mockRejectedValue({
        response: {
          status: 404,
          data: {},
        },
      });

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Alert not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Functionality', () => {
    it('calls onEdit callback when edit button is clicked', async () => {
      const onEdit = jest.fn();
      render(<AlertsListConnected onEdit={onEdit} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit alert');
      fireEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledWith(mockAlerts[0]);
    });
  });

  describe('Success Message', () => {
    it('auto-dismisses success message after 3 seconds', async () => {
      jest.useFakeTimers();

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Delete an alert
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Alert deleted successfully')).toBeInTheDocument();
      });

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('Alert deleted successfully')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('can be manually dismissed', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Delete an alert
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Alert deleted successfully')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss success message');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Alert deleted successfully')).not.toBeInTheDocument();
    });
  });

  describe('Error Message', () => {
    it('can be manually dismissed', async () => {
      mockDeleteAlert.mockRejectedValue(new Error('Test error'));

      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Trigger an error
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to delete alert/)).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss error message');
      fireEvent.click(dismissButton);

      expect(screen.queryByText(/Failed to delete alert/)).not.toBeInTheDocument();
    });
  });

  describe('Query Invalidation', () => {
    it('refetches alerts after successful delete', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetAlerts).toHaveBeenCalledTimes(1);
      });

      // Delete an alert
      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockGetAlerts).toHaveBeenCalledTimes(2);
      });
    });

    it('refetches alerts after successful toggle', async () => {
      render(<AlertsListConnected />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetAlerts).toHaveBeenCalledTimes(1);
      });

      // Toggle an alert
      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        expect(mockGetAlerts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
