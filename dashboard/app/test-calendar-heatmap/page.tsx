/**
 * Test page for CalendarHeatmap component
 * 
 * This page provides visual verification of the CalendarHeatmap component
 * with various data scenarios.
 */

'use client';

import { useState } from 'react';
import { CalendarHeatmap } from '@/components/insights/CalendarHeatmap';
import { HistoricalDataPoint } from '@/lib/api/types';

// Generate mock historical data for the past 90 days
function generateMockData(days: number = 90): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate random AQI values with some patterns
    let aqi: number;
    const dayOfWeek = date.getDay();
    
    // Weekends tend to have better air quality
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      aqi = Math.floor(Math.random() * 80) + 20; // 20-100
    } else {
      aqi = Math.floor(Math.random() * 200) + 50; // 50-250
    }
    
    // Add some seasonal variation
    const month = date.getMonth();
    if (month >= 10 || month <= 2) {
      // Winter months have worse air quality
      aqi += 50;
    }
    
    // Cap at 500
    aqi = Math.min(aqi, 500);
    
    let category: string;
    if (aqi <= 50) category = 'good';
    else if (aqi <= 100) category = 'moderate';
    else if (aqi <= 150) category = 'unhealthy_sensitive';
    else if (aqi <= 200) category = 'unhealthy';
    else if (aqi <= 300) category = 'very_unhealthy';
    else category = 'hazardous';
    
    data.push({
      timestamp: date.toISOString(),
      value: aqi,
      aqi,
      category,
    });
  }
  
  return data;
}

export default function TestCalendarHeatmapPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedData, setSelectedData] = useState<HistoricalDataPoint | null>(null);
  
  const mockData = generateMockData(90);
  
  const handleDateClick = (date: Date, data: HistoricalDataPoint | null) => {
    setSelectedDate(date);
    setSelectedData(data);
  };
  
  const handleToggleLoading = () => {
    setIsLoading(!isLoading);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            CalendarHeatmap Component Test
          </h1>
          <p className="text-white/70">
            Visual verification of the CalendarHeatmap component with various data scenarios
          </p>
        </div>
        
        {/* Controls */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={handleToggleLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Hide Loading State' : 'Show Loading State'}
            </button>
          </div>
        </div>
        
        {/* Selected Date Info */}
        {selectedDate && selectedData && (
          <div className="glass-card p-6 rounded-2xl mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Selected Date</h2>
            <div className="text-white">
              <p className="mb-2">
                <span className="text-white/70">Date:</span>{' '}
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="mb-2">
                <span className="text-white/70">AQI:</span> {selectedData.aqi}
              </p>
              <p>
                <span className="text-white/70">Category:</span> {selectedData.category}
              </p>
            </div>
          </div>
        )}
        
        {/* Calendar Heatmap - Default */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Default Calendar Heatmap
          </h2>
          <CalendarHeatmap
            data={mockData}
            isLoading={isLoading}
            onDateClick={handleDateClick}
          />
        </div>
        
        {/* Calendar Heatmap - Custom Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Custom Title
          </h2>
          <CalendarHeatmap
            data={mockData}
            title="Air Quality History - Delhi"
            isLoading={isLoading}
            onDateClick={handleDateClick}
          />
        </div>
        
        {/* Calendar Heatmap - Empty Data */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Empty Data
          </h2>
          <CalendarHeatmap
            data={[]}
            title="No Historical Data"
            isLoading={false}
          />
        </div>
        
        {/* Calendar Heatmap - Specific Month */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Specific Month (January 2024)
          </h2>
          <CalendarHeatmap
            data={mockData}
            title="January 2024"
            initialMonth={new Date('2024-01-15')}
            isLoading={isLoading}
            onDateClick={handleDateClick}
          />
        </div>
        
        {/* Color Legend Reference */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">
            Color Legend Reference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#4ADE80' }}></div>
              <div>
                <p className="text-white font-medium">Good</p>
                <p className="text-white/60 text-sm">0-50 AQI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#FCD34D' }}></div>
              <div>
                <p className="text-white font-medium">Moderate</p>
                <p className="text-white/60 text-sm">51-100 AQI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#FB923C' }}></div>
              <div>
                <p className="text-white font-medium">Unhealthy (SG)</p>
                <p className="text-white/60 text-sm">101-150 AQI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#EF4444' }}></div>
              <div>
                <p className="text-white font-medium">Unhealthy</p>
                <p className="text-white/60 text-sm">151-200 AQI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#B91C1C' }}></div>
              <div>
                <p className="text-white font-medium">Very Unhealthy</p>
                <p className="text-white/60 text-sm">201-300 AQI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#7C2D12' }}></div>
              <div>
                <p className="text-white font-medium">Hazardous</p>
                <p className="text-white/60 text-sm">301+ AQI</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Implementation Notes */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Implementation Notes
          </h2>
          <ul className="text-white/70 space-y-2 text-sm">
            <li>✅ Calendar view with color intensity mapping</li>
            <li>✅ Interactive tooltips on hover</li>
            <li>✅ Month navigation (previous/next)</li>
            <li>✅ Color-coded AQI levels</li>
            <li>✅ Glassmorphic styling</li>
            <li>✅ Responsive design</li>
            <li>✅ Loading state</li>
            <li>✅ Empty state handling</li>
            <li>✅ Date click callback</li>
            <li>✅ Legend with all AQI categories</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
