/**
 * HeroAQISection Component
 * 
 * Displays the current AQI value prominently with circular meter animation.
 * This is the main hero section of the dashboard showing real-time air quality status.
 * 
 * Features:
 * - Circular progress ring with animated fill (1.5s ease-out)
 * - Dynamic gradient background based on AQI level
 * - Health message appropriate to AQI category
 * - Location display with GPS icon
 * - Last updated timestamp
 * - Loading and error states with skeleton loaders
 * 
 * Requirements: 2.1, 2.2, Task 19.5
 */

'use client';

import React from 'react';
import { AQICategory } from '@/lib/api/types';
import { CircularAQIMeter } from './CircularAQIMeter';
import { Skeleton, SkeletonText } from '@/components/common';

// ============================================================================
// Props Interface
// ============================================================================

export interface HeroAQISectionProps {
  /** Current AQI value (0-500) */
  aqi: number;
  /** AQI category (good, moderate, unhealthy, etc.) */
  category: AQICategory;
  /** Human-readable category label */
  categoryLabel: string;
  /** Dominant pollutant causing the AQI level */
  dominantPollutant: string;
  /** Color code for the AQI category */
  color: string;
  /** Health message appropriate for the AQI level */
  healthMessage: string;
  /** Location information */
  location: {
    name?: string;
    city?: string;
    state?: string;
    country: string;
  };
  /** Last updated timestamp (ISO string) */
  lastUpdated: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Retry callback for error state */
  onRetry?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const HeroAQISection: React.FC<HeroAQISectionProps> = ({
  aqi,
  category,
  categoryLabel,
  dominantPollutant,
  color,
  healthMessage,
  location,
  lastUpdated,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  // Format location name
  const locationName = location.name || location.city || location.country;

  // Map AQI category to background gradient class
  const getBackgroundGradientClass = (aqiCategory: AQICategory): string => {
    switch (aqiCategory) {
      case 'good':
        return 'bg-gradient-good';
      case 'moderate':
        return 'bg-gradient-moderate';
      case 'unhealthy_sensitive':
      case 'unhealthy':
        return 'bg-gradient-unhealthy';
      case 'very_unhealthy':
        return 'bg-gradient-very-unhealthy';
      case 'hazardous':
        return 'bg-gradient-hazardous';
      default:
        return 'bg-gradient-good';
    }
  };

  const backgroundGradientClass = getBackgroundGradientClass(category);

  // Format last updated time (relative)
  const formatLastUpdated = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch {
      return 'Unknown';
    }
  };

  // ============================================================================
  // Error State
  // ============================================================================

  if (error) {
    return (
      <div className="hero-aqi-section glass-card p-8 rounded-3xl" data-testid="hero-aqi-section">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Unable to Load AQI Data</h2>
          <p className="text-white/70 text-center max-w-md mb-6">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 
                       rounded-lg text-white font-medium transition-all duration-300
                       hover-lift hover-scale"
            >
              <svg 
                className="w-4 h-4" 
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
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Loading State
  // ==================================================================== ========

  if (isLoading) {
    return (
      <div className="hero-aqi-section glass-card p-8 rounded-3xl" data-testid="hero-aqi-section">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {/* Skeleton loader for circular meter */}
          <div className="relative w-60 h-60 mb-6">
            <Skeleton variant="circular" width={240} height={240} />
          </div>
          
          {/* Skeleton loaders for text content */}
          <div className="space-y-3 w-full max-w-md">
            <div className="mx-auto w-48">
              <Skeleton variant="text" width={192} height={32} />
            </div>
            <div className="mx-auto w-32">
              <Skeleton variant="text" width={128} height={24} />
            </div>
            <div className="mx-auto w-64">
              <SkeletonText lines={2} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div 
      className={`hero-aqi-section glass-card p-8 rounded-3xl relative overflow-hidden transition-all duration-1000 ease-in-out ${backgroundGradientClass}`}
      data-testid="hero-aqi-section"
      data-aqi-category={category}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 rounded-3xl" aria-hidden="true" />
      
      {/* Content wrapper with relative positioning */}
      <div className="relative z-10">
        {/* Circular AQI Meter */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="mb-4">
            <CircularAQIMeter
              aqi={aqi}
              color={color}
              size={240}
              strokeWidth={8}
              animate={true}
              animationDuration={1500}
            />
          </div>

          {/* Category Label */}
          <div 
            className="text-2xl font-semibold mb-2"
            style={{ color }}
            data-testid="aqi-category"
          >
            {categoryLabel}
          </div>

          {/* Dominant Pollutant */}
          <div className="text-sm text-gray-400 mb-4" data-testid="dominant-pollutant">
            Primary: {dominantPollutant.toUpperCase()}
          </div>

          {/* Health Message */}
          <div 
            className="text-center max-w-md text-gray-200 mb-6"
            data-testid="health-message"
          >
            {healthMessage}
          </div>

          {/* Location and Last Updated */}
          <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
            <div className="flex items-center gap-2" data-testid="current-location">
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-label="Location"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span>{locationName}</span>
            </div>
            
            <div className="flex items-center gap-2" data-testid="last-updated">
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-label="Last updated"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span>Updated {formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroAQISection;
