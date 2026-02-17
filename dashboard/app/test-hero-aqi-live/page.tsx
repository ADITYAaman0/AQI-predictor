/**
 * Live Test Page for HeroAQISection with Real API Data
 * 
 * This page demonstrates the HeroAQISection component connected to real API data
 * using TanStack Query for data fetching, caching, and auto-refresh.
 * 
 * Features:
 * - Real-time data from backend API
 * - Auto-refresh every 5 minutes
 * - Loading and error states
 * - Manual refresh button
 * - Location switching
 */

'use client';

import { useState } from 'react';
import HeroAQISection from '@/components/dashboard/HeroAQISection';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';
import { AQICategory } from '@/lib/api/types';

export default function TestHeroAQILivePage() {
  const [location, setLocation] = useState<string>('Delhi');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // Fetch current AQI data with auto-refresh
  const {
    data,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isRefetching,
  } = useCurrentAQI({
    location,
    enabled: true,
    refetchInterval: autoRefreshEnabled ? 5 * 60 * 1000 : undefined, // 5 minutes or disabled
    staleTime: 4 * 60 * 1000, // 4 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Available locations for testing
  const availableLocations = [
    'Delhi',
    'Mumbai',
    'Bangalore',
    'Kolkata',
    'Chennai',
    'Hyderabad',
    'Pune',
    'Ahmedabad',
  ];

  // Format last fetch time
  const formatLastFetch = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
  };

  // Transform API response to HeroAQISection props
  const getHeroProps = () => {
    if (!data) {
      return null;
    }

    return {
      aqi: data.aqi.value,
      category: data.aqi.category as AQICategory,
      categoryLabel: data.aqi.categoryLabel,
      dominantPollutant: data.aqi.dominantPollutant,
      color: data.aqi.color,
      healthMessage: data.aqi.healthMessage,
      location: data.location,
      lastUpdated: data.lastUpdated,
      isLoading: false,
      error: null,
    };
  };

  const heroProps = getHeroProps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          HeroAQISection - Live API Integration
        </h1>
        <p className="text-gray-300 mb-8">
          Testing the HeroAQISection component with real API data and auto-refresh
        </p>

        {/* Controls */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
          
          {/* Location Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Location
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocation(loc)}
                  disabled={isLoading || isRefetching}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    location === loc
                      ? 'bg-white text-gray-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-refresh Toggle */}
          <div className="mb-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-gray-300">
                Auto-refresh every 5 minutes
              </span>
            </label>
          </div>

          {/* Manual Refresh Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isRefetching ? 'Refreshing...' : 'Refresh Now'}
            </button>

            {dataUpdatedAt && (
              <span className="text-sm text-gray-400">
                Last fetched: {formatLastFetch(dataUpdatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="glass-card p-4 rounded-2xl mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className={`font-semibold ${
                isLoading ? 'text-yellow-400' : 
                error ? 'text-red-400' : 
                'text-green-400'
              }`}>
                {isLoading ? 'Loading' : error ? 'Error' : 'Connected'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Location</div>
              <div className="font-semibold text-white">{location}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Auto-refresh</div>
              <div className={`font-semibold ${autoRefreshEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                {autoRefreshEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Refreshing</div>
              <div className={`font-semibold ${isRefetching ? 'text-blue-400' : 'text-gray-400'}`}>
                {isRefetching ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>

        {/* Component Display */}
        <div className="mb-8">
          {heroProps ? (
            <HeroAQISection {...heroProps} />
          ) : (
            <HeroAQISection
              aqi={0}
              category="good"
              categoryLabel=""
              dominantPollutant=""
              color=""
              healthMessage=""
              location={{ country: '' }}
              lastUpdated=""
              isLoading={isLoading}
              error={error?.message || null}
            />
          )}
        </div>

        {/* API Response Display */}
        {data && (
          <div className="glass-card p-6 rounded-2xl mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">API Response</h2>
            <pre className="bg-black/30 p-4 rounded-lg overflow-auto text-sm text-gray-300 max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="glass-card p-6 rounded-2xl mb-8 border-2 border-red-500">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Error Details</h2>
            <div className="space-y-2 text-gray-300">
              <div>
                <span className="font-semibold">Message:</span> {error.message}
              </div>
              {error.statusCode && (
                <div>
                  <span className="font-semibold">Status Code:</span> {error.statusCode}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requirements Checklist */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">
            Task 5.5 Requirements Checklist
          </h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Use TanStack Query to fetch current AQI</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Handle loading states with skeleton loader</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Handle error states with user-friendly messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Implement auto-refresh (5 minutes)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Fetch real data from backend API</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Manual refresh functionality</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Location switching support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Data caching with TanStack Query</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <a
            href="/test-hero-aqi"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            ← View Mock Data Test
          </a>
          <a
            href="/"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
