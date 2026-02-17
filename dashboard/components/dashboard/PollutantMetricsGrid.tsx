/**
 * PollutantMetricsGrid Component
 * 
 * Arranges PollutantCard components in a responsive grid layout.
 * Adapts to different viewport sizes:
 * - Desktop (≥1024px): 3 columns (2 rows)
 * - Tablet (768-1023px): 2 columns (3 rows)
 * - Mobile (<768px): 1 column (6 rows)
 * 
 * Features:
 * - Responsive grid layout
 * - Automatic card arrangement
 * - Proper spacing and alignment
 * - Handles different viewport sizes
 * 
 * Requirements: 3.7, 7.2
 */

'use client';

import React from 'react';
import { PollutantCard, PollutantCardProps } from './PollutantCard';

// ============================================================================
// Props Interface
// ============================================================================

export interface PollutantMetricsGridProps {
  /** Array of pollutant data to display */
  pollutants: PollutantCardProps[];
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const PollutantMetricsGrid: React.FC<PollutantMetricsGridProps> = ({
  pollutants,
  className = '',
}) => {
  return (
    <div
      className={`pollutant-metrics-grid w-full ${className}`}
      data-testid="pollutant-metrics-grid"
      role="region"
      aria-label="Pollutant metrics"
    >
      {/* Responsive Grid Container */}
      <div
        className="grid gap-4 w-full justify-items-center
                   grid-cols-1 max-w-[200px] mx-auto
                   md:grid-cols-2 md:max-w-none md:justify-center
                   lg:grid-cols-3"
        data-testid="pollutant-grid-container"
      >
        {pollutants.map((pollutant, index) => (
          <PollutantCard
            key={`${pollutant.pollutant}-${index}`}
            {...pollutant}
          />
        ))}
      </div>
    </div>
  );
};

export default PollutantMetricsGrid;
