/**
 * StatisticsGrid Component
 * 
 * Displays a grid of statistical measures for historical AQI data.
 * Shows min, max, mean (average), and median values.
 * 
 * Features:
 * - Responsive grid layout
 * - Color-coded statistics cards
 * - Icons for each statistic type
 * - Glassmorphic styling
 * 
 * Requirements: 19.3
 */

'use client';

import React from 'react';
import { StatisticsCard } from './StatisticsCard';
import { HistoricalDataPoint } from '@/lib/api/types';
import { calculateAQIStatistics } from '@/lib/utils/statisticsUtils';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StatisticsGridProps {
  /** Historical data points */
  data: HistoricalDataPoint[];
  /** Optional title */
  title?: string;
  /** Show loading state */
  isLoading?: boolean;
}

// ============================================================================
// Icons
// ============================================================================

const MinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 14l-7 7m0 0l-7-7m7 7V3"
    />
  </svg>
);

const MaxIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 10l7-7m0 0l7 7m-7-7v18"
    />
  </svg>
);

const AverageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const MedianIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
    />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export const StatisticsGrid: React.FC<StatisticsGridProps> = ({
  data,
  title = 'Statistics',
  isLoading = false,
}) => {
  // Calculate statistics from data
  const statistics = calculateAQIStatistics(data);
  // Loading state
  if (isLoading) {
    return (
      <div data-testid="statistics-grid-loading">
        <h4 className="text-white font-semibold mb-4">{title}</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-card p-4 rounded-xl h-32 animate-pulse"
            >
              <div className="h-4 w-16 bg-white/10 rounded mb-3"></div>
              <div className="h-10 w-20 bg-white/10 rounded mb-2"></div>
              <div className="h-3 w-24 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (statistics.count === 0) {
    return (
      <div data-testid="statistics-grid-empty">
        <h4 className="text-white font-semibold mb-4">{title}</h4>
        <div className="glass-card p-6 rounded-xl text-center">
          <p className="text-white/60 text-sm">
            No data available for statistics calculation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="statistics-grid">
      {/* Title */}
      <h4 className="text-white font-semibold mb-4">{title}</h4>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          label="Average"
          value={statistics.mean}
          icon={<AverageIcon />}
          testId="statistics-card-average"
        />
        <StatisticsCard
          label="Minimum"
          value={statistics.min}
          icon={<MinIcon />}
          testId="statistics-card-minimum"
        />
        <StatisticsCard
          label="Maximum"
          value={statistics.max}
          icon={<MaxIcon />}
          testId="statistics-card-maximum"
        />
        <StatisticsCard
          label="Median"
          value={statistics.median}
          icon={<MedianIcon />}
          testId="statistics-card-median"
        />
      </div>

      {/* Data count info */}
      <div className="mt-4">
        <p className="text-white/50 text-xs">
          Based on {statistics.count} data point{statistics.count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default StatisticsGrid;
