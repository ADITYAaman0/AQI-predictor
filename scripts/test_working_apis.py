#!/usr/bin/env python3
"""
Test working APIs with explicit environment variable loading.

This script explicitly loads environment variables and tests the working APIs
to demonstrate real data integration capabilities.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.development')

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WorkingAPITester:
    """Test and demonstrate working API integrations."""
    
    def __init__(self):
        # Get API keys from environment
        self.openweather_key = os.getenv('OPENWEATHER_API_KEY')
        self.openaq_key = os.getenv('OPENAQ_API_KEY')
        self.cpcb_key = os.getenv('CPCB_API_KEY')
        
        logger.info(f"OpenWeatherMap API Key: {'✓ Found' if self.openweather_key else '✗ Missing'}")
        logger.info(f"OpenAQ API Key: {'✓ Found' if self.openaq_key else '✗ Missing'}")
        logger.info(f"CPCB API Key: {'✓ Found' if self.cpcb_key else '✗ Missing'}")
        
        self.test_results = {}
        
        # Test cities
        self.cities = {
            "Delhi": {"lat": 28.6139, "lon": 77.2090},
            "Mumbai": {"lat": 19.0760, "lon": 72.8777},
            "Bangalore": {"lat": 12.9716, "lon": 77.5946},
            "Chennai": {"lat": 13.0827, "lon": 80.2707},
            "Kolkata": {"lat": 22.5726, "lon": 88.3639}
        }
    
    async def test_openweathermap_direct(self) -> Dict[str, Any]:
        """Test OpenWeatherMap API directly."""
        logger.info("Testing OpenWeatherMap API directly")
        
        if not self.openweather_key:
            return {
                "status": "error",
                "message": "No API key found"
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test with Delhi
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "lat": 28.6139,
                    "lon": 77.2090,
                    "appid": self.openweather_key,
                    "units": "metric"
                }
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        return {
                            "status": "success",
                            "api": "OpenWeatherMap",
                            "location": "Delhi",
                            "temperature": data.get("main", {}).get("temp"),
                            "humidity": data.get("main", {}).get("humidity"),
                            "pressure": data.get("main", {}).get("pressure"),
                            "wind_speed": data.get("wind", {}).get("speed"),
                            "visibility": data.get("visibility", 0) / 1000,  # Convert to km
                            "description": data.get("weather", [{}])[0].get("description", ""),
                            "timestamp": datetime.now().isoformat(),
                            "raw_response_keys": list(data.keys())
                        }
                    else:
                        return {
                            "status": "error",
                            "message": f"HTTP {response.status}: {await response.text()}"
                        }
                        
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def test_openaq_direct(self) -> Dict[str, Any]:
        """Test OpenAQ v3 API directly."""
        logger.info("Testing OpenAQ v3 API directly")
        
        try:
            async with aiohttp.ClientSession() as session:
                # First get Indian locations
                locations_url = "https://api.openaq.org/v3/locations"
                params = {
                    "limit": 10,
                    "countries": 9  # India country ID in v3
                }
                
                headers = {}
                if self.openaq_key:
                    headers["X-API-Key"] = self.openaq_key
                
                async with session.get(locations_url, params=params, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        locations = data.get("results", [])
                        
                        if not locations:
                            return {
                                "status": "success",
                                "api": "OpenAQ v3",
                                "message": "API working but no Indian locations found",
                                "locations_found": 0,
                                "timestamp": datetime.now().isoformat()
                            }
                        
                        # Try to get measurements from first location
                        first_location = locations[0]
                        location_id = first_location.get("id")
                        
                        if location_id:
                            measurements_url = f"https://api.openaq.org/v3/locations/{location_id}/latest"
                            
                            async with session.get(measurements_url, headers=headers) as measurements_response:
                                if measurements_response.status == 200:
                                    measurements_data = await measurements_response.json()
                                    measurements = measurements_data.get("results", [])
                                    
                                    return {
                                        "status": "success",
                                        "api": "OpenAQ v3",
                                        "locations_found": len(locations),
                                        "sample_location": first_location.get("name", "Unknown"),
                                        "measurements_count": len(measurements),
                                        "sample_measurements": measurements[:3] if measurements else [],
                                        "timestamp": datetime.now().isoformat()
                                    }
                        
                        return {
                            "status": "success",
                            "api": "OpenAQ v3",
                            "locations_found": len(locations),
                            "sample_location": first_location.get("name", "Unknown"),
                            "measurements_count": 0,
                            "message": "Locations found but no measurements available",
                            "timestamp": datetime.now().isoformat()
                        }
                    else:
                        return {
                            "status": "error",
                            "message": f"HTTP {response.status}: {await response.text()}"
                        }
                        
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def collect_weather_data_all_cities(self) -> List[Dict[str, Any]]:
        """Collect weather data for all test cities."""
        logger.info("Collecting weather data for all test cities")
        
        weather_data = []
        
        if not self.openweather_key:
            logger.warning("No OpenWeatherMap API key - skipping real data collection")
            return weather_data
        
        try:
            async with aiohttp.ClientSession() as session:
                for city_name, coords in self.cities.items():
                    try:
                        url = "https://api.openweathermap.org/data/2.5/weather"
                        params = {
                            "lat": coords["lat"],
                            "lon": coords["lon"],
                            "appid": self.openweather_key,
                            "units": "metric"
                        }
                        
                        async with session.get(url, params=params) as response:
                            if response.status == 200:
                                data = await response.json()
                                
                                weather_record = {
                                    "city": city_name,
                                    "timestamp": datetime.now().isoformat(),
                                    "location": coords,
                                    "temperature": data.get("main", {}).get("temp"),
                                    "humidity": data.get("main", {}).get("humidity"),
                                    "pressure": data.get("main", {}).get("pressure"),
                                    "wind_speed": data.get("wind", {}).get("speed"),
                                    "wind_direction": data.get("wind", {}).get("deg"),
                                    "visibility": data.get("visibility", 0) / 1000,
                                    "description": data.get("weather", [{}])[0].get("description", ""),
                                    "source": "openweathermap_direct",
                                    "data_quality": "real_time"
                                }
                                
                                weather_data.append(weather_record)
                                logger.info(f"✓ {city_name}: {weather_record['temperature']}°C, {weather_record['humidity']}% humidity")
                                
                            else:
                                logger.error(f"✗ {city_name}: HTTP {response.status}")
                                
                    except Exception as e:
                        logger.error(f"✗ {city_name}: {e}")
                        
        except Exception as e:
            logger.error(f"Weather data collection failed: {e}")
        
        return weather_data
    
    async def generate_realistic_air_quality_data(self) -> List[Dict[str, Any]]:
        """Generate realistic air quality data for demonstration."""
        logger.info("Generating realistic air quality data")
        
        import random
        
        air_quality_data = []
        
        # Realistic AQI ranges for Indian cities
        city_pollution_levels = {
            "Delhi": {"pm25": (80, 150), "pm10": (120, 250), "no2": (40, 80)},
            "Mumbai": {"pm25": (40, 90), "pm10": (70, 140), "no2": (30, 60)},
            "Bangalore": {"pm25": (30, 70), "pm10": (50, 120), "no2": (20, 50)},
            "Chennai": {"pm25": (35, 75), "pm10": (60, 130), "no2": (25, 55)},
            "Kolkata": {"pm25": (60, 120), "pm10": (100, 200), "no2": (35, 70)}
        }
        
        parameters = ["pm25", "pm10", "no2", "so2", "o3", "co"]
        
        for city_name, coords in self.cities.items():
            city_levels = city_pollution_levels.get(city_name, city_pollution_levels["Delhi"])
            
            for param in parameters:
                if param in city_levels:
                    min_val, max_val = city_levels[param]
                    value = round(random.uniform(min_val, max_val), 1)
                else:
                    # Default ranges for other parameters
                    if param == "so2":
                        value = round(random.uniform(10, 30), 1)
                    elif param == "o3":
                        value = round(random.uniform(50, 120), 1)
                    elif param == "co":
                        value = round(random.uniform(1.0, 4.0), 2)
                    else:
                        value = round(random.uniform(20, 100), 1)
                
                unit = "µg/m³" if param != "co" else "mg/m³"
                
                aq_record = {
                    "city": city_name,
                    "timestamp": datetime.now().isoformat(),
                    "location": coords,
                    "station_id": f"{city_name.upper()[:2]}001",
                    "parameter": param,
                    "value": value,
                    "unit": unit,
                    "source": "realistic_simulation",
                    "data_quality": "estimated",
                    "quality_flag": "estimated"
                }
                
                air_quality_data.append(aq_record)
        
        logger.info(f"Generated {len(air_quality_data)} realistic air quality data points")
        return air_quality_data
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive API testing and data collection."""
        logger.info("Starting comprehensive API testing and data collection")
        
        # Test APIs directly
        self.test_results["openweathermap"] = await self.test_openweathermap_direct()
        self.test_results["openaq"] = await self.test_openaq_direct()
        
        # Collect real weather data
        weather_data = await self.collect_weather_data_all_cities()
        
        # Generate realistic air quality data
        air_quality_data = await self.generate_realistic_air_quality_data()
        
        # Calculate statistics
        total_points = len(weather_data) + len(air_quality_data)
        real_data_points = len([w for w in weather_data if w.get("data_quality") == "real_time"])
        simulated_points = total_points - real_data_points
        
        real_data_percentage = (real_data_points / total_points * 100) if total_points > 0 else 0
        
        # Generate comprehensive results
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "environment_check": {
                "openweather_api_key": "present" if self.openweather_key else "missing",
                "openaq_api_key": "present" if self.openaq_key else "missing",
                "cpcb_api_key": "present" if self.cpcb_key else "missing"
            },
            "api_tests": self.test_results,
            "data_collection": {
                "weather_data": weather_data,
                "air_quality_data": air_quality_data
            },
            "statistics": {
                "cities_processed": len(self.cities),
                "total_data_points": total_points,
                "real_data_points": real_data_points,
                "simulated_points": simulated_points,
                "real_data_percentage": round(real_data_percentage, 2),
                "weather_points": len(weather_data),
                "air_quality_points": len(air_quality_data)
            },
            "working_apis": [
                api for api, result in self.test_results.items() 
                if result.get("status") == "success"
            ],
            "failed_apis": [
                api for api, result in self.test_results.items() 
                if result.get("status") == "error"
            ],
            "recommendations": []
        }
        
        # Add recommendations
        if "openweathermap" in results["working_apis"]:
            results["recommendations"].append("✓ OpenWeatherMap API is working - use for real-time weather data")
        else:
            results["recommendations"].append("✗ OpenWeatherMap API needs attention - check API key configuration")
        
        if "openaq" not in results["working_apis"]:
            results["recommendations"].append("✗ OpenAQ API is not working - consider alternative air quality sources")
        
        if real_data_percentage >= 50:
            results["recommendations"].append("✓ Good real data coverage - system is working well")
        else:
            results["recommendations"].append("⚠ Focus on improving real data API connections")
        
        results["recommendations"].extend([
            "Consider setting up automated data ingestion schedules",
            "Implement data quality monitoring and alerting",
            "Set up database storage for collected data",
            "Add data validation and anomaly detection"
        ])
        
        return results


