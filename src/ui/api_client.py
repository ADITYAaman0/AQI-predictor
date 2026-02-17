"""
API Client for Streamlit Dashboard
Handles communication with FastAPI backend service.
"""

import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import os
from functools import wraps
import time

logger = logging.getLogger(__name__)


class APIClientError(Exception):
    """Base exception for API client errors."""
    pass


class APIConnectionError(APIClientError):
    """Raised when connection to API fails."""
    pass


class APIResponseError(APIClientError):
    """Raised when API returns an error response."""
    pass


def retry_on_failure(max_retries=3, delay=1):
    """Decorator to retry API calls on failure."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (requests.ConnectionError, requests.Timeout) as e:
                    if attempt == max_retries - 1:
                        raise APIConnectionError(f"Failed to connect after {max_retries} attempts: {str(e)}")
                    logger.warning(f"API call failed (attempt {attempt + 1}/{max_retries}), retrying...")
                    time.sleep(delay * (attempt + 1))
            return None
        return wrapper
    return decorator


class AQIAPIClient:
    """Client for interacting with AQI Predictor FastAPI backend."""
    
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize API client.
        
        Args:
            base_url: Base URL for API (defaults to environment variable or localhost)
            api_key: Optional API key for authentication
        """
        self.base_url = base_url or os.getenv("API_BASE_URL", "http://localhost:8000")
        self.api_key = api_key or os.getenv("API_KEY")
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        
        # Add API key if provided
        if self.api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {self.api_key}"
            })
        
        logger.info(f"Initialized API client with base URL: {self.base_url}")
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request to API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional arguments for requests
            
        Returns:
            Response data as dictionary
            
        Raises:
            APIConnectionError: If connection fails
            APIResponseError: If API returns error response
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            
            # Check for HTTP errors
            if response.status_code >= 400:
                error_detail = response.json().get("detail", "Unknown error") if response.text else "Unknown error"
                raise APIResponseError(f"API error ({response.status_code}): {error_detail}")
            
            return response.json()
            
        except requests.ConnectionError as e:
            raise APIConnectionError(f"Failed to connect to API at {url}: {str(e)}")
        except requests.Timeout as e:
            raise APIConnectionError(f"API request timed out: {str(e)}")
        except requests.RequestException as e:
            raise APIClientError(f"API request failed: {str(e)}")
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_current_forecast(self, location: str) -> Dict[str, Any]:
        """
        Get current AQI and air quality data for a location.
        
        Args:
            location: Location identifier (city name, coordinates, or address)
            
        Returns:
            Current air quality data
        """
        return self._make_request("GET", f"/api/v1/forecast/current/{location}")
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_24h_forecast(self, location: str) -> Dict[str, Any]:
        """
        Get 24-hour forecast for a location.
        
        Args:
            location: Location identifier
            
        Returns:
            24-hour forecast data
        """
        return self._make_request("GET", f"/api/v1/forecast/24h/{location}")
    
    @retry_on_failure(max_retries=2, delay=1)
    def get_spatial_forecast(
        self,
        north: float,
        south: float,
        east: float,
        west: float,
        resolution: float = 1.0
    ) -> Dict[str, Any]:
        """
        Get spatial grid predictions for an area.
        
        Args:
            north: North boundary latitude
            south: South boundary latitude
            east: East boundary longitude
            west: West boundary longitude
            resolution: Grid resolution in kilometers
            
        Returns:
            Spatial grid predictions
        """
        params = {
            "north": north,
            "south": south,
            "east": east,
            "west": west,
            "resolution": resolution
        }
        return self._make_request("GET", "/api/v1/forecast/spatial", params=params)
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_source_attribution(self, location: str) -> Dict[str, Any]:
        """
        Get source attribution analysis for a location.
        
        Args:
            location: Location identifier
            
        Returns:
            Source attribution data
        """
        return self._make_request("GET", f"/api/v1/attribution/{location}")
    
    @retry_on_failure(max_retries=2, delay=1)
    def analyze_policy_scenario(
        self,
        location: str,
        interventions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze impact of policy interventions.
        
        Args:
            location: Location identifier
            interventions: List of policy interventions
            
        Returns:
            Policy scenario analysis results
        """
        data = {
            "location": {"name": location},
            "interventions": interventions
        }
        return self._make_request("POST", "/api/v1/attribution/scenario", json=data)
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_historical_data(
        self,
        location: str,
        start_date: datetime,
        end_date: datetime,
        parameter: str = "pm25"
    ) -> Dict[str, Any]:
        """
        Get historical air quality data.
        
        Args:
            location: Location identifier
            start_date: Start date for historical data
            end_date: End date for historical data
            parameter: Pollutant parameter
            
        Returns:
            Historical data
        """
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "parameter": parameter
        }
        return self._make_request("GET", f"/api/v1/data/historical/{location}", params=params)
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_cities(self) -> List[Dict[str, Any]]:
        """
        Get list of supported cities.
        
        Returns:
            List of cities with metadata
        """
        return self._make_request("GET", "/api/v1/cities")
    
    @retry_on_failure(max_retries=2, delay=1)
    def create_alert_subscription(
        self,
        location: str,
        threshold: int,
        channels: List[str],
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create alert subscription.
        
        Args:
            location: Location identifier
            threshold: AQI threshold for alerts
            channels: Notification channels (email, sms, push)
            email: Email address for notifications
            
        Returns:
            Subscription details
        """
        data = {
            "location": location,
            "threshold": threshold,
            "channels": channels
        }
        if email:
            data["email"] = email
        
        return self._make_request("POST", "/api/v1/alerts/subscribe", json=data)
    
    @retry_on_failure(max_retries=3, delay=1)
    def get_alert_history(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get alert history.
        
        Args:
            user_id: Optional user ID to filter alerts
            
        Returns:
            List of alert records
        """
        params = {}
        if user_id:
            params["user_id"] = user_id
        
        return self._make_request("GET", "/api/v1/alerts/history", params=params)
    
    def health_check(self) -> bool:
        """
        Check if API is healthy and accessible.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            response = self._make_request("GET", "/health")
            return response.get("status") == "healthy"
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def get_api_info(self) -> Dict[str, Any]:
        """
        Get API service information.
        
        Returns:
            API service information
        """
        return self._make_request("GET", "/info")


# Singleton instance
_api_client = None


def get_api_client() -> AQIAPIClient:
    """
    Get singleton API client instance.
    
    Returns:
        API client instance
    """
    global _api_client
    if _api_client is None:
        _api_client = AQIAPIClient()
    return _api_client
