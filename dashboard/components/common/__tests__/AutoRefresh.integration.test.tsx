/**
 * Auto-Refresh Integration Tests
 * 
 * Tests the complete auto-refresh functionality including:
 * - Automatic refresh every 5 minutes
 * - Manual refresh button
 * - Data freshness indicator
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefreshButton } from '../RefreshButton';
import { DataFreshnessIndicator } from '../DataFreshnessIndicator';

describe('Auto-Refresh Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    queryClient.clear();
    jest.useRealTimers();
  });

  it('displays refresh button and freshness indicator together', () => {
    const mockRefresh = jest.fn();
    const lastUpdated = new Date();

    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <DataFreshnessIndicator lastUpdated={lastUpdated} />
          <RefreshButton onRefresh={mockRefresh} />
        </div>
      </QueryClientProvider>
    );

    expect(screen.getByText(/just now/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();
  });

  it('manual refresh updates the freshness indicator', async () => {
    let lastUpdated = new Date(Date.now() - 60 * 1000); // 1 minute ago
    const mockRefresh = jest.fn().mockImplementation(() => {
      lastUpdated = new Date(); // Update to current time
      return Promise.resolve();
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <div>
          <DataFreshnessIndicator lastUpdated={lastUpdated} />
          <RefreshButton onRefresh={mockRefresh} />
        </div>
      </QueryClientProvider>
    );

    // Initially shows 1 minute ago
    expect(screen.getByText(/1 minute ago/i)).toBeInTheDocument();

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh data/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });

    // Rerender with updated time
    rerender(
      <QueryClientProvider client={queryClient}>
        <div>
          <DataFreshnessIndicator lastUpdated={lastUpdated} />
          <RefreshButton onRefresh={mockRefresh} />
        </div>
      </QueryClientProvider>
    );

    // Should now show "just now"
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('shows countdown to next refresh', () => {
    const lastUpdated = new Date();
    render(
      <QueryClientProvider client={queryClient}>
        <DataFreshnessIndicator 
          lastUpdated={lastUpdated}
          refreshInterval={5 * 60 * 1000}
          showCountdown={true}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/next refresh in/i)).toBeInTheDocument();
  });

  it('disables refresh button when offline', () => {
    const mockRefresh = jest.fn();
    const lastUpdated = new Date();

    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <DataFreshnessIndicator 
            lastUpdated={lastUpdated}
            isOffline={true}
          />
          <RefreshButton 
            onRefresh={mockRefresh}
            disabled={true}
          />
        </div>
      </QueryClientProvider>
    );

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    
    const refreshButton = screen.getByRole('button', { name: /refresh data/i });
    expect(refreshButton).toBeDisabled();
  });

  it('shows refreshing state in both components', () => {
    const mockRefresh = jest.fn<Promise<void>, []>(() => new Promise(resolve => setTimeout(resolve, 1000)));
    const lastUpdated = new Date();

    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <DataFreshnessIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={true}
          />
          <RefreshButton onRefresh={mockRefresh} />
        </div>
      </QueryClientProvider>
    );

    expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
  });

  it('countdown updates every second', async () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
    
    render(
      <QueryClientProvider client={queryClient}>
        <DataFreshnessIndicator 
          lastUpdated={fourMinutesAgo}
          refreshInterval={5 * 60 * 1000}
          showCountdown={true}
        />
      </QueryClientProvider>
    );

    // Should show approximately 1 minute countdown
    expect(screen.getByText(/next refresh in 1m/i)).toBeInTheDocument();

    // Advance time by 30 seconds
    jest.advanceTimersByTime(30 * 1000);

    await waitFor(() => {
      // Should now show approximately 30 seconds
      expect(screen.getByText(/next refresh in.*30s/i)).toBeInTheDocument();
    });
  });

  it('freshness indicator changes color based on data age', () => {
    const { container, rerender } = render(
      <QueryClientProvider client={queryClient}>
        <DataFreshnessIndicator 
          lastUpdated={new Date()}
          refreshInterval={5 * 60 * 1000}
        />
      </QueryClientProvider>
    );

    // Fresh data - green indicator
    expect(container.querySelector('.bg-green-400')).toBeInTheDocument();

    // Stale data (3 minutes old)
    rerender(
      <QueryClientProvider client={queryClient}>
        <DataFreshnessIndicator 
          lastUpdated={new Date(Date.now() - 3 * 60 * 1000)}
          refreshInterval={5 * 60 * 1000}
        />
      </QueryClientProvider>
    );

    expect(container.querySelector('.bg-yellow-400')).toBeInTheDocument();

    // Old data (6 minutes old)
    rerender(
      <QueryClientProvider client={queryClient}>
        <DataFreshnessIndicator 
          lastUpdated={new Date(Date.now() - 6 * 60 * 1000)}
          refreshInterval={5 * 60 * 1000}
        />
      </QueryClientProvider>
    );

    expect(container.querySelector('.bg-red-400')).toBeInTheDocument();
  });
});
