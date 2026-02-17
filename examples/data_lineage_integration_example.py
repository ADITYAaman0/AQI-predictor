"""
Example: Data Lineage Tracking Integration

This example demonstrates how data lineage tracking integrates with
the AQI Predictor data pipeline to provide complete visibility into
data flow and transformations.
"""

import asyncio
from datetime import datetime
from src.data.quality_validator import DataLineageTracker, DataQualityValidator, ValidationStats
from src.data.ingestion_clients import CPCBClient, DataPoint
from src.utils.audit_logger import AuditLogger


async def example_complete_pipeline_with_lineage():
    """
    Example of complete data pipeline with lineage tracking.
    
    This demonstrates:
    1. Data ingestion from CPCB
    2. Data quality validation
    3. Data processing/aggregation
    4. Data transformation for ML
    5. Complete lineage tracking throughout
    """
    
    print("=" * 80)
    print("Data Pipeline with Lineage Tracking Example")
    print("=" * 80)
    
    # Initialize lineage tracker (in production, pass db_session)
    tracker = DataLineageTracker()
    print(f"\n✓ Initialized lineage tracker with session: {tracker.session_id}")
    
    # Step 1: Data Ingestion
    print("\n" + "=" * 80)
    print("STEP 1: Data Ingestion from CPCB")
    print("=" * 80)
    
    async with CPCBClient() as client:
        # Fetch data from CPCB stations
        stations = ["DL001", "DL002", "DL003"]  # Delhi stations
        data_points = await client.fetch_data(stations=stations)
        
        print(f"\n✓ Fetched {len(data_points)} data points from CPCB")
        
        # Track ingestion event
        ingestion_event_id = tracker.track_ingestion(
            source="cpcb",
            timestamp=datetime.utcnow(),
            record_count=len(data_points),
            metadata={
                "stations": stations,
                "parameters": list(set(dp.parameter for dp in data_points)),
                "city": "Delhi"
            },
            success=True
        )
        
        print(f"✓ Tracked ingestion event: {ingestion_event_id}")
    
    # Step 2: Data Quality Validation
    print("\n" + "=" * 80)
    print("STEP 2: Data Quality Validation")
    print("=" * 80)
    
    validator = DataQualityValidator()
    validated_points, validation_stats = validator.validate_data_points(data_points)
    
    print(f"\n✓ Validated {validation_stats.total_records} records")
    print(f"  - Valid: {validation_stats.valid_records}")
    print(f"  - Flagged: {validation_stats.flagged_records}")
    print(f"  - Outliers: {validation_stats.outliers}")
    print(f"  - Imputed: {validation_stats.imputed_values}")
    print(f"  - Quality Score: {validation_stats.quality_score:.2%}")
    
    # Track validation event
    validation_event_id = tracker.track_validation(
        timestamp=datetime.utcnow(),
        validation_stats=validation_stats,
        source="cpcb",
        metadata={"validator_version": "1.0"}
    )
    
    print(f"✓ Tracked validation event: {validation_event_id}")
    
    # Step 3: Data Processing (Aggregation)
    print("\n" + "=" * 80)
    print("STEP 3: Data Processing - Hourly Aggregation")
    print("=" * 80)
    
    # Simulate aggregation (group by station and parameter)
    aggregated_data = {}
    for point in validated_points:
        if point.quality_flag == "valid":
            key = (point.station_id, point.parameter)
            if key not in aggregated_data:
                aggregated_data[key] = []
            aggregated_data[key].append(point.value)
    
    # Calculate averages
    aggregated_results = []
    for (station_id, parameter), values in aggregated_data.items():
        if values:
            avg_value = sum(v for v in values if v is not None) / len([v for v in values if v is not None])
            aggregated_results.append({
                "station_id": station_id,
                "parameter": parameter,
                "avg_value": avg_value,
                "count": len(values)
            })
    
    print(f"\n✓ Aggregated {len(validated_points)} records into {len(aggregated_results)} hourly averages")
    
    # Track processing event
    processing_event_id = tracker.track_processing(
        process_type="hourly_aggregation",
        timestamp=datetime.utcnow(),
        input_count=len(validated_points),
        output_count=len(aggregated_results),
        source="validated_measurements",
        destination="hourly_aggregates",
        metadata={"aggregation_method": "mean"}
    )
    
    print(f"✓ Tracked processing event: {processing_event_id}")
    
    # Step 4: Data Transformation (Feature Engineering)
    print("\n" + "=" * 80)
    print("STEP 4: Data Transformation - Feature Engineering")
    print("=" * 80)
    
    # Simulate feature engineering
    ml_features = []
    for result in aggregated_results:
        features = {
            "station_id": result["station_id"],
            "parameter": result["parameter"],
            "value": result["avg_value"],
            "rolling_mean_24h": result["avg_value"] * 0.95,  # Simulated
            "lag_1h": result["avg_value"] * 1.05,  # Simulated
            "hour_of_day": datetime.utcnow().hour,
            "day_of_week": datetime.utcnow().weekday()
        }
        ml_features.append(features)
    
    print(f"\n✓ Generated {len(ml_features)} feature vectors for ML")
    
    # Track transformation event
    transformation_event_id = tracker.track_transformation(
        transformation_type="feature_engineering",
        timestamp=datetime.utcnow(),
        source="hourly_aggregates",
        destination="ml_features",
        record_count=len(ml_features),
        metadata={
            "features": ["rolling_mean_24h", "lag_1h", "hour_of_day", "day_of_week"]
        }
    )
    
    print(f"✓ Tracked transformation event: {transformation_event_id}")
    
    # Step 5: Lineage Summary
    print("\n" + "=" * 80)
    print("STEP 5: Lineage Summary")
    print("=" * 80)
    
    summary = tracker.get_lineage_summary()
    
    print(f"\n✓ Pipeline Lineage Summary:")
    print(f"  - Session ID: {summary['session_id']}")
    print(f"  - Total Events: {summary['total_events']}")
    print(f"  - Ingestion Events: {summary['ingestion_events']}")
    print(f"  - Validation Events: {summary['validation_events']}")
    print(f"  - Processing Events: {summary['processing_events']}")
    print(f"  - Transformation Events: {summary['transformation_events']}")
    
    if summary['latest_event']:
        print(f"\n✓ Latest Event:")
        print(f"  - Type: {summary['latest_event']['event_type']}")
        print(f"  - Source: {summary['latest_event'].get('source', 'N/A')}")
        print(f"  - Destination: {summary['latest_event'].get('destination', 'N/A')}")
    
    print("\n" + "=" * 80)
    print("Pipeline Complete - Full Lineage Tracked!")
    print("=" * 80)


