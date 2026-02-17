"""
Database connection and session management for TimescaleDB with PostGIS.
Provides async database operations and connection pooling.
"""

import os
import logging
from contextlib import contextmanager
from typing import AsyncGenerator, Optional, Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
import asyncpg

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://aqi_user:aqi_password@localhost:5432/aqi_predictor_dev"
)

# Synchronous database URL for Celery tasks
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Create async engine with connection pooling - OPTIMIZED
engine = create_async_engine(
    DATABASE_URL,
    echo=True if os.getenv("ENVIRONMENT") == "development" else False,
    pool_size=30,  # Optimized for high concurrency
    max_overflow=50,  # Allow burst traffic
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
    pool_timeout=30,  # Connection timeout
    pool_use_lifo=True,  # Use LIFO for better connection reuse
    connect_args={
        "server_settings": {
            "application_name": "aqi_predictor_api",
            "jit": "on",  # Enable JIT compilation for better query performance
            "shared_buffers": "256MB",  # Optimize shared buffer cache
            "effective_cache_size": "1GB",  # Help query planner
            "work_mem": "16MB",  # Memory for sorting/hashing
            "maintenance_work_mem": "128MB",  # Memory for maintenance operations
            "random_page_cost": "1.1",  # Optimize for SSD
            "effective_io_concurrency": "200",  # Concurrent I/O operations
        },
        "command_timeout": 60,  # Query timeout in seconds
        "timeout": 10,  # Connection timeout
        "statement_cache_size": 0,  # Disable statement cache for better memory usage
    }
)

# Create synchronous engine for background tasks
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=True if os.getenv("ENVIRONMENT") == "development" else False,
    pool_size=10,  # Increased from 5
    max_overflow=20,  # Increased from 10
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=30,
    pool_use_lifo=True,
    connect_args={
        "options": "-c jit=on -c application_name=aqi_predictor_celery"
    }
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Create synchronous session factory for Celery tasks
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# Base class for SQLAlchemy models
Base = declarative_base()

async def init_db() -> None:
    """Initialize database connection and create tables if needed."""
    try:
        # Test connection
        async with engine.begin() as conn:
            # Enable TimescaleDB and PostGIS extensions if not already enabled
            await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
            await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            logger.info("Database extensions verified")
            
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

async def close_db() -> None:
    """Close database connections."""
    try:
        await engine.dispose()
        sync_engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session.
    Use this in FastAPI endpoints to get a database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager to get synchronous database session for background tasks.
    
    Yields:
        Database session
    """
    db = SyncSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

async def health_check() -> bool:
    """Check database health for health endpoints."""
    try:
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

class DatabaseManager:
    """Database manager for handling connections and operations."""
    
    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal
    
    async def execute_query(self, query: str, params: Optional[dict] = None):
        """Execute a raw SQL query."""
        async with self.session_factory() as session:
            try:
                result = await session.execute(query, params or {})
                await session.commit()
                return result
            except Exception as e:
                await session.rollback()
                logger.error(f"Query execution failed: {e}")
                raise
    
    async def fetch_one(self, query: str, params: Optional[dict] = None):
        """Fetch one row from query result."""
        async with self.session_factory() as session:
            try:
                result = await session.execute(query, params or {})
                return result.fetchone()
            except Exception as e:
                logger.error(f"Fetch one failed: {e}")
                raise
    
    async def fetch_all(self, query: str, params: Optional[dict] = None):
        """Fetch all rows from query result."""
        async with self.session_factory() as session:
            try:
                result = await session.execute(query, params or {})
                return result.fetchall()
            except Exception as e:
                logger.error(f"Fetch all failed: {e}")
                raise

# Global database manager instance
db_manager = DatabaseManager()