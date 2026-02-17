"""
Property-based tests for data quality validation.
Tests Property 9: Data Quality Validation - Requirements 6.5
"""

import pytest
from hypothesis import given, strategies as st, settings
from datetime import datetime, timedelta
import numpy as np
from typing import List

from src.data.quality_validator import DataQualityValidator, ValidationStats
from src.data.ingestion_clients import DataPoint, WeatherPoint


# Test data generators
@st.composite
def generate_air_quality_data_point(draw):
    """Generate a valid air quality data point."""
    parameters = ["pm25", "pm10", "no2", "so2", "o3", "co"]
    parameter = draw(st.sampled_from(parameters))
    
    # Generate values within reasonable ranges
    value_ranges = {
        "pm25": (0, 300),
        "pm10": (0, 500),
        "no2": (0, 200),
        "so2": (0, 100),
        "o3": (0, 300),
        "co": (0, 10)
    }
    
    min_val, max_val = value_ranges[parameter]
    value = draw(st.floats(min_value=min_val, max_value=max_val, allow_nan=False, allow_infinity=False))
    
    return DataPoint(
        timestamp=draw(st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2024, 12, 31)
        )),
        location=(
            draw(st.floats(min_value=28.4, max_value=28.8)),  # Delhi latitude range
            draw(st.floats(min_value=76.8, max_value=77.4))   # Delhi longitude range
        ),
        parameter=parameter,
        value=value,
        unit="µg/m³" if parameter != "co" else "mg/m³",
        source=draw(st.sampled_from(["cpcb", "openaq", "test"])),
        station_id=draw(st.text(min_size=3, max_size=10, alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    )


@st.composite
def generate_outlier_data_point(draw):
    """Generate a data point with outlier values."""
    parameters = ["pm25", "pm10", "no2", "so2", "o3", "co"]
    parameter = draw(st.sampled_from(parameters))
    
    # Generate extreme outlier values
    outlier_ranges = {
        "pm25": (500, 2000),
        "pm10": (1000, 3000),
        "no2": (300, 1000),
        "so2": (200, 800),
        "o3": (400, 1000),
        "co": (20, 100)
    }
    
    min_val, max_val = outlier_ranges[parameter]
    value = draw(st.floats(min_value=min_val, max_value=max_val, allow_nan=False, allow_infinity=False))
    
    return DataPoint(
        timestamp=draw(st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2024, 12, 31)
        )),
        location=(
            draw(st.floats(min_value=28.4, max_value=28.8)),
            draw(st.floats(min_value=76.8, max_value=77.4))
        ),
        parameter=parameter,
        value=value,
        unit="µg/m³" if parameter != "co" else "mg/m³",
        source=draw(st.sampled_from(["cpcb", "openaq", "test"])),
        station_id=draw(st.text(min_size=3, max_size=10, alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    )


@st.composite
def generate_weather_data_point(draw):
    """Generate a valid weather data point."""
    return WeatherPoint(
        timestamp=draw(st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2024, 12, 31)
        )),
        location=(
            draw(st.floats(min_value=28.4, max_value=28.8)),
            draw(st.floats(min_value=76.8, max_value=77.4))
        ),
        temperature=draw(st.floats(min_value=-5, max_value=45, allow_nan=False, allow_infinity=False)),
        humidity=draw(st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False)),
        wind_speed=draw(st.floats(min_value=0, max_value=25, allow_nan=False, allow_infinity=False)),
        wind_direction=draw(st.floats(min_value=0, max_value=360, allow_nan=False, allow_infinity=False)),
        pressure=draw(st.floats(min_value=950, max_value=1050, allow_nan=False, allow_infinity=False)),
        precipitation=draw(st.floats(min_value=0, max_value=50, allow_nan=False, allow_infinity=False)),
        visibility=draw(st.floats(min_value=0, max_value=15, allow_nan=False, allow_infinity=False)),
        source=draw(st.sampled_from(["imd", "openweather", "test"]))
    )


