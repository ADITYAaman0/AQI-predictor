#!/usr/bin/env python3
"""
Simplified real data integration script for AQI Predictor.

This script focuses on integrating the working OpenWeatherMap API data
and demonstrates proper real data integration with the existing system.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.data.ingestion_clients import IMDClient, CPCBClient, OpenAQClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimpleRealDataIntegrator:
    """Simplified real data integration focusing on working APIs."""
    
    def __init__(self):
        self.results = {
            "weather_data": [],
            "air_quality_data": [],
            "api_tests": {},
            "integration_stats": {
                "weather_points": 0,
                "air_quality_points": 0,
                "real_data_points": 0,
                "simulated_points": 0
            }
        }
        
        # Major Indian cities for testing
        self.test_cities = {
            "Delhi": (28.6139, 77.2090),
            "Mumbai": (19.0760, 72.8777),
            "Bangalore": (12.9716, 77.5946),
            "Chennai": (13.0827, 80.2707),
            "Kolkata": (22.5726, 88.3639)
        }
    
    async def test_openweather_api(self) -> Dict[str, Any]:
        """Test OpenWeatherMap API directly."""
        logger.info("Testing OpenWeatherMap API connectivity")
        
        try:
            async with IMDClient() as client:
                # Test with Delhi coordinates
                weather_data = await client._fetch_current_weather(28.6139, 77.2090)
                
                if weather_data:
                    return {
                        "status": "success",
                        "api": "OpenWeatherMap",
                        "test_location": "Delhi",
                        "temperature": weather_data.get("main", {}).get("temp"),
                        "humidity": weather_data.get("main", {}).get("humidity"),
                        "description": weather_data.get("weather", [{}])[0].get("description", ""),
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    return {
                        "status": "no_data",
                        "message": "API key may be invalid or no data returned"
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def test_openaq_api(self) -> Dict[str, Any]:
        """Test OpenAQ API."""
        logger.info("Testing OpenAQ API connectivity")
        
        try:
            async with OpenAQClient() as client:
                data = await client.fetch_data(cities=["Delhi"], limit=1)
                
                if data:
                    return {
                        "status": "success",
                        "api": "OpenAQ",
                        "data_points": len(data),
                        "sample_parameter": data[0].parameter if data else None,
                        "sample_value": data[0].value if data else None
                    }
                else:
                    return {
                        "status": "no_data",
                        "message": "No data returned from OpenAQ"
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def test_cpcb_simulation(self) -> Dict[str, Any]:
        """Test CPCB simulation system."""
        logger.info("Testing CPCB simulation system")
        
        try:
            async with CPCBClient() as client:
                # Test with Delhi stations
                data = await client.fetch_data(
                    stations=["DL001", "DL002"],
                    start_time=datetime.now() - timedelta(hours=1),
                    end_time=datetime.now()
                )
                
                if data:
                    real_count = sum(1 for point in data if point.quality_flag == "real_time")
                    simulated_count = len(data) - real_count
                    
                    return {
                        "status": "success",
                        "api": "CPCB",
                        "total_points": len(data),
                        "real_time_points": real_count,
                        "simulated_points": simulated_count,
                        "sample_parameters": list(set(point.parameter for point in data[:5]))
                    }
                else:
                    return {
                        "status": "no_data",
                        "message": "No data returned from CPCB client"
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def collect_weather_data(self) -> List[Dict[str, Any]]:
        """Collect weather data from working APIs."""
        logger.info("Collecting weather data from OpenWeatherMap API")
        
        weather_data = []
        
        try:
            async with IMDClient() as client:
                # Collect data for all test cities
                locations = list(self.test_cities.values())
                
                weather_points = await client.fetch_weather_data(
                    locations=locations,
                    start_time=datetime.now() - timedelta(hours=1),
                    end_time=datetime.now()
                )
                
                for point in weather_points:
                    weather_record = {
                        "timestamp": point.timestamp.isoformat(),
                        "location": {
                            "lat": point.location[0],
                            "lon": point.location[1]
                        },
                        "temperature": point.temperature,
                        "humidity": point.humidity,
                        "wind_speed": point.wind_speed,
                        "wind_direction": point.wind_direction,
                        "pressure": point.pressure,
                        "precipitation": point.precipitation,
                        "visibility": point.visibility,
                        "source": point.source,
                        "metadata": point.metadata
                    }
                    weather_data.append(weather_record)
                    
                    # Update stats
                    self.results["integration_stats"]["weather_points"] += 1
                    if point.source == "imd_openweather":
                        self.results["integration_stats"]["real_data_points"] += 1
                    else:
                        self.results["integration_stats"]["simulated_points"] += 1
                
                logger.info(f"Collected {len(weather_data)} weather data points")
                
        except Exception as e:
            logger.error(f"Weather data collection failed: {e}")
        
        return weather_data
    
    async def collect_air_quality_data(self) -> List[Dict[str, Any]]:
        """Collect air quality data from available sources."""
        logger.info("Collecting air quality data from available sources")
        
        air_quality_data = []
        
        # Try CPCB data (with simulation fallback)
        try:
            async with CPCBClient() as client:
                # Get data for major city stations
                stations = ["DL001", "DL002", "MH001", "KA001", "TN001", "WB001"]
                
                data_points = await client.fetch_data(
                    stations=stations,
                    start_time=datetime.now() - timedelta(hours=1),
                    end_time=datetime.now()
                )
                
                for point in data_points:
                    aq_record = {
                        "timestamp": point.timestamp.isoformat(),
                        "location": {
                            "lat": point.location[0],
                            "lon": point.location[1]
                        },
                        "station_id": point.station_id,
                        "parameter": point.parameter,
                        "value": point.value,
                        "unit": point.unit,
                        "quality_flag": point.quality_flag,
                        "source": point.source,
                        "metadata": point.metadata
                    }
                    air_quality_data.append(aq_record)
                    
                    # Update stats
                    self.results["integration_stats"]["air_quality_points"] += 1
                    if point.quality_flag == "real_time":
                        self.results["integration_stats"]["real_data_points"] += 1
                    else:
                        self.results["integration_stats"]["simulated_points"] += 1
                
                logger.info(f"Collected {len(air_quality_data)} air quality data points")
                
        except Exception as e:
            logger.error(f"Air quality data collection failed: {e}")
        
        return air_quality_data
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive API testing and data collection."""
        logger.info("Starting comprehensive real data integration test")
        
        # Test all APIs
        self.results["api_tests"]["OpenWeatherMap"] = await self.test_openweather_api()
        self.results["api_tests"]["OpenAQ"] = await self.test_openaq_api()
        self.results["api_tests"]["CPCB"] = await self.test_cpcb_simulation()
        
        # Collect data from working APIs
        self.results["weather_data"] = await self.collect_weather_data()
        self.results["air_quality_data"] = await self.collect_air_quality_data()
        
        # Generate summary
        total_points = (
            self.results["integration_stats"]["weather_points"] + 
            self.results["integration_stats"]["air_quality_points"]
        )
        
        real_data_percentage = (
            (self.results["integration_stats"]["real_data_points"] / total_points * 100)
            if total_points > 0 else 0
        )
        
        summary = {
            "test_timestamp": datetime.now().isoformat(),
            "cities_tested": len(self.test_cities),
            "total_data_points": total_points,
            "real_data_points": self.results["integration_stats"]["real_data_points"],
            "simulated_points": self.results["integration_stats"]["simulated_points"],
            "real_data_percentage": round(real_data_percentage, 2),
            "working_apis": [
                api for api, result in self.results["api_tests"].items() 
                if result["status"] == "success"
            ],
            "failed_apis": [
                api for api, result in self.results["api_tests"].items() 
                if result["status"] == "error"
            ],
            "data_sources": {
                "weather": list(set(item["source"] for item in self.results["weather_data"])),
                "air_quality": list(set(item["source"] for item in self.results["air_quality_data"]))
            }
        }
        
        self.results["summary"] = summary
        
        logger.info(f"Comprehensive test completed: {summary}")
        return self.results


