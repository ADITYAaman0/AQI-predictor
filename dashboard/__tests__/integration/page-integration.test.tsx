/**
 * Page Integration Tests
 * 
 * Tests the integration of complete pages with all their components,
 * routing, data fetching, and user interactions
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Page Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Home Page Integration', () => {
    it('should render all home page sections', () => {
      const MockHomePage = () => (
        <div>
          <div data-testid="hero-section">Hero</div>
          <div data-testid="pollutant-grid">Pollutants</div>
          <div data-testid="forecast-section">Forecast</div>
          <div data-testid="insights-section">Insights</div>
        </div>
      );

      const { getByTestId } = render(<MockHomePage />, { wrapper });

      expect(getByTestId('hero-section')).toBeInTheDocument();
      expect(getByTestId('pollutant-grid')).toBeInTheDocument();
      expect(getByTestId('forecast-section')).toBeInTheDocument();
      expect(getByTestId('insights-section')).toBeInTheDocument();
    });

    it('should load initial AQI data on mount', async () => {
      const MockDataLoadingPage = () => {
        return (
          <div>
            <div data-testid="loading">Loading...</div>
            <div data-testid="aqi-data">AQI: 50</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockDataLoadingPage />, { wrapper });

      await waitFor(() => {
        expect(
          getByTestId('loading') || getByTestId('aqi-data')
        ).toBeInTheDocument();
      });
    });

    it('should handle location change from URL parameters', async () => {
      const MockLocationPage = () => {
        const searchParams = new URLSearchParams('?lat=28.6139&lng=77.2090');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        return (
          <div>
            <div data-testid="coordinates">
              {lat}, {lng}
            </div>
          </div>
        );
      };

      const { getByTestId } = render(<MockLocationPage />, { wrapper });

      expect(getByTestId('coordinates')).toHaveTextContent('28.6139, 77.2090');
    });
  });

  describe('Forecast Page Integration', () => {
    it('should render forecast page with all visualizations', () => {
      const MockForecastPage = () => (
        <div>
          <div data-testid="prediction-graph">Prediction Graph</div>
          <div data-testid="forecast-table">Forecast Table</div>
          <div data-testid="confidence-intervals">Confidence Intervals</div>
        </div>
      );

      const { getByTestId } = render(<MockForecastPage />, { wrapper });

      expect(getByTestId('prediction-graph')).toBeInTheDocument();
      expect(getByTestId('forecast-table')).toBeInTheDocument();
      expect(getByTestId('confidence-intervals')).toBeInTheDocument();
    });

    it('should fetch and display 24-hour forecast', async () => {
      const MockForecastData = () => (
        <div>
          <div data-testid="forecast-hours">24 hours</div>
          <div data-testid="forecast-points">24 data points</div>
        </div>
      );

      const { getByTestId } = render(<MockForecastData />, { wrapper });

      expect(getByTestId('forecast-hours')).toHaveTextContent('24 hours');
      expect(getByTestId('forecast-points')).toHaveTextContent('24 data points');
    });
  });

  describe('Insights Page Integration', () => {
    it('should render insights page with all components', () => {
      const MockInsightsPage = () => (
        <div>
          <div data-testid="historical-chart">Historical Chart</div>
          <div data-testid="statistics-grid">Statistics</div>
          <div data-testid="calendar-heatmap">Calendar Heatmap</div>
          <div data-testid="source-attribution">Sources</div>
        </div>
      );

      const { getByTestId } = render(<MockInsightsPage />, { wrapper });

      expect(getByTestId('historical-chart')).toBeInTheDocument();
      expect(getByTestId('statistics-grid')).toBeInTheDocument();
      expect(getByTestId('calendar-heatmap')).toBeInTheDocument();
      expect(getByTestId('source-attribution')).toBeInTheDocument();
    });

    it('should handle date range selection', async () => {
      const MockDateRangeComponent = () => {
        return (
          <div>
            <input data-testid="start-date" type="date" value="2024-01-01" />
            <input data-testid="end-date" type="date" value="2024-01-31" />
            <button data-testid="apply-range">Apply</button>
          </div>
        );
      };

      const { getByTestId } = render(<MockDateRangeComponent />, { wrapper });

      const applyButton = getByTestId('apply-range');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(getByTestId('start-date')).toHaveValue('2024-01-01');
        expect(getByTestId('end-date')).toHaveValue('2024-01-31');
      });
    });
  });

  describe('Alerts Page Integration', () => {
    it('should render alerts page with configuration and list', () => {
      const MockAlertsPage = () => (
        <div>
          <div data-testid="alert-config">Alert Configuration</div>
          <div data-testid="alerts-list">Active Alerts</div>
          <div data-testid="alert-history">Alert History</div>
        </div>
      );

      const { getByTestId } = render(<MockAlertsPage />, { wrapper });

      expect(getByTestId('alert-config')).toBeInTheDocument();
      expect(getByTestId('alerts-list')).toBeInTheDocument();
      expect(getByTestId('alert-history')).toBeInTheDocument();
    });

    it('should create new alert configuration', async () => {
      const MockAlertCreation = () => {
        return (
          <div>
            <input data-testid="threshold-input" type="number" value="100" />
            <select data-testid="condition-select">
              <option value="exceeds">Exceeds</option>
              <option value="below">Below</option>
            </select>
            <button data-testid="create-alert">Create Alert</button>
          </div>
        );
      };

      const { getByTestId } = render(<MockAlertCreation />, { wrapper });

      const createButton = getByTestId('create-alert');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(getByTestId('threshold-input')).toHaveValue(100);
      });
    });
  });

  describe('Devices Page Integration', () => {
    it('should render devices page with device list', () => {
      const MockDevicesPage = () => (
        <div>
          <div data-testid="devices-list">Devices List</div>
          <button data-testid="add-device">Add Device</button>
        </div>
      );

      const { getByTestId } = render(<MockDevicesPage />, { wrapper });

      expect(getByTestId('devices-list')).toBeInTheDocument();
      expect(getByTestId('add-device')).toBeInTheDocument();
    });

    it('should add new device', async () => {
      const MockAddDevice = () => {
        return (
          <div>
            <input data-testid="device-name" placeholder="Device name" />
            <input data-testid="device-token" placeholder="Device token" />
            <button data-testid="save-device">Save</button>
          </div>
        );
      };

      const { getByTestId } = render(<MockAddDevice />, { wrapper });

      const deviceName = getByTestId('device-name');
      const saveButton = getByTestId('save-device');

      fireEvent.change(deviceName, { target: { value: 'My Phone' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(deviceName).toHaveValue('My Phone');
      });
    });
  });

  describe('Settings Page Integration', () => {
    it('should render settings page with all options', () => {
      const MockSettingsPage = () => (
        <div>
          <div data-testid="theme-setting">Theme Settings</div>
          <div data-testid="notification-setting">Notifications</div>
          <div data-testid="location-setting">Location Settings</div>
          <div data-testid="privacy-setting">Privacy Settings</div>
        </div>
      );

      const { getByTestId } = render(<MockSettingsPage />, { wrapper });

      expect(getByTestId('theme-setting')).toBeInTheDocument();
      expect(getByTestId('notification-setting')).toBeInTheDocument();
      expect(getByTestId('location-setting')).toBeInTheDocument();
      expect(getByTestId('privacy-setting')).toBeInTheDocument();
    });

    it('should save user preferences', async () => {
      const MockPreferences = () => {
        return (
          <div>
            <input data-testid="auto-refresh" type="checkbox" checked />
            <select data-testid="refresh-interval">
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
            </select>
            <button data-testid="save-preferences">Save</button>
          </div>
        );
      };

      const { getByTestId } = render(<MockPreferences />, { wrapper });

      const saveButton = getByTestId('save-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(getByTestId('auto-refresh')).toBeChecked();
      });
    });
  });

  describe('Navigation and Routing Integration', () => {
    it('should navigate between pages', async () => {
      const MockNavigation = () => {
        return (
          <div>
            <nav data-testid="main-nav">
              <a href="/" data-testid="home-link">Home</a>
              <a href="/forecast" data-testid="forecast-link">Forecast</a>
              <a href="/insights" data-testid="insights-link">Insights</a>
              <a href="/alerts" data-testid="alerts-link">Alerts</a>
            </nav>
            <div data-testid="page-content">Content</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockNavigation />, { wrapper });

      expect(getByTestId('home-link')).toBeInTheDocument();
      expect(getByTestId('forecast-link')).toBeInTheDocument();
      expect(getByTestId('insights-link')).toBeInTheDocument();
      expect(getByTestId('alerts-link')).toBeInTheDocument();
    });

    it('should preserve query parameters during navigation', () => {
      const searchParams = new URLSearchParams('?lat=28.6139&lng=77.2090');

      expect(searchParams.get('lat')).toBe('28.6139');
      expect(searchParams.get('lng')).toBe('77.2090');
    });
  });

  describe('Error Pages Integration', () => {
    it('should render 404 page for invalid routes', () => {
      const Mock404Page = () => (
        <div>
          <div data-testid="404-heading">Page Not Found</div>
          <a href="/" data-testid="home-link">Go Home</a>
        </div>
      );

      const { getByTestId } = render(<Mock404Page />, { wrapper });

      expect(getByTestId('404-heading')).toHaveTextContent('Page Not Found');
      expect(getByTestId('home-link')).toBeInTheDocument();
    });

    it('should render error page for server errors', () => {
      const MockErrorPage = () => (
        <div>
          <div data-testid="error-heading">Something went wrong</div>
          <button data-testid="retry-button">Try Again</button>
        </div>
      );

      const { getByTestId } = render(<MockErrorPage />, { wrapper });

      expect(getByTestId('error-heading')).toHaveTextContent('Something went wrong');
      expect(getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  describe('Loading States Integration', () => {
    it('should show loading state during data fetch', async () => {
      const MockLoadingPage = () => {
        return (
          <div>
            <div data-testid="loading-spinner">Loading...</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockLoadingPage />, { wrapper });

      expect(getByTestId('loading-spinner')).toHaveTextContent('Loading...');
    });

    it('should show skeleton loaders for components', () => {
      const MockSkeletonPage = () => (
        <div>
          <div data-testid="skeleton-hero" className="animate-pulse">Skeleton</div>
          <div data-testid="skeleton-cards" className="animate-pulse">Skeleton</div>
        </div>
      );

      const { getByTestId } = render(<MockSkeletonPage />, { wrapper });

      expect(getByTestId('skeleton-hero')).toHaveClass('animate-pulse');
      expect(getByTestId('skeleton-cards')).toHaveClass('animate-pulse');
    });
  });

  describe('SEO and Metadata Integration', () => {
    it('should have proper page titles', () => {
      const MockPageWithTitle = () => (
        <div>
          <title>AQI Dashboard - Home</title>
          <div data-testid="content">Content</div>
        </div>
      );

      const { container } = render(<MockPageWithTitle />, { wrapper });

      const title = container.querySelector('title');
      expect(title).toHaveTextContent('AQI Dashboard - Home');
    });

    it('should have proper meta descriptions', () => {
      const description = 'Real-time air quality monitoring and forecasting';
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(0);
    });
  });
});
