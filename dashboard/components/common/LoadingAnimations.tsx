/**
 * Loading Animation Components
 * 
 * Implements Task 19.5 - Loading Animations
 * Provides skeleton loaders, shimmer effects, and pulse animations
 */

import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * Circular spinning loader with glassmorphic styling
 */
export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function LoadingSpinner({ size = 'medium', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="animate-spin text-white"
        xmlns="http://www.w3.org/2000/svg"
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
    </div>
  );
}

/**
 * LoadingDots Component
 * 
 * Three dots with staggered pulse animation
 */
export interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
      <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Skeleton Component
 * 
 * Skeleton loader with shimmer effect
 * Implements loading state animations
 */
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export function Skeleton({
  width,
  height,
  className = '',
  variant = 'rectangular',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-white/10 dark:bg-white/5 ${variantClasses[variant]} skeleton-shimmer ${className}`}
      style={style}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * SkeletonText Component
 * 
 * Multiple lines of skeleton text
 */
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={index === lines - 1 ? '70%' : '100%'}
          variant="text"
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * SkeletonCard Component
 * 
 * Skeleton loader for card components
 */
export interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`glass-card p-6 rounded-xl space-y-4 ${className}`}
      role="status"
      aria-label="Loading card"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>

      {/* Content */}
      <SkeletonText lines={2} />

      {/* Footer */}
      <div className="flex gap-2">
        <Skeleton height={32} width={80} className="rounded-full" />
        <Skeleton height={32} width={80} className="rounded-full" />
      </div>

      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * PulseDot Component
 * 
 * Pulsing dot indicator for live/active states
 */
export interface PulseDotProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export function PulseDot({
  size = 'medium',
  color = 'bg-green-500',
  className = '',
}: PulseDotProps) {
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  return (
    <span className={`relative flex ${sizeClasses[size]} ${className}`}>
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`}
        style={{ animationDuration: '2s' }}
      />
      <span className={`relative inline-flex rounded-full ${sizeClasses[size]} ${color}`} />
    </span>
  );
}

/**
 * ProgressBar Component
 * 
 * Animated progress bar with smooth transitions
 */
export interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className = '', showLabel = false }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={className} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100}>
      <div className="relative w-full h-2 bg-white/10 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-white/70 dark:text-slate-300 text-right">
          {clampedValue.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

/**
 * LoadingOverlay Component
 * 
 * Full-screen or container overlay with loading indicator
 */
export interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = 'Loading...', className = '' }: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl z-50 ${className}`}
      role="status"
      aria-label={message}
    >
      <LoadingSpinner size="large" />
      {message && (
        <p className="mt-4 text-white font-medium">{message}</p>
      )}
    </div>
  );
}
