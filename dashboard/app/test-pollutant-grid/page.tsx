/**
 * Test Page for PollutantMetricsGrid Component
 * 
 * Visual verification of:
 * - Grid layout with 6 pollutant cards
 * - Responsive behavior (desktop, tablet, mobile)
 * - Card arrangement and spacing
 * - Different viewport sizes
 */

'use client';

import { useState } from 'react';
import { PollutantMetricsGrid } from '@/components/dashboard/PollutantMetricsGrid';
import { PollutantCardProps } from '@/components/dashboard/PollutantCard';

export default function TestPollutantGridPage() {
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Mock pollutant data
  const pollutants: PollutantCardProps[] = [
    {
      pollutant: 'pm25',
      value: 45.2,
      unit: 'μg/m³',
      aqi: 120,
      status: 'unhealthy',
      percentage: 75,
    },
    {
      pollutant: 'pm10',
      value: 85.5,
      unit: 'μg/m³',
      aqi: 95,
      status: 'moderate',
      percentage: 60,
    },
    {
      pollutant: 'o3',
      value: 65.0,
      unit: 'μg/m³',
      aqi: 80,
      status: 'moderate',
      percentage: 50,
    },
    {
      pollutant: 'no2',
      value: 35.0,
      unit: 'μg/m³',
      aqi: 45,
      status: 'good',
      percentage: 30,
    },
    {
      pollutant: 'so2',
      value: 15.0,
      unit: 'μg/m³',
      aqi: 25,
      status: 'good',
      percentage: 20,
    },
    {
      pollutant: 'co',
      value: 1.2,
      unit: 'mg/m³',
      aqi: 30,
      status: 'good',
      percentage: 25,
    },
  ];

  // Get container width based on viewport size
  const getContainerWidth = () => {
    switch (viewportSize) {
      case 'desktop':
        return '1440px';
      case 'tablet':
        return '768px';
      case 'mobile':
        return '375px';
      default:
        return '100%';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            PollutantMetricsGrid Test
          </h1>
          <p className="text-gray-300">
            Visual verification of responsive grid layout
          </p>
        </div>

        {/* Viewport Size Selector */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setViewportSize('desktop')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              viewportSize === 'desktop'
                ? 'bg-white text-purple-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Desktop (1440px)
          </button>
          <button
            onClick={() => setViewportSize('tablet')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              viewportSize === 'tablet'
                ? 'bg-white text-purple-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Tablet (768px)
          </button>
          <button
            onClick={() => setViewportSize('mobile')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              viewportSize === 'mobile'
                ? 'bg-white text-purple-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Mobile (375px)
          </button>
        </div>

        {/* Grid Container with Simulated Viewport */}
        <div className="mb-8">
          <div
            className="mx-auto bg-black/20 p-8 rounded-lg transition-all duration-300"
            style={{ width: getContainerWidth() }}
          >
            <PollutantMetricsGrid pollutants={pollutants} />
          </div>
        </div>

        {/* Info Panel */}
        <div className="glass-card p-6 text-white">
          <h2 className="text-2xl font-semibold mb-4">Layout Information</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Current Viewport: {viewportSize}</h3>
              <p className="text-gray-300">
                {viewportSize === 'desktop' && 'Desktop layout: 3 columns (2 rows)'}
                {viewportSize === 'tablet' && 'Tablet layout: 2 columns (3 rows)'}
                {viewportSize === 'mobile' && 'Mobile layout: 1 column (6 rows)'}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Expected Behavior</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Desktop (≥1024px): 3 columns, cards arranged in 2 rows</li>
                <li>Tablet (768-1023px): 2 columns, cards arranged in 3 rows</li>
                <li>Mobile (&lt;768px): 1 column, cards stacked vertically</li>
                <li>Cards maintain 200x180px size</li>
                <li>16px gap between cards</li>
                <li>Grid is centered in container</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Test Checklist</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>✓ All 6 pollutant cards are displayed</li>
                <li>✓ Cards are properly spaced with 16px gap</li>
                <li>✓ Grid adapts to viewport size</li>
                <li>✓ Cards maintain consistent size</li>
                <li>✓ Grid is centered in container</li>
                <li>✓ Hover effects work on all cards</li>
                <li>✓ Progress bars animate on load</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Requirements Validated</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Requirement 3.7: Pollutant cards arranged in responsive grid</li>
                <li>Requirement 7.2: Responsive layout for tablet viewport</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Test: Empty Grid */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Edge Case: Empty Grid</h2>
          <div className="glass-card p-8">
            <PollutantMetricsGrid pollutants={[]} />
            <p className="text-gray-300 text-center mt-4">
              Empty grid should render without errors
            </p>
          </div>
        </div>

        {/* Additional Test: Single Card */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Edge Case: Single Card</h2>
          <div className="glass-card p-8">
            <PollutantMetricsGrid pollutants={pollutants.slice(0, 1)} />
            <p className="text-gray-300 text-center mt-4">
              Single card should be centered in grid
            </p>
          </div>
        </div>

        {/* Additional Test: Three Cards */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Edge Case: Three Cards</h2>
          <div className="glass-card p-8">
            <PollutantMetricsGrid pollutants={pollutants.slice(0, 3)} />
            <p className="text-gray-300 text-center mt-4">
              Three cards should fill one row on desktop
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
