'use client';

import React, { useState } from 'react';
import { AlertConfigurationCard } from './AlertConfigurationCard';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { CreateAlertRequest, Alert } from '@/lib/api/types';
import type { LocationInfo } from '@/components/common/LocationSelector';

export interface AlertConfigurationCardConnectedProps {
  onSuccess?: (alert: Alert) => void;
  onCancel?: () => void;
  initialLocation?: LocationInfo;
  favoriteLocations?: LocationInfo[];
  className?: string;
}

/**
 * Connected version of AlertConfigurationCard that integrates with the API
 * 
 * Features:
 * - Calls createAlert API endpoint
 * - Validates input data before submission
 * - Shows success/error messages
 * - Handles loading states
 */
export const AlertConfigurationCardConnected: React.FC<AlertConfigurationCardConnectedProps> = ({
  onSuccess,
  onCancel,
  initialLocation,
  favoriteLocations = [],
  className = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateAlert = async (alertRequest: CreateAlertRequest) => {
    // Clear previous messages
    setError(null);
    setSuccess(null);

    // Validate input data
    const validationError = validateAlertRequest(alertRequest);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const client = getAQIClient();
      
      // Transform the request to match backend API format
      const backendRequest = {
        location: {
          latitude: 0, // Will be extracted from location name
          longitude: 0,
        },
        location_name: alertRequest.location,
        threshold: alertRequest.threshold,
        channels: alertRequest.notificationChannels,
      };

      // Call the API
      const createdAlert = await client.createAlert(alertRequest);

      // Show success message
      setSuccess(`Alert created successfully for ${alertRequest.location}!`);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(createdAlert);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      // Handle different error types
      let errorMessage = 'Failed to create alert. Please try again.';

      if (err.response) {
        // HTTP error response
        const status = err.response.status;
        const data = err.response.data;

        if (status === 409) {
          errorMessage = 'An alert already exists for this location. Please choose a different location or update the existing alert.';
        } else if (status === 400) {
          errorMessage = data.detail || 'Invalid alert configuration. Please check your inputs.';
        } else if (status === 401) {
          errorMessage = 'You must be logged in to create alerts.';
        } else if (status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.message) {
        // Network or other error
        if (err.message.includes('Network Error') || err.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('Error creating alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Success Message */}
      {success && (
        <div
          className="mb-4 p-4 bg-green-500/20 border border-green-500/40 rounded-lg flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <svg
            className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-400 hover:text-green-300 transition-colors"
            aria-label="Dismiss success message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg flex items-start gap-3"
          role="alert"
          aria-live="assertive"
        >
          <svg
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label="Dismiss error message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Alert Configuration Card */}
      <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
        <AlertConfigurationCard
          onCreateAlert={handleCreateAlert}
          onCancel={onCancel}
          initialLocation={initialLocation}
          favoriteLocations={favoriteLocations}
          className={className}
        />
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-medium text-white">Creating alert...</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Validate alert request data
 * 
 * @param request - Alert request to validate
 * @returns Error message if validation fails, null if valid
 */
function validateAlertRequest(request: CreateAlertRequest): string | null {
  // Validate location
  if (!request.location || request.location.trim().length === 0) {
    return 'Please select a location for the alert.';
  }

  if (request.location.length > 100) {
    return 'Location name is too long (maximum 100 characters).';
  }

  // Validate threshold
  if (typeof request.threshold !== 'number' || isNaN(request.threshold)) {
    return 'Invalid threshold value.';
  }

  if (request.threshold < 0 || request.threshold > 500) {
    return 'Threshold must be between 0 and 500.';
  }

  // Validate condition
  if (request.condition !== 'above' && request.condition !== 'below') {
    return 'Invalid alert condition. Must be "above" or "below".';
  }

  // Validate notification channels
  if (!request.notificationChannels || request.notificationChannels.length === 0) {
    return 'Please select at least one notification channel.';
  }

  const validChannels = ['email', 'sms', 'push'];
  for (const channel of request.notificationChannels) {
    if (!validChannels.includes(channel)) {
      return `Invalid notification channel: ${channel}`;
    }
  }

  // All validations passed
  return null;
}

export default AlertConfigurationCardConnected;
