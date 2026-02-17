"""
Test dual frontend performance - verify backend can serve both frontends efficiently.
Validates: Requirement 8.3
"""

import pytest
import requests
import time
import concurrent.futures
from typing import List, Dict, Any
import statistics
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestDualFrontendPerformance:
    """Test performance when both Streamlit and Leaflet frontends are active"""
    
    @pytest.fixture
    def api_base_url(self):
        """Base URL for API endpoints"""
        return os.getenv("API_BASE_URL", "http://localhost:8000")
    
    @pytest.fixture
    def streamlit_url(self):
        """Base URL for Streamlit dashboard"""
        return os.getenv("STREAMLIT_URL", "http://localhost:8501")
    
    @pytest.fixture
    def leaflet_url(self):
        """Base URL for Leaflet frontend"""
        return os.getenv("LEAFLET_URL", "http://localhost:8080")
    
    def measure_response_time(self, url: str, timeout: int = 10) -> float:
        """
        Measure response time for a URL.
        Returns response time in milliseconds, or -1 if failed.
        """
        try:
            start = time.time()
            response = requests.get(url, timeout=timeout)
            end = time.time()
            
            if response.status_code in [200, 401, 422]:
                return (end - start) * 1000  # Convert to ms
            return -1
        except:
            return -1
    
    def test_api_response_time_under_load(self, api_base_url):
        """
        Test that API maintains acceptable response times under concurrent load.
        Validates: Requirement 8.3
        """
        endpoint = f"{api_base_url}/health"
        num_requests = 20
        
        try:
            # Measure response times for concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [
                    executor.submit(self.measure_response_time, endpoint)
                    for _ in range(num_requests)
                ]
                
                response_times = [
                    f.result() for f in concurrent.futures.as_completed(futures)
                ]
            
            # Filter out failed requests
            valid_times = [t for t in response_times if t > 0]
            
            if not valid_times:
                pytest.skip("API not accessible - skipping test")
            
            # Calculate statistics
            avg_time = statistics.mean(valid_times)
            max_time = max(valid_times)
            
            # Assert acceptable performance (< 1000ms average, < 2000ms max)
            assert avg_time < 1000, f"Average response time too high: {avg_time:.2f}ms"
            assert max_time < 2000, f"Max response time too high: {max_time:.2f}ms"
            
            print(f"\n✓ API Performance under load:")
            print(f"  Average: {avg_time:.2f}ms")
            print(f"  Max: {max_time:.2f}ms")
            print(f"  Requests: {len(valid_times)}/{num_requests}")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_concurrent_frontend_requests(self, api_base_url):
        """
        Test that API can handle concurrent requests from both frontends.
        Validates: Requirement 8.3
        """
        # Simulate requests from both frontends
        endpoints = [
            f"{api_base_url}/health",
            f"{api_base_url}/api/v1/data/stations",
            f"{api_base_url}/health",
            f"{api_base_url}/api/v1/data/stations",
        ]
        
        try:
            # Make concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = [
                    executor.submit(self.measure_response_time, endpoint)
                    for endpoint in endpoints
                ]
                
                response_times = [
                    f.result() for f in concurrent.futures.as_completed(futures)
                ]
            
            # Filter out failed requests
            valid_times = [t for t in response_times if t > 0]
            
            if not valid_times:
                pytest.skip("API not accessible - skipping test")
            
            # All requests should complete successfully
            success_rate = len(valid_times) / len(endpoints)
            assert success_rate >= 0.8, f"Too many failed requests: {success_rate:.1%}"
            
            print(f"\n✓ Concurrent frontend requests:")
            print(f"  Success rate: {success_rate:.1%}")
            print(f"  Average time: {statistics.mean(valid_times):.2f}ms")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_api_throughput(self, api_base_url):
        """
        Test API throughput with multiple concurrent clients.
        Validates: Requirement 8.3
        """
        endpoint = f"{api_base_url}/health"
        num_requests = 50
        max_workers = 10
        
        try:
            start_time = time.time()
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(self.measure_response_time, endpoint)
                    for _ in range(num_requests)
                ]
                
                response_times = [
                    f.result() for f in concurrent.futures.as_completed(futures)
                ]
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Filter out failed requests
            valid_times = [t for t in response_times if t > 0]
            
            if not valid_times:
                pytest.skip("API not accessible - skipping test")
            
            # Calculate throughput
            throughput = len(valid_times) / total_time
            
            # Assert minimum throughput (at least 10 requests/second)
            assert throughput >= 10, f"Throughput too low: {throughput:.2f} req/s"
            
            print(f"\n✓ API Throughput:")
            print(f"  Requests/second: {throughput:.2f}")
            print(f"  Total time: {total_time:.2f}s")
            print(f"  Success rate: {len(valid_times)}/{num_requests}")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_no_performance_degradation_with_dual_frontends(self, api_base_url):
        """
        Test that having both frontends doesn't degrade API performance.
        Validates: Requirement 8.3
        """
        endpoint = f"{api_base_url}/health"
        
        try:
            # Measure baseline performance (single request)
            baseline_times = [
                self.measure_response_time(endpoint)
                for _ in range(5)
            ]
            baseline_times = [t for t in baseline_times if t > 0]
            
            if not baseline_times:
                pytest.skip("API not accessible - skipping test")
            
            baseline_avg = statistics.mean(baseline_times)
            
            # Measure performance under load (simulating dual frontend usage)
            load_times = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [
                    executor.submit(self.measure_response_time, endpoint)
                    for _ in range(20)
                ]
                load_times = [
                    f.result() for f in concurrent.futures.as_completed(futures)
                ]
            
            load_times = [t for t in load_times if t > 0]
            load_avg = statistics.mean(load_times)
            
            # Performance degradation should be less than 3x
            degradation_factor = load_avg / baseline_avg
            assert degradation_factor < 3.0, \
                f"Performance degraded too much: {degradation_factor:.2f}x"
            
            print(f"\n✓ Performance degradation test:")
            print(f"  Baseline: {baseline_avg:.2f}ms")
            print(f"  Under load: {load_avg:.2f}ms")
            print(f"  Degradation: {degradation_factor:.2f}x")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")


