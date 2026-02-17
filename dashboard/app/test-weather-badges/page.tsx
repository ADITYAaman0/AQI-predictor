/**
 * Test Page for WeatherBadges Component
 * 
 * Visual testing page to verify the WeatherBadges component renders correctly
 * with different weather data scenarios.
 */

'use client';

import { useState } from 'react';
import { WeatherBadges } from '@/components/dashboard/WeatherBadges';

export default function TestWeatherBadgesPage() {
  const [scenario, setScenario] = useState<string>('normal');

  // Different weather scenarios for testing
  const scenarios = {
    normal: {
      temperature: 25.5,
      humidity: 65.3,
      windSpeed: 12.8,
      windDirection: 180, // South
      pressure: 1013.25,
    },
    hot: {
      temperature: 42.0,
      humidity: 30.0,
      windSpeed: 5.0,
      windDirection: 90, // East
      pressure: 1010.0,
    },
    cold: {
      temperature: -10.0,
      humidity: 85.0,
      windSpeed: 25.0,
      windDirection: 0, // North
      pressure: 1020.0,
    },
    stormy: {
      temperature: 18.0,
      humidity: 95.0,
      windSpeed: 45.0,
      windDirection: 270, // West
      pressure: 990.0,
    },
    calm: {
      temperature: 22.0,
      humidity: 50.0,
      windSpeed: 2.0,
      windDirection: 45, // Northeast
      pressure: 1015.0,
    },
    extreme: {
      temperature: 50.0,
      humidity: 100.0,
      windSpeed: 100.0,
      windDirection: 315, // Northwest
      pressure: 950.0,
    },
  };

  const currentWeather = scenarios[scenario as keyof typeof scenarios];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            WeatherBadges Component Test
          </h1>
          <p className="text-gray-300">
            Visual testing for the WeatherBadges component with different weather scenarios.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Weather Scenario</h2>
          <div className="flex flex-wrap gap-3">
            {Object.keys(scenarios).map((key) => (
              <button
                key={key}
                onClick={() => setScenario(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  scenario === key
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Current Weather Data Display */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Current Weather Data</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Temperature</div>
              <div className="text-white font-semibold">{currentWeather.temperature}°C</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Humidity</div>
              <div className="text-white font-semibold">{currentWeather.humidity}%</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Wind Speed</div>
              <div className="text-white font-semibold">{currentWeather.windSpeed} km/h</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Wind Direction</div>
              <div className="text-white font-semibold">{currentWeather.windDirection}°</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Pressure</div>
              <div className="text-white font-semibold">{currentWeather.pressure} hPa</div>
            </div>
          </div>
        </div>

        {/* WeatherBadges Component - Default Size */}
        <div className="glass-card p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">WeatherBadges Component</h2>
          <div className="flex justify-center">
            <WeatherBadges {...currentWeather} />
          </div>
        </div>

        {/* WeatherBadges Component - On Dark Background */}
        <div className="bg-gray-900 p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">On Dark Background</h2>
          <div className="flex justify-center">
            <WeatherBadges {...currentWeather} />
          </div>
        </div>

        {/* WeatherBadges Component - On Light Background */}
        <div className="bg-white/10 p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">On Light Background</h2>
          <div className="flex justify-center">
            <WeatherBadges {...currentWeather} />
          </div>
        </div>

        {/* Multiple Instances */}
        <div className="glass-card p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Multiple Scenarios Side by Side</h2>
          <div className="space-y-6">
            {Object.entries(scenarios).map(([key, weather]) => (
              <div key={key} className="border-b border-white/10 pb-6 last:border-b-0">
                <h3 className="text-lg font-medium text-white mb-3 capitalize">{key}</h3>
                <WeatherBadges {...weather} />
              </div>
            ))}
          </div>
        </div>

        {/* Responsive Test */}
        <div className="glass-card p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Responsive Layout Test</h2>
          <p className="text-gray-300 mb-4 text-sm">
            Resize your browser window to see how the badges wrap on smaller screens.
          </p>
          <div className="max-w-xs mx-auto">
            <WeatherBadges {...currentWeather} />
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Requirements Checklist</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>Requirement 5.1:</strong> Displays circular weather badges showing temperature, wind speed, and humidity
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>Requirement 5.2:</strong> Formats badges as 56px diameter circles with glassmorphic background
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>Requirement 5.3:</strong> Shows weather icons at 20px size with values in 14px font
              </span>
            </div>
          </div>
        </div>

        {/* Visual Verification Guide */}
        <div className="mt-8 glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Visual Verification Guide</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <strong className="text-white">Badge Size:</strong> Each badge should be 56px × 56px (circular)
            </div>
            <div>
              <strong className="text-white">Icon Size:</strong> Icons should be 20px × 20px
            </div>
            <div>
              <strong className="text-white">Font Size:</strong> Values should be 14px (text-sm)
            </div>
            <div>
              <strong className="text-white">Gap:</strong> 12px horizontal gap between badges (gap-3)
            </div>
            <div>
              <strong className="text-white">Glassmorphism:</strong> Semi-transparent background with backdrop blur
            </div>
            <div>
              <strong className="text-white">Hover Effect:</strong> Badges should scale to 105% on hover
            </div>
            <div>
              <strong className="text-white">Wind Arrow:</strong> Arrow should rotate based on wind direction
            </div>
            <div>
              <strong className="text-white">Responsive:</strong> Badges should wrap on smaller screens
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
