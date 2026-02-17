/**
 * DevicesList Component
 * 
 * Displays a grid of connected sensor devices with an "Add Device" button.
 * Fetches devices from the API and handles loading/error states.
 * 
 * Features:
 * - Grid layout (responsive: 1-3 columns)
 * - Device cards with status, location, battery
 * - "Add Device" button with dashed border
 * - Add Device Modal
 * - View Device Details Modal
 * - Remove device confirmation
 * - Loading and error states
 * - Auto-refresh every 5 minutes
 * 
 * Requirements: 11.5, 11.6, 11.7
 */

'use client';

import React, { useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { DeviceCard } from './DeviceCard';
import { AddDeviceModal } from './AddDeviceModal';
import { DeviceDetailsModal } from './DeviceDetailsModal';
import { useDevices, useRemoveDevice } from '@/lib/api/hooks/useDevices';
import type { SensorDevice } from '@/lib/api/types';

export interface DevicesListProps {
  className?: string;
}

/**
 * DevicesList Component
 * 
 * Displays connected sensor devices in a responsive grid layout with modals.
 */
export const DevicesList: React.FC<DevicesListProps> = ({
  className = '',
}) => {
  const { data: devices, isLoading, error, refetch } = useDevices();
  const removeDevice = useRemoveDevice();
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<SensorDevice | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Handle opening add device modal
  const handleAddDevice = () => {
    setIsAddModalOpen(true);
  };

  // Handle opening device details modal
  const handleViewDetails = (deviceId: string) => {
    const device = devices?.find((d) => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
      setIsDetailsModalOpen(true);
    }
  };

  // Handle device removal with confirmation
  const handleRemove = async (deviceId: string) => {
    const device = devices?.find((d) => d.id === deviceId);
    if (!device) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove "${device.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await removeDevice.mutateAsync(deviceId);
      } catch (error) {
        console.error('Failed to remove device:', error);
        alert('Failed to remove device. Please try again.');
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        data-testid="devices-list-loading"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          <p className="text-white/60 text-sm">Loading devices...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        data-testid="devices-list-error"
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Failed to Load Devices
            </h3>
            <p className="text-white/60 text-sm mb-4">
              {error.message || 'Unable to fetch devices. Please try again.'}
            </p>
            <button
              onClick={() => refetch()}
              className="
                px-4 py-2 bg-white/10 hover:bg-white/20 
                border border-white/20 rounded-lg text-white text-sm font-medium 
                transition-all duration-200 hover:scale-[0.98]
              "
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!devices || devices.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        data-testid="devices-list-empty"
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-8 h-8 text-white/60" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Devices Connected
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Connect your first air quality sensor to start monitoring.
            </p>
            <button
              onClick={handleAddDevice}
              className="
                px-6 py-3 bg-white/10 hover:bg-white/20 
                border border-white/20 rounded-lg text-white font-medium 
                transition-all duration-200 hover:scale-[0.98]
                flex items-center gap-2 mx-auto
              "
              data-testid="add-device-button-empty"
            >
              <Plus className="w-5 h-5" />
              Add Device
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Devices grid
  return (
    <>
      <div className={className} data-testid="devices-list">
        {/* Grid container */}
        <div
          className="
            grid gap-6
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-3
          "
          data-testid="devices-grid"
        >
          {/* Device cards */}
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onViewDetails={handleViewDetails}
              onRemove={handleRemove}
            />
          ))}

          {/* Add Device button */}
          <button
            onClick={handleAddDevice}
            className="
              bg-white/5 backdrop-blur-glass 
              border-2 border-dashed border-white/30 
              rounded-xl p-8
              shadow-glass transition-all duration-300 ease-out
              hover:translate-y-[-4px] hover:shadow-level2 hover:bg-white/10
              hover:border-white/40
              flex flex-col items-center justify-center gap-3
              min-h-[280px]
              group
            "
            data-testid="add-device-button"
            aria-label="Add new device"
          >
            {/* Plus icon with circular background */}
            <div
              className="
                w-16 h-16 rounded-full 
                bg-white/10 group-hover:bg-white/20
                border-2 border-dashed border-white/30 group-hover:border-white/40
                flex items-center justify-center
                transition-all duration-300
              "
            >
              <Plus className="w-8 h-8 text-white/60 group-hover:text-white/80" />
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">Add Device</p>
              <p className="text-white/60 text-sm">
                Connect a new air quality sensor
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          // Refetch devices after successful addition
          refetch();
        }}
      />

      <DeviceDetailsModal
        device={selectedDevice}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDevice(null);
        }}
      />
    </>
  );
};

export default DevicesList;
