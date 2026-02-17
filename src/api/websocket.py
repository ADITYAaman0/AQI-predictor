"""
WebSocket endpoint for real-time AQI updates.
Provides live air quality data streaming to connected clients.
"""

from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends
from typing import Dict, Set, Optional
import logging
import asyncio
import json
from datetime import datetime

from src.api.database import get_db, AsyncSession
from src.utils.location_parser import parse_location

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts updates to subscribed clients.
    
    Attributes:
        active_connections: Dict mapping location to set of connected WebSocket clients
        update_interval: Seconds between automatic updates (default: 300 = 5 minutes)
    """
    
    def __init__(self, update_interval: int = 300):
        """
        Initialize the connection manager.
        
        Args:
            update_interval: Seconds between automatic updates (default: 300)
        """
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.update_interval = update_interval
        self._update_task: Optional[asyncio.Task] = None
        
    async def connect(self, websocket: WebSocket, location: str):
        """
        Accept a new WebSocket connection and subscribe to location updates.
        
        Args:
            websocket: The WebSocket connection to accept
            location: Location identifier to subscribe to
        """
        await websocket.accept()
        
        # Normalize location for consistent subscription keys
        normalized_location = location.lower().strip()
        
        if normalized_location not in self.active_connections:
            self.active_connections[normalized_location] = set()
            
        self.active_connections[normalized_location].add(websocket)
        
        logger.info(
            f"WebSocket connected for location: {location}. "
            f"Total connections for this location: {len(self.active_connections[normalized_location])}"
        )
        
        # Start update task if not already running
        if self._update_task is None or self._update_task.done():
            self._update_task = asyncio.create_task(self._periodic_updates())
    
    def disconnect(self, websocket: WebSocket, location: str):
        """
        Remove a WebSocket connection from subscriptions.
        
        Args:
            websocket: The WebSocket connection to remove
            location: Location identifier to unsubscribe from
        """
        normalized_location = location.lower().strip()
        
        if normalized_location in self.active_connections:
            self.active_connections[normalized_location].discard(websocket)
            
            # Clean up empty location subscriptions
            if not self.active_connections[normalized_location]:
                del self.active_connections[normalized_location]
                
        logger.info(
            f"WebSocket disconnected for location: {location}. "
            f"Remaining connections: {len(self.active_connections.get(normalized_location, []))}"
        )
    
    async def send_personal_message(self, message: Dict, websocket: WebSocket):
        """
        Send a message to a specific WebSocket client.
        
        Args:
            message: Dictionary to send as JSON
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast_to_location(self, location: str, message: Dict):
        """
        Broadcast a message to all clients subscribed to a location.
        
        Args:
            location: Location identifier
            message: Dictionary to send as JSON to all subscribers
        """
        normalized_location = location.lower().strip()
        
        if normalized_location not in self.active_connections:
            return
            
        # Create a copy of the set to avoid modification during iteration
        connections = self.active_connections[normalized_location].copy()
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection, location)
    
    async def _periodic_updates(self):
        """
        Background task that periodically fetches and broadcasts updates.
        Runs every update_interval seconds.
        """
        logger.info(f"Starting periodic updates task (interval: {self.update_interval}s)")
        
        while True:
            try:
                await asyncio.sleep(self.update_interval)
                
                # Get all subscribed locations
                locations = list(self.active_connections.keys())
                
                if not locations:
                    continue
                
                logger.info(f"Broadcasting updates to {len(locations)} locations")
                
                # Fetch and broadcast updates for each location
                for location in locations:
                    try:
                        # Import here to avoid circular dependency
                        from src.api.routers.forecast import get_current_forecast
                        from src.api.database import get_db
                        
                        # Get current AQI data
                        async for db in get_db():
                            try:
                                current_data = await get_current_forecast(location, db)
                                
                                # Add update metadata
                                update_message = {
                                    "type": "aqi_update",
                                    "location": location,
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "data": current_data
                                }
                                
                                # Broadcast to all subscribers
                                await self.broadcast_to_location(location, update_message)
                                
                            finally:
                                break  # Exit the async generator
                                
                    except Exception as e:
                        logger.error(f"Error fetching update for {location}: {e}")
                        
            except asyncio.CancelledError:
                logger.info("Periodic updates task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in periodic updates: {e}")


# Global connection manager instance
manager = ConnectionManager(update_interval=300)  # 5 minutes


@router.websocket("/ws/aqi/{location}")
async def websocket_endpoint(
    websocket: WebSocket,
    location: str
):
    """
    WebSocket endpoint for real-time AQI updates.
    
    Clients connect to this endpoint to receive live air quality updates
    for a specific location. Updates are sent automatically every 5 minutes,
    or can be requested on-demand by sending a message.
    
    Args:
        websocket: WebSocket connection
        location: Location identifier (city name, coordinates, or address)
        
    Message Protocol:
        Client -> Server:
            {"action": "refresh"} - Request immediate update
            {"action": "ping"} - Keep-alive ping
            
        Server -> Client:
            {"type": "aqi_update", "location": "...", "data": {...}} - AQI data update
            {"type": "error", "message": "..."} - Error message
            {"type": "pong"} - Response to ping
            {"type": "connected", "location": "...", "message": "..."} - Connection confirmation
    """
    # Validate location format
    try:
        location_info = parse_location(location)
        normalized_location = location.lower().strip()
    except ValueError as e:
        await websocket.close(code=1008, reason=f"Invalid location: {str(e)}")
        return
    
    # Connect the client
    await manager.connect(websocket, normalized_location)
    
    # Send connection confirmation
    await manager.send_personal_message(
        {
            "type": "connected",
            "location": normalized_location,
            "message": f"Connected to AQI updates for {location}",
            "update_interval": manager.update_interval
        },
        websocket
    )
    
    # Send initial data
    try:
        from src.api.routers.forecast import get_current_forecast
        
        async for db in get_db():
            try:
                current_data = await get_current_forecast(location, db)
                await manager.send_personal_message(
                    {
                        "type": "aqi_update",
                        "location": normalized_location,
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": current_data
                    },
                    websocket
                )
            finally:
                break  # Exit the async generator
                
    except Exception as e:
        logger.error(f"Error sending initial data: {e}")
        await manager.send_personal_message(
            {
                "type": "error",
                "message": f"Error fetching initial data: {str(e)}"
            },
            websocket
        )
    
    # Listen for client messages
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get("action")
                
                if action == "refresh":
                    # Client requested immediate update
                    logger.info(f"Refresh requested for {location}")
                    
                    async for db in get_db():
                        try:
                            current_data = await get_current_forecast(location, db)
                            await manager.send_personal_message(
                                {
                                    "type": "aqi_update",
                                    "location": normalized_location,
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "data": current_data
                                },
                                websocket
                            )
                        finally:
                            break  # Exit the async generator
                            
                elif action == "ping":
                    # Keep-alive ping
                    await manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        websocket
                    )
                else:
                    # Unknown action
                    await manager.send_personal_message(
                        {
                            "type": "error",
                            "message": f"Unknown action: {action}"
                        },
                        websocket
                    )
                    
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Invalid JSON message"
                    },
                    websocket
                )
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": f"Error processing message: {str(e)}"
                    },
                    websocket
                )
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {location}")
        manager.disconnect(websocket, normalized_location)
    except Exception as e:
        logger.error(f"WebSocket error for {location}: {e}")
        manager.disconnect(websocket, normalized_location)


def get_connection_manager() -> ConnectionManager:
    """
    Get the global connection manager instance.
    
    Returns:
        ConnectionManager instance
    """
    return manager
