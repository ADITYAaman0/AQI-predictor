'use client';

import React, { useState } from 'react';
import { AlertConfigurationCard } from '@/components/alerts/AlertConfigurationCard';
import type { LocationInfo, CreateAlertRequest } from '@/lib/api/types';

export default function TestAlertConfigurationPage() {
  const [createdAlert, setCreatedAlert] = useState<CreateAlertRequest | null>(null);
  const [showCard, setShowCard] = useState(true);

  const mockLocation: LocationInfo = {
    id: 'delhi-1',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const mockFavorites: LocationInfo[] = [
    mockLocation,
    {
      id: 'mumbai-1',
      name: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
    },
    {
      id: 'bangalore-1',
      name: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  ];

  const handleCreateAlert = (alert: CreateAlertRequest) => {
    console.log('Alert created:', alert);
    setCreatedAlert(alert);
    setShowCard(false);
  };

  const handleCancel = () => {
    console.log('Alert creation cancelled');
    setShowCard(false);
  };

  const handleReset = () => {
    setCreatedAlert(null);
    setShowCard(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Alert Configuration Card Test
          </h1>
          <p className="text-white/80">
            Test the AlertConfigurationCard component with all features
          </p>
        </div>

        {/* Test Controls */}
        <div className="mb-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-3">Test Controls</h2>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
            >
              Reset Form
            </button>
            <button
              onClick={() => setShowCard(!showCard)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
            >
              {showCard ? 'Hide' : 'Show'} Card
            </button>
          </div>
        </div>

        {/* Alert Configuration Card */}
        {showCard && (
          <div className="mb-6">
            <AlertConfigurationCard
              initialLocation={mockLocation}
              favoriteLocations={mockFavorites}
              onCreateAlert={handleCreateAlert}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Created Alert Display */}
        {createdAlert && (
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">
              Created Alert Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-medium">Location:</span>
                <span className="text-white">{createdAlert.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-medium">Threshold:</span>
                <span className="text-white">{createdAlert.threshold} AQI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-medium">Condition:</span>
                <span className="text-white capitalize">{createdAlert.condition}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/60 font-medium">Channels:</span>
                <div className="flex flex-wrap gap-2">
                  {createdAlert.notificationChannels.map((channel) => (
                    <span
                      key={channel}
                      className="px-3 py-1 bg-white/20 rounded-full text-white text-sm"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-200 text-sm">
                ✓ Alert created successfully! Check the console for full details.
              </p>
            </div>
          </div>
        )}

        {/* Feature Checklist */}
        <div className="mt-6 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            Feature Checklist
          </h2>
          <div className="space-y-2 text-white/80">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Location selector with favorites</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>AQI threshold slider (0-500)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Dynamic AQI category display</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Threshold markers on slider</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Above/Below condition toggle</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Notification channel checkboxes (Email, SMS, Push)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Prevent unchecking last channel</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Create Alert button</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Cancel button (optional)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Glassmorphic styling</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Accessibility (ARIA labels, keyboard navigation)</span>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-6 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            Testing Instructions
          </h2>
          <ol className="space-y-2 text-white/80 list-decimal list-inside">
            <li>Try changing the location using the location selector</li>
            <li>Move the threshold slider and observe the category changes</li>
            <li>Toggle between "Above" and "Below" conditions</li>
            <li>Select/deselect notification channels (note: can't uncheck the last one)</li>
            <li>Click "Create Alert" to see the submitted data</li>
            <li>Click "Cancel" to test the cancel functionality</li>
            <li>Use keyboard navigation (Tab, Enter, Space) to test accessibility</li>
            <li>Check the browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
