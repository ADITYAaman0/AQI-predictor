"""
OpenTelemetry distributed tracing configuration for AQI Predictor API.
Provides request tracing, span creation, and trace context propagation.
"""

import logging
import os
from typing import Dict, Any, Optional
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.trace import Status, StatusCode, SpanKind
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

logger = logging.getLogger(__name__)

# Global tracer instance
_tracer: Optional[trace.Tracer] = None


def setup_tracing(
    service_name: str = "aqi-predictor-api",
    service_version: str = "1.0.0",
    otlp_endpoint: Optional[str] = None,
    enable_console_export: bool = False
) -> trace.Tracer:
    """
    Set up OpenTelemetry distributed tracing.
    
    Args:
        service_name: Name of the service
        service_version: Version of the service
        otlp_endpoint: OTLP collector endpoint (e.g., "http://localhost:4317")
        enable_console_export: Whether to export traces to console
        
    Returns:
        Configured tracer instance
    """
    global _tracer
    
    try:
        # Create resource with service information
        resource = Resource(attributes={
            SERVICE_NAME: service_name,
            SERVICE_VERSION: service_version,
            "deployment.environment": os.getenv("ENVIRONMENT", "development")
        })
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        
        # Add span processors
        if otlp_endpoint or os.getenv("OTLP_ENDPOINT"):
            # Export to OTLP collector (Jaeger, Zipkin, etc.)
            endpoint = otlp_endpoint or os.getenv("OTLP_ENDPOINT")
            otlp_exporter = OTLPSpanExporter(endpoint=endpoint)
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info(f"OTLP tracing enabled: {endpoint}")
        
        if enable_console_export or os.getenv("TRACING_CONSOLE_EXPORT", "false").lower() == "true":
            # Export to console for debugging
            console_exporter = ConsoleSpanExporter()
            provider.add_span_processor(BatchSpanProcessor(console_exporter))
            logger.info("Console tracing enabled")
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        # Create tracer
        _tracer = trace.get_tracer(__name__)
        
        logger.info(f"OpenTelemetry tracing initialized for {service_name}")
        
        return _tracer
        
    except Exception as e:
        logger.error(f"Failed to initialize tracing: {e}")
        # Return no-op tracer on failure
        return trace.get_tracer(__name__)


def instrument_fastapi(app):
    """
    Instrument FastAPI application with OpenTelemetry.
    
    Args:
        app: FastAPI application instance
    """
    try:
        FastAPIInstrumentor.instrument_app(app)
        logger.info("FastAPI instrumented with OpenTelemetry")
    except Exception as e:
        logger.error(f"Failed to instrument FastAPI: {e}")


def instrument_libraries():
    """Instrument common libraries with OpenTelemetry."""
    try:
        # Instrument HTTP requests
        RequestsInstrumentor().instrument()
        logger.info("Requests library instrumented")
        
        # Instrument Redis
        RedisInstrumentor().instrument()
        logger.info("Redis instrumented")
        
        # Note: SQLAlchemy instrumentation requires engine instance
        # This should be called after database engine is created
        
    except Exception as e:
        logger.error(f"Failed to instrument libraries: {e}")


def instrument_sqlalchemy(engine):
    """
    Instrument SQLAlchemy engine with OpenTelemetry.
    
    Args:
        engine: SQLAlchemy engine instance
    """
    try:
        SQLAlchemyInstrumentor().instrument(engine=engine)
        logger.info("SQLAlchemy instrumented")
    except Exception as e:
        logger.error(f"Failed to instrument SQLAlchemy: {e}")


def get_tracer() -> trace.Tracer:
    """
    Get the global tracer instance.
    
    Returns:
        Tracer instance
    """
    global _tracer
    if _tracer is None:
        _tracer = setup_tracing()
    return _tracer


