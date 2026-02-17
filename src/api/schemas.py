"""
Pydantic schemas for API request/response models.
Defines data validation and serialization for all API endpoints.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum

# Authentication Schemas

class UserRole(str, Enum):
    """User roles for role-based access control."""
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

class UserRegistration(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=200)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Schema for user data in responses."""
    id: UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None

class PasswordChange(BaseModel):
    """Schema for password change."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds

class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str

class AccessTokenResponse(BaseModel):
    """Schema for access token refresh response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800

# Location and Geometry Schemas

class LocationPoint(BaseModel):
    """Schema for geographic point."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class LocationInfo(BaseModel):
    """Schema for location information."""
    coordinates: LocationPoint
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"

# Air Quality Schemas

class PollutantReading(BaseModel):
    """Schema for individual pollutant reading."""
    parameter: str
    value: float
    unit: str
    aqi_value: Optional[int] = None
    category: Optional[str] = None

class WeatherInfo(BaseModel):
    """Schema for weather information."""
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    pressure: Optional[float] = None
    precipitation: Optional[float] = None
    visibility: Optional[float] = None

class SourceAttributionInfo(BaseModel):
    """Schema for source attribution information."""
    vehicular_percent: Optional[float] = None
    industrial_percent: Optional[float] = None
    biomass_percent: Optional[float] = None
    background_percent: Optional[float] = None
    confidence_score: Optional[float] = None

class CurrentForecastResponse(BaseModel):
    """Schema for current forecast response."""
    location: LocationInfo
    timestamp: datetime
    aqi: int
    category: str
    pollutants: Dict[str, PollutantReading]
    weather: WeatherInfo
    source_attribution: SourceAttributionInfo

class HourlyForecast(BaseModel):
    """Schema for hourly forecast data."""
    hour: int
    timestamp: datetime
    aqi: int
    category: str
    pollutants: Dict[str, PollutantReading]
    confidence_lower: Optional[int] = None
    confidence_upper: Optional[int] = None

class ForecastMetadata(BaseModel):
    """Schema for forecast metadata."""
    model_version: str
    generated_at: datetime
    data_sources: List[str]
    confidence_level: float = 0.8

class HourlyForecastResponse(BaseModel):
    """Schema for 24-hour forecast response."""
    location: LocationInfo
    forecasts: List[HourlyForecast]
    metadata: ForecastMetadata

# Spatial Prediction Schemas

class BoundingBox(BaseModel):
    """Schema for geographic bounding box."""
    north: float = Field(..., ge=-90, le=90)
    south: float = Field(..., ge=-90, le=90)
    east: float = Field(..., ge=-180, le=180)
    west: float = Field(..., ge=-180, le=180)
    
    @validator('north')
    def validate_north_south(cls, v, values):
        """Validate north is greater than south."""
        if 'south' in values and v <= values['south']:
            raise ValueError('North boundary must be greater than south boundary')
        return v

class GridPrediction(BaseModel):
    """Schema for spatial grid prediction."""
    coordinates: LocationPoint
    aqi: int
    category: str
    confidence: Optional[float] = None

class SpatialForecastRequest(BaseModel):
    """Schema for spatial forecast request."""
    bounds: BoundingBox
    resolution: float = Field(1.0, gt=0, le=10)  # km resolution
    timestamp: Optional[datetime] = None

class SpatialMetadata(BaseModel):
    """Schema for spatial prediction metadata."""
    resolution_km: float
    grid_points: int
    model_version: str
    generated_at: datetime

class SpatialForecastResponse(BaseModel):
    """Schema for spatial forecast response."""
    grid_predictions: List[GridPrediction]
    metadata: SpatialMetadata

# Alert Schemas

class AlertSubscriptionRequest(BaseModel):
    """Schema for alert subscription request."""
    location: LocationPoint
    location_name: Optional[str] = None
    threshold: int = Field(..., ge=0, le=500)
    channels: List[str] = Field(..., min_items=1)
    
    @validator('channels')
    def validate_channels(cls, v):
        """Validate notification channels."""
        valid_channels = {'email', 'sms', 'push'}
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f'Invalid channel: {channel}. Valid channels: {valid_channels}')
        return v

class AlertSubscriptionResponse(BaseModel):
    """Schema for alert subscription response."""
    id: UUID
    location: LocationPoint
    location_name: Optional[str]
    threshold: int
    channels: List[str]
    is_active: bool
    created_at: datetime

class AlertRecord(BaseModel):
    """Schema for alert history record."""
    id: UUID
    location: LocationPoint
    location_name: Optional[str]
    aqi_value: int
    threshold: int
    message: str
    channels_sent: List[str]
    sent_at: datetime

class PaginationInfo(BaseModel):
    """Schema for pagination information."""
    page: int
    per_page: int
    total: int
    pages: int

class AlertHistoryResponse(BaseModel):
    """Schema for alert history response."""
    alerts: List[AlertRecord]
    pagination: PaginationInfo


# User Alert Preferences Schemas

class UserAlertPreferencesRequest(BaseModel):
    """Schema for updating user alert preferences."""
    default_channels: Optional[List[str]] = Field(None, min_items=1)
    quiet_hours_start: Optional[int] = Field(None, ge=0, le=23)
    quiet_hours_end: Optional[int] = Field(None, ge=0, le=23)
    quiet_hours_enabled: Optional[bool] = None
    max_alerts_per_day: Optional[int] = Field(None, ge=1, le=100)
    min_alert_interval_minutes: Optional[int] = Field(None, ge=5, le=1440)
    alert_on_good: Optional[bool] = None
    alert_on_moderate: Optional[bool] = None
    alert_on_unhealthy_sensitive: Optional[bool] = None
    alert_on_unhealthy: Optional[bool] = None
    alert_on_very_unhealthy: Optional[bool] = None
    alert_on_hazardous: Optional[bool] = None
    enable_daily_digest: Optional[bool] = None
    daily_digest_time: Optional[int] = Field(None, ge=0, le=23)
    
    @validator('default_channels')
    def validate_channels(cls, v):
        """Validate notification channels."""
        if v is not None:
            valid_channels = {'email', 'sms', 'push'}
            for channel in v:
                if channel not in valid_channels:
                    raise ValueError(f'Invalid channel: {channel}. Valid channels: {valid_channels}')
        return v


class UserAlertPreferencesResponse(BaseModel):
    """Schema for user alert preferences response."""
    id: UUID
    user_id: UUID
    default_channels: List[str]
    quiet_hours_start: Optional[int]
    quiet_hours_end: Optional[int]
    quiet_hours_enabled: bool
    max_alerts_per_day: int
    min_alert_interval_minutes: int
    alert_on_good: bool
    alert_on_moderate: bool
    alert_on_unhealthy_sensitive: bool
    alert_on_unhealthy: bool
    alert_on_very_unhealthy: bool
    alert_on_hazardous: bool
    enable_daily_digest: bool
    daily_digest_time: Optional[int]
    created_at: datetime
    updated_at: datetime


# Push Notification Token Schemas

class PushTokenRequest(BaseModel):
    """Schema for registering a push notification token."""
    token: str = Field(..., min_length=10)
    device_type: str = Field(..., pattern="^(ios|android|web)$")
    device_name: Optional[str] = Field(None, max_length=200)


class PushTokenResponse(BaseModel):
    """Schema for push notification token response."""
    id: UUID
    token: str
    device_type: str
    device_name: Optional[str]
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime


# Sensor Device Schemas

class SensorDeviceRequest(BaseModel):
    """Schema for creating/updating a sensor device."""
    device_name: str = Field(..., min_length=1, max_length=200)
    device_id: Optional[str] = Field(None, max_length=100)
    location: Optional[LocationPoint] = None
    location_name: Optional[str] = Field(None, max_length=200)
    device_type: Optional[str] = Field(None, max_length=100)
    firmware_version: Optional[str] = Field(None, max_length=50)


class SensorDeviceResponse(BaseModel):
    """Schema for sensor device response."""
    id: UUID
    device_name: str
    device_id: Optional[str]
    location: Optional[LocationPoint]
    location_name: Optional[str]
    status: str  # connected, disconnected, low_battery
    battery_level: Optional[int]
    last_reading_at: Optional[datetime]
    last_reading_aqi: Optional[int]
    device_type: Optional[str]
    firmware_version: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Attribution and Scenario Analysis Schemas

class PolicyIntervention(BaseModel):
    """Schema for policy intervention in scenario analysis."""
    intervention_type: str  # traffic_reduction, industrial_control, etc.
    magnitude: float = Field(..., ge=0, le=1)  # 0-1 representing percentage
    description: Optional[str] = None

class ScenarioRequest(BaseModel):
    """Schema for scenario analysis request."""
    location: LocationPoint
    interventions: List[PolicyIntervention]
    analysis_period: Optional[int] = Field(24, ge=1, le=168)  # hours

class ScenarioResponse(BaseModel):
    """Schema for scenario analysis response."""
    baseline_aqi: int
    predicted_aqi: int
    impact_percentage: float
    source_changes: Dict[str, float]
    confidence: Optional[float] = None

class AttributionResponse(BaseModel):
    """Schema for source attribution response."""
    location: LocationInfo
    timestamp: datetime
    sources: Dict[str, float]  # source -> contribution percentage
    explanations: Dict[str, Any]  # SHAP explanations
    confidence: float

# Error Schemas

class ErrorDetail(BaseModel):
    """Schema for error details."""
    code: str
    message: str
    details: Optional[str] = None
    timestamp: datetime
    request_id: Optional[str] = None

class ErrorResponse(BaseModel):
    """Schema for error responses."""
    error: ErrorDetail

# Health Check Schema

class HealthCheckResponse(BaseModel):
    """Schema for health check response."""
    status: str
    timestamp: datetime
    version: str
    services: Dict[str, str]  # service_name -> status
    uptime: float  # seconds

# Data Export Schemas

class ExportFormat(str, Enum):
    """Supported export formats."""
    CSV = "csv"
    JSON = "json"
    GEOJSON = "geojson"

class DataExportRequest(BaseModel):
    """Schema for data export request."""
    start_date: datetime
    end_date: datetime
    location: Optional[LocationPoint] = None
    parameters: Optional[List[str]] = None
    format: ExportFormat = ExportFormat.JSON
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        """Validate end date is after start date."""
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v


# Data Lineage and Audit Schemas

class LineageRecordResponse(BaseModel):
    """Schema for data lineage record response."""
    id: str
    event_type: str
    timestamp: str
    source: str
    destination: Optional[str]
    operation: Optional[str]
    record_count: Optional[int]
    success: bool
    error_message: Optional[str]
    metadata: Dict[str, Any]
    session_id: Optional[str]


class LineageChainResponse(BaseModel):
    """Schema for lineage chain response."""
    event_id: str
    chain_length: int
    events: List[Dict[str, Any]]


class LineageSummaryResponse(BaseModel):
    """Schema for lineage summary response."""
    session_id: Optional[str]
    total_events: int
    ingestion_events: int
    validation_events: int
    processing_events: int
    transformation_events: int
    latest_event: Optional[Dict[str, Any]]
    database_events: Optional[Dict[str, int]]
    total_database_events: Optional[int]


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    id: str
    timestamp: str
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    success: bool
    error_message: Optional[str]
    duration_ms: Optional[int]


class UserActivitySummaryResponse(BaseModel):
    """Schema for user activity summary response."""
    user_id: str
    period_days: int
    total_actions: int
    actions_by_type: Dict[str, int]
    resources_accessed: Dict[str, int]
    failed_actions: int
