/**
 * RefreshButton Component
 * 
 * A manual refresh button that allows users to trigger data refresh on demand.
 * Features:
 * - Glassmorphic styling
 * - Loading animation during refresh
 * - Accessible with keyboard support
 * - Tooltip on hover
 */

'use client';

import { useState } from 'react';

export interface RefreshButtonProps {
  /**
   * Callback function to trigger refresh
   */
  onRefresh: () => Promise<void> | void;

  /**
   * Whether the button is currently disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Button size variant
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Show label text next to icon
   * @default false
   */
  showLabel?: boolean;
}

export function RefreshButton({
  onRefresh,
  disabled = false,
  className = '',
  size = 'medium',
  showLabel = false,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (disabled || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Keep spinning for a minimum duration for better UX
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
  };

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={disabled || isRefreshing}
      className={`
        glass-card
        backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10
        rounded-full
        flex items-center justify-center gap-2
        transition-all duration-300 ease-out
        hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-level2 hover:-translate-y-0.5
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
        ${sizeClasses[size]}
        ${showLabel ? 'px-4 rounded-full' : ''}
        ${className}
      `}
      aria-label="Refresh data"
      title="Refresh data"
    >
      {/* Refresh Icon */}
      <svg
        className={`
          ${iconSizeClasses[size]}
          transition-transform duration-500
          ${isRefreshing ? 'animate-spin' : ''}
        `}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>

      {/* Optional Label */}
      {showLabel && (
        <span className="text-white dark:text-slate-200 font-medium whitespace-nowrap">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </span>
      )}
    </button>
  );
}