async def main():
    """Main function to run simplified real data integration."""
    integrator = SimpleRealDataIntegrator()
    
    try:
        # Run comprehensive test
        results = await integrator.run_comprehensive_test()
        
        # Display results
        print("\n" + "="*60)
        print("REAL DATA INTEGRATION TEST RESULTS")
        print("="*60)
        
        print(f"\nAPI Test Results:")
        for api, result in results["api_tests"].items():
            status = result["status"]
            print(f"  {api}: {status.upper()}")
            if status == "success" and "temperature" in result:
                print(f"    Temperature: {result['temperature']}°C")
                print(f"    Humidity: {result['humidity']}%")
            elif status == "success" and "data_points" in result:
                print(f"    Data points: {result['data_points']}")
        
        print(f"\nData Collection Summary:")
        summary = results["summary"]
        print(f"  Total data points: {summary['total_data_points']}")
        print(f"  Real data points: {summary['real_data_points']}")
        print(f"  Simulated points: {summary['simulated_points']}")
        print(f"  Real data percentage: {summary['real_data_percentage']}%")
        
        print(f"\nWorking APIs: {', '.join(summary['working_apis'])}")
        print(f"Failed APIs: {', '.join(summary['failed_apis'])}")
        
        print(f"\nData Sources:")
        print(f"  Weather: {', '.join(summary['data_sources']['weather'])}")
        print(f"  Air Quality: {', '.join(summary['data_sources']['air_quality'])}")
        
        # Save detailed results
        with open('simple_integration_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: simple_integration_results.json")
        
        # Provide recommendations
        print(f"\nRecommendations:")
        if "OpenWeatherMap" in summary["working_apis"]:
            print("  ✓ OpenWeatherMap API is working - continue using for weather data")
        else:
            print("  ✗ OpenWeatherMap API needs attention - check API key")
        
        if "OpenAQ" not in summary["working_apis"]:
            print("  ✗ OpenAQ API is not working - consider alternative air quality sources")
        
        if summary["real_data_percentage"] < 50:
            print("  ⚠ Low real data percentage - focus on fixing API connections")
        else:
            print("  ✓ Good real data coverage - system is working well")
        
        print("\n" + "="*60)
        
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())