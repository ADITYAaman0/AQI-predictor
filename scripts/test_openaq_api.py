#!/usr/bin/env python3
"""
Test OpenAQ API with both v2 and v3 endpoints to determine current status.

This script tests the OpenAQ API to see if the updated API key works
and which version of the API is currently functional.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.development')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OpenAQAPITester:
    """Test OpenAQ API with different versions and configurations."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAQ_API_KEY')
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.api_key else '✗ Missing'}")
        if self.api_key:
            logger.info(f"API Key (first 10 chars): {self.api_key[:10]}...")
    
    async def test_openaq_v2_without_key(self) -> dict:
        """Test OpenAQ v2 API without API key."""
        logger.info("Testing OpenAQ v2 API without API key")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.openaq.org/v2/measurements"
                params = {
                    "limit": 5,
                    "city": "Delhi",
                    "country": "IN",
                    "parameter": "pm25"
                }
                
                async with session.get(url, params=params) as response:
                    text = await response.text()
                    
                    return {
                        "version": "v2",
                        "auth": "no_key",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_text": text[:500] + "..." if len(text) > 500 else text,
                        "headers": dict(response.headers)
                    }
                    
        except Exception as e:
            return {
                "version": "v2",
                "auth": "no_key",
                "status": "error",
                "error": str(e)
            }
    
    async def test_openaq_v2_with_key(self) -> dict:
        """Test OpenAQ v2 API with API key."""
        logger.info("Testing OpenAQ v2 API with API key")
        
        if not self.api_key:
            return {
                "version": "v2",
                "auth": "with_key",
                "status": "error",
                "error": "No API key available"
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.openaq.org/v2/measurements"
                params = {
                    "limit": 5,
                    "city": "Delhi",
                    "country": "IN",
                    "parameter": "pm25"
                }
                headers = {
                    "X-API-Key": self.api_key
                }
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "version": "v2",
                        "auth": "with_key",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_text": text[:500] + "..." if len(text) > 500 else text,
                        "headers": dict(response.headers)
                    }
                    
                    # Try to parse JSON if successful
                    if response.status == 200:
                        try:
                            data = await response.json()
                            result["data_points"] = len(data.get("results", []))
                            result["sample_data"] = data.get("results", [])[:2]
                        except:
                            pass
                    
                    return result
                    
        except Exception as e:
            return {
                "version": "v2",
                "auth": "with_key",
                "status": "error",
                "error": str(e)
            }
    
    async def test_openaq_v3_without_key(self) -> dict:
        """Test OpenAQ v3 API without API key."""
        logger.info("Testing OpenAQ v3 API without API key")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.openaq.org/v3/measurements"
                params = {
                    "limit": 5,
                    "cities_id": "2295",  # Delhi city ID in v3
                    "parameters_id": "2"   # PM2.5 parameter ID in v3
                }
                
                async with session.get(url, params=params) as response:
                    text = await response.text()
                    
                    result = {
                        "version": "v3",
                        "auth": "no_key",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_text": text[:500] + "..." if len(text) > 500 else text,
                        "headers": dict(response.headers)
                    }
                    
                    # Try to parse JSON if successful
                    if response.status == 200:
                        try:
                            data = await response.json()
                            result["data_points"] = len(data.get("results", []))
                            result["sample_data"] = data.get("results", [])[:2]
                        except:
                            pass
                    
                    return result
                    
        except Exception as e:
            return {
                "version": "v3",
                "auth": "no_key",
                "status": "error",
                "error": str(e)
            }
    
    async def test_openaq_v3_with_key(self) -> dict:
        """Test OpenAQ v3 API with API key."""
        logger.info("Testing OpenAQ v3 API with API key")
        
        if not self.api_key:
            return {
                "version": "v3",
                "auth": "with_key",
                "status": "error",
                "error": "No API key available"
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.openaq.org/v3/measurements"
                params = {
                    "limit": 5,
                    "cities_id": "2295",  # Delhi city ID in v3
                    "parameters_id": "2"   # PM2.5 parameter ID in v3
                }
                headers = {
                    "X-API-Key": self.api_key
                }
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "version": "v3",
                        "auth": "with_key",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_text": text[:500] + "..." if len(text) > 500 else text,
                        "headers": dict(response.headers)
                    }
                    
                    # Try to parse JSON if successful
                    if response.status == 200:
                        try:
                            data = await response.json()
                            result["data_points"] = len(data.get("results", []))
                            result["sample_data"] = data.get("results", [])[:2]
                        except:
                            pass
                    
                    return result
                    
        except Exception as e:
            return {
                "version": "v3",
                "auth": "with_key",
                "status": "error",
                "error": str(e)
            }
    
    async def test_openaq_cities_endpoint(self) -> dict:
        """Test OpenAQ cities endpoint to get city IDs for v3."""
        logger.info("Testing OpenAQ cities endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try v3 cities endpoint
                url = "https://api.openaq.org/v3/cities"
                params = {
                    "limit": 10,
                    "countries_id": "91"  # India country ID
                }
                
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "cities",
                        "version": "v3",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_text": text[:1000] + "..." if len(text) > 1000 else text
                    }
                    
                    # Try to parse JSON if successful
                    if response.status == 200:
                        try:
                            data = await response.json()
                            cities = data.get("results", [])
                            result["cities_found"] = len(cities)
                            result["sample_cities"] = [
                                {"id": city.get("id"), "name": city.get("name")} 
                                for city in cities[:5]
                            ]
                        except:
                            pass
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "cities",
                "version": "v3",
                "status": "error",
                "error": str(e)
            }
    
    async def run_comprehensive_test(self) -> dict:
        """Run comprehensive OpenAQ API testing."""
        logger.info("Starting comprehensive OpenAQ API testing")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "api_key_status": "present" if self.api_key else "missing",
            "tests": {}
        }
        
        # Test all combinations
        results["tests"]["v2_no_key"] = await self.test_openaq_v2_without_key()
        results["tests"]["v2_with_key"] = await self.test_openaq_v2_with_key()
        results["tests"]["v3_no_key"] = await self.test_openaq_v3_without_key()
        results["tests"]["v3_with_key"] = await self.test_openaq_v3_with_key()
        results["tests"]["cities_endpoint"] = await self.test_openaq_cities_endpoint()
        
        # Analyze results
        working_tests = [
            test_name for test_name, test_result in results["tests"].items()
            if test_result.get("status") == "success"
        ]
        
        results["summary"] = {
            "total_tests": len(results["tests"]),
            "working_tests": len(working_tests),
            "working_test_names": working_tests,
            "recommended_approach": self._get_recommendation(results["tests"])
        }
        
        return results
    
    def _get_recommendation(self, tests: dict) -> str:
        """Get recommendation based on test results."""
        if tests.get("v3_with_key", {}).get("status") == "success":
            return "Use OpenAQ v3 API with API key"
        elif tests.get("v3_no_key", {}).get("status") == "success":
            return "Use OpenAQ v3 API without API key"
        elif tests.get("v2_with_key", {}).get("status") == "success":
            return "Use OpenAQ v2 API with API key"
        elif tests.get("v2_no_key", {}).get("status") == "success":
            return "Use OpenAQ v2 API without API key"
        else:
            return "OpenAQ API appears to be unavailable - use simulation fallback"


