'use client';

import { useMemo } from 'react';
import { HourlyForecastData } from '@/lib/api/types';
import { Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';

/**
 * Forecast Summary Cards Component
 * 
 * Displays summary statistics for the forecast period including:
 * - Best time for air quality (lowest AQI)
 * - Worst time for air quality (highest AQI)
 * - Peak pollution hours
 * - Average AQI for the period
 * 
 * Requirements: 4.10
 * Task: 10.2 - Add forecast summary cards
 */

interface ForecastSummaryCardsProps {
  forecasts: HourlyForecastData[];
}

interface SummaryStats {
  bestTime: {
    hour: number;
    timestamp: string;
    aqi: number;
    category: string;
  } | null;
  worstTime: {
    hour: number;
    timestamp: string;
    aqi: number;
    category: string;
  } | null;
  peakPollutionHours: {
    start: number;
    end: number;
    avgAqi: number;
  } | null;
  averageAqi: number;
}

/**
 * Calculate summary statistics from forecast data
 */
function calculateSummaryStats(forecasts: HourlyForecastData[]): SummaryStats {
  if (!forecasts || forecasts.length === 0) {
    return {
      bestTime: null,
      worstTime: null,
      peakPollutionHours: null,
      averageAqi: 0,
    };
  }

  // Find best and worst times
  let bestTime = forecasts[0];
  let worstTime = forecasts[0];
  let totalAqi = 0;

  forecasts.forEach((forecast) => {
    if (bestTime && forecast.aqi.value < bestTime.aqi.value) {
      bestTime = forecast;
    }
    if (worstTime && forecast.aqi.value > worstTime.aqi.value) {
      worstTime = forecast;
    }
    totalAqi += forecast.aqi.value;
  });

  // Calculate average AQI
  const averageAqi = Math.round(totalAqi / forecasts.length);

  // Find peak pollution hours (consecutive hours with AQI > average)
  let peakPollutionHours = null;
  let currentPeakStart = -1;
  let currentPeakEnd = -1;
  let currentPeakSum = 0;
  let currentPeakCount = 0;
  let maxPeakAvg = 0;

  forecasts.forEach((forecast) => {
    if (forecast.aqi.value > averageAqi) {
      if (currentPeakStart === -1) {
        currentPeakStart = forecast.forecastHour;
      }
      currentPeakEnd = forecast.forecastHour;
      currentPeakSum += forecast.aqi.value;
      currentPeakCount++;
    } else {
      if (currentPeakStart !== -1 && currentPeakCount >= 2) {
        const peakAvg = currentPeakSum / currentPeakCount;
        if (peakAvg > maxPeakAvg) {
          maxPeakAvg = peakAvg;
          peakPollutionHours = {
            start: currentPeakStart,
            end: currentPeakEnd,
            avgAqi: Math.round(peakAvg),
          };
        }
      }
      currentPeakStart = -1;
      currentPeakEnd = -1;
      currentPeakSum = 0;
      currentPeakCount = 0;
    }
  });

  // Check if there's a peak at the end
  if (currentPeakStart !== -1 && currentPeakCount >= 2) {
    const peakAvg = currentPeakSum / currentPeakCount;
    if (peakAvg > maxPeakAvg) {
      peakPollutionHours = {
        start: currentPeakStart,
        end: currentPeakEnd,
        avgAqi: Math.round(peakAvg),
      };
    }
  }

  return {
    bestTime: bestTime ? {
      hour: bestTime.forecastHour,
      timestamp: bestTime.timestamp,
      aqi: bestTime.aqi.value,
      category: bestTime.aqi.categoryLabel,
    } : null,
    worstTime: worstTime ? {
      hour: worstTime.forecastHour,
      timestamp: worstTime.timestamp,
      aqi: worstTime.aqi.value,
      category: worstTime.aqi.categoryLabel,
    } : null,
    peakPollutionHours,
    averageAqi,
  };
}

/**
 * Format hour to 12-hour time format
 */
function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get AQI color based on value
 */
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#4ADE80'; // Good
  if (aqi <= 100) return '#FCD34D'; // Moderate
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive
  if (aqi <= 200) return '#EF4444'; // Unhealthy
  if (aqi <= 300) return '#DC2626'; // Very Unhealthy
  return '#7C2D12'; // Hazardous
}

export function ForecastSummaryCards({ forecasts }: ForecastSummaryCardsProps) {
  const stats = useMemo(() => calculateSummaryStats(forecasts), [forecasts]);

  if (!stats.bestTime || !stats.worstTime) {
    return (
      <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
        <p className="text-white/70 text-center">No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Best Time Card */}
      <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass hover:shadow-level2 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
            <TrendingDown className="w-6 h-6 text-green-400" />
          </div>
        </div>
        <h3 className="text-white/90 text-sm font-medium mb-2">Best Time</h3>
        <div className="space-y-1">
          <p className="text-white text-2xl font-bold">{formatHour(stats.bestTime.hour)}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getAQIColor(stats.bestTime.aqi) }}
            />
            <p className="text-white/80 text-sm">
              AQI {stats.bestTime.aqi} - {stats.bestTime.category}
            </p>
          </div>
        </div>
      </div>

      {/* Worst Time Card */}
      <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass hover:shadow-level2 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
            <TrendingUp className="w-6 h-6 text-red-400" />
          </div>
        </div>
        <h3 className="text-white/90 text-sm font-medium mb-2">Worst Time</h3>
        <div className="space-y-1">
          <p className="text-white text-2xl font-bold">{formatHour(stats.worstTime.hour)}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getAQIColor(stats.worstTime.aqi) }}
            />
            <p className="text-white/80 text-sm">
              AQI {stats.worstTime.aqi} - {stats.worstTime.category}
            </p>
          </div>
        </div>
      </div>

      {/* Peak Pollution Hours Card */}
      <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass hover:shadow-level2 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <Clock className="w-6 h-6 text-orange-400" />
          </div>
        </div>
        <h3 className="text-white/90 text-sm font-medium mb-2">Peak Pollution</h3>
        <div className="space-y-1">
          {stats.peakPollutionHours ? (
            <>
              <p className="text-white text-2xl font-bold">
                {formatHour(stats.peakPollutionHours.start)} - {formatHour(stats.peakPollutionHours.end)}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getAQIColor(stats.peakPollutionHours.avgAqi) }}
                />
                <p className="text-white/80 text-sm">Avg AQI {stats.peakPollutionHours.avgAqi}</p>
              </div>
            </>
          ) : (
            <p className="text-white/70 text-sm">No significant peaks</p>
          )}
        </div>
      </div>

      {/* Average AQI Card */}
      <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass hover:shadow-level2 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <h3 className="text-white/90 text-sm font-medium mb-2">24-Hour Average</h3>
        <div className="space-y-1">
          <p className="text-white text-2xl font-bold">AQI {stats.averageAqi}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getAQIColor(stats.averageAqi) }}
            />
            <p className="text-white/80 text-sm">Overall forecast period</p>
          </div>
        </div>
      </div>
    </div>
  );
}
