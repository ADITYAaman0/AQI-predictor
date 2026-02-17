'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/common';

type View = 'real-time' | 'forecast' | 'insights';

interface TopNavigationProps {
  className?: string;
}

export default function TopNavigation({ className = '' }: TopNavigationProps) {
  const pathname = usePathname();
  const [notificationCount] = useState(3); // Mock notification count

  // Determine active view based on pathname
  const getActiveView = (): View => {
    if (pathname === '/forecast') return 'forecast';
    if (pathname === '/insights') return 'insights';
    return 'real-time';
  };

  const activeView = getActiveView();

  const views: { id: View; label: string; href: string }[] = [
    { id: 'real-time', label: 'Real-time', href: '/' },
    { id: 'forecast', label: 'Forecast', href: '/forecast' },
    { id: 'insights', label: 'Insights', href: '/insights' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 glass-card ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-white dark:text-slate-100 font-semibold text-lg hover:opacity-80 transition-opacity"
              aria-label="AQI Dashboard Home"
            >
              AQI Dashboard
            </Link>
          </div>

          {/* Segmented Control for Views */}
          <div
            className="flex items-center gap-1 p-1 rounded-full bg-white/10 dark:bg-white/5"
            role="tablist"
            aria-label="Dashboard views"
          >
            {views.map((view) => {
              const isActive = activeView === view.id;
              return (
                <Link
                  key={view.id}
                  href={view.href}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${view.id}-panel`}
                  className={`
                    px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${isActive
                      ? 'bg-white/25 dark:bg-white/15 text-white dark:text-slate-100 shadow-glow'
                      : 'text-white/70 dark:text-slate-300/70 hover:text-white dark:hover:text-slate-100 hover:bg-white/10 dark:hover:bg-white/5'
                    }
                  `}
                  style={
                    isActive
                      ? {
                        boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
                      }
                      : undefined
                  }
                >
                  {view.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section: Theme Toggle, Notification Bell & User Profile */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle size="medium" showLabel={false} />
            {/* Notification Bell */}
            <button
              className="relative p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors focus-ring"
              aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
              onClick={() => {
                // TODO: Open notifications dropdown
                console.log('Open notifications');
              }}
            >
              <svg
                className="w-6 h-6 text-white dark:text-slate-200"
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notificationCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  aria-label={`${notificationCount} unread notifications`}
                >
                  {notificationCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <button
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 hover:opacity-80 transition-opacity focus-ring flex items-center justify-center text-white font-semibold"
              aria-label="User profile menu"
              onClick={() => {
                // TODO: Open user profile dropdown
                console.log('Open user profile');
              }}
            >
              <span aria-hidden="true">U</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
