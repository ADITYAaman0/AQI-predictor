/**
 * SourceAttributionCardConnected Component
 * 
 * Connected version of SourceAttributionCard that fetches real data from the API.
 * Integrates with the backend to display actual source attribution data.
 * 
 * Features:
 * - Fetches current AQI data including source attribution
 * - Automatic data refresh
 * - Loading and error states
 * - Extracts source attribution from API response
 * 
 * Requirements: 15.9
 */

'use client';

import React from 'react';
import { SourceAttributionCard } from './SourceAttributionCard';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SourceAttributionCardConnectedProps {
  /** Location to fetch data for */
  location: string;
  /** Optional title override */
  title?: string;
  /** Optional custom refresh interval (ms) */
  refreshInterval?: number;
}

// ============================================================================
// Component
// ============================================================================

export const SourceAttributionCardConnected: React.FC<SourceAttributionCardConnectedProps> = ({
  location,
  title,
  refreshInterval,
}) => {
  // Fetch current AQI data (includes source attribution)
  const { data, isLoading, error } = useCurrentAQI(location, {
    refetchInterval: refreshInterval,
  });

  // Error state
  if (error && !data) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="source-attribution-error"
      >
        <h3 className="text-lg font-semibold text-white mb-2">
          {title || 'Pollution Sources'}
        </h3>
        <div className="flex items-center justify-center h-64 text-white/40">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-white/60">
              Unable to load source attribution data
            </p>
            <p className="text-xs text-white/40 mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Extract source attribution from API response
  const sourceAttribution = data?.sourceAttribution || {
    vehicular: 0,
    industrial: 0,
    biomass: 0,
    background: 0,
  };

  // Render the presentational component with real data
  return (
    <SourceAttributionCard
      sourceAttribution={sourceAttribution}
      isLoading={isLoading}
      title={title}
    />
  );
};

export default SourceAttributionCardConnected;
