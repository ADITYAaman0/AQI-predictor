/**
 * Insights Page
 * 
 * Displays comprehensive air quality insights including:
 * - Source attribution (pollution sources breakdown)
 * - Historical trends (line charts and calendar heatmap)
 * - Comparative analysis (current vs historical averages)
 * 
 * Requirements: 16.6
 * Tasks: 13.1
 */

'use client';

import { useState } from 'react';
import { TopNavigation } from '@/components/layout';
import {
  SourceAttributionCardConnected,
  HistoricalTrendsChart,
  CalendarHeatmap,
  StatisticsGrid,
  ComparativeAnalysis,
} from '@/components/insights';
import { useHistoricalData } from '@/lib/api/hooks/useHistoricalData';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { format, subDays } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

type DateRange = '7d' | '30d' | '90d';

// ============================================================================
// Main Component
// ============================================================================

export default function InsightsPage() {
  // State
  const [location] = useState('Delhi'); // TODO: Get from location context
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  
  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90);
  
  // Fetch historical data
  const {
    data: historicalData,
    isLoading: isLoadingHistorical,
    error: historicalError,
  } = useHistoricalData({
    location,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500">
      <TopNavigation />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Insights & Analytics
          </h1>
          <p className="text-white/90 text-lg">
            Historical trends, source attribution, and comparative analysis for {location}
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setDateRange('7d')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              dateRange === '7d'
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              dateRange === '30d'
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setDateRange('90d')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              dateRange === '90d'
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            90 Days
          </button>
        </div>

        {/* Error Display */}
        {historicalError && (
          <div className="mb-6">
            <ErrorDisplay
              error={historicalError}
              onRetry={() => window.location.reload()}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* Section 1: Source Attribution */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Source Attribution
            </h2>
            <SourceAttributionCardConnected location={location} />
          </section>

          {/* Section 2: Statistics Overview */}
          {historicalData && (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Statistics Overview
              </h2>
              <StatisticsGrid data={historicalData.data} />
            </section>
          )}

          {/* Section 3: Historical Trends */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Historical Trends
            </h2>
            <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
              <HistoricalTrendsChart
                data={historicalData?.data || []}
                isLoading={isLoadingHistorical}
                title={`AQI Trends - Last ${dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} Days`}
              />
            </div>
          </section>

          {/* Section 4: Calendar Heatmap */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Calendar View
            </h2>
            <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
              <CalendarHeatmap
                data={historicalData?.data || []}
                isLoading={isLoadingHistorical}
                title="Daily AQI Calendar"
              />
            </div>
          </section>

          {/* Section 5: Comparative Analysis */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Comparative Analysis
            </h2>
            <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
              <ComparativeAnalysis
                data={historicalData?.data || []}
                isLoading={isLoadingHistorical}
              />
            </div>
          </section>
        </div>

        {/* Back to Dashboard Link */}
        <div className="mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-all duration-300 hover:scale-105"
          >
            ← Back to Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
