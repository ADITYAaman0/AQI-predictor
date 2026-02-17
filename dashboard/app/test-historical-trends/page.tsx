/**
 * Test page for HistoricalTrendsChart component
 * 
 * This page demonstrates the HistoricalTrendsChart component with mock data
 * to verify visual appearance and functionality.
 */

'use client';

import { useState } from 'react';
import { HistoricalTrendsChart, DateRange } from '@/components/insights';
import { HistoricalDataPoint } from '@/lib/api/types';

// ============================================================================
// Mock Data Generation
// ============================================================================

/**
 * Generate mock historical data for testing
 */
function generateMockHistoricalData(days: number): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate realistic AQI values with some variation
    const baseAQI = 80 + Math.sin(i / 7) * 40; // Oscillate between 40-120
    const randomVariation = (Math.random() - 0.5) * 30;
    const aqi = Math.max(0, Math.min(500, Math.round(baseAQI + randomVariation)));

    // Determine category based on AQI
    let category = 'good';
    if (aqi > 300) category = 'hazardous';
    else if (aqi > 200) category = 'very_unhealthy';
    else if (aqi > 150) category = 'unhealthy';
    else if (aqi > 100) category = 'unhealthy_sensitive';
    else if (aqi > 50) category = 'moderate';

    data.push({
      timestamp: date.toISOString(),
      value: aqi,
      aqi: aqi,
      category: category,
    });
  }

  return data;
}

// ============================================================================
// Test Page Component
// ============================================================================

export default function TestHistoricalTrendsPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange>('30d');
  const [isLoading, setIsLoading] = useState(false);

  // Generate data based on selected range
  const getDaysForRange = (range: DateRange): number => {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '1y':
        return 365;
      default:
        return 30;
    }
  };

  const historicalData = generateMockHistoricalData(getDaysForRange(selectedRange));

  // Handle range change with simulated loading
  const handleRangeChange = (range: DateRange) => {
    setIsLoading(true);
    setSelectedRange(range);
    
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Toggle loading state
  const toggleLoading = () => {
    setIsLoading(!isLoading);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Historical Trends Chart Test
          </h1>
          <p className="text-white/70">
            Testing the HistoricalTrendsChart component with mock data
          </p>
        </div>

        {/* Controls */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={toggleLoading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Hide Loading' : 'Show Loading'}
            </button>
            <div className="text-white/70 flex items-center">
              Current Range: <span className="ml-2 font-semibold text-white">{selectedRange}</span>
            </div>
            <div className="text-white/70 flex items-center">
              Data Points: <span className="ml-2 font-semibold text-white">{historicalData.length}</span>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="mb-8">
          <HistoricalTrendsChart
            data={historicalData}
            isLoading={isLoading}
            selectedRange={selectedRange}
            onDateRangeChange={handleRangeChange}
          />
        </div>

        {/* Additional Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Custom Title */}
          <HistoricalTrendsChart
            data={generateMockHistoricalData(7)}
            title="Last 7 Days"
            selectedRange="7d"
          />

          {/* Empty State */}
          <HistoricalTrendsChart
            data={[]}
            title="Empty State Example"
          />
        </div>

        {/* High AQI Example */}
        <div className="mb-8">
          <HistoricalTrendsChart
            data={[
              {
                timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                value: 350,
                aqi: 350,
                category: 'hazardous',
              },
              {
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                value: 280,
                aqi: 280,
                category: 'very_unhealthy',
              },
              {
                timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                value: 220,
                aqi: 220,
                category: 'very_unhealthy',
              },
              {
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                value: 180,
                aqi: 180,
                category: 'unhealthy',
              },
              {
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                value: 140,
                aqi: 140,
                category: 'unhealthy_sensitive',
              },
              {
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                value: 90,
                aqi: 90,
                category: 'moderate',
              },
              {
                timestamp: new Date().toISOString(),
                value: 45,
                aqi: 45,
                category: 'good',
              },
            ]}
            title="High AQI Recovery Example"
            selectedRange="7d"
          />
        </div>

        {/* Info Section */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Component Features</h2>
          <ul className="space-y-2 text-white/80">
            <li>✅ Line chart visualization with Recharts</li>
            <li>✅ Date range selector (7d, 30d, 90d, 1y)</li>
            <li>✅ Color-coded AQI zones with gradient fill</li>
            <li>✅ Interactive tooltips on hover</li>
            <li>✅ AQI threshold reference lines</li>
            <li>✅ Glassmorphic styling</li>
            <li>✅ Loading state with skeleton</li>
            <li>✅ Empty state handling</li>
            <li>✅ Responsive design</li>
            <li>✅ Smooth animations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
