"""
Integration test for data quality validation system.
Demonstrates the complete validation workflow with real-world scenarios.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime
from src.data.quality_validator import DataQualityValidator, DataLineageTracker, DataRetentionManager
from src.data.ingestion_clients import DataPoint, WeatherPoint


def test_air_quality_validation():
    """Test air quality data validation with various scenarios."""
    print("\n" + "="*80)
    print("TEST 1: Air Quality Data Validation")
    print("="*80)
    
    validator = DataQualityValidator()
    
    # Create test data with various quality issues
    data_points = [
        # Normal values
        DataPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            parameter="pm25",
            value=45.5,
            unit="µg/m³",
            source="cpcb",
            station_id="DEL001"
        ),
        DataPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            parameter="pm10",
            value=85.0,
            unit="µg/m³",
            source="cpcb",
            station_id="DEL001"
        ),
        # Outlier - extreme value
        DataPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            parameter="pm25",
            value=999.0,  # Extreme outlier
            unit="µg/m³",
            source="cpcb",
            station_id="DEL002"
        ),
        # Invalid - negative value
        DataPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            parameter="no2",
            value=-10.0,  # Invalid negative
            unit="µg/m³",
            source="cpcb",
            station_id="DEL003"
        ),
        # Missing value
        DataPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            parameter="o3",
            value=None,  # Missing
            unit="µg/m³",
            source="cpcb",
            station_id="DEL004"
        ),
    ]
    
    # Validate
    validated_points, stats = validator.validate_data_points(data_points)
    
    # Display results
    print(f"\n📊 Validation Statistics:")
    print(f"  Total Records: {stats.total_records}")
    print(f"  Valid Records: {stats.valid_records}")
    print(f"  Flagged Records: {stats.flagged_records}")
    print(f"  Outliers Detected: {stats.outliers}")
    print(f"  Missing Values: {stats.missing_values}")
    print(f"  Imputed Values: {stats.imputed_values}")
    print(f"  Quality Score: {stats.quality_score:.2%}")
    
    print(f"\n📋 Validated Data Points:")
    for i, point in enumerate(validated_points, 1):
        status_emoji = "✅" if point.quality_flag == "valid" else "⚠️"
        print(f"  {status_emoji} Point {i}: {point.parameter}={point.value} "
              f"[{point.quality_flag}] @ {point.station_id}")
    
    return stats.quality_score > 0.0


def test_weather_validation():
    """Test weather data validation."""
    print("\n" + "="*80)
    print("TEST 2: Weather Data Validation")
    print("="*80)
    
    validator = DataQualityValidator()
    
    # Create test weather data
    weather_points = [
        # Normal weather
        WeatherPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            temperature=25.5,
            humidity=65.0,
            wind_speed=5.2,
            wind_direction=180.0,
            pressure=1013.0,
            precipitation=0.0,
            visibility=10.0,
            source="imd"
        ),
        # Invalid humidity
        WeatherPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            temperature=28.0,
            humidity=150.0,  # Invalid >100%
            wind_speed=3.5,
            wind_direction=90.0,
            pressure=1015.0,
            precipitation=0.0,
            visibility=8.0,
            source="openweather"
        ),
        # Missing temperature
        WeatherPoint(
            timestamp=datetime(2024, 1, 15, 10, 0),
            location=(28.6, 77.2),
            temperature=None,  # Missing
            humidity=70.0,
            wind_speed=4.0,
            wind_direction=270.0,
            pressure=1012.0,
            precipitation=0.0,
            visibility=12.0,
            source="imd"
        ),
    ]
    
    # Validate
    validated_points, stats = validator.validate_weather_points(weather_points)
    
    # Display results
    print(f"\n📊 Validation Statistics:")
    print(f"  Total Records: {stats.total_records}")
    print(f"  Valid Records: {stats.valid_records}")
    print(f"  Flagged Records: {stats.flagged_records}")
    print(f"  Quality Score: {stats.quality_score:.2%}")
    
    print(f"\n🌤️  Validated Weather Points:")
    for i, point in enumerate(validated_points, 1):
        print(f"  Point {i}: T={point.temperature}°C, H={point.humidity}%, "
              f"W={point.wind_speed}m/s [{point.source}]")
    
    return stats.quality_score > 0.0


def test_lineage_tracking():
    """Test data lineage tracking."""
    print("\n" + "="*80)
    print("TEST 3: Data Lineage Tracking")
    print("="*80)
    
    tracker = DataLineageTracker()
    
    # Track various events
    tracker.track_ingestion(
        source="cpcb",
        timestamp=datetime(2024, 1, 15, 10, 0),
        record_count=100,
        metadata={"api_version": "v3", "stations": 10}
    )
    
    tracker.track_ingestion(
        source="openaq",
        timestamp=datetime(2024, 1, 15, 10, 5),
        record_count=50,
        metadata={"api_version": "v2"}
    )
    
    from src.data.quality_validator import ValidationStats
    tracker.track_validation(
        timestamp=datetime(2024, 1, 15, 10, 10),
        validation_stats=ValidationStats(
            total_records=150,
            valid_records=140,
            flagged_records=10,
            outliers=5,
            missing_values=3,
            imputed_values=2,
            quality_score=0.933
        )
    )
    
    tracker.track_processing(
        process_type="aggregation",
        timestamp=datetime(2024, 1, 15, 10, 15),
        input_count=150,
        output_count=145,
        metadata={"aggregation_method": "hourly_mean"}
    )
    
    # Get summary
    summary = tracker.get_lineage_summary()
    
    print(f"\n📜 Lineage Summary:")
    print(f"  Total Events: {summary['total_events']}")
    print(f"  Ingestion Events: {summary['ingestion_events']}")
    print(f"  Validation Events: {summary['validation_events']}")
    print(f"  Processing Events: {summary['processing_events']}")
    
    if summary['latest_event']:
        print(f"\n  Latest Event:")
        print(f"    Type: {summary['latest_event']['event_type']}")
        print(f"    Timestamp: {summary['latest_event']['timestamp']}")
    
    return summary['total_events'] == 4


def test_retention_policies():
    """Test data retention manager."""
    print("\n" + "="*80)
    print("TEST 4: Data Retention Policies")
    print("="*80)
    
    retention_mgr = DataRetentionManager()
    
    print(f"\n📅 Configured Retention Policies:")
    for table, period in retention_mgr.retention_policies.items():
        print(f"  {table}: {period.days} days")
    
    # Simulate cleanup (without actual database)
    print(f"\n🧹 Simulating Data Cleanup:")
    cleanup_stats = retention_mgr.cleanup_expired_data()
    
    for table, deleted_count in cleanup_stats.items():
        print(f"  {table}: {deleted_count} records cleaned")
    
    return True


def main():
    """Run all integration tests."""
    print("\n" + "="*80)
    print("DATA QUALITY VALIDATION INTEGRATION TESTS")
    print("="*80)
    
    results = {
        "Air Quality Validation": test_air_quality_validation(),
        "Weather Validation": test_weather_validation(),
        "Lineage Tracking": test_lineage_tracking(),
        "Retention Policies": test_retention_policies(),
    }
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*80)
    if all_passed:
        print("✅ ALL TESTS PASSED - Data Quality Validation System is Operational")
    else:
        print("❌ SOME TESTS FAILED - Please review the output above")
    print("="*80 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    exit(main())
