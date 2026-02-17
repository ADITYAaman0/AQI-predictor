/**
 * CalendarHeatmap Component
 * 
 * Displays historical AQI data in a calendar heatmap format.
 * Shows daily AQI values with color intensity based on pollution level.
 * 
 * Features:
 * - Calendar grid layout showing days of the month
 * - Color intensity mapping to AQI values
 * - Interactive tooltips on hover
 * - Month navigation
 * - Glassmorphic styling
 * - Responsive design
 * 
 * Requirements: 16.5
 * Properties: 37 (Heatmap Color Intensity)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { HistoricalDataPoint } from '@/lib/api/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CalendarHeatmapProps {
  /** Historical data points */
  data: HistoricalDataPoint[];
  /** Show loading state */
  isLoading?: boolean;
  /** Optional title override */
  title?: string;
  /** Callback when a date is clicked */
  onDateClick?: (date: Date, data: HistoricalDataPoint | null) => void;
  /** Initial month to display (defaults to current month) */
  initialMonth?: Date;
}

interface DayCell {
  date: Date;
  data: HistoricalDataPoint | null;
  isCurrentMonth: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Get AQI category color based on value
 * Maps AQI values to color intensity
 */
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#4ADE80'; // Good - Green
  if (aqi <= 100) return '#FCD34D'; // Moderate - Yellow
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive Groups - Orange
  if (aqi <= 200) return '#EF4444'; // Unhealthy - Red
  if (aqi <= 300) return '#B91C1C'; // Very Unhealthy - Dark Red
  return '#7C2D12'; // Hazardous - Brown
}

/**
 * Get AQI category label
 */
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy (SG)';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * Days of the week labels
 */
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find data point for a specific date
 */
function findDataForDate(data: HistoricalDataPoint[], date: Date): HistoricalDataPoint | null {
  return data.find(point => {
    const pointDate = parseISO(point.timestamp);
    return isSameDay(pointDate, date);
  }) || null;
}

/**
 * Generate calendar grid for a month
 */
function generateCalendarGrid(month: Date, data: HistoricalDataPoint[]): DayCell[][] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  
  // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = start.getDay();
  
  // Create array of weeks
  const weeks: DayCell[][] = [];
  let currentWeek: DayCell[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({
      date: new Date(start.getTime() - (firstDayOfWeek - i) * 24 * 60 * 60 * 1000),
      data: null,
      isCurrentMonth: false,
    });
  }
  
  // Add all days of the month
  days.forEach(day => {
    currentWeek.push({
      date: day,
      data: findDataForDate(data, day),
      isCurrentMonth: true,
    });
    
    // Start a new week on Sunday
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Fill remaining cells in the last week
  if (currentWeek.length > 0) {
    const remaining = 7 - currentWeek.length;
    for (let i = 1; i <= remaining; i++) {
      currentWeek.push({
        date: new Date(end.getTime() + i * 24 * 60 * 60 * 1000),
        data: null,
        isCurrentMonth: false,
      });
    }
    weeks.push(currentWeek);
  }
  
  return weeks;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Day cell component
 */
interface DayCellComponentProps {
  cell: DayCell;
  onClick: (date: Date, data: HistoricalDataPoint | null) => void;
}

const DayCellComponent: React.FC<DayCellComponentProps> = ({ cell, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const backgroundColor = cell.data 
    ? getAQIColor(cell.data.aqi)
    : cell.isCurrentMonth 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'transparent';
  
  const opacity = cell.isCurrentMonth ? 1 : 0.3;
  
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => onClick(cell.date, cell.data)}
        className={`
          w-full aspect-square rounded-lg transition-all duration-200
          flex flex-col items-center justify-center
          ${cell.data ? 'hover:scale-110 hover:shadow-lg cursor-pointer' : 'cursor-default'}
          ${!cell.isCurrentMonth ? 'opacity-30' : ''}
        `}
        style={{
          backgroundColor,
          opacity: cell.data ? opacity : opacity * 0.5,
        }}
        data-testid={`calendar-day-${format(cell.date, 'yyyy-MM-dd')}`}
      >
        <span className={`text-xs font-medium ${cell.data ? 'text-white' : 'text-white/50'}`}>
          {format(cell.date, 'd')}
        </span>
        {cell.data && (
          <span className="text-[10px] text-white/80 mt-0.5">
            {cell.data.aqi}
          </span>
        )}
      </button>
      
      {/* Tooltip */}
      {showTooltip && cell.data && (
        <div
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none"
          data-testid="calendar-tooltip"
        >
          <div
            className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-xl whitespace-nowrap"
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <p className="text-white/70 text-xs mb-1">
              {format(cell.date, 'MMM d, yyyy')}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getAQIColor(cell.data.aqi) }}
              ></div>
              <span className="text-white font-semibold text-sm">
                AQI: {cell.data.aqi}
              </span>
            </div>
            <p className="text-white/60 text-xs mt-1">
              {getAQICategory(cell.data.aqi)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  data,
  isLoading = false,
  title = 'Calendar Heatmap',
  onDateClick,
  initialMonth = new Date(),
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  
  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    return generateCalendarGrid(currentMonth, data);
  }, [currentMonth, data]);
  
  // Handle date click
  const handleDateClick = (date: Date, dataPoint: HistoricalDataPoint | null) => {
    if (onDateClick && dataPoint) {
      onDateClick(date, dataPoint);
    }
  };
  
  // Navigate to previous month
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="calendar-heatmap-loading"
      >
        <div className="mb-6">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse mt-2"></div>
        </div>
        <div className="h-80 bg-white/5 rounded-xl animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div
      className="glass-card p-6 rounded-2xl transition-all duration-300"
      data-testid="calendar-heatmap"
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className="text-lg font-semibold text-white mb-2"
          data-testid="calendar-heatmap-title"
        >
          {title}
        </h3>
        <p className="text-white/60 text-sm">
          Daily air quality values with color intensity based on pollution level
        </p>
      </div>
      
      {/* Month Navigation */}
      <div
        className="flex items-center justify-between mb-6"
        data-testid="month-navigation"
      >
        <button
          onClick={handlePreviousMonth}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200"
          data-testid="previous-month-button"
          aria-label="Previous month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        
        <h4
          className="text-white font-semibold text-lg"
          data-testid="current-month-label"
        >
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200"
          data-testid="next-month-button"
          aria-label="Next month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="mb-6" data-testid="calendar-grid">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAY_LABELS.map(day => (
            <div
              key={day}
              className="text-center text-white/50 text-xs font-medium py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="space-y-2">
          {calendarGrid.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((cell, dayIndex) => (
                <DayCellComponent
                  key={`${weekIndex}-${dayIndex}`}
                  cell={cell}
                  onClick={handleDateClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-white/70 text-xs mb-3">AQI Levels:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#4ADE80' }}
            ></div>
            <span className="text-white/70">Good (0-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#FCD34D' }}
            ></div>
            <span className="text-white/70">Moderate (51-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#FB923C' }}
            ></div>
            <span className="text-white/70">Unhealthy (SG) (101-150)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#EF4444' }}
            ></div>
            <span className="text-white/70">Unhealthy (151-200)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#B91C1C' }}
            ></div>
            <span className="text-white/70">Very Unhealthy (201-300)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#7C2D12' }}
            ></div>
            <span className="text-white/70">Hazardous (301+)</span>
          </div>
        </div>
      </div>
      
      {/* Info note */}
      <div className="mt-4">
        <p className="text-white/50 text-xs">
          Hover over a day to see detailed AQI information. Color intensity corresponds to pollution level.
        </p>
      </div>
    </div>
  );
};

export default CalendarHeatmap;
