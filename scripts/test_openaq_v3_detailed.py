#!/usr/bin/env python3
"""
Detailed OpenAQ v3 API testing with proper endpoints and documentation.

This script tests the OpenAQ v3 API using the correct endpoints and parameters
based on the official v3 API documentation.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime, timedelta
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


class OpenAQV3Tester:
    """Test OpenAQ v3 API with correct endpoints and parameters."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAQ_API_KEY')
        self.base_url = "https://api.openaq.org/v3"
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.api_key else '✗ Missing'}")
    
    async def test_root_endpoint(self) -> dict:
        """Test the root API endpoint to check if v3 is available."""
        logger.info("Testing OpenAQ v3 root endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/"
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, headers=headers) as response:
                    text = await response.text()
                    
                    return {
                        "endpoint": "root",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response": text[:1000] + "..." if len(text) > 1000 else text,
                        "headers": dict(response.headers)
                    }
                    
        except Exception as e:
            return {
                "endpoint": "root",
                "status": "error",
                "error": str(e)
            }
    
    async def test_countries_endpoint(self) -> dict:
        """Test the countries endpoint."""
        logger.info("Testing OpenAQ v3 countries endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/countries"
                params = {"limit": 10}
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "countries",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response": text[:1000] + "..." if len(text) > 1000 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            countries = data.get("results", [])
                            india_country = next((c for c in countries if c.get("name", "").lower() == "india"), None)
                            result.update({
                                "countries_found": len(countries),
                                "india_found": india_country is not None,
                                "india_id": india_country.get("id") if india_country else None
                            })
                        except:
                            pass
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "countries",
                "status": "error",
                "error": str(e)
            }
    
    async def test_locations_endpoint(self) -> dict:
        """Test the locations endpoint to find Indian monitoring stations."""
        logger.info("Testing OpenAQ v3 locations endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations"
                params = {
                    "limit": 20,
                    "country": "IN"  # Try with country code
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "locations",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response": text[:1500] + "..." if len(text) > 1500 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            locations = data.get("results", [])
                            delhi_locations = [
                                loc for loc in locations 
                                if "delhi" in loc.get("city", "").lower()
                            ]
                            result.update({
                                "locations_found": len(locations),
                                "delhi_locations": len(delhi_locations),
                                "sample_locations": [
                                    {
                                        "id": loc.get("id"),
                                        "name": loc.get("name"),
                                        "city": loc.get("city"),
                                        "country": loc.get("country")
                                    }
                                    for loc in locations[:3]
                                ]
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "locations",
                "status": "error",
                "error": str(e)
            }
    
    async def test_measurements_endpoint(self) -> dict:
        """Test the measurements endpoint with different parameter combinations."""
        logger.info("Testing OpenAQ v3 measurements endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/measurements"
                params = {
                    "limit": 10,
                    "date_from": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
                    "date_to": datetime.now().strftime("%Y-%m-%d")
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "measurements",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response": text[:1500] + "..." if len(text) > 1500 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            measurements = data.get("results", [])
                            result.update({
                                "measurements_found": len(measurements),
                                "sample_measurements": measurements[:2] if measurements else []
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "measurements",
                "status": "error",
                "error": str(e)
            }
    
    async def test_parameters_endpoint(self) -> dict:
        """Test the parameters endpoint to see available parameters."""
        logger.info("Testing OpenAQ v3 parameters endpoint")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/parameters"
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "parameters",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response": text[:1000] + "..." if len(text) > 1000 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            parameters = data.get("results", [])
                            result.update({
                                "parameters_found": len(parameters),
                                "available_parameters": [
                                    {
                                        "id": param.get("id"),
                                        "name": param.get("name"),
                                        "display_name": param.get("displayName")
                                    }
                                    for param in parameters[:10]
                                ]
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "parameters",
                "status": "error",
                "error": str(e)
            }
    
    async def test_alternative_base_urls(self) -> dict:
        """Test alternative base URLs in case the API has moved."""
        logger.info("Testing alternative OpenAQ base URLs")
        
        alternative_urls = [
            "https://api.openaq.org/v3",
            "https://openaq-api.org/v3",
            "https://api.openaq.com/v3",
            "https://docs.openaq.org/v3"
        ]
        
        results = {}
        
        for base_url in alternative_urls:
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"{base_url}/"
                    headers = {}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key
                    
                    async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        text = await response.text()
                        
                        results[base_url] = {
                            "status_code": response.status,
                            "status": "success" if response.status == 200 else "error",
                            "response": text[:500] + "..." if len(text) > 500 else text
                        }
                        
            except Exception as e:
                results[base_url] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return results
    
    async def run_comprehensive_test(self) -> dict:
        """Run comprehensive OpenAQ v3 API testing."""
        logger.info("Starting comprehensive OpenAQ v3 API testing")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "api_key_status": "present" if self.api_key else "missing",
            "base_url": self.base_url,
            "tests": {}
        }
        
        # Test all endpoints
        results["tests"]["root"] = await self.test_root_endpoint()
        results["tests"]["countries"] = await self.test_countries_endpoint()
        results["tests"]["locations"] = await self.test_locations_endpoint()
        results["tests"]["measurements"] = await self.test_measurements_endpoint()
        results["tests"]["parameters"] = await self.test_parameters_endpoint()
        results["tests"]["alternative_urls"] = await self.test_alternative_base_urls()
        
        # Analyze results
        working_endpoints = [
            endpoint for endpoint, result in results["tests"].items()
            if result.get("status") == "success" or 
            (isinstance(result, dict) and any(
                isinstance(r, dict) and r.get("status") == "success" 
                for r in result.values()
            ))
        ]
        
        results["summary"] = {
            "total_endpoints_tested": len(results["tests"]) - 1,  # Exclude alternative_urls
            "working_endpoints": len(working_endpoints),
            "working_endpoint_names": working_endpoints,
            "api_status": "working" if working_endpoints else "not_working",
            "recommendation": self._get_recommendation(results["tests"])
        }
        
        return results
    
    def _get_recommendation(self, tests: dict) -> str:
        """Get recommendation based on test results."""
        working_tests = [
            test_name for test_name, test_result in tests.items()
            if test_result.get("status") == "success"
        ]
        
        if working_tests:
            return f"OpenAQ v3 API is partially working. Working endpoints: {', '.join(working_tests)}"
        else:
            # Check alternative URLs
            alt_urls = tests.get("alternative_urls", {})
            working_alt_urls = [
                url for url, result in alt_urls.items()
                if result.get("status") == "success"
            ]
            
            if working_alt_urls:
                return f"Try alternative base URL: {working_alt_urls[0]}"
            else:
                return "OpenAQ v3 API appears to be unavailable. Use simulation fallback or alternative data sources."


async def main():
    """Main function to run OpenAQ v3 API testing."""
    tester = OpenAQV3Tester()
    
    try:
        # Run comprehensive test
        results = await tester.run_comprehensive_test()
        
        # Display results
        print("\n" + "="*80)
        print("OPENAQ V3 API DETAILED TEST RESULTS")
        print("="*80)
        
        print(f"\nAPI Configuration:")
        print(f"  Base URL: {results['base_url']}")
        print(f"  API Key Status: {results['api_key_status'].upper()}")
        
        print(f"\nEndpoint Test Results:")
        for endpoint, result in results["tests"].items():
            if endpoint == "alternative_urls":
                continue
                
            status = result.get("status", "unknown").upper()
            status_code = result.get("status_code", "N/A")
            
            print(f"\n  {endpoint.upper()}:")
            print(f"    Status: {status} (HTTP {status_code})")
            
            if status == "SUCCESS":
                if "countries_found" in result:
                    print(f"    Countries Found: {result['countries_found']}")
                    print(f"    India Found: {result.get('india_found', 'Unknown')}")
                if "locations_found" in result:
                    print(f"    Locations Found: {result['locations_found']}")
                    print(f"    Delhi Locations: {result.get('delhi_locations', 0)}")
                if "measurements_found" in result:
                    print(f"    Measurements Found: {result['measurements_found']}")
                if "parameters_found" in result:
                    print(f"    Parameters Found: {result['parameters_found']}")
            elif status == "ERROR":
                error_msg = result.get("error", "Unknown error")
                response_preview = result.get("response", "")[:100]
                print(f"    Error: {error_msg}")
                if response_preview and "error" not in error_msg.lower():
                    print(f"    Response Preview: {response_preview}...")
        
        # Test alternative URLs
        print(f"\nAlternative URL Test Results:")
        alt_results = results["tests"].get("alternative_urls", {})
        for url, result in alt_results.items():
            status = result.get("status", "unknown").upper()
            status_code = result.get("status_code", "N/A")
            print(f"  {url}: {status} (HTTP {status_code})")
        
        print(f"\nSummary:")
        summary = results["summary"]
        print(f"  API Status: {summary['api_status'].upper()}")
        print(f"  Working Endpoints: {summary['working_endpoints']}/{summary['total_endpoints_tested']}")
        print(f"  Recommendation: {summary['recommendation']}")
        
        # Save detailed results
        with open('openaq_v3_detailed_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: openaq_v3_detailed_test_results.json")
        
        # Provide guidance
        if summary['api_status'] == 'working':
            print(f"\n✅ SUCCESS: OpenAQ v3 API has working endpoints!")
            print(f"   You can proceed with v3 integration using the working endpoints.")
        else:
            print(f"\n❌ OpenAQ v3 API is not accessible with current configuration")
            print(f"   Possible issues:")
            print(f"   1. API key may be invalid or expired")
            print(f"   2. API endpoints may have changed")
            print(f"   3. API may require different authentication")
            print(f"   4. API may be temporarily unavailable")
            
            print(f"\n💡 Recommendations:")
            print(f"   1. Check OpenAQ documentation for latest API changes")
            print(f"   2. Verify API key is valid and has proper permissions")
            print(f"   3. Consider using alternative air quality data sources")
            print(f"   4. Continue using simulation fallback for now")
        
        print("="*80)
        
    except Exception as e:
        logger.error(f"OpenAQ v3 API testing failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())