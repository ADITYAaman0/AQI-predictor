/**
 * HealthRecommendationsCard Component
 * 
 * Displays health recommendations based on current AQI level.
 * Provides contextual advice to help users protect their health.
 * 
 * Features:
 * - Dynamic recommendations based on AQI category
 * - Color-coded urgency levels
 * - Medical icon for visual identification
 * - "Learn more" link for additional information
 * - Glassmorphic styling
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

'use client';

import React from 'react';
import { AQICategory } from '@/lib/api/types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface HealthRecommendationsCardProps {
  /** Current AQI value */
  aqi: number;
  /** AQI category */
  category: AQICategory;
  /** Optional custom recommendations */
  recommendations?: string[];
  /** Optional learn more URL */
  learnMoreUrl?: string;
  /** Show loading state */
  isLoading?: boolean;
}

interface RecommendationConfig {
  recommendations: string[];
  urgencyColor: string;
  urgencyLabel: string;
  borderColor: string;
  iconColor: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get health recommendations based on AQI category
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
function getRecommendationsForCategory(category: AQICategory): RecommendationConfig {
  switch (category) {
    case 'good':
      // AQI 0-50: Good
      return {
        recommendations: [
          'Great day for outdoor activities',
          'Air quality is ideal for outdoor exercise',
          'No health precautions needed',
        ],
        urgencyColor: 'text-green-400',
        urgencyLabel: 'No Risk',
        borderColor: 'border-green-400/30',
        iconColor: 'text-green-400',
      };

    case 'moderate':
      // AQI 51-100: Moderate
      return {
        recommendations: [
          'Sensitive groups should limit prolonged outdoor exertion',
          'Unusually sensitive people should consider reducing prolonged outdoor activities',
          'Air quality is acceptable for most people',
        ],
        urgencyColor: 'text-yellow-400',
        urgencyLabel: 'Low Risk',
        borderColor: 'border-yellow-400/30',
        iconColor: 'text-yellow-400',
      };

    case 'unhealthy_sensitive':
      // AQI 101-150: Unhealthy for Sensitive Groups
      return {
        recommendations: [
          'Sensitive groups should limit prolonged outdoor exertion',
          'People with respiratory or heart conditions should reduce outdoor activities',
          'Children and older adults should take it easy',
          'Consider wearing a mask outdoors',
        ],
        urgencyColor: 'text-orange-400',
        urgencyLabel: 'Moderate Risk',
        borderColor: 'border-orange-400/30',
        iconColor: 'text-orange-400',
      };

    case 'unhealthy':
      // AQI 151-200: Unhealthy
      return {
        recommendations: [
          'Everyone should limit prolonged outdoor exertion',
          'Sensitive groups should avoid prolonged outdoor activities',
          'Wear a mask when going outside',
          'Keep windows closed and use air purifiers indoors',
        ],
        urgencyColor: 'text-red-400',
        urgencyLabel: 'High Risk',
        borderColor: 'border-red-400/30',
        iconColor: 'text-red-400',
      };

    case 'very_unhealthy':
      // AQI 201-300: Very Unhealthy
      return {
        recommendations: [
          'Everyone should limit outdoor exertion',
          'Sensitive groups should avoid all outdoor activities',
          'Wear N95 masks when going outside',
          'Use air purifiers and keep indoor air clean',
        ],
        urgencyColor: 'text-red-500',
        urgencyLabel: 'Very High Risk',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-500',
      };

    case 'hazardous':
      // AQI 301+: Hazardous
      return {
        recommendations: [
          'Everyone should avoid outdoor activities',
          'Stay indoors with windows and doors closed',
          'Use air purifiers indoors',
          'Wear N95 masks if you must go outside',
        ],
        urgencyColor: 'text-red-700',
        urgencyLabel: 'Emergency',
        borderColor: 'border-red-700/30',
        iconColor: 'text-red-700',
      };

    default:
      // Fallback for unknown categories
      return {
        recommendations: [
          'Monitor air quality conditions',
          'Follow local health advisories',
        ],
        urgencyColor: 'text-gray-400',
        urgencyLabel: 'Unknown',
        borderColor: 'border-gray-400/30',
        iconColor: 'text-gray-400',
      };
  }
}

// ============================================================================
// Component
// ============================================================================

export const HealthRecommendationsCard: React.FC<HealthRecommendationsCardProps> = ({
  aqi,
  category,
  recommendations: customRecommendations,
  learnMoreUrl = 'https://www.airnow.gov/aqi/aqi-basics/',
  isLoading = false,
}) => {
  // Get recommendations configuration
  const config = getRecommendationsForCategory(category);
  const displayRecommendations = customRecommendations || config.recommendations;

  // Loading state
  if (isLoading) {
    return (
      <div
        className="glass-card p-6 rounded-2xl"
        data-testid="health-recommendations-loading"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card p-6 rounded-2xl border-2 ${config.borderColor} transition-all duration-300`}
      data-testid="health-recommendations-card"
      data-aqi={aqi}
      data-category={category}
    >
      {/* Header with medical icon */}
      <div className="flex items-center gap-3 mb-4">
        {/* Medical Icon (Heart with pulse) */}
        <div
          className={`${config.iconColor} transition-colors duration-300`}
          data-testid="health-icon"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h3
            className="text-lg font-semibold text-white"
            data-testid="health-heading"
          >
            Health Recommendations
          </h3>
          <p
            className={`text-sm font-medium ${config.urgencyColor}`}
            data-testid="urgency-level"
          >
            {config.urgencyLabel}
          </p>
        </div>
      </div>

      {/* Recommendations list */}
      <ul
        className="space-y-3 mb-4"
        data-testid="recommendations-list"
      >
        {displayRecommendations.map((recommendation, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-white/90 text-sm"
            data-testid={`recommendation-${index}`}
          >
            {/* Bullet point */}
            <span className={`${config.urgencyColor} mt-1 flex-shrink-0`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <circle cx="10" cy="10" r="3" />
              </svg>
            </span>
            <span>{recommendation}</span>
          </li>
        ))}
      </ul>

      {/* Learn more link */}
      {learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 text-sm font-medium ${config.urgencyColor} hover:underline transition-all duration-200`}
          data-testid="learn-more-link"
        >
          <span>Learn more about air quality</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
};

export default HealthRecommendationsCard;
