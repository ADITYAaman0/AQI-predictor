"""
Pytest configuration for API tests that require mocked FastAPI app.
This prevents the lifespan manager from trying to connect to databases during test collection.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def mock_app():
    """
    Create a mock FastAPI app that doesn't trigger lifespan events.
    This prevents database/Redis connection attempts during test collection.
    """
    # Create a minimal FastAPI app without lifespan
    app = FastAPI(
        title="AQI Predictor API (Test)",
        description="Test instance without lifespan events",
        version="1.0.0",
        docs_url=None,  # Disable docs to avoid loading all routes
        redoc_url=None
    )
    
    return app


@pytest.fixture(scope="session")
def mock_client(mock_app):
    """Create test client with mocked app."""
    return TestClient(mock_app)


@pytest.fixture(autouse=True)
def mock_database_connections():
    """Mock database and Redis connections for all tests."""
    with patch('src.api.database.init_db', new_callable=AsyncMock), \
         patch('src.api.database.close_db', new_callable=AsyncMock), \
         patch('src.api.cache.init_redis', new_callable=AsyncMock), \
         patch('src.api.cache.close_redis', new_callable=AsyncMock):
        yield
