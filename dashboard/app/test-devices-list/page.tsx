/**
 * Test Page for DevicesList Component
 * 
 * Visual verification page for the DevicesList component.
 * Tests different states and interactions.
 */

'use client';

import React, { useState } from 'react';
import { DevicesList } from '@/components/devices/DevicesList';

export default function TestDevicesListPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const handleAddDevice = () => {
    setShowAddModal(true);
  };

  const handleViewDetails = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            DevicesList Component Test
          </h1>
          <p className="text-white/80">
            Visual verification of the DevicesList component with real API data
          </p>
        </div>

        {/* Test Info */}
        <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Test Checklist</h2>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>✓ Devices fetch from API and display in grid</li>
            <li>✓ Grid is responsive (1 column mobile, 2 tablet, 3 desktop)</li>
            <li>✓ "Add Device" button appears with dashed border</li>
            <li>✓ Loading state shows spinner</li>
            <li>✓ Error state shows error message with retry</li>
            <li>✓ Empty state shows when no devices</li>
            <li>✓ Device cards show status, location, battery</li>
            <li>✓ Remove button shows confirmation dialog</li>
            <li>✓ View details button triggers callback</li>
            <li>✓ Auto-refresh every 5 minutes</li>
          </ul>
        </div>

        {/* DevicesList Component */}
        <div className="bg-white/5 backdrop-blur-glass border border-white/18 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Devices</h2>
          
          <DevicesList
            onAddDevice={handleAddDevice}
            onViewDetails={handleViewDetails}
          />
        </div>

        {/* Status Display */}
        {(showAddModal || selectedDeviceId) && (
          <div className="mt-8 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Interaction Status
            </h3>
            {showAddModal && (
              <div className="mb-4">
                <p className="text-white/80">
                  ✓ Add Device button clicked
                </p>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm"
                >
                  Close
                </button>
              </div>
            )}
            {selectedDeviceId && (
              <div>
                <p className="text-white/80">
                  ✓ View Details clicked for device: {selectedDeviceId}
                </p>
                <button
                  onClick={() => setSelectedDeviceId(null)}
                  className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* API Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Information</h3>
          <div className="space-y-2 text-white/80 text-sm">
            <p>
              <strong>Endpoint:</strong> GET /api/v1/devices
            </p>
            <p>
              <strong>Refresh Interval:</strong> 5 minutes
            </p>
            <p>
              <strong>Cache Duration:</strong> 5 minutes (stale time)
            </p>
            <p>
              <strong>Retry Attempts:</strong> 2
            </p>
          </div>
        </div>

        {/* Grid Layout Test */}
        <div className="mt-8 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Responsive Grid Test
          </h3>
          <div className="space-y-2 text-white/80 text-sm">
            <p>
              <strong>Mobile (&lt;768px):</strong> 1 column
            </p>
            <p>
              <strong>Tablet (768-1023px):</strong> 2 columns
            </p>
            <p>
              <strong>Desktop (≥1024px):</strong> 3 columns
            </p>
            <p className="mt-4 text-white/60">
              Resize your browser window to test responsive behavior
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
