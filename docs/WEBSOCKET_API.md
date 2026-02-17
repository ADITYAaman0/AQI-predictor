# WebSocket API Documentation

## Overview

The WebSocket API provides real-time air quality updates for subscribed locations. Clients can connect to receive automatic updates every 5 minutes, or request immediate updates on-demand.

## Endpoint

```
WS /ws/aqi/{location}
```

### Parameters

- `location` (path parameter): Location identifier
  - City name: `Delhi`, `Mumbai`, `Bangalore`
  - Coordinates: `28.6139,77.2090` (latitude,longitude)
  - Address: Any valid address string

## Connection Flow

1. **Client connects** to `ws://localhost:8000/ws/aqi/Delhi`
2. **Server accepts** connection and sends confirmation message
3. **Server sends** initial AQI data for the location
4. **Server broadcasts** updates every 5 minutes automatically
5. **Client can request** immediate updates by sending refresh action
6. **Client disconnects** when done

## Message Protocol

### Server → Client Messages

#### 1. Connection Confirmation

Sent immediately after connection is established.

```json
{
  "type": "connected",
  "location": "delhi",
  "message": "Connected to AQI updates for Delhi",
  "update_interval": 300
}
```

#### 2. AQI Update

Sent on initial connection, every 5 minutes, and on-demand refresh.

```json
{
  "type": "aqi_update",
  "location": "delhi",
  "timestamp": "2024-02-14T10:30:00",
  "data": {
    "location": {
      "name": "Delhi",
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "aqi": {
      "value": 150,
      "category": "unhealthy",
      "color": "#FB923C"
    },
    "pollutants": {
      "pm25": {
        "value": 75.5,
        "unit": "μg/m³",
        "aqi": 150
      },
      "pm10": {
        "value": 120.0,
        "unit": "μg/m³",
        "aqi": 140
      }
    },
    "weather": {
      "temperature": 25.0,
      "humidity": 60.0,
      "wind_speed": 3.0
    }
  }
}
```

#### 3. Pong Response

Response to client ping (keep-alive).

```json
{
  "type": "pong",
  "timestamp": "2024-02-14T10:30:00"
}
```

#### 4. Error Message

Sent when an error occurs.

```json
{
  "type": "error",
  "message": "Error description"
}
```

### Client → Server Messages

#### 1. Refresh Request

Request immediate AQI update.

```json
{
  "action": "refresh"
}
```

**Response:** Server sends `aqi_update` message with current data.

#### 2. Ping (Keep-Alive)

Keep connection alive.

```json
{
  "action": "ping"
}
```

**Response:** Server sends `pong` message.

## Usage Examples

### JavaScript/TypeScript

```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/aqi/Delhi');

// Handle connection open
ws.onopen = () => {
  console.log('Connected to AQI updates');
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'connected':
      console.log('Connection confirmed:', message.message);
      break;
      
    case 'aqi_update':
      console.log('AQI Update:', message.data.aqi.value);
      updateUI(message.data);
      break;
      
    case 'pong':
      console.log('Pong received');
      break;
      
    case 'error':
      console.error('Error:', message.message);
      break;
  }
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Handle connection close
ws.onclose = () => {
  console.log('Disconnected from AQI updates');
};

// Request immediate update
function refreshData() {
  ws.send(JSON.stringify({ action: 'refresh' }));
}

// Send keep-alive ping
setInterval(() => {
  ws.send(JSON.stringify({ action: 'ping' }));
}, 30000); // Every 30 seconds

// Close connection when done
function disconnect() {
  ws.close();
}
```

### Python

```python
import asyncio
import websockets
import json

async def connect_to_aqi_updates():
    uri = "ws://localhost:8000/ws/aqi/Delhi"
    
    async with websockets.connect(uri) as websocket:
        # Receive connection confirmation
        message = await websocket.recv()
        data = json.loads(message)
        print(f"Connected: {data['message']}")
        
        # Receive initial data
        message = await websocket.recv()
        data = json.loads(message)
        print(f"Initial AQI: {data['data']['aqi']['value']}")
        
        # Listen for updates
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                
                if data['type'] == 'aqi_update':
                    print(f"AQI Update: {data['data']['aqi']['value']}")
                    
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")
                break

# Run the client
asyncio.run(connect_to_aqi_updates())
```

