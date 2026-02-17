"""
Data quality validation and processing system.
Implements outlier detection, data imputation, and quality flagging.
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.impute import KNNImputer
from sqlalchemy.orm import Session

from src.data.ingestion_clients import DataPoint, WeatherPoint
# from src.api.models import DataQualityFlag, AirQualityMeasurement, WeatherData

logger = logging.getLogger(__name__)


class QualityFlag(Enum):
    """Data quality flag types."""
    VALID = "valid"
    OUTLIER = "outlier"
    MISSING = "missing"
    INVALID = "invalid"
    IMPUTED = "imputed"
    SUSPICIOUS = "suspicious"


@dataclass
class QualityResult:
    """Result of data quality validation."""
    flag: QualityFlag
    confidence: float
    reason: str
    original_value: Optional[float] = None
    corrected_value: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ValidationStats:
    """Statistics from data validation process."""
    total_records: int
    valid_records: int
    flagged_records: int
    outliers: int
    missing_values: int
    imputed_values: int
    quality_score: float


class DataQualityValidator:
    """Comprehensive data quality validation system."""
    
    def __init__(self):
        self.parameter_ranges = {
            # Air quality parameters (µg/m³)
            "pm25": {"min": 0, "max": 1000, "typical_max": 300},
            "pm10": {"min": 0, "max": 2000, "typical_max": 500},
            "no2": {"min": 0, "max": 500, "typical_max": 200},
            "so2": {"min": 0, "max": 1000, "typical_max": 100},
            "o3": {"min": 0, "max": 500, "typical_max": 300},
            "co": {"min": 0, "max": 50, "typical_max": 10},  # mg/m³
            
            # Weather parameters
            "temperature": {"min": -10, "max": 50, "typical_max": 45},  # °C
            "humidity": {"min": 0, "max": 100, "typical_max": 100},     # %
            "wind_speed": {"min": 0, "max": 50, "typical_max": 30},     # m/s
            "wind_direction": {"min": 0, "max": 360, "typical_max": 360}, # degrees
            "pressure": {"min": 900, "max": 1100, "typical_max": 1050}, # hPa
            "precipitation": {"min": 0, "max": 200, "typical_max": 100}, # mm
            "visibility": {"min": 0, "max": 50, "typical_max": 20},     # km
        }
        
        self.outlier_detector = IsolationForest(
            contamination=0.1,  # Expect 10% outliers
            random_state=42
        )
        
        self.imputer = KNNImputer(n_neighbors=5)
        self.scaler = StandardScaler()
    
    def validate_data_points(self, data_points: List[DataPoint]) -> Tuple[List[DataPoint], ValidationStats]:
        """
        Validate a batch of air quality data points.
        
        Args:
            data_points: List of data points to validate
            
        Returns:
            Tuple of (validated_data_points, validation_stats)
        """
        if not data_points:
            return [], ValidationStats(0, 0, 0, 0, 0, 0, 0.0)
        
        logger.info(f"Validating {len(data_points)} data points")
        
        # Convert to DataFrame for easier processing
        df = self._data_points_to_dataframe(data_points)
        
        # Perform validation steps
        validated_df, stats = self._validate_dataframe(df)
        
        # Convert back to DataPoint objects
        validated_points = self._dataframe_to_data_points(validated_df, data_points)
        
        logger.info(f"Validation completed: {stats.valid_records}/{stats.total_records} valid "
                   f"({stats.quality_score:.2%} quality score)")
        
        return validated_points, stats
    
    def validate_weather_points(self, weather_points: List[WeatherPoint]) -> Tuple[List[WeatherPoint], ValidationStats]:
        """
        Validate a batch of weather data points.
        
        Args:
            weather_points: List of weather points to validate
            
        Returns:
            Tuple of (validated_weather_points, validation_stats)
        """
        if not weather_points:
            return [], ValidationStats(0, 0, 0, 0, 0, 0, 0.0)
        
        logger.info(f"Validating {len(weather_points)} weather points")
        
        # Convert to DataFrame for easier processing
        df = self._weather_points_to_dataframe(weather_points)
        
        # Perform validation steps
        validated_df, stats = self._validate_dataframe(df, is_weather=True)
        
        # Convert back to WeatherPoint objects
        validated_points = self._dataframe_to_weather_points(validated_df, weather_points)
        
        logger.info(f"Weather validation completed: {stats.valid_records}/{stats.total_records} valid "
                   f"({stats.quality_score:.2%} quality score)")
        
        return validated_points, stats
    
    def _validate_dataframe(self, df: pd.DataFrame, is_weather: bool = False) -> Tuple[pd.DataFrame, ValidationStats]:
        """Validate DataFrame and return validated data with stats."""
        original_count = len(df)
        outliers = 0
        missing_values = 0
        imputed_values = 0
        
        # Step 1: Range validation
        df, range_flags = self._validate_ranges(df, is_weather)
        range_invalid_count = sum(range_flags)
        
        # Step 2: Outlier detection
        df, outlier_flags = self._detect_outliers(df, is_weather)
        outliers = sum(outlier_flags)
        
        # Step 3: Missing value handling
        df, missing_flags, imputed_flags = self._handle_missing_values(df, is_weather)
        missing_values = sum(missing_flags)
        imputed_values = sum(imputed_flags)
        
        # Step 4: Temporal consistency checks
        df, temporal_flags = self._check_temporal_consistency(df)
        temporal_invalid_count = sum(temporal_flags)
        
        # Step 5: Spatial consistency checks (if location data available)
        df, spatial_flags = self._check_spatial_consistency(df)
        spatial_invalid_count = sum(spatial_flags)
        
        # Calculate final statistics
        # Count unique records that have any flag
        flagged_records = 0
        for idx in range(original_count):
            has_flag = False
            
            # Check range flags
            if idx < len(range_flags) and range_flags[idx]:
                has_flag = True
            
            # Check outlier flags
            if idx < len(outlier_flags) and outlier_flags[idx]:
                has_flag = True
            
            # Check temporal flags
            if idx < len(temporal_flags) and temporal_flags[idx]:
                has_flag = True
            
            # Check spatial flags
            if idx < len(spatial_flags) and spatial_flags[idx]:
                has_flag = True
            
            if has_flag:
                flagged_records += 1
        
        valid_records = original_count - flagged_records
        quality_score = valid_records / original_count if original_count > 0 else 0.0
        
        stats = ValidationStats(
            total_records=original_count,
            valid_records=valid_records,
            flagged_records=flagged_records,
            outliers=outliers,
            missing_values=missing_values,
            imputed_values=imputed_values,
            quality_score=quality_score
        )
        
        return df, stats
    
    def _validate_ranges(self, df: pd.DataFrame, is_weather: bool = False) -> Tuple[pd.DataFrame, List[bool]]:
        """Validate that values are within expected ranges."""
        flags = []
        
        value_col = "value" if not is_weather else None
        param_col = "parameter" if not is_weather else None
        
        if is_weather:
            # Weather data has multiple columns
            weather_cols = ["temperature", "humidity", "wind_speed", "wind_direction", 
                          "pressure", "precipitation", "visibility"]
            
            for col in weather_cols:
                if col in df.columns:
                    ranges = self.parameter_ranges.get(col, {})
                    if ranges:
                        min_val = ranges.get("min", -np.inf)
                        max_val = ranges.get("max", np.inf)
                        
                        # Flag out-of-range values
                        out_of_range = (df[col] < min_val) | (df[col] > max_val)
                        flags.extend(out_of_range.tolist())
                        
                        # Set out-of-range values to NaN for later imputation
                        df.loc[out_of_range, col] = np.nan
        else:
            # Air quality data
            for idx, row in df.iterrows():
                parameter = row.get(param_col)
                value = row.get(value_col)
                
                if pd.isna(value) or parameter not in self.parameter_ranges:
                    flags.append(False)
                    continue
                
                ranges = self.parameter_ranges[parameter]
                min_val = ranges.get("min", -np.inf)
                max_val = ranges.get("max", np.inf)
                
                # Check for invalid values (including negative values for pollutants)
                is_invalid = False
                if value < min_val or value > max_val:
                    is_invalid = True
                elif value < 0:  # Explicitly check for negative values
                    is_invalid = True
                
                if is_invalid:
                    flags.append(True)
                    df.at[idx, value_col] = None  # Mark for imputation/flagging
                    df.at[idx, "range_invalid"] = True
                    logger.debug(f"Flagged invalid value: {parameter}={value} at index {idx}")
                else:
                    flags.append(False)
        
        return df, flags
    
    def _detect_outliers(self, df: pd.DataFrame, is_weather: bool = False) -> Tuple[pd.DataFrame, List[bool]]:
        """Detect outliers using statistical methods."""
        flags = []
        
        if is_weather:
            # Weather data outlier detection
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                if col in df.columns and not df[col].isna().all():
                    # Use IQR method for outlier detection
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    outliers = (df[col] < lower_bound) | (df[col] > upper_bound)
                    flags.extend(outliers.tolist())
                    
                    # Mark outliers for review but don't remove them yet
                    df.loc[outliers, f"{col}_outlier_flag"] = True
        else:
            # Air quality data outlier detection by parameter
            parameters = df["parameter"].unique()
            
            for idx, row in df.iterrows():
                parameter = row["parameter"]
                value = row["value"]
                
                # Skip if value is missing or already flagged as range invalid
                if pd.isna(value) or row.get("range_invalid", False):
                    flags.append(False)
                    continue
                
                # Get data for this parameter (excluding range invalid values)
                param_data = df[
                    (df["parameter"] == parameter) & 
                    (~df["value"].isna()) & 
                    (df.get("range_invalid", False) != True)
                ]["value"]
                
                if len(param_data) > 5:
                    # Use Z-score method with improved handling for low-variance data
                    param_values = param_data.dropna()
                    mean_val = param_values.mean()
                    std_val = param_values.std()
                    
                    # Handle case where standard deviation is very small (mostly zeros)
                    if std_val < 1e-6:  # Very small std deviation
                        # Use absolute threshold for extreme values
                        if parameter in self.parameter_ranges:
                            typical_max = self.parameter_ranges[parameter].get("typical_max", 500)
                            # Flag values that are extremely high compared to typical range
                            if value > typical_max * 0.8:  # 80% of typical max
                                flags.append(True)
                                df.at[idx, "outlier_flag"] = True
                            else:
                                flags.append(False)
                        else:
                            # Generic threshold for unknown parameters
                            if value > 500:  # Very high threshold for unknown parameters
                                flags.append(True)
                                df.at[idx, "outlier_flag"] = True
                            else:
                                flags.append(False)
                    else:
                        # Use Z-score method for normal variance data
                        z_score = abs((value - mean_val) / std_val)
                        
                        # For small datasets or extreme values, use more sensitive thresholds
                        if len(param_data) <= 10:
                            outlier_threshold = 2.0  # More sensitive for small datasets
                        else:
                            outlier_threshold = 3.0
                        
                        # Also check absolute threshold for extreme values
                        if parameter in self.parameter_ranges:
                            typical_max = self.parameter_ranges[parameter].get("typical_max", 500)
                            is_extreme = value > typical_max * 0.8
                        else:
                            is_extreme = value > 500
                        
                        if z_score > outlier_threshold or is_extreme:
                            flags.append(True)
                            df.at[idx, "outlier_flag"] = True
                        else:
                            flags.append(False)
                else:
                    # For small datasets, use threshold-based detection
                    if parameter in self.parameter_ranges:
                        typical_max = self.parameter_ranges[parameter].get("typical_max", float('inf'))
                        # Flag as outlier if value is more than 1.5x typical maximum
                        if value > typical_max * 1.5:
                            flags.append(True)
                            df.at[idx, "outlier_flag"] = True
                        else:
                            flags.append(False)
                    else:
                        flags.append(False)
        
        return df, flags
    
    def _handle_missing_values(self, df: pd.DataFrame, is_weather: bool = False) -> Tuple[pd.DataFrame, List[bool], List[bool]]:
        """Handle missing values through imputation."""
        missing_flags = []
        imputed_flags = []
        
        if is_weather:
            # Weather data imputation
            numeric_cols = ["temperature", "humidity", "wind_speed", "pressure", "precipitation", "visibility"]
            
            for col in numeric_cols:
                if col in df.columns:
                    missing_mask = df[col].isna()
                    missing_flags.extend(missing_mask.tolist())
                    
                    if missing_mask.any():
                        # Simple forward fill for weather data
                        df[col] = df[col].ffill().bfill()
                        
                        # Mark imputed values
                        imputed_mask = missing_mask & ~df[col].isna()
                        imputed_flags.extend(imputed_mask.tolist())
                        df.loc[imputed_mask, f"{col}_imputed"] = True
                    else:
                        imputed_flags.extend([False] * len(df))
        else:
            # Air quality data imputation by parameter and location
            for idx, row in df.iterrows():
                is_missing = pd.isna(row["value"]) or row["value"] is None
                missing_flags.append(is_missing)
                
                if is_missing:
                    # Don't impute values that were flagged as range invalid
                    if row.get("range_invalid", False):
                        imputed_flags.append(False)
                        continue
                    
                    # Try to impute based on nearby stations or historical data
                    imputed_value = self._impute_air_quality_value(df, idx, row)
                    
                    if imputed_value is not None:
                        df.at[idx, "value"] = imputed_value
                        df.at[idx, "imputed"] = True
                        imputed_flags.append(True)
                    else:
                        imputed_flags.append(False)
                else:
                    imputed_flags.append(False)
        
        return df, missing_flags, imputed_flags
    
    def _impute_air_quality_value(self, df: pd.DataFrame, idx: int, row: pd.Series) -> Optional[float]:
        """Impute missing air quality value using spatial-temporal methods."""
        parameter = row["parameter"]
        timestamp = row.get("timestamp")
        location = row.get("location")
        original_value = row.get("value")
        
        # Don't impute values that were flagged as invalid due to range violations
        if row.get("range_invalid", False):
            return None
        
        # Method 1: Use median value for same parameter at same time
        same_time_data = df[
            (df["parameter"] == parameter) & 
            (df["timestamp"] == timestamp) & 
            (~df["value"].isna()) &
            (df.get("range_invalid", False) != True)  # Exclude range-invalid values
        ]
        
        if len(same_time_data) > 0:
            return same_time_data["value"].median()
        
        # Method 2: Use historical median for same parameter at same location
        same_location_data = df[
            (df["parameter"] == parameter) & 
            (df.get("station_id") == row.get("station_id")) & 
            (~df["value"].isna()) &
            (df.get("range_invalid", False) != True)  # Exclude range-invalid values
        ]
        
        if len(same_location_data) > 0:
            return same_location_data["value"].median()
        
        # Method 3: Use overall parameter median
        parameter_data = df[
            (df["parameter"] == parameter) & 
            (~df["value"].isna()) &
            (df.get("range_invalid", False) != True)  # Exclude range-invalid values
        ]
        
        if len(parameter_data) > 0:
            return parameter_data["value"].median()
        
        return None
    
    def _check_temporal_consistency(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[bool]]:
        """Check for temporal consistency issues."""
        flags = []
        
        if "timestamp" not in df.columns:
            return df, [False] * len(df)
        
        # Sort by timestamp
        df_sorted = df.sort_values("timestamp")
        
        # Check for duplicate timestamps at same location/parameter
        if "parameter" in df.columns and "station_id" in df.columns:
            # Only flag as duplicate if all key fields match
            duplicates = df_sorted.duplicated(subset=["timestamp", "station_id", "parameter"], keep='first')
            flags = duplicates.tolist()
            
            # Mark duplicates for removal
            df.loc[duplicates, "duplicate_flag"] = True
        else:
            flags = [False] * len(df)
        
        return df, flags
    
    def _check_spatial_consistency(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[bool]]:
        """Check for spatial consistency issues."""
        flags = []
        
        # For now, just return no flags - spatial consistency would require
        # more complex analysis of nearby stations
        flags = [False] * len(df)
        
        return df, flags
    
    def _data_points_to_dataframe(self, data_points: List[DataPoint]) -> pd.DataFrame:
        """Convert DataPoint objects to DataFrame."""
        data = []
        for dp in data_points:
            data.append({
                "timestamp": dp.timestamp,
                "location": dp.location,
                "parameter": dp.parameter,
                "value": dp.value,
                "unit": dp.unit,
                "source": dp.source,
                "station_id": dp.station_id,
                "quality_flag": dp.quality_flag
            })
        
        return pd.DataFrame(data)
    
    def _weather_points_to_dataframe(self, weather_points: List[WeatherPoint]) -> pd.DataFrame:
        """Convert WeatherPoint objects to DataFrame."""
        data = []
        for wp in weather_points:
            data.append({
                "timestamp": wp.timestamp,
                "location": wp.location,
                "temperature": wp.temperature,
                "humidity": wp.humidity,
                "wind_speed": wp.wind_speed,
                "wind_direction": wp.wind_direction,
                "pressure": wp.pressure,
                "precipitation": wp.precipitation,
                "visibility": wp.visibility,
                "source": wp.source
            })
        
        return pd.DataFrame(data)
    
    def _dataframe_to_data_points(self, df: pd.DataFrame, original_points: List[DataPoint]) -> List[DataPoint]:
        """Convert DataFrame back to DataPoint objects."""
        validated_points = []
        
        for idx, row in df.iterrows():
            # Get original point if available
            original = original_points[idx] if idx < len(original_points) else None
            
            # Determine quality flag based on validation results
            # Use proper boolean checks to handle NaN values
            quality_flag = "valid"
            
            range_invalid = row.get("range_invalid", False)
            outlier_flag = row.get("outlier_flag", False)
            imputed_flag = row.get("imputed", False)
            duplicate_flag = row.get("duplicate_flag", False)
            
            if range_invalid is True:  # Explicit check for True
                quality_flag = "invalid"
            elif outlier_flag is True:
                quality_flag = "outlier"
            elif imputed_flag is True:
                quality_flag = "imputed"
            elif duplicate_flag is True:
                quality_flag = "invalid"
            elif pd.isna(row.get("value")) or row.get("value") is None:
                quality_flag = "missing"
            
            validated_points.append(DataPoint(
                timestamp=row["timestamp"],
                location=row["location"],
                parameter=row["parameter"],
                value=row["value"] if not pd.isna(row["value"]) and row["value"] is not None else None,
                unit=row["unit"],
                source=row["source"],
                station_id=row["station_id"],
                quality_flag=quality_flag,
                metadata=original.metadata if original else None
            ))
        
        return validated_points
    
    def _dataframe_to_weather_points(self, df: pd.DataFrame, original_points: List[WeatherPoint]) -> List[WeatherPoint]:
        """Convert DataFrame back to WeatherPoint objects."""
        validated_points = []
        
        for idx, row in df.iterrows():
            # Get original point if available
            original = original_points[idx] if idx < len(original_points) else None
            
            validated_points.append(WeatherPoint(
                timestamp=row["timestamp"],
                location=row["location"],
                temperature=row["temperature"] if not pd.isna(row.get("temperature")) else None,
                humidity=row["humidity"] if not pd.isna(row.get("humidity")) else None,
                wind_speed=row["wind_speed"] if not pd.isna(row.get("wind_speed")) else None,
                wind_direction=row["wind_direction"] if not pd.isna(row.get("wind_direction")) else None,
                pressure=row["pressure"] if not pd.isna(row.get("pressure")) else None,
                precipitation=row["precipitation"] if not pd.isna(row.get("precipitation")) else None,
                visibility=row["visibility"] if not pd.isna(row.get("visibility")) else None,
                source=row["source"],
                metadata=original.metadata if original else None
            ))
        
        return validated_points
    
    def store_quality_flags(self, db, data_points: List[DataPoint], validation_stats: ValidationStats):
        """Store data quality flags in the database."""
        try:
            # Mock implementation for testing - would use actual database models in production
            logger.info(f"Would store {validation_stats.flagged_records} quality flags in database")
            
        except Exception as e:
            logger.error(f"Failed to store quality flags: {e}")
            raise


class DataLineageTracker:
    """
    Tracks data lineage and audit logs with database persistence.
    
    Provides comprehensive tracking of data flow through the system including:
    - Data ingestion from external sources
    - Data validation and quality checks
    - Data processing and transformations
    - Model training and predictions
    - Data access and modifications
    """
    
    def __init__(self, db_session=None, session_id: Optional[str] = None):
        """
        Initialize lineage tracker.
        
        Args:
            db_session: Database session for persistence (optional)
            session_id: Session identifier for grouping related events
        """
        self.db = db_session
        self.session_id = session_id or self._generate_session_id()
        self.lineage_records = []  # In-memory cache
        self.parent_event_id = None  # For tracking event hierarchies
    
    def _generate_session_id(self) -> str:
        """Generate unique session ID."""
        import uuid
        return f"session_{uuid.uuid4().hex[:16]}"
    
    def track_ingestion(
        self, 
        source: str, 
        timestamp: datetime, 
        record_count: int, 
        metadata: Dict[str, Any] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Track data ingestion event.
        
        Args:
            source: Data source identifier (e.g., "cpcb", "openaq", "imd")
            timestamp: Event timestamp
            record_count: Number of records ingested
            metadata: Additional metadata (e.g., parameters, locations)
            success: Whether ingestion was successful
            error_message: Error message if ingestion failed
            
        Returns:
            Event ID if persisted to database, None otherwise
        """
        import json
        
        lineage_record = {
            "event_type": "ingestion",
            "source": source,
            "timestamp": timestamp,
            "record_count": record_count,
            "success": success,
            "error_message": error_message,
            "metadata": metadata or {}
        }
        
        self.lineage_records.append(lineage_record)
        logger.info(f"Tracked ingestion: {source} - {record_count} records (success={success})")
        
        # Persist to database if session available
        if self.db:
            try:
                from src.api.models import DataLineageRecord
                
                db_record = DataLineageRecord(
                    event_type="ingestion",
                    event_timestamp=timestamp,
                    source=source,
                    operation="data_ingestion",
                    record_count=record_count,
                    success=success,
                    error_message=error_message,
                    metadata=json.dumps(metadata) if metadata else None,
                    session_id=self.session_id,
                    parent_event_id=self.parent_event_id
                )
                
                self.db.add(db_record)
                self.db.commit()
                self.db.refresh(db_record)
                
                logger.info(f"Persisted lineage record to database: {db_record.id}")
                return str(db_record.id)
                
            except Exception as e:
                logger.error(f"Failed to persist lineage record: {e}")
                if self.db:
                    self.db.rollback()
        
        return None
    
    def track_validation(
        self, 
        timestamp: datetime, 
        validation_stats: ValidationStats,
        source: str = "quality_validator",
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Track data validation event.
        
        Args:
            timestamp: Event timestamp
            validation_stats: Validation statistics
            source: Source of data being validated
            metadata: Additional metadata
            
        Returns:
            Event ID if persisted to database, None otherwise
        """
        import json
        
        validation_metadata = {
            "total_records": validation_stats.total_records,
            "valid_records": validation_stats.valid_records,
            "flagged_records": validation_stats.flagged_records,
            "quality_score": validation_stats.quality_score,
            "outliers": validation_stats.outliers,
            "missing_values": validation_stats.missing_values,
            "imputed_values": validation_stats.imputed_values
        }
        
        if metadata:
            validation_metadata.update(metadata)
        
        lineage_record = {
            "event_type": "validation",
            "timestamp": timestamp,
            "source": source,
            **validation_metadata
        }
        
        self.lineage_records.append(lineage_record)
        logger.info(f"Tracked validation: {validation_stats.quality_score:.2%} quality score")
        
        # Persist to database if session available
        if self.db:
            try:
                from src.api.models import DataLineageRecord
                
                db_record = DataLineageRecord(
                    event_type="validation",
                    event_timestamp=timestamp,
                    source=source,
                    operation="data_quality_validation",
                    record_count=validation_stats.total_records,
                    success=True,
                    metadata=json.dumps(validation_metadata),
                    session_id=self.session_id,
                    parent_event_id=self.parent_event_id
                )
                
                self.db.add(db_record)
                self.db.commit()
                self.db.refresh(db_record)
                
                logger.info(f"Persisted validation record to database: {db_record.id}")
                return str(db_record.id)
                
            except Exception as e:
                logger.error(f"Failed to persist validation record: {e}")
                if self.db:
                    self.db.rollback()
        
        return None
    
    def track_processing(
        self, 
        process_type: str, 
        timestamp: datetime, 
        input_count: int, 
        output_count: int, 
        metadata: Dict[str, Any] = None,
        source: Optional[str] = None,
        destination: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Track data processing event.
        
        Args:
            process_type: Type of processing (e.g., "aggregation", "transformation")
            timestamp: Event timestamp
            input_count: Number of input records
            output_count: Number of output records
            metadata: Additional metadata
            source: Source of input data
            destination: Destination of output data
            success: Whether processing was successful
            error_message: Error message if processing failed
            
        Returns:
            Event ID if persisted to database, None otherwise
        """
        import json
        
        processing_metadata = {
            "process_type": process_type,
            "input_count": input_count,
            "output_count": output_count
        }
        
        if metadata:
            processing_metadata.update(metadata)
        
        lineage_record = {
            "event_type": "processing",
            "timestamp": timestamp,
            "source": source or "unknown",
            "destination": destination,
            "success": success,
            "error_message": error_message,
            **processing_metadata
        }
        
        self.lineage_records.append(lineage_record)
        logger.info(f"Tracked processing: {process_type} - {input_count} -> {output_count} (success={success})")
        
        # Persist to database if session available
        if self.db:
            try:
                from src.api.models import DataLineageRecord
                
                db_record = DataLineageRecord(
                    event_type="processing",
                    event_timestamp=timestamp,
                    source=source or "unknown",
                    destination=destination,
                    operation=process_type,
                    record_count=output_count,
                    success=success,
                    error_message=error_message,
                    metadata=json.dumps(processing_metadata),
                    session_id=self.session_id,
                    parent_event_id=self.parent_event_id
                )
                
                self.db.add(db_record)
                self.db.commit()
                self.db.refresh(db_record)
                
                logger.info(f"Persisted processing record to database: {db_record.id}")
                return str(db_record.id)
                
            except Exception as e:
                logger.error(f"Failed to persist processing record: {e}")
                if self.db:
                    self.db.rollback()
        
        return None
    
    def track_transformation(
        self,
        transformation_type: str,
        timestamp: datetime,
        source: str,
        destination: str,
        record_count: int,
        metadata: Dict[str, Any] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Track data transformation event.
        
        Args:
            transformation_type: Type of transformation (e.g., "normalization", "aggregation")
            timestamp: Event timestamp
            source: Source data identifier
            destination: Destination data identifier
            record_count: Number of records transformed
            metadata: Additional metadata
            success: Whether transformation was successful
            error_message: Error message if transformation failed
            
        Returns:
            Event ID if persisted to database, None otherwise
        """
        import json
        
        transformation_metadata = {
            "transformation_type": transformation_type,
            "record_count": record_count
        }
        
        if metadata:
            transformation_metadata.update(metadata)
        
        lineage_record = {
            "event_type": "transformation",
            "timestamp": timestamp,
            "source": source,
            "destination": destination,
            "success": success,
            "error_message": error_message,
            **transformation_metadata
        }
        
        self.lineage_records.append(lineage_record)
        logger.info(f"Tracked transformation: {transformation_type} - {source} -> {destination}")
        
        # Persist to database if session available
        if self.db:
            try:
                from src.api.models import DataLineageRecord
                
                db_record = DataLineageRecord(
                    event_type="transformation",
                    event_timestamp=timestamp,
                    source=source,
                    destination=destination,
                    operation=transformation_type,
                    record_count=record_count,
                    success=success,
                    error_message=error_message,
                    metadata=json.dumps(transformation_metadata),
                    session_id=self.session_id,
                    parent_event_id=self.parent_event_id
                )
                
                self.db.add(db_record)
                self.db.commit()
                self.db.refresh(db_record)
                
                logger.info(f"Persisted transformation record to database: {db_record.id}")
                return str(db_record.id)
                
            except Exception as e:
                logger.error(f"Failed to persist transformation record: {e}")
                if self.db:
                    self.db.rollback()
        
        return None
    
    def set_parent_event(self, parent_event_id: Optional[str]):
        """
        Set parent event ID for tracking event hierarchies.
        
        Args:
            parent_event_id: UUID of parent event
        """
        from uuid import UUID
        
        if parent_event_id:
            try:
                self.parent_event_id = UUID(parent_event_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid parent event ID: {parent_event_id}")
                self.parent_event_id = None
        else:
            self.parent_event_id = None
    
    def get_lineage_summary(self) -> Dict[str, Any]:
        """
        Get summary of data lineage.
        
        Returns:
            Dictionary with lineage statistics
        """
        summary = {
            "session_id": self.session_id,
            "total_events": len(self.lineage_records),
            "ingestion_events": len([r for r in self.lineage_records if r["event_type"] == "ingestion"]),
            "validation_events": len([r for r in self.lineage_records if r["event_type"] == "validation"]),
            "processing_events": len([r for r in self.lineage_records if r["event_type"] == "processing"]),
            "transformation_events": len([r for r in self.lineage_records if r["event_type"] == "transformation"]),
            "latest_event": self.lineage_records[-1] if self.lineage_records else None
        }
        
        # Add database statistics if available
        if self.db:
            try:
                from src.api.models import DataLineageRecord
                from sqlalchemy import func, select
                
                # Count events by type
                stmt = select(
                    DataLineageRecord.event_type,
                    func.count(DataLineageRecord.id).label("count")
                ).where(
                    DataLineageRecord.session_id == self.session_id
                ).group_by(DataLineageRecord.event_type)
                
                result = self.db.execute(stmt)
                db_counts = {row.event_type: row.count for row in result}
                
                summary["database_events"] = db_counts
                summary["total_database_events"] = sum(db_counts.values())
                
            except Exception as e:
                logger.error(f"Failed to get database lineage statistics: {e}")
        
        return summary
    
    def get_lineage_chain(self, event_id: str) -> List[Dict[str, Any]]:
        """
        Get complete lineage chain for an event.
        
        Args:
            event_id: UUID of the event
            
        Returns:
            List of events in the lineage chain (from root to specified event)
        """
        if not self.db:
            logger.warning("Database session not available for lineage chain retrieval")
            return []
        
        try:
            from src.api.models import DataLineageRecord
            from uuid import UUID
            import json
            
            event_uuid = UUID(event_id)
            chain = []
            current_id = event_uuid
            
            # Traverse up the parent chain
            while current_id:
                stmt = select(DataLineageRecord).where(DataLineageRecord.id == current_id)
                result = self.db.execute(stmt)
                event = result.scalar_one_or_none()
                
                if not event:
                    break
                
                chain.insert(0, {
                    "id": str(event.id),
                    "event_type": event.event_type,
                    "timestamp": event.event_timestamp.isoformat(),
                    "source": event.source,
                    "destination": event.destination,
                    "operation": event.operation,
                    "record_count": event.record_count,
                    "success": event.success,
                    "metadata": json.loads(event.metadata) if event.metadata else {}
                })
                
                current_id = event.parent_event_id
            
            return chain
            
        except Exception as e:
            logger.error(f"Failed to get lineage chain: {e}")
            return []
    
    def query_lineage(
        self,
        event_type: Optional[str] = None,
        source: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Query lineage records with filters.
        
        Args:
            event_type: Filter by event type
            source: Filter by source
            start_time: Filter by start time
            end_time: Filter by end time
            limit: Maximum number of records to return
            
        Returns:
            List of matching lineage records
        """
        if not self.db:
            logger.warning("Database session not available for lineage query")
            return []
        
        try:
            from src.api.models import DataLineageRecord
            from sqlalchemy import and_
            import json
            
            conditions = []
            
            if event_type:
                conditions.append(DataLineageRecord.event_type == event_type)
            
            if source:
                conditions.append(DataLineageRecord.source == source)
            
            if start_time:
                conditions.append(DataLineageRecord.event_timestamp >= start_time)
            
            if end_time:
                conditions.append(DataLineageRecord.event_timestamp <= end_time)
            
            stmt = select(DataLineageRecord)
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
            
            stmt = stmt.order_by(DataLineageRecord.event_timestamp.desc()).limit(limit)
            
            result = self.db.execute(stmt)
            events = result.scalars().all()
            
            return [
                {
                    "id": str(event.id),
                    "event_type": event.event_type,
                    "timestamp": event.event_timestamp.isoformat(),
                    "source": event.source,
                    "destination": event.destination,
                    "operation": event.operation,
                    "record_count": event.record_count,
                    "success": event.success,
                    "error_message": event.error_message,
                    "metadata": json.loads(event.metadata) if event.metadata else {},
                    "session_id": event.session_id
                }
                for event in events
            ]
            
        except Exception as e:
            logger.error(f"Failed to query lineage records: {e}")
            return []


class DataRetentionManager:
    """Manages automated data cleanup and retention policies."""
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.retention_policies = {
            "air_quality_measurements": timedelta(days=730),  # 2 years
            "weather_data": timedelta(days=1095),             # 3 years
            "predictions": timedelta(days=365),               # 1 year
            "data_quality_flags": timedelta(days=365),        # 1 year
        }
    
    def cleanup_expired_data(self) -> Dict[str, int]:
        """Clean up expired data based on retention policies."""
        cleanup_stats = {}
        
        for table_name, retention_period in self.retention_policies.items():
            try:
                cutoff_date = datetime.utcnow() - retention_period
                deleted_count = self._cleanup_table(table_name, cutoff_date)
                cleanup_stats[table_name] = deleted_count
                
                logger.info(f"Cleaned up {deleted_count} records from {table_name} "
                           f"older than {cutoff_date}")
                
            except Exception as e:
                logger.error(f"Failed to cleanup {table_name}: {e}")
                cleanup_stats[table_name] = 0
        
        return cleanup_stats
    
    def _cleanup_table(self, table_name: str, cutoff_date: datetime) -> int:
        """Clean up specific table."""
        # Mock implementation for testing - would use actual database models in production
        logger.info(f"Would cleanup {table_name} records older than {cutoff_date}")
        return 0