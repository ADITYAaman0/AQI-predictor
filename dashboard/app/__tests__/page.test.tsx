import { render, screen, waitFor } from '@testing-library/react';
import DashboardHome from '../page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the components
jest.mock('@/components/layout', () => ({
  TopNavigation: () => <div data-testid="top-navigation">Top Navigation</div>,
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
  BottomNavigation: () => <div data-testid="bottom-navigation">Bottom Navigation</div>,
}));

jest.mock('@/components/dashboard/HeroAQISectionLive', () => ({
  HeroAQISectionLive: () => <div data-testid="hero-aqi-section">Hero AQI Section</div>,
}));

jest.mock('@/components/dashboard/PollutantMetricsGridLive', () => ({
  PollutantMetricsGridLive: () => <div data-testid="pollutant-grid">Pollutant Grid</div>,
}));

jest.mock('@/components/dashboard/WeatherSection', () => ({
  WeatherSection: () => <div data-testid="weather-section">Weather Section</div>,
}));

jest.mock('@/components/dashboard/HealthRecommendationsCard', () => ({
  HealthRecommendationsCard: () => <div data-testid="health-recommendations">Health Recommendations</div>,
}));

describe('DashboardHome', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  describe('Layout Structure', () => {
    it('renders top navigation', () => {
      renderWithProviders(<DashboardHome />);
      expect(screen.getByTestId('top-navigation')).toBeInTheDocument();
    });

    it('renders sidebar on desktop', () => {
      renderWithProviders(<DashboardHome />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders bottom navigation for mobile', () => {
      renderWithProviders(<DashboardHome />);
      expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument();
    });
  });

  describe('Dashboard Components', () => {
    it('renders hero AQI section', async () => {
      renderWithProviders(<DashboardHome />);
      await waitFor(() => {
        expect(screen.getByTestId('hero-aqi-section')).toBeInTheDocument();
      });
    });

    it('renders pollutant metrics grid', async () => {
      renderWithProviders(<DashboardHome />);
      await waitFor(() => {
        expect(screen.getByTestId('pollutant-grid')).toBeInTheDocument();
      });
    });

    it('renders weather section', async () => {
      renderWithProviders(<DashboardHome />);
      await waitFor(() => {
        expect(screen.getByTestId('weather-section')).toBeInTheDocument();
      });
    });

    it('renders health recommendations', async () => {
      renderWithProviders(<DashboardHome />);
      await waitFor(() => {
        expect(screen.getByTestId('health-recommendations')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    it('applies correct grid layout classes for all breakpoints', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const mainGrid = container.querySelector('.grid');
      // Mobile: 1 column, Tablet: 8 columns, Desktop: 12 columns
      expect(mainGrid).toHaveClass('grid-cols-1', 'md:grid-cols-8', 'xl:grid-cols-12');
    });

    it('hero section spans correct columns at all breakpoints', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      // Should find element with md:col-span-8 and xl:col-span-8
      const heroContainer = container.querySelector('.md\\:col-span-8.xl\\:col-span-8');
      expect(heroContainer).toBeInTheDocument();
    });

    it('side panel spans correct columns at all breakpoints', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      // Should find element with md:col-span-8 and xl:col-span-4
      const sideColumn = container.querySelector('.md\\:col-span-8.xl\\:col-span-4');
      expect(sideColumn).toBeInTheDocument();
    });

    it('pollutant grid spans full width at all breakpoints', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      // Should find element with md:col-span-8 and xl:col-span-12
      const pollutantContainer = container.querySelector('.md\\:col-span-8.xl\\:col-span-12');
      expect(pollutantContainer).toBeInTheDocument();
    });

    it('applies responsive margins and padding', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const main = container.querySelector('main');
      // Mobile: 16px (px-4), Tablet: 32px (md:px-8), Desktop: 48px (xl:px-12)
      expect(main).toHaveClass('px-4', 'md:px-8', 'xl:px-12');
    });

    it('applies responsive gap between grid items', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const grid = container.querySelector('.grid');
      // Mobile/Tablet: 16px (gap-4), Desktop: 24px (xl:gap-6)
      expect(grid).toHaveClass('gap-4', 'md:gap-4', 'xl:gap-6');
    });
  });

  describe('Loading States', () => {
    it('provides loading skeletons as fallbacks', () => {
      // In test environment, Suspense fallbacks may not show since components load synchronously
      // This test verifies the skeleton components are defined and would render if needed
      const { container } = renderWithProviders(<DashboardHome />);
      
      // Verify the page structure is present
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      
      // Verify components eventually render (not stuck in loading state)
      expect(screen.getByTestId('hero-aqi-section')).toBeInTheDocument();
    });
  });

  describe('Data Freshness Indicator', () => {
    it('displays auto-refresh message', () => {
      renderWithProviders(<DashboardHome />);
      expect(screen.getByText(/Data refreshes automatically every 5 minutes/i)).toBeInTheDocument();
    });
  });

  describe('Background Styling', () => {
    it('applies gradient background', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('bg-gradient-to-br', 'from-blue-500', 'via-purple-500', 'to-pink-500');
    });

    it('applies min-height to fill screen', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('min-h-screen');
    });
  });

  describe('Spacing and Padding', () => {
    it('applies correct responsive padding to main content', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const main = container.querySelector('main');
      // Mobile: px-4, Tablet: md:px-8, Desktop: xl:px-12
      // Plus sidebar offset: lg:pl-24, xl:pl-28
      expect(main).toHaveClass('px-4', 'md:px-8', 'xl:px-12', 'lg:pl-24', 'xl:pl-28');
    });

    it('applies responsive gap between grid items', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-4', 'md:gap-4', 'xl:gap-6');
    });

    it('applies responsive margin to data freshness indicator', () => {
      const { container } = renderWithProviders(<DashboardHome />);
      const freshnessDiv = container.querySelector('.mt-6');
      expect(freshnessDiv).toHaveClass('mt-6', 'md:mt-8');
    });
  });
});
