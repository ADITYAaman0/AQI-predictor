/**
 * Test page for HealthRecommendationsCard component
 * 
 * Visual verification of:
 * - All AQI categories
 * - Color coding
 * - Recommendations display
 * - Loading state
 * - Custom recommendations
 */

'use client';

import { useState } from 'react';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { AQICategory } from '@/lib/api/types';

export default function TestHealthRecommendationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const testCases: Array<{ aqi: number; category: AQICategory; label: string }> = [
    { aqi: 25, category: 'good', label: 'Good (0-50)' },
    { aqi: 75, category: 'moderate', label: 'Moderate (51-100)' },
    { aqi: 125, category: 'unhealthy_sensitive', label: 'Unhealthy for Sensitive Groups (101-150)' },
    { aqi: 175, category: 'unhealthy', label: 'Unhealthy (151-200)' },
    { aqi: 250, category: 'very_unhealthy', label: 'Very Unhealthy (201-300)' },
    { aqi: 350, category: 'hazardous', label: 'Hazardous (301+)' },
  ];

  const customRecommendations = [
    'This is a custom recommendation',
    'Another custom health tip',
    'Stay safe and monitor air quality',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            HealthRecommendationsCard Component Test
          </h1>
          <p className="text-white/80 mb-4">
            Visual verification of health recommendations for all AQI categories
          </p>
          
          {/* Controls */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setIsLoading(!isLoading)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Hide' : 'Show'} Loading State
            </button>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {showCustom ? 'Hide' : 'Show'} Custom Recommendations
            </button>
          </div>
        </div>

        {/* Loading State Test */}
        {isLoading && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Loading State</h2>
            <div className="max-w-md">
              <HealthRecommendationsCard
                aqi={100}
                category="moderate"
                isLoading={true}
              />
            </div>
          </div>
        )}

        {/* Custom Recommendations Test */}
        {showCustom && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Custom Recommendations</h2>
            <div className="max-w-md">
              <HealthRecommendationsCard
                aqi={100}
                category="moderate"
                recommendations={customRecommendations}
                learnMoreUrl="https://example.com/custom"
              />
            </div>
          </div>
        )}

        {/* All AQI Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">All AQI Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testCases.map((testCase) => (
              <div key={testCase.category}>
                <h3 className="text-lg font-medium text-white mb-3">
                  {testCase.label}
                </h3>
                <HealthRecommendationsCard
                  aqi={testCase.aqi}
                  category={testCase.category}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Side by Side Comparison */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Side by Side Comparison (Good vs Hazardous)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Good Air Quality</h3>
              <HealthRecommendationsCard
                aqi={25}
                category="good"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Hazardous Air Quality</h3>
              <HealthRecommendationsCard
                aqi={400}
                category="hazardous"
              />
            </div>
          </div>
        </div>

        {/* Responsive Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Responsive Test (Different Widths)
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-2">Full Width</h3>
              <HealthRecommendationsCard
                aqi={125}
                category="unhealthy_sensitive"
              />
            </div>
            <div className="max-w-2xl">
              <h3 className="text-sm font-medium text-white/70 mb-2">Max Width 2xl</h3>
              <HealthRecommendationsCard
                aqi={125}
                category="unhealthy_sensitive"
              />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-medium text-white/70 mb-2">Max Width md</h3>
              <HealthRecommendationsCard
                aqi={125}
                category="unhealthy_sensitive"
              />
            </div>
          </div>
        </div>

        {/* Test Summary */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Test Checklist</h2>
          <ul className="space-y-2 text-white/90">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Medical icon displays correctly</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Recommendations match AQI level (Requirements 6.1-6.6)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Color coding by urgency level (Requirement 6.8)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Glassmorphic styling applied</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Learn more link present and functional</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Loading state displays correctly</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Custom recommendations supported</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Responsive design works on all screen sizes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
