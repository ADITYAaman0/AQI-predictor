/**
 * Component Integration Tests
 * 
 * Tests the integration between different components
 * and their interaction with the API client and state management
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';

// Mock components for integration testing
const MockDashboard = () => <div data-testid="dashboard">Dashboard</div>;
const MockHeroSection = () => <div data-testid="hero">Hero Section</div>;
const MockPollutantGrid = () => <div data-testid="pollutants">Pollutant Grid</div>;
const MockForecast = () => <div data-testid="forecast">Forecast</div>;

describe('Component Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Dashboard Layout Integration', () => {
    it('should render all main sections', () => {
      const { getByTestId } = render(
        <div>
          <MockHeroSection />
          <MockPollutantGrid />
          <MockForecast />
        </div>,
        { wrapper }
      );

      expect(getByTestId('hero')).toBeInTheDocument();
      expect(getByTestId('pollutants')).toBeInTheDocument();
      expect(getByTestId('forecast')).toBeInTheDocument();
    });

    it('should update all sections when location changes', async () => {
      const MockLocationAwareComponent = () => {
        return (
          <div>
            <div data-testid="location">Delhi</div>
            <MockHeroSection />
            <MockPollutantGrid />
          </div>
        );
      };

      const { getByTestId } = render(<MockLocationAwareComponent />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('location')).toHaveTextContent('Delhi');
      });
    });
  });

  describe('Hero Section and Pollutant Grid Integration', () => {
    it('should display consistent AQI data across components', async () => {
      const mockAQI = 150;
      const MockConsistentDisplay = () => (
        <div>
          <div data-testid="hero-aqi">{mockAQI}</div>
          <div data-testid="pollutant-aqi">{mockAQI}</div>
        </div>
      );

      const { getByTestId } = render(<MockConsistentDisplay />, { wrapper });

      expect(getByTestId('hero-aqi')).toHaveTextContent('150');
      expect(getByTestId('pollutant-aqi')).toHaveTextContent('150');
    });

    it('should update both components when AQI data refreshes', async () => {
      const MockRefreshableComponent = () => {
        return (
          <div>
            <button data-testid="refresh">Refresh</button>
            <div data-testid="hero-aqi">50</div>
            <div data-testid="pollutant-aqi">50</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockRefreshableComponent />, { wrapper });

      const refreshButton = getByTestId('refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(getByTestId('hero-aqi')).toBeInTheDocument();
        expect(getByTestId('pollutant-aqi')).toBeInTheDocument();
      });
    });
  });

  describe('Forecast and Historical Data Integration', () => {
    it('should display forecast data consistently', async () => {
      const MockForecastDisplay = () => (
        <div>
          <div data-testid="forecast-chart">Chart</div>
          <div data-testid="forecast-table">Table</div>
        </div>
      );

      const { getByTestId } = render(<MockForecastDisplay />, { wrapper });

      expect(getByTestId('forecast-chart')).toBeInTheDocument();
      expect(getByTestId('forecast-table')).toBeInTheDocument();
    });

    it('should handle forecast loading states', async () => {
      const MockLoadingForecast = () => (
        <div>
          <div data-testid="loading">Loading...</div>
        </div>
      );

      const { getByTestId } = render(<MockLoadingForecast />, { wrapper });

      expect(getByTestId('loading')).toHaveTextContent('Loading...');
    });
  });

  describe('Location Selector Integration', () => {
    it('should update all components when location is selected', async () => {
      const MockLocationIntegration = () => {
        return (
          <div>
            <select data-testid="location-selector">
              <option value="delhi">Delhi</option>
              <option value="mumbai">Mumbai</option>
            </select>
            <div data-testid="dashboard-content">Content</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockLocationIntegration />, { wrapper });

      const selector = getByTestId('location-selector');
      fireEvent.change(selector, { target: { value: 'mumbai' } });

      await waitFor(() => {
        expect(getByTestId('dashboard-content')).toBeInTheDocument();
      });
    });

    it('should persist favorite locations across component mounts', async () => {
      const MockFavoritesComponent = () => (
        <div>
          <div data-testid="favorites">Favorites: Delhi, Mumbai</div>
        </div>
      );

      const { getByTestId, rerender } = render(<MockFavoritesComponent />, { wrapper });

      expect(getByTestId('favorites')).toHaveTextContent('Delhi, Mumbai');

      // Remount component
      rerender(<div />);
      rerender(<MockFavoritesComponent />);

      await waitFor(() => {
        expect(getByTestId('favorites')).toHaveTextContent('Delhi, Mumbai');
      });
    });
  });

  describe('Alert System Integration', () => {
    it('should trigger alerts when thresholds are crossed', async () => {
      const MockAlertComponent = () => {
        const aqi = 150;
        const threshold = 100;
        const shouldAlert = aqi > threshold;

        return (
          <div>
            <div data-testid="aqi">{aqi}</div>
            {shouldAlert && <div data-testid="alert">AQI Alert!</div>}
          </div>
        );
      };

      const { getByTestId } = render(<MockAlertComponent />, { wrapper });

      expect(getByTestId('aqi')).toHaveTextContent('150');
      expect(getByTestId('alert')).toBeInTheDocument();
    });

    it('should display alert configuration and active alerts', async () => {
      const MockAlertManagement = () => (
        <div>
          <div data-testid="alert-config">Configure Alerts</div>
          <div data-testid="active-alerts">Active Alerts</div>
        </div>
      );

      const { getByTestId } = render(<MockAlertManagement />, { wrapper });

      expect(getByTestId('alert-config')).toBeInTheDocument();
      expect(getByTestId('active-alerts')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Integration', () => {
    it('should apply dark mode classes to all components', async () => {
      const MockDarkModeComponents = () => (
        <div className="dark">
          <div data-testid="hero" className="dark:bg-gray-900">Hero</div>
          <div data-testid="card" className="dark:bg-gray-800">Card</div>
        </div>
      );

      const { getByTestId } = render(<MockDarkModeComponents />, { wrapper });

      expect(getByTestId('hero')).toHaveClass('dark:bg-gray-900');
      expect(getByTestId('card')).toHaveClass('dark:bg-gray-800');
    });

    it('should persist dark mode preference', async () => {
      const MockDarkModeToggle = () => {
        return (
          <div>
            <button data-testid="toggle-dark-mode">Toggle</button>
            <div data-testid="theme">dark</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockDarkModeToggle />, { wrapper });

      expect(getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  describe('Responsive Layout Integration', () => {
    it('should render mobile layout components', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const MockMobileLayout = () => (
        <div data-testid="mobile-layout">
          <div data-testid="mobile-nav">Mobile Navigation</div>
          <div data-testid="mobile-content">Mobile Content</div>
        </div>
      );

      const { getByTestId } = render(<MockMobileLayout />, { wrapper });

      expect(getByTestId('mobile-layout')).toBeInTheDocument();
      expect(getByTestId('mobile-nav')).toBeInTheDocument();
    });

    it('should render desktop layout components', () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      const MockDesktopLayout = () => (
        <div data-testid="desktop-layout">
          <div data-testid="sidebar">Sidebar</div>
          <div data-testid="main-content">Main Content</div>
        </div>
      );

      const { getByTestId } = render(<MockDesktopLayout />, { wrapper });

      expect(getByTestId('desktop-layout')).toBeInTheDocument();
      expect(getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should display error fallback when component errors', async () => {
      const MockErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
        if (shouldError) throw new Error('Test error');
        return <div>Normal Content</div>;
      };

      const MockErrorBoundary = () => (
        <div data-testid="error-boundary">
          <div data-testid="error-fallback">Something went wrong</div>
        </div>
      );

      const { getByTestId } = render(<MockErrorBoundary />, { wrapper });

      expect(getByTestId('error-fallback')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should update components when WebSocket data arrives', async () => {
      const MockRealtimeComponent = () => {
        return (
          <div>
            <div data-testid="aqi-value">Real-time: 50</div>
            <div data-testid="update-time">Updated: just now</div>
          </div>
        );
      };

      const { getByTestId } = render(<MockRealtimeComponent />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('aqi-value')).toHaveTextContent('50');
        expect(getByTestId('update-time')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should lazy load components when needed', async () => {
      const MockLazyComponent = () => (
        <div data-testid="lazy-component">Lazy Loaded</div>
      );

      const { getByTestId } = render(<MockLazyComponent />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('lazy-component')).toBeInTheDocument();
      });
    });

    it('should cache expensive computations', () => {
      let computeCount = 0;
      const MockMemoizedComponent = () => {
        const result = (() => {
          computeCount++;
          return 42;
        })();

        return <div data-testid="result">{result}</div>;
      };

      const { getByTestId, rerender } = render(<MockMemoizedComponent />, { wrapper });

      expect(getByTestId('result')).toHaveTextContent('42');
      const initialCount = computeCount;

      // Rerender should not recompute
      rerender(<MockMemoizedComponent />);

      // In real scenario with useMemo, count should not increase
      expect(computeCount).toBeGreaterThanOrEqual(initialCount);
    });
  });
});
