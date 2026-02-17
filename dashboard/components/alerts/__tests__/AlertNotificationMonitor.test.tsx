/**
 * Tests for AlertNotificationMonitor component
 * 
 * Requirements: 18.3, 18.4
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertNotificationMonitor } from '../AlertNotificationMonitor';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Alert } from '@/lib/api/types';

// Mock the useNotifications hook
jest.mock('@/lib/hooks/useNotifications');

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

describe('AlertNotificationMonitor', () => {
  const mockShowThresholdNotification = jest.fn();
  
  const createMockAlert = (overrides?: Partial<Alert>): Alert => ({
    id: 'alert-1',
    userId: 'user-1',
    location: {
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      name: 'Delhi',
      country: 'India',
    },
    threshold: 150,
    condition: 'above',
    enabled: true,
    notificationChannels: ['push', 'email'],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseNotifications.mockReturnValue({
      permission: 'granted',
      isSupported: true,
      isGranted: true,
      isDenied: false,
      requestPermission: jest.fn(),
      showNotification: jest.fn(),
      showAQIAlert: jest.fn(),
      showThresholdNotification: mockShowThresholdNotification,
    });
  });

  describe('threshold crossing detection', () => {
    it('should trigger notification when AQI crosses above threshold', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Update AQI to cross threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).toHaveBeenCalledWith(
        'Delhi',
        155,
        150,
        'above',
        expect.any(Function)
      );
    });

    it('should trigger notification when AQI crosses below threshold', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'below' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      // Update AQI to cross threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={145}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).toHaveBeenCalledWith(
        'Delhi',
        145,
        150,
        'below',
        expect.any(Function)
      );
    });

    it('should not trigger notification if threshold is not crossed', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Update AQI but don't cross threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={145}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });

    it('should not trigger duplicate notifications for same threshold crossing', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Cross threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      // Update AQI again but still above threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={160}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      // Should only be called once
      expect(mockShowThresholdNotification).toHaveBeenCalledTimes(1);
    });

    it('should trigger notification again after AQI moves back across threshold', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Cross threshold (first time)
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      // Move back below threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={145}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Cross threshold again (second time)
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={160}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      // Should be called twice
      expect(mockShowThresholdNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('alert filtering', () => {
    it('should not trigger notification if alert is disabled', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above', enabled: false });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });

    it('should not trigger notification if location does not match', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Mumbai"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Mumbai"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });

    it('should not trigger notification if push channel is not enabled', () => {
      const alert = createMockAlert({
        threshold: 150,
        condition: 'above',
        notificationChannels: ['email', 'sms'],
      });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });

    it('should not trigger notification if monitor is disabled', () => {
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={false}
        />
      );
      
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={false}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });

    it('should not trigger notification if permission is not granted', () => {
      mockUseNotifications.mockReturnValue({
        permission: 'denied',
        isSupported: true,
        isGranted: false,
        isDenied: true,
        requestPermission: jest.fn(),
        showNotification: jest.fn(),
        showAQIAlert: jest.fn(),
        showThresholdNotification: mockShowThresholdNotification,
      });
      
      const alert = createMockAlert({ threshold: 150, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      rerender(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).not.toHaveBeenCalled();
    });
  });

  describe('multiple alerts', () => {
    it('should handle multiple alerts for same location', () => {
      const alert1 = createMockAlert({ id: 'alert-1', threshold: 150, condition: 'above' });
      const alert2 = createMockAlert({ id: 'alert-2', threshold: 200, condition: 'above' });
      
      const { rerender } = render(
        <AlertNotificationMonitor
          alerts={[alert1, alert2]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      // Cross first threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert1, alert2]}
          currentAQI={155}
          location="Delhi"
          category="unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).toHaveBeenCalledTimes(1);
      expect(mockShowThresholdNotification).toHaveBeenCalledWith(
        'Delhi',
        155,
        150,
        'above',
        expect.any(Function)
      );
      
      // Cross second threshold
      rerender(
        <AlertNotificationMonitor
          alerts={[alert1, alert2]}
          currentAQI={205}
          location="Delhi"
          category="very_unhealthy"
          enabled={true}
        />
      );
      
      expect(mockShowThresholdNotification).toHaveBeenCalledTimes(2);
      expect(mockShowThresholdNotification).toHaveBeenLastCalledWith(
        'Delhi',
        205,
        200,
        'above',
        expect.any(Function)
      );
    });
  });

  describe('rendering', () => {
    it('should not render any visible content', () => {
      const alert = createMockAlert();
      
      const { container } = render(
        <AlertNotificationMonitor
          alerts={[alert]}
          currentAQI={140}
          location="Delhi"
          category="unhealthy_sensitive"
          enabled={true}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });
});
