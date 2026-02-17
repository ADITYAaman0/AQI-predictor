/**
 * SourceAttributionCard Component
 * 
 * Displays source attribution data using a donut/pie chart.
 * Shows the breakdown of pollution sources (vehicular, industrial, biomass, background).
 * 
 * Features:
 * - Donut chart visualization using Recharts
 * - Legend with percentages
 * - Color-coded source categories
 * - Glassmorphic styling
 * - Interactive hover effects
 * 
 * Requirements: 16.1, 16.2
 */

'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SourceAttribution } from '@/lib/api/types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SourceAttributionCardProps {
  /** Source attribution data */
  sourceAttribution: SourceAttribution;
  /** Show loading state */
  isLoading?: boolean;
  /** Optional title override */
  title?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Color mapping for different pollution sources
 */
const SOURCE_COLORS = {
  vehicular: '#3B82F6', // Blue
  industrial: '#EF4444', // Red
  biomass: '#F59E0B', // Amber
  background: '#6B7280', // Gray
};

/**
 * Display labels for pollution sources
 */
const SOURCE_LABELS = {
  vehicular: 'Vehicular',
  industrial: 'Industrial',
  biomass: 'Biomass Burning',
  background: 'Background',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform source attribution data to chart format
 */
function transformToChartData(sourceAttribution: SourceAttribution): ChartDataItem[] {
  const data: ChartDataItem[] = [];

  if (sourceAttribution.vehicular > 0) {
    data.push({
      name: 'vehicular',
      value: sourceAttribution.vehicular,
      color: SOURCE_COLORS.vehicular,
      label: SOURCE_LABELS.vehicular,
    });
  }

  if (sourceAttribution.industrial > 0) {
    data.push({
      name: 'industrial',
      value: sourceAttribution.industrial,
      color: SOURCE_COLORS.industrial,
      label: SOURCE_LABELS.industrial,
    });
  }

  if (sourceAttribution.biomass > 0) {
    data.push({
      name: 'biomass',
      value: sourceAttribution.biomass,
      color: SOURCE_COLORS.biomass,
      label: SOURCE_LABELS.biomass,
    });
  }

  if (sourceAttribution.background > 0) {
    data.push({
      name: 'background',
      value: sourceAttribution.background,
      color: SOURCE_COLORS.background,
      label: SOURCE_LABELS.background,
    });
  }

  return data;
}

/**
 * Custom label renderer for pie chart
 */
const renderCustomLabel = (entry: any) => {
  return `${entry.value}%`;
};

/**
 * Get detailed description for each pollution source
 */
function getSourceDescription(sourceName: string): string {
  const descriptions: Record<string, string> = {
    vehicular: 'Emissions from cars, trucks, buses, and other motor vehicles including exhaust gases and particulate matter from combustion and tire wear.',
    industrial: 'Pollution from factories, power plants, and industrial facilities including smoke, chemical emissions, and particulate matter from manufacturing processes.',
    biomass: 'Smoke and particulates from burning of agricultural waste, wood, and other organic materials, often seasonal and weather-dependent.',
    background: 'Natural and long-range transported pollution including dust, sea salt, and pollutants carried from distant sources by wind patterns.',
  };
  return descriptions[sourceName] || 'No description available.';
}

// ============================================================================
// Component
// ============================================================================

export const SourceAttributionCard: React.FC<SourceAttributionCardProps> = ({
  sourceAttribution,
  isLoading = false,
  title = 'Pollution Sources',
}) => {
  // State for active segment
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = React.useState<ChartDataItem | null>(null);

  // Transform data for chart
  const chartData = transformToChartData(sourceAttribution);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="source-attribution-loading"
      >
        <div className="mb-6">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse mt-2"></div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-48 h-48 bg-white/10 rounded-full animate-pulse"></div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="source-attribution-empty"
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/60 text-sm mb-6">
          Source attribution data breakdown
        </p>
        <div className="flex items-center justify-center h-64 text-white/40">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm">No source attribution data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 rounded-2xl transition-all duration-300"
      data-testid="source-attribution-card"
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className="text-lg font-semibold text-white mb-2"
          data-testid="source-attribution-title"
        >
          {title}
        </h3>
        <p className="text-white/60 text-sm">
          Breakdown of pollution sources contributing to current air quality
        </p>
      </div>

      {/* Donut Chart */}
      <div className="h-64 mb-6" data-testid="source-attribution-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(data) => {
                setSelectedSegment(data as ChartDataItem);
              }}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={2}
                  style={{
                    filter: activeIndex === index ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              itemStyle={{
                color: '#fff',
                fontSize: '14px',
              }}
              formatter={(value: number, name: string, entry: any) => [
                `${value}%`,
                entry.payload.label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div
          className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in"
          data-testid="selected-segment-details"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selectedSegment.color }}
              ></div>
              <h4 className="text-white font-semibold">{selectedSegment.label}</h4>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Close details"
              data-testid="close-details-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm">Contribution</span>
              <span className="text-white font-bold text-lg">{selectedSegment.value}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${selectedSegment.value}%`,
                  backgroundColor: selectedSegment.color,
                }}
              ></div>
            </div>
            <p className="text-white/60 text-xs mt-3">
              {getSourceDescription(selectedSegment.name)}
            </p>
          </div>
        </div>
      )}

      {/* Legend with percentages */}
      <div className="space-y-3" data-testid="source-attribution-legend">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all duration-200 hover:scale-[1.02]"
            data-testid={`legend-item-${item.name}`}
            onClick={() => setSelectedSegment(item)}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{
              backgroundColor: activeIndex === index ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Color indicator */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 transition-all duration-200"
                style={{
                  backgroundColor: item.color,
                  boxShadow: activeIndex === index ? `0 0 8px ${item.color}` : 'none',
                  transform: activeIndex === index ? 'scale(1.2)' : 'scale(1)',
                }}
              ></div>
              {/* Source label */}
              <span className="text-white/90 text-sm font-medium">
                {item.label}
              </span>
            </div>
            {/* Percentage */}
            <span
              className="text-white font-semibold text-sm"
              data-testid={`legend-value-${item.name}`}
            >
              {item.value}%
            </span>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-white/50 text-xs">
          Source attribution is estimated using machine learning models and may vary based on
          meteorological conditions and local emissions.
        </p>
      </div>
    </div>
  );
};

export default SourceAttributionCard;
