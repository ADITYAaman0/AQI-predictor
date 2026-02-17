/**
 * Tests for polling fallback mechanism (Task 17.4, 17.5)
 * 
 * Tests cover:
 * - WebSocket support detection
 * - Polling functionality
 * - Fallback behavior when WebSocket unavailable
 * - Adaptive data fetching strategy
 * - Polling interval configuration
 * - Manual poll triggering
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  hasWebSocketSupport,
  usePollingFallback,
  useAdaptiveDataFetching,
} from '@/lib/hooks/usePollingFallback';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Polling Fallback (Task 17.4, 17.5)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    queryClient.clear();
    jest.useRealTimers();
  });

  describe('WebSocket Support Detection', () => {
    it('should detect WebSocket support in browser', () => {
      // Set up WebSocket in global
      (global as any).WebSocket = class MockWebSocket {};

      expect(hasWebSocketSupport()).toBe(true);

      delete (global as any).WebSocket;
    });

    it('should detect when WebSocket is not supported', () => {
      delete (global as any).WebSocket;

      expect(hasWebSocketSupport()).toBe(false);
    });

    it('should return false in server-side environment', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      expect(hasWebSocketSupport()).toBe(false);

      (global as any).window = originalWindow;
    });
  });

  describe('usePollingFallback Hook', () => {
    it('should start polling when enabled', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 10000, // 10 seconds
          fetchFn,
        })
      );

      // Should start polling immediately
      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledWith('Delhi');
        expect(result.current.isPolling).toBe(true);
      });

      expect(result.current.pollCount).toBe(1);
    });

    it('should not poll when disabled', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: false,
          interval: 10000,
          fetchFn,
        })
      );

      // Wait a bit to ensure no polling happens
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result.current.isPolling).toBe(false);
    });

    it('should poll at specified interval', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 5000, // 5 seconds
          fetchFn,
        })
      );

      // Initial poll
      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });

      // Wait for interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });

      // Wait for another interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(3);
      });
    });

    it('should track last poll time', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 10000,
          fetchFn,
        })
      );

      await waitFor(() => {
        expect(result.current.lastPollTime).not.toBeNull();
        expect(result.current.lastPollTime).toBeInstanceOf(Date);
      });
    });

    it('should track poll count', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 1000,
          fetchFn,
        })
      );

      // Initial poll
      await waitFor(() => {
        expect(result.current.pollCount).toBe(1);
      });

      // Second poll
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.pollCount).toBe(2);
      });
    });

    it('should call onUpdate callback with fetched data', async () => {
      const mockData = { aqi: 150, category: 'unhealthy' };
      const fetchFn = jest.fn().mockResolvedValue(mockData);
      const onUpdate = jest.fn();

      renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 10000,
          fetchFn,
          onUpdate,
        })
      );

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockData);
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 10000,
          fetchFn,
        })
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Polling error:',
          expect.any(Error)
        );
      });

      // Polling should continue despite error
      expect(result.current.isPolling).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should support manual poll triggering', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 10000,
          fetchFn,
        })
      );

      // Wait for initial poll
      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });

      // Manual poll before interval
      await act(async () => {
        await result.current.poll();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should stop polling on unmount', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result, unmount } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: true,
          interval: 1000,
          fetchFn,
        })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      const callCountBeforeUnmount = fetchFn.mock.calls.length;

      unmount();

      // Wait and verify no more polls happen
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(fetchFn).toHaveBeenCalledTimes(callCountBeforeUnmount);
    });

    it('should support start/stop polling controls', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        usePollingFallback({
          location: 'Delhi',
          enabled: false, // Start disabled
          interval: 1000,
          fetchFn,
        })
      );

      expect(result.current.isPolling).toBe(false);

      // Manually start polling
      act(() => {
        result.current.startPolling();
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      // Stop polling
      act(() => {
        result.current.stopPolling();
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });
  });

  describe('useAdaptiveDataFetching Hook', () => {
    it('should use WebSocket when available and connected', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });
      const webSocketSubscribe = jest.fn(() => jest.fn());

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: true,
          pollingInterval: 10000,
          fetchFn,
          isWebSocketAvailable: true,
          isWebSocketConnected: true,
          webSocketSubscribe,
        })
      );

      await waitFor(() => {
        expect(result.current.method).toBe('websocket');
        expect(webSocketSubscribe).toHaveBeenCalledWith('Delhi', expect.any(Function));
      });

      // Should not use polling
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fall back to polling when WebSocket unavailable', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: true,
          pollingInterval: 10000,
          fetchFn,
          isWebSocketAvailable: false,
          isWebSocketConnected: false,
        })
      );

      await waitFor(() => {
        expect(result.current.method).toBe('polling');
        expect(fetchFn).toHaveBeenCalled();
      });
    });

    it('should fall back to polling when WebSocket disconnected', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });
      const webSocketSubscribe = jest.fn(() => jest.fn());

      const { result, rerender } = renderHook(
        ({ isConnected }) =>
          useAdaptiveDataFetching({
            location: 'Delhi',
            enabled: true,
            preferWebSocket: true,
            pollingInterval: 10000,
            fetchFn,
            isWebSocketAvailable: true,
            isWebSocketConnected: isConnected,
            webSocketSubscribe,
          }),
        { initialProps: { isConnected: true } }
      );

      // Initially using WebSocket
      await waitFor(() => {
        expect(result.current.method).toBe('websocket');
      });

      // Disconnect WebSocket
      rerender({ isConnected: false });

      // Should fall back to polling
      await waitFor(() => {
        expect(result.current.method).toBe('polling');
        expect(fetchFn).toHaveBeenCalled();
      });
    });

    it('should use polling when WebSocket not preferred', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });
      const webSocketSubscribe = jest.fn(() => jest.fn());

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: false, // Explicitly prefer polling
          pollingInterval: 10000,
          fetchFn,
          isWebSocketAvailable: true,
          isWebSocketConnected: true,
          webSocketSubscribe,
        })
      );

      await waitFor(() => {
        expect(result.current.method).toBe('polling');
        expect(fetchFn).toHaveBeenCalled();
      });

      // Should not use WebSocket
      expect(webSocketSubscribe).not.toHaveBeenCalled();
    });

    it('should track update count from WebSocket', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });
      let webSocketCallback: ((data: any) => void) | null = null;
      const webSocketSubscribe = jest.fn((location, callback) => {
        webSocketCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: true,
          pollingInterval: 10000,
          fetchFn,
          isWebSocketAvailable: true,
          isWebSocketConnected: true,
          webSocketSubscribe,
        })
      );

      await waitFor(() => {
        expect(result.current.method).toBe('websocket');
      });

      // Simulate WebSocket updates
      act(() => {
        webSocketCallback?.({ aqi: 100 });
      });

      await waitFor(() => {
        expect(result.current.updateCount).toBe(1);
      });

      act(() => {
        webSocketCallback?.({ aqi: 110 });
      });

      await waitFor(() => {
        expect(result.current.updateCount).toBe(2);
      });
    });

    it('should track active status correctly', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: false,
          pollingInterval: 10000,
          fetchFn,
          isWebSocketAvailable: false,
          isWebSocketConnected: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
        expect(result.current.method).toBe('polling');
      });
    });

    it('should call onUpdate callback', async () => {
      const mockData = { aqi: 150 };
      const fetchFn = jest.fn().mockResolvedValue(mockData);
      const onUpdate = jest.fn();

      renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: false,
          pollingInterval: 10000,
          fetchFn,
          onUpdate,
          isWebSocketAvailable: false,
          isWebSocketConnected: false,
        })
      );

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockData);
      });
    });

    it('should support manual refresh', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ aqi: 100 });

      const { result } = renderHook(() =>
        useAdaptiveDataFetching({
          location: 'Delhi',
          enabled: true,
          preferWebSocket: false,
          pollingInterval: 30000,
          fetchFn,
          isWebSocketAvailable: false,
          isWebSocketConnected: false,
        })
      );

      // Wait for initial poll
      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });

      // Manual refresh
      await act(async () => {
        result.current.refresh();
      });

      // Should trigger another fetch immediately
      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });
});
