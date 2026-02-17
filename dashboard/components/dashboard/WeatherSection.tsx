/**
 * WeatherSection Component
 * 
 * Complete weather display section that integrates with the API
 * and uses the weather formatter utilities.
 * 
 * Features:
 * - Fetches weather data from API
 * - Formats data with appropriate units
 * - Validates data before display
 * - Handles loading and error states
 * - Supports metric/imperial units
 * 
 * Requirements: 5.4, 5.5
 */

'use client';

import React from 'react';
import { WeatherBadges } from './WeatherBadges';
import { 
  formatWeatherFromInfo,
  validateWeatherData,
  hasCompleteWeatherData,
  getDefaultWeatherData 
} from '@/lib/utils/weather-formatter';
import { WeatherInfo } from '@/lib/api/types';

// ============================================================================
// Props Interface
// ============================================================================

export interface WeatherSectionProps {
  /** Weather data from API */
  weather: WeatherInfo;
  /** Last updated timestamp */
  lastUpdated?: string;
  /** Use imperial units (Fahrenheit, mph, inHg) */
  useImperialUnits?: boolean;
  /** Show loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export const WeatherSection: React.FC<WeatherSectionProps> = ({
  weather,
  lastUpdated,
  useImperialUnits = false,
  isLoading = false,
  error,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div 
        className="glass-card p-6 rounded-2xl"
        data-testid="weather-section-loading"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Current Weather</h3>
        <div className="flex gap-3 animate-pulse">
          <div className="h-14 w-14 bg-white/10 rounded-full"></div>
          <div className="h-14 w-14 bg-white/10 rounded-full"></div>
          <div className="h-14 w-14 bg-white/10 rounded-full"></div>
          <div className="h-14 w-14 bg-white/10 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="glass-card p-6 rounded-2xl"
        data-testid="weather-section-error"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Current Weather</h3>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <WeatherBadges {...getDefaultWeatherData()} />
      </div>
    );
  }

  // Check for complete weather data
  if (!hasCompleteWeatherData(weather)) {
    console.warn('Incomplete weather data received, using defaults');
    return (
      <div 
        className="glass-card p-6 rounded-2xl"
        data-testid="weather-section-incomplete"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Current Weather</h3>
        <p className="text-yellow-400 text-sm mb-4">
          Weather data is incomplete
        </p>
        <WeatherBadges {...getDefaultWeatherData()} />
      </div>
    );
  }

  // Validate weather data BEFORE unit conversion (validation uses metric ranges)
  const metricWeatherData = formatWeatherFromInfo(weather);
  if (!validateWeatherData(metricWeatherData)) {
    console.error('Invalid weather data values:', metricWeatherData);
    return (
      <div 
        className="glass-card p-6 rounded-2xl"
        data-testid="weather-section-invalid"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Current Weather</h3>
        <p className="text-red-400 text-sm mb-4">
          Weather data is invalid
        </p>
        <WeatherBadges {...getDefaultWeatherData()} />
      </div>
    );
  }

  // Extract and format weather data with requested units
  const weatherData = formatWeatherFromInfo(weather, {
    useFahrenheit: useImperialUnits,
    useMph: useImperialUnits,
    useInHg: useImperialUnits,
  });

  return (
    <div 
      className="glass-card p-6 rounded-2xl"
      data-testid="weather-section"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Current Weather</h3>
      <WeatherBadges {...weatherData} />
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-4">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default WeatherSection;
