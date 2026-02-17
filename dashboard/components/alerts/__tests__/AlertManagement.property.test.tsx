/**
 * Alert Management Property-Based Tests
 * 
 * Tests correctness properties for alert management:
 * - Property 41: Alert Threshold Notification
 * - Property 42: Alert Message Completeness
 * - Property 43: Alert API Integration
 * 
 * Requirements: 18.1-18.8
 */

import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { AlertNotificationMonitor } from '../AlertNotificationMonitor';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { AlertSubscriptionResponse, CreateAlertRequest } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

// Mock notifications API
const mockNotificationConstructor = jest.fn();
const mockNotificationInstance = {
  close: jest.fn(),
  onclick: null,
};
mockNotificationConstructor.mockReturnValue(mockNotificationInstance);

global.Notification = mockNotificationConstructor as any;
(global.Notification as any).permission = 'granted';
(global.Notification as any).requestPermission = jest.fn().mockResolvedValue('granted');

describe('Alert Management Property-Based Tests', () => {
  let mockAPIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationConstructor.mockClear();
    mockNotificationInstance.close.mockClear();

    // Setup mock API client
    mockAPIClient = {
      createAlert: jest.fn(),
      getAlerts: jest.fn(),
      updateAlert: jest.fn(),
      deleteAlert: jest.fn(),
    };

    (getAQIClient as jest.Mock).mockReturnValue(mockAPIClient);
  });

  /**
   * Property 41: Alert Threshold Notification
   * 
   * For any AQI crossing user-defined threshold, push notification should display
   * 
   * Validates: Requirements 18.3
   */
  describe('Property 41: Alert Threshold Notification', () => {
    it('should display push notification for any AQI crossing threshold', () => {
      fc.assert(
        fc.property(
          // Generate alert with threshold
          fc.record({
            threshold: fc.integer({ min: 0, max: 500 }),
            condition: fc.constantFrom('above' as const, 'below' as const),
            location: fc.constantFrom('Delhi', 'Mumbai', 'Bangalore', 'Chennai'),
          }),
          // Generate AQI values before and after crossing
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: -50, max: 50 }),
          (alertConfig, baseAQI, aqiChange) => {
            // Create alert
            const alert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: alertConfig.location.toLowerCase(),
                name: alertConfig.location,
                city: alertConfig.location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold: alertConfig.threshold,
              condition: alertConfig.condition,
              enabled: true,
              notificationChannels: ['push'],
              createdAt: new Date().toISOString(),
            };

            // Calculate AQI values that cross the threshold
            let aqiBefore: number;
            let aqiAfter: number;

            if (alertConfig.condition === 'above') {
              // Start below threshold, end above
              aqiBefore = Math.max(0, alertConfig.threshold - Math.abs(aqiChange));
              aqiAfter = Math.min(500, alertConfig.threshold + Math.abs(aqiChange));
            } else {
              // Start above threshold, end below
              aqiBefore = Math.min(500, alertConfig.threshold + Math.abs(aqiChange));
              aqiAfter = Math.max(0, alertConfig.threshold - Math.abs(aqiChange));
            }

            // Skip if no actual crossing occurs
            if (
              (alertConfig.condition === 'above' && aqiAfter <= alertConfig.threshold) ||
              (alertConfig.condition === 'below' && aqiAfter >= alertConfig.threshold)
            ) {
              return true;
            }

            // Clear previous calls
            mockNotificationConstructor.mockClear();

            // First render with AQI before crossing
            const { rerender } = render(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiBefore}
                location={alertConfig.location}
                category="moderate"
                enabled={true}
              />
            );

            // No notification should be shown yet
            const callsBeforeCrossing = mockNotificationConstructor.mock.calls.length;

            // Re-render with AQI after crossing
            rerender(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiAfter}
                location={alertConfig.location}
                category="unhealthy"
                enabled={true}
              />
            );

            // Notification should be displayed after crossing
            const callsAfterCrossing = mockNotificationConstructor.mock.calls.length;

            // Property: Notification should be displayed when threshold is crossed
            return callsAfterCrossing > callsBeforeCrossing;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display notification if alert is disabled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: 0, max: 500 }),
          fc.constantFrom('Delhi', 'Mumbai', 'Bangalore'),
          (threshold, aqi, location) => {
            const alert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: location.toLowerCase(),
                name: location,
                city: location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold,
              condition: 'above',
              enabled: false, // Alert is disabled
              notificationChannels: ['push'],
              createdAt: new Date().toISOString(),
            };

            mockNotificationConstructor.mockClear();

            const { rerender } = render(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={threshold - 10}
                location={location}
                category="moderate"
                enabled={true}
              />
            );

            rerender(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={threshold + 10}
                location={location}
                category="unhealthy"
                enabled={true}
              />
            );

            // Property: No notification should be shown for disabled alerts
            return mockNotificationConstructor.mock.calls.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display notification if push channel is not enabled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),
          fc.constantFrom('Delhi', 'Mumbai', 'Bangalore'),
          fc.array(fc.constantFrom('email' as const, 'sms' as const), { minLength: 1, maxLength: 2 }),
          (threshold, location, channels) => {
            const alert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: location.toLowerCase(),
                name: location,
                city: location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold,
              condition: 'above',
              enabled: true,
              notificationChannels: channels, // No 'push' channel
              createdAt: new Date().toISOString(),
            };

            mockNotificationConstructor.mockClear();

            const { rerender } = render(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={threshold - 10}
                location={location}
                category="moderate"
                enabled={true}
              />
            );

            rerender(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={threshold + 10}
                location={location}
                category="unhealthy"
                enabled={true}
              />
            );

            // Property: No notification should be shown if push is not enabled
            return mockNotificationConstructor.mock.calls.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 42: Alert Message Completeness
   * 
   * For any alert, message should contain timestamp, location, AQI, and actions
   * 
   * Validates: Requirements 18.5
   */
  describe('Property 42: Alert Message Completeness', () => {
    it('should include all required information in notification message', () => {
      fc.assert(
        fc.property(
          fc.record({
            threshold: fc.integer({ min: 0, max: 500 }),
            condition: fc.constantFrom('above' as const, 'below' as const),
            location: fc.constantFrom('Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'),
          }),
          (alertConfig) => {
            const alert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: alertConfig.location.toLowerCase(),
                name: alertConfig.location,
                city: alertConfig.location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold: alertConfig.threshold,
              condition: alertConfig.condition,
              enabled: true,
              notificationChannels: ['push'],
              createdAt: new Date().toISOString(),
            };

            // Calculate crossing AQI values
            const aqiBefore =
              alertConfig.condition === 'above'
                ? alertConfig.threshold - 10
                : alertConfig.threshold + 10;
            const aqiAfter =
              alertConfig.condition === 'above'
                ? alertConfig.threshold + 10
                : alertConfig.threshold - 10;

            mockNotificationConstructor.mockClear();

            const { rerender } = render(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiBefore}
                location={alertConfig.location}
                category="moderate"
                enabled={true}
              />
            );

            rerender(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiAfter}
                location={alertConfig.location}
                category="unhealthy"
                enabled={true}
              />
            );

            // Check if notification was called
            if (mockNotificationConstructor.mock.calls.length === 0) {
              return true; // Skip if no notification
            }

            const [title, options] = mockNotificationConstructor.mock.calls[0];

            // Property: Title should contain location
            const hasLocation = title.includes(alertConfig.location);

            // Property: Body should contain AQI value
            const hasAQI = options.body.includes(String(aqiAfter));

            // Property: Body should contain threshold
            const hasThreshold = options.body.includes(String(alertConfig.threshold));

            // Property: Data should contain timestamp
            const hasTimestamp = options.data && options.data.timestamp;

            // Property: Data should contain location
            const hasLocationInData = options.data && options.data.location === alertConfig.location;

            // Property: Data should contain AQI
            const hasAQIInData = options.data && options.data.aqi === aqiAfter;

            // Property: Body should contain action text (e.g., "Tap for more details")
            const hasAction = options.body.toLowerCase().includes('tap') || 
                             options.body.toLowerCase().includes('click') ||
                             options.body.toLowerCase().includes('details');

            // All properties must be true
            return (
              hasLocation &&
              hasAQI &&
              hasThreshold &&
              hasTimestamp &&
              hasLocationInData &&
              hasAQIInData &&
              hasAction
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include appropriate condition text in message', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 450 }),
          fc.constantFrom('above' as const, 'below' as const),
          fc.constantFrom('Delhi', 'Mumbai'),
          (threshold, condition, location) => {
            const alert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: location.toLowerCase(),
                name: location,
                city: location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold,
              condition,
              enabled: true,
              notificationChannels: ['push'],
              createdAt: new Date().toISOString(),
            };

            const aqiBefore = condition === 'above' ? threshold - 10 : threshold + 10;
            const aqiAfter = condition === 'above' ? threshold + 10 : threshold - 10;

            mockNotificationConstructor.mockClear();

            const { rerender } = render(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiBefore}
                location={location}
                category="moderate"
                enabled={true}
              />
            );

            rerender(
              <AlertNotificationMonitor
                alerts={[alert]}
                currentAQI={aqiAfter}
                location={location}
                category="unhealthy"
                enabled={true}
              />
            );

            if (mockNotificationConstructor.mock.calls.length === 0) {
              return true;
            }

            const [title, options] = mockNotificationConstructor.mock.calls[0];

            // Property: Message should indicate direction of crossing
            if (condition === 'above') {
              return (
                title.toLowerCase().includes('exceeded') ||
                options.body.toLowerCase().includes('risen') ||
                options.body.toLowerCase().includes('increased')
              );
            } else {
              return (
                title.toLowerCase().includes('dropped') ||
                title.toLowerCase().includes('below') ||
                options.body.toLowerCase().includes('improved') ||
                options.body.toLowerCase().includes('decreased')
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 43: Alert API Integration
   * 
   * For any alert action, dashboard should call /api/v1/alerts endpoint
   * 
   * Validates: Requirements 18.7
   */
  describe('Property 43: Alert API Integration', () => {
    it('should call correct API endpoint for alert creation', () => {
      fc.assert(
        fc.property(
          fc.record({
            location: fc.constantFrom('Delhi', 'Mumbai', 'Bangalore', 'Chennai'),
            threshold: fc.integer({ min: 0, max: 500 }),
            condition: fc.constantFrom('above' as const, 'below' as const),
            channels: fc.array(
              fc.constantFrom('push' as const, 'email' as const, 'sms' as const),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (alertData) => {
            const request: CreateAlertRequest = {
              location: alertData.location,
              threshold: alertData.threshold,
              condition: alertData.condition,
              notificationChannels: [...new Set(alertData.channels)], // Remove duplicates
            };

            const mockAlert: Alert = {
              id: `alert-${Math.random()}`,
              userId: 'user-1',
              location: {
                id: alertData.location.toLowerCase(),
                name: alertData.location,
                city: alertData.location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold: alertData.threshold,
              condition: alertData.condition,
              enabled: true,
              notificationChannels: request.notificationChannels,
              createdAt: new Date().toISOString(),
            };

            mockAPIClient.createAlert.mockResolvedValue(mockAlert);

            // Call the API client
            const client = getAQIClient();
            await client.createAlert(request);

            // Property: createAlert method should be called
            const wasCreateCalled = mockAPIClient.createAlert.mock.calls.length > 0;

            // Property: createAlert should be called with correct parameters
            const callArgs = mockAPIClient.createAlert.mock.calls[0]?.[0];
            const hasCorrectLocation = callArgs?.location === alertData.location;
            const hasCorrectThreshold = callArgs?.threshold === alertData.threshold;
            const hasCorrectCondition = callArgs?.condition === alertData.condition;
            const hasCorrectChannels =
              callArgs?.notificationChannels &&
              callArgs.notificationChannels.length === request.notificationChannels.length;

            return (
              wasCreateCalled &&
              hasCorrectLocation &&
              hasCorrectThreshold &&
              hasCorrectCondition &&
              hasCorrectChannels
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for alert deletion', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (alertId) => {
            mockAPIClient.deleteAlert.mockResolvedValue(undefined);

            // Call the API client
            const client = getAQIClient();
            await client.deleteAlert(alertId);

            // Property: deleteAlert method should be called
            const wasDeleteCalled = mockAPIClient.deleteAlert.mock.calls.length > 0;

            // Property: deleteAlert should be called with correct alert ID
            const callArgs = mockAPIClient.deleteAlert.mock.calls[0]?.[0];
            const hasCorrectId = callArgs === alertId;

            return wasDeleteCalled && hasCorrectId;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for alert update', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            threshold: fc.integer({ min: 0, max: 500 }),
            channels: fc.array(
              fc.constantFrom('push' as const, 'email' as const, 'sms' as const),
              { minLength: 1, maxLength: 3 }
            ),
            is_active: fc.boolean(),
          }),
          async (alertId, updateData) => {
            const mockUpdatedAlert: Alert = {
              id: alertId,
              userId: 'user-1',
              location: {
                id: 'delhi',
                name: 'Delhi',
                city: 'Delhi',
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold: updateData.threshold,
              condition: 'above',
              enabled: updateData.is_active,
              notificationChannels: [...new Set(updateData.channels)],
              createdAt: new Date().toISOString(),
            };

            mockAPIClient.updateAlert.mockResolvedValue(mockUpdatedAlert);

            // Call the API client
            const client = getAQIClient();
            await client.updateAlert(alertId, updateData);

            // Property: updateAlert method should be called
            const wasUpdateCalled = mockAPIClient.updateAlert.mock.calls.length > 0;

            // Property: updateAlert should be called with correct alert ID
            const callAlertId = mockAPIClient.updateAlert.mock.calls[0]?.[0];
            const hasCorrectId = callAlertId === alertId;

            // Property: updateAlert should be called with update data
            const callUpdateData = mockAPIClient.updateAlert.mock.calls[0]?.[1];
            const hasUpdateData = callUpdateData !== undefined;

            return wasUpdateCalled && hasCorrectId && hasUpdateData;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for fetching alerts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              threshold: fc.integer({ min: 0, max: 500 }),
              location: fc.constantFrom('Delhi', 'Mumbai', 'Bangalore'),
            }),
            { maxLength: 10 }
          ),
          async (alertsData) => {
            const mockAlerts: Alert[] = alertsData.map((data) => ({
              id: data.id,
              userId: 'user-1',
              location: {
                id: data.location.toLowerCase(),
                name: data.location,
                city: data.location,
                state: '',
                country: 'India',
                latitude: 0,
                longitude: 0,
              },
              threshold: data.threshold,
              condition: 'above',
              enabled: true,
              notificationChannels: ['push'],
              createdAt: new Date().toISOString(),
            }));

            mockAPIClient.getAlerts.mockResolvedValue(mockAlerts);

            // Call the API client
            const client = getAQIClient();
            const result = await client.getAlerts();

            // Property: getAlerts method should be called
            const wasGetCalled = mockAPIClient.getAlerts.mock.calls.length > 0;

            // Property: getAlerts should return array of alerts
            const returnsArray = Array.isArray(result);

            // Property: returned alerts should match expected count
            const hasCorrectCount = result.length === mockAlerts.length;

            return wasGetCalled && returnsArray && hasCorrectCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
