'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * QueryProvider - Provides TanStack Query (React Query) context to the application
 * 
 * This provider manages server state caching and synchronization for API calls.
 * It configures default cache times and stale times for optimal performance.
 * 
 * Performance Optimizations (Task 22.4):
 * - Request deduplication: Concurrent requests to same endpoint share single network call
 * - Intelligent caching: Reduces unnecessary API calls
 * - Background refetching: Updates data without blocking UI
 * - Exponential backoff: Prevents server overload on errors
 * 
 * Default Configuration:
 * - Current AQI data: 5-minute cache
 * - Forecast data: 1-hour cache
 * - Historical data: 24-hour cache
 * - Retry failed requests: 3 attempts with exponential backoff
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a new QueryClient instance for each component tree
  // This ensures SSR compatibility and prevents state sharing between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // How long data stays fresh before refetching
            staleTime: 5 * 60 * 1000, // 5 minutes (default for current AQI)
            
            // How long inactive data stays in cache
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            
            // Retry failed requests
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,
            
            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,
            
            // Refetch on reconnect to get latest data
            refetchOnReconnect: true,
            
            // Task 22.4 - Request deduplication is automatic in TanStack Query
            // Multiple components requesting the same data will share a single request
          },
          mutations: {
            // Retry failed mutations
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
