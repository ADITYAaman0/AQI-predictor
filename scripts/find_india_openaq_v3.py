#!/usr/bin/env python3
"""
Find India's correct country ID and locations in OpenAQ v3 API.
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


class OpenAQV3IndiaFinder:
    """Find India's correct country ID and locations in OpenAQ v3 API."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAQ_API_KEY')
        self.base_url = "https://api.openaq.org/v3"
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.api_key else '✗ Missing'}")
    
    async def find_india_country_id(self) -> dict:
        """Find India's correct country ID."""
        logger.info("Searching for India's country ID")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/countries"
                params = {"limit": 200}  # Get more countries
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        countries = data.get("results", [])
                        
                        # Search for India
                        india_variations = ["india", "in", "ind", "bharat"]
                        india_countries = []
                        
                        for country in countries:
                            name = country.get("name", "").lower()
                            code = country.get("code", "").lower()
                            
                            if any(variation in name or variation == code for variation in india_variations):
                                india_countries.append(country)
                        
                        return {
                            "status": "success",
                            "total_countries": len(countries),
                            "india_matches": india_countries,
                            "all_countries": countries[:20]  # First 20 for reference
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
    
    async def test_locations_by_country_code(self, country_code: str) -> dict:
        """Test locations using country code instead of ID."""
        logger.info(f"Testing locations for country code: {country_code}")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations"
                params = {
                    "limit": 50,
                    "countries": country_code  # Try with country code
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "country_code": country_code,
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_preview": text[:1000] + "..." if len(text) > 1000 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            locations = data.get("results", [])
                            
                            # Look for Indian cities
                            indian_cities = ["delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad"]
                            indian_locations = []
                            
                            for location in locations:
                                name = location.get("name", "").lower()
                                locality = str(location.get("locality", "")).lower()
                                
                                if any(city in name or city in locality for city in indian_cities):
                                    indian_locations.append(location)
                            
                            result.update({
                                "total_locations": len(locations),
                                "indian_city_matches": len(indian_locations),
                                "sample_locations": locations[:5],
                                "indian_locations": indian_locations
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "country_code": country_code,
                "status": "error",
                "error": str(e)
            }
    
    async def search_locations_by_city(self, city_name: str) -> dict:
        """Search for locations by city name."""
        logger.info(f"Searching locations for city: {city_name}")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/locations"
                params = {
                    "limit": 100,
                    "city": city_name  # Try city parameter
                }
                headers = {}
                if self.api_key:
                    headers["X-API-Key"] = self.api_key
                
                async with session.get(url, params=params, headers=headers) as response:
                    text = await response.text()
                    
                    result = {
                        "city_name": city_name,
                        "status_code": response.status,
                        "status": "success" if response.status == 200 else "error",
                        "response_preview": text[:1000] + "..." if len(text) > 1000 else text
                    }
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            locations = data.get("results", [])
                            result.update({
                                "locations_found": len(locations),
                                "sample_locations": locations[:5]
                            })
                        except Exception as parse_error:
                            result["parse_error"] = str(parse_error)
                    
                    return result
                    
        except Exception as e:
            return {
                "city_name": city_name,
                "status": "error",
                "error": str(e)
            }
    
    async def test_measurements_endpoint_variations(self) -> dict:
        """Test different variations of the measurements endpoint."""
        logger.info("Testing measurements endpoint variations")
        
        endpoints_to_test = [
            f"{self.base_url}/measurements",
            f"{self.base_url}/measurements/latest",
            f"{self.base_url}/latest",
            f"{self.base_url}/sensors/measurements",
            f"{self.base_url}/data/measurements"
        ]
        
        results = {}
        
        try:
            async with aiohttp.ClientSession() as session:
                for endpoint in endpoints_to_test:
                    try:
                        params = {
                            "limit": 10,
                            "date_from": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
                        }
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key
                        
                        async with session.get(endpoint, params=params, headers=headers) as response:
                            text = await response.text()
                            
                            results[endpoint] = {
                                "status_code": response.status,
                                "status": "success" if response.status == 200 else "error",
                                "response_preview": text[:500] + "..." if len(text) > 500 else text
                            }
                            
                            if response.status == 200:
                                try:
                                    data = await response.json()
                                    if "results" in data:
                                        results[endpoint]["data_found"] = len(data["results"])
                                except:
                                    pass
                                    
                    except Exception as e:
                        results[endpoint] = {
                            "status": "error",
                            "error": str(e)
                        }
        
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
        
        return results
    
    async def run_comprehensive_india_search(self) -> dict:
        """Run comprehensive search for Indian data in OpenAQ v3."""
        logger.info("Starting comprehensive India search in OpenAQ v3")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "api_key_status": "present" if self.api_key else "missing",
            "base_url": self.base_url,
            "tests": {}
        }
        
        # Find India's country ID
        country_search = await self.find_india_country_id()
        results["tests"]["country_search"] = country_search
        
        # Test with different country codes
        country_codes_to_test = ["IN", "IND", "India"]
        for code in country_codes_to_test:
            location_test = await self.test_locations_by_country_code(code)
            results["tests"][f"locations_by_country_{code}"] = location_test
        
        # Search by major Indian cities
        indian_cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"]
        for city in indian_cities:
            city_test = await self.search_locations_by_city(city)
            results["tests"][f"city_search_{city}"] = city_test
        
        # Test measurements endpoints
        measurements_test = await self.test_measurements_endpoint_variations()
        results["tests"]["measurements_endpoints"] = measurements_test
        
        # Analyze results
        india_found = False
        working_endpoints = []
        
        if country_search.get("status") == "success":
            india_matches = country_search.get("india_matches", [])
            if india_matches:
                india_found = True
        
        # Check for working measurements endpoints
        for endpoint, result in measurements_test.items():
            if result.get("status") == "success":
                working_endpoints.append(endpoint)
        
        results["summary"] = {
            "india_country_found": india_found,
            "working_measurements_endpoints": len(working_endpoints),
            "working_endpoint_names": working_endpoints,
            "recommendation": self._get_search_recommendation(results["tests"])
        }
        
        return results
    
    def _get_search_recommendation(self, tests: dict) -> str:
        """Get recommendation based on search results."""
        country_search = tests.get("country_search", {})
        india_matches = country_search.get("india_matches", [])
        
        if india_matches:
            india_id = india_matches[0].get("id")
            return f"Found India with ID {india_id}. Use this ID to query Indian locations."
        
        # Check if any location searches found Indian cities
        location_tests = [test for key, test in tests.items() if "locations_by_country" in key or "city_search" in key]
        working_location_tests = [test for test in location_tests if test.get("status") == "success" and test.get("total_locations", 0) > 0]
        
        if working_location_tests:
            return "Found locations using alternative search methods. Use these approaches for Indian data."
        
        # Check measurements endpoints
        measurements = tests.get("measurements_endpoints", {})
        working_measurements = [endpoint for endpoint, result in measurements.items() if result.get("status") == "success"]
        
        if working_measurements:
            return f"Measurements endpoints working: {', '.join(working_measurements)}. Try different location parameters."
        
        return "OpenAQ v3 API structure needs further investigation. Consider alternative data sources."


async def main():
    """Main function to find Indian data in OpenAQ v3."""
    finder = OpenAQV3IndiaFinder()
    
    try:
        # Run comprehensive search
        results = await finder.run_comprehensive_india_search()
        
        # Display results
        print("\n" + "="*80)
        print("OPENAQ V3 API - INDIA SEARCH RESULTS")
        print("="*80)
        
        print(f"\nAPI Configuration:")
        print(f"  Base URL: {results['base_url']}")
        print(f"  API Key Status: {results['api_key_status'].upper()}")
        
        # Country search results
        country_search = results["tests"].get("country_search", {})
        print(f"\nCountry Search:")
        if country_search.get("status") == "success":
            india_matches = country_search.get("india_matches", [])
            print(f"  ✅ Total Countries Found: {country_search.get('total_countries', 0)}")
            print(f"  🇮🇳 India Matches: {len(india_matches)}")
            
            for match in india_matches:
                print(f"    - {match.get('name')} (ID: {match.get('id')}, Code: {match.get('code')})")
        else:
            print(f"  ❌ Country search failed: {country_search.get('error', 'Unknown error')}")
        
        # Location tests by country
        print(f"\nLocation Tests by Country:")
        country_codes = ["IN", "IND", "India"]
        for code in country_codes:
            test = results["tests"].get(f"locations_by_country_{code}", {})
            status = "✅" if test.get("status") == "success" else "❌"
            locations = test.get("total_locations", 0)
            indian_matches = test.get("indian_city_matches", 0)
            print(f"  {status} {code}: {locations} locations, {indian_matches} Indian city matches")
        
        # City search tests
        print(f"\nCity Search Tests:")
        cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"]
        for city in cities:
            test = results["tests"].get(f"city_search_{city}", {})
            status = "✅" if test.get("status") == "success" else "❌"
            locations = test.get("locations_found", 0)
            print(f"  {status} {city}: {locations} locations found")
        
        # Measurements endpoints
        print(f"\nMeasurements Endpoints:")
        measurements = results["tests"].get("measurements_endpoints", {})
        for endpoint, result in measurements.items():
            status = "✅" if result.get("status") == "success" else "❌"
            data_found = result.get("data_found", 0)
            endpoint_name = endpoint.split("/")[-1] if "/" in endpoint else endpoint
            print(f"  {status} {endpoint_name}: {data_found} data points")
        
        print(f"\nSummary:")
        summary = results["summary"]
        print(f"  India Country Found: {'✅' if summary['india_country_found'] else '❌'}")
        print(f"  Working Measurements Endpoints: {summary['working_measurements_endpoints']}")
        print(f"  Recommendation: {summary['recommendation']}")
        
        # Save detailed results
        with open('openaq_v3_india_search_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: openaq_v3_india_search_results.json")
        print("="*80)
        
    except Exception as e:
        logger.error(f"India search in OpenAQ v3 API failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())