async def main():
    """Main function to run API testing."""
    tester = WorkingAPITester()
    
    try:
        # Run comprehensive test
        results = await tester.run_comprehensive_test()
        
        # Display results
        print("\n" + "="*70)
        print("COMPREHENSIVE API TESTING AND DATA COLLECTION RESULTS")
        print("="*70)
        
        print(f"\nEnvironment Check:")
        env_check = results["environment_check"]
        for api, status in env_check.items():
            print(f"  {api}: {status.upper()}")
        
        print(f"\nAPI Test Results:")
        for api, result in results["api_tests"].items():
            status = result.get("status", "unknown")
            print(f"  {api.upper()}: {status.upper()}")
            
            if status == "success":
                if "temperature" in result:
                    print(f"    Location: {result.get('location', 'Unknown')}")
                    print(f"    Temperature: {result.get('temperature')}°C")
                    print(f"    Humidity: {result.get('humidity')}%")
                    print(f"    Description: {result.get('description', 'N/A')}")
                elif "data_points" in result:
                    print(f"    Data points: {result.get('data_points')}")
            elif status == "error":
                print(f"    Error: {result.get('message', 'Unknown error')}")
        
        print(f"\nData Collection Statistics:")
        stats = results["statistics"]
        print(f"  Cities processed: {stats['cities_processed']}")
        print(f"  Total data points: {stats['total_data_points']}")
        print(f"  Real data points: {stats['real_data_points']}")
        print(f"  Simulated points: {stats['simulated_points']}")
        print(f"  Real data percentage: {stats['real_data_percentage']}%")
        print(f"  Weather data points: {stats['weather_points']}")
        print(f"  Air quality points: {stats['air_quality_points']}")
        
        print(f"\nWorking APIs: {', '.join(results['working_apis']) if results['working_apis'] else 'None'}")
        print(f"Failed APIs: {', '.join(results['failed_apis']) if results['failed_apis'] else 'None'}")
        
        print(f"\nRecommendations:")
        for rec in results["recommendations"]:
            print(f"  {rec}")
        
        # Save detailed results
        with open('comprehensive_api_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: comprehensive_api_test_results.json")
        
        # Show sample data if available
        if results["data_collection"]["weather_data"]:
            print(f"\nSample Weather Data:")
            sample = results["data_collection"]["weather_data"][0]
            print(f"  City: {sample['city']}")
            print(f"  Temperature: {sample['temperature']}°C")
            print(f"  Humidity: {sample['humidity']}%")
            print(f"  Wind Speed: {sample['wind_speed']} m/s")
            print(f"  Source: {sample['source']}")
        
        if results["data_collection"]["air_quality_data"]:
            print(f"\nSample Air Quality Data:")
            sample = results["data_collection"]["air_quality_data"][0]
            print(f"  City: {sample['city']}")
            print(f"  Parameter: {sample['parameter']}")
            print(f"  Value: {sample['value']} {sample['unit']}")
            print(f"  Source: {sample['source']}")
        
        print("\n" + "="*70)
        
    except Exception as e:
        logger.error(f"API testing failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())