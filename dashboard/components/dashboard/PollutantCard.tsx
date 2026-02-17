/**
 * PollutantCard Component
 * 
 * Displays individual pollutant metrics with visual indicators.
 * Shows pollutant name, icon, value, unit, progress bar, and status.
 * 
 * Features:
 * - Glassmorphic card styling
 * - Color-coded based on AQI sub-index
 * - Animated progress bar (fills on mount)
 * - Hover lift effect (4px translate with enhanced shadow)
 * - Tooltip with detailed information
 * 
 * Requirements: 3.1, 3.2
 */

'use client';

import React, { useState } from 'react';
import { PollutantType } from '@/lib/api/types';

// ============================================================================
// Props Interface
// ============================================================================

export interface PollutantCardProps {
  /** Pollutant type (pm25, pm10, o3, no2, so2, co) */
  pollutant: PollutantType;
  /** Numeric value of the pollutant */
  value: number;
  /** Unit of measurement (μg/m³ or mg/m³) */
  unit: string;
  /** AQI sub-index for this pollutant */
  aqi: number;
  /** Status label (good, moderate, unhealthy, etc.) */
  status: string;
  /** Icon component or element */
  icon?: React.ReactNode;
  /** Percentage for progress bar (0-100) */
  percentage?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get pollutant display name
 */
const getPollutantName = (pollutant: PollutantType): string => {
  const names: Record<PollutantType, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    o3: 'O₃',
    no2: 'NO₂',
    so2: 'SO₂',
    co: 'CO',
  };
  return names[pollutant] || pollutant.toUpperCase();
};

/**
 * Get default icon for pollutant
 * Enhanced icon set with distinct visuals for each pollutant type
 * Requirements: 3.3
 */
const getDefaultIcon = (pollutant: PollutantType): React.ReactNode => {
  const iconProps = {
    className: "w-8 h-8",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (pollutant) {
    case 'pm25':
      // Fine particulate matter - small dots pattern
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          <circle cx="17" cy="7" r="1.5" fill="currentColor" />
          <circle cx="7" cy="17" r="1.5" fill="currentColor" />
          <circle cx="17" cy="17" r="1.5" fill="currentColor" />
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 'pm10':
      // Coarse particulate matter - larger dots pattern
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="6" cy="8" r="2" fill="currentColor" />
          <circle cx="18" cy="8" r="2" fill="currentColor" />
          <circle cx="6" cy="16" r="2" fill="currentColor" />
          <circle cx="18" cy="16" r="2" fill="currentColor" />
        </svg>
      );
    case 'o3':
      // Ozone - cloud with sun rays
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    case 'no2':
      // Nitrogen dioxide - smoke/gas waves
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <path d="M3 12c0-2.5 2-4 4-4s4 1.5 4 4" />
          <path d="M11 12c0-2.5 2-4 4-4s4 1.5 4 4" />
          <path d="M3 16c0-2 1.5-3.5 3.5-3.5S10 14 10 16" />
          <path d="M11 16c0-2 1.5-3.5 3.5-3.5S18 14 18 16" />
          <path d="M3 20c0-1.5 1-2.5 2.5-2.5S8 18.5 8 20" />
          <path d="M11 20c0-1.5 1-2.5 2.5-2.5S16 18.5 16 20" />
        </svg>
      );
    case 'so2':
      // Sulfur dioxide - industrial smoke
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <rect x="6" y="14" width="12" height="6" rx="1" />
          <path d="M9 14V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
          <path d="M10 7V4" />
          <path d="M14 7V4" />
          <path d="M8 4c0-1 .5-2 1.5-2S11 3 11 4" />
          <path d="M13 4c0-1 .5-2 1.5-2S16 3 16 4" />
        </svg>
      );
    case 'co':
      // Carbon monoxide - exhaust/emission
      return (
        <svg {...iconProps} aria-label={`${getPollutantName(pollutant)} icon`}>
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
          <circle cx="9" cy="15" r="1" fill="currentColor" />
          <circle cx="15" cy="15" r="1" fill="currentColor" />
          <path d="M2 15h2" />
          <path d="M20 15h2" />
          <path d="M2 17h1" />
          <path d="M21 17h1" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Get color based on AQI sub-index
 * Maps AQI values to category colors as per requirements
 * Requirements: 3.6
 * 
 * AQI Categories:
 * - Good (0-50): #4ADE80 (green)
 * - Moderate (51-100): #FCD34D (yellow)
 * - Unhealthy for Sensitive (101-150): #FB923C (orange)
 * - Unhealthy (151-200): #EF4444 (red)
 * - Very Unhealthy (201-300): #B91C1C (dark red)
 * - Hazardous (301+): #7C2D12 (brown)
 */
const getColorFromAQI = (aqi: number): string => {
  if (aqi <= 50) return '#4ADE80'; // Good - green
  if (aqi <= 100) return '#FCD34D'; // Moderate - yellow
  if (aqi <= 150) return '#FB923C'; // Unhealthy for Sensitive - orange
  if (aqi <= 200) return '#EF4444'; // Unhealthy - red
  if (aqi <= 300) return '#B91C1C'; // Very Unhealthy - dark red
  return '#7C2D12'; // Hazardous - brown
};

/**
 * Get status display text
 */
const getStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    good: 'Good',
    moderate: 'Moderate',
    unhealthy_sensitive: 'Unhealthy for Sensitive',
    unhealthy: 'Unhealthy',
    very_unhealthy: 'Very Unhealthy',
    hazardous: 'Hazardous',
  };
  return statusMap[status.toLowerCase()] || status;
};

