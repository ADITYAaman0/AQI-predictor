#!/usr/bin/env python3
"""
Validation script for CI/CD pipeline components.
Tests that all CI/CD configuration files are valid and properly structured.
"""

import os
import sys
import yaml
import json
from pathlib import Path
from typing import List, Dict, Any


class CICDValidator:
    """Validates CI/CD pipeline configuration"""
    
    def __init__(self):
        self.root_path = Path(__file__).parent.parent
        self.errors = []
        self.warnings = []
    
    def validate_yaml_file(self, file_path: Path) -> bool:
        """Validate YAML file syntax"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                yaml.safe_load(f)
            return True
        except yaml.YAMLError as e:
            self.errors.append(f"YAML syntax error in {file_path}: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Error reading {file_path}: {e}")
            return False
    
    def validate_github_workflows(self) -> bool:
        """Validate GitHub Actions workflow files"""
        workflows_dir = self.root_path / ".github" / "workflows"
        
        if not workflows_dir.exists():
            self.errors.append("GitHub workflows directory not found")
            return False
        
        required_workflows = [
            "ci-cd-pipeline.yml",
            "manual-deployment.yml",
            "database-migration.yml",
            "docker-build-matrix.yml"
        ]
        
        all_valid = True
        
        for workflow in required_workflows:
            workflow_path = workflows_dir / workflow
            if not workflow_path.exists():
                self.errors.append(f"Required workflow {workflow} not found")
                all_valid = False
                continue
            
            if not self.validate_yaml_file(workflow_path):
                all_valid = False
                continue
            
            # Validate workflow structure
            with open(workflow_path, 'r', encoding='utf-8') as f:
                workflow_data = yaml.safe_load(f)
            
            if not self.validate_workflow_structure(workflow, workflow_data):
                all_valid = False
        
        return all_valid
    
    def validate_workflow_structure(self, workflow_name: str, workflow_data: Dict[str, Any]) -> bool:
        """Validate GitHub Actions workflow structure"""
        required_keys = ['name', 'on', 'jobs']
        
        for key in required_keys:
            if key not in workflow_data:
                self.errors.append(f"Workflow {workflow_name} missing required key: {key}")
                return False
        
        # Validate jobs structure
        jobs = workflow_data.get('jobs', {})
        if not isinstance(jobs, dict) or not jobs:
            self.errors.append(f"Workflow {workflow_name} has no jobs defined")
            return False
        
        # Check for common job requirements
        for job_name, job_data in jobs.items():
            if not isinstance(job_data, dict):
                self.errors.append(f"Job {job_name} in {workflow_name} is not properly structured")
                return False
            
            if 'runs-on' not in job_data:
                self.errors.append(f"Job {job_name} in {workflow_name} missing 'runs-on'")
                return False
        
        return True
    
    def validate_docker_files(self) -> bool:
        """Validate Docker configuration files"""
        docker_files = [
            "Dockerfile",
            "Dockerfile.streamlit", 
            "Dockerfile.celery",
            "docker-compose.dev.yml",
            "docker-compose.prod.yml"
        ]
        
        all_valid = True
        
        for docker_file in docker_files:
            file_path = self.root_path / docker_file
            
            if not file_path.exists():
                self.warnings.append(f"Docker file {docker_file} not found")
                continue
            
            if docker_file.endswith('.yml'):
                if not self.validate_yaml_file(file_path):
                    all_valid = False
            else:
                # Basic Dockerfile validation
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if not content.strip().startswith('FROM'):
                            self.errors.append(f"Dockerfile {docker_file} should start with FROM")
                            all_valid = False
                except Exception as e:
                    self.errors.append(f"Error reading {docker_file}: {e}")
                    all_valid = False
        
        return all_valid
    
    def validate_scripts(self) -> bool:
        """Validate CI/CD scripts"""
        scripts_dir = self.root_path / "scripts"
        
        if not scripts_dir.exists():
            self.warnings.append("Scripts directory not found")
            return True
        
        required_scripts = [
            "migrate-database.py"
        ]
        
        all_valid = True
        
        for script in required_scripts:
            script_path = scripts_dir / script
            
            if not script_path.exists():
                self.errors.append(f"Required script {script} not found")
                all_valid = False
                continue
            
            # Basic Python script validation
            try:
                with open(script_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if not content.strip():
                        self.errors.append(f"Script {script} is empty")
                        all_valid = False
                    elif 'def main(' not in content and '__main__' not in content:
                        self.warnings.append(f"Script {script} may not be executable")
            except Exception as e:
                self.errors.append(f"Error reading script {script}: {e}")
                all_valid = False
        
        return all_valid
    
    def validate_test_structure(self) -> bool:
        """Validate test structure for CI/CD"""
        tests_dir = self.root_path / "tests"
        
        if not tests_dir.exists():
            self.errors.append("Tests directory not found")
            return False
        
        # Check for integration tests
        integration_dir = tests_dir / "integration"
        if not integration_dir.exists():
            self.warnings.append("Integration tests directory not found")
        else:
            # Check for deployment smoke tests
            smoke_test = integration_dir / "test_deployment_smoke.py"
            if not smoke_test.exists():
                self.warnings.append("Deployment smoke tests not found")
        
        return True
    
    def validate_configuration_files(self) -> bool:
        """Validate CI/CD configuration files"""
        config_files = [
            ".github/ci-cd-config.yml"
        ]
        
        all_valid = True
        
        for config_file in config_files:
            config_path = self.root_path / config_file
            
            if not config_path.exists():
                self.warnings.append(f"Configuration file {config_file} not found")
                continue
            
            if not self.validate_yaml_file(config_path):
                all_valid = False
        
        return all_valid
    
    def run_validation(self) -> bool:
        """Run all validations"""
        print("🔍 Validating CI/CD pipeline configuration...")
        print()
        
        validations = [
            ("GitHub Workflows", self.validate_github_workflows),
            ("Docker Files", self.validate_docker_files),
            ("Scripts", self.validate_scripts),
            ("Test Structure", self.validate_test_structure),
            ("Configuration Files", self.validate_configuration_files)
        ]
        
        all_passed = True
        
        for name, validation_func in validations:
            print(f"Validating {name}...")
            try:
                result = validation_func()
                if result:
                    print(f"✓ {name} validation passed")
                else:
                    print(f"✗ {name} validation failed")
                    all_passed = False
            except Exception as e:
                print(f"✗ {name} validation error: {e}")
                all_passed = False
            print()
        
        # Print summary
        print("=" * 50)
        print("VALIDATION SUMMARY")
        print("=" * 50)
        
        if self.errors:
            print(f"❌ {len(self.errors)} Error(s):")
            for error in self.errors:
                print(f"  - {error}")
            print()
        
        if self.warnings:
            print(f"⚠️  {len(self.warnings)} Warning(s):")
            for warning in self.warnings:
                print(f"  - {warning}")
            print()
        
        if all_passed and not self.errors:
            print("🎉 All CI/CD validations passed!")
            return True
        else:
            print("❌ CI/CD validation failed. Please fix the errors above.")
            return False


def main():
    """Main validation entry point"""
    validator = CICDValidator()
    success = validator.run_validation()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()