/**
 * Integration tests for PollutantMetricsGridLive component
 * 
 * Tests the live pollutant metrics grid with API integration.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PollutantMetricsGridLive } from '../PollutantMetricsGridLive';
import * as aqiClient from '@/lib/api/aqi-client';
import type { CurrentAQIResponse } from '@/lib/api/types';

// Mock the AQI client
jest.mock('@/lib/api/aqi-client');

describe('PollutantMetricsGridLive', () => {
  let queryClient: QueryClient;

  // Mock API response
  const mockAPIResponse: CurrentAQIResponse = {
    location: {
      coordinates: { latitude: 28.6139, longitude: 77.209 },
      name: 'Delhi',
      city: 'Delhi',
      country: 'India',
    },
    timestamp: '2024-01-15T10:00:00Z',
    aqi: {
      value: 156,
      category: 'unhealthy',
      categoryLabel: 'Unhealthy',
      dominantPollutant: 'pm25',
      color: '#FB923C',
      healthMessage: 'Everyone should limit prolonged outdoor exertion',
    },
    pollutants: {
      pm25: {
        parameter: 'pm25',
        value: 65.5,
        unit: 'μg/m³',
        aqi_value: 156,
        category: 'Unhealthy',
      },
      pm10: {
        parameter: 'pm10',
        value: 120.3,
        unit: 'μg/m³',
        aqi_value: 89,
        category: 'Moderate',
      },
      o3: {
        parameter: 'o3',
        value: 45.2,
        unit: 'μg/m³',
        aqi_value: 42,
        category: 'Good',
      },
      no2: {
        parameter: 'no2',
        value: 38.7,
        unit: 'μg/m³',
        aqi_value: 35,
        category: 'Good',
      },
      so2: {
        parameter: 'so2',
        value: 12.4,
        unit: 'μg/m³',
        aqi_value: 18,
        category: 'Good',
      },
      co: {
        parameter: 'co',
        value: 1.2,
        unit: 'mg/m³',
        aqi_value: 12,
        category: 'Good',
      },
    },
    weather: {
      temperature: 25,
      humidity: 60,
      windSpeed: 5,
      windDirection: 180,
      pressure: 1013,
    },
    sourceAttribution: {
      vehicular: 45,
      industrial: 30,
      biomass: 15,
      background: 10,
    },
    confidence: {
      pm25Lower: 60,
      pm25Upper: 70,
      level: 'high',
      score: 0.85,
      modelWeights: {},
    },
    dataSources: ['CPCB', 'OpenAQ'],
    lastUpdated: '2024-01-15T10:00:00Z',
    modelVersion: '1.0.0',
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
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      // Mock pending API call
      const mockClient = {
        getCurrentAQI: jest.fn(() => new Promise(() => {})), // Never resolves
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      expect(
        screen.getByTestId('pollutant-metrics-grid-live-loading')
      ).toBeInTheDocument();
      expect(screen.getByText('Loading pollutant data...')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes during loading', () => {
      const mockClient = {
        getCurrentAQI: jest.fn(() => new Promise(() => {})),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      const loadingElement = screen.getByTestId(
        'pollutant-metrics-grid-live-loading'
      );
      expect(loadingElement).toHaveAttribute('role', 'status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Success State', () => {
    it('should display pollutant grid when data loads successfully', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(
          screen.getByTestId('pollutant-metrics-grid-live-success')
        ).toBeInTheDocument();
      });

      // Should display the grid
      expect(screen.getByTestId('pollutant-metrics-grid')).toBeInTheDocument();
    });

    it('should display all 6 pollutant cards with real data', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByTestId('pollutant-metrics-grid')).toBeInTheDocument();
      });

      // Check for all pollutant cards
      expect(screen.getByText('PM2.5')).toBeInTheDocument();
      expect(screen.getByText('PM10')).toBeInTheDocument();
      expect(screen.getByText('O₃')).toBeInTheDocument();
      expect(screen.getByText('NO₂')).toBeInTheDocument();
      expect(screen.getByText('SO₂')).toBeInTheDocument();
      expect(screen.getByText('CO')).toBeInTheDocument();
    });

    it('should display correct pollutant values', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByText('65.5')).toBeInTheDocument(); // PM2.5
        expect(screen.getByText('120.3')).toBeInTheDocument(); // PM10
        expect(screen.getByText('45.2')).toBeInTheDocument(); // O3
        expect(screen.getByText('38.7')).toBeInTheDocument(); // NO2
        expect(screen.getByText('12.4')).toBeInTheDocument(); // SO2
        expect(screen.getByText('1.2')).toBeInTheDocument(); // CO
      });
    });

    it('should display last updated timestamp', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('should call onDataLoaded callback when data loads', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      const onDataLoaded = jest.fn();

      renderWithProviders(
        <PollutantMetricsGridLive
          location="Delhi"
          onDataLoaded={onDataLoaded}
        />
      );

      await waitFor(() => {
        expect(onDataLoaded).toHaveBeenCalledTimes(1);
      });
    });

    it('should have proper ARIA label with location', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        const successElement = screen.getByTestId(
          'pollutant-metrics-grid-live-success'
        );
        expect(successElement).toHaveAttribute(
          'aria-label',
          'Pollutant metrics for Delhi'
        );
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when API fails', async () => {
      const mockClient = {
        getCurrentAQI: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(
          screen.getByTestId('pollutant-metrics-grid-live-error')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText('Failed to load pollutant data')
      ).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should display retry button on error', async () => {
      const mockClient = {
        getCurrentAQI: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should call onError callback when error occurs', async () => {
      const mockError = new Error('Network error');
      const mockClient = {
        getCurrentAQI: jest.fn().mockRejectedValue(mockError),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      const onError = jest.fn();

      renderWithProviders(
        <PollutantMetricsGridLive location="Delhi" onError={onError} />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });

    it('should have proper ARIA attributes for error state', async () => {
      const mockClient = {
        getCurrentAQI: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(<PollutantMetricsGridLive location="Delhi" />);

      await waitFor(() => {
        const errorElement = screen.getByTestId(
          'pollutant-metrics-grid-live-error'
        );
        expect(errorElement).toHaveAttribute('role', 'alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Location Changes', () => {
    it('should fetch new data when location changes', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      const { rerender } = renderWithProviders(
        <PollutantMetricsGridLive location="Delhi" />
      );

      await waitFor(() => {
        expect(mockClient.getCurrentAQI).toHaveBeenCalledWith('Delhi');
      });

      // Change location
      rerender(
        <QueryClientProvider client={queryClient}>
          <PollutantMetricsGridLive location="Mumbai" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockClient.getCurrentAQI).toHaveBeenCalledWith('Mumbai');
      });
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', async () => {
      const mockClient = {
        getCurrentAQI: jest.fn().mockResolvedValue(mockAPIResponse),
      };
      (aqiClient.getAQIClient as jest.Mock).mockReturnValue(mockClient);

      renderWithProviders(
        <PollutantMetricsGridLive
          location="Delhi"
          className="custom-class"
        />
      );

      await waitFor(() => {
        const element = screen.getByTestId(
          'pollutant-metrics-grid-live-success'
        );
        expect(element).toHaveClass('custom-class');
      });
    });
  });
});
