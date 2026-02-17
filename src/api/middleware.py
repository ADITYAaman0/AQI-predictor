"""
Custom middleware for the AQI Predictor API.
Includes logging, rate limiting, security headers, and request processing middleware.
"""

import time
import logging
from typing import Callable, Optional
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
import json
import re
from uuid import UUID

from src.api.cache import cache_manager
from src.api.auth import verify_token, get_user_by_id
from src.api.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request/response logging."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {response.status_code} "
            f"processed in {process_time:.3f}s"
        )
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

class EnhancedRateLimitMiddleware(BaseHTTPMiddleware):
    """Enhanced middleware for API rate limiting with user-based limits."""
    
    def __init__(self, app, requests_per_hour: int = 1000, authenticated_requests_per_hour: int = 5000):
        super().__init__(app)
        self.requests_per_hour = requests_per_hour
        self.authenticated_requests_per_hour = authenticated_requests_per_hour
        self.window_size = 3600  # 1 hour in seconds
        self.security = HTTPBearer(auto_error=False)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and auth endpoints
        if request.url.path.startswith("/health") or request.url.path.startswith("/api/v1/auth"):
            return await call_next(request)
        
        # Get client identifier and determine rate limit
        client_id, rate_limit = await self._get_client_info(request)
        
        # Check rate limit
        if not await self._check_rate_limit(client_id, rate_limit):
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Maximum {rate_limit} requests per hour.",
                        "retry_after": 3600,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                },
                headers={"Retry-After": "3600"}
            )
        
        return await call_next(request)
    
    async def _get_client_info(self, request: Request) -> tuple[str, int]:
        """Get client identifier and appropriate rate limit."""
        # Try to get user from authorization header
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = verify_token(token, "access")
                user_id = payload.get("sub")
                if user_id:
                    return f"user:{user_id}", self.authenticated_requests_per_hour
            except Exception:
                # Invalid token, fall back to IP-based limiting
                pass
        
        # Fall back to IP-based rate limiting
        if request.client:
            return f"ip:{request.client.host}", self.requests_per_hour
        return "unknown", self.requests_per_hour
    
    async def _check_rate_limit(self, client_id: str, rate_limit: int) -> bool:
        """Check if client has exceeded rate limit."""
        try:
            # Use sliding window rate limiting with Redis
            current_time = int(time.time())
            window_start = current_time - self.window_size
            
            # Redis key for this client's requests
            key = f"rate_limit:{client_id}"
            
            if not cache_manager.client:
                # If Redis is not available, allow request (fail open)
                logger.warning("Redis not available for rate limiting")
                return True
            
            # Remove old entries and count current requests
            await cache_manager.client.zremrangebyscore(key, 0, window_start)
            current_requests = await cache_manager.client.zcard(key)
            
            if current_requests >= rate_limit:
                return False
            
            # Add current request
            await cache_manager.client.zadd(key, {str(current_time): current_time})
            await cache_manager.client.expire(key, self.window_size)
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Fail open - allow request if rate limiting fails
            return True

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add comprehensive security headers."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "font-src 'self'; "
            "object-src 'none'; "
            "media-src 'self'; "
            "frame-src 'none';"
        )
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=()"
        )
        
        return response

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Enhanced middleware for request validation and sanitization."""
    
    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB
        super().__init__(app)
        self.max_request_size = max_request_size
        self.suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # XSS
            r'javascript:',  # JavaScript URLs
            r'\bon(click|load|error|focus|blur|change|submit|keydown|keyup|mouseover|mouseout)\s*=',  # Specific JS event handlers
            r'union\s+select',  # SQL injection
            r'drop\s+table',  # SQL injection
            r'insert\s+into',  # SQL injection
            r'delete\s+from',  # SQL injection
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Validate request size
        if request.headers.get("content-length"):
            content_length = int(request.headers["content-length"])
            if content_length > self.max_request_size:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": f"Request body too large. Maximum size is {self.max_request_size // (1024*1024)}MB.",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }
                )
        
        # Validate content type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith("application/json") and not content_type.startswith("multipart/form-data"):
                return JSONResponse(
                    status_code=415,
                    content={
                        "error": {
                            "code": "UNSUPPORTED_MEDIA_TYPE",
                            "message": "Content-Type must be application/json or multipart/form-data",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }
                )
        
        # Basic input sanitization check
        if await self._contains_suspicious_content(request):
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "Request contains potentially malicious content"
                }
            )
        
        return await call_next(request)
    
    async def _contains_suspicious_content(self, request: Request) -> bool:
        """Check for suspicious patterns in request."""
        try:
            # Check URL path and query parameters
            url_str = str(request.url)
            for pattern in self.suspicious_patterns:
                if re.search(pattern, url_str, re.IGNORECASE):
                    logger.warning(f"Suspicious pattern detected in URL: {pattern}")
                    return True
            
            # Check headers
            for header_name, header_value in request.headers.items():
                if isinstance(header_value, str):
                    for pattern in self.suspicious_patterns:
                        if re.search(pattern, header_value, re.IGNORECASE):
                            logger.warning(f"Suspicious pattern detected in header {header_name}: {pattern}")
                            return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking suspicious content: {e}")
            return False

class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce HTTPS in production."""
    
    def __init__(self, app, enforce_https: bool = True):
        super().__init__(app)
        self.enforce_https = enforce_https
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip HTTPS enforcement in development
        if not self.enforce_https:
            return await call_next(request)
        
        # Check if request is HTTPS
        if request.url.scheme != "https":
            # Check for forwarded protocol headers (common in load balancers)
            forwarded_proto = request.headers.get("x-forwarded-proto")
            if forwarded_proto != "https":
                # Redirect to HTTPS
                https_url = request.url.replace(scheme="https")
                return JSONResponse(
                    status_code=301,
                    content={
                        "error": {
                            "code": "HTTPS_REQUIRED",
                            "message": "HTTPS is required for this API",
                            "redirect_url": str(https_url)
                        }
                    },
                    headers={"Location": str(https_url)}
                )
        
        return await call_next(request)

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for global error handling."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except HTTPException:
            # Re-raise HTTP exceptions (handled by FastAPI)
            raise
        except Exception as e:
            # Log unexpected errors
            logger.error(f"Unexpected error processing request: {e}", exc_info=True)
            
            # Return generic error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred. Please try again later.",
                        "timestamp": datetime.utcnow().isoformat(),
                        "request_id": getattr(request.state, 'request_id', None)
                    }
                }
            )

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add unique request IDs for tracing."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        import uuid
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response

class CacheHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add appropriate cache headers to API responses."""
    
    def __init__(self, app):
        super().__init__(app)
        # Define cache policies for different endpoints
        self.cache_policies = {
            "/api/v1/forecast/current/": {"max_age": 300, "public": True},  # 5 minutes
            "/api/v1/forecast/24h/": {"max_age": 3600, "public": True},     # 1 hour
            "/api/v1/forecast/spatial": {"max_age": 3600, "public": True},  # 1 hour
            "/api/v1/attribution/": {"max_age": 1800, "public": True},      # 30 minutes
            "/api/v1/data/stations": {"max_age": 86400, "public": True},    # 24 hours
            "/health": {"max_age": 60, "public": True},                     # 1 minute
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Skip cache headers for non-GET requests
        if request.method != "GET":
            return response
        
        # Skip cache headers for error responses
        if response.status_code >= 400:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response
        
        # Find matching cache policy
        cache_policy = None
        request_path = request.url.path
        
        for pattern, policy in self.cache_policies.items():
            if request_path.startswith(pattern):
                cache_policy = policy
                break
        
        if cache_policy:
            # Build Cache-Control header
            cache_control_parts = []
            
            if cache_policy.get("public", False):
                cache_control_parts.append("public")
            else:
                cache_control_parts.append("private")
            
            if "max_age" in cache_policy:
                cache_control_parts.append(f"max-age={cache_policy['max_age']}")
            
            # Add must-revalidate for dynamic content
            if request_path.startswith("/api/v1/forecast/"):
                cache_control_parts.append("must-revalidate")
            
            response.headers["Cache-Control"] = ", ".join(cache_control_parts)
            
            # Add ETag based on URL and timestamp (simpler approach)
            import hashlib
            from datetime import datetime, timezone
            etag_content = f"{request.url.path}:{datetime.now(timezone.utc).strftime('%Y-%m-%d:%H')}"
            etag = hashlib.md5(etag_content.encode()).hexdigest()
            response.headers["ETag"] = f'"{etag}"'
            
            # Check if client has matching ETag
            if_none_match = request.headers.get("if-none-match")
            if if_none_match and if_none_match.strip('"') == etag:
                # Return 304 Not Modified
                from fastapi.responses import Response as FastAPIResponse
                return FastAPIResponse(status_code=304, headers=response.headers)
            
            # Add Last-Modified header
            response.headers["Last-Modified"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
        
        else:
            # Default cache policy for other endpoints
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        
        return response

# Legacy middleware for backward compatibility
RateLimitMiddleware = EnhancedRateLimitMiddleware