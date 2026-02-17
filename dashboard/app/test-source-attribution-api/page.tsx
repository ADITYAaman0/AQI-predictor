/**
 * Test Page for SourceAttributionCardConnected Component
 * 
 * Visual verification page for the connected SourceAttributionCard component
 * that fetches real data from the API.
 * 
 * Navigate to /test-source-attribution-api to view this page.
 */

'use client';

import React, { useState } from 'react';
import { SourceAttributionCardConnected } from '@/components/insights';

export default function TestSourceAttributionAPIPage() {
  const [location, setLocation] = useState('Delhi');
  const [customLocation, setCustomLocation] = useState('');

  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'];

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    setCustomLocation('');
  };

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLocation.trim()) {
      setLocation(customLocation.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            SourceAttributionCard API Integration Test
          </h1>
          <p className="text-white/70">
            Testing real API integration with source attribution data
          </p>
        </div>

        {/* Location Selector */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Select Location
          </h2>
          
          {/* Preset Locations */}
          <div className="flex flex-wrap gap-3 mb-4">
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocationChange(loc)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location === loc
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Custom Location Input */}
          <form onSubmit={handleCustomLocationSubmit} className="flex gap-3">
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Enter custom location..."
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Load
            </button>
          </form>

          {/* Current Location Display */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm">
              Currently showing data for:{' '}
              <span className="text-white font-semibold">{location}</span>
            </p>
          </div>
        </div>

        {/* Connected Component */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Real API Data
          </h3>
          <SourceAttributionCardConnected location={location} />
        </div>

        {/* API Information */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            API Integration Details
          </h2>
          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <div>
                <p className="font-medium">Endpoint:</p>
                <code className="text-xs text-white/60">
                  GET /api/v1/forecast/current/{'{location}'}
                </code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <div>
                <p className="font-medium">Data Extraction:</p>
                <p className="text-white/60">
                  Source attribution extracted from response.source_attribution
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <div>
                <p className="font-medium">Data Mapping:</p>
                <ul className="text-white/60 list-disc list-inside ml-2">
                  <li>vehicular_percent → vehicular</li>
                  <li>industrial_percent → industrial</li>
                  <li>biomass_percent → biomass</li>
                  <li>background_percent → background</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <div>
                <p className="font-medium">Auto-refresh:</p>
                <p className="text-white/60">
                  Data refreshes automatically every 5 minutes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Requirements Checklist (15.9)
          </h2>
          <div className="space-y-2 text-white/80">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Source attribution extracted from API response</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Data mapped to chart format (SourceAttribution interface)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Real attribution data displays correctly</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Loading states handled</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Error states handled</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Multiple locations supported</span>
            </div>
          </div>
        </div>

        {/* Visual Verification Instructions */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">
            Visual Verification Instructions
          </h2>
          <div className="space-y-3 text-white/80 text-sm">
            <p>1. Verify that real data loads from the API for the selected location</p>
            <p>2. Check that source attribution percentages are displayed correctly</p>
            <p>3. Switch between different locations to verify data updates</p>
            <p>4. Enter a custom location to test location search</p>
            <p>5. Verify loading state appears while fetching data</p>
            <p>6. Test error handling by entering an invalid location</p>
            <p>7. Check that the chart updates when location changes</p>
            <p>8. Verify that percentages add up to 100% (or close to it)</p>
            <p>9. Compare with mock data test page to ensure consistency</p>
            <p>10. Wait 5 minutes to verify auto-refresh functionality</p>
          </div>
        </div>
      </div>
    </div>
  );
}
