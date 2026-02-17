'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { useState, useEffect } from 'react';

/**
 * ThemeToggle Component
 * 
 * A three-state theme toggle button (light / dark / system) with glassmorphic design.
 * Features:
 * - Animated icon transitions between sun, moon, and auto icons
 * - Glassmorphic button styling matching dashboard aesthetic
 * - Accessible with ARIA labels and keyboard support
 * - Tooltip showing current theme mode
 * - Smooth fade transitions
 */

export interface ThemeToggleProps {
    /**
     * Button size variant
     * @default 'medium'
     */
    size?: 'small' | 'medium' | 'large';

    /**
     * Show label text next to icon
     * @default false
     */
    showLabel?: boolean;

    /**
     * Additional CSS classes
     */
    className?: string;
}

export function ThemeToggle({
    size = 'medium',
    showLabel = false,
    className = '',
}: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleToggle = () => {
        // Cycle through: light → dark → system → light
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    // Size classes
    const sizeClasses = {
        small: 'w-8 h-8 text-sm',
        medium: 'w-10 h-10 text-base',
        large: 'w-12 h-12 text-lg',
    };

    const iconSizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-5 h-5',
        large: 'w-6 h-6',
    };

    // Get theme label
    const getThemeLabel = () => {
        if (theme === 'light') return 'Light';
        if (theme === 'dark') return 'Dark';
        return 'Auto';
    };

    // Get tooltip text
    const getTooltip = () => {
        if (theme === 'light') return 'Switch to dark mode';
        if (theme === 'dark') return 'Switch to system preference';
        return 'Switch to light mode';
    };

    // Don't render until mounted to prevent hydration mismatch
    if (!mounted) {
        return (
            <div
                className={`
          glass-card
          backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10
          rounded-full
          flex items-center justify-center gap-2
          ${sizeClasses[size]}
          ${showLabel ? 'px-4 rounded-full' : ''}
          ${className}
        `}
            />
        );
    }

    return (
        <button
            onClick={handleToggle}
            className={`
        glass-card
        backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10
        rounded-full
        flex items-center justify-center gap-2
        transition-all duration-300 ease-out
        hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-level-2 hover:-translate-y-0.5
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
        ${sizeClasses[size]}
        ${showLabel ? 'px-4 rounded-full' : ''}
        ${className}
      `}
            aria-label={getTooltip()}
            title={getTooltip()}
            type="button"
        >
            {/* Theme Icons with Fade Transition */}
            <div className="relative">
                {/* Sun Icon (Light Mode) */}
                <svg
                    className={`
            ${iconSizeClasses[size]}
            absolute inset-0
            transition-opacity duration-300
            ${theme === 'light' ? 'opacity-100' : 'opacity-0'}
          `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>

                {/* Moon Icon (Dark Mode) */}
                <svg
                    className={`
            ${iconSizeClasses[size]}
            absolute inset-0
            transition-opacity duration-300
            ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}
          `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>

                {/* Auto/System Icon */}
                <svg
                    className={`
            ${iconSizeClasses[size]}
            absolute inset-0
            transition-opacity duration-300
            ${theme === 'system' ? 'opacity-100' : 'opacity-0'}
          `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>

                {/* Spacer to maintain button size */}
                <svg
                    className={`${iconSizeClasses[size]} opacity-0`}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M0 0h24v24H0z" />
                </svg>
            </div>

            {/* Optional Label */}
            {showLabel && (
                <span className="text-white dark:text-slate-200 font-medium whitespace-nowrap">
                    {getThemeLabel()}
                </span>
            )}
        </button>
    );
}
