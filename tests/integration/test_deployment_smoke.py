"""
Smoke tests for deployment validation in CI/CD pipeline.
These tests verify basic functionality after deployment.
"""

import pytest
import requests
import time
from typing import Optional
import os


class DeploymentSmokeTests:
    """Smoke tests to validate deployment health"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.timeout = 30
    
    def test_api_health_endpoint(self):
        """Test that API health endpoint is responding"""
        response = requests.get(f"{self.base_url}/health", timeout=self.timeout)
        assert response.status_code == 200
        
        health_data = response.json()
        assert health_data["status"] == "healthy"
        assert "timestamp" in health_data
        assert "version" in health_data
    
    def test_database_connectivity(self):
        """Test database connectivity through API"""
        response = requests.get(f"{self.base_url}/health/db", timeout=self.timeout)
        assert response.status_code == 200
        
        db_health = response.json()
        assert db_health["database"]["status"] == "connected"
    
    def test_redis_connectivity(self):
        """Test Redis connectivity through API"""
        response = requests.get(f"{self.base_url}/health/redis", timeout=self.timeout)
        assert response.status_code == 200
        
        redis_health = response.json()
        assert redis_health["redis"]["status"] == "connected"
    
    def test_api_documentation_available(self):
        """Test that API documentation is accessible"""
        response = requests.get(f"{self.base_url}/docs", timeout=self.timeout)
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()
    
    def test_forecast_endpoint_basic(self):
        """Test basic forecast endpoint functionality"""
        # Test with a known location
        response = requests.get(
            f"{self.base_url}/api/v1/forecast/current/delhi",
            timeout=self.timeout
        )
        
        if response.status_code == 200:
            forecast_data = response.json()
            assert "location" in forecast_data
            assert "aqi" in forecast_data
            assert "timestamp" in forecast_data
        else:
            # If endpoint returns error, at least verify it's a proper API error
            assert response.status_code in [400, 404, 500, 503]
            assert response.headers.get("content-type", "").startswith("application/json")
    
    def test_api_rate_limiting_headers(self):
        """Test that rate limiting headers are present"""
        response = requests.get(f"{self.base_url}/health", timeout=self.timeout)
        
        # Check for rate limiting headers
        headers = response.headers
        rate_limit_headers = [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset"
        ]
        
        # At least one rate limiting header should be present
        has_rate_limit_header = any(header in headers for header in rate_limit_headers)
        assert has_rate_limit_header, f"No rate limiting headers found in {list(headers.keys())}"
    
    def test_cors_headers(self):
        """Test that CORS headers are properly configured"""
        response = requests.options(f"{self.base_url}/health", timeout=self.timeout)
        
        # Should have CORS headers for OPTIONS request
        headers = response.headers
        cors_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ]
        
        # At least Access-Control-Allow-Origin should be present
        assert "Access-Control-Allow-Origin" in headers
    
    def test_security_headers(self):
        """Test that security headers are present"""
        response = requests.get(f"{self.base_url}/health", timeout=self.timeout)
        
        headers = response.headers
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security"
        ]
        
        # At least some security headers should be present
        present_security_headers = [h for h in security_headers if h in headers]
        assert len(present_security_headers) >= 2, f"Insufficient security headers: {present_security_headers}"


def pytest_addoption(parser):
    """Add command line options for deployment testing"""
    parser.addoption(
        "--staging-url",
        action="store",
        default=None,
        help="Staging environment URL for testing"
    )
    parser.addoption(
        "--production-url", 
        action="store",
        default=None,
        help="Production environment URL for testing"
    )


@pytest.fixture
def staging_url(request):
    """Get staging URL from command line or environment"""
    url = request.config.getoption("--staging-url")
    if not url:
        url = os.environ.get("STAGING_URL")
    return url


@pytest.fixture
def production_url(request):
    """Get production URL from command line or environment"""
    url = request.config.getoption("--production-url")
    if not url:
        url = os.environ.get("PRODUCTION_URL")
    return url


@pytest.fixture
def deployment_tester(request, staging_url, production_url):
    """Create deployment tester based on available URLs"""
    # Determine which URL to use based on test context
    if hasattr(request, 'param'):
        url = request.param
    elif production_url and "production" in request.node.name:
        url = production_url
    elif staging_url:
        url = staging_url
    else:
        pytest.skip("No deployment URL provided")
    
    return DeploymentSmokeTests(url)


class TestStagingDeployment:
    """Smoke tests for staging deployment"""
    
    def test_staging_health(self, staging_url):
        if not staging_url:
            pytest.skip("No staging URL provided")
        
        tester = DeploymentSmokeTests(staging_url)
        tester.test_api_health_endpoint()
    
    def test_staging_database(self, staging_url):
        if not staging_url:
            pytest.skip("No staging URL provided")
        
        tester = DeploymentSmokeTests(staging_url)
        tester.test_database_connectivity()
    
    def test_staging_redis(self, staging_url):
        if not staging_url:
            pytest.skip("No staging URL provided")
        
        tester = DeploymentSmokeTests(staging_url)
        tester.test_redis_connectivity()
    
    def test_staging_api_docs(self, staging_url):
        if not staging_url:
            pytest.skip("No staging URL provided")
        
        tester = DeploymentSmokeTests(staging_url)
        tester.test_api_documentation_available()


class TestProductionDeployment:
    """Smoke tests for production deployment"""
    
    def test_production_health(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_api_health_endpoint()
    
    def test_production_database(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_database_connectivity()
    
    def test_production_redis(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_redis_connectivity()
    
    def test_production_security_headers(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_security_headers()
    
    def test_production_rate_limiting(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_api_rate_limiting_headers()
    
    def test_production_forecast_endpoint(self, production_url):
        if not production_url:
            pytest.skip("No production URL provided")
        
        tester = DeploymentSmokeTests(production_url)
        tester.test_forecast_endpoint_basic()


if __name__ == "__main__":
    # Allow running tests directly with URL as argument
    import sys
    if len(sys.argv) > 1:
        url = sys.argv[1]
        tester = DeploymentSmokeTests(url)
        
        print(f"Running smoke tests against {url}")
        try:
            tester.test_api_health_endpoint()
            print("✅ Health endpoint test passed")
            
            tester.test_database_connectivity()
            print("✅ Database connectivity test passed")
            
            tester.test_redis_connectivity()
            print("✅ Redis connectivity test passed")
            
            tester.test_api_documentation_available()
            print("✅ API documentation test passed")
            
            tester.test_security_headers()
            print("✅ Security headers test passed")
            
            print("🎉 All smoke tests passed!")
            
        except Exception as e:
            print(f"❌ Smoke test failed: {e}")
            sys.exit(1)
    else:
        print("Usage: python test_deployment_smoke.py <base_url>")
        sys.exit(1)