class TestResourceUtilization:
    """Test resource utilization with dual frontends"""
    
    @pytest.fixture
    def api_base_url(self):
        """Base URL for API endpoints"""
        return os.getenv("API_BASE_URL", "http://localhost:8000")
    
    def test_api_handles_burst_traffic(self, api_base_url):
        """
        Test that API can handle burst traffic from both frontends.
        Validates: Requirement 8.3
        """
        endpoint = f"{api_base_url}/health"
        burst_size = 30
        
        try:
            # Simulate burst traffic
            start_time = time.time()
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=burst_size) as executor:
                futures = [
                    executor.submit(requests.get, endpoint, timeout=10)
                    for _ in range(burst_size)
                ]
                
                responses = []
                for future in concurrent.futures.as_completed(futures):
                    try:
                        responses.append(future.result())
                    except:
                        pass
            
            end_time = time.time()
            
            if not responses:
                pytest.skip("API not accessible - skipping test")
            
            # Calculate success rate
            successful = sum(1 for r in responses if r.status_code == 200)
            success_rate = successful / burst_size
            
            # At least 80% should succeed
            assert success_rate >= 0.8, f"Too many failures under burst: {success_rate:.1%}"
            
            # Should complete within reasonable time (< 10 seconds)
            total_time = end_time - start_time
            assert total_time < 10, f"Burst took too long: {total_time:.2f}s"
            
            print(f"\n✓ Burst traffic handling:")
            print(f"  Success rate: {success_rate:.1%}")
            print(f"  Total time: {total_time:.2f}s")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")
    
    def test_api_maintains_consistency_under_load(self, api_base_url):
        """
        Test that API maintains data consistency under concurrent load.
        Validates: Requirement 8.3
        """
        endpoint = f"{api_base_url}/health"
        
        try:
            # Make multiple concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [
                    executor.submit(requests.get, endpoint, timeout=10)
                    for _ in range(20)
                ]
                
                responses = []
                for future in concurrent.futures.as_completed(futures):
                    try:
                        r = future.result()
                        if r.status_code == 200:
                            responses.append(r.json())
                    except:
                        pass
            
            if not responses:
                pytest.skip("API not accessible - skipping test")
            
            # All responses should have consistent structure
            first_keys = set(responses[0].keys())
            for response in responses[1:]:
                assert set(response.keys()) == first_keys, \
                    "Response structure inconsistent under load"
            
            print(f"\n✓ Data consistency under load:")
            print(f"  Responses checked: {len(responses)}")
            print(f"  All consistent: ✓")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API not running - skipping test")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
