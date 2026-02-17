'use client';

import { useState } from 'react';
import { ConnectionStatusIndicator, ConnectionStatusBadge } from '@/components/common/ConnectionStatusIndicator';
import { useRealtimeAQI, useRealtimeUpdates } from '@/lib/hooks/useRealtimeAQI';
import { useLocation } from '@/providers';

/**
 * Test page for WebSocket integration with components
 * 
 * Demonstrates:
 * - Connection status indicator
 * - Real-time AQI updates
 * - Location switching
 * - Manual refresh
 * - Update notifications
 */
export default function TestWebSocketIntegrationPage() {
  const { currentLocation, setCurrentLocation } = useLocation();
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  // Use real-time AQI hook
  const {
    data,
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    refresh,
  } = useRealtimeAQI({
    location: currentLocation?.name,
    enabled: true,
    onUpdate: (update) => {
      setUpdateCount(prev => prev + 1);
      setLastUpdateTime(new Date(update.timestamp).toLocaleTimeString());
    },
    invalidateCache: true,
  });
  
  // Test locations
  const testLocations = [
    { name: 'Delhi', city: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, id: 'delhi-india' },
    { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, id: 'mumbai-india' },
    { name: 'Bangalore', city: 'Bangalore', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, id: 'bangalore-india' },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      {/* Connection Status Indicator (floating) */}
      <ConnectionStatusIndicator position="top-right" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              WebSocket Integration Test
            </h1>
            <ConnectionStatusBadge />
          </div>
          <p className="text-white/80">
            Testing real-time AQI updates via WebSocket connection
          </p>
        </div>
        
        {/* Connection Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Connection Status</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-white/60 text-sm mb-1">Status</div>
              <div className="text-white font-medium">
                {isConnected ? '🟢 Connected' : isConnecting ? '🟡 Connecting' : '🔴 Disconnected'}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-white/60 text-sm mb-1">Location</div>
              <div className="text-white font-medium">
                {currentLocation?.name || 'None'}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-white/60 text-sm mb-1">Updates Received</div>
              <div className="text-white font-medium">{updateCount}</div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-white/60 text-sm mb-1">Last Update</div>
              <div className="text-white font-medium">
                {lastUpdateTime || 'Never'}
              </div>
            </div>
            
            {reconnectAttempts > 0 && (
              <div className="bg-white/5 rounded-lg p-4 col-span-2">
                <div className="text-white/60 text-sm mb-1">Reconnection Attempts</div>
                <div className="text-yellow-400 font-medium">
                  {reconnectAttempts} / 5
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/20 rounded-lg p-4 col-span-2 border border-red-500/30">
                <div className="text-red-300 text-sm mb-1">Error</div>
                <div className="text-red-200 font-medium">{error.message}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Location Switcher */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Switch Location</h2>
          
          <div className="grid grid-cols-3 gap-4">
            {testLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => setCurrentLocation(location)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  currentLocation?.id === location.id
                    ? 'bg-white/20 border-white/40 shadow-lg'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-white font-medium">{location.name}</div>
                <div className="text-white/60 text-sm">{location.state}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Real-time Data Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Real-time Data</h2>
            <button
              onClick={refresh}
              disabled={!isConnected}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/5 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
            >
              🔄 Refresh
            </button>
          </div>
          
          {data ? (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-2">Latest Update</div>
                <pre className="text-white text-xs overflow-auto max-h-96 bg-black/20 p-4 rounded">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
              
              {data.data && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">AQI Value</div>
                    <div className="text-white text-2xl font-bold">
                      {data.data.aqi || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Category</div>
                    <div className="text-white text-lg font-medium">
                      {data.data.category || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Timestamp</div>
                    <div className="text-white text-sm">
                      {new Date(data.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              {isConnecting ? 'Connecting...' : 'No data received yet'}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Test Instructions</h2>
          
          <ol className="space-y-2 text-white/80">
            <li>1. Check the connection status indicator in the top-right corner</li>
            <li>2. Verify the connection status shows as "Connected" (green)</li>
            <li>3. Switch between different locations and observe updates</li>
            <li>4. Click "Refresh" to manually request new data</li>
            <li>5. Monitor the update count to see real-time updates arriving</li>
            <li>6. Check the browser console for WebSocket logs</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <div className="text-blue-200 text-sm font-medium mb-1">Note</div>
            <div className="text-blue-100 text-sm">
              Make sure the WebSocket backend is running at {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
