'use client';

import React, { useState } from 'react';
import { Bell, Mail, Smartphone, MessageSquare, AlertTriangle } from 'lucide-react';
import { LocationSelector, LocationInfo } from '@/components/common/LocationSelector';
import type { NotificationChannel, CreateAlertRequest } from '@/lib/api/types';

export interface AlertConfigurationCardProps {
  onCreateAlert?: (alert: CreateAlertRequest) => void;
  onCancel?: () => void;
  initialLocation?: LocationInfo;
  favoriteLocations?: LocationInfo[];
  className?: string;
}

export const AlertConfigurationCard: React.FC<AlertConfigurationCardProps> = ({
  onCreateAlert,
  onCancel,
  initialLocation,
  favoriteLocations = [],
  className = '',
}) => {
  // Default location if not provided
  const defaultLocation: LocationInfo = initialLocation || {
    id: 'default',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const [selectedLocation, setSelectedLocation] = useState<LocationInfo>(defaultLocation);
  const [threshold, setThreshold] = useState<number>(150);
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(['email']);

  // AQI threshold marks for the slider
  const aqiThresholds = [
    { value: 0, label: 'Good', color: '#4ADE80' },
    { value: 50, label: 'Moderate', color: '#FCD34D' },
    { value: 100, label: 'Unhealthy (SG)', color: '#FB923C' },
    { value: 150, label: 'Unhealthy', color: '#EF4444' },
    { value: 200, label: 'Very Unhealthy', color: '#B91C1C' },
    { value: 300, label: 'Hazardous', color: '#7C2D12' },
  ];

  // Get AQI category based on threshold value
  const getAQICategory = (value: number): { label: string; color: string } => {
    if (value <= 50) return { label: 'Good', color: '#4ADE80' };
    if (value <= 100) return { label: 'Moderate', color: '#FCD34D' };
    if (value <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#FB923C' };
    if (value <= 200) return { label: 'Unhealthy', color: '#EF4444' };
    if (value <= 300) return { label: 'Very Unhealthy', color: '#B91C1C' };
    return { label: 'Hazardous', color: '#7C2D12' };
  };

  const currentCategory = getAQICategory(threshold);

  // Toggle notification channel
  const toggleChannel = (channel: NotificationChannel) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channel)) {
        // Don't allow removing the last channel
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== channel);
      }
      return [...prev, channel];
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onCreateAlert) {
      const alertRequest: CreateAlertRequest = {
        location: selectedLocation.name,
        threshold,
        condition,
        notificationChannels: selectedChannels,
      };
      onCreateAlert(alertRequest);
    }
  };

  // Notification channel options
  const channelOptions: Array<{
    id: NotificationChannel;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: 'email',
      label: 'Email',
      icon: <Mail className="w-5 h-5" />,
      description: 'Receive alerts via email',
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: <Smartphone className="w-5 h-5" />,
      description: 'Receive alerts via text message',
    },
    {
      id: 'push',
      label: 'Push Notification',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Receive browser push notifications',
    },
  ];

  return (
    <div
      className={`bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6 shadow-glass ${className}`}
      data-testid="alert-configuration-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white/10 rounded-lg">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Configure Alert</h2>
          <p className="text-sm text-white/60">Set up notifications for air quality changes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Selector */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Location
          </label>
          <LocationSelector
            currentLocation={selectedLocation}
            favoriteLocations={favoriteLocations}
            onLocationChange={setSelectedLocation}
            className="w-full"
          />
          <p className="mt-1 text-xs text-white/60">
            Select the location you want to monitor
          </p>
        </div>

        {/* Threshold Slider */}
        <div>
          <label htmlFor="threshold-slider" className="block text-sm font-medium text-white mb-2">
            AQI Threshold: {threshold}
          </label>
          
          {/* Current Category Display */}
          <div
            className="mb-3 px-4 py-2 rounded-lg border-2 flex items-center gap-2"
            style={{
              backgroundColor: `${currentCategory.color}20`,
              borderColor: currentCategory.color,
            }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: currentCategory.color }} />
            <span className="text-sm font-medium text-white">
              {currentCategory.label}
            </span>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              id="threshold-slider"
              type="range"
              min="0"
              max="500"
              step="10"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, 
                  #4ADE80 0%, 
                  #4ADE80 10%, 
                  #FCD34D 10%, 
                  #FCD34D 20%, 
                  #FB923C 20%, 
                  #FB923C 30%, 
                  #EF4444 30%, 
                  #EF4444 40%, 
                  #B91C1C 40%, 
                  #B91C1C 60%, 
                  #7C2D12 60%, 
                  #7C2D12 100%)`,
              }}
              aria-label="AQI threshold slider"
              aria-valuemin={0}
              aria-valuemax={500}
              aria-valuenow={threshold}
            />
            
            {/* Threshold markers */}
            <div className="flex justify-between mt-2 px-1">
              {aqiThresholds.map((mark) => (
                <div key={mark.value} className="flex flex-col items-center">
                  <div
                    className="w-1 h-2 rounded-full"
                    style={{ backgroundColor: mark.color }}
                  />
                  <span className="text-xs text-white/60 mt-1">{mark.value}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-2 text-xs text-white/60">
            You'll be notified when AQI {condition === 'above' ? 'exceeds' : 'falls below'} this value
          </p>
        </div>

        {/* Condition Toggle */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Alert Condition
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCondition('above')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-all duration-200 ${
                condition === 'above'
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
              aria-pressed={condition === 'above'}
            >
              Above Threshold
            </button>
            <button
              type="button"
              onClick={() => setCondition('below')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-all duration-200 ${
                condition === 'below'
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
              aria-pressed={condition === 'below'}
            >
              Below Threshold
            </button>
          </div>
        </div>

        {/* Notification Channels */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Notification Channels
          </label>
          <div className="space-y-2">
            {channelOptions.map((channel) => {
              const isSelected = selectedChannels.includes(channel.id);
              const isLastSelected = selectedChannels.length === 1 && isSelected;

              return (
                <label
                  key={channel.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-white/15 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  } ${isLastSelected ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleChannel(channel.id)}
                    disabled={isLastSelected}
                    className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-white/30 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Enable ${channel.label} notifications`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {channel.icon}
                      <span className="font-medium text-white">{channel.label}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">{channel.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-white/60">
            Select at least one notification method
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white font-medium transition-all duration-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-all duration-200 shadow-lg"
          >
            Create Alert
          </button>
        </div>
      </form>

      {/* Custom slider styles */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .slider-thumb:focus {
          outline: none;
        }

        .slider-thumb:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
        }

        .slider-thumb:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AlertConfigurationCard;
