# WebSocket Examples

This directory contains example code demonstrating how to use the WebSocket API for real-time AQI updates.

## Prerequisites

1. **Install dependencies:**
   ```bash
   pip install websockets
   ```

2. **Start the FastAPI server:**
   ```bash
   python -m uvicorn src.api.main:app --reload
   ```

   The server should be running on `http://localhost:8000`

## Examples

### 1. Python WebSocket Client (`websocket_client_example.py`)

A comprehensive test suite demonstrating all WebSocket features.

**Run the example:**
```bash
python examples/websocket_client_example.py
```

**What it demonstrates:**
- ✅ Connecting to the WebSocket endpoint
- ✅ Receiving connection confirmation
- ✅ Receiving initial AQI data
- ✅ Sending manual refresh requests
- ✅ Sending keep-alive pings
- ✅ Handling error responses
- ✅ Connecting to multiple locations
- ✅ Handling invalid locations

**Expected output:**
```
🚀 Starting WebSocket Client Tests...

Test 1: Basic Connection and Messaging
------------------------------------------------------------
Connecting to ws://localhost:8000/ws/aqi/Delhi...
✅ Connected successfully!

📡 Connection Confirmation:
   Type: connected
   Location: delhi
   Message: Connected to AQI updates for Delhi
   Update Interval: 300s

🌍 Initial AQI Data:
   Type: aqi_update
   Location: delhi
   Timestamp: 2024-02-14T10:30:00
   AQI: 150 (unhealthy)

🔄 Sending manual refresh request...
✅ Refresh Response:
   Type: aqi_update
   AQI: 150

🏓 Sending ping...
✅ Pong Response:
   Type: pong
   Timestamp: 2024-02-14T10:30:05

❌ Testing invalid action...
⚠️  Error Response:
   Type: error
   Message: Unknown action: invalid

✅ All tests completed successfully!
```

## JavaScript/Browser Example

Create an HTML file to test in the browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket AQI Test</title>
</head>
<body>
    <h1>Real-time AQI Updates</h1>
    <div id="status">Disconnected</div>
    <div id="aqi">AQI: --</div>
    <button onclick="refresh()">Refresh</button>
    <button onclick="disconnect()">Disconnect</button>
    
    <script>
        let ws = null;
        
        function connect() {
            ws = new WebSocket('ws://localhost:8000/ws/aqi/Delhi');
            
            ws.onopen = () => {
                document.getElementById('status').textContent = 'Connected';
                document.getElementById('status').style.color = 'green';
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                
                if (data.type === 'aqi_update' && data.data.aqi) {
                    document.getElementById('aqi').textContent = 
                        `AQI: ${data.data.aqi.value} (${data.data.aqi.category})`;
                }
            };
            
            ws.onclose = () => {
                document.getElementById('status').textContent = 'Disconnected';
                document.getElementById('status').style.color = 'red';
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        
        function refresh() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'refresh' }));
            }
        }
        
        function disconnect() {
            if (ws) {
                ws.close();
            }
        }
        
        // Connect on page load
        connect();
    </script>
</body>
</html>
```

Save as `websocket_test.html` and open in a browser.

## React Example

```typescript
import { useEffect, useState } from 'react';

function AQIMonitor() {
  const [aqi, setAqi] = useState<number | null>(null);
  const [status, setStatus] = useState('Disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws/aqi/Delhi');
    
    websocket.onopen = () => {
      setStatus('Connected');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'aqi_update' && data.data.aqi) {
        setAqi(data.data.aqi.value);
      }
    };
    
    websocket.onclose = () => {
      setStatus('Disconnected');
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  const refresh = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'refresh' }));
    }
  };

  return (
    <div>
      <h1>Real-time AQI: {aqi ?? '--'}</h1>
      <p>Status: {status}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## Testing with wscat

Install wscat (WebSocket command-line client):
```bash
npm install -g wscat
```

Connect to the WebSocket:
```bash
wscat -c ws://localhost:8000/ws/aqi/Delhi
```

Send commands:
```
> {"action": "refresh"}
> {"action": "ping"}
```

## Troubleshooting

### Connection Refused
**Problem:** Cannot connect to WebSocket

**Solution:**
- Ensure FastAPI server is running: `python -m uvicorn src.api.main:app --reload`
- Check that port 8000 is not blocked
- Verify the WebSocket route is registered in `src/api/main.py`

### No Data Received
**Problem:** Connected but not receiving updates

**Solution:**
- Check server logs for errors
- Verify location is valid (e.g., "Delhi", "Mumbai")
- Try sending a manual refresh: `{"action": "refresh"}`

### Invalid Location Error
**Problem:** Connection closes immediately with error

**Solution:**
- Use valid location names: "Delhi", "Mumbai", "Bangalore", etc.
- Or use coordinates: "28.6139,77.2090"
- Avoid special characters in location names

## Next Steps

1. **Implement reconnection logic** with exponential backoff
2. **Add authentication** for production use
3. **Enable compression** for better performance
4. **Add metrics** to track connection count and message rate
5. **Implement rate limiting** to prevent abuse

## Related Documentation

- [WebSocket API Documentation](../docs/WEBSOCKET_API.md)
- [REST API Documentation](../docs/API_DOCUMENTATION.md)
- [Task Completion Summary](../TASK_17.1_COMPLETION_SUMMARY.md)
