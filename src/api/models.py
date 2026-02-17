"""
SQLAlchemy ORM models for AQI Predictor database.
Defines all database entities with proper relationships and constraints.
"""

from datetime import datetime, date
from typing import List, Optional
from uuid import UUID, uuid4
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, Text, 
    ForeignKey, ARRAY, Index, text, Date
)
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from geoalchemy2 import Geometry
from geoalchemy2.types import Geography

from src.api.database import Base


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        onupdate=text("NOW()"),
        nullable=False
    )


class AirQualityMeasurement(Base):
    """Air quality measurements from monitoring stations."""
    __tablename__ = "air_quality_measurements"
    
    # Primary key is composite (time, station_id, parameter) for TimescaleDB
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        primary_key=True,
        nullable=False
    )
    station_id: Mapped[str] = mapped_column(String(50), primary_key=True, nullable=False)
    parameter: Mapped[str] = mapped_column(String(20), primary_key=True, nullable=False)
    
    value: Mapped[Optional[float]] = mapped_column(Float)
    unit: Mapped[Optional[str]] = mapped_column(String(20))
    quality_flag: Mapped[str] = mapped_column(String(20), default="valid")
    source: Mapped[Optional[str]] = mapped_column(String(100))
    location: Mapped[Optional[str]] = mapped_column(Geometry("POINT", srid=4326))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_aq_station_time", "station_id", "time"),
        Index("idx_aq_location", "location", postgresql_using="gist"),
        Index("idx_aq_parameter", "parameter"),
    )


class WeatherData(Base):
    """Weather data from meteorological sources."""
    __tablename__ = "weather_data"
    
    # Primary key is composite (time, location) for TimescaleDB
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        primary_key=True,
        nullable=False
    )
    location: Mapped[str] = mapped_column(
        Geometry("POINT", srid=4326), 
        primary_key=True,
        nullable=False
    )
    
    temperature: Mapped[Optional[float]] = mapped_column(Float)
    humidity: Mapped[Optional[float]] = mapped_column(Float)
    wind_speed: Mapped[Optional[float]] = mapped_column(Float)
    wind_direction: Mapped[Optional[float]] = mapped_column(Float)
    pressure: Mapped[Optional[float]] = mapped_column(Float)
    precipitation: Mapped[Optional[float]] = mapped_column(Float)
    visibility: Mapped[Optional[float]] = mapped_column(Float)
    source: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_weather_location", "location", postgresql_using="gist"),
        Index("idx_weather_time", "time"),
    )


class Prediction(Base):
    """ML model predictions for air quality forecasts."""
    __tablename__ = "predictions"
    
    # Primary key is composite for TimescaleDB
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        primary_key=True,
        nullable=False
    )
    location: Mapped[str] = mapped_column(
        Geometry("POINT", srid=4326), 
        primary_key=True,
        nullable=False
    )
    forecast_hour: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    parameter: Mapped[str] = mapped_column(String(20), primary_key=True, nullable=False)
    
    predicted_value: Mapped[Optional[float]] = mapped_column(Float)
    confidence_lower: Mapped[Optional[float]] = mapped_column(Float)
    confidence_upper: Mapped[Optional[float]] = mapped_column(Float)
    model_version: Mapped[Optional[str]] = mapped_column(String(50))
    aqi_value: Mapped[Optional[int]] = mapped_column(Integer)
    aqi_category: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_predictions_forecast_time", "forecast_hour", "time"),
        Index("idx_predictions_location", "location", postgresql_using="gist"),
        Index("idx_predictions_parameter", "parameter"),
    )


class MonitoringStation(Base, TimestampMixin):
    """Air quality monitoring stations."""
    __tablename__ = "monitoring_stations"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    station_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    city_code: Mapped[Optional[str]] = mapped_column(
        String(20),
        ForeignKey("city_configurations.city_code", ondelete="SET NULL")
    )
    state: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="India")
    elevation: Mapped[Optional[float]] = mapped_column(Float)
    station_type: Mapped[Optional[str]] = mapped_column(String(50))
    parameters: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    city_config: Mapped[Optional["CityConfiguration"]] = relationship(
        "CityConfiguration",
        back_populates="stations",
        foreign_keys=[city_code]
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_stations_location", "location", postgresql_using="gist"),
        Index("idx_stations_city", "city"),
        Index("idx_stations_city_code", "city_code"),
        Index("idx_stations_active", "is_active"),
    )


