#!/usr/bin/env python3
"""
Run All Property-Based Tests

Executes all 15 correctness properties with 100+ iterations each
and generates a comprehensive test report.

Requirements: Task 15.2
"""

import subprocess
import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


class PropertyTestRunner:
    """Runner for all property-based tests."""
    
    def __init__(self):
        self.results = {
            "test_timestamp": datetime.now().isoformat(),
            "properties_tested": [],
            "summary": {},
            "detailed_results": {}
        }
        
        # Map of property tests to their files
        self.property_tests = {
            "Property 1: Data Persistence Round Trip": "tests/test_data_persistence_properties.py",
            "Property 2: API Response Format Consistency": "tests/test_api_response_properties.py",
            "Property 3: Rate Limiting Enforcement": "tests/test_rate_limiting_properties.py",
            "Property 4: Multi-Location API Support": "tests/test_multi_location_api_properties.py",
            "Property 5: LSTM Model Accuracy Bounds": "tests/test_ml_model_properties.py::TestMLModelProperties::test_lstm_model_accuracy_bounds_property_5",
            "Property 6: Confidence Interval Calibration": "tests/test_ml_model_properties.py::TestMLModelProperties::test_confidence_interval_calibration_property_6",
            "Property 7: Source Attribution Completeness": "tests/test_ml_model_properties.py",
            "Property 8: Scenario Analysis Consistency": "tests/test_ml_model_properties.py",
            "Property 9: Data Quality Validation": "tests/test_data_quality_properties.py",
            "Property 10: Job Retry Exponential Backoff": "tests/test_job_retry_properties.py",
            "Property 11: Alert Threshold Triggering": "tests/test_alerting_properties.py",
            "Property 12: Alert Rate Limiting": "tests/test_alerting_properties.py",
            "Property 13: Spatial Grid Resolution": "tests/test_spatial_prediction_properties.py",
            "Property 14: Hourly Spatial Updates": "tests/test_spatial_prediction_properties.py",
            "Property 15: Multi-City Support Coverage": "tests/test_multi_city_properties.py",
        }
    
    def run_property_test(self, property_name: str, test_path: str) -> Dict[str, Any]:
        """Run a single property test."""
        print(f"\n{'='*70}")
        print(f"Running: {property_name}")
        print(f"Test: {test_path}")
        print(f"{'='*70}")
        
        start_time = time.time()
        
        try:
            # Run pytest with JSON output
            result = subprocess.run(
                [
                    sys.executable, "-m", "pytest",
                    test_path,
                    "-v",
                    "--tb=short",
                    "--hypothesis-show-statistics",
                    "-x"  # Stop on first failure
                ],
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout per test
            )
           

            
            elapsed_time = time.time() - start_time
            
            test_result = {
                "property": property_name,
                "test_path": test_path,
                "passed": result.returncode == 0,
                "elapsed_time": elapsed_time,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
            
            if result.returncode == 0:
                print(f"✓ PASSED in {elapsed_time:.2f}s")
            else:
                print(f"✗ FAILED in {elapsed_time:.2f}s")
                print(f"\nError output:\n{result.stderr}")
            
            return test_result
            
        except subprocess.TimeoutExpired:
            elapsed_time = time.time() - start_time
            print(f"✗ TIMEOUT after {elapsed_time:.2f}s")
            return {
                "property": property_name,
                "test_path": test_path,
                "passed": False,
                "elapsed_time": elapsed_time,
                "stdout": "",
                "stderr": "Test timed out after 600 seconds"
            }
        except Exception as e:
            elapsed_time = time.time() - start_time
            print(f"✗ ERROR: {str(e)}")
            return {
                "property": property_name,
                "test_path": test_path,
                "passed": False,
                "elapsed_time": elapsed_time,
                "stdout": "",
                "stderr": str(e)
            }
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all property tests."""
        print("\n" + "="*70)
        print("PROPERTY-BASED TEST SUITE")
        print("Running all 15 correctness properties with 100+ iterations each")
        print("="*70)
        
        total_start = time.time()
        passed_count = 0
        failed_count = 0
        
        for property_name, test_path in self.property_tests.items():
            result = self.run_property_test(property_name, test_path)
            self.results["detailed_results"][property_name] = result
            
            if result["passed"]:
                passed_count += 1
            else:
                failed_count += 1
        
        total_elapsed = time.time() - total_start
        
        # Generate summary
        self.results["summary"] = {
            "total_properties": len(self.property_tests),
            "passed": passed_count,
            "failed": failed_count,
            "total_time": total_elapsed,
            "success_rate": (passed_count / len(self.property_tests)) * 100
        }
        
        return self.results
    
    def print_summary(self):
        """Print test summary."""
        summary = self.results["summary"]
        
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Properties: {summary['total_properties']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        print(f"Total Time: {summary['total_time']:.2f}s")
        print("="*70)
        
        if summary['failed'] > 0:
            print("\nFailed Properties:")
            for prop_name, result in self.results["detailed_results"].items():
                if not result["passed"]:
                    print(f"  ✗ {prop_name}")
                    print(f"    Test: {result['test_path']}")
                    if result.get("stderr"):
                        # Print first few lines of error
                        error_lines = result["stderr"].split("\n")[:5]
                        for line in error_lines:
                            print(f"    {line}")
    
    def save_report(self, output_path: str = "property_test_report.json"):
        """Save test results to JSON file."""
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\nDetailed report saved to: {output_path}")


def main():
    """Main entry point."""
    runner = PropertyTestRunner()
    
    try:
        results = runner.run_all_tests()
        runner.print_summary()
        runner.save_report()
        
        # Exit with appropriate code
        if results["summary"]["failed"] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n\nTest run interrupted by user")
        runner.print_summary()
        runner.save_report("property_test_report_incomplete.json")
        sys.exit(2)
    except Exception as e:
        print(f"\n\nUnexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(3)


if __name__ == "__main__":
    main()
