/**
 * HistoricalTrendsChart Component
 * 
 * Displays historical AQI data trends over selectable time periods.
 * Shows line charts with AQI trends and allows users to select different time ranges.
 * 
 * Features:
 * - Line chart visualization using Recharts
 * - Date range selector (7 days, 30 days, 90 days, 1 year)
 * - Color-coded AQI zones
 * - Interactive tooltips
 * - Glassmorphic styling
 * - Responsive design
 * 
 * Requirements: 16.4, 19.1
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { HistoricalDataPoint } from '@/lib/api/types';
import { format, parseISO } from 'date-fns';
import { calculateAQIStatistics } from '@/lib/utils/statisticsUtils';
import { StatisticsGrid } from './StatisticsGrid';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface HistoricalTrendsChartProps {
  /** Historical data points */
  data: HistoricalDataPoint[];
  /** Show loading state */
  isLoading?: boolean;
  /** Optional title override */
  title?: string;
  /** Callback when date range changes */
  onDateRangeChange?: (range: DateRange) => void;
  /** Current selected date range */
  selectedRange?: DateRange;
}

export type DateRange = '7d' | '30d' | '90d' | '1y';

interface DateRangeOption {
  value: DateRange;
  label: string;
  days: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Date range options
 */
const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
  { value: '1y', label: '1 Year', days: 365 },
];

/**
 * AQI threshold lines for reference
 */
const AQI_THRESHOLDS = [
  { value: 50, label: 'Good', color: '#4ADE80' },
  { value: 100, label: 'Moderate', color: '#FCD34D' },
  { value: 150, label: 'Unhealthy (SG)', color: '#FB923C' },
  { value: 200, label: 'Unhealthy', color: '#EF4444' },
  { value: 300, label: 'Very Unhealthy', color: '#B91C1C' },
];

/**
 * Get AQI category color based on value
 */
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#4ADE80'; // Good
  if (aqi <= 100) return '#FCD34D'; // Moderate
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive Groups
  if (aqi <= 200) return '#EF4444'; // Unhealthy
  if (aqi <= 300) return '#B91C1C'; // Very Unhealthy
  return '#7C2D12'; // Hazardous
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string, range: DateRange): string {
  const date = parseISO(timestamp);
  
  switch (range) {
    case '7d':
      return format(date, 'EEE'); // Mon, Tue, etc.
    case '30d':
      return format(date, 'MMM d'); // Jan 1, Jan 2, etc.
    case '90d':
      return format(date, 'MMM d'); // Jan 1, Feb 1, etc.
    case '1y':
      return format(date, 'MMM yyyy'); // Jan 2024, Feb 2024, etc.
    default:
      return format(date, 'MMM d');
  }
}

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const aqiColor = getAQIColor(data.aqi);

  return (
    <div
      className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-lg"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <p className="text-white/70 text-xs mb-2">
        {format(parseISO(data.timestamp), 'MMM d, yyyy h:mm a')}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: aqiColor }}
        ></div>
        <span className="text-white font-semibold">AQI: {data.aqi}</span>
      </div>
      <p className="text-white/60 text-xs mt-1">{data.category}</p>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

const HistoricalTrendsChartComponent: React.FC<HistoricalTrendsChartProps> = ({
  data,
  isLoading = false,
  title = 'Historical Trends',
  onDateRangeChange,
  selectedRange = '30d',
}) => {
  const [activeRange, setActiveRange] = useState<DateRange>(selectedRange);

  // Calculate statistics from data (Task 22.3 - useMemo optimization)
  const statistics = useMemo(() => {
    return calculateAQIStatistics(data);
  }, [data]);

  // Handle date range change (Task 22.3 - useCallback optimization)
  const handleRangeChange = useCallback((range: DateRange) => {
    setActiveRange(range);
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
  }, [onDateRangeChange]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="historical-trends-loading"
      >
        <div className="mb-6">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse mt-2"></div>
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-20 bg-white/10 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-80 bg-white/5 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="historical-trends-empty"
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/60 text-sm mb-6">
          View air quality trends over time
        </p>
        <div className="flex items-center justify-center h-80 text-white/40">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4"
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
            <p className="text-sm">No historical data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 rounded-2xl transition-all duration-300"
      data-testid="historical-trends-chart"
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className="text-lg font-semibold text-white mb-2"
          data-testid="historical-trends-title"
        >
          {title}
        </h3>
        <p className="text-white/60 text-sm">
          Air quality trends over selected time period
        </p>
      </div>

      {/* Date Range Selector */}
      <div
        className="flex gap-2 mb-6 flex-wrap"
        data-testid="date-range-selector"
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRangeChange(option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${
                activeRange === option.value
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }
            `}
            data-testid={`range-button-${option.value}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Statistics Grid */}
      <div className="mb-6">
        <StatisticsGrid statistics={statistics} isLoading={isLoading} />
      </div>

      {/* Chart */}
      <div className="h-80" data-testid="historical-trends-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.3} />
                <stop offset="20%" stopColor="#FCD34D" stopOpacity={0.3} />
                <stop offset="40%" stopColor="#FB923C" stopOpacity={0.3} />
                <stop offset="60%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="80%" stopColor="#B91C1C" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7C2D12" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatTimestamp(value, activeRange)}
              stroke="rgba(255, 255, 255, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />

            <YAxis
              stroke="rgba(255, 255, 255, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
              label={{
                value: 'AQI',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' },
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* AQI Threshold Reference Lines */}
            {AQI_THRESHOLDS.map((threshold) => (
              <ReferenceLine
                key={threshold.value}
                y={threshold.value}
                stroke={threshold.color}
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                label={{
                  value: threshold.label,
                  position: 'right',
                  fill: threshold.color,
                  fontSize: 10,
                  opacity: 0.6,
                }}
              />
            ))}

            {/* Area fill under line */}
            <Area
              type="monotone"
              dataKey="aqi"
              fill="url(#aqiGradient)"
              stroke="none"
              animationDuration={1000}
              animationEasing="ease-out"
            />

            {/* Main line */}
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="#fff"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#fff',
                stroke: 'rgba(255, 255, 255, 0.5)',
                strokeWidth: 2,
              }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex flex-wrap gap-4 text-xs">
          {AQI_THRESHOLDS.map((threshold) => (
            <div key={threshold.value} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: threshold.color }}
              ></div>
              <span className="text-white/70">{threshold.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-4">
        <p className="text-white/50 text-xs">
          Historical data shows actual recorded AQI values. Hover over the chart to see detailed information.
        </p>
      </div>
    </div>
  );
};

// Task 22.3 - Wrap with React.memo to prevent unnecessary re-renders
export const HistoricalTrendsChart = React.memo(HistoricalTrendsChartComponent);

export default HistoricalTrendsChart;
