/**
 * Test page for notification functionality
 * 
 * This page demonstrates and tests:
 * - Notification permission request
 * - Browser notification display
 * - AQI alert notifications
 * - Threshold crossing notifications
 * - Alert monitoring
 * 
 * Requirements: 18.4
 */

'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationPermissionPrompt } from '@/components/common/NotificationPermissionPrompt';
import { AlertNotificationMonitor } from '@/components/alerts/AlertNotificationMonitor';
import { showTestNotification } from '@/lib/utils/notifications';
import type { Alert } from '@/lib/api/types';

export default function TestNotificationsPage() {
  const {
    permission,
    isSupported,
    isGranted,
    isDenied,
    requestPermission,
    showNotification,
    showAQIAlert,
    showThresholdNotification,
  } = useNotifications();

  const [showPrompt, setShowPrompt] = useState(true);
  const [currentAQI, setCurrentAQI] = useState(140);
  const [monitorEnabled, setMonitorEnabled] = useState(true);

  // Mock alert for testing
  const mockAlert: Alert = {
    id: 'test-alert-1',
    userId: 'test-user',
    location: {
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      name: 'Delhi',
      country: 'India',
    },
    threshold: 150,
    condition: 'above',
    enabled: true,
    notificationChannels: ['push', 'email'],
    createdAt: new Date().toISOString(),
  };

  const handleTestBasicNotification = () => {
    showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from the AQI Dashboard',
      onClick: () => {
        console.log('Notification clicked!');
        alert('Notification clicked!');
      },
    });
  };

  const handleTestAQIAlert = (aqi: number, category: string) => {
    showAQIAlert('Delhi', aqi, 150, category, () => {
      console.log('AQI Alert clicked!');
      alert(`AQI Alert clicked! AQI: ${aqi}`);
    });
  };

  const handleTestThresholdNotification = (condition: 'above' | 'below') => {
    const aqi = condition === 'above' ? 155 : 145;
    showThresholdNotification('Delhi', aqi, 150, condition, () => {
      console.log('Threshold notification clicked!');
      alert(`Threshold notification clicked! AQI: ${aqi}`);
    });
  };

  const handleSimulateAQIChange = (newAQI: number) => {
    setCurrentAQI(newAQI);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Notification Testing
          </h1>
          <p className="text-white/70">
            Test browser notifications for AQI alerts
          </p>
        </div>

        {/* Permission Status */}
        <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Permission Status
          </h2>
          <div className="space-y-2 text-white/90">
            <p>
              <span className="font-medium">Supported:</span>{' '}
              <span className={isSupported ? 'text-green-400' : 'text-red-400'}>
                {isSupported ? 'Yes' : 'No'}
              </span>
            </p>
            <p>
              <span className="font-medium">Permission:</span>{' '}
              <span
                className={
                  permission === 'granted'
                    ? 'text-green-400'
                    : permission === 'denied'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }
              >
                {permission}
              </span>
            </p>
            <p>
              <span className="font-medium">Can Show Notifications:</span>{' '}
              <span className={isGranted ? 'text-green-400' : 'text-red-400'}>
                {isGranted ? 'Yes' : 'No'}
              </span>
            </p>
          </div>
        </div>

        {/* Permission Prompt */}
        {!isGranted && showPrompt && (
          <NotificationPermissionPrompt
            onPermissionGranted={() => {
              console.log('Permission granted!');
              setShowPrompt(false);
            }}
            onPermissionDenied={() => {
              console.log('Permission denied!');
            }}
            onDismiss={() => setShowPrompt(false)}
          />
        )}

        {/* Manual Permission Request */}
        {!isGranted && !showPrompt && (
          <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Request Permission
            </h2>
            <button
              onClick={async () => {
                const result = await requestPermission();
                console.log('Permission result:', result);
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Request Notification Permission
            </button>
          </div>
        )}

        {/* Test Notifications */}
        {isGranted && (
          <>
            <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Test Basic Notification
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleTestBasicNotification}
                  className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Show Basic Notification
                </button>
                <button
                  onClick={() => showTestNotification()}
                  className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                >
                  Show Test Notification (Utility)
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Test AQI Alerts
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTestAQIAlert(45, 'good')}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Good (45)
                </button>
                <button
                  onClick={() => handleTestAQIAlert(75, 'moderate')}
                  className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                >
                  Moderate (75)
                </button>
                <button
                  onClick={() => handleTestAQIAlert(125, 'unhealthy_sensitive')}
                  className="px-4 py-3 bg-orange-400 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
                >
                  Unhealthy Sensitive (125)
                </button>
                <button
                  onClick={() => handleTestAQIAlert(175, 'unhealthy')}
                  className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Unhealthy (175)
                </button>
                <button
                  onClick={() => handleTestAQIAlert(250, 'very_unhealthy')}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Very Unhealthy (250)
                </button>
                <button
                  onClick={() => handleTestAQIAlert(350, 'hazardous')}
                  className="px-4 py-3 bg-red-900 hover:bg-red-950 text-white rounded-lg font-medium transition-colors"
                >
                  Hazardous (350)
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Test Threshold Notifications
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTestThresholdNotification('above')}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Threshold Exceeded (Above 150)
                </button>
                <button
                  onClick={() => handleTestThresholdNotification('below')}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Threshold Dropped (Below 150)
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Test Alert Monitoring
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-white/90 mb-2">
                    Current AQI: <span className="font-bold text-white">{currentAQI}</span>
                  </p>
                  <p className="text-white/70 text-sm mb-3">
                    Alert threshold: 150 (above)
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="flex items-center gap-2 text-white/90">
                      <input
                        type="checkbox"
                        checked={monitorEnabled}
                        onChange={(e) => setMonitorEnabled(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Monitor Enabled
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSimulateAQIChange(140)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Set to 140
                  </button>
                  <button
                    onClick={() => handleSimulateAQIChange(155)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Set to 155
                  </button>
                  <button
                    onClick={() => handleSimulateAQIChange(175)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Set to 175
                  </button>
                </div>
                <p className="text-white/70 text-sm">
                  Change AQI from below 150 to above 150 to trigger a notification
                </p>
              </div>
            </div>
          </>
        )}

        {/* Alert Monitor (invisible component) */}
        <AlertNotificationMonitor
          alerts={[mockAlert]}
          currentAQI={currentAQI}
          location="Delhi"
          category={currentAQI > 200 ? 'very_unhealthy' : currentAQI > 150 ? 'unhealthy' : 'unhealthy_sensitive'}
          enabled={monitorEnabled}
        />

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Testing Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-white/90">
            <li>Grant notification permission when prompted</li>
            <li>Test basic notifications to verify they appear</li>
            <li>Test AQI alerts with different severity levels</li>
            <li>Test threshold notifications (above/below)</li>
            <li>Test alert monitoring by changing AQI values</li>
            <li>Verify notifications appear correctly</li>
            <li>Click notifications to test click handlers</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
