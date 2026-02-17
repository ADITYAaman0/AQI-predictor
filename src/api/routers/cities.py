"""
Cities API Router - Multi-city support endpoints
Provides city detection, configuration, and comparative analysis
"""

import logging
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from src.api.database import get_db
from src.utils.city_detector import CityDetector, CityInfo
from src.utils.city_comparator import CityComparator, ComparativeAnalysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/cities", tags=["cities"])


# Pydantic models for request/response
class CityInfoResponse(BaseModel):
    """City information response"""
    city_code: str
    city_name: str
    state: Optional[str]
    country: str
    latitude: float
    longitude: float
    is_active: bool
    priority: int
    ml_model_config: Optional[dict] = None
    data_sources: Optional[dict] = None
    alert_thresholds: Optional[dict] = None


class CityDetectionRequest(BaseModel):
    """City detection request"""
    location: str = Field(..., description="Location string (coordinates, city name, or address)")


class CityComparisonRequest(BaseModel):
    """City comparison request"""
    city_codes: Optional[List[str]] = Field(None, description="List of city codes to compare")
    days: int = Field(7, ge=1, le=365, description="Number of days to compare")


class CityComparisonResponse(BaseModel):
    """City comparison response"""
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


class ComparativeAnalysisResponse(BaseModel):
    """Comparative analysis response"""
    period_start: str
    period_end: str
    cities: List[CityComparisonResponse]
    best_city: Optional[str] = None
    worst_city: Optional[str] = None
    average_aqi: Optional[float] = None


class CityStationResponse(BaseModel):
    """City monitoring station response"""
    station_id: str
    name: str
    latitude: float
    longitude: float
    parameters: List[str]


class CityTrendResponse(BaseModel):
    """City trend data response"""
    date: str
    avg_aqi: Optional[float]
    max_aqi: Optional[float]
    min_aqi: Optional[float]
    avg_pm25: Optional[float]
    good_hours: Optional[int]
    moderate_hours: Optional[int]
    unhealthy_hours: Optional[int]
    data_completeness: Optional[float]


class CityRankingResponse(BaseModel):
    """City ranking response"""
    rank: int
    city_code: str
    city_name: str
    value: Optional[float]
    max_aqi: Optional[float]
    data_completeness: Optional[float]


@router.get("/", response_model=List[CityInfoResponse])
async def get_all_cities(
    db: Session = Depends(get_db)
):
    """
    Get all active cities
    
    Returns list of all active cities with their configurations
    """
    try:
        detector = CityDetector(db)
        cities = detector.get_all_active_cities()
        
        return [
            CityInfoResponse(
                city_code=city.city_code,
                city_name=city.city_name,
                state=city.state,
                country=city.country,
                latitude=city.latitude,
                longitude=city.longitude,
                is_active=city.is_active,
                priority=city.priority,
                ml_model_config=city.model_config,
                data_sources=city.data_sources,
                alert_thresholds=city.alert_thresholds
            )
            for city in cities
        ]
    except Exception as e:
        logger.error(f"Error getting all cities: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving cities")


