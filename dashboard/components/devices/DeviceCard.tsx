'use client';

import React from 'react';
import { Wifi, WifiOff, Battery, BatteryLow, MapPin, Activity } from 'lucide-react';
import type { SensorDevice } from '@/lib/api/types';

export interface DeviceCardProps {
  device: SensorDevice;
  onViewDetails?: (deviceId: string) => void;
  onRemove?: (deviceId: string) => void;
  className?: string;
}

/**
 * DeviceCard Component
 * 
 * Displays a connected air quality sensor device with:
 * - Device name and status indicator
 * - Location information
 * - Battery level
 * - Last reading data
 * - Glassmorphic styling with hover effects
 * 
 * Requirements: 11.2, 11.3, 11.4
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onViewDetails,
  onRemove,
  className = '',
}) => {
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
        return <Wifi className="w-4 h-4" />;
      case 'low_battery':
        return <BatteryLow className="w-4 h-4" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Get battery icon based on level
  const getBatteryIcon = (level: number) => {
    if (level <= 20) {
      return <BatteryLow className="w-4 h-4 text-red-400" />;
    }
    return <Battery className="w-4 h-4 text-white/80" />;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      
      // Check if date is invalid
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  const statusColor = getStatusColor(device.status);
  const statusLabel = getStatusLabel(device.status);

  return (
    <div
      className={`
        bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-5 
        shadow-glass transition-all duration-300 ease-out
        hover:translate-y-[-4px] hover:shadow-level2 hover:bg-white/15
        ${className}
      `}
      data-testid="device-card"
      data-device-id={device.id}
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Status Indicator Dot */}
          <div
            className="relative flex items-center justify-center"
            data-testid="status-indicator"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColor }}
              aria-label={`Device status: ${statusLabel}`}
            />
            {device.status === 'connected' && (
              <div
                className="absolute w-3 h-3 rounded-full animate-ping"
                style={{ backgroundColor: statusColor, opacity: 0.5 }}
              />
            )}
          </div>

          {/* Device Name */}
          <div>
            <h3 className="text-lg font-semibold text-white" data-testid="device-name">
              {device.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getStatusIcon(device.status)}
              <span
                className="text-xs text-white/70"
                data-testid="device-status"
                style={{ color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Battery Level */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg"
          data-testid="battery-level"
          aria-label={`Battery level: ${device.batteryLevel}%`}
        >
          {getBatteryIcon(device.batteryLevel)}
          <span className="text-xs font-medium text-white">
            {device.batteryLevel}%
          </span>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-4 text-white/80">
        <MapPin className="w-4 h-4" />
        <span className="text-sm" data-testid="device-location">
          {device.location}
        </span>
      </div>

      {/* Last Reading */}
      <div
        className="bg-white/5 rounded-lg p-3 mb-4 border border-white/10"
        data-testid="last-reading"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 mb-1">Last Reading</p>
            <p className="text-2xl font-bold text-white" data-testid="last-reading-aqi">
              {device.lastReading.aqi}
            </p>
            <p className="text-xs text-white/60">AQI</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60" data-testid="last-reading-time">
              {formatTimestamp(device.lastReading.timestamp)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(device.id)}
            className="
              flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 
              border border-white/20 rounded-lg text-white text-sm font-medium 
              transition-all duration-200 hover:scale-[0.98]
            "
            data-testid="view-details-button"
            aria-label={`View details for ${device.name}`}
          >
            View Details
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(device.id)}
            className="
              px-3 py-2 bg-red-500/20 hover:bg-red-500/30 
              border border-red-500/40 rounded-lg text-red-300 text-sm font-medium 
              transition-all duration-200 hover:scale-[0.98]
            "
            data-testid="remove-button"
            aria-label={`Remove ${device.name}`}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default DeviceCard;
