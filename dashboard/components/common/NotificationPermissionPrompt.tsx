/**
 * NotificationPermissionPrompt Component
 * 
 * A component that prompts users to enable browser notifications
 * for AQI alerts and threshold crossings.
 * 
 * Features:
 * - Request notification permission
 * - Show permission status
 * - Dismissible prompt
 * - Glassmorphic styling
 * 
 * Requirements: 18.4
 */

'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';

export interface NotificationPermissionPromptProps {
  onDismiss?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  className?: string;
}

/**
 * NotificationPermissionPrompt Component
 * 
 * Displays a prompt asking users to enable notifications.
 * Shows different states based on permission status.
 * 
 * @example
 * ```tsx
 * <NotificationPermissionPrompt
 *   onPermissionGranted={() => console.log('Notifications enabled!')}
 *   onDismiss={() => setShowPrompt(false)}
 * />
 * ```
 */
export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  onDismiss,
  onPermissionGranted,
  onPermissionDenied,
  className = '',
}) => {
  const { permission, isSupported, requestPermission } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show if not supported
  if (!isSupported) {
    return null;
  }

  // Don't show if already granted
  if (permission === 'granted') {
    return null;
  }

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    
    try {
      const result = await requestPermission();
      
      if (result === 'granted') {
        onPermissionGranted?.();
      } else if (result === 'denied') {
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('[NotificationPermissionPrompt] Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  return (
    <div
      className={`
        relative p-4 rounded-xl
        bg-white/10 backdrop-blur-glass border border-white/18
        shadow-level2
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        {/* Bell Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1">
            Enable Air Quality Alerts
          </h3>
          <p className="text-sm text-white/70 mb-3">
            Get notified when air quality reaches unhealthy levels in your area.
            Stay informed and protect your health.
          </p>

          {/* Permission Denied Message */}
          {permission === 'denied' && (
            <div className="mb-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <p className="text-sm text-red-200">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {permission !== 'denied' && (
              <button
                onClick={handleEnableNotifications}
                disabled={isRequesting}
                className={`
                  px-4 py-2 rounded-lg
                  bg-blue-500 hover:bg-blue-600
                  text-white text-sm font-medium
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent
                `}
                aria-label="Enable notifications"
              >
                {isRequesting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Requesting...
                  </span>
                ) : (
                  'Enable Notifications'
                )}
              </button>
            )}

            <button
              onClick={handleDismiss}
              className={`
                px-4 py-2 rounded-lg
                bg-white/10 hover:bg-white/20
                text-white text-sm font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent
              `}
              aria-label="Dismiss notification prompt"
            >
              {permission === 'denied' ? 'Close' : 'Maybe Later'}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 p-1 rounded-lg
            text-white/60 hover:text-white hover:bg-white/10
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-white/40
          `}
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
