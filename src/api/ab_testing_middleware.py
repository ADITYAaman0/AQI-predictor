"""
A/B Testing Middleware for ML Model Predictions
Integrates A/B testing with existing forecast endpoints.
"""

import logging
import time
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..models.ab_testing_framework import get_ab_testing_framework
from ..models.mlflow_manager import get_mlflow_manager

logger = logging.getLogger(__name__)


class ABTestingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle A/B testing for ML model predictions
    
    Features:
    - Automatic variant assignment for forecast requests
    - Model selection based on experiment configuration
    - Prediction result tracking and metrics collection
    - Seamless integration with existing endpoints
    """
    
    def __init__(self, app, enabled: bool = True):
        """
        Initialize A/B testing middleware
        
        Args:
            app: FastAPI application
            enabled: Whether A/B testing is enabled
        """
        super().__init__(app)
        self.enabled = enabled
        self.ab_framework = get_ab_testing_framework() if enabled else None
        self.mlflow_manager = get_mlflow_manager() if enabled else None
        
        # Endpoints that support A/B testing
        self.ab_test_endpoints = {
            "/api/v1/forecast/current/",
            "/api/v1/forecast/24h/",
            "/api/v1/forecast/spatial"
        }
        
        logger.info(f"A/B Testing Middleware initialized (enabled: {enabled})")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request through A/B testing middleware
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/endpoint in chain
            
        Returns:
            HTTP response with A/B testing applied
        """
        if not self.enabled:
            return await call_next(request)
        
        # Check if this is an A/B testable endpoint
        if not self._is_ab_testable_endpoint(request.url.path):
            return await call_next(request)
        
        # Extract context for variant assignment
        assignment_context = await self._extract_assignment_context(request)
        
        # Find active experiments for this endpoint
        active_experiments = self._get_active_experiments_for_endpoint(request.url.path)
        
        if not active_experiments:
            # No active experiments, proceed normally
            return await call_next(request)
        
        # For simplicity, use the first active experiment
        # In production, you might want more sophisticated experiment selection
        experiment = active_experiments[0]
        
        # Assign variant
        variant_id = self.ab_framework.assign_variant(
            experiment_id=experiment.experiment_id,
            user_id=assignment_context.get("user_id"),
            location=assignment_context.get("location"),
            request_context=assignment_context.get("request_context")
        )
        
        if not variant_id:
            # Assignment failed, proceed normally
            return await call_next(request)
        
        # Get variant configuration
        variant = next((v for v in experiment.variants if v.variant_id == variant_id), None)
        if not variant:
            return await call_next(request)
        
        # Store experiment info in request state for use in endpoints
        request.state.ab_experiment = {
            "experiment_id": experiment.experiment_id,
            "variant_id": variant_id,
            "variant": variant,
            "assignment_context": assignment_context
        }
        
        # Record start time for response time tracking
        start_time = time.time()
        
        try:
            # Process request with assigned variant
            response = await call_next(request)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Extract prediction data from response if available
            prediction_data = await self._extract_prediction_data(request, response)
            
            # Record prediction result
            self.ab_framework.record_prediction(
                experiment_id=experiment.experiment_id,
                variant_id=variant_id,
                prediction_data=prediction_data,
                response_time_ms=response_time_ms,
                success=200 <= response.status_code < 300,
                error=None if 200 <= response.status_code < 300 else f"HTTP {response.status_code}"
            )
            
            # Add A/B testing headers to response
            response.headers["X-AB-Experiment-ID"] = experiment.experiment_id
            response.headers["X-AB-Variant-ID"] = variant_id
            response.headers["X-AB-Model-Version"] = f"{variant.model_name}:{variant.model_version}"
            
            return response
            
        except Exception as e:
            # Record failed prediction
            response_time_ms = (time.time() - start_time) * 1000
            
            self.ab_framework.record_prediction(
                experiment_id=experiment.experiment_id,
                variant_id=variant_id,
                prediction_data={"error": str(e)},
                response_time_ms=response_time_ms,
                success=False,
                error=str(e)
            )
            
            # Re-raise the exception
            raise
    
    def _is_ab_testable_endpoint(self, path: str) -> bool:
        """Check if endpoint supports A/B testing"""
        return any(endpoint in path for endpoint in self.ab_test_endpoints)
    
    async def _extract_assignment_context(self, request: Request) -> Dict[str, Any]:
        """
        Extract context information for variant assignment
        
        Args:
            request: HTTP request
            
        Returns:
            Context dictionary for assignment
        """
        context = {}
        
        # Extract user ID from headers or auth
        user_id = request.headers.get("X-User-ID")
        if hasattr(request.state, "user") and request.state.user:
            user_id = getattr(request.state.user, "id", None)
        context["user_id"] = user_id
        
        # Extract location from path parameters or query params
        location = None
        
        # For forecast endpoints with location in path
        path_parts = request.url.path.split("/")
        if len(path_parts) > 4 and path_parts[3] in ["current", "24h"]:
            location_str = path_parts[4] if len(path_parts) > 4 else None
            if location_str:
                # Try to parse coordinates
                try:
                    if "," in location_str:
                        lat_str, lon_str = location_str.split(",")
                        location = {
                            "lat": float(lat_str),
                            "lon": float(lon_str)
                        }
                    else:
                        # City name - use default coordinates (would be looked up in production)
                        location = {"city": location_str}
                except ValueError:
                    location = {"city": location_str}
        
        # For spatial endpoints, extract from query parameters
        if "spatial" in request.url.path:
            query_params = dict(request.query_params)
            if "north" in query_params and "south" in query_params:
                try:
                    location = {
                        "lat": (float(query_params["north"]) + float(query_params["south"])) / 2,
                        "lon": (float(query_params["east"]) + float(query_params["west"])) / 2
                    }
                except (ValueError, KeyError):
                    pass
        
        context["location"] = location
        
        # Additional request context
        context["request_context"] = {
            "endpoint": request.url.path,
            "method": request.method,
            "user_agent": request.headers.get("User-Agent"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return context
    
    def _get_active_experiments_for_endpoint(self, endpoint_path: str) -> list:
        """
        Get active experiments that apply to the given endpoint
        
        Args:
            endpoint_path: API endpoint path
            
        Returns:
            List of active experiments
        """
        try:
            # Get all active experiments
            active_experiments = self.ab_framework.list_experiments(
                status=self.ab_framework.ExperimentStatus.RUNNING
            )
            
            # Filter experiments that apply to this endpoint
            applicable_experiments = []
            for experiment in active_experiments:
                if experiment.is_active:
                    # Check if experiment applies to this endpoint
                    # This could be based on tags, metadata, or endpoint patterns
                    endpoint_tags = experiment.metadata.get("applicable_endpoints", [])
                    
                    if not endpoint_tags:
                        # If no specific endpoints specified, apply to all forecast endpoints
                        if any(pattern in endpoint_path for pattern in self.ab_test_endpoints):
                            applicable_experiments.append(experiment)
                    else:
                        # Check if endpoint matches any of the specified patterns
                        if any(pattern in endpoint_path for pattern in endpoint_tags):
                            applicable_experiments.append(experiment)
            
            return applicable_experiments
            
        except Exception as e:
            logger.error(f"Failed to get active experiments for endpoint {endpoint_path}: {e}")
            return []
    
    async def _extract_prediction_data(self, request: Request, response: Response) -> Dict[str, Any]:
        """
        Extract prediction data from request and response for tracking
        
        Args:
            request: HTTP request
            response: HTTP response
            
        Returns:
            Dictionary with prediction data
        """
        prediction_data = {}
        
        try:
            # Extract request information
            prediction_data["endpoint"] = request.url.path
            prediction_data["method"] = request.method
            prediction_data["status_code"] = response.status_code
            
            # Extract location information if available
            if hasattr(request.state, "ab_experiment"):
                assignment_context = request.state.ab_experiment.get("assignment_context", {})
                if assignment_context.get("location"):
                    prediction_data["location"] = assignment_context["location"]
            
            # For successful responses, try to extract prediction metrics
            if 200 <= response.status_code < 300:
                # Note: In a real implementation, you might want to parse the response body
                # to extract specific prediction values, confidence scores, etc.
                # For now, we'll just record basic success metrics
                prediction_data["success"] = True
                
                # Add model information from variant
                if hasattr(request.state, "ab_experiment"):
                    variant = request.state.ab_experiment.get("variant")
                    if variant:
                        prediction_data["model_name"] = variant.model_name
                        prediction_data["model_version"] = variant.model_version
                        prediction_data["is_control"] = variant.is_control
            else:
                prediction_data["success"] = False
                prediction_data["error_code"] = response.status_code
            
            # Add timestamp
            prediction_data["timestamp"] = datetime.utcnow().isoformat()
            
        except Exception as e:
            logger.warning(f"Failed to extract prediction data: {e}")
            prediction_data["extraction_error"] = str(e)
        
        return prediction_data


class ABTestingModelSelector:
    """
    Helper class for selecting models based on A/B test configuration
    """
    
    def __init__(self):
        self.ab_framework = get_ab_testing_framework()
        self.mlflow_manager = get_mlflow_manager()
    
    def get_model_for_request(self, request: Request, default_model_name: str = None):
        """
        Get the appropriate model for a request based on A/B testing
        
        Args:
            request: HTTP request with A/B testing state
            default_model_name: Default model to use if no A/B test active
            
        Returns:
            Model object or None
        """
        try:
            # Check if request has A/B testing information
            if not hasattr(request.state, "ab_experiment"):
                # No A/B test active, use default model
                if default_model_name:
                    return self.mlflow_manager.load_model(default_model_name, version="latest")
                return None
            
            # Get variant information
            variant = request.state.ab_experiment.get("variant")
            if not variant:
                return None
            
            # Load model for this variant
            model = self.mlflow_manager.load_model(
                variant.model_name,
                version=variant.model_version
            )
            
            logger.info(f"Loaded model {variant.model_name}:{variant.model_version} for variant {variant.variant_id}")
            return model
            
        except Exception as e:
            logger.error(f"Failed to get model for request: {e}")
            # Fallback to default model
            if default_model_name:
                try:
                    return self.mlflow_manager.load_model(default_model_name, version="latest")
                except Exception as fallback_error:
                    logger.error(f"Failed to load fallback model: {fallback_error}")
            return None
    
    def get_model_configuration(self, request: Request) -> Dict[str, Any]:
        """
        Get model configuration for the current request
        
        Args:
            request: HTTP request with A/B testing state
            
        Returns:
            Model configuration dictionary
        """
        if not hasattr(request.state, "ab_experiment"):
            return {}
        
        variant = request.state.ab_experiment.get("variant")
        if not variant:
            return {}
        
        return {
            "model_name": variant.model_name,
            "model_version": variant.model_version,
            "variant_id": variant.variant_id,
            "is_control": variant.is_control,
            "configuration": variant.configuration
        }


# Singleton instance
_ab_testing_model_selector = None

def get_ab_testing_model_selector() -> ABTestingModelSelector:
    """Get or create A/B testing model selector instance"""
    global _ab_testing_model_selector
    if _ab_testing_model_selector is None:
        _ab_testing_model_selector = ABTestingModelSelector()
    return _ab_testing_model_selector