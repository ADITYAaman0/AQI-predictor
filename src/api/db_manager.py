"""
Database management utilities for AQI Predictor.
Provides functions for database initialization, migrations, and maintenance.
"""

import asyncio
import logging
import os
from typing import Optional, List, Dict, Any
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from alembic import command
from alembic.config import Config
from datetime import datetime, timedelta

from src.api.database import engine, AsyncSessionLocal, init_db
from src.api.models import (
    AirQualityMeasurement, WeatherData, Prediction, MonitoringStation,
    User, AlertSubscription, SourceAttribution, DataQualityFlag, ModelMetadata
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database management and maintenance operations."""
    
    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal
    
    async def initialize_database(self) -> bool:
        """Initialize database with extensions and basic setup."""
        try:
            await init_db()
            logger.info("Database initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False
    
    async def check_database_health(self) -> Dict[str, Any]:
        """Check database health and return status information."""
        health_info = {
            "status": "unknown",
            "extensions": {},
            "tables": {},
            "hypertables": [],
            "connection": False
        }
        
        try:
            async with self.session_factory() as session:
                # Test basic connection
                result = await session.execute(text("SELECT 1"))
                health_info["connection"] = result.scalar() == 1
                
                # Check extensions
                ext_result = await session.execute(text("""
                    SELECT extname, extversion 
                    FROM pg_extension 
                    WHERE extname IN ('timescaledb', 'postgis')
                """))
                for ext_name, ext_version in ext_result:
                    health_info["extensions"][ext_name] = ext_version
                
                # Check tables exist
                inspector = inspect(self.engine.sync_engine)
                tables = inspector.get_table_names()
                for table in ["air_quality_measurements", "weather_data", "predictions", 
                             "monitoring_stations", "users", "alert_subscriptions"]:
                    health_info["tables"][table] = table in tables
                
                # Check hypertables
                hyper_result = await session.execute(text("""
                    SELECT hypertable_name 
                    FROM timescaledb_information.hypertables
                """))
                health_info["hypertables"] = [row[0] for row in hyper_result]
                
                health_info["status"] = "healthy"
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_info["status"] = "unhealthy"
            health_info["error"] = str(e)
        
        return health_info
    
    async def run_migrations(self, revision: str = "head") -> bool:
        """Run database migrations to specified revision."""
        try:
            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, revision)
            logger.info(f"Migrations completed to revision: {revision}")
            return True
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    async def create_migration(self, message: str, autogenerate: bool = True) -> bool:
        """Create a new migration file."""
        try:
            alembic_cfg = Config("alembic.ini")
            command.revision(alembic_cfg, message=message, autogenerate=autogenerate)
            logger.info(f"Migration created: {message}")
            return True
        except Exception as e:
            logger.error(f"Migration creation failed: {e}")
            return False
    
    async def get_table_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all tables."""
        stats = {}
        
        try:
            async with self.session_factory() as session:
                # Air quality measurements
                aq_result = await session.execute(text("""
                    SELECT 
                        COUNT(*) as total_records,
                        COUNT(DISTINCT station_id) as unique_stations,
                        COUNT(DISTINCT parameter) as unique_parameters,
                        MIN(time) as earliest_record,
                        MAX(time) as latest_record
                    FROM air_quality_measurements
                """))
                aq_row = aq_result.fetchone()
                if aq_row:
                    stats["air_quality_measurements"] = {
                        "total_records": aq_row[0],
                        "unique_stations": aq_row[1],
                        "unique_parameters": aq_row[2],
                        "earliest_record": aq_row[3],
                        "latest_record": aq_row[4]
                    }
                
                # Weather data
                weather_result = await session.execute(text("""
                    SELECT 
                        COUNT(*) as total_records,
                        MIN(time) as earliest_record,
                        MAX(time) as latest_record
                    FROM weather_data
                """))
                weather_row = weather_result.fetchone()
                if weather_row:
                    stats["weather_data"] = {
                        "total_records": weather_row[0],
                        "earliest_record": weather_row[1],
                        "latest_record": weather_row[2]
                    }
                
                # Predictions
                pred_result = await session.execute(text("""
                    SELECT 
                        COUNT(*) as total_records,
                        COUNT(DISTINCT model_version) as unique_models,
                        MIN(time) as earliest_prediction,
                        MAX(time) as latest_prediction
                    FROM predictions
                """))
                pred_row = pred_result.fetchone()
                if pred_row:
                    stats["predictions"] = {
                        "total_records": pred_row[0],
                        "unique_models": pred_row[1],
                        "earliest_prediction": pred_row[2],
                        "latest_prediction": pred_row[3]
                    }
                
                # Monitoring stations
                station_result = await session.execute(text("""
                    SELECT 
                        COUNT(*) as total_stations,
                        COUNT(*) FILTER (WHERE is_active = true) as active_stations,
                        COUNT(DISTINCT city) as unique_cities
                    FROM monitoring_stations
                """))
                station_row = station_result.fetchone()
                if station_row:
                    stats["monitoring_stations"] = {
                        "total_stations": station_row[0],
                        "active_stations": station_row[1],
                        "unique_cities": station_row[2]
                    }
                
        except Exception as e:
            logger.error(f"Failed to get table stats: {e}")
            stats["error"] = str(e)
        
        return stats
    
    async def cleanup_old_data(self, days_to_keep: int = 730) -> Dict[str, int]:
        """Clean up old data based on retention policies."""
        cleanup_stats = {}
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        try:
            async with self.session_factory() as session:
                # Clean up old predictions (keep 1 year)
                pred_cutoff = datetime.utcnow() - timedelta(days=365)
                pred_result = await session.execute(text("""
                    DELETE FROM predictions 
                    WHERE time < :cutoff_date
                """), {"cutoff_date": pred_cutoff})
                cleanup_stats["predictions_deleted"] = pred_result.rowcount
                
                # Clean up old data quality flags (keep 1 year)
                flag_result = await session.execute(text("""
                    DELETE FROM data_quality_flags 
                    WHERE measurement_time < :cutoff_date
                """), {"cutoff_date": pred_cutoff})
                cleanup_stats["quality_flags_deleted"] = flag_result.rowcount
                
                await session.commit()
                logger.info(f"Data cleanup completed: {cleanup_stats}")
                
        except Exception as e:
            logger.error(f"Data cleanup failed: {e}")
            cleanup_stats["error"] = str(e)
        
        return cleanup_stats
    
    async def vacuum_analyze(self) -> bool:
        """Run VACUUM ANALYZE on all tables for performance."""
        try:
            async with self.session_factory() as session:
                await session.execute(text("VACUUM ANALYZE"))
                await session.commit()
                logger.info("VACUUM ANALYZE completed")
                return True
        except Exception as e:
            logger.error(f"VACUUM ANALYZE failed: {e}")
            return False
    
    async def create_sample_data(self) -> bool:
        """Create sample data for testing and development."""
        try:
            async with self.session_factory() as session:
                # Check if sample data already exists
                station_count = await session.execute(text(
                    "SELECT COUNT(*) FROM monitoring_stations"
                ))
                if station_count.scalar() > 0:
                    logger.info("Sample data already exists")
                    return True
                
                # Create sample monitoring stations
                sample_stations = [
                    {
                        "station_id": "DL001",
                        "name": "Anand Vihar",
                        "location": "POINT(77.3161 28.6469)",
                        "city": "Delhi",
                        "state": "Delhi",
                        "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"]
                    },
                    {
                        "station_id": "DL002", 
                        "name": "Punjabi Bagh",
                        "location": "POINT(77.1318 28.6742)",
                        "city": "Delhi",
                        "state": "Delhi", 
                        "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"]
                    }
                ]
                
                for station_data in sample_stations:
                    await session.execute(text("""
                        INSERT INTO monitoring_stations 
                        (station_id, name, location, city, state, parameters, is_active)
                        VALUES (:station_id, :name, ST_GeomFromText(:location, 4326), 
                               :city, :state, :parameters, true)
                        ON CONFLICT (station_id) DO NOTHING
                    """), station_data)
                
                await session.commit()
                logger.info("Sample data created successfully")
                return True
                
        except Exception as e:
            logger.error(f"Sample data creation failed: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()


async def main():
    """CLI interface for database management."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python -m src.api.db_manager <command>")
        print("Commands: init, health, migrate, stats, cleanup, sample")
        return
    
    command = sys.argv[1]
    
    if command == "init":
        success = await db_manager.initialize_database()
        print(f"Database initialization: {'SUCCESS' if success else 'FAILED'}")
    
    elif command == "health":
        health = await db_manager.check_database_health()
        print(f"Database health: {health}")
    
    elif command == "migrate":
        success = await db_manager.run_migrations()
        print(f"Migration: {'SUCCESS' if success else 'FAILED'}")
    
    elif command == "stats":
        stats = await db_manager.get_table_stats()
        print(f"Table statistics: {stats}")
    
    elif command == "cleanup":
        cleanup = await db_manager.cleanup_old_data()
        print(f"Cleanup results: {cleanup}")
    
    elif command == "sample":
        success = await db_manager.create_sample_data()
        print(f"Sample data creation: {'SUCCESS' if success else 'FAILED'}")
    
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main())