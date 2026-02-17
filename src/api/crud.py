"""
CRUD operations for AQI Predictor database entities.
Provides create, read, update, delete operations for all models.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, and_, or_, func, text
from sqlalchemy.orm import selectinload
from geoalchemy2 import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_GeomFromText, ST_AsText

from src.api.models import (
    AirQualityMeasurement, WeatherData, Prediction, MonitoringStation,
    User, AlertSubscription, SourceAttribution, DataQualityFlag, ModelMetadata
)


class AirQualityMeasurementCRUD:
    """CRUD operations for air quality measurements."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        time: datetime,
        station_id: str,
        parameter: str,
        value: Optional[float] = None,
        unit: Optional[str] = None,
        quality_flag: str = "valid",
        source: Optional[str] = None,
        location: Optional[WKTElement] = None
    ) -> AirQualityMeasurement:
        """Create a new air quality measurement."""
        measurement = AirQualityMeasurement(
            time=time,
            station_id=station_id,
            parameter=parameter,
            value=value,
            unit=unit,
            quality_flag=quality_flag,
            source=source,
            location=location
        )
        db.add(measurement)
        await db.commit()
        await db.refresh(measurement)
        return measurement
    
    @staticmethod
    async def get_by_key(
        db: AsyncSession,
        time: datetime,
        station_id: str,
        parameter: str
    ) -> Optional[AirQualityMeasurement]:
        """Get measurement by composite primary key."""
        stmt = select(AirQualityMeasurement).where(
            and_(
                AirQualityMeasurement.time == time,
                AirQualityMeasurement.station_id == station_id,
                AirQualityMeasurement.parameter == parameter
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_latest_by_station(
        db: AsyncSession,
        station_id: str,
        parameter: Optional[str] = None,
        limit: int = 100
    ) -> List[AirQualityMeasurement]:
        """Get latest measurements for a station."""
        stmt = select(AirQualityMeasurement).where(
            AirQualityMeasurement.station_id == station_id
        )
        
        if parameter:
            stmt = stmt.where(AirQualityMeasurement.parameter == parameter)
        
        stmt = stmt.order_by(AirQualityMeasurement.time.desc()).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_by_time_range(
        db: AsyncSession,
        start_time: datetime,
        end_time: datetime,
        station_id: Optional[str] = None,
        parameter: Optional[str] = None,
        limit: int = 1000
    ) -> List[AirQualityMeasurement]:
        """Get measurements within time range."""
        stmt = select(AirQualityMeasurement).where(
            and_(
                AirQualityMeasurement.time >= start_time,
                AirQualityMeasurement.time <= end_time
            )
        )
        
        if station_id:
            stmt = stmt.where(AirQualityMeasurement.station_id == station_id)
        
        if parameter:
            stmt = stmt.where(AirQualityMeasurement.parameter == parameter)
        
        stmt = stmt.order_by(AirQualityMeasurement.time.desc()).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_by_location(
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        parameter: Optional[str] = None,
        limit: int = 100
    ) -> List[AirQualityMeasurement]:
        """Get measurements near a location."""
        point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
        
        stmt = select(AirQualityMeasurement).where(
            ST_DWithin(AirQualityMeasurement.location, point, radius_km * 1000)  # Convert km to meters
        )
        
        if parameter:
            stmt = stmt.where(AirQualityMeasurement.parameter == parameter)
        
        stmt = stmt.order_by(AirQualityMeasurement.time.desc()).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def bulk_create(
        db: AsyncSession,
        measurements: List[Dict[str, Any]]
    ) -> int:
        """Bulk insert measurements."""
        stmt = insert(AirQualityMeasurement).values(measurements)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount


class WeatherDataCRUD:
    """CRUD operations for weather data."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        time: datetime,
        location: WKTElement,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        wind_speed: Optional[float] = None,
        wind_direction: Optional[float] = None,
        pressure: Optional[float] = None,
        precipitation: Optional[float] = None,
        visibility: Optional[float] = None,
        source: Optional[str] = None
    ) -> WeatherData:
        """Create new weather data record."""
        weather = WeatherData(
            time=time,
            location=location,
            temperature=temperature,
            humidity=humidity,
            wind_speed=wind_speed,
            wind_direction=wind_direction,
            pressure=pressure,
            precipitation=precipitation,
            visibility=visibility,
            source=source
        )
        db.add(weather)
        await db.commit()
        await db.refresh(weather)
        return weather
    
    @staticmethod
    async def get_latest_by_location(
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        limit: int = 10
    ) -> List[WeatherData]:
        """Get latest weather data near a location."""
        point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
        
        stmt = select(WeatherData).where(
            ST_DWithin(WeatherData.location, point, radius_km * 1000)
        ).order_by(WeatherData.time.desc()).limit(limit)
        
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_by_time_range(
        db: AsyncSession,
        start_time: datetime,
        end_time: datetime,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: float = 10.0,
        limit: int = 1000
    ) -> List[WeatherData]:
        """Get weather data within time range and optional location."""
        stmt = select(WeatherData).where(
            and_(
                WeatherData.time >= start_time,
                WeatherData.time <= end_time
            )
        )
        
        if latitude is not None and longitude is not None:
            point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
            stmt = stmt.where(
                ST_DWithin(WeatherData.location, point, radius_km * 1000)
            )
        
        stmt = stmt.order_by(WeatherData.time.desc()).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()


class MonitoringStationCRUD:
    """CRUD operations for monitoring stations."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        station_id: str,
        name: str,
        location: WKTElement,
        city: Optional[str] = None,
        state: Optional[str] = None,
        country: str = "India",
        elevation: Optional[float] = None,
        station_type: Optional[str] = None,
        parameters: Optional[List[str]] = None,
        is_active: bool = True
    ) -> MonitoringStation:
        """Create a new monitoring station."""
        station = MonitoringStation(
            station_id=station_id,
            name=name,
            location=location,
            city=city,
            state=state,
            country=country,
            elevation=elevation,
            station_type=station_type,
            parameters=parameters,
            is_active=is_active
        )
        db.add(station)
        await db.commit()
        await db.refresh(station)
        return station
    
    @staticmethod
    async def get_by_id(db: AsyncSession, station_id: str) -> Optional[MonitoringStation]:
        """Get station by station_id."""
        stmt = select(MonitoringStation).where(MonitoringStation.station_id == station_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_uuid(db: AsyncSession, uuid: UUID) -> Optional[MonitoringStation]:
        """Get station by UUID."""
        stmt = select(MonitoringStation).where(MonitoringStation.id == uuid)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(
        db: AsyncSession,
        city: Optional[str] = None,
        state: Optional[str] = None,
        active_only: bool = True,
        limit: int = 100
    ) -> List[MonitoringStation]:
        """Get all monitoring stations with optional filters."""
        stmt = select(MonitoringStation)
        
        conditions = []
        if city:
            conditions.append(MonitoringStation.city.ilike(f"%{city}%"))
        if state:
            conditions.append(MonitoringStation.state.ilike(f"%{state}%"))
        if active_only:
            conditions.append(MonitoringStation.is_active == True)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(MonitoringStation.name).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_near_location(
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        active_only: bool = True,
        limit: int = 20
    ) -> List[MonitoringStation]:
        """Get stations near a location."""
        point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
        
        stmt = select(MonitoringStation).where(
            ST_DWithin(MonitoringStation.location, point, radius_km * 1000)
        )
        
        if active_only:
            stmt = stmt.where(MonitoringStation.is_active == True)
        
        stmt = stmt.order_by(MonitoringStation.name).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def update(
        db: AsyncSession,
        station_id: str,
        **kwargs
    ) -> Optional[MonitoringStation]:
        """Update monitoring station."""
        stmt = update(MonitoringStation).where(
            MonitoringStation.station_id == station_id
        ).values(**kwargs).returning(MonitoringStation)
        
        result = await db.execute(stmt)
        await db.commit()
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete(db: AsyncSession, station_id: str) -> bool:
        """Delete monitoring station."""
        stmt = delete(MonitoringStation).where(MonitoringStation.station_id == station_id)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0


class PredictionCRUD:
    """CRUD operations for predictions."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        time: datetime,
        location: WKTElement,
        forecast_hour: int,
        parameter: str,
        predicted_value: Optional[float] = None,
        confidence_lower: Optional[float] = None,
        confidence_upper: Optional[float] = None,
        model_version: Optional[str] = None,
        aqi_value: Optional[int] = None,
        aqi_category: Optional[str] = None
    ) -> Prediction:
        """Create a new prediction."""
        prediction = Prediction(
            time=time,
            location=location,
            forecast_hour=forecast_hour,
            parameter=parameter,
            predicted_value=predicted_value,
            confidence_lower=confidence_lower,
            confidence_upper=confidence_upper,
            model_version=model_version,
            aqi_value=aqi_value,
            aqi_category=aqi_category
        )
        db.add(prediction)
        await db.commit()
        await db.refresh(prediction)
        return prediction
    
    @staticmethod
    async def get_latest_predictions(
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        parameter: Optional[str] = None,
        max_forecast_hours: int = 24,
        limit: int = 100
    ) -> List[Prediction]:
        """Get latest predictions near a location."""
        point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
        
        stmt = select(Prediction).where(
            and_(
                ST_DWithin(Prediction.location, point, radius_km * 1000),
                Prediction.forecast_hour <= max_forecast_hours
            )
        )
        
        if parameter:
            stmt = stmt.where(Prediction.parameter == parameter)
        
        stmt = stmt.order_by(
            Prediction.time.desc(),
            Prediction.forecast_hour.asc()
        ).limit(limit)
        
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def bulk_create(
        db: AsyncSession,
        predictions: List[Dict[str, Any]]
    ) -> int:
        """Bulk insert predictions."""
        stmt = insert(Prediction).values(predictions)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount


class UserCRUD:
    """CRUD operations for users."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        email: str,
        password_hash: Optional[str] = None,
        full_name: Optional[str] = None,
        role: str = "user"
    ) -> User:
        """Create a new user."""
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email."""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


# Create instances for easy import
air_quality_crud = AirQualityMeasurementCRUD()
weather_crud = WeatherDataCRUD()
station_crud = MonitoringStationCRUD()
prediction_crud = PredictionCRUD()
user_crud = UserCRUD()

# Convenience functions for API endpoints
async def get_latest_air_quality_data(
    db: AsyncSession, 
    coordinates: Tuple[float, float],
    radius_km: float = 10.0
) -> Optional[Dict[str, Any]]:
    """
    Get latest air quality data for a location.
    
    Args:
        db: Database session
        coordinates: (latitude, longitude) tuple
        radius_km: Search radius in kilometers
        
    Returns:
        Dictionary with latest air quality data or None
    """
    latitude, longitude = coordinates
    
    # Get latest measurements for all parameters
    measurements = await AirQualityMeasurementCRUD.get_by_location(
        db, latitude, longitude, radius_km, limit=50
    )
    
    if not measurements:
        return None
    
    # Group by parameter and get the most recent value for each
    latest_data = {}
    for measurement in measurements:
        param = measurement.parameter
        if param not in latest_data or measurement.time > latest_data[param]['timestamp']:
            latest_data[param] = {
                'value': measurement.value,
                'timestamp': measurement.time,
                'station_id': measurement.station_id,
                'quality_flag': measurement.quality_flag
            }
    
    # Calculate AQI if we have PM2.5 data
    aqi_value = 0
    if 'pm25' in latest_data and latest_data['pm25']['value'] is not None:
        from src.utils.aqi_calculator import AQICalculator
        calculator = AQICalculator()
        aqi_result = calculator.calculate_aqi({'pm25': latest_data['pm25']['value']})
        aqi_value = aqi_result[0]  # AQI value
    
    # Prepare result
    result = {
        'coordinates': coordinates,
        'timestamp': max(data['timestamp'] for data in latest_data.values()) if latest_data else None,
        'aqi': aqi_value
    }
    
    # Add pollutant values
    for param, data in latest_data.items():
        result[param] = data['value']
    
    return result


async def get_historical_air_quality_data(
    db: AsyncSession,
    coordinates: Tuple[float, float],
    start_time: datetime,
    end_time: datetime,
    radius_km: float = 10.0
) -> List[Dict[str, Any]]:
    """
    Get historical air quality data for a location and time range.
    
    Args:
        db: Database session
        coordinates: (latitude, longitude) tuple
        start_time: Start of time range
        end_time: End of time range
        radius_km: Search radius in kilometers
        
    Returns:
        List of historical air quality data points
    """
    latitude, longitude = coordinates
    
    # Get measurements within time range and location
    point = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
    
    stmt = select(AirQualityMeasurement).where(
        and_(
            AirQualityMeasurement.time >= start_time,
            AirQualityMeasurement.time <= end_time,
            ST_DWithin(AirQualityMeasurement.location, point, radius_km * 1000)
        )
    ).order_by(AirQualityMeasurement.time.desc())
    
    result = await db.execute(stmt)
    measurements = result.scalars().all()
    
    if not measurements:
        return []
    
    # Group measurements by timestamp
    time_groups = {}
    for measurement in measurements:
        time_key = measurement.time.isoformat()
        if time_key not in time_groups:
            time_groups[time_key] = {
                'timestamp': measurement.time,
                'coordinates': coordinates,
                'measurements': {}
            }
        
        time_groups[time_key]['measurements'][measurement.parameter] = {
            'value': measurement.value,
            'station_id': measurement.station_id,
            'quality_flag': measurement.quality_flag
        }
    
    # Convert to list and calculate AQI for each time point
    historical_data = []
    for time_data in time_groups.values():
        # Calculate AQI if PM2.5 is available
        aqi_value = 0
        if 'pm25' in time_data['measurements'] and time_data['measurements']['pm25']['value'] is not None:
            from src.utils.aqi_calculator import AQICalculator
            calculator = AQICalculator()
            aqi_result = calculator.calculate_aqi({'pm25': time_data['measurements']['pm25']['value']})
            aqi_value = aqi_result[0]
        
        # Prepare data point
        data_point = {
            'timestamp': time_data['timestamp'],
            'coordinates': coordinates,
            'aqi': aqi_value
        }
        
        # Add pollutant values
        for param, measurement in time_data['measurements'].items():
            data_point[param] = measurement['value']
        
        historical_data.append(data_point)
    
    # Sort by timestamp (most recent first)
    historical_data.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return historical_data