/**
 * HeroAQISectionLive Component
 * 
 * A wrapper component that connects HeroAQISection to real API data
 * using WebSocket for real-time updates with polling fallback.
 * 
 * This component handles:
 * - Real-time WebSocket updates when available
 * - Automatic fallback to polling when WebSocket unavailable
 * - Loading and error states
 * - Data transformation from API response to component props
 * 
 * Requirements: 15.2, 19.1, 19.5, 19.6 (Task 17.3, 17.4)
 */

'use client';

import React from 'react';
import { HeroAQISection } from './HeroAQISection';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';
import { AQICategory } from '@/lib/api/types';
import { useRealtimeAQI } from '@/lib/hooks/useRealtimeAQI';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { hasWebSocketSupport, useAdaptiveDataFetching } from '@/lib/hooks/usePollingFallback';
import { getAQIClient } from '@/lib/api/aqi-client';

// ============================================================================
// Props Interface
// ============================================================================

export interface HeroAQISectionLiveProps {
  /** Location name (e.g., "Delhi", "Mumbai") */
  location: string;

  /**
   * Enable real-time updates (WebSocket or polling)
   * @default true
   */
  enableRealtime?: boolean;

  /**
   * Prefer WebSocket over polling
   * @default true
   */
  preferWebSocket?: boolean;

  /**
   * Polling interval in milliseconds (used when WebSocket unavailable)
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;

  /**
   * Callback when data is successfully fetched
   */
  onSuccess?: (data: any) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: any) => void;

  /**
   * Callback when refresh is triggered
   */
  onRefresh?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const HeroAQISectionLive: React.FC<HeroAQISectionLiveProps> = ({
  location,
  enableRealtime = true,
  preferWebSocket = true,
  pollingInterval = 30000, // 30 seconds
  onSuccess,
  onError,
  onRefresh,
}) => {
  // Get WebSocket state
  const { isConnected: isWebSocketConnected, subscribe } = useWebSocket();

  // Fetch initial data with TanStack Query (for caching and loading states)
  const {
    data: cachedData,
    isLoading,
    error: fetchError,
    refetch,
  } = useCurrentAQI({
    location,
    enabled: !!location,
    refetchInterval: false, // Disable automatic refetch, we use real-time updates
    staleTime: Infinity, // Cache indefinitely, real-time updates keep it fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error);
      }
    },
  });

  // Real-time updates with fallback
  const { data: realtimeData } = useRealtimeAQI({
    location,
    enabled: enableRealtime && !!location,
    invalidateCache: true, // Keep React Query cache in sync
  });

  // Adaptive data fetching (WebSocket with polling fallback)
  const { method, isActive, lastUpdateTime, refresh: adaptiveRefresh } = useAdaptiveDataFetching({
    location,
    enabled: enableRealtime && !!location,
    preferWebSocket,
    pollingInterval,
    fetchFn: async (loc) => {
      return await getAQIClient().getCurrentAQI(loc);
    },
    isWebSocketAvailable: hasWebSocketSupport(),
    isWebSocketConnected,
    webSocketSubscribe: subscribe,
  });

  // Use real-time data if available, otherwise use cached data
  const data = realtimeData?.data || cachedData;

  // Expose refetch function to parent
  React.useEffect(() => {
    if (onRefresh) {
      (window as any).__heroAQIRefetch = () => {
        refetch();
        adaptiveRefresh();
      };
    }
  }, [refetch, adaptiveRefresh, onRefresh]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading || !data) {
    return (
      <HeroAQISection
        aqi={0}
        category="good"
        categoryLabel=""
        dominantPollutant=""
        color=""
        healthMessage=""
        location={{ country: '' }}
        lastUpdated=""
        isLoading={true}
        error={null}
      />
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  const error = fetchError;
  
  if (error) {
    return (
      <HeroAQISection
        aqi={0}
        category="good"
        categoryLabel=""
        dominantPollutant=""
        color=""
        healthMessage=""
        location={{ country: '' }}
        lastUpdated=""
        isLoading={false}
        error={error.message || 'Failed to fetch AQI data. Please try again.'}
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // Success State - Transform API data to component props
  // ============================================================================

  return (
    <HeroAQISection
      aqi={data.aqi.value}
      category={data.aqi.category as AQICategory}
      categoryLabel={data.aqi.categoryLabel}
      dominantPollutant={data.aqi.dominantPollutant}
      color={data.aqi.color}
      healthMessage={data.aqi.healthMessage}
      location={data.location}
      lastUpdated={data.lastUpdated}
      isLoading={false}
      error={null}
    />
  );
};

export default HeroAQISectionLive;

