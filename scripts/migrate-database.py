#!/usr/bin/env python3
"""
Database migration script for CI/CD pipeline.
Handles database migrations with proper error handling and rollback capabilities.
"""

import os
import sys
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from alembic.config import Config
    from alembic import command
    from alembic.script import ScriptDirectory
    from alembic.runtime.migration import MigrationContext
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError
except ImportError as e:
    print(f"Error importing required packages: {e}")
    print("Please install: pip install alembic sqlalchemy psycopg2-binary")
    sys.exit(1)


class DatabaseMigrator:
    """Handles database migrations with safety checks and rollback capabilities"""
    
    def __init__(self, database_url: str, alembic_config_path: str = "alembic.ini"):
        self.database_url = database_url
        self.alembic_config_path = alembic_config_path
        self.engine = None
        self.alembic_cfg = None
        
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def setup(self):
        """Initialize database connection and Alembic configuration"""
        try:
            # Create database engine
            self.engine = create_engine(self.database_url)
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.logger.info("Database connection established")
            
            # Set up Alembic configuration
            self.alembic_cfg = Config(self.alembic_config_path)
            self.alembic_cfg.set_main_option("sqlalchemy.url", self.database_url)
            
            self.logger.info("Alembic configuration loaded")
            
        except Exception as e:
            self.logger.error(f"Setup failed: {e}")
            raise
    
    def get_current_revision(self) -> Optional[str]:
        """Get current database revision"""
        try:
            with self.engine.connect() as conn:
                context = MigrationContext.configure(conn)
                return context.get_current_revision()
        except Exception as e:
            self.logger.warning(f"Could not get current revision: {e}")
            return None
    
    def get_head_revision(self) -> str:
        """Get head revision from migration scripts"""
        script = ScriptDirectory.from_config(self.alembic_cfg)
        return script.get_current_head()
    
    def create_backup_point(self) -> str:
        """Create a backup point before migration"""
        backup_name = f"pre_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            with self.engine.connect() as conn:
                # Create a simple backup marker in the database
                # In production, this would trigger actual backup procedures
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS migration_backups (
                        id SERIAL PRIMARY KEY,
                        backup_name VARCHAR(255) UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        revision VARCHAR(255)
                    )
                """))
                
                current_rev = self.get_current_revision()
                conn.execute(text("""
                    INSERT INTO migration_backups (backup_name, revision)
                    VALUES (:backup_name, :revision)
                """), {"backup_name": backup_name, "revision": current_rev})
                
                conn.commit()
            
            self.logger.info(f"Backup point created: {backup_name}")
            return backup_name
            
        except Exception as e:
            self.logger.error(f"Failed to create backup point: {e}")
            raise
    
    def check_migration_safety(self) -> bool:
        """Perform safety checks before migration"""
        try:
            current_rev = self.get_current_revision()
            head_rev = self.get_head_revision()
            
            self.logger.info(f"Current revision: {current_rev}")
            self.logger.info(f"Head revision: {head_rev}")
            
            if current_rev == head_rev:
                self.logger.info("Database is already up to date")
                return False
            
            # Check if database is accessible
            with self.engine.connect() as conn:
                conn.execute(text("SELECT COUNT(*) FROM information_schema.tables"))
            
            self.logger.info("Safety checks passed")
            return True
            
        except Exception as e:
            self.logger.error(f"Safety check failed: {e}")
            raise
    
    def run_migration(self, target_revision: str = "head") -> bool:
        """Run database migration to target revision"""
        try:
            self.logger.info(f"Starting migration to {target_revision}")
            
            # Run the migration
            command.upgrade(self.alembic_cfg, target_revision)
            
            # Verify migration
            new_revision = self.get_current_revision()
            self.logger.info(f"Migration completed. New revision: {new_revision}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            raise
    
    def rollback_to_revision(self, revision: str) -> bool:
        """Rollback to a specific revision"""
        try:
            self.logger.info(f"Rolling back to revision: {revision}")
            
            command.downgrade(self.alembic_cfg, revision)
            
            new_revision = self.get_current_revision()
            self.logger.info(f"Rollback completed. Current revision: {new_revision}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Rollback failed: {e}")
            raise
    
    def validate_post_migration(self) -> bool:
        """Validate database state after migration"""
        try:
            with self.engine.connect() as conn:
                # Check that essential tables exist
                essential_tables = [
                    'air_quality_measurements',
                    'weather_data',
                    'predictions',
                    'monitoring_stations',
                    'users'
                ]
                
                for table in essential_tables:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_name = :table_name
                    """), {"table_name": table})
                    
                    if result.fetchone()[0] == 0:
                        self.logger.warning(f"Essential table {table} not found")
                        return False
                
                # Check TimescaleDB hypertables
                hypertables = ['air_quality_measurements', 'weather_data', 'predictions']
                for table in hypertables:
                    try:
                        result = conn.execute(text("""
                            SELECT * FROM timescaledb_information.hypertables 
                            WHERE hypertable_name = :table_name
                        """), {"table_name": table})
                        
                        if not result.fetchone():
                            self.logger.warning(f"Hypertable {table} not found")
                    except Exception:
                        # TimescaleDB might not be available in test environments
                        self.logger.info(f"Could not verify hypertable {table} (TimescaleDB not available)")
                
                self.logger.info("Post-migration validation passed")
                return True
                
        except Exception as e:
            self.logger.error(f"Post-migration validation failed: {e}")
            return False


def main():
    """Main migration script entry point"""
    parser = argparse.ArgumentParser(description="Database migration script")
    parser.add_argument(
        "--database-url",
        required=True,
        help="Database URL for migration"
    )
    parser.add_argument(
        "--target-revision",
        default="head",
        help="Target revision for migration (default: head)"
    )
    parser.add_argument(
        "--rollback-to",
        help="Rollback to specific revision instead of upgrading"
    )
    parser.add_argument(
        "--create-backup",
        action="store_true",
        help="Create backup point before migration"
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only validate current database state"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without executing"
    )
    
    args = parser.parse_args()
    
    # Initialize migrator
    migrator = DatabaseMigrator(args.database_url)
    
    try:
        # Setup
        migrator.setup()
        
        if args.validate_only:
            # Just validate current state
            is_valid = migrator.validate_post_migration()
            if is_valid:
                print("✅ Database validation passed")
                sys.exit(0)
            else:
                print("❌ Database validation failed")
                sys.exit(1)
        
        if args.dry_run:
            # Show current state and what would be done
            current_rev = migrator.get_current_revision()
            head_rev = migrator.get_head_revision()
            
            print(f"Current revision: {current_rev}")
            print(f"Head revision: {head_rev}")
            
            if args.rollback_to:
                print(f"Would rollback to: {args.rollback_to}")
            else:
                print(f"Would migrate to: {args.target_revision}")
            
            sys.exit(0)
        
        if args.rollback_to:
            # Rollback operation
            migrator.rollback_to_revision(args.rollback_to)
            print(f"✅ Rollback to {args.rollback_to} completed")
        else:
            # Migration operation
            if not migrator.check_migration_safety():
                print("ℹ️  No migration needed")
                sys.exit(0)
            
            # Create backup if requested
            if args.create_backup:
                backup_name = migrator.create_backup_point()
                print(f"📦 Backup created: {backup_name}")
            
            # Run migration
            migrator.run_migration(args.target_revision)
            
            # Validate result
            if migrator.validate_post_migration():
                print("✅ Migration completed successfully")
            else:
                print("⚠️  Migration completed but validation failed")
                sys.exit(1)
    
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()