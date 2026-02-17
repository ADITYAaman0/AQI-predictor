/**
 * Test Page for Device Management
 * 
 * This page demonstrates the complete device management functionality including:
 * - DevicesList with integrated modals
 * - Add Device Modal
 * - View Device Details Modal
 * - Remove device confirmation
 * 
 * Requirements: 11.6, 11.7
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DevicesList } from '@/components/devices/DevicesList';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
  },
});

export default function TestDeviceManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Device Management Test
            </h1>
            <p className="text-white/80 text-lg">
              Test the complete device management functionality with modals
            </p>
          </div>

          {/* Instructions */}
          <div className="mb-8 p-6 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Test Instructions
            </h2>
            <ul className="space-y-2 text-white/90">
              <li className="flex items-start gap-2">
                <span className="text-white/60">1.</span>
                <span>Click the "Add Device" button to open the add device modal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">2.</span>
                <span>Fill in the form and submit to add a new device</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">3.</span>
                <span>Click "View Details" on any device card to see detailed information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">4.</span>
                <span>Click "Remove" on any device card to test the confirmation dialog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">5.</span>
                <span>Test keyboard navigation (Esc to close modals, Tab to navigate)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">6.</span>
                <span>Test form validation by submitting empty or invalid data</span>
              </li>
            </ul>
          </div>

          {/* Features Tested */}
          <div className="mb-8 p-6 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Features Tested
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Add Device Modal</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  <li>• Form validation</li>
                  <li>• Loading states</li>
                  <li>• Error handling</li>
                  <li>• Keyboard navigation (Esc)</li>
                  <li>• Click outside to close</li>
                </ul>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Device Details Modal</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  <li>• Device information display</li>
                  <li>• Status indicators</li>
                  <li>• Battery level visualization</li>
                  <li>• Last reading information</li>
                  <li>• Keyboard navigation (Esc)</li>
                </ul>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Remove Device</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  <li>• Confirmation dialog</li>
                  <li>• Cancel option</li>
                  <li>• Error handling</li>
                  <li>• List refresh after removal</li>
                </ul>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Glassmorphic Design</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  <li>• Frosted glass effects</li>
                  <li>• Backdrop blur</li>
                  <li>• Smooth animations</li>
                  <li>• Hover effects</li>
                </ul>
              </div>
            </div>
          </div>

          {/* DevicesList Component */}
          <DevicesList />
        </div>
      </div>
    </QueryClientProvider>
  );
}
