#!/usr/bin/env python3
"""
Configuration Validation Script
Validates environment configuration consistency between frontend and backend
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple


class ConfigValidator:
    """Validates configuration consistency across environments"""
    
    def __init__(self, environment: str):
        self.environment = environment
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
    def validate_backend_config(self) -> bool:
        """Validate backend environment configuration"""
        env_file = f".env.{self.environment}"
        
        if not os.path.exists(env_file):
            self.errors.append(f"Backend config file not found: {env_file}")
            return False
            
        required_vars = [
            'ENVIRONMENT',
            'DATABASE_URL',
            'REDIS_URL',
            'SECRET_KEY',
            'API_HOST',
            'API_PORT'
        ]
        
        # Load environment file
        env_vars = self._load_env_file(env_file)
        
        # Check required variables
        for var in required_vars:
            if var not in env_vars or not env_vars[var]:
                self.errors.append(f"Missing required backend variable: {var}")
                
        # Validate environment matches
        if env_vars.get('ENVIRONMENT') != self.environment:
            self.errors.append(
                f"Environment mismatch: file says {env_vars.get('ENVIRONMENT')}, "
                f"expected {self.environment}"
            )
            
        return len(self.errors) == 0
        
    def validate_frontend_config(self) -> bool:
        """Validate frontend configuration file"""
        config_file = f"frontend/js/config/config.{self.environment}.js"
        
        if not os.path.exists(config_file):
            self.errors.append(f"Frontend config file not found: {config_file}")
            return False
            
        # Read and parse JavaScript config
        with open(config_file, 'r') as f:
            content = f.read()
            
        # Basic validation - check for required fields
        required_fields = [
            'ENVIRONMENT',
            'API_BASE_URL',
            'INTEGRATION_BASE_URL',
            'MAP_CENTER',
            'TILE_URL'
        ]
        
        for field in required_fields:
            if field not in content:
                self.errors.append(f"Missing required frontend field: {field}")
                
        # Check environment matches
        if f"ENVIRONMENT: '{self.environment}'" not in content:
            self.errors.append(
                f"Frontend environment mismatch in {config_file}"
            )
            
        return len(self.errors) == 0
        
    def validate_docker_config(self) -> bool:
        """Validate Docker Compose configuration"""
        docker_file = f"docker-compose.{self.environment}.yml"
        
        if self.environment == 'development':
            docker_file = "docker-compose.dev.yml"
        elif self.environment == 'production':
            docker_file = "docker-compose.prod.yml"
            
        if not os.path.exists(docker_file):
            self.errors.append(f"Docker config file not found: {docker_file}")
            return False
            
        # Read docker-compose file
        with open(docker_file, 'r') as f:
            content = f.read()
            
        # Check for required services
        required_services = ['api', 'frontend', 'timescaledb', 'redis']
        
        for service in required_services:
            if f"{service}:" not in content:
                self.errors.append(f"Missing required service in Docker config: {service}")
                
        # Check for frontend service configuration
        if 'frontend:' in content:
            if 'Dockerfile.frontend' not in content:
                self.warnings.append("Frontend service should use Dockerfile.frontend")
                
        return len(self.errors) == 0
        
    def validate_nginx_config(self) -> bool:
        """Validate Nginx configuration"""
        nginx_file = "docker/nginx.conf"
        
        if not os.path.exists(nginx_file):
            self.errors.append(f"Nginx config file not found: {nginx_file}")
            return False
            
        with open(nginx_file, 'r') as f:
            content = f.read()
            
        # Check for required location blocks
        required_locations = [
            'location /api/',
            'location /map',
            'location /health'
        ]
        
        for location in required_locations:
            if location not in content:
                self.errors.append(f"Missing required Nginx location: {location}")
                
        # Check for frontend static file serving
        if '/usr/share/nginx/html/map' not in content:
            self.errors.append("Nginx not configured to serve frontend from /map")
            
        return len(self.errors) == 0
        
    def validate_consistency(self) -> bool:
        """Validate consistency between frontend and backend configs"""
        # Load backend config
        env_file = f".env.{self.environment}"
        if not os.path.exists(env_file):
            return False
            
        env_vars = self._load_env_file(env_file)
        
        # Load frontend config
        config_file = f"frontend/js/config/config.{self.environment}.js"
        if not os.path.exists(config_file):
            return False
            
        with open(config_file, 'r') as f:
            frontend_content = f.read()
            
        # Check API URL consistency
        api_port = env_vars.get('API_PORT', '8000')
        
        if self.environment == 'development':
            expected_url = f'http://localhost:{api_port}/api/v1'
            if expected_url not in frontend_content:
                self.warnings.append(
                    f"Frontend API_BASE_URL should match backend port: {expected_url}"
                )
        else:
            # Production/staging should use relative paths
            if "API_BASE_URL: '/api/v1'" not in frontend_content:
                self.warnings.append(
                    "Production/staging frontend should use relative API paths"
                )
                
        return True
        
    def _load_env_file(self, filepath: str) -> Dict[str, str]:
        """Load environment variables from .env file"""
        env_vars = {}
        
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    # Skip variable references
                    if not value.startswith('${'):
                        env_vars[key] = value
                        
        return env_vars
        
    def run_all_validations(self) -> bool:
        """Run all validation checks"""
        print(f"\n{'='*60}")
        print(f"Validating {self.environment.upper()} configuration")
        print(f"{'='*60}\n")
        
        checks = [
            ("Backend Configuration", self.validate_backend_config),
            ("Frontend Configuration", self.validate_frontend_config),
            ("Docker Configuration", self.validate_docker_config),
            ("Nginx Configuration", self.validate_nginx_config),
            ("Configuration Consistency", self.validate_consistency),
        ]
        
        all_passed = True
        
        for check_name, check_func in checks:
            print(f"Checking {check_name}...", end=" ")
            try:
                result = check_func()
                if result:
                    print("✓ PASSED")
                else:
                    print("✗ FAILED")
                    all_passed = False
            except Exception as e:
                print(f"✗ ERROR: {e}")
                self.errors.append(f"{check_name}: {str(e)}")
                all_passed = False
                
        # Print errors and warnings
        if self.errors:
            print(f"\n{'='*60}")
            print("ERRORS:")
            print(f"{'='*60}")
            for error in self.errors:
                print(f"  ✗ {error}")
                
        if self.warnings:
            print(f"\n{'='*60}")
            print("WARNINGS:")
            print(f"{'='*60}")
            for warning in self.warnings:
                print(f"  ⚠ {warning}")
                
        print(f"\n{'='*60}")
        if all_passed:
            print(f"✓ All validations PASSED for {self.environment}")
        else:
            print(f"✗ Some validations FAILED for {self.environment}")
        print(f"{'='*60}\n")
        
        return all_passed


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python validate-config.py <environment>")
        print("Environments: development, staging, production")
        sys.exit(1)
        
    environment = sys.argv[1].lower()
    
    if environment not in ['development', 'staging', 'production']:
        print(f"Invalid environment: {environment}")
        print("Valid environments: development, staging, production")
        sys.exit(1)
        
    validator = ConfigValidator(environment)
    success = validator.run_all_validations()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