// ============================================================================
// Component
// ============================================================================

export const PollutantCard: React.FC<PollutantCardProps> = ({
  pollutant,
  value,
  unit,
  aqi,
  status,
  icon,
  percentage,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const pollutantName = getPollutantName(pollutant);
  const displayIcon = icon || getDefaultIcon(pollutant);
  const color = getColorFromAQI(aqi);
  const statusDisplay = getStatusDisplay(status);
  
  // Calculate percentage if not provided (based on AQI)
  const progressPercentage = percentage !== undefined 
    ? percentage 
    : Math.min((aqi / 500) * 100, 100);

  // Animate progress bar on mount
  React.useEffect(() => {
    // Small delay to ensure animation is visible
    const timer = setTimeout(() => {
      setAnimatedProgress(progressPercentage);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [progressPercentage]);

  return (
    <div
      className="pollutant-card glass-card hover-lift relative overflow-hidden transition-all duration-300"
      style={{
        width: '200px',
        height: '180px',
        borderColor: color,
        borderWidth: '2px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`pollutant-card-${pollutant}`}
      data-pollutant={pollutant}
      data-aqi={aqi}
      role="article"
      aria-label={`${pollutantName} pollutant card`}
    >
      {/* Card Content */}
      <div className="p-4 flex flex-col h-full">
        {/* Header: Icon and Name */}
        <div className="flex items-center gap-2 mb-3">
          <div style={{ color }} aria-hidden="true">
            {displayIcon}
          </div>
          <h3 
            className="text-h3 font-semibold text-white"
            data-testid="pollutant-name"
          >
            {pollutantName}
          </h3>
        </div>

        {/* Value */}
        <div className="flex-1 flex flex-col justify-center mb-3">
          <div 
            className="text-display text-white mb-1"
            style={{ 
              fontSize: '48px',
              lineHeight: '1',
              fontWeight: '700',
            }}
            data-testid="pollutant-value"
          >
            {value.toFixed(1)}
          </div>
          <div 
            className="text-caption text-gray-400"
            data-testid="pollutant-unit"
          >
            {unit}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div 
            className="w-full bg-gray-700/50 rounded-full overflow-hidden"
            style={{ height: '8px' }}
            role="progressbar"
            aria-valuenow={animatedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pollutantName} level at ${animatedProgress.toFixed(0)}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${animatedProgress}%`,
                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
              }}
              data-testid="progress-bar-fill"
            />
          </div>
        </div>

        {/* Status Label */}
        <div 
          className="text-caption font-medium"
          style={{ color }}
          data-testid="pollutant-status"
        >
          {statusDisplay}
        </div>
      </div>

      {/* Tooltip on Hover */}
      {isHovered && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-center items-center text-center animate-fade-in"
          data-testid="pollutant-tooltip"
        >
          <div className="text-white text-sm mb-2">
            <strong>{pollutantName}</strong>
          </div>
          <div className="text-gray-300 text-xs mb-1">
            Value: {value.toFixed(2)} {unit}
          </div>
          <div className="text-gray-300 text-xs mb-1">
            AQI: {aqi}
          </div>
          <div className="text-gray-300 text-xs">
            Status: {statusDisplay}
          </div>
        </div>
      )}
    </div>
  );
};

export default PollutantCard;
