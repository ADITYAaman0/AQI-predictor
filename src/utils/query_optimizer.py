"""
Query Optimization Utilities
Provides utilities for optimizing database queries and improving performance
"""

import logging
from typing import List, Optional, Any
from sqlalchemy import select, func, Index
from sqlalchemy.orm import Session, Query
from sqlalchemy.sql import Select
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """Utilities for optimizing database queries"""
    
    @staticmethod
    def add_time_range_filter(
        query: Select,
        time_column: Any,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        hours: Optional[int] = None
    ) -> Select:
        """
        Add optimized time range filter to query
        
        Args:
            query: SQLAlchemy select query
            time_column: Time column to filter on
            start_time: Start of time range
            end_time: End of time range
            hours: Number of hours from now (alternative to start/end)
        
        Returns:
            Modified query with time filter
        """
        if hours:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)
        
        if start_time:
            query = query.where(time_column >= start_time)
        if end_time:
            query = query.where(time_column <= end_time)
        
        return query
    
    @staticmethod
    def add_spatial_filter(
        query: Select,
        location_column: Any,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0
    ) -> Select:
        """
        Add optimized spatial filter to query using PostGIS
        
        Args:
            query: SQLAlchemy select query
            location_column: Geometry column to filter on
            latitude: Center latitude
            longitude: Center longitude
            radius_km: Radius in kilometers
        
        Returns:
            Modified query with spatial filter
        """
        from geoalchemy2.functions import ST_DWithin, ST_GeomFromText
        
        point = f"POINT({longitude} {latitude})"
        radius_meters = radius_km * 1000
        
        query = query.where(
            ST_DWithin(
                location_column,
                ST_GeomFromText(point, 4326),
                radius_meters,
                True  # Use spheroid for accurate distance
            )
        )
        
        return query
    
    @staticmethod
    def add_pagination(
        query: Select,
        page: int = 1,
        page_size: int = 100,
        max_page_size: int = 1000
    ) -> Select:
        """
        Add pagination to query with limits
        
        Args:
            query: SQLAlchemy select query
            page: Page number (1-indexed)
            page_size: Number of items per page
            max_page_size: Maximum allowed page size
        
        Returns:
            Modified query with pagination
        """
        # Enforce limits
        page = max(1, page)
        page_size = min(page_size, max_page_size)
        
        offset = (page - 1) * page_size
        query = query.limit(page_size).offset(offset)
        
        return query
    
    @staticmethod
    def optimize_for_count(query: Select) -> Select:
        """
        Optimize query for counting rows
        
        Args:
            query: SQLAlchemy select query
        
        Returns:
            Optimized count query
        """
        # Use COUNT(*) which is faster than counting specific columns
        return select(func.count()).select_from(query.subquery())
    
    @staticmethod
    def add_city_filter(
        query: Select,
        city_code_column: Any,
        city_code: str
    ) -> Select:
        """
        Add city filter to query
        
        Args:
            query: SQLAlchemy select query
            city_code_column: City code column
            city_code: City code to filter by
        
        Returns:
            Modified query with city filter
        """
        return query.where(city_code_column == city_code)
    
    @staticmethod
    def suggest_indexes(table_name: str, query_patterns: List[dict]) -> List[str]:
        """
        Suggest indexes based on query patterns
        
        Args:
            table_name: Name of the table
            query_patterns: List of query patterns with columns used
        
        Returns:
            List of suggested index creation SQL statements
        """
        suggestions = []
        
        # Analyze query patterns
        column_usage = {}
        for pattern in query_patterns:
            for col in pattern.get('where_columns', []):
                column_usage[col] = column_usage.get(col, 0) + 1
            for col in pattern.get('order_by_columns', []):
                column_usage[col] = column_usage.get(col, 0) + 1
        
        # Suggest indexes for frequently used columns
        for col, usage_count in column_usage.items():
            if usage_count >= 3:  # Threshold for suggesting index
                suggestions.append(
                    f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{col} ON {table_name} ({col});"
                )
        
        return suggestions
    
    @staticmethod
    def explain_query(db: Session, query: Select) -> dict:
        """
        Get query execution plan for analysis
        
        Args:
            db: Database session
            query: SQLAlchemy select query
        
        Returns:
            Query execution plan
        """
        try:
            # Get the compiled query
            compiled = query.compile(compile_kwargs={"literal_binds": True})
            sql = str(compiled)
            
            # Execute EXPLAIN ANALYZE
            explain_result = db.execute(f"EXPLAIN ANALYZE {sql}")
            plan = [row[0] for row in explain_result]
            
            return {
                "query": sql,
                "plan": plan,
                "suggestions": QueryOptimizer._analyze_plan(plan)
            }
        except Exception as e:
            logger.error(f"Error explaining query: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def _analyze_plan(plan: List[str]) -> List[str]:
        """Analyze execution plan and provide suggestions"""
        suggestions = []
        
        plan_text = "\n".join(plan)
        
        # Check for sequential scans
        if "Seq Scan" in plan_text:
            suggestions.append("Consider adding an index to avoid sequential scan")
        
        # Check for high cost
        for line in plan:
            if "cost=" in line:
                cost_str = line.split("cost=")[1].split()[0]
                try:
                    cost = float(cost_str.split("..")[1])
                    if cost > 10000:
                        suggestions.append(f"High query cost detected: {cost}")
                except:
                    pass
        
        # Check for nested loops
        if plan_text.count("Nested Loop") > 2:
            suggestions.append("Multiple nested loops detected - consider query restructuring")
        
        return suggestions


class CacheStrategy:
    """Strategies for caching query results"""
    
    @staticmethod
    def should_cache(query_type: str, result_size: int) -> bool:
        """
        Determine if query result should be cached
        
        Args:
            query_type: Type of query (forecast, aqi, attribution, etc.)
            result_size: Size of result in bytes
        
        Returns:
            True if should cache, False otherwise
        """
        # Don't cache very large results
        if result_size > 1024 * 1024:  # 1MB
            return False
        
        # Cache based on query type
        cacheable_types = ['forecast', 'aqi', 'attribution', 'spatial', 'city']
        return query_type in cacheable_types
    
    @staticmethod
    def get_ttl(query_type: str, data_freshness: str = 'normal') -> int:
        """
        Get appropriate TTL for query type
        
        Args:
            query_type: Type of query
            data_freshness: Required freshness (realtime, normal, historical)
        
        Returns:
            TTL in seconds
        """
        base_ttls = {
            'forecast': 3600,      # 1 hour
            'aqi': 300,            # 5 minutes
            'attribution': 1800,   # 30 minutes
            'spatial': 3600,       # 1 hour
            'city': 86400,         # 24 hours
            'station': 86400,      # 24 hours
        }
        
        ttl = base_ttls.get(query_type, 1800)
        
        # Adjust based on freshness requirement
        if data_freshness == 'realtime':
            ttl = ttl // 4
        elif data_freshness == 'historical':
            ttl = ttl * 4
        
        return ttl


def optimize_timescale_query(
    query: Select,
    time_column: Any,
    use_continuous_aggregate: bool = True
) -> Select:
    """
    Optimize query for TimescaleDB
    
    Args:
        query: SQLAlchemy select query
        time_column: Time column for time-series optimization
        use_continuous_aggregate: Whether to use continuous aggregates
    
    Returns:
        Optimized query
    """
    # Add time-based ordering for better chunk pruning
    query = query.order_by(time_column.desc())
    
    # TimescaleDB automatically uses chunk pruning when time filters are present
    # No additional optimization needed here
    
    return query


def batch_insert_optimizer(
    db: Session,
    model_class: Any,
    records: List[dict],
    batch_size: int = 1000
) -> int:
    """
    Optimize bulk inserts using batching
    
    Args:
        db: Database session
        model_class: SQLAlchemy model class
        records: List of records to insert
        batch_size: Number of records per batch
    
    Returns:
        Number of records inserted
    """
    total_inserted = 0
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        
        try:
            # Use bulk_insert_mappings for better performance
            db.bulk_insert_mappings(model_class, batch)
            db.commit()
            total_inserted += len(batch)
            
            logger.debug(f"Inserted batch of {len(batch)} records")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error inserting batch: {e}")
            raise
    
    return total_inserted
