'use client';

import { HourlyForecastData } from '@/lib/api/types';
import { Wind, Droplets, Thermometer } from 'lucide-react';

/**
 * Hourly Forecast List Component
 * 
 * Displays a detailed table/list of hourly predictions showing:
 * - Hour and timestamp
 * - AQI value and category
 * - Key pollutants (PM2.5, PM10, O3)
 * - Weather conditions (temperature, humidity, wind speed)
 * 
 * Features:
 * - Responsive design (table on desktop, cards on mobile)
 * - Color-coded AQI values
 * - Confidence intervals display
 * - Smooth scrolling
 * 
 * Requirements: 4.11
 * Task: 10.3 - Implement hourly forecast list
 */

interface HourlyForecastListProps {
  forecasts: HourlyForecastData[];
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
 * Format timestamp to readable date and time
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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

/**
 * Get AQI background color with opacity
 */
function getAQIBackgroundColor(aqi: number): string {
  if (aqi <= 50) return 'rgba(74, 222, 128, 0.1)'; // Good
  if (aqi <= 100) return 'rgba(252, 211, 77, 0.1)'; // Moderate
  if (aqi <= 150) return 'rgba(251, 146, 60, 0.1)'; // Unhealthy for Sensitive
  if (aqi <= 200) return 'rgba(239, 68, 68, 0.1)'; // Unhealthy
  if (aqi <= 300) return 'rgba(220, 38, 38, 0.1)'; // Very Unhealthy
  return 'rgba(124, 45, 18, 0.1)'; // Hazardous
}

/**
 * Get pollutant value safely
 */
function getPollutantValue(pollutants: Record<string, any>, key: string): number | null {
  return pollutants[key]?.value ?? null;
}

export function HourlyForecastList({ forecasts }: HourlyForecastListProps) {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">No hourly forecast data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">Time</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">AQI</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">Category</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">PM2.5</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">PM10</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">O₃</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">Temp</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">Humidity</th>
              <th className="text-left py-3 px-4 text-white/90 text-sm font-medium">Wind</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((forecast, index) => (
              <tr
                key={`${forecast.timestamp}-${index}`}
                className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                style={{ backgroundColor: getAQIBackgroundColor(forecast.aqi.value) }}
              >
                {/* Time */}
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">
                      {formatHour(forecast.forecastHour)}
                    </span>
                    <span className="text-white/60 text-xs">
                      {formatTimestamp(forecast.timestamp)}
                    </span>
                  </div>
                </td>

                {/* AQI */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getAQIColor(forecast.aqi.value) }}
                    />
                    <span className="text-white font-bold text-lg">
                      {forecast.aqi.value}
                    </span>
                  </div>
                  {forecast.aqi.confidenceLower !== undefined && (
                    <span className="text-white/50 text-xs">
                      ({forecast.aqi.confidenceLower}-{forecast.aqi.confidenceUpper})
                    </span>
                  )}
                </td>

                {/* Category */}
                <td className="py-3 px-4">
                  <span className="text-white/80 text-sm">
                    {forecast.aqi.categoryLabel}
                  </span>
                </td>

                {/* PM2.5 */}
                <td className="py-3 px-4">
                  <span className="text-white/80 text-sm">
                    {getPollutantValue(forecast.pollutants, 'pm25')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'pm25') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </span>
                </td>

                {/* PM10 */}
                <td className="py-3 px-4">
                  <span className="text-white/80 text-sm">
                    {getPollutantValue(forecast.pollutants, 'pm10')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'pm10') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </span>
                </td>

                {/* O3 */}
                <td className="py-3 px-4">
                  <span className="text-white/80 text-sm">
                    {getPollutantValue(forecast.pollutants, 'o3')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'o3') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </span>
                </td>

                {/* Temperature */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-white/50" />
                    <span className="text-white/80 text-sm">
                      {forecast.weather?.temperature?.toFixed(0) ?? 'N/A'}
                      {forecast.weather?.temperature && '°C'}
                    </span>
                  </div>
                </td>

                {/* Humidity */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-white/50" />
                    <span className="text-white/80 text-sm">
                      {forecast.weather?.humidity?.toFixed(0) ?? 'N/A'}
                      {forecast.weather?.humidity && '%'}
                    </span>
                  </div>
                </td>

                {/* Wind Speed */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-white/50" />
                    <span className="text-white/80 text-sm">
                      {forecast.weather?.windSpeed?.toFixed(1) ?? 'N/A'}
                      {forecast.weather?.windSpeed && ' m/s'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {forecasts.map((forecast, index) => (
          <div
            key={`${forecast.timestamp}-${index}`}
            className="glass-card p-4 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass"
            style={{ backgroundColor: getAQIBackgroundColor(forecast.aqi.value) }}
          >
            {/* Header: Time and AQI */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-white font-semibold text-base">
                  {formatHour(forecast.forecastHour)}
                </div>
                <div className="text-white/60 text-xs">
                  {formatTimestamp(forecast.timestamp)}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getAQIColor(forecast.aqi.value) }}
                  />
                  <span className="text-white font-bold text-xl">
                    {forecast.aqi.value}
                  </span>
                </div>
                <div className="text-white/70 text-xs mt-1">
                  {forecast.aqi.categoryLabel}
                </div>
                {forecast.aqi.confidenceLower !== undefined && (
                  <div className="text-white/50 text-xs">
                    ({forecast.aqi.confidenceLower}-{forecast.aqi.confidenceUpper})
                  </div>
                )}
              </div>
            </div>

            {/* Pollutants */}
            <div className="border-t border-white/10 pt-3 mb-3">
              <div className="text-white/70 text-xs font-medium mb-2">Pollutants</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/60 text-xs">PM2.5</div>
                  <div className="text-white text-sm font-medium">
                    {getPollutantValue(forecast.pollutants, 'pm25')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'pm25') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/60 text-xs">PM10</div>
                  <div className="text-white text-sm font-medium">
                    {getPollutantValue(forecast.pollutants, 'pm10')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'pm10') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/60 text-xs">O₃</div>
                  <div className="text-white text-sm font-medium">
                    {getPollutantValue(forecast.pollutants, 'o3')?.toFixed(1) ?? 'N/A'}
                    {getPollutantValue(forecast.pollutants, 'o3') && (
                      <span className="text-white/50 text-xs ml-1">μg/m³</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Weather */}
            <div className="border-t border-white/10 pt-3">
              <div className="text-white/70 text-xs font-medium mb-2">Weather</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4 text-white/50" />
                  <span className="text-white/80 text-sm">
                    {forecast.weather?.temperature?.toFixed(0) ?? 'N/A'}
                    {forecast.weather?.temperature && '°C'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="w-4 h-4 text-white/50" />
                  <span className="text-white/80 text-sm">
                    {forecast.weather?.humidity?.toFixed(0) ?? 'N/A'}
                    {forecast.weather?.humidity && '%'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4 text-white/50" />
                  <span className="text-white/80 text-sm">
                    {forecast.weather?.windSpeed?.toFixed(1) ?? 'N/A'}
                    {forecast.weather?.windSpeed && ' m/s'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
