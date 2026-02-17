/**
 * Error Display Components
 * 
 * Reusable components for displaying different types of errors
 * with user-friendly messages and retry functionality.
 */

'use client';

import { 
  AlertTriangle, 
  WifiOff, 
  RefreshCw, 
  ServerCrash,
  Clock,
  XCircle
} from 'lucide-react';
import { APIError } from '@/lib/api/client';

interface ErrorDisplayProps {
  error: Error | APIError | null;
  onRetry?: () => void;
  showDetails?: boolean;
}

/**
 * Get appropriate icon for error type
 */
function getErrorIcon(error: Error | APIError | null) {
  if (!error) return AlertTriangle;
  
  if (error instanceof APIError) {
    const statusCode = error.statusCode;
    
    if (!statusCode) return WifiOff; // Network error
    if (statusCode === 408 || statusCode === 504) return Clock; // Timeout
    if (statusCode >= 500) return ServerCrash; // Server error
    if (statusCode === 404) return XCircle; // Not found
  }
  
  return AlertTriangle;
}

/**
 * Get user-friendly error title
 */
function getErrorTitle(error: Error | APIError | null): string {
  if (!error) return 'Error';
  
  if (error instanceof APIError) {
    const statusCode = error.statusCode;
    
    if (!statusCode) return 'Connection Error';
    if (statusCode === 408 || statusCode === 504) return 'Request Timeout';
    if (statusCode >= 500) return 'Server Error';
    if (statusCode === 404) return 'Not Found';
    if (statusCode === 429) return 'Too Many Requests';
  }
  
  return 'Error';
}

/**
 * Generic Error Display Component
 * 
 * Displays error messages with appropriate styling and retry button
 */
export function ErrorDisplay({ error, onRetry, showDetails = false }: ErrorDisplayProps) {
  const Icon = getErrorIcon(error);
  const title = getErrorTitle(error);
  const message = error?.message || 'An unexpected error occurred';

  return (
    <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-red-400" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {title}
          </h3>
          <p className="text-white/70 text-sm">
            {message}
          </p>
        </div>

        {showDetails && error && process.env.NODE_ENV === 'development' && (
          <details className="mt-2 p-3 bg-black/20 rounded-lg text-left w-full">
            <summary className="text-white/90 cursor-pointer font-mono text-xs mb-2">
              Technical Details
            </summary>
            <pre className="text-red-300 text-xs overflow-auto">
              {error.toString()}
            </pre>
          </details>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 
                     rounded-lg text-white text-sm font-medium transition-all duration-300
                     hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Error Display
 * For inline error messages
 */
export function CompactErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const Icon = getErrorIcon(error);
  const message = error?.message || 'An error occurred';

  return (
    <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-white/90 text-sm">{message}</p>
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 
                   rounded text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Network Error Display
 * Specialized for offline/network errors
 */
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-orange-400" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            No Connection
          </h3>
          <p className="text-white/70 text-sm">
            Unable to connect to the server. Please check your internet connection.
          </p>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 
                     rounded-lg text-white text-sm font-medium transition-all duration-300
                     hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Offline Indicator Banner
 * Shows when the app is offline
 */
export function OfflineBanner() {
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-orange-500/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-white text-sm">
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">You are offline</span>
          <span className="text-white/80">- Showing cached data</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cached Data Indicator
 * Shows when displaying cached/stale data
 */
export function CachedDataIndicator({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <Clock className="w-4 h-4 text-yellow-400" />
      <span className="text-white/80 text-xs">
        Showing cached data
        {lastUpdated && ` from ${lastUpdated}`}
      </span>
    </div>
  );
}
