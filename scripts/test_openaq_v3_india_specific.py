#!/usr/bin/env python3
"""
Test OpenAQ v3 API specifically for Indian locations and measurements.
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


class OpenAQV3IndiaTest:
    """Test OpenAQ v3 API specifically for Indian data."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAQ_API_KEY')
        self.base_url = "https://api.openaq.org/v3"
        self.india_country_id = 9  # From previous test results
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.api_key else '✗ Missing'}")
    
    async def get_indian_locations(self) -> dict:
        """Get locations specifically in India."""
        logger.info("Getting Indian monitoring locations")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations"
                params = {
                    "limit": 100,
                    "countries": self.india_country_id  # Use country ID instead of code
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "endpoint": "indian_locations",
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_preview": text[:2000] + "..." if len(text) > 2000 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            locations = data.get("results", [])
                            
                            # Filter for major Indian cities
                            delhi_locations = [
                                loc for loc in locations 
                                if any(city in (loc.get("name", "") + " " + str(loc.get("locality", ""))).lower() 
                                      for city in ["delhi", "new delhi"])
                            ]
                            
                            mumbai_locations = [
                                loc for loc in locations 
                                if any(city in (loc.get("name", "") + " " + str(loc.get("locality", ""))).lower() 
                                      for city in ["mumbai", "bombay"])
                            ]
                            
                            bangalore_locations = [
                                loc for loc in locations 
                                if any(city in (loc.get("name", "") + " " + str(loc.get("locality", ""))).lower() 
                                      for city in ["bangalore", "bengaluru"])
                            ]
                            
                            result.update({
                                "total_indian_locations": len(locations),
                                "delhi_locations": len(delhi_locations),
                                "mumbai_locations": len(mumbai_locations),
                                "bangalore_locations": len(bangalore_locations),
                                "sample_locations": [
                                    {
                                        "id": loc.get("id"),
                                        "name": loc.get("name"),
                                        "locality": loc.get("locality"),
                                        "coordinates": loc.get("coordinates"),
                                        "sensors": [
                                            {
                                                "parameter": sensor.get("parameter", {}).get("name"),
                                                "units": sensor.get("parameter", {}).get("units")
                                            }
                                            for sensor in loc.get("sensors", [])
                                        ]
                                    }
                                    for loc in locations[:5]
                                ],
                                "all_locations": locations  # Store for measurements testing
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "endpoint": "indian_locations",
                "status": "error",
                "error": str(e)
            }
    
    async def test_measurements_with_location_id(self, location_id: int, location_name: str) -> dict:
        """Test measurements endpoint with specific location ID."""
        logger.info(f"Testing measurements for location {location_id} ({location_name})")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/measurements"
                params = {
                    "limit": 10,
                    "locations": location_id,
                    "date_from": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
                    "date_to": datetime.now().strftime("%Y-%m-%d")
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "location_id": location_id,
                        "location_name": location_name,
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_preview": text[:1500] + "..." if len(text) > 1500 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            measurements = data.get("results", [])
                            result.update({
                                "measurements_found": len(measurements),
                                "sample_measurements": measurements[:3] if measurements else []
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "location_id": location_id,
                "location_name": location_name,
                "status": "error",
                "error": str(e)
            }
    
    async def test_latest_measurements(self, location_id: int, location_name: str) -> dict:
        """Test latest measurements endpoint."""
        logger.info(f"Testing latest measurements for location {location_id} ({location_name})")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try different endpoint variations
                endpoints_to_try = [
                    f"{self.base_url}/locations/{location_id}/latest",
                    f"{self.base_url}/latest",
                    f"{self.base_url}/measurements/latest"
                ]
                
                results = {}
                
                for endpoint_url in endpoints_to_try:
                    try:
                        params = {"locations": location_id} if "latest" in endpoint_url and location_id else {}
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key
                        
                        async with session.get(endpoint_url, params=params, headers=headers) as response:
                            text = await response.text()
                            
                            results[endpoint_url] = {
                                "status_code": response.status,
                                "status": "success" if response.status == 200 else "error",
                                "response_preview": text[:500] + "..." if len(text) > 500 else text
                            }
                            
                            if response.status == 200:
                                try:
                                    data = await response.json()
                                    if "results" in data:
                                        results[endpoint_url]["data_found"] = len(data["results"])
                                except:
                                    pass
                                    
                    except Exception as e:
                        results[endpoint_url] = {
                            "status": "error",
                            "error": str(e)
                        }
                
                return {
                    "location_id": location_id,
                    "location_name": location_name,
                    "endpoint_tests": results
                }
                    
        except Exception as e:
            return {
                "location_id": location_id,
                "location_name": location_name,
                "status": "error",
                "error": str(e)
            }
    
    async def run_india_specific_test(self) -> dict:
        """Run comprehensive India-specific OpenAQ v3 testing."""
        logger.info("Starting India-specific OpenAQ v3 API testing")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "api_key_status": "present" if self.api_key else "missing",
            "base_url": self.base_url,
            "india_country_id": self.india_country_id,
            "tests": {}
        }
        
        # Get Indian locations
        locations_result = await self.get_indian_locations()
        results["tests"]["indian_locations"] = locations_result
        
        # Test measurements with specific locations
        if locations_result.get("status") == "success" and "all_locations" in locations_result:
            locations = locations_result["all_locations"][:5]  # Test first 5 locations
            
            measurement_tests = []
            latest_tests = []
            
            for location in locations:
                location_id = location.get("id")
                location_name = location.get("name", "Unknown")
                
                if location_id:
                    # Test regular measurements
                    measurement_result = await self.test_measurements_with_location_id(location_id, location_name)
                    measurement_tests.append(measurement_result)
                    
                    # Test latest measurements
                    latest_result = await self.test_latest_measurements(location_id, location_name)
                    latest_tests.append(latest_result)
            
            results["tests"]["measurements_by_location"] = measurement_tests
            results["tests"]["latest_measurements"] = latest_tests
        
        # Analyze results
        working_measurements = [
            test for test in results["tests"].get("measurements_by_location", [])
            if test.get("status") == "success"
        ]
        
        working_latest = []
        for test in results["tests"].get("latest_measurements", []):
            if isinstance(test.get("endpoint_tests"), dict):
                working_endpoints = [
                    endpoint for endpoint, result in test["endpoint_tests"].items()
                    if result.get("status") == "success"
                ]
                if working_endpoints:
                    working_latest.append(test)
        
        results["summary"] = {
            "indian_locations_found": locations_result.get("total_indian_locations", 0),
            "measurements_working": len(working_measurements),
            "latest_endpoints_working": len(working_latest),
            "api_status": "working" if (working_measurements or working_latest) else "partial",
            "recommendation": self._get_india_recommendation(results["tests"])
        }
        
        return results
    
    def _get_india_recommendation(self, tests: dict) -> str:
        """Get recommendation for Indian data integration."""
        locations_working = tests.get("indian_locations", {}).get("status") == "success"
        measurements_working = any(
            test.get("status") == "success" 
            for test in tests.get("measurements_by_location", [])
        )
        latest_working = any(
            any(result.get("status") == "success" for result in test.get("endpoint_tests", {}).values())
            for test in tests.get("latest_measurements", [])
        )
        
        if locations_working and (measurements_working or latest_working):
            return "OpenAQ v3 API can provide Indian air quality data. Proceed with integration."
        elif locations_working:
            return "OpenAQ v3 API has Indian locations but measurements may need different approach."
        else:
            return "OpenAQ v3 API integration needs further investigation for Indian data."


async def main():
    """Main function to run India-specific OpenAQ v3 API testing."""
    tester = OpenAQV3IndiaTest()
    
    try:
        # Run comprehensive test
        results = await tester.run_india_specific_test()
        
        # Display results
        print("\n" + "="*80)
        print("OPENAQ V3 API - INDIA SPECIFIC TEST RESULTS")
        print("="*80)
        
        print(f"\nAPI Configuration:")
        print(f"  Base URL: {results['base_url']}")
        print(f"  API Key Status: {results['api_key_status'].upper()}")
        print(f"  India Country ID: {results['india_country_id']}")
        
        # Indian locations results
        locations = results["tests"].get("indian_locations", {})
        print(f"\nIndian Locations:")
        if locations.get("status") == "success":
            print(f"  ✅ Total Indian Locations: {locations.get('total_indian_locations', 0)}")
            print(f"  🏙️ Delhi Locations: {locations.get('delhi_locations', 0)}")
            print(f"  🏙️ Mumbai Locations: {locations.get('mumbai_locations', 0)}")
            print(f"  🏙️ Bangalore Locations: {locations.get('bangalore_locations', 0)}")
            
            if locations.get("sample_locations"):
                print(f"\n  Sample Locations:")
                for loc in locations["sample_locations"][:3]:
                    sensors = ", ".join([s["parameter"] for s in loc.get("sensors", [])])
                    print(f"    - {loc['name']} (ID: {loc['id']}) - Sensors: {sensors}")
        else:
            print(f"  ❌ Failed to get Indian locations: {locations.get('error', 'Unknown error')}")
        
        # Measurements results
        measurements = results["tests"].get("measurements_by_location", [])
        print(f"\nMeasurements Testing:")
        working_measurements = [m for m in measurements if m.get("status") == "success"]
        print(f"  Working: {len(working_measurements)}/{len(measurements)} locations")
        
        for measurement in measurements[:3]:  # Show first 3
            status = "✅" if measurement.get("status") == "success" else "❌"
            name = measurement.get("location_name", "Unknown")
            loc_id = measurement.get("location_id", "N/A")
            print(f"  {status} {name} (ID: {loc_id})")
            if measurement.get("measurements_found"):
                print(f"      Found {measurement['measurements_found']} measurements")
        
        # Latest measurements results
        latest = results["tests"].get("latest_measurements", [])
        print(f"\nLatest Measurements Testing:")
        working_latest = 0
        for test in latest:
            endpoints = test.get("endpoint_tests", {})
            working_endpoints = [e for e, r in endpoints.items() if r.get("status") == "success"]
            if working_endpoints:
                working_latest += 1
                print(f"  ✅ {test.get('location_name', 'Unknown')} - Working endpoints: {len(working_endpoints)}")
            else:
                print(f"  ❌ {test.get('location_name', 'Unknown')} - No working endpoints")
        
        print(f"\nSummary:")
        summary = results["summary"]
        print(f"  Indian Locations Found: {summary['indian_locations_found']}")
        print(f"  Measurements Working: {summary['measurements_working']} locations")
        print(f"  Latest Endpoints Working: {summary['latest_endpoints_working']} locations")
        print(f"  API Status: {summary['api_status'].upper()}")
        print(f"  Recommendation: {summary['recommendation']}")
        
        # Save detailed results
        with open('openaq_v3_india_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: openaq_v3_india_test_results.json")
        print("="*80)
        
    except Exception as e:
        logger.error(f"India-specific OpenAQ v3 API testing failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())