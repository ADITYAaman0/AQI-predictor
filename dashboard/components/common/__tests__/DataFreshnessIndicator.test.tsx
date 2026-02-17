/**
 * DataFreshnessIndicator Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DataFreshnessIndicator } from '../DataFreshnessIndicator';

describe('DataFreshnessIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders freshness indicator', () => {
    const lastUpdated = new Date();
    render(<DataFreshnessIndicator lastUpdated={lastUpdated} />);
    
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('displays relative time correctly', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    render(<DataFreshnessIndicator lastUpdated={twoMinutesAgo} />);
    
    expect(screen.getByText(/2 minutes ago/i)).toBeInTheDocument();
  });

  it('shows countdown to next refresh', () => {
    const lastUpdated = new Date();
    render(
      <DataFreshnessIndicator 
        lastUpdated={lastUpdated} 
        refreshInterval={5 * 60 * 1000}
        showCountdown={true}
      />
    );
    
    expect(screen.getByText(/next refresh in/i)).toBeInTheDocument();
  });

  it('hides countdown when showCountdown is false', () => {
    const lastUpdated = new Date();
    render(
      <DataFreshnessIndicator 
        lastUpdated={lastUpdated} 
        showCountdown={false}
      />
    );
    
    expect(screen.queryByText(/next refresh in/i)).not.toBeInTheDocument();
  });

  it('shows offline indicator when offline', () => {
    const lastUpdated = new Date();
    render(
      <DataFreshnessIndicator 
        lastUpdated={lastUpdated} 
        isOffline={true}
      />
    );
    
    expect(screen.getByText(/offline.*showing cached data/i)).toBeInTheDocument();
  });

  it('shows refreshing state', () => {
    const lastUpdated = new Date();
    render(
      <DataFreshnessIndicator 
        lastUpdated={lastUpdated} 
        isRefreshing={true}
      />
    );
    
    expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
  });

  it('updates time display every second', async () => {
    const lastUpdated = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    render(<DataFreshnessIndicator lastUpdated={lastUpdated} />);
    
    expect(screen.getByText(/30 seconds ago/i)).toBeInTheDocument();
    
    // Advance time by 1 second
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText(/31 seconds ago/i)).toBeInTheDocument();
    });
  });

  it('shows fresh indicator for recent data', () => {
    const lastUpdated = new Date();
    const { container } = render(
      <DataFreshnessIndicator 
        lastUpdated={lastUpdated}
        refreshInterval={5 * 60 * 1000}
      />
    );
    
    // Check for green indicator (fresh)
    const indicator = container.querySelector('.bg-green-400');
    expect(indicator).toBeInTheDocument();
  });

  it('shows stale indicator for older data', () => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const { container } = render(
      <DataFreshnessIndicator 
        lastUpdated={threeMinutesAgo}
        refreshInterval={5 * 60 * 1000}
      />
    );
    
    // Check for yellow indicator (stale)
    const indicator = container.querySelector('.bg-yellow-400');
    expect(indicator).toBeInTheDocument();
  });

  it('shows old indicator for very old data', () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    const { container } = render(
      <DataFreshnessIndicator 
        lastUpdated={sixMinutesAgo}
        refreshInterval={5 * 60 * 1000}
      />
    );
    
    // Check for red indicator (old)
    const indicator = container.querySelector('.bg-red-400');
    expect(indicator).toBeInTheDocument();
  });

  it('accepts ISO string as lastUpdated', () => {
    const lastUpdated = new Date().toISOString();
    render(<DataFreshnessIndicator lastUpdated={lastUpdated} />);
    
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('formats countdown correctly', () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
    render(
      <DataFreshnessIndicator 
        lastUpdated={fourMinutesAgo}
        refreshInterval={5 * 60 * 1000}
        showCountdown={true}
      />
    );
    
    // Should show approximately 1 minute remaining
    expect(screen.getByText(/next refresh in 1m/i)).toBeInTheDocument();
  });
});
