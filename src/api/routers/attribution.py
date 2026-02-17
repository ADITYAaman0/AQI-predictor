"""
Source Attribution API endpoints for pollution source analysis.
Provides source decomposition and policy simulation capabilities.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from src.api.database import get_db, AsyncSession
from src.api.cache import cache_manager, CACHE_TTL
from src.api.schemas import LocationInfo, SourceAttributionInfo
from src.utils.location_parser import parse_location
from src.models.source_attribution import get_source_attribution_model
from src.models.policy_simulator import PolicySimulator
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class AttributionResponse(BaseModel):
    """Source attribution response model."""
    location: LocationInfo
    timestamp: datetime
    sources: Dict[str, float]  # source name -> percentage contribution
    explanations: Dict[str, Any]  # SHAP explanations
    confidence: float
    total_pm25: float
    aqi_value: int


class ScenarioRequest(BaseModel):
    """Policy scenario request model."""
    location: LocationInfo
    interventions: List[Dict[str, Any]]  # List of policy interventions


class ScenarioResponse(BaseModel):
    """Policy scenario response model."""
    baseline_aqi: int
    predicted_aqi: int
    impact_percentage: float
    source_changes: Dict[str, float]
    intervention_details: List[Dict[str, Any]]


@router.get("/{location}")
async def get_source_attribution(
    location: str,
    timestamp: Optional[datetime] = Query(None, description="Timestamp for attribution analysis"),
    db: AsyncSession = Depends(get_db)
) -> AttributionResponse:
    """
    Get source attribution analysis for a location.
    
    Args:
        location: Location identifier (city name, coordinates, or address)
        timestamp: Optional timestamp for historical attribution
        
    Returns:
        Source attribution breakdown with explanations
    """
    try:
        # Parse location
        location_info = parse_location(location)
        if not location_info:
            raise HTTPException(status_code=400, detail=f"Invalid location: {location}")
        
        # Use current time if no timestamp provided
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Check cache first
        cache_key = f"attribution:{location}:{timestamp.isoformat()}"
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data:
            logger.info(f"Returning cached attribution for {location}")
            return AttributionResponse(**cached_data)
        
        # Get attribution model
        attribution_model = get_source_attribution_model()
        
        # Get current air quality data for the location
        from src.api.crud import get_latest_air_quality_data
        aq_data = await get_latest_air_quality_data(db, location_info.coordinates)
        
        if not aq_data:
            raise HTTPException(status_code=404, detail="No air quality data available for location")
        
        # Calculate source attribution
        attribution_result = attribution_model.calculate_attribution(
            location=location_info.coordinates,
            timestamp=timestamp,
            current_pm25=aq_data.get('pm25', 0)
        )
        
        # Prepare response
        response_data = {
            "location": location_info,
            "timestamp": timestamp,
            "sources": attribution_result["sources"],
            "explanations": attribution_result["explanations"],
            "confidence": attribution_result["confidence"],
            "total_pm25": aq_data.get('pm25', 0),
            "aqi_value": aq_data.get('aqi', 0)
        }
        
        # Cache the result
        await cache_manager.set(cache_key, response_data, ttl=CACHE_TTL["attribution"])
        
        return AttributionResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error getting source attribution for {location}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Attribution analysis failed: {str(e)}")


@router.post("/scenario")
async def analyze_policy_scenario(
    request: ScenarioRequest,
    db: AsyncSession = Depends(get_db)
) -> ScenarioResponse:
    """
    Analyze the impact of policy interventions on air quality.
    
    Args:
        request: Policy scenario request with interventions
        
    Returns:
        Predicted impact of policy interventions
    """
    try:
        # Get policy simulator
        simulator = PolicySimulator()
        
        # Get current air quality data
        from src.api.crud import get_latest_air_quality_data
        aq_data = await get_latest_air_quality_data(db, request.location.coordinates)
        
        if not aq_data:
            raise HTTPException(status_code=404, detail="No air quality data available for location")
        
        baseline_aqi = aq_data.get('aqi', 0)
        
        # Simulate policy interventions
        simulation_result = simulator.simulate_interventions(
            location=request.location.coordinates,
            baseline_pm25=aq_data.get('pm25', 0),
            interventions=request.interventions
        )
        
        # Calculate impact
        predicted_aqi = simulation_result["predicted_aqi"]
        impact_percentage = ((baseline_aqi - predicted_aqi) / baseline_aqi * 100) if baseline_aqi > 0 else 0
        
        return ScenarioResponse(
            baseline_aqi=baseline_aqi,
            predicted_aqi=predicted_aqi,
            impact_percentage=impact_percentage,
            source_changes=simulation_result["source_changes"],
            intervention_details=request.interventions
        )
        
    except Exception as e:
        logger.error(f"Error analyzing policy scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Policy scenario analysis failed: {str(e)}")


@router.get("/{location}/history")
async def get_attribution_history(
    location: str,
    start_date: datetime = Query(..., description="Start date for historical data"),
    end_date: datetime = Query(..., description="End date for historical data"),
    db: AsyncSession = Depends(get_db)
) -> List[AttributionResponse]:
    """
    Get historical source attribution data for a location.
    
    Args:
        location: Location identifier
        start_date: Start date for historical data
        end_date: End date for historical data
        
    Returns:
        List of historical attribution analyses
    """
    try:
        # Parse location
        location_info = parse_location(location)
        if not location_info:
            raise HTTPException(status_code=400, detail=f"Invalid location: {location}")
        
        # Validate date range
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        if (end_date - start_date).days > 30:
            raise HTTPException(status_code=400, detail="Date range cannot exceed 30 days")
        
        # Get attribution model
        attribution_model = get_source_attribution_model()
        
        # Get historical data
        from src.api.crud import get_historical_air_quality_data
        historical_data = await get_historical_air_quality_data(
            db, location_info.coordinates, start_date, end_date
        )
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="No historical data available for location and date range")
        
        # Calculate attribution for each data point
        results = []
        for data_point in historical_data:
            attribution_result = attribution_model.calculate_attribution(
                location=location_info.coordinates,
                timestamp=data_point['timestamp'],
                current_pm25=data_point.get('pm25', 0)
            )
            
            results.append(AttributionResponse(
                location=location_info,
                timestamp=data_point['timestamp'],
                sources=attribution_result["sources"],
                explanations=attribution_result["explanations"],
                confidence=attribution_result["confidence"],
                total_pm25=data_point.get('pm25', 0),
                aqi_value=data_point.get('aqi', 0)
            ))
        
        return results
        
    except Exception as e:
        logger.error(f"Error getting attribution history for {location}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Attribution history retrieval failed: {str(e)}")


@router.get("/{location}/sources/{source_type}")
async def get_source_specific_data(
    location: str,
    source_type: str,
    hours: int = Query(24, description="Number of hours to look back"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed data for a specific pollution source.
    
    Args:
        location: Location identifier
        source_type: Type of source (vehicular, industrial, biomass, background)
        hours: Number of hours to look back
        
    Returns:
        Detailed source-specific data and trends
    """
    try:
        # Validate source type
        valid_sources = ["vehicular", "industrial", "biomass", "background"]
        if source_type not in valid_sources:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid source type. Must be one of: {', '.join(valid_sources)}"
            )
        
        # Parse location
        location_info = parse_location(location)
        if not location_info:
            raise HTTPException(status_code=400, detail=f"Invalid location: {location}")
        
        # Get attribution model
        attribution_model = get_source_attribution_model()
        
        # Get recent data
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        from src.api.crud import get_historical_air_quality_data
        historical_data = await get_historical_air_quality_data(
            db, location_info.coordinates, start_time, end_time
        )
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="No data available for location and time range")
        
        # Calculate source-specific trends
        source_contributions = []
        timestamps = []
        
        for data_point in historical_data:
            attribution_result = attribution_model.calculate_attribution(
                location=location_info.coordinates,
                timestamp=data_point['timestamp'],
                current_pm25=data_point.get('pm25', 0)
            )
            
            source_contributions.append(attribution_result["sources"].get(source_type, 0))
            timestamps.append(data_point['timestamp'])
        
        # Calculate statistics
        contributions_array = np.array(source_contributions)
        
        return {
            "location": location_info,
            "source_type": source_type,
            "time_range": {
                "start": start_time,
                "end": end_time,
                "hours": hours
            },
            "statistics": {
                "mean_contribution": float(np.mean(contributions_array)),
                "max_contribution": float(np.max(contributions_array)),
                "min_contribution": float(np.min(contributions_array)),
                "std_contribution": float(np.std(contributions_array))
            },
            "time_series": [
                {"timestamp": ts, "contribution": contrib}
                for ts, contrib in zip(timestamps, source_contributions)
            ],
            "data_points": len(source_contributions)
        }
        
    except Exception as e:
        logger.error(f"Error getting source-specific data for {location}/{source_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Source data retrieval failed: {str(e)}")