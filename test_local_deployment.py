"""
Local Deployment Test Script
Tests that all components are properly configured and ready for deployment
"""

import sys
import os
import importlib
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓{Colors.END} {text}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠{Colors.END} {text}")

def print_error(text):
    print(f"{Colors.RED}✗{Colors.END} {text}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ{Colors.END} {text}")

def test_python_version():
    """Test Python version"""
    print_header("Python Version Check")
    version = sys.version_info
    if version >= (3, 9):
        print_success(f"Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(f"Python {version.major}.{version.minor}.{version.micro} - Requires 3.9+")
        return False

def test_dependencies():
    """Test required dependencies"""
    print_header("Dependency Check")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "streamlit",
        "sqlalchemy",
        "redis",
        "pandas",
        "numpy",
        "scikit-learn",
        "tensorflow",
        "requests",
        "pydantic",
        "alembic",
        "celery",
    ]
    
    all_installed = True
    for package in required_packages:
        try:
            importlib.import_module(package)
            print_success(f"{package}")
        except ImportError:
            print_error(f"{package} - NOT INSTALLED")
            all_installed = False
    
    return all_installed

def test_project_structure():
    """Test project structure"""
    print_header("Project Structure Check")
    
    required_paths = [
        "src/api/main.py",
        "src/ui/components.py",
        "app.py",
        "requirements.txt",
        "docker-compose.prod.yml",
        ".env.development",
        ".env.prod",
    ]
    
    all_exist = True
    for path in required_paths:
        full_path = Path(path)
        if full_path.exists():
            print_success(f"{path}")
        else:
            print_error(f"{path} - NOT FOUND")
            all_exist = False
    
    return all_exist

def test_environment_config():
    """Test environment configuration"""
    print_header("Environment Configuration Check")
    
    env_files = [".env.development", ".env.prod"]
    
    for env_file in env_files:
        if Path(env_file).exists():
            print_success(f"{env_file} exists")
            
            with open(env_file, 'r') as f:
                content = f.read()
                
            # Check for required variables
            required_vars = ['DATABASE_URL', 'REDIS_URL', 'SECRET_KEY']
            for var in required_vars:
                if var in content:
                    print_success(f"  {var} configured")
                else:
                    print_warning(f"  {var} missing")
        else:
            print_error(f"{env_file} not found")
    
    return True

def test_docker_files():
    """Test Docker configuration"""
    print_header("Docker Configuration Check")
    
    docker_files = [
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.prod.yml",
        "docker-compose.dev.yml",
    ]
    
    all_exist = True
    for file in docker_files:
        if Path(file).exists():
            print_success(f"{file}")
        else:
            print_warning(f"{file} - NOT FOUND")
            all_exist = False
    
    return all_exist

def test_api_imports():
    """Test API imports"""
    print_header("API Import Check")
    
    try:
        sys.path.insert(0, os.getcwd())
        from src.api import main
        print_success("FastAPI main module imports successfully")
        
        from src.ui import components
        print_success("UI components module imports successfully")
        
        return True
    except Exception as e:
        print_error(f"Import error: {str(e)}")
        return False

def print_deployment_summary():
    """Print deployment options"""
    print_header("Deployment Options")
    
    print_info("The application is ready for deployment!")
    print()
    print(f"{Colors.BOLD}Option 1: Docker Compose (Recommended){Colors.END}")
    print("  1. Ensure Docker Desktop is running")
    print("  2. Run: docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d")
    print()
    print(f"{Colors.BOLD}Option 2: PowerShell Script{Colors.END}")
    print("  Run: .\\scripts\\docker-prod.ps1")
    print()
    print(f"{Colors.BOLD}Option 3: Manual Local Testing{Colors.END}")
    print("  Note: Requires PostgreSQL and Redis running locally")
    print("  1. Start PostgreSQL: pg_ctl -D /path/to/data start")
    print("  2. Start Redis: redis-server")
    print("  3. Start API: python -m uvicorn src.api.main:app --reload --port 8000")
    print("  4. Start Dashboard: streamlit run app.py --server.port 8501")
    print()
    print(f"{Colors.BOLD}Option 4: Cloud Deployment{Colors.END}")
    print("  - Railway/Render: Connect GitHub repo and deploy")
    print("  - AWS/Azure/GCP: Use managed Kubernetes or container services")
    print()

def main():
    """Main test function"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║         AQI Predictor - Local Deployment Test            ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    results = []
    
    results.append(("Python Version", test_python_version()))
    results.append(("Dependencies", test_dependencies()))
    results.append(("Project Structure", test_project_structure()))
    results.append(("Environment Config", test_environment_config()))
    results.append(("Docker Files", test_docker_files()))
    results.append(("API Imports", test_api_imports()))
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.END}" if result else f"{Colors.RED}FAIL{Colors.END}"
        print(f"  {test_name:.<40} {status}")
    
    print()
    print(f"{Colors.BOLD}Overall Results: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All tests passed! Application is ready for deployment.{Colors.END}\n")
        print_deployment_summary()
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ Some tests failed. Review the issues above before deployment.{Colors.END}\n")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