@contextmanager
def trace_operation(
    operation_name: str,
    attributes: Optional[Dict[str, Any]] = None,
    span_kind: SpanKind = SpanKind.INTERNAL
):
    """
    Context manager for tracing operations.
    
    Args:
        operation_name: Name of the operation
        attributes: Optional attributes to add to span
        span_kind: Type of span (INTERNAL, CLIENT, SERVER, etc.)
        
    Example:
        with trace_operation("fetch_weather_data", {"location": "Delhi"}):
            data = fetch_weather_data("Delhi")
    """
    tracer = get_tracer()
    
    with tracer.start_as_current_span(
        operation_name,
        kind=span_kind
    ) as span:
        try:
            # Add attributes if provided
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            
            yield span
            
            # Mark span as successful
            span.set_status(Status(StatusCode.OK))
            
        except Exception as e:
            # Record exception in span
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise


def add_span_attributes(attributes: Dict[str, Any]):
    """
    Add attributes to the current span.
    
    Args:
        attributes: Dictionary of attributes to add
    """
    try:
        span = trace.get_current_span()
        if span.is_recording():
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
    except Exception as e:
        logger.debug(f"Failed to add span attributes: {e}")


def add_span_event(name: str, attributes: Optional[Dict[str, Any]] = None):
    """
    Add an event to the current span.
    
    Args:
        name: Event name
        attributes: Optional event attributes
    """
    try:
        span = trace.get_current_span()
        if span.is_recording():
            span.add_event(name, attributes=attributes or {})
    except Exception as e:
        logger.debug(f"Failed to add span event: {e}")


def set_span_error(error: Exception):
    """
    Mark the current span as error and record exception.
    
    Args:
        error: Exception that occurred
    """
    try:
        span = trace.get_current_span()
        if span.is_recording():
            span.record_exception(error)
            span.set_status(Status(StatusCode.ERROR, str(error)))
    except Exception as e:
        logger.debug(f"Failed to set span error: {e}")


def get_trace_context() -> Dict[str, str]:
    """
    Get current trace context for propagation.
    
    Returns:
        Dictionary with trace context headers
    """
    try:
        context = {}
        propagator = TraceContextTextMapPropagator()
        propagator.inject(context)
        return context
    except Exception as e:
        logger.debug(f"Failed to get trace context: {e}")
        return {}


def inject_trace_context(headers: Dict[str, str]) -> Dict[str, str]:
    """
    Inject trace context into HTTP headers.
    
    Args:
        headers: Existing headers dictionary
        
    Returns:
        Headers with trace context injected
    """
    try:
        propagator = TraceContextTextMapPropagator()
        propagator.inject(headers)
        return headers
    except Exception as e:
        logger.debug(f"Failed to inject trace context: {e}")
        return headers


class TracingMiddleware:
    """Middleware for adding custom tracing logic."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """Process request with tracing."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Get current span
        span = trace.get_current_span()
        
        # Add custom attributes
        if span.is_recording():
            span.set_attribute("http.route", scope.get("path", ""))
            span.set_attribute("http.method", scope.get("method", ""))
            
            # Add user information if available
            headers = dict(scope.get("headers", []))
            user_agent = headers.get(b"user-agent", b"").decode("utf-8")
            if user_agent:
                span.set_attribute("http.user_agent", user_agent)
        
        await self.app(scope, receive, send)


# Decorator for tracing functions
def traced(operation_name: Optional[str] = None, attributes: Optional[Dict[str, Any]] = None):
    """
    Decorator for tracing functions.
    
    Args:
        operation_name: Optional operation name (defaults to function name)
        attributes: Optional attributes to add to span
        
    Example:
        @traced("process_air_quality_data", {"source": "CPCB"})
        def process_data(data):
            # Function implementation
            pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__
            
            with trace_operation(op_name, attributes):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def async_traced(operation_name: Optional[str] = None, attributes: Optional[Dict[str, Any]] = None):
    """
    Decorator for tracing async functions.
    
    Args:
        operation_name: Optional operation name (defaults to function name)
        attributes: Optional attributes to add to span
        
    Example:
        @async_traced("fetch_weather_data", {"source": "IMD"})
        async def fetch_weather(location):
            # Async function implementation
            pass
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__
            
            with trace_operation(op_name, attributes):
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator
