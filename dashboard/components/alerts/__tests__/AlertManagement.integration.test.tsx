/**
 * Alert Management Integration Tests
 * 
 * Tests the complete alert management flow including:
 * - Alert creation
 * - Alert listing
 * - Alert editing/deletion
 * - Notification display
 * - API integration
 * 
 * Requirements: 18.1-18.8
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertConfigurationCardConnected } from '../AlertConfigurationCardConnected';
import { AlertsListConnected } from '../AlertsListConnected';
import { AlertNotificationMonitor } from '../AlertNotificationMonitor';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { AlertSubscriptionResponse, CreateAlertRequest } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

// Mock notifications API
const mockNotification = jest.fn();
global.Notification = mockNotification as any;
(global.Notification as any).permission = 'granted';
(global.Notification as any).requestPermission = jest.fn().mockResolvedValue('granted');

describe('Alert Management Integration Tests', () => {
  let queryClient: QueryClient;
  let mockAPIClient: any;

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    mockNotification.mockClear();

    // Setup mock API client
    mockAPIClient = {
      createAlert: jest.fn(),
      getAlerts: jest.fn(),
      updateAlert: jest.fn(),
      deleteAlert: jest.fn(),
    };

    (getAQIClient as jest.Mock).mockReturnValue(mockAPIClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Alert Creation Flow', () => {
    it('should create an alert successfully', async () => {
      const user = userEvent.setup();
      const mockAlert: AlertSubscriptionResponse = {
        id: 'alert-1',
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
        location_name: 'Delhi',
        threshold: 150,
        channels: ['push', 'email'],
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockAPIClient.createAlert.mockResolvedValue(mockAlert);

      const onSuccess = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <AlertConfigurationCardConnected
            onSuccess={onSuccess}
            initialLocation={{
              id: 'delhi',
              name: 'Delhi',
              city: 'Delhi',
              state: 'Delhi',
              country: 'India',
              latitude: 28.6139,
              longitude: 77.2090,
            }}
          />
        </QueryClientProvider>
      );

      // Select notification channels
      const pushCheckbox = screen.getByRole('checkbox', { name: /push/i });
      await user.click(pushCheckbox);

      // Submit form
      const createButton = screen.getByRole('button', { name: /create alert/i });
      await user.click(createButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockAPIClient.createAlert).toHaveBeenCalled();
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/alert created successfully/i)).toBeInTheDocument();
      });
    });

    it('should validate alert data before submission', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <AlertConfigurationCardConnected />
        </QueryClientProvider>
      );

      // Try to submit without selecting location
      const createButton = screen.getByRole('button', { name: /create alert/i });
      await user.click(createButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/please select a location/i)).toBeInTheDocument();
      });

      // API should not be called
      expect(mockAPIClient.createAlert).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();

      mockAPIClient.createAlert.mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Alert already exists for this location' },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AlertConfigurationCardConnected
            initialLocation={{
              id: 'delhi',
              name: 'Delhi',
              city: 'Delhi',
              state: 'Delhi',
              country: 'India',
              latitude: 28.6139,
              longitude: 77.2090,
            }}
          />
        </QueryClientProvider>
      );

      // Fill form and submit
      const pushCheckbox = screen.getByRole('checkbox', { name: /push/i });
      await user.click(pushCheckbox);

      const createButton = screen.getByRole('button', { name: /create alert/i });
      await user.click(createButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/alert already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert Listing and Management', () => {
    it('should display list of alerts', async () => {
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: true,
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'alert-2',
          userId: 'user-1',
          location: {
            id: 'mumbai',
            name: 'Mumbai',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            latitude: 19.0760,
            longitude: 72.8777,
          },
          threshold: 100,
          condition: 'above',
          enabled: false,
          notificationChannels: ['email'],
          createdAt: new Date().toISOString(),
        },
      ];

      mockAPIClient.getAlerts.mockResolvedValue(mockAlerts);

      render(
        <QueryClientProvider client={queryClient}>
          <AlertsListConnected />
        </QueryClientProvider>
      );

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
        expect(screen.getByText('Mumbai')).toBeInTheDocument();
      });

      // Verify alert details are displayed
      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('should delete an alert', async () => {
      const user = userEvent.setup();

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: true,
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
      ];

      mockAPIClient.getAlerts.mockResolvedValue(mockAlerts);
      mockAPIClient.deleteAlert.mockResolvedValue(undefined);

      render(
        <QueryClientProvider client={queryClient}>
          <AlertsListConnected />
        </QueryClientProvider>
      );

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion (if confirmation dialog exists)
      // This depends on implementation

      // Wait for API call
      await waitFor(() => {
        expect(mockAPIClient.deleteAlert).toHaveBeenCalledWith('alert-1');
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/alert deleted successfully/i)).toBeInTheDocument();
      });
    });

    it('should toggle alert active status', async () => {
      const user = userEvent.setup();

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: true,
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
      ];

      mockAPIClient.getAlerts.mockResolvedValue(mockAlerts);
      mockAPIClient.updateAlert.mockResolvedValue({
        ...mockAlerts[0],
        enabled: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AlertsListConnected />
        </QueryClientProvider>
      );

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Find and click toggle switch
      const toggleSwitch = screen.getByRole('switch', { name: /active/i });
      await user.click(toggleSwitch);

      // Wait for API call
      await waitFor(() => {
        expect(mockAPIClient.updateAlert).toHaveBeenCalledWith(
          'alert-1',
          expect.objectContaining({
            is_active: false,
          })
        );
      });
    });
  });

  describe('Notification Display', () => {
    it('should display notification when threshold is crossed', () => {
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: true,
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
      ];

      // First render with AQI below threshold
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );

      // No notification should be shown yet
      expect(mockNotification).not.toHaveBeenCalled();

      // Re-render with AQI above threshold
      rerender(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={160}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );

      // Notification should be displayed
      expect(mockNotification).toHaveBeenCalledWith(
        expect.stringContaining('Delhi'),
        expect.objectContaining({
          body: expect.stringContaining('160'),
        })
      );
    });

    it('should not display notification if alert is disabled', () => {
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: false, // Alert is disabled
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
      ];

      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );

      rerender(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={160}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );

      // No notification should be shown
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not display notification for different location', () => {
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          userId: 'user-1',
          location: {
            id: 'delhi',
            name: 'Delhi',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          threshold: 150,
          condition: 'above',
          enabled: true,
          notificationChannels: ['push'],
          createdAt: new Date().toISOString(),
        },
      ];

      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={140}
          location="Mumbai" // Different location
          category="unhealthy_sensitive"
          enabled={true}
        />
      );

      rerender(
        <AlertNotificationMonitor
          alerts={mockAlerts}
          currentAQI={160}
          location="Mumbai"
          category="unhealthy"
          enabled={true}
        />
      );

      // No notification should be shown
      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('Complete Alert Management Flow', () => {
    it('should handle complete create-list-delete flow', async () => {
      const user = userEvent.setup();

      // Start with empty alerts
      mockAPIClient.getAlerts.mockResolvedValue([]);

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <div>
            <AlertConfigurationCardConnected
              initialLocation={{
                id: 'delhi',
                name: 'Delhi',
                city: 'Delhi',
                state: 'Delhi',
                country: 'India',
                latitude: 28.6139,
                longitude: 77.2090,
              }}
            />
            <AlertsListConnected />
          </div>
        </QueryClientProvider>
      );

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
      });

      // Create an alert
      const mockAlert: Alert = {
        id: 'alert-1',
        userId: 'user-1',
        location: {
          id: 'delhi',
          name: 'Delhi',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
          latitude: 28.6139,
          longitude: 77.2090,
        },
        threshold: 150,
        condition: 'above',
        enabled: true,
        notificationChannels: ['push'],
        createdAt: new Date().toISOString(),
      };

      mockAPIClient.createAlert.mockResolvedValue(mockAlert);
      mockAPIClient.getAlerts.mockResolvedValue([mockAlert]);

      const pushCheckbox = screen.getByRole('checkbox', { name: /push/i });
      await user.click(pushCheckbox);

      const createButton = screen.getByRole('button', { name: /create alert/i });
      await user.click(createButton);

      // Wait for alert to appear in list
      await waitFor(() => {
        expect(screen.getByText('Delhi')).toBeInTheDocument();
      });

      // Delete the alert
      mockAPIClient.deleteAlert.mockResolvedValue(undefined);
      mockAPIClient.getAlerts.mockResolvedValue([]);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Wait for alert to be removed
      await waitFor(() => {
        expect(screen.queryByText('Delhi')).not.toBeInTheDocument();
      });
    });
  });
});
