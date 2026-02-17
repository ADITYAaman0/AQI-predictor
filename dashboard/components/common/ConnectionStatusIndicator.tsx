'use client';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { useEffect, useState } from 'react';

interface ConnectionStatusIndicatorProps {
  /** Show detailed status text (default: false) */
  showText?: boolean;
  /** Position of the indicator (default: 'top-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom className for styling */
  className?: string;
}

/**
 * ConnectionStatusIndicator - Displays WebSocket connection status
 * 
 * Shows a colored dot indicator with optional text:
 * - Green: Connected to real-time updates
 * - Yellow: Connecting or reconnecting
 * - Red: Disconnected or error
 * 
 * Features:
 * - Animated pulse effect when connecting
 * - Tooltip with detailed status
 * - Configurable position and styling
 * - Automatic updates based on connection state
 * 
 * @example
 * ```tsx
 * // Simple indicator
 * <ConnectionStatusIndicator />
 * 
 * // With text
 * <ConnectionStatusIndicator showText />
 * 
 * // Custom position
 * <ConnectionStatusIndicator position="bottom-right" />
 * ```
 */
export function ConnectionStatusIndicator({
  showText = false,
  position = 'top-right',
  className = '',
}: ConnectionStatusIndicatorProps) {
  const { isConnected, isConnecting, error, reconnectAttempts } = useWebSocket();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Determine status
  const status = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';
  
  // Status colors
  const statusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
  };
  
  // Status text
  const statusText = {
    connected: 'Real-time updates active',
    connecting: reconnectAttempts > 0 
      ? `Reconnecting (${reconnectAttempts}/5)...` 
      : 'Connecting...',
    disconnected: error 
      ? 'Connection failed' 
      : 'Real-time updates unavailable',
  };
  
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };
  
  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
        {/* Status dot */}
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${statusColors[status]} ${
              isConnecting ? 'animate-pulse' : ''
            }`}
          />
          {/* Pulse ring for connecting state */}
          {isConnecting && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-yellow-500 animate-ping opacity-75" />
          )}
        </div>
        
        {/* Status text */}
        {showText && (
          <span className="text-xs font-medium text-white">
            {statusText[status]}
          </span>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && !showText && (
        <div className="absolute top-full mt-2 right-0 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap shadow-xl border border-gray-700 animate-fade-in">
          <div className="font-medium">{statusText[status]}</div>
          {error && (
            <div className="text-red-400 mt-1">{error.message}</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45" />
        </div>
      )}
    </div>
  );
}

/**
 * ConnectionStatusBadge - Inline connection status badge
 * 
 * A smaller, inline version of the connection status indicator
 * suitable for use within other components.
 * 
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <h1>Dashboard</h1>
 *   <ConnectionStatusBadge />
 * </div>
 * ```
 */
export function ConnectionStatusBadge() {
  const { isConnected, isConnecting } = useWebSocket();
  
  const status = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';
  
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Live',
      textColor: 'text-green-600',
    },
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting',
      textColor: 'text-yellow-600',
    },
    disconnected: {
      color: 'bg-gray-500',
      text: 'Offline',
      textColor: 'text-gray-600',
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
      <div className={`w-1.5 h-1.5 rounded-full ${config.color} ${isConnecting ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}
