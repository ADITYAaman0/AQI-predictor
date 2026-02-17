#!/usr/bin/env python3
"""
Infrastructure validation script for AQI Predictor.
Tests the infrastructure setup without requiring running services.
"""

import os
import sys
from pathlib import Path
import yaml
import json

def test_file_exists(filepath: str, description: str) -> bool:
    """Test if a file exists."""
    if Path(filepath).exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
        return False

def test_docker_compose_structure():
    """Test Docker Compose configuration structure."""
    print("\n🔍 Testing Docker Compose Configuration...")
    
    success = True
    
    # Test main docker-compose.yml
    if test_file_exists("docker-compose.yml", "Main Docker Compose file"):
        try:
            with open("docker-compose.yml", 'r') as f:
                compose_config = yaml.safe_load(f)
            
            required_services = ["timescaledb", "redis", "api", "celery-worker", "celery-beat"]
            for service in required_services:
                if service in compose_config.get("services", {}):
                    print(f"✅ Service defined: {service}")
                else:
                    print(f"❌ Service missing: {service}")
                    success = False
                    
        except Exception as e:
            print(f"❌ Error parsing docker-compose.yml: {e}")
            success = False
    else:
        success = False
    
    # Test staging docker-compose
    test_file_exists("docker-compose.staging.yml", "Staging Docker Compose file")
    
    return success

def test_dockerfile():
    """Test Dockerfile configuration."""
    print("\n🔍 Testing Dockerfile...")
    
    if test_file_exists("Dockerfile", "Main Dockerfile"):
        try:
            with open("Dockerfile", 'r') as f:
                dockerfile_content = f.read()
            
            required_elements = [
                "FROM python:3.11-slim",
                "WORKDIR /app",
                "COPY requirements.txt",
                "RUN pip install",
                "EXPOSE 8000",
                "HEALTHCHECK"
            ]
            
            for element in required_elements:
                if element in dockerfile_content:
                    print(f"✅ Dockerfile contains: {element}")
                else:
                    print(f"❌ Dockerfile missing: {element}")
                    return False
            
            return True
        except Exception as e:
            print(f"❌ Error reading Dockerfile: {e}")
            return False
    
    return False

def test_database_init():
    """Test database initialization script."""
    print("\n🔍 Testing Database Initialization...")
    
    if test_file_exists("docker/init-db.sql", "Database init script"):
        try:
            with open("docker/init-db.sql", 'r') as f:
                init_script = f.read()
            
            required_elements = [
                "CREATE EXTENSION IF NOT EXISTS timescaledb",
                "CREATE EXTENSION IF NOT EXISTS postgis",
                "CREATE TABLE IF NOT EXISTS air_quality_measurements",
                "CREATE TABLE IF NOT EXISTS weather_data",
                "CREATE TABLE IF NOT EXISTS predictions",
                "SELECT create_hypertable",
                "CREATE INDEX"
            ]
            
            for element in required_elements:
                if element in init_script:
                    print(f"✅ Init script contains: {element}")
                else:
                    print(f"❌ Init script missing: {element}")
                    return False
            
            return True
        except Exception as e:
            print(f"❌ Error reading init script: {e}")
            return False
    
    return False

def test_api_structure():
    """Test FastAPI application structure."""
    print("\n🔍 Testing FastAPI Application Structure...")
    
    success = True
    
    # Test main API files
    api_files = [
        ("src/api/__init__.py", "API package init"),
        ("src/api/main.py", "Main FastAPI application"),
        ("src/api/database.py", "Database connection module"),
        ("src/api/cache.py", "Redis cache module"),
        ("src/api/middleware.py", "Custom middleware"),
        ("src/api/routers/__init__.py", "Routers package init"),
        ("src/api/routers/health.py", "Health check router"),
        ("src/api/routers/forecast.py", "Forecast router")
    ]
    
    for filepath, description in api_files:
        if not test_file_exists(filepath, description):
            success = False
    
    return success

def test_celery_structure():
    """Test Celery task structure."""
    print("\n🔍 Testing Celery Task Structure...")
    
    success = True
    
    # Test Celery files
    celery_files = [
        ("src/tasks/__init__.py", "Tasks package init"),
        ("src/tasks/celery_app.py", "Celery application"),
        ("src/tasks/data_ingestion.py", "Data ingestion tasks"),
        ("src/tasks/predictions.py", "Prediction tasks"),
        ("src/tasks/alerts.py", "Alert tasks"),
        ("src/tasks/model_training.py", "Model training tasks"),
        ("src/tasks/maintenance.py", "Maintenance tasks")
    ]
    
    for filepath, description in celery_files:
        if not test_file_exists(filepath, description):
            success = False
    
    return success

def test_environment_config():
    """Test environment configuration files."""
    print("\n🔍 Testing Environment Configuration...")
    
    success = True
    
    # Test environment files
    env_files = [
        (".env.development", "Development environment config"),
        (".env.staging", "Staging environment config"),
        (".env.example", "Example environment config")
    ]
    
    for filepath, description in env_files:
        if not test_file_exists(filepath, description):
            success = False
    
    return success

def test_requirements():
    """Test requirements.txt file."""
    print("\n🔍 Testing Requirements...")
    
    if test_file_exists("requirements.txt", "Python requirements"):
        try:
            with open("requirements.txt", 'r') as f:
                requirements = f.read()
            
            required_packages = [
                "fastapi",
                "uvicorn",
                "sqlalchemy",
                "asyncpg",
                "redis",
                "celery",
                "pydantic",
                "streamlit"
            ]
            
            for package in required_packages:
                if package in requirements.lower():
                    print(f"✅ Package included: {package}")
                else:
                    print(f"❌ Package missing: {package}")
                    return False
            
            return True
        except Exception as e:
            print(f"❌ Error reading requirements.txt: {e}")
            return False
    
    return False

def test_makefile():
    """Test Makefile for development commands."""
    print("\n🔍 Testing Makefile...")
    
    if test_file_exists("Makefile", "Development Makefile"):
        try:
            with open("Makefile", 'r') as f:
                makefile_content = f.read()
            
            required_targets = [
                "dev:",
                "staging:",
                "build:",
                "up:",
                "down:",
                "test:",
                "health:"
            ]
            
            for target in required_targets:
                if target in makefile_content:
                    print(f"✅ Makefile target: {target}")
                else:
                    print(f"❌ Makefile missing target: {target}")
                    return False
            
            return True
        except Exception as e:
            print(f"❌ Error reading Makefile: {e}")
            return False
    
    return False

def main():
    """Run all infrastructure tests."""
    print("🚀 AQI Predictor Infrastructure Validation")
    print("=" * 50)
    
    tests = [
        ("Docker Compose Structure", test_docker_compose_structure),
        ("Dockerfile Configuration", test_dockerfile),
        ("Database Initialization", test_database_init),
        ("FastAPI Structure", test_api_structure),
        ("Celery Structure", test_celery_structure),
        ("Environment Configuration", test_environment_config),
        ("Requirements", test_requirements),
        ("Makefile", test_makefile)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 INFRASTRUCTURE VALIDATION SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All infrastructure components are properly configured!")
        print("\nNext steps:")
        print("1. Start Docker Desktop")
        print("2. Run 'make setup' to build and start services")
        print("3. Visit http://localhost:8000/health to verify")
        return 0
    else:
        print("⚠️  Some infrastructure components need attention.")
        return 1

if __name__ == "__main__":
    sys.exit(main())