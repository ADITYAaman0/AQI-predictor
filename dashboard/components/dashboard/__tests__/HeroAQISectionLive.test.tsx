/**
 * Tests for HeroAQISectionLive Component
 * 
 * Tests the integration of HeroAQISection with real API data
 * using TanStack Query.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroAQISectionLive } from '../HeroAQISectionLive';
import { getAQIClient } from '@/lib/api/aqi-client';

// Mock the AQI client
jest.mock('@/lib/api/aqi-client');

const mockGetCurrentAQI = jest.fn();
(getAQIClient as jest.Mock).mockReturnValue({
  getCurrentAQI: mockGetCurrentAQI,
});

// Mock data
const mockAQIData = {
  location: {
    id: 'delhi-1',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  },
  timestamp: '2024-01-15T10:30:00Z',
  aqi: {
    value: 125,
    category: 'unhealthy_sensitive',
    categoryLabel: 'Unhealthy for Sensitive Groups',
    dominantPollutant: 'pm25',
    color: '#FB923C',
    healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
  },
  pollutants: {
    pm25: {
      value: 55.5,
      unit: 'μg/m³',
      aqi: 125,
      status: 'unhealthy_sensitive',
    },
    pm10: {
      value: 85.2,
      unit: 'μg/m³',
      aqi: 78,
      status: 'moderate',
    },
    o3: {
      value: 45.0,
      unit: 'ppb',
      aqi: 42,
      status: 'good',
    },
    no2: {
      value: 35.0,
      unit: 'ppb',
      aqi: 38,
      status: 'good',
    },
    so2: {
      value: 12.0,
      unit: 'ppb',
      aqi: 15,
      status: 'good',
    },
    co: {
      value: 1.2,
      unit: 'ppm',
      aqi: 12,
      status: 'good',
    },
  },
  weather: {
    temperature: 25.5,
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
    pm25Lower: 50.0,
    pm25Upper: 61.0,
    level: 'high',
    score: 0.85,
    modelWeights: {
      lstm: 0.4,
      gnn: 0.35,
      ensemble: 0.25,
    },
  },
  dataSources: ['cpcb', 'openaq'],
  lastUpdated: '2024-01-15T10:30:00Z',
  modelVersion: '2.1.0',
};

// Helper to create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

// Helper to render with QueryClient
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('HeroAQISectionLive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('displays loading state while fetching data', () => {
      mockGetCurrentAQI.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithQueryClient(<HeroAQISectionLive location="Delhi" />);

      // Should show loading skeleton
      expect(screen.getByTestId('hero-aqi-section')).toBeInTheDocument();
      // Loading state shows pulse animation
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Success State Tests
  // ============================================================================

  describe('Success State', () => {
    it('displays AQI data when fetch succeeds', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      renderWithQueryClient(<HeroAQISectionLive location="Delhi" />);

      // Wait for data to load - check for category label instead of exact AQI value
      // (AQI value may be animating)
      await waitFor(() => {
        expect(screen.getByText('Unhealthy for Sensitive Groups')).toBeInTheDocument();
      });

      // Verify all key elements are displayed
      expect(screen.getByText(/Sensitive groups should limit/)).toBeInTheDocument();
      expect(screen.getByText('Delhi')).toBeInTheDocument();
      
      // Verify AQI value is in the document (may be animating, so check for presence)
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toBeInTheDocument();
      expect(parseInt(aqiValue.textContent || '0')).toBeGreaterThan(0);
    });

    it('calls getCurrentAQI with correct location', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      renderWithQueryClient(<HeroAQISectionLive location="Mumbai" />);

      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledWith('Mumbai');
      });
    });

    it('calls onSuccess callback when data is fetched', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);
      const onSuccess = jest.fn();

      renderWithQueryClient(
        <HeroAQISectionLive location="Delhi" onSuccess={onSuccess} />
      );

      await waitFor(() => {
        expect(screen.getByText('Unhealthy for Sensitive Groups')).toBeInTheDocument();
      });
      
      // onSuccess should have been called
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(mockAQIData);
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('Error State', () => {
    it('displays error message when fetch fails', async () => {
      const errorMessage = 'Network error';
      mockGetCurrentAQI.mockRejectedValue(new Error(errorMessage));

      renderWithQueryClient(<HeroAQISectionLive location="Delhi" />);

      // Wait for error state - should show error in HeroAQISection
      await waitFor(() => {
        expect(screen.getByText(/Unable to Load AQI Data/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('calls onError callback when fetch fails', async () => {
      const error = new Error('Network error');
      mockGetCurrentAQI.mockRejectedValue(error);
      const onError = jest.fn();

      renderWithQueryClient(
        <HeroAQISectionLive location="Delhi" onError={onError} />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  // ============================================================================
  // Auto-refresh Tests
  // ============================================================================

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('refetches data after refetch interval when autoRefresh is true', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      renderWithQueryClient(
        <HeroAQISectionLive
          location="Delhi"
          autoRefresh={true}
          refetchInterval={5000} // 5 seconds for testing
        />
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      // Should have refetched
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledTimes(2);
      });
    });

    it('does not refetch when autoRefresh is false', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      renderWithQueryClient(
        <HeroAQISectionLive
          location="Delhi"
          autoRefresh={false}
          refetchInterval={5000}
        />
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      // Should NOT have refetched
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ============================================================================
  // Location Change Tests
  // ============================================================================

  describe('Location Changes', () => {
    it('refetches data when location changes', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      const { rerender } = renderWithQueryClient(
        <HeroAQISectionLive location="Delhi" />
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledWith('Delhi');
      });

      // Change location
      const queryClient = createTestQueryClient();
      rerender(
        <QueryClientProvider client={queryClient}>
          <HeroAQISectionLive location="Mumbai" />
        </QueryClientProvider>
      );

      // Should fetch for new location
      await waitFor(() => {
        expect(mockGetCurrentAQI).toHaveBeenCalledWith('Mumbai');
      });
    });
  });

  // ============================================================================
  // Data Transformation Tests
  // ============================================================================

  describe('Data Transformation', () => {
    it('correctly transforms API response to component props', async () => {
      mockGetCurrentAQI.mockResolvedValue(mockAQIData);

      renderWithQueryClient(<HeroAQISectionLive location="Delhi" />);

      await waitFor(() => {
        // Verify category
        expect(screen.getByTestId('aqi-category')).toHaveTextContent(
          'Unhealthy for Sensitive Groups'
        );
      });
      
      // Verify AQI value is displayed (may be animating)
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toBeInTheDocument();
      expect(parseInt(aqiValue.textContent || '0')).toBeGreaterThan(0);
      
      // Verify dominant pollutant
      expect(screen.getByTestId('dominant-pollutant')).toHaveTextContent(
        'Primary: PM25'
      );
      
      // Verify health message
      expect(screen.getByTestId('health-message')).toHaveTextContent(
        'Sensitive groups should limit prolonged outdoor exertion'
      );
      
      // Verify location
      expect(screen.getByTestId('current-location')).toHaveTextContent('Delhi');
    });
  });
});
