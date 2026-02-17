'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsList } from '@/components/alerts/AlertsList';
import { AlertsListConnected } from '@/components/alerts/AlertsListConnected';
import type { AlertSubscriptionResponse } from '@/lib/api/types';

const queryClient = new QueryClient();

// Mock data for testing
const mockAlerts: AlertSubscriptionResponse[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    location: {
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
      country: 'India',
    },
    location_name: 'Delhi',
    threshold: 150,
    channels: ['email', 'push'],
    is_active: true,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    location: {
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777,
      },
      country: 'India',
    },
    location_name: 'Mumbai',
    threshold: 100,
    channels: ['sms'],
    is_active: false,
    created_at: '2024-01-10T08:15:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    location: {
      coordinates: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      country: 'India',
    },
    location_name: 'Bangalore',
    threshold: 200,
    channels: ['email', 'sms', 'push'],
    is_active: true,
    created_at: '2024-01-20T14:45:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    location: {
      coordinates: {
        latitude: 22.5726,
        longitude: 88.3639,
      },
      country: 'India',
    },
    location_name: 'Kolkata',
    threshold: 50,
    channels: ['email'],
    is_active: true,
    created_at: '2024-01-05T12:00:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174004',
    location: {
      coordinates: {
        latitude: 13.0827,
        longitude: 80.2707,
      },
      country: 'India',
    },
    location_name: 'Chennai',
    threshold: 300,
    channels: ['push'],
    is_active: false,
    created_at: '2024-01-25T16:30:00Z',
  },
];

function TestAlertsListPage() {
  const [alerts, setAlerts] = useState<AlertSubscriptionResponse[]>(mockAlerts);
  const [isLoading, setIsLoading] = useState(false);
  const [useConnected, setUseConnected] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertSubscriptionResponse | null>(null);

  const handleEdit = (alert: AlertSubscriptionResponse) => {
    setEditingAlert(alert);
    console.log('Edit alert:', alert);
  };

  const handleDelete = (alertId: string) => {
    console.log('Delete alert:', alertId);
    // Simulate deletion
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleToggleActive = async (alertId: string, isActive: boolean) => {
    console.log('Toggle alert:', alertId, 'to', isActive);
    // Simulate toggle with delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, is_active: isActive } : a))
    );
  };

  const handleClearAlerts = () => {
    setAlerts([]);
  };

  const handleResetAlerts = () => {
    setAlerts(mockAlerts);
  };

  const handleToggleLoading = () => {
    setIsLoading(!isLoading);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              AlertsList Component Test
            </h1>
            <p className="text-white/80">
              Visual verification for Task 15.5 - Create AlertsList component
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClearAlerts}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Clear Alerts (Empty State)
              </button>
              <button
                onClick={handleResetAlerts}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Reset Alerts
              </button>
              <button
                onClick={handleToggleLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {isLoading ? 'Hide Loading' : 'Show Loading'}
              </button>
              <button
                onClick={() => setUseConnected(!useConnected)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                {useConnected ? 'Use Mock Component' : 'Use Connected Component'}
              </button>
            </div>
          </div>

          {/* Component Display */}
          <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              {useConnected ? 'Connected Component (API)' : 'Mock Component'}
            </h2>
            
            {useConnected ? (
              <AlertsListConnected onEdit={handleEdit} />
            ) : (
              <AlertsList
                alerts={alerts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Editing Alert Display */}
          {editingAlert && (
            <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Editing Alert</h2>
                <button
                  onClick={() => setEditingAlert(null)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <pre className="text-sm text-white/80 bg-black/20 p-4 rounded-lg overflow-auto">
                {JSON.stringify(editingAlert, null, 2)}
              </pre>
            </div>
          )}

          {/* Test Checklist */}
          <div className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Checklist</h2>
            <div className="space-y-2 text-white/80">
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>All alerts display correctly with location, threshold, and channels</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Active/inactive status indicators show correct colors (green/gray)</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>AQI threshold colors match category (good=green, moderate=yellow, etc.)</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Edit button opens alert details</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Delete button shows confirmation dialog</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Delete confirmation works correctly</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Delete cancel works correctly</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Toggle active/inactive button works</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Loading state shows skeleton loaders</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Empty state displays when no alerts</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Glassmorphic styling applied correctly</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Hover effects work on alert cards</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Responsive design works on mobile</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Connected component fetches from API</label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label>Success/error messages display correctly</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default TestAlertsListPage;
