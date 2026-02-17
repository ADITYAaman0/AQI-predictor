/**
 * Integration tests for WebSocket real-time updates (Task 17.5)
 * 
 * Tests cover:
 * - WebSocket connection/disconnection
 * - Reconnection logic with exponential backoff
 * - Real-time data updates
 * - Location subscription management
 * - Error handling and recovery
 * - Integration with React components
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AQIWebSocketClient, AQIUpdate } from '@/lib/websocket/client';
import { useRealtimeAQI } from '@/lib/hooks/useRealtimeAQI';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { LocationProvider } from '@/providers/LocationProvider';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper method to simulate error
  simulateError(error: Event) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Store reference to the mock instance
let mockWebSocketInstance: MockWebSocket | null = null;

// Mock WebSocket globally
beforeAll(() => {
  (global as any).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWebSocketInstance = this;
    }
  };
});

afterAll(() => {
  delete (global as any).WebSocket;
});

describe('WebSocket Real-time Updates (Task 17.5)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockWebSocketInstance = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection on mount', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      // Wait for WebSocket to connect
      await waitFor(
        () => {
          expect(mockWebSocketInstance).not.toBeNull();
          expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
        },
        { timeout: 100 }
      );

      expect(mockWebSocketInstance?.url).toContain('Delhi');
    });

    it('should disconnect WebSocket on unmount', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result, unmount } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      const ws = mockWebSocketInstance;

      unmount();

      await waitFor(() => {
        expect(ws?.readyState).toBe(MockWebSocket.CLOSED);
      });
    });

    it('should track connection state correctly', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      // Initially connecting
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);

      // Wait for connection to open
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
      });
    });
  });

  describe('Real-time Data Updates', () => {
    it('should receive and process AQI updates', async () => {
      const onUpdate = jest.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useRealtimeAQI({ location: 'Delhi', onUpdate }),
        { wrapper }
      );

      // Wait for WebSocket to connect
      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      // Simulate receiving an AQI update
      const mockUpdate: AQIUpdate = {
        type: 'aqi_update',
        location: 'delhi',
        timestamp: new Date().toISOString(),
        data: {
          aqi: 150,
          category: 'unhealthy',
          pollutants: {},
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(mockUpdate);
      });

      // Wait for update to be processed
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockUpdate);
        expect(result.current.data).toEqual(mockUpdate);
      });
    });

    it('should update UI when new data arrives', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      // No data initially
      expect(result.current.data).toBeNull();

      // Simulate first update
      const update1: AQIUpdate = {
        type: 'aqi_update',
        location: 'delhi',
        timestamp: '2024-01-01T10:00:00Z',
        data: { aqi: 100 },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(update1);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(update1);
      });

      // Simulate second update
      const update2: AQIUpdate = {
        type: 'aqi_update',
        location: 'delhi',
        timestamp: '2024-01-01T10:05:00Z',
        data: { aqi: 110 },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(update2);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(update2);
      });
    });

    it('should invalidate React Query cache on update', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useRealtimeAQI({ location: 'Delhi', invalidateCache: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      const mockUpdate: AQIUpdate = {
        type: 'aqi_update',
        location: 'delhi',
        timestamp: new Date().toISOString(),
        data: { aqi: 150 },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(mockUpdate);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['currentAQI', 'delhi'],
        });
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      jest.useFakeTimers();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      // Wait for initial connection
      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      const firstWs = mockWebSocketInstance;
      expect(result.current.isConnected).toBe(true);

      // Simulate unexpected disconnect
      act(() => {
        firstWs?.close();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Wait for reconnection attempt (exponential backoff starts at 1s)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // New WebSocket instance should be created
      await waitFor(() => {
        expect(mockWebSocketInstance).not.toBe(firstWs);
      });

      jest.useRealTimers();
    });

    it('should track reconnection attempts', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      // Initial reconnect attempts should be 0
      expect(result.current.reconnectAttempts).toBe(0);

      // After disconnect and max reconnect attempts, should track attempts
      // (This would require more complex mocking to fully test)
    });
  });

  describe('Location Subscription Management', () => {
    it('should subscribe to location updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.url).toContain('Delhi');
      });
    });

    it('should switch location subscriptions', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result, rerender } = renderHook(
        ({ location }) => useRealtimeAQI({ location }),
        { wrapper, initialProps: { location: 'Delhi' } }
      );

      await waitFor(() => {
        expect(mockWebSocketInstance?.url).toContain('Delhi');
      });

      const firstWs = mockWebSocketInstance;

      // Change location
      rerender({ location: 'Mumbai' });

      await waitFor(() => {
        expect(mockWebSocketInstance).not.toBe(firstWs);
        expect(mockWebSocketInstance?.url).toContain('Mumbai');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      // Simulate error
      const error = new Event('error');
      act(() => {
        mockWebSocketInstance?.simulateError(error);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });

    it('should handle invalid message format', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      // Simulate invalid JSON
      act(() => {
        if (mockWebSocketInstance?.onmessage) {
          mockWebSocketInstance.onmessage(
            new MessageEvent('message', { data: 'invalid json' })
          );
        }
      });

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Manual Refresh', () => {
    it('should allow manual refresh trigger', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </LocationProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRealtimeAQI({ location: 'Delhi' }), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.OPEN);
      });

      const sendSpy = jest.spyOn(mockWebSocketInstance!, 'send');

      // Trigger refresh
      act(() => {
        result.current.refresh();
      });

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ action: 'refresh' }));
    });
  });
});
