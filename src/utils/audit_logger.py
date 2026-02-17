"""
Audit logging utility for security and compliance.
Tracks all data access, modifications, and user actions.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
import json

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Audit logger for tracking user actions and data access.
    
    Provides comprehensive audit logging for:
    - User authentication and authorization
    - Data access (read operations)
    - Data modifications (write, update, delete)
    - API requests and responses
    - System events
    """
    
    def __init__(self, db_session=None):
        """
        Initialize audit logger.
        
        Args:
            db_session: Database session for persistence (optional)
        """
        self.db = db_session
    
    def log_action(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None
    ) -> Optional[str]:
        """
        Log an audit event.
        
        Args:
            action: Action performed (read, write, update, delete, login, logout)
            resource_type: Type of resource accessed (user, station, measurement, prediction)
            resource_id: Identifier of the resource
            user_id: UUID of the user performing the action
            user_email: Email of the user
            ip_address: IP address of the request
            user_agent: User agent string
            success: Whether the action was successful
            error_message: Error message if action failed
            request_data: Request data (will be JSON serialized)
            response_data: Response data (will be JSON serialized)
            duration_ms: Duration of the action in milliseconds
            
        Returns:
            Audit log ID if persisted to database, None otherwise
        """
        timestamp = datetime.utcnow()
        
        # Log to application logger
        log_message = (
            f"AUDIT: {action} on {resource_type}"
            f"{f'/{resource_id}' if resource_id else ''} "
            f"by {user_email or user_id or 'anonymous'} "
            f"from {ip_address or 'unknown'} "
            f"- {'SUCCESS' if success else 'FAILED'}"
        )
        
        if success:
            logger.info(log_message)
        else:
            logger.warning(f"{log_message}: {error_message}")
        
        # Persist to database if session available
        if self.db:
            try:
                from src.api.models import AuditLog
                
                audit_log = AuditLog(
                    timestamp=timestamp,
                    user_id=user_id,
                    user_email=user_email,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=success,
                    error_message=error_message,
                    request_data=json.dumps(request_data) if request_data else None,
                    response_data=json.dumps(response_data) if response_data else None,
                    duration_ms=duration_ms
                )
                
                self.db.add(audit_log)
                self.db.commit()
                self.db.refresh(audit_log)
                
                logger.debug(f"Persisted audit log to database: {audit_log.id}")
                return str(audit_log.id)
                
            except Exception as e:
                logger.error(f"Failed to persist audit log: {e}")
                if self.db:
                    self.db.rollback()
        
        return None
    
    def log_data_access(
        self,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        query_params: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Log data access event.
        
        Args:
            resource_type: Type of resource accessed
            resource_id: Identifier of the resource
            user_id: UUID of the user
            user_email: Email of the user
            ip_address: IP address of the request
            query_params: Query parameters used
            
        Returns:
            Audit log ID if persisted
        """
        return self.log_action(
            action="read",
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            request_data=query_params
        )
    
    def log_data_modification(
        self,
        action: str,  # write, update, delete
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Log data modification event.
        
        Args:
            action: Type of modification (write, update, delete)
            resource_type: Type of resource modified
            resource_id: Identifier of the resource
            user_id: UUID of the user
            user_email: Email of the user
            ip_address: IP address of the request
            changes: Changes made to the resource
            success: Whether modification was successful
            error_message: Error message if modification failed
            
        Returns:
            Audit log ID if persisted
        """
        return self.log_action(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            success=success,
            error_message=error_message,
            request_data=changes
        )
    
    def log_authentication(
        self,
        action: str,  # login, logout, failed_login
        user_email: str,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Log authentication event.
        
        Args:
            action: Authentication action (login, logout, failed_login)
            user_email: Email of the user
            user_id: UUID of the user (if available)
            ip_address: IP address of the request
            user_agent: User agent string
            success: Whether authentication was successful
            error_message: Error message if authentication failed
            
        Returns:
            Audit log ID if persisted
        """
        return self.log_action(
            action=action,
            resource_type="authentication",
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
    
    def query_audit_logs(
        self,
        user_id: Optional[UUID] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        success_only: bool = False,
        limit: int = 100
    ) -> list:
        """
        Query audit logs with filters.
        
        Args:
            user_id: Filter by user ID
            action: Filter by action type
            resource_type: Filter by resource type
            start_time: Filter by start time
            end_time: Filter by end time
            success_only: Only return successful actions
            limit: Maximum number of records to return
            
        Returns:
            List of matching audit log records
        """
        if not self.db:
            logger.warning("Database session not available for audit log query")
            return []
        
        try:
            from src.api.models import AuditLog
            from sqlalchemy import select, and_
            
            conditions = []
            
            if user_id:
                conditions.append(AuditLog.user_id == user_id)
            
            if action:
                conditions.append(AuditLog.action == action)
            
            if resource_type:
                conditions.append(AuditLog.resource_type == resource_type)
            
            if start_time:
                conditions.append(AuditLog.timestamp >= start_time)
            
            if end_time:
                conditions.append(AuditLog.timestamp <= end_time)
            
            if success_only:
                conditions.append(AuditLog.success == True)
            
            stmt = select(AuditLog)
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
            
            stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(limit)
            
            result = self.db.execute(stmt)
            logs = result.scalars().all()
            
            return [
                {
                    "id": str(log.id),
                    "timestamp": log.timestamp.isoformat(),
                    "user_id": str(log.user_id) if log.user_id else None,
                    "user_email": log.user_email,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "ip_address": log.ip_address,
                    "success": log.success,
                    "error_message": log.error_message,
                    "duration_ms": log.duration_ms
                }
                for log in logs
            ]
            
        except Exception as e:
            logger.error(f"Failed to query audit logs: {e}")
            return []
    
    def get_user_activity_summary(
        self,
        user_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get activity summary for a user.
        
        Args:
            user_id: UUID of the user
            days: Number of days to include in summary
            
        Returns:
            Dictionary with activity statistics
        """
        if not self.db:
            logger.warning("Database session not available for activity summary")
            return {}
        
        try:
            from src.api.models import AuditLog
            from sqlalchemy import select, func
            from datetime import timedelta
            
            start_time = datetime.utcnow() - timedelta(days=days)
            
            # Count actions by type
            stmt = select(
                AuditLog.action,
                func.count(AuditLog.id).label("count")
            ).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.timestamp >= start_time
                )
            ).group_by(AuditLog.action)
            
            result = self.db.execute(stmt)
            action_counts = {row.action: row.count for row in result}
            
            # Count resource types accessed
            stmt = select(
                AuditLog.resource_type,
                func.count(AuditLog.id).label("count")
            ).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.timestamp >= start_time
                )
            ).group_by(AuditLog.resource_type)
            
            result = self.db.execute(stmt)
            resource_counts = {row.resource_type: row.count for row in result}
            
            # Count failures
            stmt = select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.timestamp >= start_time,
                    AuditLog.success == False
                )
            )
            
            result = self.db.execute(stmt)
            failure_count = result.scalar()
            
            return {
                "user_id": str(user_id),
                "period_days": days,
                "total_actions": sum(action_counts.values()),
                "actions_by_type": action_counts,
                "resources_accessed": resource_counts,
                "failed_actions": failure_count
            }
            
        except Exception as e:
            logger.error(f"Failed to get user activity summary: {e}")
            return {}


# Convenience function for creating audit logger
def get_audit_logger(db_session=None) -> AuditLogger:
    """
    Get an audit logger instance.
    
    Args:
        db_session: Database session for persistence
        
    Returns:
        AuditLogger instance
    """
    return AuditLogger(db_session)
