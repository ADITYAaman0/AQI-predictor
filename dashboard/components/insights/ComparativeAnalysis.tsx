/**
 * ComparativeAnalysis Component
 * 
 * Displays comparative analysis of current vs historical AQI data.
 * Shows trends (improving/worsening) with visual indicators.
 * 
 * Features:
 * - Current vs Average comparison
 * - Best vs Worst days analysis
 * - Trend indicators with arrows and colors
 * - Percentage change calculations
 * - Glassmorphic card design
 * 
 * Requirements: 16.7, 19.4
 * Task: 13.2
 */

'use client';

import React from 'react';
import { HistoricalDataPoint } from '@/lib/api/types';
import { calculateAQIStatistics, getAQICategoryColor } from '@/lib/utils/statisticsUtils';
import { format } from 'date-fns';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ComparativeAnalysisProps {
  /** Historical data points */
  data: HistoricalDataPoint[];
  /** Current AQI value (defaults to last data point) */
  currentAQI?: number;
  /** Show loading state */
  isLoading?: boolean;
  /** Optional title */
  title?: string;
}

interface TrendData {
  direction: 'improving' | 'worsening' | 'stable';
  percentageChange: number;
  color: string;
  icon: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate trend direction and percentage change
 */
function calculateTrend(current: number, average: number): TrendData {
  const percentageChange = ((current - average) / average) * 100;
  
  if (Math.abs(percentageChange) < 5) {
    return {
      direction: 'stable',
      percentageChange: 0,
      color: 'text-blue-400',
      icon: '→',
    };
  }
  
  if (current < average) {
    return {
      direction: 'improving',
      percentageChange: Math.abs(percentageChange),
      color: 'text-green-400',
      icon: '↓',
    };
  }
  
  return {
    direction: 'worsening',
    percentageChange: Math.abs(percentageChange),
    color: 'text-red-400',
    icon: '↑',
  };
}

/**
 * Find best and worst days with dates
 */
function findBestWorstDays(data: HistoricalDataPoint[]) {
  if (data.length === 0) {
    return {
      bestDay: { aqi: 0, date: '' },
      worstDay: { aqi: 0, date: '' },
    };
  }
  
  const bestDay = data.reduce((min, point) => 
    point.aqi < min.aqi ? point : min
  );
  
  const worstDay = data.reduce((max, point) => 
    point.aqi > max.aqi ? point : max
  );
  
  return {
    bestDay: {
      aqi: bestDay.aqi,
      date: format(new Date(bestDay.timestamp), 'MMM dd'),
    },
    worstDay: {
      aqi: worstDay.aqi,
      date: format(new Date(worstDay.timestamp), 'MMM dd'),
    },
  };
}

// ============================================================================
// Component
// ============================================================================

export const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({
  data,
  currentAQI,
  isLoading = false,
  title = 'Comparative Analysis',
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div data-testid="comparative-analysis-loading" className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 animate-pulse"
            >
              <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-white/10 rounded"></div>
                <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                <div className="h-4 w-5/6 bg-white/10 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div data-testid="comparative-analysis-empty" className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20">
          <p className="text-white/60 text-center">
            No historical data available for comparison
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const statistics = calculateAQIStatistics(data);
  const current = currentAQI ?? data[data.length - 1]?.aqi ?? 0;
  const trend = calculateTrend(current, statistics.mean);
  const { bestDay, worstDay } = findBestWorstDays(data);
  const range = statistics.max - statistics.min;

  return (
    <div data-testid="comparative-analysis" className="space-y-4">
      {/* Title */}
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>

      {/* Description */}
      <p className="text-white/70 text-sm mb-6">
        Compare current air quality with historical averages to identify trends and patterns.
      </p>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current vs Average Card */}
        <div
          data-testid="current-vs-average-card"
          className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all duration-300"
        >
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Current vs Average
          </h4>

          <div className="space-y-3">
            {/* Current AQI */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Current AQI:</span>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-lg"
                  style={{ color: getAQICategoryColor(current) }}
                  data-testid="current-aqi-value"
                >
                  {Math.round(current)}
                </span>
              </div>
            </div>

            {/* Period Average */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Period Average:</span>
              <span
                className="font-semibold text-white"
                data-testid="average-aqi-value"
              >
                {statistics.mean}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-3"></div>

            {/* Trend Indicator */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Trend:</span>
              <div
                className={`flex items-center gap-2 font-semibold ${trend.color}`}
                data-testid="trend-indicator"
              >
                <span className="text-2xl leading-none">{trend.icon}</span>
                <span className="capitalize">{trend.direction}</span>
                {trend.direction !== 'stable' && (
                  <span className="text-xs opacity-75">
                    ({trend.percentageChange.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>

            {/* Trend Description */}
            <div className="mt-3 p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">
                {trend.direction === 'improving' && (
                  <>Air quality is <span className="text-green-400 font-medium">improving</span> compared to the period average.</>
                )}
                {trend.direction === 'worsening' && (
                  <>Air quality is <span className="text-red-400 font-medium">worsening</span> compared to the period average.</>
                )}
                {trend.direction === 'stable' && (
                  <>Air quality is <span className="text-blue-400 font-medium">stable</span> with minimal variation.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Best vs Worst Days Card */}
        <div
          data-testid="best-worst-days-card"
          className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all duration-300"
        >
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Best vs Worst Days
          </h4>

          <div className="space-y-3">
            {/* Best Day */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Best Day:</span>
              <div className="text-right">
                <div
                  className="font-bold text-lg text-green-400"
                  data-testid="best-day-aqi"
                >
                  {bestDay.aqi} AQI
                </div>
                <div className="text-white/50 text-xs">{bestDay.date}</div>
              </div>
            </div>

            {/* Worst Day */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Worst Day:</span>
              <div className="text-right">
                <div
                  className="font-bold text-lg text-red-400"
                  data-testid="worst-day-aqi"
                >
                  {worstDay.aqi} AQI
                </div>
                <div className="text-white/50 text-xs">{worstDay.date}</div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-3"></div>

            {/* Range */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Variation Range:</span>
              <span
                className="font-semibold text-white"
                data-testid="aqi-range"
              >
                {range} AQI
              </span>
            </div>

            {/* Variability Indicator */}
            <div className="mt-3 p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">
                {range < 50 && (
                  <>Air quality shows <span className="text-green-400 font-medium">low variability</span> during this period.</>
                )}
                {range >= 50 && range < 100 && (
                  <>Air quality shows <span className="text-yellow-400 font-medium">moderate variability</span> during this period.</>
                )}
                {range >= 100 && (
                  <>Air quality shows <span className="text-red-400 font-medium">high variability</span> during this period.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div
        data-testid="additional-insights"
        className="glass-card p-4 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 mt-4"
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-white/70 text-sm">
              <span className="font-medium text-white">Insight:</span>{' '}
              {trend.direction === 'improving' && (
                <>The current air quality is better than the historical average. Continue monitoring for sustained improvement.</>
              )}
              {trend.direction === 'worsening' && (
                <>The current air quality is worse than the historical average. Consider taking protective measures.</>
              )}
              {trend.direction === 'stable' && (
                <>The air quality remains consistent with historical patterns. No significant changes detected.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparativeAnalysis;
