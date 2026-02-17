/**
 * PollutantMetricsGridLive Component
 * 
 * Connected version of PollutantMetricsGrid that fetches real API data.
 * Uses useCurrentAQI hook to fetch current AQI data and automatically
 * extracts and displays pollutant information.
 * 
 * Features:
 * - Fetches real pollutant data from API
 * - Automatic data refresh every 5 minutes
 * - Loading and error states
 * - Transforms API data to PollutantCard format
 * 
 * Requirements: 15.2
 */

'use client';

import React from 'react';
import { PollutantMetricsGrid } from './PollutantMetricsGrid';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';
import { mapPollutantsToCards } from '@/lib/utils/pollutant-mapper';

// ============================================================================
// Props Interface
// ============================================================================

export interface PollutantMetricsGridLiveProps {
  /** Location name to fetch data for (e.g., "Delhi", "Mumbai") */
  location: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional callback when data is loaded */
  onDataLoaded?: () => void;
  /** Optional callback when error occurs */
  onError?: (error: Error) => void;
}

// ============================================================================
// Component
// ============================================================================

export const PollutantMetricsGridLive: React.FC<PollutantMetricsGridLiveProps> = ({
  location,
  className = '',
  onDataLoaded,
  onError,
}) => {
  // Fetch current AQI data
  const { data, isLoading, error, refetch } = useCurrentAQI({
    location,
    onSuccess: () => {
      if (onDataLoaded) {
        onDataLoaded();
      }
    },
    onError: (err) => {
      if (onError) {
        onError(err);
      }
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`pollutant-metrics-grid-live ${className}`}
        data-testid="pollutant-metrics-grid-live-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white/50 mb-4"></div>
            <p className="text-white/70 text-sm">Loading pollutant data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`pollutant-metrics-grid-live ${className}`}
        data-testid="pollutant-metrics-grid-live-error"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-red-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">
              Failed to load pollutant data
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {error.message || 'An error occurred while fetching data'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors duration-200"
              aria-label="Retry loading pollutant data"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div
        className={`pollutant-metrics-grid-live ${className}`}
        data-testid="pollutant-metrics-grid-live-no-data"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-white/70 text-sm">No pollutant data available</p>
        </div>
      </div>
    );
  }

  // Transform API data to PollutantCard props
  const pollutants = mapPollutantsToCards(data);

  // Success state - render grid with real data
  return (
    <div
      className={`pollutant-metrics-grid-live ${className}`}
      data-testid="pollutant-metrics-grid-live-success"
      role="region"
      aria-label={`Pollutant metrics for ${location}`}
    >
      <PollutantMetricsGrid pollutants={pollutants} />
      
      {/* Data freshness indicator */}
      <div className="mt-4 text-center">
        <p className="text-white/50 text-xs">
          Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default PollutantMetricsGridLive;
