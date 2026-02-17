'use client';

import { PredictionGraphConnected } from '@/components/forecast';
import { useState } from 'react';

/**
 * Test page for PredictionGraphConnected component
 * 
 * This page demonstrates the PredictionGraphConnected component with real API data.
 * Navigate to /test-forecast-api to view this page.
 */
export default function TestForecastAPIPage() {
  const [location, setLocation] = useState('Delhi');
  const [showConfidence, setShowConfidence] = useState(false);

  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Forecast API Integration Test
          </h1>
          <p className="text-white/70">
            Testing PredictionGraphConnected with real backend API data
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <span className="text-green-400 text-sm">✓ Task 9.6: Connect to forecast API</span>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Selector */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc} className="bg-gray-900">
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidence Interval Toggle */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm">Show Confidence Intervals</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfidence(!showConfidence)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showConfidence ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showConfidence ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-white/80 text-sm">
                  {showConfidence ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real API Data Test */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                24-Hour Forecast for {location}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                Real-time data from backend API: <code className="text-white/90 bg-black/30 px-2 py-1 rounded">/api/v1/forecast/24h/{location}</code>
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <PredictionGraphConnected
              location={location}
              showConfidenceInterval={showConfidence}
              height={280}
              onHover={(forecast) => {
                if (forecast) {
                  console.log('Hovering over forecast:', forecast);
                }
              }}
            />
          </div>
        </div>

        {/* Features Checklist */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Task 9.6 Requirements
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <p className="text-white font-medium">Fetch 24-hour forecast data</p>
                <p className="text-white/60 text-sm">
                  Uses <code className="text-white/80 bg-black/30 px-1 rounded">getAQIClient().get24HourForecast(location)</code> to fetch real data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <p className="text-white font-medium">Transform data for chart</p>
                <p className="text-white/60 text-sm">
                  API client transforms backend response to <code className="text-white/80 bg-black/30 px-1 rounded">HourlyForecastData[]</code> format
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <p className="text-white font-medium">Handle loading and error states</p>
                <p className="text-white/60 text-sm">
                  Shows loading spinner during fetch, error message with retry button on failure
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <p className="text-white font-medium">Real forecast data displays</p>
                <p className="text-white/60 text-sm">
                  Chart renders with actual AQI predictions from the backend
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Details */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Implementation Details
          </h2>
          <div className="space-y-4 text-white/80 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">Component: PredictionGraphConnected</p>
              <p className="text-white/60">
                Location: <code className="text-white/80 bg-black/30 px-2 py-1 rounded">components/forecast/PredictionGraphConnected.tsx</code>
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Features:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-white/70">
                <li>Fetches 24-hour forecast data from backend API</li>
                <li>Uses TanStack Query for data fetching and caching</li>
                <li>1-hour cache duration (staleTime)</li>
                <li>Automatic refetch on window focus</li>
                <li>Retry logic (2 attempts) on failure</li>
                <li>Loading state with animated spinner</li>
                <li>Error state with user-friendly message and retry button</li>
                <li>Passes transformed data to PredictionGraph component</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">API Integration:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-white/70">
                <li>Endpoint: <code className="text-white/80 bg-black/30 px-1 rounded">/api/v1/forecast/24h/{'{location}'}</code></li>
                <li>Method: <code className="text-white/80 bg-black/30 px-1 rounded">getAQIClient().get24HourForecast(location)</code></li>
                <li>Response type: <code className="text-white/80 bg-black/30 px-1 rounded">ForecastResponse</code></li>
                <li>Data transformation: Backend response → Dashboard format</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Props:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-white/70">
                <li><code className="text-white/80 bg-black/30 px-1 rounded">location: string</code> - Location name to fetch forecast for (required)</li>
                <li><code className="text-white/80 bg-black/30 px-1 rounded">showConfidenceInterval?: boolean</code> - Show confidence intervals (optional)</li>
                <li><code className="text-white/80 bg-black/30 px-1 rounded">height?: number</code> - Chart height in pixels (optional, default: 280)</li>
                <li><code className="text-white/80 bg-black/30 px-1 rounded">onHover?: (forecast | null) =&gt; void</code> - Hover callback (optional)</li>
                <li><code className="text-white/80 bg-black/30 px-1 rounded">loadingComponent?: React.ReactNode</code> - Custom loading component (optional)</li>
                <li><code className="text-white/80 bg-black/30 px-1 rounded">errorComponent?: (error) =&gt; React.ReactNode</code> - Custom error component (optional)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Testing Instructions
          </h2>
          <div className="space-y-3 text-white/80 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">1. Test with different locations</p>
              <p className="text-white/60">
                Use the location selector above to switch between cities. The chart should update with new forecast data.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">2. Test confidence intervals</p>
              <p className="text-white/60">
                Toggle the confidence interval switch to show/hide the shaded confidence bounds.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">3. Test loading state</p>
              <p className="text-white/60">
                Switch locations quickly to see the loading spinner. The component should show a loading state while fetching data.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">4. Test error handling</p>
              <p className="text-white/60">
                If the backend is unavailable or returns an error, the component should display an error message with a retry button.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">5. Test hover interactions</p>
              <p className="text-white/60">
                Hover over the chart to see tooltips with AQI values, timestamps, and confidence intervals. Check the browser console for hover events.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">6. Verify data accuracy</p>
              <p className="text-white/60">
                Compare the displayed forecast data with the backend API response to ensure correct transformation and display.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
