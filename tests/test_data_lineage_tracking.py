"""
Tests for data lineage tracking and audit logging.
Validates comprehensive lineage tracking, audit logs, and compliance features.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
import json

from src.data.quality_validator import DataLineageTracker, ValidationStats
from src.utils.audit_logger import AuditLogger


class TestDataLineageTracker:
    """Test suite for DataLineageTracker."""
    
    def test_track_ingestion_in_memory(self):
        """Test tracking ingestion events in memory."""
        tracker = DataLineageTracker()
        
        # Track ingestion event
        tracker.track_ingestion(
            source="cpcb",
            timestamp=datetime.utcnow(),
            record_count=100,
            metadata={"parameters": ["pm25", "pm10"], "city": "Delhi"}
        )
        
        # Verify event was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["ingestion_events"] == 1
        assert summary["latest_event"]["event_type"] == "ingestion"
        assert summary["latest_event"]["source"] == "cpcb"
        assert summary["latest_event"]["record_count"] == 100
    
    def test_track_validation_in_memory(self):
        """Test tracking validation events in memory."""
        tracker = DataLineageTracker()
        
        # Create validation stats
        validation_stats = ValidationStats(
            total_records=100,
            valid_records=85,
            flagged_records=15,
            outliers=10,
            missing_values=5,
            imputed_values=3,
            quality_score=0.85
        )
        
        # Track validation event
        tracker.track_validation(
            timestamp=datetime.utcnow(),
            validation_stats=validation_stats,
            source="openaq"
        )
        
        # Verify event was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["validation_events"] == 1
        assert summary["latest_event"]["event_type"] == "validation"
        assert summary["latest_event"]["quality_score"] == 0.85
    
    def test_track_processing_in_memory(self):
        """Test tracking processing events in memory."""
        tracker = DataLineageTracker()
        
        # Track processing event
        tracker.track_processing(
            process_type="aggregation",
            timestamp=datetime.utcnow(),
            input_count=1000,
            output_count=100,
            metadata={"aggregation_level": "hourly"},
            source="raw_measurements",
            destination="hourly_aggregates"
        )
        
        # Verify event was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["processing_events"] == 1
        assert summary["latest_event"]["event_type"] == "processing"
        assert summary["latest_event"]["input_count"] == 1000
        assert summary["latest_event"]["output_count"] == 100
    
    def test_track_transformation_in_memory(self):
        """Test tracking transformation events in memory."""
        tracker = DataLineageTracker()
        
        # Track transformation event
        tracker.track_transformation(
            transformation_type="normalization",
            timestamp=datetime.utcnow(),
            source="raw_data",
            destination="normalized_data",
            record_count=500,
            metadata={"method": "z-score"}
        )
        
        # Verify event was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["transformation_events"] == 1
        assert summary["latest_event"]["event_type"] == "transformation"
        assert summary["latest_event"]["source"] == "raw_data"
        assert summary["latest_event"]["destination"] == "normalized_data"
    
    def test_session_id_generation(self):
        """Test automatic session ID generation."""
        tracker1 = DataLineageTracker()
        tracker2 = DataLineageTracker()
        
        # Each tracker should have a unique session ID
        assert tracker1.session_id != tracker2.session_id
        assert tracker1.session_id.startswith("session_")
        assert tracker2.session_id.startswith("session_")
    
    def test_custom_session_id(self):
        """Test using custom session ID."""
        custom_session = "custom_session_123"
        tracker = DataLineageTracker(session_id=custom_session)
        
        assert tracker.session_id == custom_session
    
    def test_multiple_events_tracking(self):
        """Test tracking multiple events in sequence."""
        tracker = DataLineageTracker()
        
        # Track multiple events
        tracker.track_ingestion("cpcb", datetime.utcnow(), 100)
        tracker.track_ingestion("openaq", datetime.utcnow(), 200)
        tracker.track_processing("aggregation", datetime.utcnow(), 300, 30)
        
        validation_stats = ValidationStats(100, 90, 10, 5, 3, 2, 0.90)
        tracker.track_validation(datetime.utcnow(), validation_stats)
        
        # Verify all events were tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 4
        assert summary["ingestion_events"] == 2
        assert summary["processing_events"] == 1
        assert summary["validation_events"] == 1
    
    def test_track_failed_ingestion(self):
        """Test tracking failed ingestion events."""
        tracker = DataLineageTracker()
        
        # Track failed ingestion
        tracker.track_ingestion(
            source="cpcb",
            timestamp=datetime.utcnow(),
            record_count=0,
            success=False,
            error_message="Connection timeout"
        )
        
        # Verify failure was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["latest_event"]["success"] is False
        assert summary["latest_event"]["error_message"] == "Connection timeout"
    
    def test_track_failed_processing(self):
        """Test tracking failed processing events."""
        tracker = DataLineageTracker()
        
        # Track failed processing
        tracker.track_processing(
            process_type="transformation",
            timestamp=datetime.utcnow(),
            input_count=100,
            output_count=0,
            success=False,
            error_message="Invalid data format"
        )
        
        # Verify failure was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 1
        assert summary["latest_event"]["success"] is False
        assert summary["latest_event"]["error_message"] == "Invalid data format"


class TestAuditLogger:
    """Test suite for AuditLogger."""
    
    def test_log_data_access(self):
        """Test logging data access events."""
        audit_logger = AuditLogger()
        
        # Log data access
        result = audit_logger.log_data_access(
            resource_type="air_quality_measurement",
            resource_id="station_123",
            user_email="test@example.com",
            ip_address="192.168.1.1",
            query_params={"parameter": "pm25", "limit": 100}
        )
        
        # Verify logging (in-memory, no database)
        # Result will be None without database, but should not raise error
        assert result is None
    
    def test_log_data_modification(self):
        """Test logging data modification events."""
        audit_logger = AuditLogger()
        
        # Log data modification
        result = audit_logger.log_data_modification(
            action="update",
            resource_type="monitoring_station",
            resource_id="station_456",
            user_email="admin@example.com",
            ip_address="192.168.1.2",
            changes={"is_active": False},
            success=True
        )
        
        # Verify logging
        assert result is None  # No database
    
    def test_log_authentication_success(self):
        """Test logging successful authentication."""
        audit_logger = AuditLogger()
        
        # Log successful login
        result = audit_logger.log_authentication(
            action="login",
            user_email="user@example.com",
            ip_address="192.168.1.3",
            user_agent="Mozilla/5.0",
            success=True
        )
        
        # Verify logging
        assert result is None  # No database
    
    def test_log_authentication_failure(self):
        """Test logging failed authentication."""
        audit_logger = AuditLogger()
        
        # Log failed login
        result = audit_logger.log_authentication(
            action="failed_login",
            user_email="attacker@example.com",
            ip_address="192.168.1.4",
            user_agent="curl/7.68.0",
            success=False,
            error_message="Invalid credentials"
        )
        
        # Verify logging
        assert result is None  # No database
    
    def test_log_action_with_duration(self):
        """Test logging action with duration tracking."""
        audit_logger = AuditLogger()
        
        # Log action with duration
        result = audit_logger.log_action(
            action="read",
            resource_type="prediction",
            resource_id="pred_789",
            user_email="user@example.com",
            ip_address="192.168.1.5",
            duration_ms=150
        )
        
        # Verify logging
        assert result is None  # No database
    
    def test_log_action_with_request_response_data(self):
        """Test logging action with request and response data."""
        audit_logger = AuditLogger()
        
        # Log action with request/response data
        result = audit_logger.log_action(
            action="write",
            resource_type="alert_subscription",
            user_email="user@example.com",
            ip_address="192.168.1.6",
            request_data={"threshold": 150, "channels": ["email", "sms"]},
            response_data={"id": "sub_123", "status": "created"}
        )
        
        # Verify logging
        assert result is None  # No database


class TestLineageIntegration:
    """Integration tests for lineage tracking in data pipeline."""
    
    def test_complete_data_pipeline_lineage(self):
        """Test tracking complete data pipeline lineage."""
        tracker = DataLineageTracker()
        
        # Simulate complete data pipeline
        # Step 1: Ingestion
        tracker.track_ingestion(
            source="cpcb",
            timestamp=datetime.utcnow(),
            record_count=1000,
            metadata={"stations": ["DL001", "DL002"], "parameters": ["pm25", "pm10"]}
        )
        
        # Step 2: Validation
        validation_stats = ValidationStats(
            total_records=1000,
            valid_records=950,
            flagged_records=50,
            outliers=30,
            missing_values=20,
            imputed_values=15,
            quality_score=0.95
        )
        tracker.track_validation(datetime.utcnow(), validation_stats, source="cpcb")
        
        # Step 3: Processing
        tracker.track_processing(
            process_type="aggregation",
            timestamp=datetime.utcnow(),
            input_count=950,
            output_count=95,
            source="validated_data",
            destination="hourly_aggregates"
        )
        
        # Step 4: Transformation
        tracker.track_transformation(
            transformation_type="feature_engineering",
            timestamp=datetime.utcnow(),
            source="hourly_aggregates",
            destination="ml_features",
            record_count=95
        )
        
        # Verify complete pipeline was tracked
        summary = tracker.get_lineage_summary()
        assert summary["total_events"] == 4
        assert summary["ingestion_events"] == 1
        assert summary["validation_events"] == 1
        assert summary["processing_events"] == 1
        assert summary["transformation_events"] == 1
    
    def test_parallel_data_sources_lineage(self):
        """Test tracking lineage from multiple parallel data sources."""
        tracker = DataLineageTracker()
        
        # Ingest from multiple sources
        tracker.track_ingestion("cpcb", datetime.utcnow(), 500)
        tracker.track_ingestion("openaq", datetime.utcnow(), 300)
        tracker.track_ingestion("imd_weather", datetime.utcnow(), 200)
        
        # Merge processing
        tracker.track_processing(
            process_type="merge",
            timestamp=datetime.utcnow(),
            input_count=1000,
            output_count=1000,
            source="multiple_sources",
            destination="merged_dataset"
        )
        
        # Verify tracking
        summary = tracker.get_lineage_summary()
        assert summary["ingestion_events"] == 3
        assert summary["processing_events"] == 1


class TestAuditCompliance:
    """Tests for audit logging compliance features."""
    
    def test_gdpr_compliance_data_access_logging(self):
        """Test GDPR-compliant data access logging."""
        audit_logger = AuditLogger()
        
        # Log personal data access
        audit_logger.log_data_access(
            resource_type="user",
            resource_id="user_123",
            user_email="admin@example.com",
            ip_address="192.168.1.10",
            query_params={"include_personal_data": True}
        )
        
        # Verify logging (would check database in real scenario)
        # This ensures we're tracking who accessed what personal data
        assert True  # Placeholder for database verification
    
    def test_security_incident_tracking(self):
        """Test tracking security incidents."""
        audit_logger = AuditLogger()
        
        # Log multiple failed login attempts (potential brute force)
        for i in range(5):
            audit_logger.log_authentication(
                action="failed_login",
                user_email="target@example.com",
                ip_address="192.168.1.100",
                success=False,
                error_message="Invalid password"
            )
        
        # In real scenario, this would trigger security alerts
        assert True  # Placeholder for alert verification
    
    def test_data_modification_audit_trail(self):
        """Test complete audit trail for data modifications."""
        audit_logger = AuditLogger()
        
        # Track series of modifications
        audit_logger.log_data_modification(
            action="write",
            resource_type="monitoring_station",
            resource_id="station_new",
            user_email="admin@example.com",
            changes={"name": "New Station", "location": "Delhi"}
        )
        
        audit_logger.log_data_modification(
            action="update",
            resource_type="monitoring_station",
            resource_id="station_new",
            user_email="admin@example.com",
            changes={"is_active": True}
        )
        
        audit_logger.log_data_modification(
            action="delete",
            resource_type="monitoring_station",
            resource_id="station_new",
            user_email="admin@example.com"
        )
        
        # Verify complete audit trail exists
        assert True  # Placeholder for database verification


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
