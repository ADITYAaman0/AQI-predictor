'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertsList } from './AlertsList';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { AlertSubscriptionResponse } from '@/lib/api/types';

export interface AlertsListConnectedProps {
  onEdit?: (alert: AlertSubscriptionResponse) => void;
  className?: string;
}

/**
 * Connected version of AlertsList that integrates with the API
 * 
 * Features:
 * - Fetches alerts from the API
 * - Handles delete operations
 * - Handles toggle active/inactive operations
 * - Shows loading and error states
 * - Automatically refetches after mutations
 */
export const AlertsListConnected: React.FC<AlertsListConnectedProps> = ({
  onEdit,
  className = '',
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch alerts
  const {
    data: alerts = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const client = getAQIClient();
      return client.getAlerts();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Delete alert mutation
  const deleteMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const client = getAQIClient();
      await client.deleteAlert(alertId);
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setSuccessMessage('Alert deleted successfully');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
    onError: (err: any) => {
      let errorMessage = 'Failed to delete alert. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 404) {
          errorMessage = 'Alert not found. It may have already been deleted.';
        } else if (status === 401) {
          errorMessage = 'You must be logged in to delete alerts.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to delete this alert.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setSuccessMessage(null);
      console.error('Error deleting alert:', err);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ alertId, isActive }: { alertId: string; isActive: boolean }) => {
      const client = getAQIClient();
      
      // Find the alert to get its current configuration
      const alert = alerts.find(a => a.id === alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      // Update the alert with the new active status
      await client.updateAlert(alertId, {
        threshold: alert.threshold,
        channels: alert.channels,
        is_active: isActive,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setSuccessMessage(
        variables.isActive
          ? 'Alert activated successfully'
          : 'Alert deactivated successfully'
      );
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
    onError: (err: any) => {
      let errorMessage = 'Failed to update alert status. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 404) {
          errorMessage = 'Alert not found.';
        } else if (status === 401) {
          errorMessage = 'You must be logged in to update alerts.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to update this alert.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setSuccessMessage(null);
      console.error('Error toggling alert status:', err);
    },
  });

  const handleDelete = (alertId: string) => {
    deleteMutation.mutate(alertId);
  };

  const handleToggleActive = async (alertId: string, isActive: boolean) => {
    await toggleActiveMutation.mutateAsync({ alertId, isActive });
  };

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div
          className="p-4 bg-green-500/20 border border-green-500/40 rounded-lg flex items-start gap-3"
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
            <p className="text-sm font-medium text-white">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
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
      {(error || fetchError) && (
        <div
          className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg flex items-start gap-3"
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
            <p className="text-sm font-medium text-white">
              {error || (fetchError as any)?.message || 'Failed to load alerts'}
            </p>
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

      {/* Alerts List */}
      <AlertsList
        alerts={alerts}
        onEdit={onEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        isLoading={isLoading}
        className={className}
      />
    </div>
  );
};

export default AlertsListConnected;
