/**
 * AddDeviceModal Component
 * 
 * Modal for adding a new air quality sensor device.
 * Provides a form to input device name, device ID, and location.
 * 
 * Features:
 * - Form validation
 * - Loading states during submission
 * - Error handling
 * - Glassmorphic modal design
 * - Keyboard navigation (Esc to close)
 * 
 * Requirements: 11.6
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useAddDevice } from '@/lib/api/hooks/useDevices';
import type { AddDeviceRequest } from '@/lib/api/types';

export interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * AddDeviceModal Component
 * 
 * Modal dialog for adding a new sensor device.
 */
export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<AddDeviceRequest>({
    name: '',
    deviceId: '',
    location: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddDeviceRequest, string>>>({});
  
  const addDevice = useAddDevice();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        deviceId: '',
        location: '',
      });
      setErrors({});
    }
  }, [isOpen]);

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

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddDeviceRequest, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Device name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Device name must be at least 3 characters';
    }

    if (!formData.deviceId.trim()) {
      newErrors.deviceId = 'Device ID is required';
    } else if (formData.deviceId.length < 5) {
      newErrors.deviceId = 'Device ID must be at least 5 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    } else if (formData.location.length < 3) {
      newErrors.location = 'Location must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await addDevice.mutateAsync(formData);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to add device:', error);
      // Error is handled by the mutation
    }
  };

  // Handle input change
  const handleChange = (field: keyof AddDeviceRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="add-device-modal"
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
          relative w-full max-w-md
          bg-white/10 backdrop-blur-glass border border-white/18 
          rounded-2xl shadow-level3 p-6
          animate-fade-in
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-device-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="add-device-title"
            className="text-2xl font-bold text-white"
          >
            Add Device
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} data-testid="add-device-form">
          {/* Device Name */}
          <div className="mb-4">
            <label
              htmlFor="device-name"
              className="block text-sm font-medium text-white mb-2"
            >
              Device Name
            </label>
            <input
              id="device-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Living Room Sensor"
              className="
                w-full px-4 py-3 rounded-lg
                bg-white/10 border border-white/20
                text-white placeholder-white/40
                focus:outline-none focus:ring-2 focus:ring-white/40
                transition-all duration-200
              "
              data-testid="device-name-input"
              disabled={addDevice.isPending}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400" data-testid="name-error">
                {errors.name}
              </p>
            )}
          </div>

          {/* Device ID */}
          <div className="mb-4">
            <label
              htmlFor="device-id"
              className="block text-sm font-medium text-white mb-2"
            >
              Device ID
            </label>
            <input
              id="device-id"
              type="text"
              value={formData.deviceId}
              onChange={(e) => handleChange('deviceId', e.target.value)}
              placeholder="e.g., sensor-12345"
              className="
                w-full px-4 py-3 rounded-lg
                bg-white/10 border border-white/20
                text-white placeholder-white/40
                focus:outline-none focus:ring-2 focus:ring-white/40
                transition-all duration-200
              "
              data-testid="device-id-input"
              disabled={addDevice.isPending}
            />
            {errors.deviceId && (
              <p className="mt-1 text-sm text-red-400" data-testid="device-id-error">
                {errors.deviceId}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="mb-6">
            <label
              htmlFor="device-location"
              className="block text-sm font-medium text-white mb-2"
            >
              Location
            </label>
            <input
              id="device-location"
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Living Room, Delhi"
              className="
                w-full px-4 py-3 rounded-lg
                bg-white/10 border border-white/20
                text-white placeholder-white/40
                focus:outline-none focus:ring-2 focus:ring-white/40
                transition-all duration-200
              "
              data-testid="device-location-input"
              disabled={addDevice.isPending}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-400" data-testid="location-error">
                {errors.location}
              </p>
            )}
          </div>

          {/* Error Message */}
          {addDevice.isError && (
            <div
              className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 flex items-start gap-2"
              data-testid="error-message"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                {addDevice.error?.message || 'Failed to add device. Please try again.'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-white/10 hover:bg-white/20 border border-white/20
                text-white font-medium
                transition-all duration-200 hover:scale-[0.98]
              "
              data-testid="cancel-button"
              disabled={addDevice.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-white/20 hover:bg-white/30 border border-white/30
                text-white font-medium
                transition-all duration-200 hover:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
              data-testid="submit-button"
              disabled={addDevice.isPending}
            >
              {addDevice.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Device
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeviceModal;
