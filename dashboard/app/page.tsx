'use client';

import { Suspense, useCallback } from 'react';
import { TopNavigation, Sidebar, BottomNavigation } from '@/components/layout';
import { HeroAQISectionLive } from '@/components/dashboard/HeroAQISectionLive';
import { PollutantMetricsGridLive } from '@/components/dashboard/PollutantMetricsGridLive';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/ErrorDisplay';
import { RefreshButton } from '@/components/common/RefreshButton';
import { DataFreshnessIndicator } from '@/components/common/DataFreshnessIndicator';
import { ConnectionStatusIndicator } from '@/components/common/ConnectionStatusIndicator';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useKeyboardNavigation } from '@/lib/hooks';
import { announceToScreenReader } from '@/lib/utils/accessibility';

// Loading skeleton components
function HeroSkeleton() {
  return (
    <div className="glass-card p-8 rounded-2xl backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-glass animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-60 h-60 rounded-full bg-white/20 dark:bg-white/10 mb-4"></div>
        <div className="h-8 w-32 bg-white/20 dark:bg-white/10 rounded mb-2"></div>
        <div className="h-6 w-48 bg-white/20 dark:bg-white/10 rounded"></div>
      </div>
    </div>
  );
}

function PollutantSkeleton() {
  return (
    <div className="grid gap-4 w-full justify-items-center
                    grid-cols-1 max-w-[200px] mx-auto
                    md:grid-cols-2 md:max-w-none md:justify-center
                    lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-glass animate-pulse w-[200px] h-[180px]"
        >
          <div className="h-6 w-20 bg-white/20 dark:bg-white/10 rounded mb-4"></div>
          <div className="h-12 w-24 bg-white/20 dark:bg-white/10 rounded mb-2"></div>
          <div className="h-2 w-full bg-white/20 dark:bg-white/10 rounded"></div>
        </div>
      ))}
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-glass animate-pulse">
      <div className="flex gap-4 justify-center">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/10"></div>
        ))}
      </div>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="glass-card p-6 rounded-xl backdrop-blur-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-glass animate-pulse">
      <div className="h-6 w-48 bg-white/20 dark:bg-white/10 rounded mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/20 dark:bg-white/10 rounded"></div>
        <div className="h-4 w-full bg-white/20 dark:bg-white/10 rounded"></div>
        <div className="h-4 w-3/4 bg-white/20 dark:bg-white/10 rounded"></div>
      </div>
    </div>
  );
}

// Side panel component that uses shared data
function SidePanel({ location }: { location: string }) {
  const { data, isLoading } = useCurrentAQI({ location });

  return (
    <>
      {/* Weather Section */}
      {isLoading ? (
        <WeatherSkeleton />
      ) : data?.weather ? (
        <WeatherSection
          weather={data.weather}
          lastUpdated={data.lastUpdated}
          isLoading={false}
        />
      ) : (
        <WeatherSkeleton />
      )}

      {/* Health Recommendations */}
      {isLoading ? (
        <HealthSkeleton />
      ) : data?.aqi ? (
        <HealthRecommendationsCard
          aqi={data.aqi.value}
          category={data.aqi.category}
        />
      ) : (
        <HealthSkeleton />
      )}
    </>
  );
}

export default function DashboardHome() {
  // Default location - can be made dynamic with location selector in future
  const defaultLocation = 'Delhi';

  // Track online/offline status
  const isOnline = useOnlineStatus();

  // Get query result for manual refresh and data freshness
  const { data: aqiData, refetch, isFetching } = useCurrentAQI({
    location: defaultLocation
  });

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch();
    announceToScreenReader('Dashboard data refreshed');
  }, [refetch]);

  // Keyboard navigation (Task 20.1)
  useKeyboardNavigation({
    onRefresh: handleRefresh,
    onMenuToggle: () => {
      // Toggle sidebar on desktop or bottom nav on mobile
      const event = new CustomEvent('toggle:menu');
      window.dispatchEvent(event);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* WebSocket Connection Status Indicator (Task 17.3) */}
      <ConnectionStatusIndicator position="top-right" showText />
      
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}

      {/* Top Navigation */}
      <ErrorBoundary>
        <TopNavigation />
      </ErrorBoundary>

      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
      </div>

      {/* Main Content with Responsive Layout */}
      {/* Mobile (<768px): 16px margins, single column */}
      {/* Tablet (768-1439px): 32px margins, 2-column or stacked */}
      {/* Desktop (≥1440px): 48px margins, multi-column 12-grid */}
      <main 
        id="main-content" 
        className="container mx-auto px-4 md:px-8 xl:px-12 lg:pl-24 xl:pl-28 pt-24 pb-20 lg:pb-8"
        role="main"
        aria-label="Dashboard main content"
        tabIndex={-1}
      >
        {/* Responsive Grid Layout */}
        {/* Mobile: 1 column (4-col grid system) */}
        {/* Tablet: 8 columns with 2-column layout */}
        {/* Desktop: 12 columns with multi-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-8 xl:grid-cols-12 gap-4 md:gap-4 xl:gap-6">
          {/* Hero AQI Section */}
          {/* Mobile: Full width (1 col) */}
          {/* Tablet: Full width (8 cols) */}
          {/* Desktop: 8 cols */}
          <div className="md:col-span-8 xl:col-span-8">
            <ErrorBoundary>
              <Suspense fallback={<HeroSkeleton />}>
                <HeroAQISectionLive location={defaultLocation} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Weather & Health Side Panel */}
          {/* Mobile: Full width, stacked below hero */}
          {/* Tablet: Full width (8 cols), stacked below hero */}
          {/* Desktop: 4 cols, side column */}
          <div className="md:col-span-8 xl:col-span-4 space-y-4 md:space-y-4 xl:space-y-6">
            {/* Weather Section */}
            <ErrorBoundary>
              <Suspense fallback={<WeatherSkeleton />}>
                <SidePanel location={defaultLocation} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Pollutant Metrics Grid */}
          {/* Mobile: Full width (1 col) */}
          {/* Tablet: Full width (8 cols) */}
          {/* Desktop: Full width (12 cols) */}
          <div className="md:col-span-8 xl:col-span-12">
            <ErrorBoundary>
              <Suspense fallback={<PollutantSkeleton />}>
                <PollutantMetricsGridLive location={defaultLocation} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Data Freshness Indicator and Refresh Button */}
        <div className="mt-6 md:mt-8 flex flex-col md:flex-row items-center justify-center gap-4">
          {/* Data Freshness Indicator */}
          {aqiData?.lastUpdated && (
            <DataFreshnessIndicator
              lastUpdated={aqiData.lastUpdated}
              refreshInterval={5 * 60 * 1000} // 5 minutes
              isOffline={!isOnline}
              isRefreshing={isFetching}
              showCountdown={true}
            />
          )}

          {/* Manual Refresh Button */}
          <RefreshButton
            onRefresh={handleRefresh}
            disabled={!isOnline || isFetching}
            size="medium"
            showLabel={false}
          />
        </div>

        {/* Info Text */}
        <div className="mt-4 text-center">
          <p className="text-white/60 dark:text-slate-400/70 text-xs">
            Data refreshes automatically every 5 minutes
          </p>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <div className="lg:hidden">
        <ErrorBoundary>
          <BottomNavigation />
        </ErrorBoundary>
      </div>
    </div>
  );
}

