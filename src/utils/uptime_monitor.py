"""
Uptime monitoring and SLA tracking for AQI Predictor API.
Tracks service availability, downtime, and SLA compliance.
"""

import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import asyncio
from redis import Redis
import os
import json

logger = logging.getLogger(__name__)


@dataclass
class UptimeRecord:
    """Record of service uptime/downtime."""
    timestamp: datetime
    status: str  # "up" or "down"
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class SLAMetrics:
    """SLA metrics for a time period."""
    period_start: datetime
    period_end: datetime
    total_checks: int
    successful_checks: int
    failed_checks: int
    uptime_percent: float
    avg_response_time_ms: float
    max_response_time_ms: float
    downtime_minutes: float
    sla_target: float = 99.5
    sla_met: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['period_start'] = self.period_start.isoformat()
        data['period_end'] = self.period_end.isoformat()
        return data


class UptimeMonitor:
    """Monitors service uptime and tracks SLA compliance."""
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize uptime monitor.
        
        Args:
            redis_url: Redis connection URL
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = Redis.from_url(self.redis_url, decode_responses=True)
        
        # Configuration
        self.check_interval_seconds = int(os.getenv("UPTIME_CHECK_INTERVAL", "60"))
        self.sla_target_percent = float(os.getenv("SLA_TARGET_PERCENT", "99.5"))
        self.retention_days = int(os.getenv("UPTIME_RETENTION_DAYS", "90"))
        
        # Redis keys
        self.uptime_records_key = "aqi:uptime:records"
        self.current_status_key = "aqi:uptime:current_status"
        self.downtime_start_key = "aqi:uptime:downtime_start"
        self.sla_metrics_key = "aqi:uptime:sla_metrics"
        
        # Service start time
        self.service_start_time = datetime.utcnow()
    
    async def record_uptime_check(
        self,
        is_up: bool,
        response_time_ms: Optional[float] = None,
        error_message: Optional[str] = None
    ):
        """
        Record uptime check result.
        
        Args:
            is_up: Whether service is up
            response_time_ms: Response time in milliseconds
            error_message: Error message if down
        """
        try:
            record = UptimeRecord(
                timestamp=datetime.utcnow(),
                status="up" if is_up else "down",
                response_time_ms=response_time_ms,
                error_message=error_message
            )
            
            # Store record
            record_key = f"{self.uptime_records_key}:{int(time.time())}"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(
                    record_key,
                    timedelta(days=self.retention_days),
                    json.dumps(record.to_dict())
                )
            )
            
            # Update current status
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.set(self.current_status_key, "up" if is_up else "down")
            )
            
            # Track downtime
            if not is_up:
                # Check if this is start of downtime
                downtime_start = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis_client.get(self.downtime_start_key)
                )
                
                if not downtime_start:
                    # Start tracking downtime
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.redis_client.set(
                            self.downtime_start_key,
                            datetime.utcnow().isoformat()
                        )
                    )
                    logger.warning("Service downtime detected")
            else:
                # Check if recovering from downtime
                downtime_start = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis_client.get(self.downtime_start_key)
                )
                
                if downtime_start:
                    # Calculate downtime duration
                    start_time = datetime.fromisoformat(downtime_start)
                    downtime_duration = (datetime.utcnow() - start_time).total_seconds() / 60
                    
                    logger.info(f"Service recovered after {downtime_duration:.2f} minutes of downtime")
                    
                    # Clear downtime tracking
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.redis_client.delete(self.downtime_start_key)
                    )
            
        except Exception as e:
            logger.error(f"Failed to record uptime check: {e}")
    
    async def get_uptime_records(
        self,
        hours: int = 24
    ) -> List[UptimeRecord]:
        """
        Get uptime records for specified time period.
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            List of uptime records
        """
        try:
            cutoff_time = int((datetime.utcnow() - timedelta(hours=hours)).timestamp())
            pattern = f"{self.uptime_records_key}:*"
            
            keys = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.keys(pattern)
            )
            
            records = []
            for key in keys:
                try:
                    timestamp = int(key.split(':')[-1])
                    if timestamp >= cutoff_time:
                        data = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda k=key: self.redis_client.get(k)
                        )
                        
                        if data:
                            record_data = json.loads(data)
                            record_data['timestamp'] = datetime.fromisoformat(record_data['timestamp'])
                            records.append(UptimeRecord(**record_data))
                except (ValueError, KeyError, json.JSONDecodeError):
                    continue
            
            return sorted(records, key=lambda x: x.timestamp, reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get uptime records: {e}")
            return []
    
    async def calculate_sla_metrics(
        self,
        hours: int = 24
    ) -> SLAMetrics:
        """
        Calculate SLA metrics for specified time period.
        
        Args:
            hours: Number of hours to calculate for
            
        Returns:
            SLA metrics
        """
        try:
            period_end = datetime.utcnow()
            period_start = period_end - timedelta(hours=hours)
            
            # Get uptime records
            records = await self.get_uptime_records(hours=hours)
            
            if not records:
                # No data available
                return SLAMetrics(
                    period_start=period_start,
                    period_end=period_end,
                    total_checks=0,
                    successful_checks=0,
                    failed_checks=0,
                    uptime_percent=0.0,
                    avg_response_time_ms=0.0,
                    max_response_time_ms=0.0,
                    downtime_minutes=0.0,
                    sla_target=self.sla_target_percent,
                    sla_met=False
                )
            
            # Calculate metrics
            total_checks = len(records)
            successful_checks = sum(1 for r in records if r.status == "up")
            failed_checks = total_checks - successful_checks
            
            uptime_percent = (successful_checks / total_checks * 100) if total_checks > 0 else 0
            
            # Calculate response times
            response_times = [r.response_time_ms for r in records if r.response_time_ms is not None]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            
            # Calculate downtime
            downtime_minutes = 0.0
            current_downtime_start = None
            
            for record in sorted(records, key=lambda x: x.timestamp):
                if record.status == "down" and current_downtime_start is None:
                    current_downtime_start = record.timestamp
                elif record.status == "up" and current_downtime_start is not None:
                    downtime_duration = (record.timestamp - current_downtime_start).total_seconds() / 60
                    downtime_minutes += downtime_duration
                    current_downtime_start = None
            
            # If still in downtime
            if current_downtime_start is not None:
                downtime_duration = (period_end - current_downtime_start).total_seconds() / 60
                downtime_minutes += downtime_duration
            
            # Check SLA compliance
            sla_met = uptime_percent >= self.sla_target_percent
            
            metrics = SLAMetrics(
                period_start=period_start,
                period_end=period_end,
                total_checks=total_checks,
                successful_checks=successful_checks,
                failed_checks=failed_checks,
                uptime_percent=round(uptime_percent, 2),
                avg_response_time_ms=round(avg_response_time, 2),
                max_response_time_ms=round(max_response_time, 2),
                downtime_minutes=round(downtime_minutes, 2),
                sla_target=self.sla_target_percent,
                sla_met=sla_met
            )
            
            # Store metrics
            metrics_key = f"{self.sla_metrics_key}:{hours}h"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(
                    metrics_key,
                    timedelta(hours=1),
                    json.dumps(metrics.to_dict())
                )
            )
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate SLA metrics: {e}")
            raise
    
    async def get_current_status(self) -> Dict[str, Any]:
        """
        Get current service status.
        
        Returns:
            Current status information
        """
        try:
            # Get current status
            status = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.get(self.current_status_key)
            )
            
            # Get downtime start if applicable
            downtime_start = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.get(self.downtime_start_key)
            )
            
            current_downtime_minutes = 0.0
            if downtime_start:
                start_time = datetime.fromisoformat(downtime_start)
                current_downtime_minutes = (datetime.utcnow() - start_time).total_seconds() / 60
            
            # Calculate uptime since service start
            uptime_seconds = (datetime.utcnow() - self.service_start_time).total_seconds()
            
            return {
                "status": status or "unknown",
                "uptime_seconds": round(uptime_seconds, 2),
                "service_start_time": self.service_start_time.isoformat(),
                "current_downtime_minutes": round(current_downtime_minutes, 2) if current_downtime_minutes > 0 else None,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get current status: {e}")
            return {
                "status": "unknown",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


# Global uptime monitor instance
_uptime_monitor: Optional[UptimeMonitor] = None


def get_uptime_monitor() -> UptimeMonitor:
    """Get global uptime monitor instance."""
    global _uptime_monitor
    if _uptime_monitor is None:
        _uptime_monitor = UptimeMonitor()
    return _uptime_monitor