class User(Base, TimestampMixin):
    """User accounts for authentication and preferences."""
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(Text)
    full_name: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(50), default="user")
    
    # Relationships
    alert_subscriptions: Mapped[List["AlertSubscription"]] = relationship(
        "AlertSubscription", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    alert_preferences: Mapped[Optional["UserAlertPreferences"]] = relationship(
        "UserAlertPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    push_tokens: Mapped[List["PushNotificationToken"]] = relationship(
        "PushNotificationToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    sensor_devices: Mapped[List["SensorDevice"]] = relationship(
        "SensorDevice",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_active", "is_active"),
    )


class AlertSubscription(Base, TimestampMixin):
    """User alert subscriptions for air quality notifications."""
    __tablename__ = "alert_subscriptions"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    location_name: Mapped[Optional[str]] = mapped_column(String(200))
    threshold_value: Mapped[int] = mapped_column(Integer, nullable=False)
    notification_channels: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="alert_subscriptions")
    alert_history: Mapped[List["AlertHistory"]] = relationship(
        "AlertHistory", 
        back_populates="subscription",
        cascade="all, delete-orphan"
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_alerts_user", "user_id"),
        Index("idx_alerts_location", "location", postgresql_using="gist"),
        Index("idx_alerts_active", "is_active"),
    )


class AlertHistory(Base, TimestampMixin):
    """History of sent alert notifications."""
    __tablename__ = "alert_history"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    subscription_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("alert_subscriptions.id", ondelete="CASCADE"),
        nullable=False
    )
    aqi_value: Mapped[int] = mapped_column(Integer, nullable=False)
    threshold_value: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    channels_sent: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    channels_failed: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivery_status: Mapped[str] = mapped_column(String(50), default="sent")  # sent, delivered, failed
    
    # Relationships
    subscription: Mapped["AlertSubscription"] = relationship("AlertSubscription", back_populates="alert_history")
    
    # Indexes
    __table_args__ = (
        Index("idx_alert_history_subscription", "subscription_id"),
        Index("idx_alert_history_sent_at", "sent_at"),
        Index("idx_alert_history_status", "delivery_status"),
    )


class UserAlertPreferences(Base, TimestampMixin):
    """User preferences for alert notifications."""
    __tablename__ = "user_alert_preferences"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    
    # Notification preferences
    default_channels: Mapped[List[str]] = mapped_column(
        ARRAY(String), 
        default=["email"],
        nullable=False
    )
    quiet_hours_start: Mapped[Optional[int]] = mapped_column(Integer)  # Hour 0-23
    quiet_hours_end: Mapped[Optional[int]] = mapped_column(Integer)  # Hour 0-23
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Rate limiting
    max_alerts_per_day: Mapped[int] = mapped_column(Integer, default=10)
    min_alert_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    
    # Alert severity preferences
    alert_on_good: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_on_moderate: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_on_unhealthy_sensitive: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_on_unhealthy: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_on_very_unhealthy: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_on_hazardous: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Digest preferences
    enable_daily_digest: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_digest_time: Mapped[Optional[int]] = mapped_column(Integer)  # Hour 0-23
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="alert_preferences")
    
    # Indexes
    __table_args__ = (
        Index("idx_alert_prefs_user", "user_id"),
    )


class PushNotificationToken(Base, TimestampMixin):
    """Push notification device tokens for users."""
    __tablename__ = "push_notification_tokens"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ios, android, web
    device_name: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="push_tokens")
    
    # Indexes
    __table_args__ = (
        Index("idx_push_tokens_user", "user_id"),
        Index("idx_push_tokens_token", "token"),
        Index("idx_push_tokens_active", "is_active"),
    )



