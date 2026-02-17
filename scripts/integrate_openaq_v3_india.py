#!/usr/bin/env python3
"""
Integrate OpenAQ v3 API with correct Indian locations and update the system.
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


class OpenAQV3Integration:
    """Integrate OpenAQ v3 API with correct Indian data."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAQ_API_KEY')
        self.base_url = "https://api.openaq.org/v3"
        self.india_country_id = 9  # Correct India ID
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.api_key else '✗ Missing'}")
    
    async def get_all_indian_locations(self) -> dict:
        """Get all Indian monitoring locations."""
        logger.info("Getting all Indian monitoring locations")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations"
                params = {
                    "limit": 1000,  # Get all locations
                    "countries": self.india_country_id
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        locations = data.get("results", [])
                        
                        # Filter for actual Indian locations (country ID 9)
                        indian_locations = [
                            loc for loc in locations 
                            if loc.get("country", {}).get("id") == 9
                        ]
                        
                        # Categorize by city
                        cities = {}
                        for location in indian_locations:
                            name = location.get("name", "").lower()
                            
                            # Determine city
                            city = "Other"
                            if "delhi" in name:
                                city = "Delhi"
                            elif "mumbai" in name or "bombay" in name:
                                city = "Mumbai"
                            elif "bangalore" in name or "bengaluru" in name:
                                city = "Bangalore"
                            elif "chennai" in name or "madras" in name:
                                city = "Chennai"
                            elif "kolkata" in name or "calcutta" in name:
                                city = "Kolkata"
                            elif "hyderabad" in name:
                                city = "Hyderabad"
                            elif "pune" in name:
                                city = "Pune"
                            elif "ahmedabad" in name:
                                city = "Ahmedabad"
                            
                            if city not in cities:
                                cities[city] = []
                            cities[city].append(location)
                        
                        return {
                            "status": "success",
                            "total_locations": len(locations),
                            "indian_locations": len(indian_locations),
                            "cities": cities,
                            "all_indian_locations": indian_locations
                        }
                    else:
                        text = await response.text()
                        return {
                            "status": "error",
                            "status_code": response.status,
                            "response": text
                        }
                        
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def test_location_latest_data(self, location_id: int, location_name: str) -> dict:
        """Test getting latest data for a specific location."""
        logger.info(f"Testing latest data for {location_name} (ID: {location_id})")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations/{location_id}/latest"
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "location_id": location_id,
                        "location_name": location_name,
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error"
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            measurements = data.get("results", [])
                            result.update({
                                "measurements_found": len(measurements),
                                "latest_measurements": measurements,
                                "has_recent_data": len(measurements) > 0
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    else:
                        result["response"] = text[:500]
                    
                    return result
                    
        except Exception as e:
            return {
                "location_id": location_id,
                "location_name": location_name,
                "status": "error",
                "error": str(e)
            }
    
    async def test_measurements_with_parameters(self, location_id: int, location_name: str) -> dict:
        """Test measurements endpoint with different parameter combinations."""
        logger.info(f"Testing measurements with parameters for {location_name}")
        
        parameter_tests = {}
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test different parameter combinations
                test_params = [
                    {"locations": location_id, "limit": 10},
                    {"locations": location_id, "limit": 10, "parameters": "pm25"},
                    {"locations": location_id, "limit": 10, "parameters": "pm10"},
                    {"locations": location_id, "limit": 10, "parameters": "no2"},
                    {"locations": location_id, "limit": 10, "parameters": "o3"},
                    {"locations": location_id, "limit": 10, "date_from": "2024-01-01"},
                    {"locations": location_id, "limit": 10, "date_from": "2023-01-01", "date_to": "2023-12-31"}
                ]
                
                for i, params in enumerate(test_params):
                    try:
                        url = f"{self.base_url}/measurements"
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key
                        
                        async with session.get(url, params=params, headers=headers) as response:
                            text = await response.text()
                            
                            test_key = f"test_{i+1}_{list(params.keys())[-1] if len(params) > 2 else 'basic'}"
                            parameter_tests[test_key] = {
                                "params": params,
                                "status_code": response.status,
                                "status": "success" if response.status == 200 else "error",
                                "response_preview": text[:300] + "..." if len(text) > 300 else text
                            }
                            
                            if response.status == 200:
                                try:
                                    data = await response.json()
                                    measurements = data.get("results", [])
                                    parameter_tests[test_key].update({
                                        "measurements_found": len(measurements),
                                        "sample_measurements": measurements[:2] if measurements else []
                                    })
                                except:
                                    pass
                                    
                    except Exception as e:
                        test_key = f"test_{i+1}_error"
                        parameter_tests[test_key] = {
                            "params": params,
                            "status": "error",
                            "error": str(e)
                        }
        
        except Exception as e:
            return {
                "location_id": location_id,
                "location_name": location_name,
                "status": "error",
                "error": str(e)
            }
        
        return {
            "location_id": location_id,
            "location_name": location_name,
            "parameter_tests": parameter_tests
        }
    
    async def run_comprehensive_integration_test(self) -> dict:
        """Run comprehensive integration test for OpenAQ v3 with Indian data."""
        logger.info("Starting comprehensive OpenAQ v3 integration test")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "api_key_status": "present" if self.api_key else "missing",
            "base_url": self.base_url,
            "india_country_id": self.india_country_id,
            "tests": {}
        }
        
        # Get all Indian locations
        locations_result = await self.get_all_indian_locations()
        results["tests"]["indian_locations"] = locations_result
        
        if locations_result.get("status") == "success":
            indian_locations = locations_result.get("all_indian_locations", [])
            cities = locations_result.get("cities", {})
            
            # Test latest data for key locations
            latest_tests = []
            measurement_tests = []
            
            # Test top 10 locations
            test_locations = indian_locations[:10]
            
            for location in test_locations:
                location_id = location.get("id")
                location_name = location.get("name", "Unknown")
                
                if location_id:
                    # Test latest data
                    latest_result = await self.test_location_latest_data(location_id, location_name)
                    latest_tests.append(latest_result)
                    
                    # Test measurements with parameters
                    measurement_result = await self.test_measurements_with_parameters(location_id, location_name)
                    measurement_tests.append(measurement_result)
            
            results["tests"]["latest_data_tests"] = latest_tests
            results["tests"]["measurement_parameter_tests"] = measurement_tests
            
            # Analyze results
            working_latest = [test for test in latest_tests if test.get("status") == "success"]
            locations_with_data = [test for test in working_latest if test.get("has_recent_data", False)]
            
            working_measurements = []
            for test in measurement_tests:
                if isinstance(test.get("parameter_tests"), dict):
                    working_params = [
                        param_test for param_test in test["parameter_tests"].values()
                        if param_test.get("status") == "success" and param_test.get("measurements_found", 0) > 0
                    ]
                    if working_params:
                        working_measurements.append(test)
            
            results["summary"] = {
                "total_indian_locations": len(indian_locations),
                "cities_found": list(cities.keys()),
                "locations_by_city": {city: len(locs) for city, locs in cities.items()},
                "latest_data_working": len(working_latest),
                "locations_with_recent_data": len(locations_with_data),
                "measurements_working": len(working_measurements),
                "integration_status": self._determine_integration_status(working_latest, locations_with_data, working_measurements),
                "recommendation": self._get_integration_recommendation(results["tests"])
            }
        
        return results
    
    def _determine_integration_status(self, working_latest, locations_with_data, working_measurements):
        """Determine overall integration status."""
        if locations_with_data and working_measurements:
            return "excellent"
        elif working_latest and working_measurements:
            return "good"
        elif working_latest:
            return "partial"
        else:
            return "needs_work"
    
    def _get_integration_recommendation(self, tests: dict) -> str:
        """Get integration recommendation."""
        locations = tests.get("indian_locations", {})
        if locations.get("status") != "success":
            return "Fix location retrieval first"
        
        latest_tests = tests.get("latest_data_tests", [])
        measurement_tests = tests.get("measurement_parameter_tests", [])
        
        working_latest = [test for test in latest_tests if test.get("status") == "success"]
        working_measurements = [
            test for test in measurement_tests 
            if any(pt.get("status") == "success" for pt in test.get("parameter_tests", {}).values())
        ]
        
        if working_latest and working_measurements:
            return "OpenAQ v3 integration ready. Update ingestion client to use v3 endpoints."
        elif working_latest:
            return "Latest data endpoints work. Focus on measurements endpoint optimization."
        else:
            return "Need to investigate API authentication and endpoint structure."


async def main():
    """Main function to run OpenAQ v3 integration test."""
    integration = OpenAQV3Integration()
    
    try:
        # Run comprehensive integration test
        results = await integration.run_comprehensive_integration_test()
        
        # Display results
        print("\n" + "="*80)
        print("OPENAQ V3 API - INTEGRATION TEST RESULTS")
        print("="*80)
        
        print(f"\nAPI Configuration:")
        print(f"  Base URL: {results['base_url']}")
        print(f"  API Key Status: {results['api_key_status'].upper()}")
        print(f"  India Country ID: {results['india_country_id']}")
        
        # Indian locations summary
        locations = results["tests"].get("indian_locations", {})
        if locations.get("status") == "success":
            print(f"\nIndian Locations Found:")
            print(f"  ✅ Total Locations: {locations.get('total_locations', 0)}")
            print(f"  🇮🇳 Indian Locations: {locations.get('indian_locations', 0)}")
            
            cities = locations.get("cities", {})
            print(f"\n  Cities with Monitoring Stations:")
            for city, locs in cities.items():
                print(f"    - {city}: {len(locs)} stations")
        else:
            print(f"  ❌ Failed to get locations: {locations.get('error', 'Unknown error')}")
        
        # Latest data tests
        latest_tests = results["tests"].get("latest_data_tests", [])
        print(f"\nLatest Data Tests:")
        working_latest = [test for test in latest_tests if test.get("status") == "success"]
        with_data = [test for test in working_latest if test.get("has_recent_data", False)]
        print(f"  Working Endpoints: {len(working_latest)}/{len(latest_tests)}")
        print(f"  Locations with Recent Data: {len(with_data)}")
        
        # Show sample working locations
        for test in with_data[:3]:
            name = test.get("location_name", "Unknown")
            measurements = test.get("measurements_found", 0)
            print(f"    ✅ {name}: {measurements} recent measurements")
        
        # Measurements parameter tests
        measurement_tests = results["tests"].get("measurement_parameter_tests", [])
        print(f"\nMeasurements Parameter Tests:")
        working_measurements = 0
        for test in measurement_tests:
            param_tests = test.get("parameter_tests", {})
            working_params = [pt for pt in param_tests.values() if pt.get("status") == "success"]
            if working_params:
                working_measurements += 1
                name = test.get("location_name", "Unknown")
                print(f"    ✅ {name}: {len(working_params)} working parameter combinations")
        
        print(f"  Locations with Working Measurements: {working_measurements}/{len(measurement_tests)}")
        
        # Summary
        print(f"\nIntegration Summary:")
        summary = results["summary"]
        print(f"  Total Indian Locations: {summary['total_indian_locations']}")
        print(f"  Cities Found: {', '.join(summary['cities_found'])}")
        print(f"  Latest Data Working: {summary['latest_data_working']} locations")
        print(f"  Locations with Recent Data: {summary['locations_with_recent_data']}")
        print(f"  Measurements Working: {summary['measurements_working']} locations")
        print(f"  Integration Status: {summary['integration_status'].upper()}")
        print(f"  Recommendation: {summary['recommendation']}")
        
        # Save detailed results
        with open('openaq_v3_integration_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: openaq_v3_integration_results.json")
        
        # Final assessment
        status = summary['integration_status']
        if status in ['excellent', 'good']:
            print(f"\n🎉 SUCCESS: OpenAQ v3 integration is {status.upper()}!")
            print(f"   Ready to update the ingestion client to use v3 endpoints.")
        elif status == 'partial':
            print(f"\n⚠️  PARTIAL SUCCESS: Some endpoints working.")
            print(f"   Can proceed with limited integration.")
        else:
            print(f"\n❌ NEEDS WORK: Integration requires more investigation.")
            print(f"   Continue using simulation fallback for now.")
        
        print("="*80)
        
    except Exception as e:
        logger.error(f"OpenAQ v3 integration test failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())