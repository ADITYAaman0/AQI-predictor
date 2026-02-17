/**
 * AlertNotificationMonitor Component
 * 
 * Monitors AQI data and triggers browser notifications when
 * user-defined thresholds are crossed.
 * 
 * Features:
 * - Monitor current AQI values
 * - Detect threshold crossings
 * - Display browser notifications
 * - Track notification history to avoid duplicates
 * 
 * Requirements: 18.3, 18.4
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Alert } from '@/lib/api/types';

export interface AlertNotificationMonitorProps {
  alerts: Alert[];
  currentAQI: number;
  location: string;
  category: string;
  enabled?: boolean;
}

/**
 * AlertNotificationMonitor Component
 * 
 * This component monitors AQI values and triggers notifications
 * when thresholds are crossed. It should be mounted at the app level
 * to continuously monitor alerts.
 * 
 * @example
 * ```tsx
 * <AlertNotificationMonitor
 *   alerts={userAlerts}
 *   currentAQI={currentAQIData.aqi.value}
 *   location={currentLocation}
 *   category={currentAQIData.aqi.category}
 *   enabled={true}
 * />
 * ```
 */
export const AlertNotificationMonitor: React.FC<AlertNotificationMonitorProps> = ({
  alerts,
  currentAQI,
  location,
  category,
  enabled = true,
}) => {
  const { isGranted, showThresholdNotification } = useNotifications();
  
  // Track previous AQI value to detect crossings
  const previousAQIRef = useRef<number | null>(null);
  
  // Track which alerts have been triggered to avoid duplicates
  const triggeredAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Skip if notifications are disabled or not granted
    if (!enabled || !isGranted) {
      return;
    }

    // Skip if no previous value (first render)
    if (previousAQIRef.current === null) {
      previousAQIRef.current = currentAQI;
      return;
    }

    const previousAQI = previousAQIRef.current;

    // Check each alert for threshold crossings
    alerts.forEach((alert) => {
      // Skip if alert is not enabled
      if (!alert.enabled) {
        return;
      }

      // Skip if alert is not for current location
      if (alert.location.name !== location) {
        return;
      }

      // Skip if push notifications are not enabled for this alert
      if (!alert.notificationChannels.includes('push')) {
        return;
      }

      const threshold = alert.threshold;
      const condition = alert.condition;
      const alertKey = `${alert.id}-${threshold}-${condition}`;

      // Check if threshold was crossed
      let wasCrossed = false;

      if (condition === 'above') {
        // Check if AQI went from below/at threshold to above threshold
        if (previousAQI <= threshold && currentAQI > threshold) {
          wasCrossed = true;
        }
      } else if (condition === 'below') {
        // Check if AQI went from above/at threshold to below threshold
        if (previousAQI >= threshold && currentAQI < threshold) {
          wasCrossed = true;
        }
      }

      // If threshold was crossed and not already triggered
      if (wasCrossed && !triggeredAlertsRef.current.has(alertKey)) {
        // Show notification
        showThresholdNotification(
          location,
          currentAQI,
          threshold,
          condition,
          () => {
            // On click, focus window and navigate to dashboard
            window.focus();
            // Could also navigate to specific location or alerts page
          }
        );

        // Mark as triggered
        triggeredAlertsRef.current.add(alertKey);

        // Log for debugging
        console.log(
          `[AlertNotificationMonitor] Threshold crossed: ${location} AQI ${currentAQI} ${condition} ${threshold}`
        );
      }

      // Reset triggered state if AQI moves back across threshold
      // This allows the alert to trigger again if threshold is crossed multiple times
      if (!wasCrossed && triggeredAlertsRef.current.has(alertKey)) {
        if (condition === 'above' && currentAQI <= threshold) {
          triggeredAlertsRef.current.delete(alertKey);
        } else if (condition === 'below' && currentAQI >= threshold) {
          triggeredAlertsRef.current.delete(alertKey);
        }
      }
    });

    // Update previous AQI
    previousAQIRef.current = currentAQI;
  }, [alerts, currentAQI, location, category, enabled, isGranted, showThresholdNotification]);

  // This component doesn't render anything
  return null;
};

export default AlertNotificationMonitor;