class SourceAttribution(Base):
    """Source attribution data for pollution sources."""
    __tablename__ = "source_attributions"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    vehicular_percent: Mapped[Optional[float]] = mapped_column(Float)
    industrial_percent: Mapped[Optional[float]] = mapped_column(Float)
    biomass_percent: Mapped[Optional[float]] = mapped_column(Float)
    background_percent: Mapped[Optional[float]] = mapped_column(Float)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)
    model_version: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_attribution_location", "location", postgresql_using="gist"),
        Index("idx_attribution_timestamp", "timestamp"),
    )


class DataQualityFlag(Base, TimestampMixin):
    """Data quality flags and validation results."""
    __tablename__ = "data_quality_flags"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    measurement_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    station_id: Mapped[str] = mapped_column(String(50), nullable=False)
    parameter: Mapped[str] = mapped_column(String(20), nullable=False)
    flag_type: Mapped[str] = mapped_column(String(50), nullable=False)  # outlier, missing, invalid
    flag_reason: Mapped[Optional[str]] = mapped_column(Text)
    original_value: Mapped[Optional[float]] = mapped_column(Float)
    corrected_value: Mapped[Optional[float]] = mapped_column(Float)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    
    # Indexes
    __table_args__ = (
        Index("idx_quality_station_time", "station_id", "measurement_time"),
        Index("idx_quality_flag_type", "flag_type"),
    )


class ModelMetadata(Base, TimestampMixin):
    """Metadata for ML models and versions."""
    __tablename__ = "model_metadata"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)  # xgboost, lstm, gnn, ensemble
    parameters: Mapped[Optional[dict]] = mapped_column(Text)  # JSON string
    training_data_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    training_data_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    validation_rmse: Mapped[Optional[float]] = mapped_column(Float)
    validation_mae: Mapped[Optional[float]] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Indexes
    __table_args__ = (
        Index("idx_model_name_version", "model_name", "model_version"),
        Index("idx_model_active", "is_active"),
    )


class DataLineageRecord(Base, TimestampMixin):
    """Data lineage tracking for audit and provenance."""
    __tablename__ = "data_lineage_records"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ingestion, validation, processing, transformation
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(String(200), nullable=False)  # Data source identifier
    destination: Mapped[Optional[str]] = mapped_column(String(200))  # Destination identifier
    operation: Mapped[Optional[str]] = mapped_column(String(100))  # Specific operation performed
    record_count: Mapped[Optional[int]] = mapped_column(Integer)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    event_metadata: Mapped[Optional[str]] = mapped_column(Text)  # JSON string with additional details
    user_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True))
    session_id: Mapped[Optional[str]] = mapped_column(String(100))
    parent_event_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("data_lineage_records.id", ondelete="SET NULL")
    )
    
    # Relationships
    parent_event: Mapped[Optional["DataLineageRecord"]] = relationship(
        "DataLineageRecord",
        remote_side=[id],
        backref="child_events"
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_lineage_event_type", "event_type"),
        Index("idx_lineage_timestamp", "event_timestamp"),
        Index("idx_lineage_source", "source"),
        Index("idx_lineage_session", "session_id"),
        Index("idx_lineage_parent", "parent_event_id"),
    )


class AuditLog(Base, TimestampMixin):
    """Audit log for security and compliance."""
    __tablename__ = "audit_logs"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True))
    user_email: Mapped[Optional[str]] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # read, write, update, delete, login, logout
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)  # user, station, measurement, prediction
    resource_id: Mapped[Optional[str]] = mapped_column(String(200))
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    request_data: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    response_data: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Indexes
    __table_args__ = (
        Index("idx_audit_timestamp", "timestamp"),
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
    )


