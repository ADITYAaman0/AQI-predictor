'use client';

import React, { useState } from 'react';
import { DeviceCard } from '@/components/devices/DeviceCard';
import type { SensorDevice } from '@/lib/api/types';

export default function TestDeviceCardPage() {
  const [removedDevices, setRemovedDevices] = useState<string[]>([]);

  // Mock device data
  const mockDevices: SensorDevice[] = [
    {
      id: 'device-1',
      name: 'Living Room Sensor',
      status: 'connected',
      location: 'New Delhi, India',
      batteryLevel: 85,
      lastReading: {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        aqi: 125,
      },
    },
    {
      id: 'device-2',
      name: 'Bedroom Sensor',
      status: 'low_battery',
      location: 'Mumbai, India',
      batteryLevel: 15,
      lastReading: {
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        aqi: 78,
      },
    },
    {
      id: 'device-3',
      name: 'Office Sensor',
      status: 'disconnected',
      location: 'Bangalore, India',
      batteryLevel: 0,
      lastReading: {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        aqi: 95,
      },
    },
    {
      id: 'device-4',
      name: 'Kitchen Sensor',
      status: 'connected',
      location: 'Chennai, India',
      batteryLevel: 92,
      lastReading: {
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        aqi: 45,
      },
    },
    {
      id: 'device-5',
      name: 'Balcony Sensor',
      status: 'connected',
      location: 'Kolkata, India',
      batteryLevel: 68,
      lastReading: {
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        aqi: 180,
      },
    },
    {
      id: 'device-6',
      name: 'Garage Sensor',
      status: 'low_battery',
      location: 'Pune, India',
      batteryLevel: 8,
      lastReading: {
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        aqi: 110,
      },
    },
  ];

  const handleViewDetails = (deviceId: string) => {
    alert(`View details for device: ${deviceId}`);
  };

  const handleRemove = (deviceId: string) => {
    if (confirm(`Are you sure you want to remove this device?`)) {
      setRemovedDevices([...removedDevices, deviceId]);
      alert(`Device ${deviceId} removed`);
    }
  };

  const visibleDevices = mockDevices.filter((device) => !removedDevices.includes(device.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Device Card Component Test</h1>
          <p className="text-white/70">
            Testing DeviceCard component with various device states and configurations
          </p>
        </div>

        {/* Test Sections */}
        <div className="space-y-12">
          {/* Section 1: All Device States */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              All Device States (Connected, Low Battery, Disconnected)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onViewDetails={handleViewDetails}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </section>

          {/* Section 2: Without Action Buttons */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Without Action Buttons
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDevices.slice(0, 3).map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          </section>

          {/* Section 3: Only View Details Button */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Only View Details Button
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDevices.slice(0, 3).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>

          {/* Section 4: Only Remove Button */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Only Remove Button
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDevices.slice(0, 3).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </section>

          {/* Section 5: Single Column Layout */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Single Column Layout (Mobile View)
            </h2>
            <div className="max-w-md mx-auto space-y-4">
              {visibleDevices.slice(0, 3).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onViewDetails={handleViewDetails}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </section>

          {/* Section 6: Custom Styling */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Custom Styling (with className)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDevices.slice(0, 3).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onViewDetails={handleViewDetails}
                  onRemove={handleRemove}
                  className="ring-2 ring-white/30"
                />
              ))}
            </div>
          </section>
        </div>

        {/* Testing Instructions */}
        <div className="mt-12 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Testing Checklist</h2>
          <ul className="space-y-2 text-white/80">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Device name, status, location, and battery level are displayed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Status indicator dot shows correct color (green/yellow/red)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Connected devices show pulsing animation on status dot</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Battery icon changes based on level (red for low battery)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Last reading shows AQI value and relative timestamp</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Glassmorphic styling with backdrop blur is applied</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Hover effect lifts card by 4px with enhanced shadow</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>View Details button triggers alert with device ID</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Remove button shows confirmation and removes device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Buttons scale down on click (0.98)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Component works in different grid layouts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Custom className is applied correctly</span>
            </li>
          </ul>
        </div>

        {/* Requirements Validation */}
        <div className="mt-8 bg-white/10 backdrop-blur-glass border border-white/18 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Requirements Validation</h2>
          <div className="space-y-3 text-white/80">
            <div>
              <strong className="text-white">Requirement 11.2:</strong> Device cards display device
              name, connection status, location, and battery level ✓
            </div>
            <div>
              <strong className="text-white">Requirement 11.3:</strong> "View Details" link is
              shown on each device card ✓
            </div>
            <div>
              <strong className="text-white">Requirement 11.4:</strong> Device status with colored
              dot indicator (green: connected, yellow: low battery, red: disconnected) ✓
            </div>
            <div>
              <strong className="text-white">Requirement 12.1:</strong> Hover effect lifts card by
              4px and enhances shadow over 0.3 seconds ✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
