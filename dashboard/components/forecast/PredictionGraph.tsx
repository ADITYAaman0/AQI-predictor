'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
} from 'recharts';
import { HourlyForecastData } from '@/lib/api/types';
import { format } from 'date-fns';
import { useResponsiveChart, sampleChartData } from '@/lib/hooks';

/**
 * Props for the PredictionGraph component
 */
export interface PredictionGraphProps {
  /** Array of hourly forecast data points */
  forecasts: HourlyForecastData[];
  /** Whether to show confidence interval shading */
  showConfidenceInterval?: boolean;
  /** Height of the chart in pixels */
  height?: number;
  /** Callback when hovering over a forecast point */
  onHover?: (forecast: HourlyForecastData | null) => void;
}

/**
 * Get AQI category color based on AQI value
 * Requirements: 1.3 - AQI color palette
 */
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '#4ADE80'; // Good
  if (aqi <= 100) return '#FCD34D'; // Moderate
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive Groups
  if (aqi <= 200) return '#EF4444'; // Unhealthy
  if (aqi <= 300) return '#DC2626'; // Very Unhealthy
  return '#7C2D12'; // Hazardous
};

/**
 * Get gradient ID for a specific AQI range
 */
const getGradientId = (aqi: number): string => {
  if (aqi <= 50) return 'aqiGradientGood';
  if (aqi <= 100) return 'aqiGradientModerate';
  if (aqi <= 150) return 'aqiGradientUnhealthySensitive';
  if (aqi <= 200) return 'aqiGradientUnhealthy';
  if (aqi <= 300) return 'aqiGradientVeryUnhealthy';
  return 'aqiGradientHazardous';
};

/**
 * Get AQI category label based on AQI value
 */
const getAQICategory = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

