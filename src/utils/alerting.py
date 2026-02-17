"""
System alerting and notification for operational issues.
Sends alerts for system anomalies, failures, and threshold violations.
"""

import logging
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import json
import asyncio
from redis import Redis

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertChannel(Enum):
    """Alert delivery channels."""
    EMAIL = "email"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    LOG = "log"


class Alert:
    """Represents a system alert."""
    
    def __init__(
        self,
        title: str,
        message: str,
        severity: AlertSeverity,
        component: str,
        metric: Optional[str] = None,
        current_value: Optional[float] = None,
        threshold: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize alert.
        
        Args:
            title: Alert title
            message: Alert message
            severity: Alert severity
            component: Component that triggered alert
            metric: Metric name
            current_value: Current metric value
            threshold: Threshold that was exceeded
            metadata: Additional metadata
        """
        self.title = title
        self.message = message
        self.severity = severity
        self.component = component
        self.metric = metric
        self.current_value = current_value
        self.threshold = threshold
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()
        self.alert_id = f"{component}_{metric}_{int(self.timestamp.timestamp())}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        return {
            "alert_id": self.alert_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity.value,
            "component": self.component,
            "metric": self.metric,
            "current_value": self.current_value,
            "threshold": self.threshold,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }


class AlertManager:
    """Manages system alerts and notifications."""
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize alert manager.
        
        Args:
            redis_url: Redis connection URL for alert deduplication
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = Redis.from_url(self.redis_url, decode_responses=True)
        
        # Alert configuration
        self.alert_cooldown_minutes = int(os.getenv("ALERT_COOLDOWN_MINUTES", "60"))
        self.email_enabled = os.getenv("ALERT_EMAIL_ENABLED", "false").lower() == "true"
        self.slack_enabled = os.getenv("ALERT_SLACK_ENABLED", "false").lower() == "true"
        
        # Email configuration
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.alert_from_email = os.getenv("ALERT_FROM_EMAIL", "alerts@aqi-predictor.com")
        self.alert_to_emails = os.getenv("ALERT_TO_EMAILS", "").split(",")
        
        # Slack configuration
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
    
    def should_send_alert(self, alert: Alert) -> bool:
        """
        Check if alert should be sent based on cooldown period.
        
        Args:
            alert: Alert to check
            
        Returns:
            True if alert should be sent
        """
        try:
            # Check if similar alert was sent recently
            cooldown_key = f"alert_cooldown:{alert.component}:{alert.metric}"
            last_sent = self.redis_client.get(cooldown_key)
            
            if last_sent:
                last_sent_time = datetime.fromisoformat(last_sent)
                cooldown_period = timedelta(minutes=self.alert_cooldown_minutes)
                
                if datetime.utcnow() - last_sent_time < cooldown_period:
                    logger.debug(f"Alert {alert.alert_id} suppressed due to cooldown")
                    return False
            
            # Set cooldown
            self.redis_client.setex(
                cooldown_key,
                timedelta(minutes=self.alert_cooldown_minutes),
                datetime.utcnow().isoformat()
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking alert cooldown: {e}")
            # Allow alert on error
            return True
    
    async def send_alert(
        self,
        alert: Alert,
        channels: Optional[List[AlertChannel]] = None
    ):
        """
        Send alert through specified channels.
        
        Args:
            alert: Alert to send
            channels: List of channels to use (defaults to all enabled)
        """
        # Check cooldown
        if not self.should_send_alert(alert):
            return
        
        # Default to all enabled channels
        if channels is None:
            channels = []
            if self.email_enabled:
                channels.append(AlertChannel.EMAIL)
            if self.slack_enabled:
                channels.append(AlertChannel.SLACK)
            channels.append(AlertChannel.LOG)  # Always log
        
        # Send through each channel
        for channel in channels:
            try:
                if channel == AlertChannel.EMAIL:
                    await self._send_email_alert(alert)
                elif channel == AlertChannel.SLACK:
                    await self._send_slack_alert(alert)
                elif channel == AlertChannel.LOG:
                    self._log_alert(alert)
                
            except Exception as e:
                logger.error(f"Failed to send alert via {channel.value}: {e}")
    
    async def _send_email_alert(self, alert: Alert):
        """Send alert via email."""
        if not self.email_enabled or not self.alert_to_emails:
            return
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            msg['From'] = self.alert_from_email
            msg['To'] = ", ".join(self.alert_to_emails)
            
            # Create email body
            text_body = self._format_alert_text(alert)
            html_body = self._format_alert_html(alert)
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._send_smtp_email(msg)
            )
            
            logger.info(f"Alert email sent: {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            raise
    
    def _send_smtp_email(self, msg: MIMEMultipart):
        """Send email via SMTP."""
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            if self.smtp_user and self.smtp_password:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
    
    async def _send_slack_alert(self, alert: Alert):
        """Send alert to Slack."""
        if not self.slack_enabled or not self.slack_webhook_url:
            return
        
        try:
            import aiohttp
            
            # Format Slack message
            color = {
                AlertSeverity.INFO: "#36a64f",
                AlertSeverity.WARNING: "#ff9900",
                AlertSeverity.CRITICAL: "#ff0000"
            }.get(alert.severity, "#808080")
            
            payload = {
                "attachments": [{
                    "color": color,
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                        {"title": "Component", "value": alert.component, "short": True}
                    ],
                    "footer": "AQI Predictor Monitoring",
                    "ts": int(alert.timestamp.timestamp())
                }]
            }
            
            if alert.metric:
                payload["attachments"][0]["fields"].append({
                    "title": "Metric",
                    "value": alert.metric,
                    "short": True
                })
            
            if alert.current_value is not None and alert.threshold is not None:
                payload["attachments"][0]["fields"].append({
                    "title": "Value / Threshold",
                    "value": f"{alert.current_value} / {alert.threshold}",
                    "short": True
                })
            
            # Send to Slack
            async with aiohttp.ClientSession() as session:
                async with session.post(self.slack_webhook_url, json=payload) as response:
                    if response.status != 200:
                        raise Exception(f"Slack API returned {response.status}")
            
            logger.info(f"Alert sent to Slack: {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            raise
    
    def _log_alert(self, alert: Alert):
        """Log alert to application logs."""
        log_level = {
            AlertSeverity.INFO: logging.INFO,
            AlertSeverity.WARNING: logging.WARNING,
            AlertSeverity.CRITICAL: logging.CRITICAL
        }.get(alert.severity, logging.WARNING)
        
        logger.log(
            log_level,
            f"ALERT: {alert.title} - {alert.message}",
            extra={'extra_fields': alert.to_dict()}
        )
    
    def _format_alert_text(self, alert: Alert) -> str:
        """Format alert as plain text."""
        lines = [
            f"Alert: {alert.title}",
            f"Severity: {alert.severity.value.upper()}",
            f"Component: {alert.component}",
            f"",
            f"Message: {alert.message}",
            f"",
            f"Timestamp: {alert.timestamp.isoformat()}",
        ]
        
        if alert.metric:
            lines.append(f"Metric: {alert.metric}")
        
        if alert.current_value is not None:
            lines.append(f"Current Value: {alert.current_value}")
        
        if alert.threshold is not None:
            lines.append(f"Threshold: {alert.threshold}")
        
        if alert.metadata:
            lines.append("")
            lines.append("Additional Information:")
            for key, value in alert.metadata.items():
                lines.append(f"  {key}: {value}")
        
        return "\n".join(lines)
    
    def _format_alert_html(self, alert: Alert) -> str:
        """Format alert as HTML."""
        severity_color = {
            AlertSeverity.INFO: "#36a64f",
            AlertSeverity.WARNING: "#ff9900",
            AlertSeverity.CRITICAL: "#ff0000"
        }.get(alert.severity, "#808080")
        
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .alert-box {{ border-left: 4px solid {severity_color}; padding: 15px; background-color: #f9f9f9; }}
                .alert-title {{ font-size: 18px; font-weight: bold; color: {severity_color}; }}
                .alert-info {{ margin-top: 10px; }}
                .alert-info dt {{ font-weight: bold; margin-top: 5px; }}
                .alert-info dd {{ margin-left: 20px; }}
            </style>
        </head>
        <body>
            <div class="alert-box">
                <div class="alert-title">{alert.title}</div>
                <p>{alert.message}</p>
                <dl class="alert-info">
                    <dt>Severity:</dt>
                    <dd>{alert.severity.value.upper()}</dd>
                    <dt>Component:</dt>
                    <dd>{alert.component}</dd>
                    <dt>Timestamp:</dt>
                    <dd>{alert.timestamp.isoformat()}</dd>
        """
        
        if alert.metric:
            html += f"<dt>Metric:</dt><dd>{alert.metric}</dd>"
        
        if alert.current_value is not None:
            html += f"<dt>Current Value:</dt><dd>{alert.current_value}</dd>"
        
        if alert.threshold is not None:
            html += f"<dt>Threshold:</dt><dd>{alert.threshold}</dd>"
        
        html += """
                </dl>
            </div>
        </body>
        </html>
        """
        
        return html


# Global alert manager instance
_alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> AlertManager:
    """Get global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager


async def send_system_alert(
    title: str,
    message: str,
    severity: AlertSeverity,
    component: str,
    **kwargs
):
    """
    Convenience function to send system alert.
    
    Args:
        title: Alert title
        message: Alert message
        severity: Alert severity
        component: Component name
        **kwargs: Additional alert parameters
    """
    alert = Alert(
        title=title,
        message=message,
        severity=severity,
        component=component,
        **kwargs
    )
    
    manager = get_alert_manager()
    await manager.send_alert(alert)
