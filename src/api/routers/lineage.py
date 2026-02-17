"""
API endpoints for data lineage tracking and audit logs.
Provides access to lineage records and audit logs for compliance and debugging.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from src.api.database import get_db
from src.api.schemas import (
    LineageRecordResponse,
    LineageChainResponse,
    LineageSummaryResponse,
    AuditLogResponse,
    UserActivitySummaryResponse
)
from src.data.quality_validator import DataLineageTracker
from src.utils.audit_logger import AuditLogger

router = APIRouter(prefix="/lineage", tags=["lineage"])


@router.get("/records", response_model=List[LineageRecordResponse])
async def get_lineage_records(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    source: Optional[str] = Query(None, description="Filter by source"),
    start_time: Optional[datetime] = Query(None, description="Start time for filtering"),
    end_time: Optional[datetime] = Query(None, description="End time for filtering"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get data lineage records with optional filters.
    
    Returns a list of lineage records showing data flow through the system.
    """
    try:
        tracker = DataLineageTracker(db_session=db)
        records = tracker.query_lineage(
            event_type=event_type,
            source=source,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        
        return records
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve lineage records: {str(e)}")


@router.get("/chain/{event_id}", response_model=LineageChainResponse)
async def get_lineage_chain(
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete lineage chain for a specific event.
    
    Returns the full chain of events from root to the specified event,
    showing the complete data provenance.
    """
    try:
        tracker = DataLineageTracker(db_session=db)
        chain = tracker.get_lineage_chain(event_id)
        
        if not chain:
            raise HTTPException(status_code=404, detail="Lineage chain not found")
        
        return {
            "event_id": event_id,
            "chain_length": len(chain),
            "events": chain
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve lineage chain: {str(e)}")


@router.get("/summary", response_model=LineageSummaryResponse)
async def get_lineage_summary(
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    days: int = Query(7, ge=1, le=90, description="Number of days to include"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get summary statistics for data lineage.
    
    Returns aggregated statistics about data flow and processing events.
    """
    try:
        tracker = DataLineageTracker(db_session=db, session_id=session_id)
        summary = tracker.get_lineage_summary()
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve lineage summary: {str(e)}")


@router.get("/audit/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_time: Optional[datetime] = Query(None, description="Start time for filtering"),
    end_time: Optional[datetime] = Query(None, description="End time for filtering"),
    success_only: bool = Query(False, description="Only return successful actions"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get audit logs with optional filters.
    
    Returns a list of audit log entries for compliance and security monitoring.
    """
    try:
        audit_logger = AuditLogger(db_session=db)
        logs = audit_logger.query_audit_logs(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            start_time=start_time,
            end_time=end_time,
            success_only=success_only,
            limit=limit
        )
        
        return logs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit logs: {str(e)}")


@router.get("/audit/user/{user_id}/activity", response_model=UserActivitySummaryResponse)
async def get_user_activity_summary(
    user_id: UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get activity summary for a specific user.
    
    Returns aggregated statistics about user actions and resource access.
    """
    try:
        audit_logger = AuditLogger(db_session=db)
        summary = audit_logger.get_user_activity_summary(user_id, days)
        
        if not summary:
            raise HTTPException(status_code=404, detail="User activity not found")
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user activity: {str(e)}")


@router.get("/audit/recent-failures", response_model=List[AuditLogResponse])
async def get_recent_failures(
    hours: int = Query(24, ge=1, le=168, description="Number of hours to look back"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent failed actions for security monitoring.
    
    Returns audit logs of failed actions within the specified time period.
    """
    try:
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        audit_logger = AuditLogger(db_session=db)
        logs = audit_logger.query_audit_logs(
            start_time=start_time,
            success_only=False,
            limit=limit
        )
        
        # Filter to only failed actions
        failed_logs = [log for log in logs if not log.get("success", True)]
        
        return failed_logs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve recent failures: {str(e)}")
