#!/usr/bin/env python3
"""
Generate comprehensive property-based test report
"""
import subprocess
import json
from datetime import datetime
from pathlib import Path

# List of all property test files
PROPERTY_TESTS = [
    "tests/test_data_persistence_properties.py",
    "tests/test_api_response_properties.py",
    "tests/test_data_quality_properties.py",
    "tests/test_ml_model_properties.py",
    "tests/test_job_retry_properties.py",
    "tests/test_multi_location_api_properties.py",
    "tests/test_rate_limiting_properties.py",
    "tests/test_spatial_prediction_properties.py",
    "tests/test_alerting_properties.py",
    "tests/test_multi_city_properties.py",
    "tests/test_ab_testing_properties.py",
]

def run_test(test_file):
    """Run a single test file and capture results"""
    print(f"\n{'='*80}")
    print(f"Running: {test_file}")
    print('='*80)
    
    try:
        result = subprocess.run(
            ["python", "-m", "pytest", test_file, "-v", "--tb=short", "--timeout=60"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        return {
            "file": test_file,
            "status": "passed" if result.returncode == 0 else "failed",
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.TimeoutExpired:
        return {
            "file": test_file,
            "status": "timeout",
            "returncode": -1,
            "stdout": "",
            "stderr": "Test timed out after 120 seconds"
        }
    except Exception as e:
        return {
            "file": test_file,
            "status": "error",
            "returncode": -1,
            "stdout": "",
            "stderr": str(e)
        }

def main():
    """Run all property tests and generate report"""
    print("=" * 80)
    print("PROPERTY-BASED TEST SUITE EXECUTION")
    print("=" * 80)
    print(f"Start time: {datetime.now().isoformat()}")
    print(f"Total tests to run: {len(PROPERTY_TESTS)}")
    
    results = []
    
    for test_file in PROPERTY_TESTS:
        result = run_test(test_file)
        results.append(result)
        
        # Print summary for this test
        status_emoji = "✅" if result["status"] == "passed" else "❌"
        print(f"\n{status_emoji} {test_file}: {result['status'].upper()}")
    
    # Generate summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in results if r["status"] == "passed")
    failed = sum(1 for r in results if r["status"] == "failed")
    timeout = sum(1 for r in results if r["status"] == "timeout")
    error = sum(1 for r in results if r["status"] == "error")
    
    print(f"Total: {len(results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⏱️  Timeout: {timeout}")
    print(f"⚠️  Error: {error}")
    print(f"\nSuccess rate: {passed/len(results)*100:.1f}%")
    
    # Save detailed results
    report_file = "property_test_report.json"
    with open(report_file, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": len(results),
                "passed": passed,
                "failed": failed,
                "timeout": timeout,
                "error": error,
                "success_rate": passed/len(results)*100
            },
            "results": results
        }, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")
    print(f"End time: {datetime.now().isoformat()}")
    
    return 0 if failed == 0 and timeout == 0 and error == 0 else 1

if __name__ == "__main__":
    exit(main())
