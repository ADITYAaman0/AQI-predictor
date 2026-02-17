/**
 * Insights Page Tests
 * 
 * Comprehensive tests for the insights page including:
 * - Complete insights flow
 * - All visualizations
 * - Data accuracy
 * 
 * Requirements: 16.1-16.8
 * Tasks: 13.3
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InsightsPage from '../page';

// ============================================================================
// Mock Data
// ============================================================================

const mockHistoricalData = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    value: 85,
    aqi: 85,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-02T00:00:00Z',
    value: 120,
    aqi: 120,
    category: 'unhealthy',
  },
  {
    timestamp: '2024-01-03T00:00:00Z',
    value: 65,
    aqi: 65,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-04T00:00:00Z',
    value: 150,
    aqi: 150,
    category: 'unhealthy',
  },
  {
    timestamp: '2024-01-05T00:00:00Z',
    value: 45,
    aqi: 45,
    category: 'good',
  },
];

// ============================================================================
// Mocks
// ============================================================================

const mockUseHistoricalData = jest.fn();

// Mock the components
jest.mock('@/components/layout', () => ({
  TopNavigation: () => <div data-testid="top-navigation">Top Navigation</div>,
}));

jest.mock('@/components/insights', () => ({
  SourceAttributionCardConnected: ({ location }: { location: string }) => (
    <div data-testid="source-attribution" data-location={location}>
      Source Attribution for {location}
    </div>
  ),
  HistoricalTrendsChart: ({ data, isLoading, title }: any) => (
    <div 
      data-testid="historical-trends" 
      data-loading={isLoading}
      data-data-length={data?.length || 0}
    >
      {title}
      {!isLoading && data && data.length > 0 && (
        <div data-testid="chart-data">Chart with {data.length} points</div>
      )}
    </div>
  ),
  CalendarHeatmap: ({ data, isLoading, title }: any) => (
    <div 
      data-testid="calendar-heatmap" 
      data-loading={isLoading}
      data-data-length={data?.length || 0}
    >
      {title}
      {!isLoading && data && data.length > 0 && (
        <div data-testid="heatmap-data">Heatmap with {data.length} days</div>
      )}
    </div>
  ),
  StatisticsGrid: ({ data }: any) => (
    <div data-testid="statistics-grid" data-data-length={data?.length || 0}>
      Statistics for {data?.length || 0} data points
    </div>
  ),
  ComparativeAnalysis: ({ data, isLoading }: any) => (
    <div 
      data-testid="comparative-analysis" 
      data-loading={isLoading}
      data-data-length={data?.length || 0}
    >
      Comparative Analysis
      {!isLoading && data && data.length > 0 && (
        <div data-testid="analysis-data">Analysis of {data.length} points</div>
      )}
    </div>
  ),
}));

jest.mock('@/components/common/ErrorBoundary', () => ({
  ErrorDisplay: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div data-testid="error-display">
      {message}
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-button">
          Retry
        </button>
      )}
    </div>
  ),
}));

jest.mock('@/lib/api/hooks/useHistoricalData', () => ({
  useHistoricalData: (...args: any[]) => mockUseHistoricalData(...args),
}));

// ============================================================================
// Test Setup
// ============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ============================================================================
// Tests
// ============================================================================

describe('InsightsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockUseHistoricalData.mockReturnValue({
      data: mockHistoricalData,
      isLoading: false,
      error: null,
    });
  });

  describe('Layout and Structure', () => {
    it('renders the page with all main sections', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Check page header
      expect(screen.getByText('Insights & Analytics')).toBeInTheDocument();
      expect(
        screen.getByText(/Historical trends, source attribution, and comparative analysis/)
      ).toBeInTheDocument();

      // Check section headers (use getAllByText for duplicates)
      expect(screen.getByText('Source Attribution')).toBeInTheDocument();
      expect(screen.getByText('Statistics Overview')).toBeInTheDocument();
      expect(screen.getByText('Historical Trends')).toBeInTheDocument();
      expect(screen.getByText('Calendar View')).toBeInTheDocument();
      expect(screen.getAllByText('Comparative Analysis').length).toBeGreaterThan(0);
    });

    it('renders top navigation', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('top-navigation')).toBeInTheDocument();
    });

    it('renders back to dashboard link', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const backLink = screen.getByText('← Back to Dashboard');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('displays location in page description', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      expect(
        screen.getByText(/comparative analysis for Delhi/)
      ).toBeInTheDocument();
    });
  });

  describe('Date Range Selector', () => {
    it('renders date range buttons', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('7 Days')).toBeInTheDocument();
      expect(screen.getByText('30 Days')).toBeInTheDocument();
      expect(screen.getByText('90 Days')).toBeInTheDocument();
    });

    it('has 30 days selected by default', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const thirtyDaysButton = screen.getByText('30 Days');
      expect(thirtyDaysButton).toHaveClass('bg-white/30');
      
      const sevenDaysButton = screen.getByText('7 Days');
      expect(sevenDaysButton).toHaveClass('bg-white/10');
    });

    it('changes date range when button is clicked', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const sevenDaysButton = screen.getByText('7 Days');
      fireEvent.click(sevenDaysButton);

      expect(sevenDaysButton).toHaveClass('bg-white/30');
      expect(screen.getByText('30 Days')).toHaveClass('bg-white/10');
    });

    it('updates chart title when date range changes', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Default is 30 days
      expect(screen.getByText('AQI Trends - Last 30 Days')).toBeInTheDocument();

      // Change to 7 days
      fireEvent.click(screen.getByText('7 Days'));
      expect(screen.getByText('AQI Trends - Last 7 Days')).toBeInTheDocument();

      // Change to 90 days
      fireEvent.click(screen.getByText('90 Days'));
      expect(screen.getByText('AQI Trends - Last 90 Days')).toBeInTheDocument();
    });

    it('calls useHistoricalData with correct date range', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Check initial call (30 days)
      expect(mockUseHistoricalData).toHaveBeenCalledWith(
        'Delhi',
        expect.any(String),
        expect.any(String)
      );

      // Verify date range is approximately 30 days
      const calls = mockUseHistoricalData.mock.calls;
      const lastCall = calls[calls.length - 1];
      const startDate = new Date(lastCall[1]);
      const endDate = new Date(lastCall[2]);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });
  });

  describe('Component Integration', () => {
    it('renders source attribution section with location', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const sourceAttribution = screen.getByTestId('source-attribution');
      expect(sourceAttribution).toBeInTheDocument();
      expect(sourceAttribution).toHaveAttribute('data-location', 'Delhi');
    });

    it('renders statistics grid when data is available', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const statsGrid = screen.getByTestId('statistics-grid');
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid).toHaveAttribute('data-data-length', '5');
    });

    it('renders historical trends chart with data', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const chart = screen.getByTestId('historical-trends');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-loading', 'false');
      expect(chart).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('chart-data')).toBeInTheDocument();
    });

    it('renders calendar heatmap with data', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const heatmap = screen.getByTestId('calendar-heatmap');
      expect(heatmap).toBeInTheDocument();
      expect(heatmap).toHaveAttribute('data-loading', 'false');
      expect(heatmap).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('heatmap-data')).toBeInTheDocument();
    });

    it('renders comparative analysis with data', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      const analysis = screen.getByTestId('comparative-analysis');
      expect(analysis).toBeInTheDocument();
      expect(analysis).toHaveAttribute('data-loading', 'false');
      expect(analysis).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('analysis-data')).toBeInTheDocument();
    });

    it('passes correct props to all visualization components', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Check that all components receive the data
      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('calendar-heatmap')).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('statistics-grid')).toHaveAttribute('data-data-length', '5');
      expect(screen.getByTestId('comparative-analysis')).toHaveAttribute('data-data-length', '5');
    });
  });

  describe('Complete Insights Flow', () => {
    it('loads and displays all insights data successfully', async () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('statistics-grid')).toBeInTheDocument();
      });

      // Verify all sections are present and populated
      expect(screen.getByTestId('source-attribution')).toBeInTheDocument();
      expect(screen.getByTestId('statistics-grid')).toBeInTheDocument();
      expect(screen.getByTestId('historical-trends')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('comparative-analysis')).toBeInTheDocument();

      // Verify data is displayed
      expect(screen.getByTestId('chart-data')).toBeInTheDocument();
      expect(screen.getByTestId('heatmap-data')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-data')).toBeInTheDocument();
    });

    it('handles date range changes and updates all visualizations', async () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Initial state
      expect(screen.getByText('AQI Trends - Last 30 Days')).toBeInTheDocument();

      // Change to 7 days
      fireEvent.click(screen.getByText('7 Days'));
      
      await waitFor(() => {
        expect(screen.getByText('AQI Trends - Last 7 Days')).toBeInTheDocument();
      });

      // Verify all visualizations still have data
      expect(screen.getByTestId('chart-data')).toBeInTheDocument();
      expect(screen.getByTestId('heatmap-data')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-data')).toBeInTheDocument();
    });

    it('maintains data consistency across all visualizations', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // All visualizations should receive the same data
      const dataLength = '5';
      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-data-length', dataLength);
      expect(screen.getByTestId('calendar-heatmap')).toHaveAttribute('data-data-length', dataLength);
      expect(screen.getByTestId('statistics-grid')).toHaveAttribute('data-data-length', dataLength);
      expect(screen.getByTestId('comparative-analysis')).toHaveAttribute('data-data-length', dataLength);
    });
  });

  describe('Loading States', () => {
    it('shows loading state for historical data', () => {
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      // Check loading states
      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('calendar-heatmap')).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('comparative-analysis')).toHaveAttribute('data-loading', 'true');

      // Data should not be displayed
      expect(screen.queryByTestId('chart-data')).not.toBeInTheDocument();
      expect(screen.queryByTestId('heatmap-data')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analysis-data')).not.toBeInTheDocument();
    });

    it('does not show statistics grid when data is loading', () => {
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('statistics-grid')).not.toBeInTheDocument();
    });

    it('transitions from loading to loaded state', async () => {
      // Start with loading
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { rerender } = render(<InsightsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-loading', 'true');

      // Update to loaded
      mockUseHistoricalData.mockReturnValue({
        data: mockHistoricalData,
        isLoading: false,
        error: null,
      });

      rerender(<InsightsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-loading', 'false');
        expect(screen.getByTestId('chart-data')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when historical data fails to load', () => {
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch data'),
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText('Failed to load historical data')).toBeInTheDocument();
    });

    it('provides retry functionality on error', () => {
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch data'),
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      // Verify retry button exists and is clickable
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
      
      // Verify button can be clicked (doesn't throw)
      expect(() => fireEvent.click(retryButton)).not.toThrow();
    });

    it('still shows source attribution when historical data fails', () => {
      mockUseHistoricalData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch data'),
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      // Source attribution should still be visible
      expect(screen.getByTestId('source-attribution')).toBeInTheDocument();
    });

    it('does not show error when there is no error', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });

    it('handles empty data gracefully', () => {
      mockUseHistoricalData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      // Components should render but with empty data
      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-data-length', '0');
      expect(screen.getByTestId('calendar-heatmap')).toHaveAttribute('data-data-length', '0');
      expect(screen.queryByTestId('chart-data')).not.toBeInTheDocument();
    });
  });

  describe('Data Accuracy', () => {
    it('passes correct historical data to all components', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      // Verify data length is correct
      const expectedLength = mockHistoricalData.length.toString();
      expect(screen.getByTestId('historical-trends')).toHaveAttribute('data-data-length', expectedLength);
      expect(screen.getByTestId('calendar-heatmap')).toHaveAttribute('data-data-length', expectedLength);
      expect(screen.getByTestId('statistics-grid')).toHaveAttribute('data-data-length', expectedLength);
      expect(screen.getByTestId('comparative-analysis')).toHaveAttribute('data-data-length', expectedLength);
    });

    it('fetches data for correct location', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(mockUseHistoricalData).toHaveBeenCalledWith(
        'Delhi',
        expect.any(String),
        expect.any(String)
      );
    });

    it('fetches data with correct date format', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const calls = mockUseHistoricalData.mock.calls;
      const lastCall = calls[calls.length - 1];
      
      // Check date format (yyyy-MM-dd)
      const startDate = lastCall[1];
      const endDate = lastCall[2];
      
      expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('calculates correct date range for 7 days', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('7 Days'));

      const calls = mockUseHistoricalData.mock.calls;
      const lastCall = calls[calls.length - 1];
      const startDate = new Date(lastCall[1]);
      const endDate = new Date(lastCall[2]);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(7);
    });

    it('calculates correct date range for 90 days', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('90 Days'));

      const calls = mockUseHistoricalData.mock.calls;
      const lastCall = calls[calls.length - 1];
      const startDate = new Date(lastCall[1]);
      const endDate = new Date(lastCall[2]);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(90);
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      // Check for space-y-6 for vertical spacing
      const mainContent = container.querySelector('.space-y-6');
      expect(mainContent).toBeInTheDocument();
    });

    it('applies glassmorphic styling to cards', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      const glassCards = container.querySelectorAll('.glass-card');
      expect(glassCards.length).toBeGreaterThan(0);

      glassCards.forEach((card) => {
        expect(card).toHaveClass('backdrop-blur-lg');
        expect(card).toHaveClass('bg-white/10');
        expect(card).toHaveClass('border-white/20');
      });
    });

    it('applies correct padding and spacing', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      const main = container.querySelector('main');
      expect(main).toHaveClass('container');
      expect(main).toHaveClass('mx-auto');
      expect(main).toHaveClass('px-4');
      expect(main).toHaveClass('pt-24');
      expect(main).toHaveClass('pb-8');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      const h1 = container.querySelector('h1');
      const h2s = container.querySelectorAll('h2');

      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent('Insights & Analytics');
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('has descriptive section headings', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const headings = [
        'Source Attribution',
        'Statistics Overview',
        'Historical Trends',
        'Calendar View',
      ];

      headings.forEach((heading) => {
        expect(screen.getByText(heading)).toBeInTheDocument();
      });
      
      // Check for heading that appears multiple times
      expect(screen.getAllByText('Comparative Analysis').length).toBeGreaterThan(0);
    });

    it('has accessible date range buttons', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const buttons = [
        screen.getByText('7 Days'),
        screen.getByText('30 Days'),
        screen.getByText('90 Days'),
      ];

      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveClass('px-4', 'py-2', 'rounded-lg');
      });
    });

    it('has accessible back link', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const backLink = screen.getByText('← Back to Dashboard');
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
      expect(backLink.closest('a')).toHaveClass('inline-block');
    });

    it('provides visual feedback for active date range', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const activeButton = screen.getByText('30 Days');
      const inactiveButton = screen.getByText('7 Days');

      expect(activeButton).toHaveClass('bg-white/30', 'text-white');
      expect(inactiveButton).toHaveClass('bg-white/10', 'text-white/70');
    });
  });

  describe('Visual Design', () => {
    it('applies gradient background', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('bg-gradient-to-br');
      expect(root).toHaveClass('from-blue-500');
      expect(root).toHaveClass('via-cyan-500');
      expect(root).toHaveClass('to-teal-500');
    });

    it('applies proper text colors', () => {
      const { container } = render(<InsightsPage />, { wrapper: createWrapper() });

      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-white');

      const h2s = container.querySelectorAll('h2');
      h2s.forEach((h2) => {
        expect(h2).toHaveClass('text-white');
      });
    });

    it('applies transition effects to buttons', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const buttons = [
        screen.getByText('7 Days'),
        screen.getByText('30 Days'),
        screen.getByText('90 Days'),
      ];

      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-all');
        expect(button).toHaveClass('duration-300');
      });
    });
  });

  describe('Integration with API', () => {
    it('calls useHistoricalData hook on mount', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(mockUseHistoricalData).toHaveBeenCalled();
    });

    it('refetches data when date range changes', () => {
      render(<InsightsPage />, { wrapper: createWrapper() });

      const initialCallCount = mockUseHistoricalData.mock.calls.length;

      fireEvent.click(screen.getByText('7 Days'));

      expect(mockUseHistoricalData.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('handles API response correctly', () => {
      const customData = [
        { timestamp: '2024-01-01T00:00:00Z', value: 100, aqi: 100, category: 'moderate' },
        { timestamp: '2024-01-02T00:00:00Z', value: 150, aqi: 150, category: 'unhealthy' },
      ];

      mockUseHistoricalData.mockReturnValue({
        data: customData,
        isLoading: false,
        error: null,
      });

      render(<InsightsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('statistics-grid')).toHaveAttribute('data-data-length', '2');
    });
  });
});
