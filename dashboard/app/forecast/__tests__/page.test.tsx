/**
 * Forecast Page Integration Tests
 * 
 * Tests the complete forecast page functionality including:
 * - Complete forecast flow from API to UI
 * - Data transformations
 * - Export functionality
 * - Component integration
 * - Loading and error states
 * - Responsive layout
 * 
 * Requirements: 4.1-4.11
 * Task: 10.5 - Write forecast page tests
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForecastPage from '../page';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { ForecastResponse, HourlyForecastData } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client');

// Mock the LocationProvider
jest.mock('@/providers/LocationProvider', () => ({
  useLocation: jest.fn(() => ({
    currentLocation: {
      id: 'delhi-1',
      name: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    isLoading: false,
  })),
}));

const mockGet24HourForecast = jest.fn();

describe('Forecast Page Integration Tests', () => {
  let queryClient: QueryClient;

  // Mock forecast data
  const mockForecastData: ForecastResponse = {
    location: {
      id: 'delhi-1',
      name: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    forecastType: '24_hour',
    generatedAt: new Date().toISOString(),
    forecasts: [
      {
        timestamp: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        forecastHour: 1,
        aqi: {
          value: 85,
          category: 'moderate',
          categoryLabel: 'Moderate',
          color: '#FCD34D',
          confidenceLower: 75,
          confidenceUpper: 95,
        },
        pollutants: {
          pm25: { value: 45.2, unit: 'μg/m³', aqi: 85, status: 'Moderate' },
          pm10: { value: 78.5, unit: 'μg/m³', aqi: 72, status: 'Moderate' },
          o3: { value: 32.1, unit: 'μg/m³', aqi: 28, status: 'Good' },
        },
        weather: {
          temperature: 26.5,
          humidity: 68,
          windSpeed: 8.5,
          windDirection: 180,
          pressure: 1012,
        },
        confidence: {
          score: 0.88,
          modelWeights: { lstm: 0.4, xgboost: 0.35, randomForest: 0.25 },
        },
      },
      {
        timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        forecastHour: 2,
        aqi: {
          value: 120,
          category: 'unhealthy_sensitive',
          categoryLabel: 'Unhealthy for Sensitive Groups',
          color: '#FB923C',
          confidenceLower: 110,
          confidenceUpper: 130,
        },
        pollutants: {
          pm25: { value: 68.5, unit: 'μg/m³', aqi: 120, status: 'Unhealthy for Sensitive' },
          pm10: { value: 95.2, unit: 'μg/m³', aqi: 88, status: 'Moderate' },
          o3: { value: 42.3, unit: 'μg/m³', aqi: 38, status: 'Good' },
        },
        weather: {
          temperature: 27.2,
          humidity: 65,
          windSpeed: 7.2,
          windDirection: 190,
          pressure: 1011,
        },
        confidence: {
          score: 0.85,
          modelWeights: { lstm: 0.4, xgboost: 0.35, randomForest: 0.25 },
        },
      },
      {
        timestamp: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        forecastHour: 3,
        aqi: {
          value: 45,
          category: 'good',
          categoryLabel: 'Good',
          color: '#4ADE80',
          confidenceLower: 40,
          confidenceUpper: 50,
        },
        pollutants: {
          pm25: { value: 22.5, unit: 'μg/m³', aqi: 45, status: 'Good' },
          pm10: { value: 42.1, unit: 'μg/m³', aqi: 38, status: 'Good' },
          o3: { value: 28.5, unit: 'μg/m³', aqi: 24, status: 'Good' },
        },
        weather: {
          temperature: 25.8,
          humidity: 72,
          windSpeed: 10.5,
          windDirection: 170,
          pressure: 1013,
        },
        confidence: {
          score: 0.92,
          modelWeights: { lstm: 0.4, xgboost: 0.35, randomForest: 0.25 },
        },
      },
    ],
    metadata: {
      modelVersion: '2.1.0',
      confidenceLevel: 0.88,
      dataSources: ['CPCB', 'OpenWeatherMap'],
      spatialResolution: '1km',
      updateFrequency: '1 hour',
      ensembleInfo: {
        modelsUsed: ['LSTM', 'XGBoost', 'RandomForest'],
        dynamicWeighting: true,
        confidenceIntervals: true,
      },
    },
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
      get24HourForecast: mockGet24HourForecast,
    });

    mockGet24HourForecast.mockResolvedValue(mockForecastData);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Complete Forecast Flow', () => {
    it('should fetch forecast data from API and display all components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalledWith('Delhi');
      });

      // Verify page header displays
      expect(screen.getByText('24-Hour Forecast')).toBeInTheDocument();
      expect(screen.getByText(/Air quality predictions for the next 24 hours in Delhi/i)).toBeInTheDocument();

      // Verify prediction graph section displays
      expect(screen.getByText('Hourly AQI Predictions')).toBeInTheDocument();

      // Verify forecast summary section displays
      expect(screen.getByText('Forecast Summary')).toBeInTheDocument();

      // Verify hourly forecast list section displays
      expect(screen.getByText('Hourly Forecast List')).toBeInTheDocument();
    });

    it('should pass forecast data correctly through component hierarchy', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Verify data flows to prediction graph
      await waitFor(() => {
        expect(screen.getByText('Hourly AQI Predictions')).toBeInTheDocument();
      });

      // Verify data flows to summary cards
      expect(screen.getByText('Best Time')).toBeInTheDocument();
      expect(screen.getByText('Worst Time')).toBeInTheDocument();

      // Verify data flows to hourly list
      expect(screen.getByText('Hourly Forecast List')).toBeInTheDocument();
    });

    it('should display export button when forecast data is available', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Export button should be present
      const exportButton = await screen.findByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should display AQI legend with all categories', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Verify all AQI categories are shown in legend
      expect(screen.getByText('Good (0-50)')).toBeInTheDocument();
      expect(screen.getByText('Moderate (51-100)')).toBeInTheDocument();
      expect(screen.getByText('Unhealthy for Sensitive (101-150)')).toBeInTheDocument();
      expect(screen.getByText('Unhealthy (151-200)')).toBeInTheDocument();
      expect(screen.getByText('Very Unhealthy (201-300)')).toBeInTheDocument();
      expect(screen.getByText('Hazardous (301+)')).toBeInTheDocument();
    });
  });

  describe('Data Transformations', () => {
    it('should transform forecast data for summary cards correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Best time should be hour 3 (AQI 45)
      await waitFor(() => {
        expect(screen.getByText('3:00 AM')).toBeInTheDocument();
      });

      // Worst time should be hour 2 (AQI 120)
      expect(screen.getByText('2:00 AM')).toBeInTheDocument();

      // Average AQI should be calculated
      expect(screen.getByText('24-Hour Average')).toBeInTheDocument();
    });

    it('should format timestamps correctly in hourly list', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Verify hour formatting (1:00 AM, 2:00 AM, 3:00 AM)
      await waitFor(() => {
        expect(screen.getByText('1:00 AM')).toBeInTheDocument();
      });
      expect(screen.getByText('2:00 AM')).toBeInTheDocument();
      expect(screen.getByText('3:00 AM')).toBeInTheDocument();
    });

    it('should display confidence intervals correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Confidence intervals should be displayed in hourly list
      await waitFor(() => {
        expect(screen.getByText('(75-95)')).toBeInTheDocument();
      });
      expect(screen.getByText('(110-130)')).toBeInTheDocument();
      expect(screen.getByText('(40-50)')).toBeInTheDocument();
    });

    it('should format pollutant values with correct units', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Pollutant values should be formatted with units
      await waitFor(() => {
        expect(screen.getByText('45.2')).toBeInTheDocument();
      });
      expect(screen.getAllByText('μg/m³').length).toBeGreaterThan(0);
    });

    it('should format weather data correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Weather values should be formatted
      await waitFor(() => {
        expect(screen.getByText('26.5°C')).toBeInTheDocument();
      });
      expect(screen.getByText('68%')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should display export button with dropdown', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      const exportButton = await screen.findByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).not.toBeDisabled();
    });

    it('should open dropdown menu when export button is clicked', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      const exportButton = await screen.findByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      // Dropdown menu should appear
      await waitFor(() => {
        expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      });
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });

    it('should disable export button when no forecast data', async () => {
      mockGet24HourForecast.mockResolvedValue({
        ...mockForecastData,
        forecasts: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Export button should not be present when no data
      const exportButton = screen.queryByRole('button', { name: /export/i });
      expect(exportButton).not.toBeInTheDocument();
    });

    it('should disable export button during loading', async () => {
      mockGet24HourForecast.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Export button should not be present during loading
      const exportButton = screen.queryByRole('button', { name: /export/i });
      expect(exportButton).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should display loading spinner while fetching forecast data', () => {
      mockGet24HourForecast.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Loading spinner should be displayed
      expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
    });

    it('should show loading state for prediction graph', () => {
      mockGet24HourForecast.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Page should show loading state
      expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
    });

    it('should show loading state for summary cards', () => {
      mockGet24HourForecast.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Loading state should be visible
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should show loading state for hourly list', () => {
      mockGet24HourForecast.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Loading spinner should be present
      expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
    });

    it('should transition from loading to loaded state', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('24-Hour Forecast')).toBeInTheDocument();
      });

      // Loading state should be gone
      expect(screen.queryByText('Loading forecast...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGet24HourForecast.mockRejectedValue(new Error('Network error'));

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Should show "no data" message instead of crashing
      await waitFor(() => {
        expect(screen.getByText(/no forecast data available/i)).toBeInTheDocument();
      });
    });

    it('should handle empty forecast data gracefully', async () => {
      mockGet24HourForecast.mockResolvedValue({
        ...mockForecastData,
        forecasts: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Should show "no data" message
      await waitFor(() => {
        expect(screen.getByText(/no forecast data available/i)).toBeInTheDocument();
      });
    });

    it('should handle missing pollutant data gracefully', async () => {
      const dataWithMissingPollutants = {
        ...mockForecastData,
        forecasts: mockForecastData.forecasts.map(f => ({
          ...f,
          pollutants: {},
        })),
      };

      mockGet24HourForecast.mockResolvedValue(dataWithMissingPollutants);

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Should display N/A for missing pollutants
      await waitFor(() => {
        expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
      });
    });

    it('should handle missing weather data gracefully', async () => {
      const dataWithMissingWeather = {
        ...mockForecastData,
        forecasts: mockForecastData.forecasts.map(f => ({
          ...f,
          weather: undefined,
        })),
      };

      mockGet24HourForecast.mockResolvedValue(dataWithMissingWeather);

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Should display N/A for missing weather
      await waitFor(() => {
        expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should render page header with responsive classes', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Check for responsive text classes
      const heading = screen.getByText('24-Hour Forecast');
      expect(heading.className).toContain('text-4xl');
      expect(heading.className).toContain('md:text-5xl');
    });

    it('should apply responsive padding to main container', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      const main = document.querySelector('main');
      expect(main?.className).toContain('px-4');
    });

    it('should render glassmorphic cards with correct styling', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Check for glassmorphic styling
      const glassCards = document.querySelectorAll('.glass-card');
      expect(glassCards.length).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('should integrate prediction graph with forecast data', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Prediction graph section should be present
      expect(screen.getByText('Hourly AQI Predictions')).toBeInTheDocument();
    });

    it('should integrate summary cards with forecast data', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Wait for summary cards to render
      await waitFor(() => {
        expect(screen.getByText('Best Time')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Worst Time')).toBeInTheDocument();
      expect(screen.getByText('Peak Pollution')).toBeInTheDocument();
      expect(screen.getByText('24-Hour Average')).toBeInTheDocument();
    });

    it('should integrate hourly list with forecast data', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Hourly list should be present
      expect(screen.getByText('Hourly Forecast List')).toBeInTheDocument();
    });

    it('should integrate export button with forecast data', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Export button should be present
      const exportButton = await screen.findByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should use same forecast data across all components', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Verify data is displayed consistently across components
      await waitFor(() => {
        expect(screen.getByText('Best Time')).toBeInTheDocument();
      }, { timeout: 3000 });
      expect(screen.getByText('Hourly Forecast List')).toBeInTheDocument();
    });
  });

  describe('Location Integration', () => {
    it('should display current location in page description', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Location should be displayed in description
      expect(screen.getByText(/Air quality predictions for the next 24 hours in Delhi/i)).toBeInTheDocument();
    });

    it('should fetch forecast for current location', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalledWith('Delhi');
      });
    });

    it('should handle location loading state', () => {
      const { useLocation } = require('@/providers/LocationProvider');
      useLocation.mockReturnValue({
        currentLocation: null,
        isLoading: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      // Should show loading state
      expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
    });
  });

  describe('Data Consistency', () => {
    it('should display forecast data consistently', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ForecastPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockGet24HourForecast).toHaveBeenCalled();
      });

      // Verify data is displayed
      await waitFor(() => {
        expect(screen.getByText('Best Time')).toBeInTheDocument();
      }, { timeout: 3000 });

      // All sections should be present
      expect(screen.getByText('Hourly Forecast List')).toBeInTheDocument();
      expect(screen.getByText('Forecast Summary')).toBeInTheDocument();
    });
  });
});
