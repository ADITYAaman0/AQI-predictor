/**
 * Retry Status Component
 * 
 * Shows retry status when requests are being retried
 * Provides visual feedback during exponential backoff
 */

'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RetryStatusProps {
  isRetrying: boolean;
  attemptNumber?: number;
  maxAttempts?: number;
  nextRetryDelay?: number;
  error?: string;
  onCancel?: () => void;
}

/**
 * Retry Status Component
 * 
 * Shows retry information and progress to users
 */
export function RetryStatus({
  isRetrying,
  attemptNumber = 1,
  maxAttempts = 5,
  nextRetryDelay = 1000,
  error,
  onCancel,
}: RetryStatusProps) {
  if (!isRetrying) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card p-4 rounded-lg backdrop-blur-lg bg-white/10 dark:bg-white/5 
                   border border-white/20 dark:border-white/10 shadow-glass"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          {/* Spinning icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-5 h-5 text-white/70" />
          </motion.div>

          {/* Status text */}
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              Retrying request...
            </p>
            <p className="text-white/60 text-xs mt-1">
              Attempt {attemptNumber} of {maxAttempts}
              {nextRetryDelay > 0 && ` • Next retry in ${Math.ceil(nextRetryDelay / 1000)}s`}
            </p>
            {error && (
              <p className="text-red-300/80 text-xs mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Cancel button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs text-white/70 hover:text-white 
                       bg-white/10 hover:bg-white/20 rounded transition-colors"
              aria-label="Cancel retry"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/40"
            initial={{ width: '0%' }}
            animate={{ width: `${(attemptNumber / maxAttempts) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact Retry Indicator
 * 
 * Minimal indicator for displaying retry status inline
 */
export function CompactRetryIndicator({
  attemptNumber,
  maxAttempts = 5,
}: {
  attemptNumber: number;
  maxAttempts?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-white/60 text-xs"
      role="status"
      aria-label={`Retrying: attempt ${attemptNumber} of ${maxAttempts}`}
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <RefreshCw className="w-3 h-3" />
      </motion.span>
      <span>Retry {attemptNumber}/{maxAttempts}</span>
    </span>
  );
}

/**
 * Hook to manage retry state
 */
export function useRetryState(maxRetries: number = 5) {
  const [retryState, setRetryState] = React.useState({
    isRetrying: false,
    attemptNumber: 0,
    error: null as string | null,
  });

  const startRetry = React.useCallback((attemptNumber: number, error?: string) => {
    setRetryState({
      isRetrying: true,
      attemptNumber,
      error: error || null,
    });
  }, []);

  const completeRetry = React.useCallback(() => {
    setRetryState({
      isRetrying: false,
      attemptNumber: 0,
      error: null,
    });
  }, []);

  const canRetry = retryState.attemptNumber < maxRetries;

  return {
    retryState,
    startRetry,
    completeRetry,
    canRetry,
  };
}
