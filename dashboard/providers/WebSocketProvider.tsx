'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AQIWebSocketClient, AQIUpdate, WebSocketMessage } from '@/lib/websocket/client';
import { useLocation } from './LocationProvider';

interface WebSocketContextValue {
  client: AQIWebSocketClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastUpdate: AQIUpdate | null;
  reconnectAttempts: number;
  subscribe: (location: string, callback: (data: AQIUpdate) => void) => () => void;
  unsubscribe: (location: string) => void;
  refresh: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  /** WebSocket base URL (default: from env or ws://localhost:8000) */
  url?: string;
  /** Enable automatic connection based on current location (default: true) */
  autoConnect?: boolean;
}

/**
 * WebSocketProvider - Manages WebSocket connections for real-time AQI updates
 * 
 * Features:
 * - Automatic connection to current location
 * - Connection state management
 * - Error handling and recovery
 * - Reconnection tracking
 * - Integration with LocationProvider
 * 
 * Usage:
 * ```tsx
 * <WebSocketProvider>
 *   <YourApp />
 * </WebSocketProvider>
 * ```
 */
export function WebSocketProvider({ 
  children, 
  url,
  autoConnect = true 
}: WebSocketProviderProps) {
  const { currentLocation } = useLocation();
  
  // WebSocket client instance
  const [client] = useState(() => {
    const wsUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    return new AQIWebSocketClient(wsUrl, {
      maxReconnectAttempts: 5,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      pingInterval: 30000,
    });
  });
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<AQIUpdate | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Subscribe to location updates
  const subscribe = useCallback((location: string, callback: (data: AQIUpdate) => void) => {
    client.subscribeToLocation(location, callback);
    
    // Return unsubscribe function
    return () => {
      client.unsubscribeFromLocation(location);
    };
  }, [client]);
  
  // Unsubscribe from location
  const unsubscribe = useCallback((location: string) => {
    client.unsubscribeFromLocation(location);
  }, [client]);
  
  // Request immediate refresh
  const refresh = useCallback(() => {
    client.refresh();
  }, [client]);
  
  // Set up WebSocket event handlers
  useEffect(() => {
    // Connection opened
    const unsubConnect = client.onConnect(() => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      setReconnectAttempts(0);
    });
    
    // Connection closed
    const unsubDisconnect = client.onDisconnect(() => {
      setIsConnected(false);
      setIsConnecting(false);
    });
    
    // Error occurred
    const unsubError = client.onError((err) => {
      const error = err instanceof Error ? err : new Error('WebSocket error');
      setError(error);
      setIsConnecting(false);
      
      // Track reconnection attempts
      if (error.message.includes('Failed to reconnect')) {
        setReconnectAttempts(5); // Max attempts reached
      }
    });
    
    // Message received
    const unsubMessage = client.onMessage((message: WebSocketMessage) => {
      if (message.type === 'aqi_update') {
        setLastUpdate(message as AQIUpdate);
        setError(null);
      }
    });
    
    // Cleanup
    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
      unsubMessage();
    };
  }, [client]);
  
  // Auto-connect to current location
  useEffect(() => {
    if (!autoConnect || !currentLocation) {
      return;
    }
    
    // Connect to the current location
    setIsConnecting(true);
    setError(null);
    
    try {
      client.connect(currentLocation.name);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect');
      setError(error);
      setIsConnecting(false);
    }
    
    // Cleanup: disconnect when location changes or component unmounts
    return () => {
      client.disconnect();
    };
  }, [client, currentLocation, autoConnect]);
  
  const value: WebSocketContextValue = {
    client,
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    reconnectAttempts,
    subscribe,
    unsubscribe,
    refresh,
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * useWebSocket - Hook to access WebSocket context
 * 
 * @returns {WebSocketContextValue} WebSocket context with connection state and methods
 * @throws {Error} If used outside of WebSocketProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, lastUpdate, refresh } = useWebSocket();
 *   
 *   return (
 *     <div>
 *       <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
 *       {lastUpdate && <p>AQI: {lastUpdate.data.aqi}</p>}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}