@router.get("/{city_code}", response_model=CityInfoResponse)
async def get_city_by_code(
    city_code: str,
    db: Session = Depends(get_db)
):
    """
    Get city information by city code
    
    Args:
        city_code: City code (e.g., DEL, BOM, BLR)
    """
    try:
        detector = CityDetector(db)
        city = detector.get_city_by_code(city_code)
        
        if not city:
            raise HTTPException(status_code=404, detail=f"City {city_code} not found")
        
        return CityInfoResponse(
            city_code=city.city_code,
            city_name=city.city_name,
            state=city.state,
            country=city.country,
            latitude=city.latitude,
            longitude=city.longitude,
            is_active=city.is_active,
            priority=city.priority,
            ml_model_config=city.model_config,
            data_sources=city.data_sources,
            alert_thresholds=city.alert_thresholds
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting city {city_code}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving city")


@router.post("/detect", response_model=CityInfoResponse)
async def detect_city(
    request: CityDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Detect city from location string
    
    Accepts coordinates, city names, or addresses and returns the detected city
    """
    try:
        detector = CityDetector(db)
        city = detector.detect_city_from_location(request.location)
        
        if not city:
            raise HTTPException(
                status_code=404,
                detail=f"Could not detect city from location: {request.location}"
            )
        
        return CityInfoResponse(
            city_code=city.city_code,
            city_name=city.city_name,
            state=city.state,
            country=city.country,
            latitude=city.latitude,
            longitude=city.longitude,
            is_active=city.is_active,
            priority=city.priority,
            ml_model_config=city.model_config,
            data_sources=city.data_sources,
            alert_thresholds=city.alert_thresholds
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting city: {e}")
        raise HTTPException(status_code=500, detail="Error detecting city")


@router.get("/{city_code}/stations", response_model=List[CityStationResponse])
async def get_city_stations(
    city_code: str,
    db: Session = Depends(get_db)
):
    """
    Get all monitoring stations for a city
    
    Args:
        city_code: City code
    """
    try:
        detector = CityDetector(db)
        stations = detector.get_city_stations(city_code)
        
        return [
            CityStationResponse(
                station_id=station['station_id'],
                name=station['name'],
                latitude=station['latitude'],
                longitude=station['longitude'],
                parameters=station['parameters'] or []
            )
            for station in stations
        ]
    except Exception as e:
        logger.error(f"Error getting stations for city {city_code}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving city stations")


@router.get("/{city_code}/trends", response_model=List[CityTrendResponse])
async def get_city_trends(
    city_code: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
    db: Session = Depends(get_db)
):
    """
    Get daily trend data for a city
    
    Args:
        city_code: City code
        days: Number of days of history (default 30)
    """
    try:
        comparator = CityComparator(db)
        trends = comparator.get_city_trends(city_code, days)
        
        return [
            CityTrendResponse(**trend)
            for trend in trends
        ]
    except Exception as e:
        logger.error(f"Error getting trends for city {city_code}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving city trends")


@router.post("/compare", response_model=ComparativeAnalysisResponse)
async def compare_cities(
    request: CityComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Compare air quality across multiple cities
    
    Provides comparative analysis of AQI and pollutant levels across cities
    """
    try:
        comparator = CityComparator(db)
        analysis = comparator.compare_cities(
            city_codes=request.city_codes,
            days=request.days
        )
        
        return ComparativeAnalysisResponse(
            period_start=analysis.period_start.isoformat(),
            period_end=analysis.period_end.isoformat(),
            cities=[
                CityComparisonResponse(
                    city_code=city.city_code,
                    city_name=city.city_name,
                    avg_aqi=city.avg_aqi,
                    max_aqi=city.max_aqi,
                    min_aqi=city.min_aqi,
                    avg_pm25=city.avg_pm25,
                    good_hours=city.good_hours,
                    moderate_hours=city.moderate_hours,
                    unhealthy_hours=city.unhealthy_hours,
                    data_completeness=city.data_completeness,
                    rank=city.rank
                )
                for city in analysis.cities
            ],
            best_city=analysis.best_city,
            worst_city=analysis.worst_city,
            average_aqi=analysis.average_aqi
        )
    except Exception as e:
        logger.error(f"Error comparing cities: {e}")
        raise HTTPException(status_code=500, detail="Error comparing cities")


@router.get("/rankings/{metric}", response_model=List[CityRankingResponse])
async def get_city_rankings(
    metric: str = "avg_aqi",
    days: int = Query(7, ge=1, le=365, description="Number of days to average"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of cities"),
    db: Session = Depends(get_db)
):
    """
    Get city rankings by specific metric
    
    Args:
        metric: Metric to rank by (avg_aqi, avg_pm25, avg_pm10, etc.)
        days: Number of days to average (default 7)
        limit: Maximum number of cities to return (default 10)
    """
    try:
        comparator = CityComparator(db)
        rankings = comparator.get_rankings(metric=metric, days=days, limit=limit)
        
        return [
            CityRankingResponse(**ranking)
            for ranking in rankings
        ]
    except Exception as e:
        logger.error(f"Error getting rankings: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving rankings")


@router.get("/best-worst/current")
async def get_best_worst_cities(
    days: int = Query(7, ge=1, le=30, description="Number of days to average"),
    db: Session = Depends(get_db)
):
    """
    Get best and worst cities by AQI
    
    Args:
        days: Number of days to average (default 7)
    """
    try:
        comparator = CityComparator(db)
        result = comparator.get_best_worst_cities(days=days)
        
        return {
            "best_city": result['best'],
            "worst_city": result['worst'],
            "period_days": days
        }
    except Exception as e:
        logger.error(f"Error getting best/worst cities: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving best/worst cities")
