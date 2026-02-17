'use client';

import { TopNavigation } from '@/components/layout';
import { PredictionGraphConnected } from '@/components/forecast/PredictionGraphConnected';
import { ForecastSummaryCards } from '@/components/forecast/ForecastSummaryCards';
import { HourlyForecastList } from '@/components/forecast/HourlyForecastList';
import { ExportButton } from '@/components/forecast/ExportButton';
import { useLocation } from '@/providers/LocationProvider';
import { useQuery } from '@tanstack/react-query';
import { getAQIClient } from '@/lib/api/aqi-client';

/**
 * Forecast Page Component
 * 
 * Displays the 24-hour AQI forecast with interactive prediction graph.
 * 
 * Features:
 * - Page heading and description
 * - Interactive prediction graph with confidence intervals
 * - Responsive layout
 * - Integration with location context
 * 
 * Requirements: 4.1-4.8 (Prediction Graph Visualization)
 * Task: 10.1 - Create forecast page layout
 */
export default function ForecastPage() {
  const { currentLocation, isLoading } = useLocation();

  // Fetch forecast data
  const { data: forecastData, isLoading: isForecastLoading } = useQuery({
    queryKey: ['forecast', currentLocation?.name],
    queryFn: () => getAQIClient().get24HourForecast(currentLocation?.name || 'Delhi'),
    enabled: !!currentLocation,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Show loading state while location is being initialized
  if (isLoading || !currentLocation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-red-500 to-orange-500">
        <TopNavigation />
        <main className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50 mx-auto"></div>
              <p className="text-white/70">Loading forecast...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-red-500 to-orange-500">
      <TopNavigation />
      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              24-Hour Forecast
            </h1>
            <p className="text-white/90 text-lg md:text-xl">
              Air quality predictions for the next 24 hours in {currentLocation.name}
            </p>
          </div>
          
          {/* Export Button */}
          {forecastData?.forecasts && (
            <div className="flex-shrink-0">
              <ExportButton
                forecasts={forecastData.forecasts}
                location={currentLocation.name}
                disabled={isForecastLoading}
              />
            </div>
          )}
        </div>

        {/* Prediction Graph Section */}
        <div className="glass-card p-6 md:p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Hourly AQI Predictions
            </h2>
            <p className="text-white/80 text-sm">
              Interactive chart showing predicted air quality levels with confidence intervals
            </p>
          </div>

          {/* Prediction Graph Component */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
            <PredictionGraphConnected
              location={currentLocation.name}
              showConfidenceInterval={true}
              height={320}
            />
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#4ADE80]"></div>
              <span className="text-white/80">Good (0-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FCD34D]"></div>
              <span className="text-white/80">Moderate (51-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FB923C]"></div>
              <span className="text-white/80">Unhealthy for Sensitive (101-150)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#EF4444]"></div>
              <span className="text-white/80">Unhealthy (151-200)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#DC2626]"></div>
              <span className="text-white/80">Very Unhealthy (201-300)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#7C2D12]"></div>
              <span className="text-white/80">Hazardous (301+)</span>
            </div>
          </div>
        </div>

        {/* Placeholder for future components */}
        <div className="glass-card p-6 md:p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass mb-6">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Forecast Summary
          </h2>
          {isForecastLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
            </div>
          ) : forecastData?.forecasts ? (
            <ForecastSummaryCards forecasts={forecastData.forecasts} />
          ) : (
            <p className="text-white/70 text-sm">No forecast data available</p>
          )}
        </div>

        <div className="glass-card p-6 md:p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Hourly Forecast List
            </h2>
            <p className="text-white/70 text-sm">
              Detailed hourly breakdown with AQI, pollutants, and weather data
            </p>
          </div>
          {isForecastLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
            </div>
          ) : forecastData?.forecasts ? (
            <HourlyForecastList forecasts={forecastData.forecasts} />
          ) : (
            <p className="text-white/70 text-center py-8">No hourly forecast data available</p>
          )}
        </div>
      </main>
    </div>
  );
}
