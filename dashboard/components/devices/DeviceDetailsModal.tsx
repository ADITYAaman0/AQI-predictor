/**
 * DeviceDetailsModal Component
 * 
 * Modal for viewing detailed information about a sensor device.
 * Displays comprehensive device information including status, readings, and history.
 * 
 * Features:
 * - Device status and connection information
 * - Battery level and last reading
 * - Location details
 * - Glassmorphic modal design
 * - Keyboard navigation (Esc to close)
 * 
 * Requirements: 11.6
 */

'use client';

import React, { useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  MapPin,
  Activity,
  Calendar,
  Signal,
} from 'lucide-react';
import type { SensorDevice } from '@/lib/api/types';

export interface DeviceDetailsModalProps {
  device: SensorDevice | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DeviceDetailsModal Component
 * 
 * Modal dialog for viewing detailed device information.
 */
export const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({
  device,
  isOpen,
  onClose,
}) => {
  // Handle Esc key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !device) return null;

  // Get status indicator color based on device status
  const getStatusColor = (status: SensorDevice['status']): string => {
    switch (status) {
      case 'connected':
        return '#4ADE80'; // Green
      case 'low_battery':
        return '#FCD34D'; // Yellow
      case 'disconnected':
        return '#EF4444'; // Red
      default:
        return '#9CA3AF'; // Gray
    }
  };

  // Get status label
  const getStatusLabel = (status: SensorDevice['status']): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'low_battery':
        return 'Low Battery';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  // Get status icon
  const getStatusIcon = (status: SensorDevice['status']) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-5 h-5" />;
      case 'low_battery':
        return <BatteryLow className="w-5 h-5" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  // Get battery icon based on level
  const getBatteryIcon = (level: number) => {
    if (level <= 20) {
      return <BatteryLow className="w-5 h-5 text-red-400" />;
    }
    return <Battery className="w-5 h-5 text-white/80" />;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch {
      return 'Unknown';
    }
  };

  const statusColor = getStatusColor(device.status);
  const statusLabel = getStatusLabel(device.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="device-details-modal"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-lg
          bg-white/10 backdrop-blur-glass border border-white/18 
          rounded-2xl shadow-level3 p-6
          animate-fade-in
          max-h-[90vh] overflow-y-auto
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-details-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2
              id="device-details-title"
              className="text-2xl font-bold text-white mb-1"
            >
              {device.name}
            </h2>
            <div className="flex items-center gap-2">
              {getStatusIcon(device.status)}
              <span
                className="text-sm font-medium"
                style={{ color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg bg-white/10 hover:bg-white/20 
              transition-colors duration-200
            "
            aria-label="Close modal"
            data-testid="close-button"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: statusColor }}
              aria-label={`Device status: ${statusLabel}`}
            />
            <span className="text-white font-medium">Connection Status</span>
          </div>
          <p className="text-white/70 text-sm">
            {device.status === 'connected' && 'Device is online and transmitting data.'}
            {device.status === 'low_battery' && 'Device battery is running low. Please charge soon.'}
            {device.status === 'disconnected' && 'Device is offline. Check connection.'}
          </p>
        </div>

        {/* Device Information */}
        <div className="space-y-4 mb-6">
          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <MapPin className="w-5 h-5 text-white/80" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-sm mb-1">Location</p>
              <p className="text-white font-medium">{device.location}</p>
            </div>
          </div>

          {/* Battery Level */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              {getBatteryIcon(device.batteryLevel)}
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-sm mb-1">Battery Level</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${device.batteryLevel}%`,
                      backgroundColor:
                        device.batteryLevel <= 20
                          ? '#EF4444'
                          : device.batteryLevel <= 50
                          ? '#FCD34D'
                          : '#4ADE80',
                    }}
                  />
                </div>
                <span className="text-white font-medium">{device.batteryLevel}%</span>
              </div>
            </div>
          </div>

          {/* Device ID */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Signal className="w-5 h-5 text-white/80" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-sm mb-1">Device ID</p>
              <p className="text-white font-mono text-sm">{device.id}</p>
            </div>
          </div>
        </div>

        {/* Last Reading */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Last Reading
          </h3>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/60 text-sm mb-1">AQI Value</p>
                <p className="text-4xl font-bold text-white">
                  {device.lastReading.aqi}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm mb-1">Recorded</p>
                <p className="text-white text-sm font-medium">
                  {formatRelativeTime(device.lastReading.timestamp)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <Calendar className="w-4 h-4" />
              <span>{formatTimestamp(device.lastReading.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-3 rounded-lg
              bg-white/10 hover:bg-white/20 border border-white/20
              text-white font-medium
              transition-all duration-200 hover:scale-[0.98]
            "
            data-testid="close-details-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailsModal;
