/**
 * Tests for SourceAttributionCardConnected Component
 * 
 * Tests the API integration and data extraction for source attribution.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourceAttributionCardConnected } from '../SourceAttributionCardConnected';
import * as useCurrentAQIModule from '@/lib/api/hooks/useCurrentAQI';

// Mock the useCurrentAQI hook
jest.mock('@/lib/api/hooks/useCurrentAQI');

const mockUseCurrentAQI = useCurrentAQIModule.useCurrentAQI as jest.MockedFunction<
  typeof useCurrentAQIModule.useCurrentAQI
>;

describe('SourceAttributionCardConnected', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Data Extraction', () => {
    it('should extract source attribution from API response', async () => {
      const mockData = {
        location: {
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          name: 'Delhi',
          country: 'India',
        },
        timestamp: '2024-01-15T10:00:00Z',
        aqi: {
          value: 150,
          category: 'unhealthy_sensitive' as const,
          categoryLabel: 'Unhealthy for Sensitive Groups',
          dominantPollutant: 'pm25',
          color: '#FB923C',
          healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
        },
        pollutants: {
          pm25: { parameter: 'pm25', value: 75, unit: 'μg/m³', aqi_value: 150 },
          pm10: { parameter: 'pm10', value: 100, unit: 'μg/m³', aqi_value: 80 },
          o3: { parameter: 'o3', value: 50, unit: 'μg/m³', aqi_value: 45 },
          no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 35 },
          so2: { parameter: 'so2', value: 20, unit: 'μg/m³', aqi_value: 25 },
          co: { parameter: 'co', value: 1.5, unit: 'mg/m³', aqi_value: 30 },
        },
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
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
          pm25Lower: 135,
          pm25Upper: 165,
          level: 'medium' as const,
          score: 0.75,
          modelWeights: {},
        },
        dataSources: ['CPCB', 'OpenAQ'],
        lastUpdated: '2024-01-15T10:00:00Z',
        modelVersion: '1.0.0',
      };

      mockUseCurrentAQI.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      renderWithProviders(<SourceAttributionCardConnected location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
      });

      // Verify that source attribution data is displayed
      expect(screen.getByText('Vehicular')).toBeInTheDocument();
      expect(screen.getByText('Industrial')).toBeInTheDocument();
      expect(screen.getByText('Biomass Burning')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();

      // Verify percentages
      expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('45%');
      expect(screen.getByTestId('legend-value-industrial')).toHaveTextContent('25%');
      expect(screen.getByTestId('legend-value-biomass')).toHaveTextContent('20%');
      expect(screen.getByTestId('legend-value-background')).toHaveTextContent('10%');
    });

    it('should handle missing source attribution data', async () => {
      const mockData = {
        location: {
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          name: 'Delhi',
          country: 'India',
        },
        timestamp: '2024-01-15T10:00:00Z',
        aqi: {
          value: 150,
          category: 'unhealthy_sensitive' as const,
          categoryLabel: 'Unhealthy for Sensitive Groups',
          dominantPollutant: 'pm25',
          color: '#FB923C',
          healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
        },
        pollutants: {
          pm25: { parameter: 'pm25', value: 75, unit: 'μg/m³', aqi_value: 150 },
          pm10: { parameter: 'pm10', value: 100, unit: 'μg/m³', aqi_value: 80 },
          o3: { parameter: 'o3', value: 50, unit: 'μg/m³', aqi_value: 45 },
          no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 35 },
          so2: { parameter: 'so2', value: 20, unit: 'μg/m³', aqi_value: 25 },
          co: { parameter: 'co', value: 1.5, unit: 'mg/m³', aqi_value: 30 },
        },
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
          windDirection: 180,
          pressure: 1013,
        },
        sourceAttribution: {
          vehicular: 0,
          industrial: 0,
          biomass: 0,
          background: 0,
        },
        confidence: {
          pm25Lower: 135,
          pm25Upper: 165,
          level: 'medium' as const,
          score: 0.75,
          modelWeights: {},
        },
        dataSources: ['CPCB', 'OpenAQ'],
        lastUpdated: '2024-01-15T10:00:00Z',
        modelVersion: '1.0.0',
      };

      mockUseCurrentAQI.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      renderWithProviders(<SourceAttributionCardConnected location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByTestId('source-attribution-empty')).toBeInTheDocument();
      });

      expect(screen.getByText('No source attribution data available')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching data', () => {
      mockUseCurrentAQI.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: false,
      } as any);

      renderWithProviders(<SourceAttributionCardConnected location="Delhi" />);

      expect(screen.getByTestId('source-attribution-loading')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API call fails', async () => {
      const mockError = new Error('Failed to fetch data');

      mockUseCurrentAQI.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
        isError: true,
        isSuccess: false,
      } as any);

      renderWithProviders(<SourceAttributionCardConnected location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByTestId('source-attribution-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Unable to load source attribution data')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });

    it('should show cached data when error occurs but data exists', async () => {
      const mockData = {
        location: {
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          name: 'Delhi',
          country: 'India',
        },
        timestamp: '2024-01-15T10:00:00Z',
        aqi: {
          value: 150,
          category: 'unhealthy_sensitive' as const,
          categoryLabel: 'Unhealthy for Sensitive Groups',
          dominantPollutant: 'pm25',
          color: '#FB923C',
          healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
        },
        pollutants: {
          pm25: { parameter: 'pm25', value: 75, unit: 'μg/m³', aqi_value: 150 },
          pm10: { parameter: 'pm10', value: 100, unit: 'μg/m³', aqi_value: 80 },
          o3: { parameter: 'o3', value: 50, unit: 'μg/m³', aqi_value: 45 },
          no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 35 },
          so2: { parameter: 'so2', value: 20, unit: 'μg/m³', aqi_value: 25 },
          co: { parameter: 'co', value: 1.5, unit: 'mg/m³', aqi_value: 30 },
        },
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
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
          pm25Lower: 135,
          pm25Upper: 165,
          level: 'medium' as const,
          score: 0.75,
          modelWeights: {},
        },
        dataSources: ['CPCB', 'OpenAQ'],
        lastUpdated: '2024-01-15T10:00:00Z',
        modelVersion: '1.0.0',
      };

      const mockError = new Error('Network error');

      mockUseCurrentAQI.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
        isError: true,
        isSuccess: false,
      } as any);

      renderWithProviders(<SourceAttributionCardConnected location="Delhi" />);

      await waitFor(() => {
        expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
      });

      // Should show cached data, not error state
      expect(screen.queryByTestId('source-attribution-error')).not.toBeInTheDocument();
      expect(screen.getByText('Vehicular')).toBeInTheDocument();
    });
  });

  describe('Location Changes', () => {
    it('should update data when location changes', async () => {
      const mockDataDelhi = {
        location: {
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          name: 'Delhi',
          country: 'India',
        },
        timestamp: '2024-01-15T10:00:00Z',
        aqi: {
          value: 150,
          category: 'unhealthy_sensitive' as const,
          categoryLabel: 'Unhealthy for Sensitive Groups',
          dominantPollutant: 'pm25',
          color: '#FB923C',
          healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
        },
        pollutants: {
          pm25: { parameter: 'pm25', value: 75, unit: 'μg/m³', aqi_value: 150 },
          pm10: { parameter: 'pm10', value: 100, unit: 'μg/m³', aqi_value: 80 },
          o3: { parameter: 'o3', value: 50, unit: 'μg/m³', aqi_value: 45 },
          no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 35 },
          so2: { parameter: 'so2', value: 20, unit: 'μg/m³', aqi_value: 25 },
          co: { parameter: 'co', value: 1.5, unit: 'mg/m³', aqi_value: 30 },
        },
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
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
          pm25Lower: 135,
          pm25Upper: 165,
          level: 'medium' as const,
          score: 0.75,
          modelWeights: {},
        },
        dataSources: ['CPCB', 'OpenAQ'],
        lastUpdated: '2024-01-15T10:00:00Z',
        modelVersion: '1.0.0',
      };

      mockUseCurrentAQI.mockReturnValue({
        data: mockDataDelhi,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      const { rerender } = renderWithProviders(
        <SourceAttributionCardConnected location="Delhi" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
      });

      // Verify Delhi data
      expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('45%');

      // Change location to Mumbai
      const mockDataMumbai = {
        ...mockDataDelhi,
        location: {
          coordinates: { latitude: 19.076, longitude: 72.8777 },
          name: 'Mumbai',
          country: 'India',
        },
        sourceAttribution: {
          vehicular: 60,
          industrial: 20,
          biomass: 15,
          background: 5,
        },
      };

      mockUseCurrentAQI.mockReturnValue({
        data: mockDataMumbai,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      rerender(
        <QueryClientProvider client={queryClient}>
          <SourceAttributionCardConnected location="Mumbai" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('60%');
      });
    });
  });

  describe('Custom Props', () => {
    it('should accept custom title', async () => {
      const mockData = {
        location: {
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          name: 'Delhi',
          country: 'India',
        },
        timestamp: '2024-01-15T10:00:00Z',
        aqi: {
          value: 150,
          category: 'unhealthy_sensitive' as const,
          categoryLabel: 'Unhealthy for Sensitive Groups',
          dominantPollutant: 'pm25',
          color: '#FB923C',
          healthMessage: 'Sensitive groups should limit prolonged outdoor exertion',
        },
        pollutants: {
          pm25: { parameter: 'pm25', value: 75, unit: 'μg/m³', aqi_value: 150 },
          pm10: { parameter: 'pm10', value: 100, unit: 'μg/m³', aqi_value: 80 },
          o3: { parameter: 'o3', value: 50, unit: 'μg/m³', aqi_value: 45 },
          no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 35 },
          so2: { parameter: 'so2', value: 20, unit: 'μg/m³', aqi_value: 25 },
          co: { parameter: 'co', value: 1.5, unit: 'mg/m³', aqi_value: 30 },
        },
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
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
          pm25Lower: 135,
          pm25Upper: 165,
          level: 'medium' as const,
          score: 0.75,
          modelWeights: {},
        },
        dataSources: ['CPCB', 'OpenAQ'],
        lastUpdated: '2024-01-15T10:00:00Z',
        modelVersion: '1.0.0',
      };

      mockUseCurrentAQI.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      renderWithProviders(
        <SourceAttributionCardConnected
          location="Delhi"
          title="Custom Pollution Sources"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Pollution Sources')).toBeInTheDocument();
      });
    });
  });
});
