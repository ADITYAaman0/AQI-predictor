"""
Static backward compatibility tests - verify configuration and code structure.
These tests don't require running services.
Validates: Requirements 8.1, 8.2, 8.5
"""

import pytest
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestStreamlitFilePresence:
    """Test that Streamlit dashboard files are present and unchanged"""
    
    def test_streamlit_app_exists(self):
        """
        Test that app.py (Streamlit dashboard) still exists.
        Validates: Requirement 8.1
        """
        app_path = Path("app.py")
        assert app_path.exists(), "Streamlit app.py file is missing"
        assert app_path.stat().st_size > 0, "Streamlit app.py file is empty"
        print("✓ Streamlit app.py exists")
    
    def test_streamlit_dependencies_present(self):
        """
        Test that Streamlit is still in requirements.
        Validates: Requirement 8.1
        """
        requirements_path = Path("requirements.txt")
        assert requirements_path.exists(), "requirements.txt is missing"
        
        with open(requirements_path, 'r') as f:
            requirements = f.read()
        
        assert "streamlit" in requirements.lower(), "Streamlit not in requirements.txt"
        print("✓ Streamlit dependency preserved in requirements.txt")
    
    def test_streamlit_ui_components_exist(self):
        """
        Test that Streamlit UI components still exist.
        Validates: Requirement 8.1
        """
        ui_path = Path("src/ui")
        assert ui_path.exists(), "src/ui directory is missing"
        
        # Check for key UI files
        expected_files = ["components.py", "charts.py", "styles.py"]
        for file in expected_files:
            file_path = ui_path / file
            assert file_path.exists(), f"UI component {file} is missing"
        
        print("✓ Streamlit UI components exist")


class TestAPIEndpointPreservation:
    """Test that API endpoints are preserved in code"""
    
    def test_api_main_file_exists(self):
        """
        Test that FastAPI main.py exists.
        Validates: Requirement 8.2
        """
        main_path = Path("src/api/main.py")
        assert main_path.exists(), "FastAPI main.py is missing"
        print("✓ FastAPI main.py exists")
    
    def test_critical_routers_exist(self):
        """
        Test that critical API routers still exist.
        Validates: Requirement 8.2
        """
        routers_path = Path("src/api/routers")
        assert routers_path.exists(), "API routers directory is missing"
        
        # Check for critical routers
        critical_routers = [
            "health.py",
            "data.py",
            "forecast.py",
            "auth.py"
        ]
        
        for router in critical_routers:
            router_path = routers_path / router
            assert router_path.exists(), f"Critical router {router} is missing"
        
        print("✓ Critical API routers exist")
    
    def test_api_endpoints_defined_in_main(self):
        """
        Test that API endpoints are still registered in main.py.
        Validates: Requirement 8.2
        """
        main_path = Path("src/api/main.py")
        
        with open(main_path, 'r') as f:
            main_content = f.read()
        
        # Check that routers are included
        assert "include_router" in main_content, "No routers included in main.py"
        assert "health.router" in main_content, "Health router not included"
        assert "data.router" in main_content, "Data router not included"
        assert "forecast.router" in main_content, "Forecast router not included"
        
        print("✓ API endpoints registered in main.py")
    
    def test_api_versioning_preserved(self):
        """
        Test that API versioning (v1) is preserved.
        Validates: Requirement 8.2
        """
        main_path = Path("src/api/main.py")
        
        with open(main_path, 'r') as f:
            main_content = f.read()
        
        # Check for v1 API paths
        assert "/api/v1/" in main_content, "API v1 versioning not found"
        
        print("✓ API versioning preserved")


class TestDockerConfiguration:
    """Test that Docker configuration supports both frontends"""
    
    def test_docker_compose_exists(self):
        """
        Test that docker-compose.yml exists.
        Validates: Requirement 8.1
        """
        compose_path = Path("docker-compose.yml")
        assert compose_path.exists(), "docker-compose.yml is missing"
        print("✓ docker-compose.yml exists")
    
    def test_nginx_config_exists(self):
        """
        Test that nginx configuration exists.
        Validates: Requirement 8.1
        """
        nginx_path = Path("docker/nginx.conf")
        assert nginx_path.exists(), "nginx.conf is missing"
        print("✓ nginx.conf exists")
    
    def test_nginx_supports_both_frontends(self):
        """
        Test that nginx configuration supports both Streamlit and Leaflet.
        Validates: Requirement 8.1
        """
        nginx_path = Path("docker/nginx.conf")
        
        with open(nginx_path, 'r') as f:
            nginx_content = f.read()
        
        # Check for Streamlit configuration
        assert "dashboard" in nginx_content.lower() or "streamlit" in nginx_content.lower(), \
            "Streamlit/dashboard configuration not found in nginx.conf"
        
        # Check for Leaflet/map configuration
        assert "map" in nginx_content.lower() or "leaflet" in nginx_content.lower(), \
            "Leaflet/map configuration not found in nginx.conf"
        
        print("✓ Nginx configured for both frontends")
    
    def test_nginx_preserves_api_routes(self):
        """
        Test that nginx preserves API routes.
        Validates: Requirement 8.2
        """
        nginx_path = Path("docker/nginx.conf")
        
        with open(nginx_path, 'r') as f:
            nginx_content = f.read()
        
        # Check for API routing
        assert "/api/" in nginx_content, "API routing not found in nginx.conf"
        assert "proxy_pass" in nginx_content, "Proxy configuration not found"
        
        print("✓ Nginx preserves API routes")


