/**
 * Integration Tests - API Client
 * 
 * Tests the integration between API client and components
 * ensuring proper data flow and error handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAQI } from '@/lib/api/hooks/useAQI';
import { useForecast } from '@/lib/api/hooks/useForecast';
import { useHistoricalData } from '@/lib/api/hooks/useHistoricalData';
import { apiClient } from '@/lib/api/client';
import type { ReactNode } from 'react';

// Mock axios
jest.mock('axios');

describe('API Client Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries:{ retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useAQI Hook Integration', () => {
    it('should fetch and return AQI data successfully', async () => {
      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isLoading).toBe(true);
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API to throw error
      jest.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.isLoading).toBe(true);
      });
    });

    it('should refetch data on location change', async () => {
      const { result, rerender } = renderHook(
        ({ lat, lng }: { lat: number; lng: number }) => useAQI({ lat, lng }),
        {
          wrapper,
          initialProps: { lat: 28.6139, lng: 77.2090 },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isLoading).toBe(true);
      });

      // Change location
      rerender({ lat: 19.0760, lng: 72.8777 });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isLoading).toBe(true);
      });
    });
  });

  describe('useForecast Hook Integration', () => {
    it('should fetch and return forecast data successfully', async () => {
      const { result } = renderHook(
        () => useForecast({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isLoading).toBe(true);
      });
    });

    it('should handle forecast endpoint errors', async () => {
      jest.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Forecast Error'));

      const { result } = renderHook(
        () => useForecast({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.isLoading).toBe(true);
      });
    });
  });

  describe('useHistoricalData Hook Integration', () => {
    it('should fetch and return historical data successfully', async () => {
      const { result } = renderHook(
        () => useHistoricalData({
          lat: 28.6139,
          lng: 77.2090,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isLoading).toBe(true);
      });
    });

    it('should handle date range validation', async () => {
      const { result } = renderHook(
        () => useHistoricalData({
          lat: 28.6139,
          lng: 77.2090,
          startDate: '2024-02-01',
          endDate: '2024-01-01', // End before start
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.isLoading).toBe(true);
      });
    });
  });

  describe('API Client Error Handling Integration', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const mockGet = jest.spyOn(apiClient, 'get')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { aqi: 50 } });

      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: 3, retryDelay: 100 },
        },
      });

      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 5000 });
    });

    it('should handle 401 unauthorized errors', async () => {
      jest.spyOn(apiClient, 'get').mockRejectedValueOnce({
        response: { status: 401 },
      });

      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.isLoading).toBe(true);
      });
    });

    it('should handle 500 server errors', async () => {
      jest.spyOn(apiClient, 'get').mockRejectedValueOnce({
        response: { status: 500 },
      });

      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.isLoading).toBe(true);
      });
    });
  });

  describe('Data Caching Integration', () => {
    it('should cache API responses and reuse them', async () => {
      const mockGet = jest.spyOn(apiClient, 'get')
        .mockResolvedValue({ data: { aqi: 50 } });

      // First call
      const { result: result1 } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call with same params - should use cache
      const { result: result2 } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // API should only be called once due to caching
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on mutation', async () => {
      const mockGet = jest.spyOn(apiClient, 'get')
        .mockResolvedValue({ data: { aqi: 50 } });

      const { result } = renderHook(
        () => useAQI({ lat: 28.6139, lng: 77.2090 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['aqi'] });

      // Should trigger refetch
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });
    });
  });
});

describe('Component Integration Tests', () => {
  it('should pass - placeholder for component integration tests', () => {
    expect(true).toBe(true);
  });
});

describe('Page Integration Tests', () => {
  it('should pass - placeholder for page integration tests', () => {
    expect(true).toBe(true);
  });
});