/**
 * Custom Tooltip Component
 * Requirements: 4.5, 4.7 - Display AQI, timestamp, and confidence interval
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  showConfidenceInterval?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, 
  payload, 
  showConfidenceInterval = false 
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const aqi = data.aqi;
  const timestamp = data.timestamp;
  const aqiLower = data.aqiLower;
  const aqiUpper = data.aqiUpper;
  const category = getAQICategory(aqi);
  const color = getAQIColor(aqi);

  // Format timestamp
  let formattedTime = 'N/A';
  try {
    const date = new Date(timestamp);
    formattedTime = format(date, 'MMM d, h:mm a');
  } catch (error) {
    formattedTime = timestamp;
  }

  return (
    <div
      className="bg-black/80 border border-white/20 rounded-lg p-3 backdrop-blur-sm"
      style={{ minWidth: '200px' }}
      data-testid="prediction-tooltip"
    >
      {/* AQI Value */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/70 text-xs">AQI</span>
        <div className="flex items-center gap-2">
          <span 
            className="text-lg font-bold"
            style={{ color }}
          >
            {Math.round(aqi)}
          </span>
          <span className="text-xs text-white/60">({category})</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/70 text-xs">Time</span>
        <span className="text-white/90 text-xs">{formattedTime}</span>
      </div>

      {/* Confidence Interval */}
      {showConfidenceInterval && (
        <div className="border-t border-white/10 pt-2 mt-2">
          <div className="text-white/70 text-xs mb-1">Confidence Interval</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Lower:</span>
            <span className="text-white/90">{Math.round(aqiLower)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Upper:</span>
            <span className="text-white/90">{Math.round(aqiUpper)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PredictionGraph Component
 * 
 * Displays a line/area chart showing hourly AQI predictions for 24-48 hours.
 * Features:
 * - Animated line drawing on mount (2s ease-out)
 * - Gradient stroke matching AQI zones
 * - Gradient fill under the line matching AQI zones
 * - Horizontal grid lines at AQI thresholds
 * - Interactive tooltips with exact values
 * - Optional confidence interval visualization
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.6, 12.3
 * 
 * @example
 * ```tsx
 * <PredictionGraph
 *   forecasts={forecastData}
 *   showConfidenceInterval={true}
 *   height={280}
 * />
 * ```
 */
const PredictionGraphComponent: React.FC<PredictionGraphProps> = ({
  forecasts,
  showConfidenceInterval = false,
  height = 280,
  onHover,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  
  // Get responsive chart configuration
  const chartConfig = useResponsiveChart(height);

  // Reset animation when forecasts change
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, [forecasts]);

  // Transform forecast data for Recharts (Task 22.3 - useMemo optimization)
  const chartData = useMemo(() => 
    forecasts.map((forecast) => ({
      timestamp: forecast.timestamp,
      hour: forecast.forecastHour,
      aqi: forecast.aqi.value,
      aqiLower: forecast.aqi.confidenceLower,
      aqiUpper: forecast.aqi.confidenceUpper,
      category: forecast.aqi.category,
      color: forecast.aqi.color,
    })),
    [forecasts]
  );
  
  // Sample data for mobile to reduce density (Task 22.3 - useMemo optimization)
  const sampledData = useMemo(
    () => sampleChartData(chartData, chartConfig.dataSampleRate),
    [chartData, chartConfig.dataSampleRate]
  );

  // Calculate average AQI to determine dominant gradient (Task 22.3 - useMemo optimization)
  const { avgAQI, dominantGradientId } = useMemo(() => {
    const avg = chartData.reduce((sum, d) => sum + d.aqi, 0) / chartData.length;
    return {
      avgAQI: avg,
      dominantGradientId: getGradientId(avg)
    };
  }, [chartData]);

  // Handle mouse move to track active data point (Task 22.3 - useCallback optimization)
  const handleMouseMove = useCallback((state: any) => {
    if (state && state.activeTooltipIndex !== undefined) {
      const forecast = forecasts[state.activeTooltipIndex];
      if (onHover && forecast) {
        onHover(forecast);
      }
    }
  }, [forecasts, onHover]);

  // Handle mouse leave (Task 22.3 - useCallback optimization)
  const handleMouseLeave = useCallback(() => {
    if (onHover) {
      onHover(null);
    }
  }, [onHover]);

  return (
    <div className="w-full" data-testid="prediction-graph">
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <ComposedChart
          data={sampledData}
          margin={chartConfig.margin}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Gradient definitions for all AQI zones */}
          <defs>
            {/* Good (0-50) - Green gradient */}
            <linearGradient id="aqiGradientGood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Moderate (51-100) - Yellow gradient */}
            <linearGradient id="aqiGradientModerate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#FCD34D" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Unhealthy for Sensitive Groups (101-150) - Orange gradient */}
            <linearGradient id="aqiGradientUnhealthySensitive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB923C" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#FB923C" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Unhealthy (151-200) - Red gradient */}
            <linearGradient id="aqiGradientUnhealthy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Very Unhealthy (201-300) - Dark Red gradient */}
            <linearGradient id="aqiGradientVeryUnhealthy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#DC2626" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Hazardous (301+) - Maroon gradient */}
            <linearGradient id="aqiGradientHazardous" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C2D12" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#7C2D12" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* Grid with AQI threshold lines */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.1)"
            vertical={false}
          />

          {/* AQI Threshold Reference Lines */}
          {/* Good/Moderate threshold at 50 */}
          {chartConfig.showReferenceLines && (
            <ReferenceLine
              y={50}
              stroke="#4ADE80"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: '50',
                position: 'right',
                fill: 'rgba(255, 255, 255, 0.5)',
                fontSize: chartConfig.fontSize - 2,
              }}
            />
          )}
          
          {/* Moderate/Unhealthy for Sensitive threshold at 100 */}
          {chartConfig.showReferenceLines && (
            <ReferenceLine
              y={100}
              stroke="#FCD34D"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: '100',
                position: 'right',
                fill: 'rgba(255, 255, 255, 0.5)',
                fontSize: chartConfig.fontSize - 2,
              }}
            />
          )}
          
          {/* Unhealthy for Sensitive/Unhealthy threshold at 150 */}
          {chartConfig.showReferenceLines && (
            <ReferenceLine
              y={150}
              stroke="#FB923C"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: '150',
                position: 'right',
                fill: 'rgba(255, 255, 255, 0.5)',
                fontSize: chartConfig.fontSize - 2,
              }}
            />
          )}
          
          {/* Unhealthy/Very Unhealthy threshold at 200 */}
          {chartConfig.showReferenceLines && (
            <ReferenceLine
              y={200}
              stroke="#EF4444"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: '200',
                position: 'right',
                fill: 'rgba(255, 255, 255, 0.5)',
                fontSize: chartConfig.fontSize - 2,
              }}
            />
          )}
          
          {/* Very Unhealthy/Hazardous threshold at 300 */}
          {chartConfig.showReferenceLines && (
            <ReferenceLine
              y={300}
              stroke="#DC2626"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: '300',
                position: 'right',
                fill: 'rgba(255, 255, 255, 0.5)',
                fontSize: chartConfig.fontSize - 2,
              }}
            />
          )}

          {/* X-axis showing hours */}
          <XAxis
            dataKey="hour"
            stroke="rgba(255, 255, 255, 0.5)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: chartConfig.tickFontSize }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            label={chartConfig.showAxisLabels ? {
              value: 'Hours Ahead',
              position: 'insideBottom',
              offset: -5,
              style: { fill: 'rgba(255, 255, 255, 0.7)', fontSize: chartConfig.fontSize },
            } : undefined}
          />

          {/* Y-axis showing AQI values */}
          <YAxis
            stroke="rgba(255, 255, 255, 0.5)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: chartConfig.tickFontSize }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            domain={[0, 'auto']}
            label={chartConfig.showAxisLabels ? {
              value: 'AQI',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'rgba(255, 255, 255, 0.7)', fontSize: chartConfig.fontSize },
            } : undefined}
          />

          {/* Tooltip for hover interactions */}
          <Tooltip
            content={<CustomTooltip showConfidenceInterval={showConfidenceInterval} />}
            cursor={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
          />

          {/* Confidence interval visualization - shaded area between upper and lower bounds */}
          {showConfidenceInterval && (
            <>
              {/* Shaded area for confidence interval - fills from lower to upper bound */}
              <Area
                type="monotone"
                dataKey="aqiUpper"
                stroke="none"
                fill="rgba(255, 255, 255, 0.15)"
                fillOpacity={0.3}
                isAnimationActive={isAnimating}
                animationDuration={2000}
                animationEasing="ease-out"
                data-testid="confidence-interval-area"
              />
              {/* Upper confidence bound line */}
              <Line
                type="monotone"
                dataKey="aqiUpper"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={isAnimating}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              {/* Lower confidence bound line */}
              <Line
                type="monotone"
                dataKey="aqiLower"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={isAnimating}
                animationDuration={2000}
                animationEasing="ease-out"
              />
            </>
          )}

          {/* Main AQI line with gradient fill matching AQI zones */}
          <Area
            type="monotone"
            dataKey="aqi"
            stroke={getAQIColor(avgAQI)}
            strokeWidth={chartConfig.strokeWidth}
            fill={`url(#${dominantGradientId})`}
            fillOpacity={0.3}
            isAnimationActive={isAnimating}
            animationDuration={2000}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: chartConfig.activeDotRadius,
              fill: getAQIColor(avgAQI),
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Task 22.3 - Wrap with React.memo to prevent unnecessary re-renders
export const PredictionGraph = React.memo(PredictionGraphComponent);

export default PredictionGraph;