### React Hook

```typescript
import { useEffect, useState, useRef } from 'react';

interface AQIData {
  aqi: {
    value: number;
    category: string;
    color: string;
  };
  // ... other fields
}

export function useWebSocketAQI(location: string) {
  const [data, setData] = useState<AQIData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/aqi/${location}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'aqi_update') {
        setData(message.data);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [location]);

  const refresh = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'refresh' }));
    }
  };

  return { data, isConnected, error, refresh };
}
```

## Connection Management

### Multiple Clients

Multiple clients can subscribe to the same location. Each client receives:
- Individual connection confirmation
- Individual initial data
- Broadcast updates (sent to all subscribers)

### Automatic Updates

The server automatically broadcasts updates every 5 minutes (300 seconds) to all connected clients for each subscribed location.

### Reconnection

If the connection is lost, clients should implement exponential backoff reconnection:

```typescript
let reconnectDelay = 1000; // Start with 1 second
const maxReconnectDelay = 30000; // Max 30 seconds

function connect() {
  const ws = new WebSocket('ws://localhost:8000/ws/aqi/Delhi');
  
  ws.onopen = () => {
    reconnectDelay = 1000; // Reset delay on successful connection
  };
  
  ws.onclose = () => {
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      connect(); // Reconnect
    }, reconnectDelay);
  };
}
```

## Error Handling

### Invalid Location

If an invalid location is provided, the server closes the connection with code 1008:

```
Close Code: 1008
Reason: "Invalid location: <error details>"
```

### Invalid JSON

If the client sends invalid JSON, the server responds with an error message:

```json
{
  "type": "error",
  "message": "Invalid JSON message"
}
```

### Unknown Action

If the client sends an unknown action, the server responds with an error:

```json
{
  "type": "error",
  "message": "Unknown action: <action>"
}
```

## Performance Considerations

### Update Frequency

- **Automatic updates**: Every 5 minutes (300 seconds)
- **Manual refresh**: No rate limiting (use responsibly)
- **Keep-alive ping**: Recommended every 30-60 seconds

### Scalability

The ConnectionManager supports:
- Multiple locations simultaneously
- Multiple clients per location
- Automatic cleanup of disconnected clients
- Efficient broadcast to subscribers

### Resource Usage

- Each connection maintains minimal state
- Updates are fetched from cache when available
- Periodic update task runs in background
- Disconnected clients are automatically cleaned up

## Security Considerations

### Authentication

Currently, the WebSocket endpoint does not require authentication. For production:

1. Add authentication token validation
2. Use WSS (WebSocket Secure) over TLS
3. Implement rate limiting per client
4. Add connection limits per user

### CORS

Configure CORS appropriately in production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing

### Manual Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/ws/aqi/Delhi

# Send refresh request
> {"action": "refresh"}

# Send ping
> {"action": "ping"}
```

### Automated Testing

See `tests/test_websocket.py` for comprehensive test suite covering:
- Connection management
- Message broadcasting
- Error handling
- Multiple clients and locations

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to WebSocket endpoint

**Solutions:**
- Ensure FastAPI server is running
- Check that port 8000 is accessible
- Verify WebSocket route is registered in main.py

### No Updates Received

**Problem:** Connected but not receiving updates

**Solutions:**
- Check server logs for errors
- Verify location is valid
- Send manual refresh request
- Check network connectivity

### Connection Drops

**Problem:** Connection frequently disconnects

**Solutions:**
- Implement keep-alive pings (every 30-60 seconds)
- Check network stability
- Implement reconnection logic with exponential backoff
- Check server resource usage

## Future Enhancements

Potential improvements for the WebSocket API:

1. **Authentication**: Add JWT token validation
2. **Rate Limiting**: Limit refresh requests per client
3. **Compression**: Enable WebSocket compression
4. **Selective Updates**: Allow clients to subscribe to specific data fields
5. **Historical Playback**: Stream historical data on request
6. **Alert Integration**: Push alerts through WebSocket
7. **Metrics**: Track connection count, message rate, etc.

## Related Documentation

- [REST API Documentation](./API_DOCUMENTATION.md)
- [Alert System](./ENHANCED_ALERTS_API.md)
- [Device Management](./DEVICE_MANAGEMENT_API.md)
