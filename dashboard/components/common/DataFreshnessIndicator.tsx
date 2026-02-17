/**
 * DataFreshnessIndicator Component
 * 
 * Displays when data was last updated and the next refresh time.
 * Features:
 * - Real-time countdown to next refresh
 * - Relative time display (e.g., "2 minutes ago")
 * - Visual indicator of data freshness
 * - Offline mode indicator
 */

'use client';

import { useEffect, useState } from 'react';

export interface DataFreshnessIndicatorProps {
  /**
   * Timestamp of last data update (ISO string or Date)
   */
  lastUpdated: string | Date;

  /**
   * Refresh interval in milliseconds
   * @default 300000 (5 minutes)
   */
  refreshInterval?: number;

  /**
   * Whether the app is currently offline
   * @default false
   */
  isOffline?: boolean;

  /**
   * Whether data is currently being fetched
   * @default false
   */
  isRefreshing?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show countdown to next refresh
   * @default true
   */
  showCountdown?: boolean;
}

/**
 * Format relative time (e.g., "2 minutes ago", "just now")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  return date.toLocaleString();
}

/**
 * Format countdown time (e.g., "4m 32s", "32s")
 */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function DataFreshnessIndicator({
  lastUpdated,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  isOffline = false,
  isRefreshing = false,
  className = '',
  showCountdown = true,
}: DataFreshnessIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState('');
  const [countdown, setCountdown] = useState('');
  const [freshnessLevel, setFreshnessLevel] = useState<'fresh' | 'stale' | 'old'>('fresh');

  useEffect(() => {
    const updateTime = () => {
      const lastUpdateDate = typeof lastUpdated === 'string' 
        ? new Date(lastUpdated) 
        : lastUpdated;

      // Update relative time
      setRelativeTime(formatRelativeTime(lastUpdateDate));

      // Calculate time since last update
      const now = new Date();
      const timeSinceUpdate = now.getTime() - lastUpdateDate.getTime();

      // Calculate time until next refresh
      const timeUntilRefresh = Math.max(0, refreshInterval - timeSinceUpdate);
      setCountdown(formatCountdown(timeUntilRefresh));

      // Determine freshness level
      if (timeSinceUpdate < refreshInterval * 0.5) {
        setFreshnessLevel('fresh');
      } else if (timeSinceUpdate < refreshInterval) {
        setFreshnessLevel('stale');
      } else {
        setFreshnessLevel('old');
      }
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated, refreshInterval]);

  // Freshness indicator color
  const freshnessColors = {
    fresh: 'bg-green-400',
    stale: 'bg-yellow-400',
    old: 'bg-red-400',
  };

  return (
    <div className={`flex items-center justify-center gap-3 text-white/70 text-xs md:text-sm ${className}`}>
      {/* Freshness Indicator Dot */}
      <div className="flex items-center gap-2">
        <div
          className={`
            w-2 h-2 rounded-full
            ${isOffline ? 'bg-gray-400' : freshnessColors[freshnessLevel]}
            ${isRefreshing ? 'animate-pulse' : ''}
          `}
          aria-hidden="true"
        />
        
        {/* Status Text */}
        <span>
          {isRefreshing ? (
            'Refreshing...'
          ) : isOffline ? (
            'Offline - Showing cached data'
          ) : (
            <>
              Updated {relativeTime}
              {showCountdown && countdown && !isOffline && (
                <span className="text-white/50"> • Next refresh in {countdown}</span>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
