/**
 * WeatherBadges Component
 * 
 * Displays current weather conditions affecting air quality in circular badges.
 * Shows temperature, humidity, wind speed, and pressure in a compact, glassmorphic design.
 * 
 * Features:
 * - 56px diameter circular badges with glassmorphism styling
 * - Icons for each weather parameter (20px size)
 * - Animated value changes
 * - Wind direction indicator
 * - Responsive layout with 12px horizontal gap
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

'use client';

import React from 'react';

// ============================================================================
// Props Interface
// ============================================================================

export interface WeatherBadgesProps {
  /** Temperature in Celsius */
  temperature: number;
  /** Humidity percentage (0-100) */
  humidity: number;
  /** Wind speed in km/h */
  windSpeed: number;
  /** Wind direction in degrees (0-360) */
  windDirection: number;
  /** Atmospheric pressure in hPa */
  pressure: number;
}

// ============================================================================
// Component
// ============================================================================

export const WeatherBadges: React.FC<WeatherBadgesProps> = ({
  temperature,
  humidity,
  windSpeed,
  windDirection,
  pressure,
}) => {
  /**
   * Format wind direction from degrees to compass direction
   */
  const getWindDirectionLabel = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return directions[index] || 'N';
  };

  /**
   * Get rotation angle for wind direction arrow
   */
  const getWindArrowRotation = (degrees: number): number => {
    return degrees % 360;
  };

  const windDirectionLabel = getWindDirectionLabel(windDirection);
  const windArrowRotation = getWindArrowRotation(windDirection);

  return (
    <div 
      className="weather-badges flex flex-wrap items-center gap-3"
      data-testid="weather-badges"
      role="group"
      aria-label="Weather conditions"
    >
      {/* Temperature Badge */}
      <div 
        className="weather-badge glass-card rounded-full w-14 h-14 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
        data-testid="weather-badge-temperature"
        title={`Temperature: ${temperature}°C`}
      >
        <svg 
          className="w-5 h-5 mb-0.5 text-orange-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
        <div className="flex items-baseline">
          <span className="text-sm font-semibold text-white" data-testid="temperature-value">
            {Math.round(temperature)}
          </span>
          <span className="text-[10px] text-gray-400 ml-0.5">°C</span>
        </div>
      </div>

      {/* Humidity Badge */}
      <div 
        className="weather-badge glass-card rounded-full w-14 h-14 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
        data-testid="weather-badge-humidity"
        title={`Humidity: ${humidity}%`}
      >
        <svg 
          className="w-5 h-5 mb-0.5 text-blue-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        <div className="flex items-baseline">
          <span className="text-sm font-semibold text-white" data-testid="humidity-value">
            {Math.round(humidity)}
          </span>
          <span className="text-[10px] text-gray-400 ml-0.5">%</span>
        </div>
      </div>

      {/* Wind Speed Badge */}
      <div 
        className="weather-badge glass-card rounded-full w-14 h-14 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
        data-testid="weather-badge-wind"
        title={`Wind: ${windSpeed} km/h ${windDirectionLabel}`}
      >
        <svg 
          className="w-5 h-5 mb-0.5 text-cyan-400 transition-transform duration-500"
          style={{ transform: `rotate(${windArrowRotation}deg)` }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
          data-testid="wind-arrow"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
        <div className="flex items-baseline">
          <span className="text-sm font-semibold text-white" data-testid="wind-speed-value">
            {Math.round(windSpeed)}
          </span>
          <span className="text-[10px] text-gray-400 ml-0.5" data-testid="wind-direction-label">
            {windDirectionLabel}
          </span>
        </div>
      </div>

      {/* Pressure Badge */}
      <div 
        className="weather-badge glass-card rounded-full w-14 h-14 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
        data-testid="weather-badge-pressure"
        title={`Pressure: ${pressure} hPa`}
      >
        <svg 
          className="w-5 h-5 mb-0.5 text-purple-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-white leading-none" data-testid="pressure-value">
            {Math.round(pressure)}
          </span>
          <span className="text-[10px] text-gray-400 leading-none">hPa</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherBadges;
