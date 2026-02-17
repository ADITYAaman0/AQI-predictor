/**
 * Test Page: PollutantMetricsGridLive Component
 * 
 * This page tests the live pollutant metrics grid with real API data.
 * Tests the integration between the grid component and the API client.
 */

'use client';

import { useState } from 'react';
import { PollutantMetricsGridLive } from '@/components/dashboard/PollutantMetricsGridLive';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function TestContent() {
  const [location, setLocation] = useState('Delhi');
  const [dataLoadedCount, setDataLoadedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Live Pollutant Metrics Grid Test
          </h1>
          <p className="text-white/70">
            Testing real API integration with pollutant data
          </p>
        </div>

        {/* Location Selector */}
        <div className="mb-8 flex justify-center gap-2">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocation(loc);
                setLastError(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location === loc
                  ? 'bg-white text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Status Info */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Current Location</h3>
            <p className="text-white/90 text-2xl">{location}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Data Loads</h3>
            <p className="text-white/90 text-2xl">{dataLoadedCount}</p>
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-md rounded-lg p-4 border border-red-500/30">
            <h3 className="text-red-300 font-semibold mb-2">Last Error</h3>
            <p className="text-red-200 text-sm">{lastError}</p>
          </div>
        )}

        {/* Live Grid Component */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          <PollutantMetricsGridLive
            location={location}
            onDataLoaded={() => {
              setDataLoadedCount((prev) => prev + 1);
              setLastError(null);
            }}
            onError={(error) => {
              setLastError(error.message);
            }}
          />
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
          <h2 className="text-white font-semibold text-xl mb-4">
            Test Instructions
          </h2>
          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Location Switching:</strong> Click different location
                buttons to test data fetching for multiple cities
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Loading State:</strong> Observe the loading spinner
                while data is being fetched
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Error Handling:</strong> If API fails, error message
                should display with retry button
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Data Display:</strong> All 6 pollutants (PM2.5, PM10,
                O₃, NO₂, SO₂, CO) should display with real values
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Auto-refresh:</strong> Data automatically refreshes
                every 5 minutes
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">✓</span>
              <div>
                <strong>Last Updated:</strong> Timestamp shows when data was
                last fetched
              </div>
            </div>
          </div>
        </div>

        {/* API Info */}
        <div className="mt-6 bg-blue-500/20 backdrop-blur-md rounded-lg p-4 border border-blue-500/30">
          <h3 className="text-blue-300 font-semibold mb-2">API Endpoint</h3>
          <p className="text-blue-200 text-sm font-mono">
            GET /api/v1/forecast/current/{location}
          </p>
          <p className="text-blue-200/70 text-xs mt-2">
            Make sure the FastAPI backend is running on{' '}
            {process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TestPollutantGridLivePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <TestContent />
    </QueryClientProvider>
  );
}
