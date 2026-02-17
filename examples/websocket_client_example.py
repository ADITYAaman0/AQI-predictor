"""
Example WebSocket client for testing real-time AQI updates.

This script demonstrates how to connect to the WebSocket endpoint
and receive real-time air quality updates.

Usage:
    python examples/websocket_client_example.py
"""

import asyncio
import websockets
import json
from datetime import datetime


async def test_websocket_connection():
    """
    Test WebSocket connection to AQI endpoint.
    
    This example:
    1. Connects to the WebSocket endpoint for Delhi
    2. Receives connection confirmation
    3. Receives initial AQI data
    4. Sends a manual refresh request
    5. Sends periodic pings
    6. Listens for updates
    """
    uri = "ws://localhost:8000/ws/aqi/Delhi"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!\n")
            
            # Receive connection confirmation
            message = await websocket.recv()
            data = json.loads(message)
            print(f"📡 Connection Confirmation:")
            print(f"   Type: {data['type']}")
            print(f"   Location: {data['location']}")
            print(f"   Message: {data['message']}")
            print(f"   Update Interval: {data['update_interval']}s\n")
            
            # Receive initial AQI data
            message = await websocket.recv()
            data = json.loads(message)
            print(f"🌍 Initial AQI Data:")
            print(f"   Type: {data['type']}")
            print(f"   Location: {data['location']}")
            print(f"   Timestamp: {data['timestamp']}")
            if 'data' in data and 'aqi' in data['data']:
                aqi_value = data['data']['aqi'].get('value', 'N/A')
                aqi_category = data['data']['aqi'].get('category', 'N/A')
                print(f"   AQI: {aqi_value} ({aqi_category})")
            print()
            
            # Send a manual refresh request
            print("🔄 Sending manual refresh request...")
            await websocket.send(json.dumps({"action": "refresh"}))
            
            # Receive refresh response
            message = await websocket.recv()
            data = json.loads(message)
            print(f"✅ Refresh Response:")
            print(f"   Type: {data['type']}")
            if 'data' in data and 'aqi' in data['data']:
                aqi_value = data['data']['aqi'].get('value', 'N/A')
                print(f"   AQI: {aqi_value}")
            print()
            
            # Send a ping
            print("🏓 Sending ping...")
            await websocket.send(json.dumps({"action": "ping"}))
            
            # Receive pong
            message = await websocket.recv()
            data = json.loads(message)
            print(f"✅ Pong Response:")
            print(f"   Type: {data['type']}")
            print(f"   Timestamp: {data['timestamp']}")
            print()
            
            # Test invalid action
            print("❌ Testing invalid action...")
            await websocket.send(json.dumps({"action": "invalid"}))
            
            # Receive error
            message = await websocket.recv()
            data = json.loads(message)
            print(f"⚠️  Error Response:")
            print(f"   Type: {data['type']}")
            print(f"   Message: {data['message']}")
            print()
            
            print("✅ All tests completed successfully!")
            print("\n💡 The connection will stay open for 10 seconds to demonstrate")
            print("   automatic updates (if any occur within this time)...")
            
            # Listen for updates for 10 seconds
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                print(f"\n📨 Received automatic update:")
                print(f"   Type: {data['type']}")
                if 'data' in data and 'aqi' in data['data']:
                    aqi_value = data['data']['aqi'].get('value', 'N/A')
                    print(f"   AQI: {aqi_value}")
            except asyncio.TimeoutError:
                print("\n⏱️  No automatic updates received (expected, as they occur every 5 minutes)")
            
            print("\n👋 Closing connection...")
            
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the server running on localhost:8000?")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


async def test_multiple_locations():
    """
    Test connecting to multiple locations simultaneously.
    """
    locations = ["Delhi", "Mumbai", "Bangalore"]
    
    print(f"Testing multiple location connections...\n")
    
    async def connect_to_location(location):
        uri = f"ws://localhost:8000/ws/aqi/{location}"
        try:
            async with websockets.connect(uri) as websocket:
                # Receive connection confirmation
                message = await websocket.recv()
                data = json.loads(message)
                print(f"✅ Connected to {location}")
                
                # Receive initial data
                message = await websocket.recv()
                data = json.loads(message)
                if 'data' in data and 'aqi' in data['data']:
                    aqi_value = data['data']['aqi'].get('value', 'N/A')
                    print(f"   {location} AQI: {aqi_value}")
                
                # Keep connection open for a bit
                await asyncio.sleep(2)
                
        except Exception as e:
            print(f"❌ Error connecting to {location}: {e}")
    
    # Connect to all locations concurrently
    await asyncio.gather(*[connect_to_location(loc) for loc in locations])
    
    print("\n✅ Multiple location test completed!")


async def test_invalid_location():
    """
    Test connecting with an invalid location.
    """
    uri = "ws://localhost:8000/ws/aqi/Invalid@#$Location"
    
    print(f"Testing invalid location...\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("❌ Connection should have been rejected!")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"✅ Connection properly rejected:")
        print(f"   Close Code: {e.code}")
        print(f"   Reason: {e.reason}")
    except Exception as e:
        print(f"⚠️  Unexpected error: {e}")


async def main():
    """
    Run all WebSocket tests.
    """
    print("=" * 60)
    print("WebSocket Client Test Suite")
    print("=" * 60)
    print()
    
    # Test 1: Basic connection and messaging
    print("Test 1: Basic Connection and Messaging")
    print("-" * 60)
    await test_websocket_connection()
    print()
    
    # Test 2: Multiple locations
    print("\nTest 2: Multiple Location Connections")
    print("-" * 60)
    await test_multiple_locations()
    print()
    
    # Test 3: Invalid location
    print("\nTest 3: Invalid Location Handling")
    print("-" * 60)
    await test_invalid_location()
    print()
    
    print("=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    print("\n🚀 Starting WebSocket Client Tests...\n")
    print("⚠️  Make sure the FastAPI server is running on localhost:8000")
    print("   Start it with: python -m uvicorn src.api.main:app --reload\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