class TestDatabaseSchemaPreservation:
    """Test that database schema files are preserved"""
    
    def test_database_models_exist(self):
        """
        Test that database models file exists.
        Validates: Requirement 8.5
        """
        models_path = Path("src/api/models.py")
        assert models_path.exists(), "Database models.py is missing"
        print("✓ Database models.py exists")
    
    def test_migrations_directory_exists(self):
        """
        Test that migrations directory exists.
        Validates: Requirement 8.5
        """
        migrations_path = Path("migrations")
        assert migrations_path.exists(), "Migrations directory is missing"
        print("✓ Migrations directory exists")
    
    def test_database_manager_exists(self):
        """
        Test that database manager exists.
        Validates: Requirement 8.5
        """
        db_manager_path = Path("src/api/db_manager.py")
        assert db_manager_path.exists(), "Database manager is missing"
        print("✓ Database manager exists")


class TestLeafletIntegrationNonBreaking:
    """Test that Leaflet integration doesn't break existing functionality"""
    
    def test_leaflet_frontend_separate_directory(self):
        """
        Test that Leaflet frontend is in separate directory.
        Validates: Requirement 8.1
        """
        frontend_path = Path("frontend")
        assert frontend_path.exists(), "Frontend directory doesn't exist"
        
        # Check it doesn't interfere with Streamlit
        assert not (frontend_path / "app.py").exists(), \
            "Frontend directory shouldn't contain app.py (Streamlit file)"
        
        print("✓ Leaflet frontend in separate directory")
    
    def test_leaflet_uses_existing_api(self):
        """
        Test that Leaflet integration layer uses existing API.
        Validates: Requirement 8.2
        """
        # Check config files for API endpoint configuration
        config_files = [
            Path("frontend/js/config/config.development.js"),
            Path("frontend/js/config/config.production.js"),
            Path("frontend/js/config/config.staging.js")
        ]
        
        found_v1_api = False
        for config_path in config_files:
            if config_path.exists():
                with open(config_path, 'r') as f:
                    content = f.read()
                
                # Check that it references existing API endpoints
                if "/api/v1" in content:
                    found_v1_api = True
                    break
        
        assert found_v1_api, "Leaflet config doesn't reference v1 API"
        print("✓ Leaflet uses existing API endpoints")
    
    def test_no_api_modifications_for_leaflet(self):
        """
        Test that API main.py doesn't have Leaflet-specific breaking changes.
        Validates: Requirement 8.2
        """
        main_path = Path("src/api/main.py")
        
        with open(main_path, 'r') as f:
            main_content = f.read()
        
        # Verify existing routers are still included
        assert "health.router" in main_content, "Health router removed"
        assert "data.router" in main_content, "Data router removed"
        assert "forecast.router" in main_content, "Forecast router removed"
        
        print("✓ API not modified in breaking ways for Leaflet")


class TestConcurrentFrontendSupport:
    """Test that configuration supports concurrent frontend operation"""
    
    def test_docker_compose_has_api_service(self):
        """
        Test that docker-compose has API service for both frontends.
        Validates: Requirement 8.3
        """
        compose_path = Path("docker-compose.yml")
        
        with open(compose_path, 'r') as f:
            compose_content = f.read()
        
        # Check for API service
        assert "api:" in compose_content, "API service not found in docker-compose"
        
        print("✓ Docker compose has API service")
    
    def test_cors_configured_for_multiple_origins(self):
        """
        Test that CORS is configured to support multiple frontends.
        Validates: Requirement 8.3
        """
        main_path = Path("src/api/main.py")
        
        with open(main_path, 'r') as f:
            main_content = f.read()
        
        # Check for CORS middleware
        assert "CORSMiddleware" in main_content, "CORS middleware not configured"
        assert "allow_origins" in main_content, "CORS origins not configured"
        
        print("✓ CORS configured for multiple frontends")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