async def example_audit_logging():
    """
    Example of audit logging for compliance and security.
    
    This demonstrates:
    1. Logging data access
    2. Logging data modifications
    3. Logging authentication events
    4. Querying audit logs
    """
    
    print("\n\n" + "=" * 80)
    print("Audit Logging Example")
    print("=" * 80)
    
    # Initialize audit logger (in production, pass db_session)
    audit_logger = AuditLogger()
    print("\n✓ Initialized audit logger")
    
    # Example 1: Log data access
    print("\n" + "-" * 80)
    print("Example 1: Logging Data Access")
    print("-" * 80)
    
    audit_logger.log_data_access(
        resource_type="air_quality_measurement",
        resource_id="station_DL001",
        user_email="researcher@example.com",
        ip_address="192.168.1.100",
        query_params={
            "parameter": "pm25",
            "start_time": "2024-01-01",
            "end_time": "2024-01-31",
            "limit": 1000
        }
    )
    
    print("✓ Logged data access event")
    print("  - Resource: air_quality_measurement/station_DL001")
    print("  - User: researcher@example.com")
    print("  - Action: read")
    
    # Example 2: Log data modification
    print("\n" + "-" * 80)
    print("Example 2: Logging Data Modification")
    print("-" * 80)
    
    audit_logger.log_data_modification(
        action="update",
        resource_type="monitoring_station",
        resource_id="station_DL001",
        user_email="admin@example.com",
        ip_address="192.168.1.10",
        changes={
            "is_active": False,
            "reason": "Maintenance"
        },
        success=True
    )
    
    print("✓ Logged data modification event")
    print("  - Resource: monitoring_station/station_DL001")
    print("  - User: admin@example.com")
    print("  - Action: update")
    print("  - Changes: is_active=False")
    
    # Example 3: Log authentication
    print("\n" + "-" * 80)
    print("Example 3: Logging Authentication")
    print("-" * 80)
    
    # Successful login
    audit_logger.log_authentication(
        action="login",
        user_email="user@example.com",
        ip_address="192.168.1.50",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        success=True
    )
    
    print("✓ Logged successful login")
    print("  - User: user@example.com")
    print("  - IP: 192.168.1.50")
    
    # Failed login attempt
    audit_logger.log_authentication(
        action="failed_login",
        user_email="attacker@example.com",
        ip_address="192.168.1.200",
        user_agent="curl/7.68.0",
        success=False,
        error_message="Invalid credentials"
    )
    
    print("✓ Logged failed login attempt")
    print("  - User: attacker@example.com")
    print("  - IP: 192.168.1.200")
    print("  - Reason: Invalid credentials")
    
    print("\n" + "=" * 80)
    print("Audit Logging Complete!")
    print("=" * 80)


