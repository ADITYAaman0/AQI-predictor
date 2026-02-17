'use client';

import React, { useState } from 'react';
import { AlertConfigurationCardConnected } from '@/components/alerts/AlertConfigurationCardConnected';
import type { Alert } from '@/lib/api/types';
import type { LocationInfo } from '@/components/common/LocationSelector';

/**
 * Test page for alert creation functionality
 * 
 * This page demonstrates:
 * - Alert creation with API integration
 * - Input validation
 * - Success/error message display
 * - Loading states
 */
export default function TestAlertCreationPage() {
  const [createdAlerts, setCreatedAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(true);

  // Sample favorite locations for testing
  const favoriteLocations: LocationInfo[] = [
    {
      id: 'delhi',
      name: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    {
      id: 'mumbai',
      name: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
    },
    {
      id: 'bangalore',
      name: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  ];

  const handleSuccess = (alert: Alert) => {
    console.log('Alert created successfully:', alert);
    setCreatedAlerts((prev) => [alert, ...prev]);
    
    // Optionally hide the form after successful creation
    // setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Alert Creation Test
          </h1>
          <p className="text-white/60">
            Test the alert creation functionality with API integration
          </p>
        </div>

        {/* Alert Configuration Form */}
        {showForm ? (
          <div className="mb-8">
            <AlertConfigurationCardConnected
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              initialLocation={favoriteLocations[0]}
              favoriteLocations={favoriteLocations}
            />
          </div>
        ) : (
          <div className="mb-8">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-all duration-200 shadow-lg"
            >
              Create Another Alert
            </button>
          </div>
        )}

        {/* Created Alerts List */}
        {createdAlerts.length > 0 && (
          <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 shadow-glass">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Created Alerts ({createdAlerts.length})
            </h2>
            <div className="space-y-4">
              {createdAlerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium text-white">
                          {alert.location.name || 'Unknown Location'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.enabled
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {alert.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-white/60">
                        <p>
                          <span className="font-medium">Threshold:</span> AQI {alert.condition} {alert.threshold}
                        </p>
                        <p>
                          <span className="font-medium">Channels:</span>{' '}
                          {alert.notificationChannels.join(', ')}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                        {alert.lastTriggered && (
                          <p>
                            <span className="font-medium">Last Triggered:</span>{' '}
                            {new Date(alert.lastTriggered).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-6 h-6 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 shadow-glass">
          <h2 className="text-xl font-semibold text-white mb-4">
            Testing Instructions
          </h2>
          <div className="space-y-3 text-sm text-white/80">
            <div>
              <h3 className="font-medium text-white mb-1">✅ Test Cases to Verify:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create alert with valid data - should succeed</li>
                <li>Create alert with empty location - should show validation error</li>
                <li>Create alert with threshold &lt; 0 or &gt; 500 - should show validation error</li>
                <li>Create alert with no notification channels - should show validation error</li>
                <li>Create duplicate alert for same location - should show conflict error</li>
                <li>Create alert while offline - should show network error</li>
                <li>Verify success message appears and disappears after 3 seconds</li>
                <li>Verify error messages can be dismissed</li>
                <li>Verify loading state during submission</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">📋 Requirements Validated:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Requirement 18.3: Alert creation with threshold configuration</li>
                <li>Requirement 18.7: Integration with /api/v1/alerts endpoint</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">🔍 What to Check:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Input validation works correctly</li>
                <li>Success messages display properly</li>
                <li>Error messages are user-friendly</li>
                <li>Loading states prevent duplicate submissions</li>
                <li>Created alerts appear in the list</li>
                <li>API integration works with backend</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-4 text-center text-sm text-white/60">
          <p>
            Backend API: <code className="bg-white/10 px-2 py-1 rounded">http://localhost:8000</code>
          </p>
          <p className="mt-1">
            Ensure the FastAPI backend is running before testing
          </p>
        </div>
      </div>
    </div>
  );
}
