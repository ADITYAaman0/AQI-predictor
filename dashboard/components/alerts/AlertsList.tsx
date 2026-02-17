'use client';

import React, { useState } from 'react';
import type { AlertSubscriptionResponse } from '@/lib/api/types';

export interface AlertsListProps {
  alerts: AlertSubscriptionResponse[];
  onEdit?: (alert: AlertSubscriptionResponse) => void;
  onDelete?: (alertId: string) => void;
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * AlertsList Component
 * 
 * Displays all user alerts with edit/delete functionality and status indicators.
 * 
 * Features:
 * - Display all user alerts in a list
 * - Show alert status (active/inactive)
 * - Edit alert configuration
 * - Delete alerts with confirmation
 * - Toggle alert active status
 * - Glassmorphic styling
 * - Responsive design
 * 
 * Requirements: 18.6
 */
export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
  className = '',
}) => {
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);
  const [togglingAlertId, setTogglingAlertId] = useState<string | null>(null);

  const handleDeleteClick = (alertId: string) => {
    setDeletingAlertId(alertId);
  };

  const handleConfirmDelete = () => {
    if (deletingAlertId && onDelete) {
      onDelete(deletingAlertId);
      setDeletingAlertId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingAlertId(null);
  };

  const handleToggleActive = async (alertId: string, currentStatus: boolean) => {
    if (onToggleActive) {
      setTogglingAlertId(alertId);
      try {
        await onToggleActive(alertId, !currentStatus);
      } finally {
        setTogglingAlertId(null);
      }
    }
  };

  // Format channel names for display
  const formatChannels = (channels: string[]): string => {
    return channels
      .map(channel => {
        switch (channel) {
          case 'email':
            return 'Email';
          case 'sms':
            return 'SMS';
          case 'push':
            return 'Push';
          default:
            return channel;
        }
      })
      .join(', ');
  };

  // Get AQI category color
  const getAQIColor = (threshold: number): string => {
    if (threshold <= 50) return '#4ADE80'; // Good
    if (threshold <= 100) return '#FCD34D'; // Moderate
    if (threshold <= 150) return '#FB923C'; // Unhealthy for Sensitive
    if (threshold <= 200) return '#FB923C'; // Unhealthy
    if (threshold <= 300) return '#EF4444'; // Very Unhealthy
    return '#7C2D12'; // Hazardous
  };

  // Get AQI category label
  const getAQICategoryLabel = (threshold: number): string => {
    if (threshold <= 50) return 'Good';
    if (threshold <= 100) return 'Moderate';
    if (threshold <= 150) return 'Unhealthy for Sensitive';
    if (threshold <= 200) return 'Unhealthy';
    if (threshold <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 animate-pulse"
          >
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4" />
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2" />
            <div className="h-4 bg-white/20 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        className={`bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-8 text-center ${className}`}
      >
        <svg
          className="w-16 h-16 mx-auto mb-4 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <h3 className="text-lg font-semibold text-white mb-2">No Alerts Yet</h3>
        <p className="text-sm text-white/70">
          Create your first alert to get notified when air quality changes.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="alerts-list">
      {alerts.map((alert) => {
        const thresholdColor = getAQIColor(alert.threshold);
        const categoryLabel = getAQICategoryLabel(alert.threshold);
        const isDeleting = deletingAlertId === alert.id;
        const isToggling = togglingAlertId === alert.id;

        return (
          <div
            key={alert.id}
            className="bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 transition-all duration-300 hover:bg-white/15 hover:shadow-level2"
            data-testid="alert-item"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Status Indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      alert.is_active ? 'bg-green-400' : 'bg-gray-400'
                    } ${alert.is_active ? 'animate-pulse' : ''}`}
                    title={alert.is_active ? 'Active' : 'Inactive'}
                    data-testid="alert-status-indicator"
                  />

                  {/* Location */}
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-white/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {alert.location_name || `${alert.location.coordinates.latitude.toFixed(2)}, ${alert.location.coordinates.longitude.toFixed(2)}`}
                  </h3>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.is_active
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                    }`}
                    data-testid="alert-status-badge"
                  >
                    {alert.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Created Date */}
                <p className="text-sm text-white/60">
                  Created {formatDate(alert.created_at)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Toggle Active Button */}
                <button
                  onClick={() => handleToggleActive(alert.id, alert.is_active)}
                  disabled={isToggling}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={alert.is_active ? 'Deactivate alert' : 'Activate alert'}
                  aria-label={alert.is_active ? 'Deactivate alert' : 'Activate alert'}
                >
                  {isToggling ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : alert.is_active ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </button>

                {/* Edit Button */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(alert)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="Edit alert"
                    aria-label="Edit alert"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                )}

                {/* Delete Button */}
                {onDelete && (
                  <button
                    onClick={() => handleDeleteClick(alert.id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                    title="Delete alert"
                    aria-label="Delete alert"
                  >
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Alert Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Threshold */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${thresholdColor}20`, borderColor: `${thresholdColor}40`, borderWidth: '1px' }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: thresholdColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Threshold</p>
                  <p className="text-sm font-semibold text-white">
                    AQI {alert.threshold}
                  </p>
                  <p className="text-xs text-white/50">{categoryLabel}</p>
                </div>
              </div>

              {/* Channels */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Notifications</p>
                  <p className="text-sm font-semibold text-white">
                    {formatChannels(alert.channels)}
                  </p>
                </div>
              </div>

              {/* Coordinates */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Coordinates</p>
                  <p className="text-sm font-mono text-white">
                    {alert.location.coordinates.latitude.toFixed(4)}, {alert.location.coordinates.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Confirmation */}
            {isDeleting && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                <p className="text-sm text-white mb-3">
                  Are you sure you want to delete this alert? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AlertsList;