async def example_lineage_with_error_handling():
    """
    Example showing lineage tracking with error handling.
    
    This demonstrates:
    1. Tracking failed operations
    2. Error message capture
    3. Partial success tracking
    """
    
    print("\n\n" + "=" * 80)
    print("Lineage Tracking with Error Handling")
    print("=" * 80)
    
    tracker = DataLineageTracker()
    
    # Example 1: Failed ingestion
    print("\n" + "-" * 80)
    print("Example 1: Failed Data Ingestion")
    print("-" * 80)
    
    tracker.track_ingestion(
        source="external_api",
        timestamp=datetime.utcnow(),
        record_count=0,
        success=False,
        error_message="Connection timeout after 30 seconds",
        metadata={"retry_count": 3}
    )
    
    print("✓ Tracked failed ingestion")
    print("  - Source: external_api")
    print("  - Error: Connection timeout")
    
    # Example 2: Partial success in processing
    print("\n" + "-" * 80)
    print("Example 2: Partial Success in Processing")
    print("-" * 80)
    
    tracker.track_processing(
        process_type="data_cleaning",
        timestamp=datetime.utcnow(),
        input_count=1000,
        output_count=850,
        source="raw_data",
        destination="cleaned_data",
        success=True,
        metadata={
            "records_dropped": 150,
            "drop_reason": "Invalid format"
        }
    )
    
    print("✓ Tracked processing with partial success")
    print("  - Input: 1000 records")
    print("  - Output: 850 records")
    print("  - Dropped: 150 records (invalid format)")
    
    # Get summary
    summary = tracker.get_lineage_summary()
    print(f"\n✓ Total events tracked: {summary['total_events']}")
    
    print("\n" + "=" * 80)
    print("Error Handling Example Complete!")
    print("=" * 80)


async def main():
    """Run all examples."""
    try:
        # Run complete pipeline example
        await example_complete_pipeline_with_lineage()
        
        # Run audit logging example
        await example_audit_logging()
        
        # Run error handling example
        await example_lineage_with_error_handling()
        
        print("\n\n" + "=" * 80)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nKey Takeaways:")
        print("1. Data lineage tracking provides complete visibility into data flow")
        print("2. Audit logging ensures compliance and security monitoring")
        print("3. Error tracking helps identify and debug pipeline issues")
        print("4. Session-based grouping enables end-to-end pipeline tracking")
        print("5. Metadata capture provides rich context for analysis")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
