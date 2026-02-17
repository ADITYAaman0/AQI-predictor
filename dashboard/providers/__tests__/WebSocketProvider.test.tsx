import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { WebSocketProvider, useWebSocket } from '../WebSocketProvider';
import { LocationProvider } from '../LocationProvider';
import { AQIWebSocketClient } from '@/lib/websocket/client';

// Mock the WebSocket client
jest.mock('@/lib/websocket/client');

const MockedAQIWebSocketClient = AQIWebSocketClient as jest.MockedClass<typeof AQIWebSocketClient>;

describe('WebSocketProvider', () => {
  let mockClient: jest.Mocked<AQIWebSocketClient>;
  let onConnectCallback: (() => void) | null = null;
  let onDisconnectCallback: (() => void) | null = null;
  let onErrorCallback: ((error: Error) => void) | null = null;
  let onMessageCallback: ((message: any) => void) | null = null;
  
  beforeEach(() => {
    // Reset callbacks
    onConnectCallback = null;
    onDisconnectCallback = null;
    onErrorCallback = null;
    onMessageCallback = null;
    
    // Create mock client
    mockClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribeToLocation: jest.fn(),
      unsubscribeFromLocation: jest.fn(),
      refresh: jest.fn(),
      onConnect: jest.fn((callback) => {
        onConnectCallback = callback;
        return jest.fn();
      }),
      onDisconnect: jest.fn((callback) => {
        onDisconnectCallback = callback;
        return jest.fn();
      }),
      onError: jest.fn((callback) => {
        onErrorCallback = callback;
        return jest.fn();
      }),
      onMessage: jest.fn((callback) => {
        onMessageCallback = callback;
        return jest.fn();
      }),
      isConnected: jest.fn(() => false),
      getReadyState: jest.fn(() => null),
    } as any;
    
    MockedAQIWebSocketClient.mockImplementation(() => mockClient);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LocationProvider>
      <WebSocketProvider autoConnect={false}>
        {children}
      </WebSocketProvider>
    </LocationProvider>
  );
  
  describe('Initialization', () => {
    it('should create WebSocket client with default URL', () => {
      renderHook(() => useWebSocket(), { wrapper });
      
      expect(MockedAQIWebSocketClient).toHaveBeenCalledWith(
        'ws://localhost:8000',
        expect.objectContaining({
          maxReconnectAttempts: 5,
          initialReconnectDelay: 1000,
          maxReconnectDelay: 30000,
          pingInterval: 30000,
        })
      );
    });
    
    it('should create WebSocket client with custom URL', () => {
      const customWrapper = ({ children }: { children: ReactNode }) => (
        <LocationProvider>
          <WebSocketProvider url="ws://custom:9000" autoConnect={false}>
            {children}
          </WebSocketProvider>
        </LocationProvider>
      );
      
      renderHook(() => useWebSocket(), { wrapper: customWrapper });
      
      expect(MockedAQIWebSocketClient).toHaveBeenCalledWith(
        'ws://custom:9000',
        expect.any(Object)
      );
    });
    
    it('should set up event handlers', () => {
      renderHook(() => useWebSocket(), { wrapper });
      
      expect(mockClient.onConnect).toHaveBeenCalled();
      expect(mockClient.onDisconnect).toHaveBeenCalled();
      expect(mockClient.onError).toHaveBeenCalled();
      expect(mockClient.onMessage).toHaveBeenCalled();
    });
  });
  
  describe('Connection State', () => {
    it('should start with disconnected state', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });
    
    it('should update state when connected', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      // Simulate connection
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.reconnectAttempts).toBe(0);
      });
    });
    
    it('should update state when disconnected', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      // Connect first
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });
      
      // Then disconnect
      act(() => {
        if (onDisconnectCallback) {
          onDisconnectCallback();
        }
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isConnecting).toBe(false);
      });
    });
    
    it('should update state on error', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const testError = new Error('Connection failed');
      
      act(() => {
        if (onErrorCallback) {
          onErrorCallback(testError);
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toEqual(testError);
        expect(result.current.isConnecting).toBe(false);
      });
    });
    
    it('should track reconnection attempts', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const maxAttemptsError = new Error('Failed to reconnect after 5 attempts');
      
      act(() => {
        if (onErrorCallback) {
          onErrorCallback(maxAttemptsError);
        }
      });
      
      await waitFor(() => {
        expect(result.current.reconnectAttempts).toBe(5);
      });
    });
  });
  
  describe('Subscription Management', () => {
    it('should subscribe to location', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const callback = jest.fn();
      
      act(() => {
        result.current.subscribe('Delhi', callback);
      });
      
      expect(mockClient.subscribeToLocation).toHaveBeenCalledWith('Delhi', expect.any(Function));
    });
    
    it('should unsubscribe from location', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      act(() => {
        result.current.unsubscribe('Delhi');
      });
      
      expect(mockClient.unsubscribeFromLocation).toHaveBeenCalledWith('Delhi');
    });
    
    it('should return unsubscribe function from subscribe', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const callback = jest.fn();
      let unsubscribe: (() => void) | undefined;
      
      act(() => {
        unsubscribe = result.current.subscribe('Delhi', callback);
      });
      
      expect(unsubscribe).toBeInstanceOf(Function);
      
      act(() => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
      
      expect(mockClient.unsubscribeFromLocation).toHaveBeenCalledWith('Delhi');
    });
  });
  
  describe('Message Handling', () => {
    it('should update lastUpdate on AQI update message', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const updateMessage = {
        type: 'aqi_update',
        location: 'delhi',
        timestamp: '2024-01-01T00:00:00Z',
        data: { aqi: 150, category: 'unhealthy' },
      };
      
      act(() => {
        if (onMessageCallback) {
          onMessageCallback(updateMessage);
        }
      });
      
      await waitFor(() => {
        expect(result.current.lastUpdate).toEqual(updateMessage);
        expect(result.current.error).toBeNull();
      });
    });
    
    it('should ignore non-AQI update messages', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      const pongMessage = {
        type: 'pong',
        timestamp: '2024-01-01T00:00:00Z',
      };
      
      act(() => {
        if (onMessageCallback) {
          onMessageCallback(pongMessage);
        }
      });
      
      await waitFor(() => {
        expect(result.current.lastUpdate).toBeNull();
      });
    });
  });
  
  describe('Refresh', () => {
    it('should call client refresh method', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      
      act(() => {
        result.current.refresh();
      });
      
      expect(mockClient.refresh).toHaveBeenCalled();
    });
  });
  
  describe('Auto-connect', () => {
    it('should auto-connect to current location when enabled', async () => {
      const autoConnectWrapper = ({ children }: { children: ReactNode }) => (
        <LocationProvider>
          <WebSocketProvider autoConnect={true}>
            {children}
          </WebSocketProvider>
        </LocationProvider>
      );
      
      renderHook(() => useWebSocket(), { wrapper: autoConnectWrapper });
      
      await waitFor(() => {
        expect(mockClient.connect).toHaveBeenCalledWith('Delhi');
      });
    });
    
    it('should not auto-connect when disabled', () => {
      renderHook(() => useWebSocket(), { wrapper });
      
      expect(mockClient.connect).not.toHaveBeenCalled();
    });
    
    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket(), { wrapper });
      
      unmount();
      
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow('useWebSocket must be used within a WebSocketProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
