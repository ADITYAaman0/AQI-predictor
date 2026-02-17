/**
 * Test page for HeroAQISection component
 * 
 * This page demonstrates the HeroAQISection component with various AQI levels
 * and states (loading, error, different categories).
 */

'use client';

import { useState } from 'react';
import HeroAQISection from '@/components/dashboard/HeroAQISection';
import { AQICategory } from '@/lib/api/types';

export default function TestHeroAQIPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('good');

  // Mock data for different scenarios
  const scenarios = {
    good: {
      aqi: 45,
      category: 'good' as AQICategory,
      categoryLabel: 'Good',
      dominantPollutant: 'pm25',
      color: '#4ADE80',
      healthMessage: 'Great day for outdoor activities',
      location: {
        name: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    moderate: {
      aqi: 85,
      category: 'moderate' as AQICategory,
      categoryLabel: 'Moderate',
      dominantPollutant: 'pm10',
      color: '#FCD34D',
      healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
      location: {
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    unhealthy_sensitive: {
      aqi: 125,
      category: 'unhealthy_sensitive' as AQICategory,
      categoryLabel: 'Unhealthy for Sensitive Groups',
      dominantPollutant: 'o3',
      color: '#FB923C',
      healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
      location: {
        name: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    unhealthy: {
      aqi: 175,
      category: 'unhealthy' as AQICategory,
      categoryLabel: 'Unhealthy',
      dominantPollutant: 'pm25',
      color: '#EF4444',
      healthMessage: 'Everyone should limit prolonged outdoor exertion',
      location: {
        name: 'Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    very_unhealthy: {
      aqi: 275,
      category: 'very_unhealthy' as AQICategory,
      categoryLabel: 'Very Unhealthy',
      dominantPollutant: 'pm25',
      color: '#DC2626',
      healthMessage: 'Everyone should limit outdoor exertion',
      location: {
        name: 'Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    hazardous: {
      aqi: 425,
      category: 'hazardous' as AQICategory,
      categoryLabel: 'Hazardous',
      dominantPollutant: 'pm25',
      color: '#7C2D12',
      healthMessage: 'Everyone should avoid outdoor activities. Use air purifiers indoors.',
      location: {
        name: 'Ghaziabad',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        country: 'India',
      },
      lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      isLoading: false,
      error: null,
    },
    loading: {
      aqi: 0,
      category: 'good' as AQICategory,
      categoryLabel: 'Good',
      dominantPollutant: 'pm25',
      color: '#4ADE80',
      healthMessage: '',
      location: {
        country: 'India',
      },
      lastUpdated: new Date().toISOString(),
      isLoading: true,
      error: null,
    },
    error: {
      aqi: 0,
      category: 'good' as AQICategory,
      categoryLabel: 'Good',
      dominantPollutant: 'pm25',
      color: '#4ADE80',
      healthMessage: '',
      location: {
        country: 'India',
      },
      lastUpdated: new Date().toISOString(),
      isLoading: false,
      error: 'Failed to fetch AQI data. Please check your internet connection and try again.',
    },
  };

  const currentScenario = scenarios[selectedScenario as keyof typeof scenarios];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">HeroAQISection Component Test</h1>
        <p className="text-gray-300 mb-8">
          Testing the HeroAQISection component with different AQI levels and states
        </p>

        {/* Scenario Selector */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Scenario</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(scenarios).map((scenario) => (
              <button
                key={scenario}
                onClick={() => setSelectedScenario(scenario)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedScenario === scenario
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {scenario.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Component Display */}
        <div className="mb-8">
          <HeroAQISection {...currentScenario} />
        </div>

        {/* Props Display */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Current Props</h2>
          <pre className="bg-black/30 p-4 rounded-lg overflow-auto text-sm text-gray-300">
            {JSON.stringify(currentScenario, null, 2)}
          </pre>
        </div>

        {/* Requirements Checklist */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Requirements Checklist</h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Component structure with props interface implemented</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Loading state with skeleton loader</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Error state with user-friendly message</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Circular AQI meter with 240px diameter</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>AQI value in 72px font with weight 700</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Category label and health message display</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Location with GPS icon</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Last updated timestamp with relative formatting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Glassmorphic styling applied</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Color-coded based on AQI category</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <a
            href="/"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            ← Back to Home
          </a>
          <a
            href="/test-glassmorphism"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            View Glassmorphism Test
          </a>
        </div>
      </div>
    </div>
  );
}
