"""
Tests for WebSocket endpoint functionality.
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock

from src.api.websocket import ConnectionManager


class TestConnectionManager:
    """Test the ConnectionManager class."""
    
    def test_init(self):
        """Test ConnectionManager initialization."""
        manager = ConnectionManager(update_interval=60)
        assert manager.update_interval == 60
        assert manager.active_connections == {}
        assert manager._update_task is None
    
    @pytest.mark.asyncio
    async def test_connect(self):
        """Test connecting a WebSocket client."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        await manager.connect(mock_websocket, "Delhi")
        
        mock_websocket.accept.assert_called_once()
        assert "delhi" in manager.active_connections
        assert mock_websocket in manager.active_connections["delhi"]
    
    @pytest.mark.asyncio
    async def test_connect_multiple_clients_same_location(self):
        """Test connecting multiple clients to the same location."""
        manager = ConnectionManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        await manager.connect(mock_ws1, "Delhi")
        await manager.connect(mock_ws2, "Delhi")
        
        assert len(manager.active_connections["delhi"]) == 2
        assert mock_ws1 in manager.active_connections["delhi"]
        assert mock_ws2 in manager.active_connections["delhi"]
    
    def test_disconnect(self):
        """Test disconnecting a WebSocket client."""
        manager = ConnectionManager()
        mock_websocket = MagicMock()
        
        # Manually add connection
        manager.active_connections["delhi"] = {mock_websocket}
        
        # Disconnect
        manager.disconnect(mock_websocket, "Delhi")
        
        assert "delhi" not in manager.active_connections
    
    def test_disconnect_one_of_multiple(self):
        """Test disconnecting one client when multiple are connected."""
        manager = ConnectionManager()
        mock_ws1 = MagicMock()
        mock_ws2 = MagicMock()
        
        # Manually add connections
        manager.active_connections["delhi"] = {mock_ws1, mock_ws2}
        
        # Disconnect one
        manager.disconnect(mock_ws1, "Delhi")
        
        # Location should still exist with one connection
        assert "delhi" in manager.active_connections
        assert mock_ws1 not in manager.active_connections["delhi"]
        assert mock_ws2 in manager.active_connections["delhi"]
    
    @pytest.mark.asyncio
    async def test_send_personal_message(self):
        """Test sending a message to a specific client."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        message = {"type": "test", "data": "hello"}
        await manager.send_personal_message(message, mock_websocket)
        
        mock_websocket.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_send_personal_message_handles_error(self):
        """Test that send_personal_message handles errors gracefully."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        mock_websocket.send_json.side_effect = Exception("Connection error")
        
        message = {"type": "test", "data": "hello"}
        # Should not raise exception
        await manager.send_personal_message(message, mock_websocket)
    
    @pytest.mark.asyncio
    async def test_broadcast_to_location(self):
        """Test broadcasting to all clients for a location."""
        manager = ConnectionManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        # Add connections
        manager.active_connections["delhi"] = {mock_ws1, mock_ws2}
        
        message = {"type": "update", "aqi": 150}
        await manager.broadcast_to_location("Delhi", message)
        
        mock_ws1.send_json.assert_called_once_with(message)
        mock_ws2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_to_nonexistent_location(self):
        """Test broadcasting to a location with no subscribers."""
        manager = ConnectionManager()
        
        message = {"type": "update", "aqi": 150}
        # Should not raise exception
        await manager.broadcast_to_location("NonExistent", message)
    
    @pytest.mark.asyncio
    async def test_broadcast_handles_disconnected_clients(self):
        """Test that broadcast removes disconnected clients."""
        manager = ConnectionManager()
        mock_ws_good = AsyncMock()
        mock_ws_bad = AsyncMock()
        mock_ws_bad.send_json.side_effect = Exception("Connection closed")
        
        # Add connections
        manager.active_connections["delhi"] = {mock_ws_good, mock_ws_bad}
        
        message = {"type": "update", "aqi": 150}
        await manager.broadcast_to_location("Delhi", message)
        
        # Good connection should still be there
        assert mock_ws_good in manager.active_connections["delhi"]
        # Bad connection should be removed
        assert mock_ws_bad not in manager.active_connections["delhi"]
    
    def test_location_normalization(self):
        """Test that location names are normalized (lowercase, trimmed)."""
        manager = ConnectionManager()
        mock_websocket = MagicMock()
        
        # Add with different casings
        manager.active_connections["delhi"] = {mock_websocket}
        
        # Disconnect with different casing should work
        manager.disconnect(mock_websocket, "  DELHI  ")
        
        assert "delhi" not in manager.active_connections


class TestConnectionManagerIntegration:
    """Integration tests for ConnectionManager."""
    
    @pytest.mark.asyncio
    async def test_full_connection_lifecycle(self):
        """Test complete connection lifecycle: connect, message, disconnect."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        # Connect
        await manager.connect(mock_websocket, "Mumbai")
        assert "mumbai" in manager.active_connections
        
        # Send message
        message = {"type": "test", "value": 123}
        await manager.send_personal_message(message, mock_websocket)
        mock_websocket.send_json.assert_called_with(message)
        
        # Disconnect
        manager.disconnect(mock_websocket, "Mumbai")
        assert "mumbai" not in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_multiple_locations_multiple_clients(self):
        """Test managing multiple locations with multiple clients each."""
        manager = ConnectionManager()
        
        # Delhi clients
        delhi_ws1 = AsyncMock()
        delhi_ws2 = AsyncMock()
        await manager.connect(delhi_ws1, "Delhi")
        await manager.connect(delhi_ws2, "Delhi")
        
        # Mumbai clients
        mumbai_ws1 = AsyncMock()
        mumbai_ws2 = AsyncMock()
        await manager.connect(mumbai_ws1, "Mumbai")
        await manager.connect(mumbai_ws2, "Mumbai")
        
        # Verify connections
        assert len(manager.active_connections["delhi"]) == 2
        assert len(manager.active_connections["mumbai"]) == 2
        
        # Broadcast to Delhi only
        delhi_message = {"type": "update", "location": "Delhi", "aqi": 150}
        await manager.broadcast_to_location("Delhi", delhi_message)
        
        # Delhi clients should receive message
        delhi_ws1.send_json.assert_called_once_with(delhi_message)
        delhi_ws2.send_json.assert_called_once_with(delhi_message)
        
        # Mumbai clients should NOT receive message
        mumbai_ws1.send_json.assert_not_called()
        mumbai_ws2.send_json.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

