"""
City Comparator - Comparative analysis between cities
Provides statistical comparison and ranking of cities
"""

import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_

from src.api.models import CityStatistics, CityConfiguration

logger = logging.getLogger(__name__)


@dataclass
class CityComparison:
    """Comparison data for a city"""
    city_code: str
    city_name: str
    avg_aqi: float
    max_aqi: float
    min_aqi: float
    avg_pm25: float
    good_hours: int
    moderate_hours: int
    unhealthy_hours: int
    data_completeness: float
    rank: Optional[int] = None


@dataclass
class ComparativeAnalysis:
    """Comparative analysis result"""
    period_start: date
    period_end: date
    cities: List[CityComparison]
    best_city: Optional[str] = None
    worst_city: Optional[str] = None
    average_aqi: Optional[float] = None


class CityComparator:
    """Compare air quality across multiple cities"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def compare_cities(
        self,
        city_codes: Optional[List[str]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        days: int = 7
    ) -> ComparativeAnalysis:
        """
        Compare air quality across cities for a time period
        
        Args:
            city_codes: List of city codes to compare (None for all active cities)
            start_date: Start date for comparison
            end_date: End date for comparison
            days: Number of days to compare (default 7, used if dates not provided)
            
        Returns:
            ComparativeAnalysis with comparison data
        """
        # Set date range
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=days)
        
        # Get city codes if not provided
        if not city_codes:
            city_codes = self._get_all_active_city_codes()
        
        # Get statistics for each city
        comparisons = []
        for city_code in city_codes:
            city_data = self._get_city_aggregate_stats(city_code, start_date, end_date)
            if city_data:
                comparisons.append(city_data)
        
        # Rank cities by average AQI (lower is better)
        comparisons.sort(key=lambda x: x.avg_aqi)
        for i, comp in enumerate(comparisons, 1):
            comp.rank = i
        
        # Calculate overall statistics
        best_city = comparisons[0].city_name if comparisons else None
        worst_city = comparisons[-1].city_name if comparisons else None
        average_aqi = sum(c.avg_aqi for c in comparisons) / len(comparisons) if comparisons else None
        
        return ComparativeAnalysis(
            period_start=start_date,
            period_end=end_date,
            cities=comparisons,
            best_city=best_city,
            worst_city=worst_city,
            average_aqi=average_aqi
        )
    
    def get_city_trends(
        self,
        city_code: str,
        days: int = 30
    ) -> List[Dict]:
        """
        Get daily trend data for a city
        
        Args:
            city_code: City code
            days: Number of days of history
            
        Returns:
            List of daily statistics
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        try:
            stmt = select(CityStatistics).where(
                CityStatistics.city_code == city_code,
                CityStatistics.date >= start_date,
                CityStatistics.date <= end_date
            ).order_by(CityStatistics.date)
            
            results = self.db.execute(stmt).all()
            
            return [
                {
                    'date': row[0].date.isoformat(),
                    'avg_aqi': row[0].avg_aqi,
                    'max_aqi': row[0].max_aqi,
                    'min_aqi': row[0].min_aqi,
                    'avg_pm25': row[0].avg_pm25,
                    'good_hours': row[0].good_hours,
                    'moderate_hours': row[0].moderate_hours,
                    'unhealthy_hours': row[0].unhealthy_hours,
                    'data_completeness': row[0].data_completeness
                }
                for row in results
            ]
            
        except Exception as e:
            logger.error(f"Error getting city trends for {city_code}: {e}")
            return []
    
    def get_rankings(
        self,
        metric: str = 'avg_aqi',
        days: int = 7,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get city rankings by specific metric
        
        Args:
            metric: Metric to rank by (avg_aqi, avg_pm25, etc.)
            days: Number of days to average
            limit: Maximum number of cities to return
            
        Returns:
            List of ranked cities
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Map metric names to columns
            metric_column = getattr(CityStatistics, metric, CityStatistics.avg_aqi)
            
            # Aggregate statistics over the period
            stmt = select(
                CityStatistics.city_code,
                CityConfiguration.city_name,
                func.avg(metric_column).label('avg_value'),
                func.max(CityStatistics.max_aqi).label('max_aqi'),
                func.avg(CityStatistics.data_completeness).label('avg_completeness')
            ).join(
                CityConfiguration,
                CityStatistics.city_code == CityConfiguration.city_code
            ).where(
                CityStatistics.date >= start_date,
                CityStatistics.date <= end_date,
                CityConfiguration.is_active == True
            ).group_by(
                CityStatistics.city_code,
                CityConfiguration.city_name
            ).order_by(
                'avg_value'
            ).limit(limit)
            
            results = self.db.execute(stmt).all()
            
            return [
                {
                    'rank': i + 1,
                    'city_code': row.city_code,
                    'city_name': row.city_name,
                    'value': float(row.avg_value) if row.avg_value else None,
                    'max_aqi': float(row.max_aqi) if row.max_aqi else None,
                    'data_completeness': float(row.avg_completeness) if row.avg_completeness else None
                }
                for i, row in enumerate(results)
            ]
            
        except Exception as e:
            logger.error(f"Error getting rankings: {e}")
            return []
    
    def get_best_worst_cities(
        self,
        days: int = 7
    ) -> Dict[str, Optional[str]]:
        """
        Get best and worst cities by AQI
        
        Args:
            days: Number of days to average
            
        Returns:
            Dictionary with best and worst city names
        """
        rankings = self.get_rankings(metric='avg_aqi', days=days, limit=100)
        
        if not rankings:
            return {'best': None, 'worst': None}
        
        return {
            'best': rankings[0]['city_name'],
            'worst': rankings[-1]['city_name']
        }
    
    def _get_all_active_city_codes(self) -> List[str]:
        """Get all active city codes"""
        try:
            stmt = select(CityConfiguration.city_code).where(
                CityConfiguration.is_active == True
            )
            results = self.db.execute(stmt).all()
            return [row[0] for row in results]
        except Exception as e:
            logger.error(f"Error getting active city codes: {e}")
            return []
    
    def _get_city_aggregate_stats(
        self,
        city_code: str,
        start_date: date,
        end_date: date
    ) -> Optional[CityComparison]:
        """Get aggregated statistics for a city over a period"""
        try:
            # Get city name
            city_stmt = select(CityConfiguration).where(
                CityConfiguration.city_code == city_code
            )
            city_result = self.db.execute(city_stmt).first()
            if not city_result:
                return None
            
            city_name = city_result[0].city_name
            
            # Aggregate statistics
            stmt = select(
                func.avg(CityStatistics.avg_aqi).label('avg_aqi'),
                func.max(CityStatistics.max_aqi).label('max_aqi'),
                func.min(CityStatistics.min_aqi).label('min_aqi'),
                func.avg(CityStatistics.avg_pm25).label('avg_pm25'),
                func.sum(CityStatistics.good_hours).label('good_hours'),
                func.sum(CityStatistics.moderate_hours).label('moderate_hours'),
                func.sum(CityStatistics.unhealthy_hours).label('unhealthy_hours'),
                func.avg(CityStatistics.data_completeness).label('data_completeness')
            ).where(
                CityStatistics.city_code == city_code,
                CityStatistics.date >= start_date,
                CityStatistics.date <= end_date
            )
            
            result = self.db.execute(stmt).first()
            
            if not result or result.avg_aqi is None:
                return None
            
            return CityComparison(
                city_code=city_code,
                city_name=city_name,
                avg_aqi=float(result.avg_aqi),
                max_aqi=float(result.max_aqi) if result.max_aqi else 0.0,
                min_aqi=float(result.min_aqi) if result.min_aqi else 0.0,
                avg_pm25=float(result.avg_pm25) if result.avg_pm25 else 0.0,
                good_hours=int(result.good_hours) if result.good_hours else 0,
                moderate_hours=int(result.moderate_hours) if result.moderate_hours else 0,
                unhealthy_hours=int(result.unhealthy_hours) if result.unhealthy_hours else 0,
                data_completeness=float(result.data_completeness) if result.data_completeness else 0.0
            )
            
        except Exception as e:
            logger.error(f"Error getting aggregate stats for {city_code}: {e}")
            return None


def compare_cities(
    db: Session,
    city_codes: Optional[List[str]] = None,
    days: int = 7
) -> ComparativeAnalysis:
    """Convenience function to compare cities"""
    comparator = CityComparator(db)
    return comparator.compare_cities(city_codes=city_codes, days=days)