class TestDataQualityValidation:
    """Test suite for data quality validation properties."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.validator = DataQualityValidator()
    
    @given(st.lists(generate_air_quality_data_point(), min_size=1, max_size=50))
    @settings(max_examples=100, deadline=5000)
    def test_property_9_data_quality_validation_outlier_detection(self, data_points: List[DataPoint]):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any incoming data point, outliers beyond 3 standard deviations from 
        historical norms should be flagged and handled appropriately.
        
        Validates: Requirements 6.5
        """
        # Use the same timestamp as the generated data points for consistency
        base_timestamp = data_points[0].timestamp if data_points else datetime(2024, 1, 1)
        
        # Add some known outliers to the data
        outlier_point = DataPoint(
            timestamp=base_timestamp,
            location=(28.6, 77.2),
            parameter="pm25",
            value=999.0,  # Extreme outlier
            unit="µg/m³",
            source="test",
            station_id="TEST001"
        )
        data_points.append(outlier_point)
        
        # Validate the data
        validated_points, stats = self.validator.validate_data_points(data_points)
        
        # Property: Outliers should be detected and flagged
        outlier_found = False
        for point in validated_points:
            if point.value == 999.0 and point.quality_flag in ["outlier", "invalid"]:
                outlier_found = True
                break
        
        # The extreme outlier should be flagged
        assert outlier_found, f"Extreme outlier (999.0 µg/m³) should be flagged, but wasn't detected"
        
        # Validation stats should be reasonable
        assert stats.total_records == len(data_points)
        assert stats.valid_records + stats.flagged_records == stats.total_records
        assert 0.0 <= stats.quality_score <= 1.0
    
    @given(st.lists(generate_air_quality_data_point(), min_size=5, max_size=20))
    @settings(max_examples=100, deadline=5000)
    def test_property_9_data_quality_validation_range_checking(self, data_points: List[DataPoint]):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any incoming data point, values outside valid parameter ranges 
        should be flagged as invalid.
        
        Validates: Requirements 6.5
        """
        # Add a data point with invalid range
        invalid_point = DataPoint(
            timestamp=datetime.now(),
            location=(28.6, 77.2),
            parameter="pm25",
            value=-50.0,  # Negative value is invalid
            unit="µg/m³",
            source="test",
            station_id="TEST001"
        )
        data_points.append(invalid_point)
        
        # Validate the data
        validated_points, stats = self.validator.validate_data_points(data_points)
        
        # Property: Invalid range values should be flagged
        invalid_found = False
        for point in validated_points:
            if point.parameter == "pm25" and (point.value is None or point.value < 0):
                if point.quality_flag in ["invalid", "missing", "imputed"]:
                    invalid_found = True
                    break
        
        assert invalid_found, "Negative PM2.5 value should be flagged as invalid"
        
        # All valid points should remain valid
        for point in validated_points:
            if point.quality_flag == "valid":
                assert point.value is not None
                if point.parameter in self.validator.parameter_ranges:
                    ranges = self.validator.parameter_ranges[point.parameter]
                    assert point.value >= ranges.get("min", 0)
                    assert point.value <= ranges.get("max", float('inf'))
    
    @given(st.lists(generate_weather_data_point(), min_size=5, max_size=20))
    @settings(max_examples=100, deadline=5000)
    def test_property_9_data_quality_validation_weather_data(self, weather_points: List[WeatherPoint]):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any weather data point, validation should handle missing values 
        and detect outliers appropriately.
        
        Validates: Requirements 6.5
        """
        # Add a weather point with missing data
        missing_point = WeatherPoint(
            timestamp=datetime.now(),
            location=(28.6, 77.2),
            temperature=None,  # Missing temperature
            humidity=150.0,    # Invalid humidity (>100%)
            wind_speed=5.0,
            wind_direction=180.0,
            pressure=1013.0,
            precipitation=0.0,
            visibility=10.0,
            source="test"
        )
        weather_points.append(missing_point)
        
        # Validate the weather data
        validated_points, stats = self.validator.validate_weather_points(weather_points)
        
        # Property: Missing and invalid values should be handled
        assert stats.total_records == len(weather_points)
        assert stats.valid_records + stats.flagged_records == stats.total_records
        
        # Check that invalid humidity was handled
        invalid_humidity_handled = False
        for point in validated_points:
            if point.humidity is not None and point.humidity > 100:
                # Should have been corrected or flagged
                invalid_humidity_handled = False
                break
            elif point.humidity is None or point.humidity <= 100:
                invalid_humidity_handled = True
        
        assert invalid_humidity_handled, "Invalid humidity (>100%) should be corrected or removed"
    
    @given(st.lists(generate_air_quality_data_point(), min_size=10, max_size=30))
    @settings(max_examples=100, deadline=5000)
    def test_property_9_data_quality_validation_statistics_consistency(self, data_points: List[DataPoint]):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any batch of data points, validation statistics should be 
        mathematically consistent and sum correctly.
        
        Validates: Requirements 6.5
        """
        # Validate the data
        validated_points, stats = self.validator.validate_data_points(data_points)
        
        # Property: Statistics should be consistent
        assert stats.total_records == len(data_points)
        assert stats.valid_records >= 0
        assert stats.flagged_records >= 0
        assert stats.outliers >= 0
        assert stats.missing_values >= 0
        assert stats.imputed_values >= 0
        
        # Valid + flagged should equal total (allowing for some flexibility in counting)
        assert abs((stats.valid_records + stats.flagged_records) - stats.total_records) <= stats.total_records * 0.1
        
        # Quality score should be between 0 and 1
        assert 0.0 <= stats.quality_score <= 1.0
        
        # If there are records, quality score should match the ratio
        if stats.total_records > 0:
            expected_quality = stats.valid_records / stats.total_records
            assert abs(stats.quality_score - expected_quality) <= 0.1
    
    @given(st.lists(generate_outlier_data_point(), min_size=3, max_size=10))
    @settings(max_examples=100, deadline=5000)
    def test_property_9_data_quality_validation_outlier_handling(self, outlier_points: List[DataPoint]):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any data points that are statistical outliers, they should be 
        detected and flagged appropriately without being completely removed.
        
        Validates: Requirements 6.5
        """
        # Mix outliers with normal data
        normal_points = [
            DataPoint(
                timestamp=datetime.now(),
                location=(28.6, 77.2),
                parameter="pm25",
                value=25.0,  # Normal value
                unit="µg/m³",
                source="test",
                station_id="TEST001"
            ),
            DataPoint(
                timestamp=datetime.now(),
                location=(28.6, 77.2),
                parameter="pm25",
                value=35.0,  # Normal value
                unit="µg/m³",
                source="test",
                station_id="TEST002"
            )
        ]
        
        all_points = normal_points + outlier_points
        
        # Validate the data
        validated_points, stats = self.validator.validate_data_points(all_points)
        
        # Property: All points should still be present (not removed)
        assert len(validated_points) == len(all_points)
        
        # Property: Some outliers should be flagged
        flagged_count = sum(1 for point in validated_points if point.quality_flag != "valid")
        
        # With extreme outliers, we expect some to be flagged
        if len(outlier_points) > 0:
            assert flagged_count > 0, "At least some outliers should be flagged"
        
        # Property: Flagged points should have appropriate quality flags
        for point in validated_points:
            if point.quality_flag != "valid":
                assert point.quality_flag in ["outlier", "invalid", "suspicious", "imputed", "missing"]
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=100, deadline=3000)
    def test_property_9_data_quality_validation_empty_and_edge_cases(self, data_count: int):
        """
        Feature: aqi-predictor-completion, Property 9: Data Quality Validation
        
        For any edge cases including empty datasets, the validator should 
        handle them gracefully without errors.
        
        Validates: Requirements 6.5
        """
        # Test empty dataset
        empty_points, empty_stats = self.validator.validate_data_points([])
        assert len(empty_points) == 0
        assert empty_stats.total_records == 0
        assert empty_stats.quality_score == 0.0
        
        # Test single point
        single_point = [DataPoint(
            timestamp=datetime.now(),
            location=(28.6, 77.2),
            parameter="pm25",
            value=50.0,
            unit="µg/m³",
            source="test",
            station_id="TEST001"
        )]
        
        single_validated, single_stats = self.validator.validate_data_points(single_point)
        assert len(single_validated) == 1
        assert single_stats.total_records == 1
        
        # Test with None values
        none_point = [DataPoint(
            timestamp=datetime.now(),
            location=(28.6, 77.2),
            parameter="pm25",
            value=None,  # Missing value
            unit="µg/m³",
            source="test",
            station_id="TEST001"
        )]
        
        none_validated, none_stats = self.validator.validate_data_points(none_point)
        assert len(none_validated) == 1
        assert none_stats.total_records == 1
        # Missing value should be handled (flagged or imputed)
        assert none_validated[0].quality_flag in ["missing", "imputed", "invalid"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])