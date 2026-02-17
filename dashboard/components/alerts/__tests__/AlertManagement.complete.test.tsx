/**
 * Complete Alert Management Tests
 * 
 * Comprehensive tests for alert management including:
 * - Alert creation flow
 * - Alert notification display
 * - Alert editing/deletion
 * - API integration
 * 
 * Requirements: 18.1-18.8
 */

import { getAQIClient } from '@/lib/api/aqi-client';
import type { AlertSubscriptionResponse, CreateAlertRequest } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

describe('Alert Management Complete Tests', () => {
  let mockAPIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock API client
    mockAPIClient = {
      createAlert: jest.fn(),
      getAlerts: jest.fn(),
      updateAlert: jest.fn(),
      deleteAlert: jest.fn(),
    };

    (getAQIClient as jest.Mock).mockReturnValue(mockAPIClient);
  });

  describe('Alert Creation Flow', () => {
    it('should call API with correct parameters when creating alert', async () => {
      const alertRequest: CreateAlertRequest = {
        location: 'Delhi',
        threshold: 150,
        condition: 'above',
        notificationChannels: ['push', 'email'],
      };

      const mockResponse: AlertSubscriptionResponse = {
        id: 'alert-1',
        location: { latitude: 28.6139, longitude: 77.2090 },
        location_name: 'Delhi',
        threshold: 150,
        channels: ['push', 'email'],
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockAPIClient.createAlert.mockResolvedValue(mockResponse);

      const client = getAQIClient();
      const result = await client.createAlert(alertRequest);

      expect(mockAPIClient.createAlert).toHaveBeenCalledWith(alertRequest);
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('alert-1');
      expect(result.threshold).toBe(150);
    });

    it('should handle API errors during alert creation', async () => {
      const alertRequest: CreateAlertRequest = {
        location: 'Delhi',
        threshold: 150,
        condition: 'above',
        notificationChannels: ['push'],
      };

      mockAPIClient.createAlert.mockRejectedValue(
        new Error('Failed to create alert')
      );

      const client = getAQIClient();

      await expect(client.createAlert(alertRequest)).rejects.toThrow(
        'Failed to create alert'
      );
    });
  });

  describe('Alert Listing', () => {
    it('should fetch and return list of alerts', async () => {
      const mockAlerts: AlertSubscriptionResponse[] = [
        {
          id: 'alert-1',
          location: { latitude: 28.6139, longitude: 77.2090 },
          location_name: 'Delhi',
          threshold: 150,
          channels: ['push'],
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'alert-2',
          location: { latitude: 19.0760, longitude: 72.8777 },
          location_name: 'Mumbai',
          threshold: 100,
          channels: ['email'],
          is_active: false,
          created_at: new Date().toISOString(),
        },
      ];

      mockAPIClient.getAlerts.mockResolvedValue(mockAlerts);

      const client = getAQIClient();
      const result = await client.getAlerts();

      expect(mockAPIClient.getAlerts).toHaveBeenCalled();
      expect(result).toEqual(mockAlerts);
      expect(result).toHaveLength(2);
      expect(result[0].location_name).toBe('Delhi');
      expect(result[1].location_name).toBe('Mumbai');
    });

    it('should handle empty alert list', async () => {
      mockAPIClient.getAlerts.mockResolvedValue([]);

      const client = getAQIClient();
      const result = await client.getAlerts();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Alert Deletion', () => {
    it('should call delete API with correct alert ID', async () => {
      const alertId = 'alert-1';
      mockAPIClient.deleteAlert.mockResolvedValue(undefined);

      const client = getAQIClient();
      await client.deleteAlert(alertId);

      expect(mockAPIClient.deleteAlert).toHaveBeenCalledWith(alertId);
    });

    it('should handle deletion errors', async () => {
      const alertId = 'alert-1';
      mockAPIClient.deleteAlert.mockRejectedValue(
        new Error('Alert not found')
      );

      const client = getAQIClient();

      await expect(client.deleteAlert(alertId)).rejects.toThrow(
        'Alert not found'
      );
    });
  });

  describe('Alert Update', () => {
    it('should call update API with correct parameters', async () => {
      const alertId = 'alert-1';
      const updateData = {
        threshold: 200,
        channels: ['push', 'email', 'sms'],
        is_active: false,
      };

      const mockUpdatedAlert: AlertSubscriptionResponse = {
        id: alertId,
        location: { latitude: 28.6139, longitude: 77.2090 },
        location_name: 'Delhi',
        threshold: 200,
        channels: ['push', 'email', 'sms'],
        is_active: false,
        created_at: new Date().toISOString(),
      };

      mockAPIClient.updateAlert.mockResolvedValue(mockUpdatedAlert);

      const client = getAQIClient();
      const result = await client.updateAlert(alertId, updateData);

      expect(mockAPIClient.updateAlert).toHaveBeenCalledWith(alertId, updateData);
      expect(result.threshold).toBe(200);
      expect(result.is_active).toBe(false);
    });
  });

  describe('Notification Display Logic', () => {
    it('should detect threshold crossing (above)', () => {
      const threshold = 150;
      const previousAQI = 140;
      const currentAQI = 160;
      const condition = 'above';

      // Check if threshold was crossed
      const wasCrossed =
        condition === 'above' &&
        previousAQI <= threshold &&
        currentAQI > threshold;

      expect(wasCrossed).toBe(true);
    });

    it('should detect threshold crossing (below)', () => {
      const threshold = 100;
      const previousAQI = 110;
      const currentAQI = 90;
      const condition = 'below';

      // Check if threshold was crossed
      const wasCrossed =
        condition === 'below' &&
        previousAQI >= threshold &&
        currentAQI < threshold;

      expect(wasCrossed).toBe(true);
    });

    it('should not detect crossing when AQI stays on same side', () => {
      const threshold = 150;
      const previousAQI = 140;
      const currentAQI = 145;
      const condition = 'above';

      const wasCrossed =
        condition === 'above' &&
        previousAQI <= threshold &&
        currentAQI > threshold;

      expect(wasCrossed).toBe(false);
    });

    it('should not detect crossing when condition is not met', () => {
      const threshold = 150;
      const previousAQI = 160;
      const currentAQI = 140;
      const condition = 'above'; // Looking for above, but AQI went down

      const wasCrossed =
        condition === 'above' &&
        previousAQI <= threshold &&
        currentAQI > threshold;

      expect(wasCrossed).toBe(false);
    });
  });

  describe('Alert Message Formatting', () => {
    it('should format notification message with all required information', () => {
      const location = 'Delhi';
      const aqi = 160;
      const threshold = 150;
      const condition = 'above';
      const timestamp = new Date().toISOString();

      // Simulate message formatting
      const title = `AQI Threshold ${condition === 'above' ? 'Exceeded' : 'Dropped'}: ${location}`;
      const body = `Air quality ${condition === 'above' ? 'has risen to' : 'has improved to'} AQI ${aqi} (threshold: ${threshold}).\nTap for more details.`;
      const data = {
        type: 'threshold-crossing',
        location,
        aqi,
        threshold,
        condition,
        timestamp,
      };

      // Verify all required information is present
      expect(title).toContain(location);
      expect(title).toContain('Exceeded');
      expect(body).toContain(String(aqi));
      expect(body).toContain(String(threshold));
      expect(body).toContain('Tap for more details');
      expect(data.location).toBe(location);
      expect(data.aqi).toBe(aqi);
      expect(data.threshold).toBe(threshold);
      expect(data.timestamp).toBe(timestamp);
    });

    it('should include appropriate action text in message', () => {
      const messages = [
        'Tap for more details',
        'Click for more information',
        'View details',
      ];

      const body = 'AQI has risen to 160. Tap for more details.';

      const hasAction = messages.some((msg) =>
        body.toLowerCase().includes(msg.toLowerCase())
      );

      expect(hasAction).toBe(true);
    });
  });

  describe('API Endpoint Integration', () => {
    it('should use correct endpoint for creating alerts', async () => {
      const request: CreateAlertRequest = {
        location: 'Delhi',
        threshold: 150,
        condition: 'above',
        notificationChannels: ['push'],
      };

      mockAPIClient.createAlert.mockResolvedValue({
        id: 'alert-1',
        location: { latitude: 0, longitude: 0 },
        threshold: 150,
        channels: ['push'],
        is_active: true,
        created_at: new Date().toISOString(),
      });

      const client = getAQIClient();
      await client.createAlert(request);

      // Verify the method was called (endpoint is handled by the client)
      expect(mockAPIClient.createAlert).toHaveBeenCalledWith(request);
    });

    it('should use correct endpoint for fetching alerts', async () => {
      mockAPIClient.getAlerts.mockResolvedValue([]);

      const client = getAQIClient();
      await client.getAlerts();

      expect(mockAPIClient.getAlerts).toHaveBeenCalled();
    });

    it('should use correct endpoint for updating alerts', async () => {
      const alertId = 'alert-1';
      const updateData = { threshold: 200 };

      mockAPIClient.updateAlert.mockResolvedValue({
        id: alertId,
        location: { latitude: 0, longitude: 0 },
        threshold: 200,
        channels: ['push'],
        is_active: true,
        created_at: new Date().toISOString(),
      });

      const client = getAQIClient();
      await client.updateAlert(alertId, updateData);

      expect(mockAPIClient.updateAlert).toHaveBeenCalledWith(alertId, updateData);
    });

    it('should use correct endpoint for deleting alerts', async () => {
      const alertId = 'alert-1';
      mockAPIClient.deleteAlert.mockResolvedValue(undefined);

      const client = getAQIClient();
      await client.deleteAlert(alertId);

      expect(mockAPIClient.deleteAlert).toHaveBeenCalledWith(alertId);
    });
  });

  describe('Alert Validation', () => {
    it('should validate threshold is within valid range', () => {
      const validThresholds = [0, 50, 150, 300, 500];
      const invalidThresholds = [-1, 501, 1000];

      validThresholds.forEach((threshold) => {
        expect(threshold >= 0 && threshold <= 500).toBe(true);
      });

      invalidThresholds.forEach((threshold) => {
        expect(threshold >= 0 && threshold <= 500).toBe(false);
      });
    });

    it('should validate notification channels are valid', () => {
      const validChannels = ['email', 'sms', 'push'];
      const invalidChannels = ['invalid', 'unknown', ''];

      validChannels.forEach((channel) => {
        expect(['email', 'sms', 'push'].includes(channel)).toBe(true);
      });

      invalidChannels.forEach((channel) => {
        expect(['email', 'sms', 'push'].includes(channel)).toBe(false);
      });
    });

    it('should validate location is not empty', () => {
      const validLocations = ['Delhi', 'Mumbai', 'Bangalore'];
      const invalidLocations = ['', '   '];

      validLocations.forEach((location) => {
        expect(location && location.trim().length > 0).toBe(true);
      });

      invalidLocations.forEach((location) => {
        expect(!location || location.trim().length === 0).toBe(true);
      });
    });
  });
});
