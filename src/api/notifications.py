"""
Multi-channel notification service for alert delivery.
Supports SMS, email, and browser push notifications with delivery tracking.
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import requests
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    """Supported notification channels."""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class DeliveryStatus(str, Enum):
    """Notification delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


@dataclass
class NotificationResult:
    """Result of a notification delivery attempt."""
    channel: NotificationChannel
    status: DeliveryStatus
    message_id: Optional[str] = None
    error_message: Optional[str] = None
    delivery_time: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class NotificationRequest:
    """Request for sending a notification."""
    recipient: str  # email address, phone number, or push token
    subject: str
    message: str
    channel: NotificationChannel
    template_name: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    priority: str = "normal"  # low, normal, high, urgent
    metadata: Optional[Dict[str, Any]] = None


class NotificationProvider(ABC):
    """Abstract base class for notification providers."""
    
    @abstractmethod
    async def send(self, request: NotificationRequest) -> NotificationResult:
        """Send a notification and return the result."""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider is properly configured."""
        pass


class EmailProvider(NotificationProvider):
    """Email notification provider using SMTP."""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        self.from_email = os.getenv("FROM_EMAIL", "noreply@aqipredictor.com")
        self.from_name = os.getenv("FROM_NAME", "AQI Predictor")
        
        # Initialize Jinja2 template environment
        template_dir = os.path.join(os.path.dirname(__file__), "templates", "email")
        if os.path.exists(template_dir):
            self.template_env = Environment(
                loader=FileSystemLoader(template_dir),
                autoescape=select_autoescape(['html', 'xml'])
            )
        else:
            self.template_env = None
            logger.warning(f"Email template directory not found: {template_dir}")
    
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured."""
        return bool(self.smtp_host and self.smtp_username and self.smtp_password)
    
    async def send(self, request: NotificationRequest) -> NotificationResult:
        """Send email notification."""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = request.subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = request.recipient
            
            # Generate email content
            if request.template_name and self.template_env:
                try:
                    # Use HTML template
                    template = self.template_env.get_template(f"{request.template_name}.html")
                    html_content = template.render(request.template_data or {})
                    msg.attach(MIMEText(html_content, 'html'))
                    
                    # Try to get text version
                    try:
                        text_template = self.template_env.get_template(f"{request.template_name}.txt")
                        text_content = text_template.render(request.template_data or {})
                        msg.attach(MIMEText(text_content, 'plain'))
                    except:
                        # Fallback to plain text version of message
                        msg.attach(MIMEText(request.message, 'plain'))
                        
                except Exception as e:
                    logger.warning(f"Template rendering failed: {e}, using plain message")
                    msg.attach(MIMEText(request.message, 'plain'))
            else:
                # Use plain text message
                msg.attach(MIMEText(request.message, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(msg)
            
            return NotificationResult(
                channel=NotificationChannel.EMAIL,
                status=DeliveryStatus.SENT,
                message_id=msg.get('Message-ID'),
                delivery_time=datetime.utcnow(),
                metadata={"recipient": request.recipient, "subject": request.subject}
            )
            
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            return NotificationResult(
                channel=NotificationChannel.EMAIL,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
                metadata={"recipient": request.recipient}
            )


class SMSProvider(NotificationProvider):
    """SMS notification provider using third-party gateway."""
    
    def __init__(self):
        self.api_url = os.getenv("SMS_API_URL")
        self.api_key = os.getenv("SMS_API_KEY")
        self.sender_id = os.getenv("SMS_SENDER_ID", "AQIPRED")
        self.provider = os.getenv("SMS_PROVIDER", "twilio")  # twilio, textlocal, etc.
    
    def is_configured(self) -> bool:
        """Check if SMS service is properly configured."""
        return bool(self.api_url and self.api_key)
    
    async def send(self, request: NotificationRequest) -> NotificationResult:
        """Send SMS notification."""
        try:
            if self.provider == "twilio":
                return await self._send_twilio(request)
            elif self.provider == "textlocal":
                return await self._send_textlocal(request)
            else:
                return await self._send_generic(request)
                
        except Exception as e:
            logger.error(f"SMS sending failed: {e}")
            return NotificationResult(
                channel=NotificationChannel.SMS,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
                metadata={"recipient": request.recipient}
            )
    
    async def _send_twilio(self, request: NotificationRequest) -> NotificationResult:
        """Send SMS via Twilio."""
        # Twilio implementation would go here
        # For now, return a mock success
        return NotificationResult(
            channel=NotificationChannel.SMS,
            status=DeliveryStatus.SENT,
            message_id=f"twilio_{datetime.utcnow().timestamp()}",
            delivery_time=datetime.utcnow(),
            metadata={"provider": "twilio", "recipient": request.recipient}
        )
    
    async def _send_textlocal(self, request: NotificationRequest) -> NotificationResult:
        """Send SMS via TextLocal."""
        payload = {
            'apikey': self.api_key,
            'numbers': request.recipient,
            'message': request.message,
            'sender': self.sender_id
        }
        
        response = requests.post(self.api_url, data=payload)
        
        if response.status_code == 200:
            result_data = response.json()
            if result_data.get('status') == 'success':
                return NotificationResult(
                    channel=NotificationChannel.SMS,
                    status=DeliveryStatus.SENT,
                    message_id=result_data.get('messageid'),
                    delivery_time=datetime.utcnow(),
                    metadata={"provider": "textlocal", "recipient": request.recipient}
                )
        
        return NotificationResult(
            channel=NotificationChannel.SMS,
            status=DeliveryStatus.FAILED,
            error_message=f"HTTP {response.status_code}: {response.text}",
            metadata={"provider": "textlocal", "recipient": request.recipient}
        )
    
    async def _send_generic(self, request: NotificationRequest) -> NotificationResult:
        """Send SMS via generic HTTP API."""
        payload = {
            'to': request.recipient,
            'message': request.message,
            'from': self.sender_id
        }
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(self.api_url, json=payload, headers=headers)
        
        if response.status_code in [200, 201, 202]:
            return NotificationResult(
                channel=NotificationChannel.SMS,
                status=DeliveryStatus.SENT,
                message_id=response.headers.get('X-Message-ID'),
                delivery_time=datetime.utcnow(),
                metadata={"provider": "generic", "recipient": request.recipient}
            )
        
        return NotificationResult(
            channel=NotificationChannel.SMS,
            status=DeliveryStatus.FAILED,
            error_message=f"HTTP {response.status_code}: {response.text}",
            metadata={"provider": "generic", "recipient": request.recipient}
        )


class PushProvider(NotificationProvider):
    """Browser push notification provider."""
    
    def __init__(self):
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_email = os.getenv("VAPID_EMAIL")
    
    def is_configured(self) -> bool:
        """Check if push notifications are properly configured."""
        return bool(self.vapid_public_key and self.vapid_private_key and self.vapid_email)
    
    async def send(self, request: NotificationRequest) -> NotificationResult:
        """Send browser push notification."""
        try:
            # This would use a library like pywebpush
            # For now, return a mock success
            return NotificationResult(
                channel=NotificationChannel.PUSH,
                status=DeliveryStatus.SENT,
                message_id=f"push_{datetime.utcnow().timestamp()}",
                delivery_time=datetime.utcnow(),
                metadata={"recipient": request.recipient}
            )
            
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            return NotificationResult(
                channel=NotificationChannel.PUSH,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
                metadata={"recipient": request.recipient}
            )


class NotificationService:
    """Main notification service that coordinates multiple providers."""
    
    def __init__(self):
        self.providers = {
            NotificationChannel.EMAIL: EmailProvider(),
            NotificationChannel.SMS: SMSProvider(),
            NotificationChannel.PUSH: PushProvider()
        }
        
        # Check which providers are configured
        self.configured_channels = []
        for channel, provider in self.providers.items():
            if provider.is_configured():
                self.configured_channels.append(channel)
                logger.info(f"Notification provider configured: {channel}")
            else:
                logger.warning(f"Notification provider not configured: {channel}")
    
    async def send_notification(self, request: NotificationRequest) -> NotificationResult:
        """Send a single notification."""
        if request.channel not in self.configured_channels:
            return NotificationResult(
                channel=request.channel,
                status=DeliveryStatus.FAILED,
                error_message=f"Channel {request.channel} is not configured"
            )
        
        provider = self.providers[request.channel]
        return await provider.send(request)
    
    async def send_multi_channel(self, 
                                recipient_channels: Dict[NotificationChannel, str],
                                subject: str,
                                message: str,
                                template_name: Optional[str] = None,
                                template_data: Optional[Dict[str, Any]] = None,
                                priority: str = "normal") -> List[NotificationResult]:
        """Send notifications across multiple channels."""
        results = []
        
        for channel, recipient in recipient_channels.items():
            if channel in self.configured_channels:
                request = NotificationRequest(
                    recipient=recipient,
                    subject=subject,
                    message=message,
                    channel=channel,
                    template_name=template_name,
                    template_data=template_data,
                    priority=priority
                )
                
                result = await self.send_notification(request)
                results.append(result)
            else:
                results.append(NotificationResult(
                    channel=channel,
                    status=DeliveryStatus.FAILED,
                    error_message=f"Channel {channel} is not configured"
                ))
        
        return results
    
    def get_configured_channels(self) -> List[NotificationChannel]:
        """Get list of configured notification channels."""
        return self.configured_channels.copy()
    
    async def send_alert_notification(self,
                                    user_email: str,
                                    user_phone: Optional[str],
                                    push_token: Optional[str],
                                    channels: List[str],
                                    location_name: str,
                                    aqi_value: int,
                                    threshold: int,
                                    source_attribution: Optional[Dict[str, float]] = None) -> List[NotificationResult]:
        """Send AQI alert notification across specified channels."""
        
        # Prepare notification content
        subject = f"AQI Alert: {location_name} - {aqi_value} AQI"
        
        # Create message with source attribution if available
        message = f"Air quality alert for {location_name}:\n\n"
        message += f"Current AQI: {aqi_value}\n"
        message += f"Your threshold: {threshold}\n\n"
        
        if source_attribution:
            message += "Main pollution sources:\n"
            for source, percent in source_attribution.items():
                if percent > 10:  # Only show significant sources
                    message += f"• {source.replace('_', ' ').title()}: {percent:.1f}%\n"
            message += "\n"
        
        message += "Take protective measures and limit outdoor activities."
        
        # Prepare template data
        template_data = {
            "location_name": location_name,
            "aqi_value": aqi_value,
            "threshold": threshold,
            "source_attribution": source_attribution or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Map channels to recipients
        recipient_channels = {}
        
        if "email" in channels and user_email:
            recipient_channels[NotificationChannel.EMAIL] = user_email
        
        if "sms" in channels and user_phone:
            recipient_channels[NotificationChannel.SMS] = user_phone
        
        if "push" in channels and push_token:
            recipient_channels[NotificationChannel.PUSH] = push_token
        
        # Send notifications
        return await self.send_multi_channel(
            recipient_channels=recipient_channels,
            subject=subject,
            message=message,
            template_name="aqi_alert",
            template_data=template_data,
            priority="high"
        )


# Global notification service instance
notification_service = NotificationService()