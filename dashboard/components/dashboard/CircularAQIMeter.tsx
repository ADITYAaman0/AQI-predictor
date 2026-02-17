/**
 * CircularAQIMeter Component
 * 
 * A circular progress ring that displays AQI value with animated fill.
 * Features gradient stroke matching AQI color and glow effect.
 * 
 * Features:
 * - SVG-based circular progress ring
 * - Gradient stroke matching AQI category color
 * - Smooth animation (1.5s ease-out) from 0 to AQI value
 * - Glow effect using drop-shadow filter
 * - Responsive sizing
 * - Threshold crossing animation (Property 16)
 * 
 * Requirements: 2.3, 2.4, 2.5, 12.1, Property 23
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useCountUp, useThresholdCrossing } from '@/lib/hooks';

// AQI thresholds for threshold crossing detection
const AQI_THRESHOLDS = [50, 100, 150, 200, 300]; // Good, Moderate, Unhealthy, Very Unhealthy, Hazardous

// ============================================================================
// Props Interface
// ============================================================================

export interface CircularAQIMeterProps {
  /** Current AQI value (0-500) */
  aqi: number;
  /** Color code for the AQI category */
  color: string;
  /** Size of the meter in pixels (default: 240) */
  size?: number;
  /** Stroke width in pixels (default: 8) */
  strokeWidth?: number;
  /** Whether to animate on mount (default: true) */
  animate?: boolean;
  /** Animation duration in milliseconds (default: 1500) */
  animationDuration?: number;
}

// ============================================================================
// Component
// ============================================================================

export const CircularAQIMeter: React.FC<CircularAQIMeterProps> = ({
  aqi,
  color,
  size = 240,
  strokeWidth = 8,
  animate = true,
  animationDuration = 1500,
}) => {
  // Use custom animation hook for number count-up (Property 23)
  const animatedProgress = useCountUp(aqi, animationDuration, 0);
  
  // Detect threshold crossings for flash/glow animation (Property 16)
  const { isAnimating: isThresholdAnimating } = useThresholdCrossing(aqi, AQI_THRESHOLDS);

  // Calculate dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress percentage (AQI max is 500)
  const animatedPercentage = Math.min((animatedProgress / 500) * 100, 100);

  // Calculate stroke dash offset for progress
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  // Create gradient ID (unique per instance)
  const gradientId = `aqi-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const glowFilterId = `aqi-glow-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div 
      className="circular-aqi-meter relative"
      style={{ width: size, height: size }}
      data-testid="circular-aqi-meter"
    >
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Define gradient for stroke */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>

          {/* Define glow filter */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor={color} floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle (track) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          data-testid="aqi-meter-track"
        />

        {/* Progress circle (animated with threshold crossing glow) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter={`url(#${glowFilterId})`}
          className={`transition-all duration-300 ease-out ${isThresholdAnimating ? 'animate-pulse' : ''}`}
          data-testid="aqi-meter-progress"
          style={{
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* Center content (AQI value) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div 
          className="text-[72px] font-bold leading-none transition-colors duration-300"
          style={{ color }}
          data-testid="aqi-meter-value"
        >
          {Math.round(animatedProgress)}
        </div>
        <div className="text-sm text-gray-300 mt-1 font-medium">AQI</div>
      </div>
    </div>
  );
};

export default CircularAQIMeter;
