"""
Configuration for integration tests.
"""

import pytest


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
    import os
    url = request.config.getoption("--staging-url")
    if not url:
        url = os.environ.get("STAGING_URL")
    return url


@pytest.fixture
def production_url(request):
    """Get production URL from command line or environment"""
    import os
    url = request.config.getoption("--production-url")
    if not url:
        url = os.environ.get("PRODUCTION_URL")
    return url