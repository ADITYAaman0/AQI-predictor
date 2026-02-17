'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PredictionGraph, PredictionGraphProps } from './PredictionGraph';
import { getAQIClient } from '@/lib/api/aqi-client';
import { ForecastResponse } from '@/lib/api/types';

/**
 * Props for the PredictionGraphConnected component
 */
export interface PredictionGraphConnectedProps {
  /** Location name to fetch forecast for */
  location: string;
  /** Whether to show confidence interval shading */
  showConfidenceInterval?: boolean;
  /** Height of the chart in pixels */
  height?: number;
  /** Callback when hovering over a forecast point */
  onHover?: PredictionGraphProps['onHover'];
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: (error: Error) => React.ReactNode;
}

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="w-full h-[280px] flex items-center justify-center">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50 mx-auto"></div>
      <p className="text-white/70 text-sm">Loading forecast data...</p>
    </div>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorComponent: React.FC<{ error: Error; onRetry: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <div className="w-full h-[280px] flex items-center justify-center">
    <div className="space-y-4 text-center max-w-md">
      <div className="text-red-400 text-4xl">⚠️</div>
      <div className="space-y-2">
        <p className="text-white font-semibold">Failed to load forecast data</p>
        <p className="text-white/60 text-sm">{error.message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

/**
 * PredictionGraphConnected Component
 * 
 * A connected version of PredictionGraph that fetches real forecast data from the API.
 * Handles loading and error states automatically.
 * 
 * Features:
 * - Fetches 24-hour forecast data from the backend API
 * - Automatic data transformation for the chart
 * - Loading state with spinner
 * - Error state with retry functionality
 * - Automatic caching with TanStack Query (1-hour cache)
 * - Automatic refetch on window focus
 * 
 * Requirements: 15.3 - Call /api/v1/forecast/24h/{location} endpoint
 * 
 * @example
 * ```tsx
 * <PredictionGraphConnected
 *   location="Delhi"
 *   showConfidenceInterval={true}
 *   height={280}
 * />
 * ```
 */
export const PredictionGraphConnected: React.FC<PredictionGraphConnectedProps> = ({
  location,
  showConfidenceInterval = false,
  height = 280,
  onHover,
  loadingComponent,
  errorComponent,
}) => {
  const client = getAQIClient();

  // Fetch forecast data using TanStack Query
  const {
    data: forecastData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ForecastResponse, Error>({
    queryKey: ['forecast', '24h', location],
    queryFn: () => client.get24HourForecast(location),
    staleTime: 1000 * 60 * 60, // 1 hour cache
    gcTime: 1000 * 60 * 60 * 2, // 2 hours garbage collection
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Handle loading state
  if (isLoading) {
    return loadingComponent || <DefaultLoadingComponent />;
  }

  // Handle error state
  if (isError || !forecastData) {
    const errorToDisplay = error || new Error('Failed to load forecast data');
    
    if (errorComponent) {
      return <>{errorComponent(errorToDisplay)}</>;
    }
    
    return <DefaultErrorComponent error={errorToDisplay} onRetry={() => refetch()} />;
  }

  // Render the PredictionGraph with real data
  return (
    <PredictionGraph
      forecasts={forecastData.forecasts}
      showConfidenceInterval={showConfidenceInterval}
      height={height}
      onHover={onHover}
    />
  );
};

export default PredictionGraphConnected;