class CityConfiguration(Base, TimestampMixin):
    """City-specific configurations for multi-city support."""
    __tablename__ = "city_configurations"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    city_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    city_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    state: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="India")
    center_location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    bounding_box: Mapped[Optional[str]] = mapped_column(Geometry("POLYGON", srid=4326))
    population: Mapped[Optional[int]] = mapped_column(Integer)
    area_sq_km: Mapped[Optional[float]] = mapped_column(Float)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    model_config: Mapped[Optional[dict]] = mapped_column(Text)  # JSON string
    data_sources: Mapped[Optional[dict]] = mapped_column(Text)  # JSON string
    alert_thresholds: Mapped[Optional[dict]] = mapped_column(Text)  # JSON string
    city_metadata: Mapped[Optional[dict]] = mapped_column(Text)  # JSON string
    
    # Relationships
    stations: Mapped[List["MonitoringStation"]] = relationship(
        "MonitoringStation",
        back_populates="city_config"
    )
    statistics: Mapped[List["CityStatistics"]] = relationship(
        "CityStatistics",
        back_populates="city",
        cascade="all, delete-orphan"
    )
    
    # Indexes
    __table_args__ = (
        Index("idx_city_config_name", "city_name"),
        Index("idx_city_config_code", "city_code"),
        Index("idx_city_config_active", "is_active"),
        Index("idx_city_config_priority", "priority"),
        Index("idx_city_config_location", "center_location", postgresql_using="gist"),
        Index("idx_city_config_bbox", "bounding_box", postgresql_using="gist"),
    )


class CityStatistics(Base, TimestampMixin):
    """Daily statistics for cities for comparative analysis."""
    __tablename__ = "city_statistics"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    city_code: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("city_configurations.city_code", ondelete="CASCADE"),
        nullable=False
    )
    date: Mapped[date] = mapped_column(Date(), nullable=False)
    avg_aqi: Mapped[Optional[float]] = mapped_column(Float)
    max_aqi: Mapped[Optional[float]] = mapped_column(Float)
    min_aqi: Mapped[Optional[float]] = mapped_column(Float)
    avg_pm25: Mapped[Optional[float]] = mapped_column(Float)
    avg_pm10: Mapped[Optional[float]] = mapped_column(Float)
    avg_no2: Mapped[Optional[float]] = mapped_column(Float)
    avg_o3: Mapped[Optional[float]] = mapped_column(Float)
    avg_so2: Mapped[Optional[float]] = mapped_column(Float)
    avg_co: Mapped[Optional[float]] = mapped_column(Float)
    good_hours: Mapped[Optional[int]] = mapped_column(Integer)
    moderate_hours: Mapped[Optional[int]] = mapped_column(Integer)
    unhealthy_hours: Mapped[Optional[int]] = mapped_column(Integer)
    data_completeness: Mapped[Optional[float]] = mapped_column(Float)
    
    # Relationships
    city: Mapped["CityConfiguration"] = relationship("CityConfiguration", back_populates="statistics")
    
    # Indexes
    __table_args__ = (
        Index("idx_city_stats_city_date", "city_code", "date"),
        Index("idx_city_stats_date", "date"),
    )


class SensorDevice(Base, TimestampMixin):
    """User-connected air quality sensor devices."""
    __tablename__ = "sensor_devices"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    device_name: Mapped[str] = mapped_column(String(200), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True)  # External device identifier
    location: Mapped[Optional[str]] = mapped_column(Geometry("POINT", srid=4326))
    location_name: Mapped[Optional[str]] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(
        String(50), 
        default="connected",
        nullable=False
    )  # connected, disconnected, low_battery
    battery_level: Mapped[Optional[int]] = mapped_column(Integer)  # 0-100
    last_reading_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_reading_aqi: Mapped[Optional[int]] = mapped_column(Integer)
    device_type: Mapped[Optional[str]] = mapped_column(String(100))  # Model/type of sensor
    firmware_version: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sensor_devices")
    
    # Indexes
    __table_args__ = (
        Index("idx_devices_user", "user_id"),
        Index("idx_devices_status", "status"),
        Index("idx_devices_active", "is_active"),
        Index("idx_devices_location", "location", postgresql_using="gist"),
    )