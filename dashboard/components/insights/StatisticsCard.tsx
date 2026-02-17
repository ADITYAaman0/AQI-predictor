/**
 * StatisticsCard Component
 * 
 * Displays a single statistical measure (min, max, mean, median) for AQI data.
 * Used in historical trends visualization to show key metrics.
 * 
 * Features:
 * - Displays statistic label and value
 * - Color-coded based on AQI value
 * - Shows AQI category label
 * - Glassmorphic styling
 * - Responsive design
 * 
 * Requirements: 19.3
 */

'use client';

import React from 'react';
import { getAQICategoryLabel, getAQICategoryColor } from '@/lib/utils/statisticsUtils';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StatisticsCardProps {
  /** Label for the statistic (e.g., "Average", "Minimum") */
  label: string;
  /** AQI value */
  value: number;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional test ID */
  testId?: string;
}

// ============================================================================
// Component
// ============================================================================

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  label,
  value,
  icon,
  testId,
}) => {
  const categoryLabel = getAQICategoryLabel(value);
  const categoryColor = getAQICategoryColor(value);

  return (
    <div
      className="glass-card p-4 rounded-xl transition-all duration-300 hover:scale-105"
      data-testid={testId || `statistics-card-${label.toLowerCase()}`}
    >
      {/* Header with icon and label */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="text-white/70" data-testid="statistics-card-icon">
            {icon}
          </div>
        )}
        <span
          className="text-white/70 text-sm font-medium"
          data-testid="statistics-card-label"
        >
          {label}
        </span>
      </div>

      {/* AQI Value */}
      <div className="mb-2">
        <div
          className="text-4xl font-bold text-white"
          style={{ color: categoryColor }}
          data-testid="statistics-card-value"
        >
          {Math.round(value)}
        </div>
      </div>

      {/* Category Label */}
      <div
        className="text-xs font-medium"
        style={{ color: categoryColor }}
        data-testid="statistics-card-category"
      >
        {categoryLabel}
      </div>
    </div>
  );
};

export default StatisticsCard;
