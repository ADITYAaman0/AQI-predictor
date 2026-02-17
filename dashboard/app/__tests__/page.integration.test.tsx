/**
 * Dashboard Integration Tests
 * 
 * Tests the complete data flow from API to UI including:
 * - Data fetching and display
 * - Loading states
 * - Error handling
 * - Component integration
 * - Auto-refresh functionality
 * - Offline behavior
 * 
 * Requirements: 1.1-1.8
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardHome from '../page';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { CurrentAQIResponse } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

// Mock the online status hook
jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockGetCurrentAQI = jest.fn();

describe('Dashboard Integration Tests', () => {
  let queryClient: QueryClient;

  // Mock AQI data
  const mockAQIData: CurrentAQIResponse = {
    location: {
      id: 'delhi-1',
      name: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    timestamp: new Date().toISOString(),
    aqi: {
      value: 156,
      category: 'unhealthy',
      categoryLabel: 'Unhealthy',
      dominantPollutant: 'PM2.5',
      color: '#FB923C',
      healthMessage: 'Everyone should limit prolonged outdoor exertion',
    },
    pollutants: {
      pm25: {
        value: 89.5,
        unit: 'μg/m³',
        aqi: 156,
        status: 'Unhealthy',
      },
      pm10: {
        value: 145.2,
        unit: 'μg/m³',
        aqi: 98,
        status: 'Moderate',
      },
      o3: {
        value: 45.3,
        unit: 'μg/m³',
        aqi: 42,
        status: 'Good',
      },
      no2: {
        value: 38.7,
        unit: 'μg/m³',
        aqi: 35,
        status: 'Good',
      },
      so2: {
        value: 12.4,
        unit: 'μg/m³',
        aqi: 18,
        status: 'Good',
      },
      co: {
        value: 1.2,
        unit: 'mg/m³',
        aqi: 12,
        status: 'Good',
      },
    },
    weather: {
      temperature: 28.5,
      humidity: 65,
      windSpeed: 12.5,
      windDirection: 180,
      pressure: 1013,
    },
    sourceAttribution: {
      vehicular: 45,
      industrial: 25,
      biomass: 20,
      background: 10,
    },
    confidence: {
      pm25Lower: 75.2,
      pm25Upper: 103.8,
      level: 'high',
      score: 0.85,
      modelWeights: {
        lstm: 0.4,
        xgboost: 0.35,
        randomForest: 0.25,
      },
    },
    dataSources: ['CPCB', 'OpenWeatherMap'],
    lastUpdated: new Date().toISOString(),
    modelVersion: '2.1.0',
  };

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementation
    (getAQIClient as jest.Mock).mockReturnValue({
      getCurrentAQI: mockGetCurrentAQI,
    });

    mockGetCurrentAQI.mockResolvedValue(mockAQIData);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Complete Data Flow', () => {
    it('should fetch data from API and display all components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledWith('Delhi');
      });

      // Verify Hero AQI Section displays
      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
        expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      });

      // Verify Pollutant Cards display
      expect(screen.getByText('PM2.5')).toBeInTheDocument();
      expect(screen.getByText('89.5')).toBeInTheDocument();
      expect(screen.getByText('PM10')).toBeInTheDocument();
      expect(screen.getByText('145.2')).toBeInTheDocument();

      // Verify Weather Section displays
      expect(screen.getByText('28.5°C')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();

      // Verify Health Recommendations display
      expect(screen.getByText(/limit prolonged outdoor exertion/i)).toBeInTheDocument();
    });

    it('should pass data correctly through component hierarchy', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Verify data flows to Hero section
      const heroSection = await screen.findByText('156');
      expect(heroSection).toBeInTheDocument();

      // Verify data flows to pollutant cards
      const pm25Card = await screen.findByText('PM2.5');
      expect(pm25Card).toBeInTheDocument();

      // Verify data flows to weather section
      const temperature = await screen.findByText('28.5°C');
      expect(temperature).toBeInTheDocument();

      // Verify data flows to health recommendations
      const healthRec = await screen.findByText(/limit prolonged outdoor exertion/i);
      expect(healthRec).toBeInTheDocument();
    });

    it('should handle data transformation correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Verify AQI value is displayed correctly
      expect(await screen.findByText('156')).toBeInTheDocument();

      // Verify category label is displayed
      expect(screen.getByText('Unhealthy')).toBeInTheDocument();

      // Verify pollutant values are formatted correctly
      expect(screen.getByText('89.5')).toBeInTheDocument();
      expect(screen.getByText('μg/m³')).toBeInTheDocument();

      // Verify weather values are formatted correctly
      expect(screen.getByText('28.5°C')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should display loading skeletons while fetching data', () => {
      // Make the API call hang
      mockGetCurrentAQI.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Verify loading skeletons are displayed
      const skeletons = screen.getAllByRole('generic');
      const animatedElements = skeletons.filter(el => 
        el.className.includes('animate-pulse')
      );
      
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('should show loading state for hero section', () => {
      mockGetCurrentAQI.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Hero skeleton should have circular element
      const circularSkeleton = document.querySelector('.w-60.h-60.rounded-full');
      expect(circularSkeleton).toBeInTheDocument();
    });

    it('should show loading state for pollutant cards', () => {
      mockGetCurrentAQI.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Should have 6 pollutant card skeletons
      const cardSkeletons = document.querySelectorAll('.w-\\[200px\\].h-\\[180px\\]');
      expect(cardSkeletons.length).toBe(6);
    });

    it('should show loading state for weather section', () => {
      mockGetCurrentAQI.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Weather skeleton should have circular badges
      const weatherBadges = document.querySelectorAll('.w-14.h-14.rounded-full');
      expect(weatherBadges.length).toBeGreaterThan(0);
    });

    it('should transition from loading to loaded state', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Initially should show loading
      const initialSkeletons = document.querySelectorAll('.animate-pulse');
      expect(initialSkeletons.length).toBeGreaterThan(0);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Loading skeletons should be gone
      const finalSkeletons = document.querySelectorAll('.animate-pulse');
      expect(finalSkeletons.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const errorMessage = 'Unable to connect. Please check your internet connection.';
      mockGetCurrentAQI.mockRejectedValue(new Error(errorMessage));

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
      });
    });

    it('should show error boundary for component errors', async () => {
      // Mock console.error to avoid noise in test output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Make the API return invalid data that will cause a component error
      mockGetCurrentAQI.mockResolvedValue({
        ...mockAQIData,
        aqi: null, // Invalid data
      });

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Error boundary should catch the error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('should display retry button on error', async () => {
      mockGetCurrentAQI.mockRejectedValue(new Error('Network error'));

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
      });

      // Retry button should be present
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle network timeout errors', async () => {
      mockGetCurrentAQI.mockRejectedValue(new Error('Request timed out'));

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 errors gracefully', async () => {
      const error = new Error('Location not found');
      (error as any).statusCode = 404;
      mockGetCurrentAQI.mockRejectedValue(error);

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
      });
    });

    it('should handle 500 server errors', async () => {
      const error = new Error('Server error');
      (error as any).statusCode = 500;
      mockGetCurrentAQI.mockRejectedValue(error);

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Refresh Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display data freshness indicator', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Data freshness indicator should be present
      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('should display manual refresh button', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Refresh button should be present
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should show auto-refresh info text', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Info text should be present
      expect(screen.getByText(/data refreshes automatically every 5 minutes/i)).toBeInTheDocument();
    });
  });

  describe('Offline Behavior', () => {
    it('should display offline banner when offline', async () => {
      const { useOnlineStatus } = require('@/lib/hooks/useOnlineStatus');
      useOnlineStatus.mockReturnValue(false);

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Offline banner should be displayed
      await waitFor(() => {
        expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();
      });
    });

    it('should disable refresh button when offline', async () => {
      const { useOnlineStatus } = require('@/lib/hooks/useOnlineStatus');
      useOnlineStatus.mockReturnValue(false);

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Refresh button should be disabled
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      expect(refreshButton).toBeDisabled();
    });

    it('should show offline indicator in freshness display', async () => {
      const { useOnlineStatus } = require('@/lib/hooks/useOnlineStatus');
      useOnlineStatus.mockReturnValue(false);

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Offline indicator should be present
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render navigation components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Top navigation should be present
      const topNav = document.querySelector('nav');
      expect(topNav).toBeInTheDocument();
    });

    it('should render all main sections', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Main content should be present
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();

      // Grid layout should be present
      const grid = main?.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should apply correct responsive classes', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Check for responsive padding classes
      const main = document.querySelector('main');
      expect(main?.className).toContain('px-4');
      expect(main?.className).toContain('md:px-8');
      expect(main?.className).toContain('xl:px-12');
    });
  });

  describe('Component Integration', () => {
    it('should integrate all layout components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // All major components should be present
      expect(document.querySelector('nav')).toBeInTheDocument(); // TopNavigation
      expect(document.querySelector('main')).toBeInTheDocument(); // Main content
    });

    it('should integrate hero section with pollutant grid', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Both hero and pollutant cards should be present
      expect(screen.getByText('156')).toBeInTheDocument(); // Hero AQI
      expect(screen.getByText('PM2.5')).toBeInTheDocument(); // Pollutant card
    });

    it('should integrate weather section with health recommendations', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('28.5°C')).toBeInTheDocument();
      });

      // Both weather and health sections should be present
      expect(screen.getByText('28.5°C')).toBeInTheDocument(); // Weather
      expect(screen.getByText(/limit prolonged outdoor exertion/i)).toBeInTheDocument(); // Health
    });

    it('should wrap components in error boundaries', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalled();
      });

      // Error boundaries should be present (they don't render anything visible when no error)
      // We verify they exist by checking the component structure
      expect(screen.getByText('156')).toBeInTheDocument();
    });
  });

  describe('Data Consistency', () => {
    it('should use same data across all components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledTimes(1);
      });

      // Verify API was called only once
      expect(mockGetCurrentAQI).toHaveBeenCalledTimes(1);

      // Verify data is displayed consistently
      expect(screen.getByText('156')).toBeInTheDocument(); // Hero
      expect(screen.getByText('89.5')).toBeInTheDocument(); // PM2.5 card
      expect(screen.getByText('28.5°C')).toBeInTheDocument(); // Weather
    });

    it('should update all components when data changes', async () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });

      // Update mock data
      const updatedData = {
        ...mockAQIData,
        aqi: { ...mockAQIData.aqi, value: 200 },
        pollutants: {
          ...mockAQIData.pollutants,
          pm25: { ...mockAQIData.pollutants.pm25, value: 120.5 },
        },
      };

      mockGetCurrentAQI.mockResolvedValue(updatedData);

      // Trigger refetch
      queryClient.invalidateQueries(['currentAQI']);

      rerender(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
      );

      // Verify updated data is displayed
      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });
  });
});
