/**
 * Visual Test Page for Progress Bar Animation
 * 
 * This page demonstrates the animated progress bar in PollutantCard
 * with different AQI values and percentages.
 * 
 * Test Requirements:
 * - Progress bar should be 8px height
 * - Progress bar should have gradient fill matching pollutant severity
 * - Progress bar should animate from 0% to target percentage on mount
 * - Animation should use 1s duration with ease-out timing
 */

'use client';

import { useState } from 'react';
import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { PollutantType } from '@/lib/api/types';

export default function TestProgressBarPage() {
  const [key, setKey] = useState(0);

  // Test data with different AQI levels
  const testCases = [
    {
      pollutant: 'pm25' as PollutantType,
      value: 12.5,
      unit: 'μg/m³',
      aqi: 30,
      status: 'good',
      percentage: 20,
      description: 'Good (20%)',
    },
    {
      pollutant: 'pm10' as PollutantType,
      value: 45.0,
      unit: 'μg/m³',
      aqi: 75,
      status: 'moderate',
      percentage: 40,
      description: 'Moderate (40%)',
    },
    {
      pollutant: 'o3' as PollutantType,
      value: 85.5,
      unit: 'μg/m³',
      aqi: 120,
      status: 'unhealthy',
      percentage: 60,
      description: 'Unhealthy (60%)',
    },
    {
      pollutant: 'no2' as PollutantType,
      value: 125.0,
      unit: 'μg/m³',
      aqi: 175,
      status: 'very_unhealthy',
      percentage: 80,
      description: 'Very Unhealthy (80%)',
    },
    {
      pollutant: 'so2' as PollutantType,
      value: 200.0,
      unit: 'μg/m³',
      aqi: 350,
      status: 'hazardous',
      percentage: 95,
      description: 'Hazardous (95%)',
    },
    {
      pollutant: 'co' as PollutantType,
      value: 15.5,
      unit: 'mg/m³',
      aqi: 250,
      status: 'very_unhealthy',
      percentage: 100,
      description: 'Max (100%)',
    },
  ];

  const handleReplayAnimation = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Progress Bar Animation Test
          </h1>
          <p className="text-gray-300 mb-4">
            Testing animated progress bars with gradient fills
          </p>
          <button
            onClick={handleReplayAnimation}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white font-medium transition-all duration-300 hover:scale-105"
          >
            🔄 Replay Animations
          </button>
        </div>

        {/* Test Requirements */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Test Requirements
          </h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Progress bar height: 8px</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Gradient fill matching pollutant severity (color-coded)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Animate from 0% to target percentage on mount</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Animation duration: 1 second with ease-out timing</span>
            </li>
          </ul>
        </div>

        {/* Test Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testCases.map((testCase, index) => (
            <div key={`${key}-${index}`} className="space-y-2">
              <div className="text-center text-white font-medium mb-2">
                {testCase.description}
              </div>
              <PollutantCard {...testCase} />
            </div>
          ))}
        </div>

        {/* Animation Details */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Animation Details
          </h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Implementation
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Progress bar container: 8px height, rounded-full</li>
                <li>Progress bar fill: Animated width from 0% to target</li>
                <li>Gradient: linear-gradient(90deg, color, color-darker)</li>
                <li>Transition: all 1000ms ease-out</li>
                <li>Trigger: useEffect on mount with 50ms delay</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Color Mapping (AQI-based)
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Good (0-50): #4ADE80 (green)</li>
                <li>Moderate (51-100): #FCD34D (yellow)</li>
                <li>Unhealthy (101-150): #FB923C (orange)</li>
                <li>Very Unhealthy (151-200): #EF4444 (red)</li>
                <li>Hazardous (201+): #7C2D12 (brown)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Accessibility
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>role="progressbar" for semantic meaning</li>
                <li>aria-valuenow, aria-valuemin, aria-valuemax attributes</li>
                <li>aria-label with pollutant name and percentage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 glass-card p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Visual Verification Steps
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
            <li>Observe that all progress bars start at 0% width</li>
            <li>Watch the bars animate smoothly to their target percentages</li>
            <li>Verify animation takes approximately 1 second</li>
            <li>Check that gradient colors match the AQI severity levels</li>
            <li>Confirm progress bar height is 8px (thin bar)</li>
            <li>Click "Replay Animations" to see the animation again</li>
            <li>Hover over cards to see detailed tooltips</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
