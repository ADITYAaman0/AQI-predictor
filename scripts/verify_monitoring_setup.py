"""
Verification script for monitoring and observability setup.
Checks that all monitoring components are properly configured.
"""

import os
import sys
import json
from pathlib import Path

def check_file_exists(filepath: str, description: str) -> bool:
    """Check if a file exists."""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description}: {filepath} NOT FOUND")
        return False

def check_directory_exists(dirpath: str, description: str) -> bool:
    """Check if a directory exists."""
    if os.path.isdir(dirpath):
        print(f"✓ {description}: {dirpath}")
        return True
    else:
        print(f"✗ {description}: {dirpath} NOT FOUND")
        return False

def verify_monitoring_setup():
    """Verify monitoring and observability setup."""
    print("=" * 60)
    print("Monitoring and Observability Setup Verification")
    print("=" * 60)
    print()
    
    checks_passed = 0
    checks_total = 0
    
    # Check Python modules
    print("Checking Python Modules:")
    print("-" * 60)
    
    modules = [
        ("src/api/prometheus_metrics.py", "Prometheus metrics exporter"),
        ("src/api/tracing.py", "OpenTelemetry tracing"),
        ("src/utils/structured_logging.py", "Structured logging"),
        ("src/utils/alerting.py", "Alert management"),
        ("src/utils/uptime_monitor.py", "Uptime monitoring"),
    ]
    
    for filepath, description in modules:
        checks_total += 1
        if check_file_exists(filepath, description):
            checks_passed += 1
    
    print()
    
    # Check Grafana dashboards
    print("Checking Grafana Dashboards:")
    print("-" * 60)
    
    dashboards = [
        ("docker/grafana/dashboards/aqi-system-overview.json", "System Overview Dashboard"),
        ("docker/grafana/dashboards/aqi-ml-models.json", "ML Models Dashboard"),
        ("docker/grafana/dashboards/aqi-data-pipeline.json", "Data Pipeline Dashboard"),
    ]
    
    for filepath, description in dashboards:
        checks_total += 1
        if check_file_exists(filepath, description):
            checks_passed += 1
            # Validate JSON
            try:
                with open(filepath, 'r') as f:
                    json.load(f)
                print(f"  → Valid JSON format")
            except json.JSONDecodeError as e:
                print(f"  → WARNING: Invalid JSON - {e}")
    
    print()
    
    # Check Grafana provisioning
    print("Checking Grafana Provisioning:")
    print("-" * 60)
    
    provisioning = [
        ("docker/grafana/provisioning/datasources/prometheus.yml", "Prometheus datasource"),
        ("docker/grafana/provisioning/dashboards/dashboards.yml", "Dashboard provisioning"),
    ]
    
    for filepath, description in provisioning:
        checks_total += 1
        if check_file_exists(filepath, description):
            checks_passed += 1
    
    print()
    
    # Check Prometheus configuration
    print("Checking Prometheus Configuration:")
    print("-" * 60)
    
    prometheus_files = [
        ("docker/prometheus/prometheus.yml", "Prometheus config"),
        ("docker/prometheus/alert_rules.yml", "Alert rules"),
    ]
    
    for filepath, description in prometheus_files:
        checks_total += 1
        if check_file_exists(filepath, description):
            checks_passed += 1
    
    print()
    
    # Check Docker Compose
    print("Checking Docker Compose Configuration:")
    print("-" * 60)
    
    checks_total += 1
    if check_file_exists("docker-compose.yml", "Docker Compose file"):
        checks_passed += 1
        # Check for monitoring services
        with open("docker-compose.yml", 'r') as f:
            content = f.read()
            services = ["prometheus", "grafana", "jaeger"]
            for service in services:
                if service in content:
                    print(f"  → {service.capitalize()} service configured")
                else:
                    print(f"  → WARNING: {service.capitalize()} service not found")
    
    print()
    
    # Check documentation
    print("Checking Documentation:")
    print("-" * 60)
    
    docs = [
        ("MONITORING_OBSERVABILITY_GUIDE.md", "Monitoring guide"),
        ("MONITORING_IMPLEMENTATION_SUMMARY.md", "Implementation summary"),
    ]
    
    for filepath, description in docs:
        checks_total += 1
        if check_file_exists(filepath, description):
            checks_passed += 1
    
    print()
    
    # Check requirements.txt
    print("Checking Dependencies:")
    print("-" * 60)
    
    checks_total += 1
    if check_file_exists("requirements.txt", "Requirements file"):
        checks_passed += 1
        with open("requirements.txt", 'r') as f:
            content = f.read()
            dependencies = [
                "prometheus-client",
                "opentelemetry-api",
                "opentelemetry-sdk",
                "opentelemetry-instrumentation-fastapi",
            ]
            for dep in dependencies:
                if dep in content:
                    print(f"  → {dep} included")
                else:
                    print(f"  → WARNING: {dep} not found")
    
    print()
    
    # Summary
    print("=" * 60)
    print(f"Verification Summary: {checks_passed}/{checks_total} checks passed")
    print("=" * 60)
    
    if checks_passed == checks_total:
        print("✓ All monitoring components are properly configured!")
        return 0
    else:
        print(f"✗ {checks_total - checks_passed} checks failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(verify_monitoring_setup())