async def main():
    """Main function to run OpenAQ API testing."""
    tester = OpenAQAPITester()
    
    try:
        # Run comprehensive test
        results = await tester.run_comprehensive_test()
        
        # Display results
        print("\n" + "="*70)
        print("OPENAQ API COMPREHENSIVE TEST RESULTS")
        print("="*70)
        
        print(f"\nAPI Key Status: {results['api_key_status'].upper()}")
        
        print(f"\nTest Results:")
        for test_name, test_result in results["tests"].items():
            status = test_result.get("status", "unknown").upper()
            status_code = test_result.get("status_code", "N/A")
            
            print(f"\n  {test_name.upper()}:")
            print(f"    Status: {status} (HTTP {status_code})")
            
            if status == "SUCCESS":
                if "data_points" in test_result:
                    print(f"    Data Points: {test_result['data_points']}")
                if "cities_found" in test_result:
                    print(f"    Cities Found: {test_result['cities_found']}")
                    if test_result.get("sample_cities"):
                        print(f"    Sample Cities: {test_result['sample_cities']}")
                if "sample_data" in test_result and test_result["sample_data"]:
                    print(f"    Sample Data Available: Yes")
            elif status == "ERROR":
                error_msg = test_result.get("error", test_result.get("response_text", "Unknown error"))
                print(f"    Error: {error_msg[:100]}...")
        
        print(f"\nSummary:")
        summary = results["summary"]
        print(f"  Total Tests: {summary['total_tests']}")
        print(f"  Working Tests: {summary['working_tests']}")
        print(f"  Working APIs: {', '.join(summary['working_test_names']) if summary['working_test_names'] else 'None'}")
        print(f"  Recommendation: {summary['recommended_approach']}")
        
        # Save detailed results
        with open('openaq_api_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: openaq_api_test_results.json")
        
        # Provide specific guidance
        if summary['working_tests'] > 0:
            print(f"\n✅ SUCCESS: OpenAQ API is working!")
            print(f"   Recommended approach: {summary['recommended_approach']}")
            
            if "v3" in summary['recommended_approach']:
                print(f"\n📝 Next Steps for v3 Integration:")
                print(f"   1. Update OpenAQ client to use v3 endpoints")
                print(f"   2. Use city IDs instead of city names")
                print(f"   3. Use parameter IDs instead of parameter names")
                print(f"   4. Update data parsing logic for v3 response format")
        else:
            print(f"\n❌ OpenAQ API is not working with current configuration")
            print(f"   Consider using simulation fallback or alternative data sources")
        
        print("="*70)
        
    except Exception as e:
        logger.error(f"OpenAQ API testing failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())