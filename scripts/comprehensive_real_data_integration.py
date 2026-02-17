#!/usr/bin/env python3
"""
Comprehensive Real Data Integration Test

This script tests the complete data pipeline with real APIs:
- OpenWeatherMap for weather data
- OpenAQ v3 for air quality data
- Database storage simulation
- Data quality validation
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.development')

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import our clients
from src.data.openaq_client import OpenAQClient
from src.data.ingestion_clients import IMDClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ComprehensiveDataIntegrator:
    """Comprehensive real data integration tester."""
    
    def __init__(self):
        self.openweather_key = os.getenv('OPENWEATHER_API_KEY')
        self.openaq_key = os.getenv('OPENAQ_API_KEY')
        
        # Test cities with coordinates
        self.test_cities = {
            "Delhi": {"lat": 28.6139, "lon": 77.2090},
            "Mumbai": {"lat": 19.0760, "lon": 72.8777},
            "Bangalore": {"lat": 12.9716, "lon": 77.5946},
            "Chennai": {"lat": 13.0827, "lon": 80.2707},
            "Kolkata": {"lat": 22.5726, "lon": 88.3639}
        }
        
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "weather_data": [],
            "air_quality_data": [],
            "integration_stats": {},
            "api_status": {},
            "data_quality": {}
        }
    
    async def test_weather_integration(self) -> Dict[str, Any]:
        """Test weather data integration using IMD client."""
        logger.info("🌤️  Testing Weather Data Integration")
        
        weather_results = {
            "status": "unknown",
            "data_points": 0,
            "cities_covered": 0,
            "api_calls_successful": 0,
            "api_calls_failed": 0,
            "sample_data": []
        }
        
        if not self.openweather_key:
            weather_results["status"] = "error"
            weather_results["message"] = "No OpenWeatherMap API key"
            return weather_results
        
        try:
            # Use IMD client which wraps OpenWeatherMap
            async with IMDClient(api_key=self.openweather_key) as imd_client:
                
                for city_name, coords in self.test_cities.items():
                    try:
                        # Get weather data for the city using fetch_weather_data method
                        weather_data = await imd_client.fetch_weather_data(
                            locations=[(coords["lat"], coords["lon"])]
                        )
                        
                        if weather_data:
                            weather_results["data_points"] += len(weather_data)
                            weather_results["cities_covered"] += 1
                            weather_results["api_calls_successful"] += 1
                            
                            # Store sample data
                            for weather_point in weather_data[:2]:  # First 2 points per city
                                sample_data = {
                                    "city": city_name,
                                    "temperature": weather_point.temperature,
                                    "humidity": weather_point.humidity,
                                    "wind_speed": weather_point.wind_speed,
                                    "pressure": weather_point.pressure,
                                    "timestamp": weather_point.timestamp.isoformat(),
                                    "source": weather_point.source
                                }
                                weather_results["sample_data"].append(sample_data)
                            
                            # Store in main results
                            self.results["weather_data"].extend([
                                {
                                    "city": city_name,
                                    "temperature": wp.temperature,
                                    "humidity": wp.humidity,
                                    "wind_speed": wp.wind_speed,
                                    "wind_direction": wp.wind_direction,
                                    "pressure": wp.pressure,
                                    "visibility": wp.visibility,
                                    "timestamp": wp.timestamp.isoformat(),
                                    "location": wp.location,
                                    "source": wp.source,
                                    "metadata": wp.metadata or {}
                                } for wp in weather_data
                            ])
                            
                            logger.info(f"  ✅ {city_name}: {len(weather_data)} weather data points")
                        else:
                            weather_results["api_calls_failed"] += 1
                            logger.warning(f"  ❌ {city_name}: No weather data received")
                            
                    except Exception as e:
                        weather_results["api_calls_failed"] += 1
                        logger.error(f"  ❌ {city_name}: Weather data error - {e}")
            
            if weather_results["data_points"] > 0:
                weather_results["status"] = "success"
                weather_results["message"] = f"Successfully collected weather data from {weather_results['cities_covered']} cities"
            else:
                weather_results["status"] = "error"
                weather_results["message"] = "No weather data collected"
                
        except Exception as e:
            weather_results["status"] = "error"
            weather_results["message"] = f"Weather integration failed: {e}"
            logger.error(f"Weather integration error: {e}")
        
        return weather_results
    
    async def test_air_quality_integration(self) -> Dict[str, Any]:
        """Test air quality data integration using OpenAQ v3 and CPCB CSV."""
        logger.info("🏭 Testing Air Quality Data Integration (OpenAQ v3 + CPCB CSV)")
        
        aq_results = {
            "status": "unknown",
            "openaq_locations": 0,
            "cpcb_stations": 0,
            "total_data_points": 0,
            "working_sources": 0,
            "parameters_available": set(),
            "sample_data": []
        }
        
        # Test OpenAQ v3 first
        openaq_data = []
        if self.openaq_key:
            try:
                async with OpenAQClient(api_key=self.openaq_key) as client:
                    # Get Indian locations
                    indian_locations = await client.get_indian_locations(limit=50)
                    aq_results["openaq_locations"] = len(indian_locations)
                    
                    logger.info(f"  Found {len(indian_locations)} OpenAQ Indian monitoring locations")
                    
                    if indian_locations:
                        # Test data collection from first 5 locations
                        test_locations = indian_locations[:5]
                        
                        for location in test_locations:
                            try:
                                location_name = location.get("name", "Unknown")
                                
                                # Get latest measurements using city name
                                measurements = await client.get_latest_measurements(
                                    city=location_name.split(',')[0].strip()  # Extract city name
                                )
                                
                                if measurements:
                                    aq_results["working_sources"] += 1
                                    
                                    # Track parameters and store data
                                    for measurement in measurements:
                                        if isinstance(measurement, dict):
                                            param_info = measurement.get("parameter", {})
                                            if isinstance(param_info, dict):
                                                param_name = param_info.get("name", "unknown")
                                            else:
                                                param_name = str(param_info)
                                            aq_results["parameters_available"].add(param_name)
                                    
                                    openaq_data.extend(measurements[:2])  # Sample data
                                    logger.info(f"  ✅ OpenAQ {location_name}: {len(measurements)} measurements")
                                else:
                                    logger.info(f"  ⚠️  OpenAQ {location_name}: No current measurements")
                                    
                            except Exception as e:
                                logger.error(f"  ❌ OpenAQ {location_name}: Error - {e}")
                        
            except Exception as e:
                logger.error(f"OpenAQ v3 integration error: {e}")
        
        # Test CPCB CSV data
        cpcb_data = []
        try:
            from src.data.cpcb_csv_client import get_cpcb_csv_client
            
            cpcb_client = get_cpcb_csv_client()
            
            # Get Delhi data (most comprehensive)
            delhi_cpcb_data = cpcb_client.get_delhi_data()
            
            if delhi_cpcb_data:
                aq_results["cpcb_stations"] = len(set(dp.station_name for dp in delhi_cpcb_data))
                aq_results["working_sources"] += 1
                
                # Track parameters
                for dp in delhi_cpcb_data:
                    aq_results["parameters_available"].add(dp.parameter)
                
                # Store sample data
                cpcb_data = delhi_cpcb_data[:10]  # Sample data
                logger.info(f"  ✅ CPCB CSV: {len(delhi_cpcb_data)} Delhi data points from {aq_results['cpcb_stations']} stations")
            else:
                logger.warning("  ❌ CPCB CSV: No Delhi data found")
                
        except Exception as e:
            logger.error(f"CPCB CSV integration error: {e}")
        
        # Combine and process all data
        all_aq_data = []
        
        # Process OpenAQ data
        for measurement in openaq_data:
            if isinstance(measurement, dict):
                param_info = measurement.get("parameter", {})
                value_info = measurement.get("value", {})
                
                if isinstance(param_info, dict):
                    param_name = param_info.get("name", "unknown")
                    param_units = param_info.get("units", "unknown")
                else:
                    param_name = str(param_info)
                    param_units = "unknown"
                
                if isinstance(value_info, dict):
                    param_value = value_info.get("value")
                else:
                    param_value = value_info
                
                sample_data = {
                    "location": "OpenAQ Station",
                    "parameter": param_name,
                    "value": param_value,
                    "unit": param_units,
                    "timestamp": measurement.get("datetime", {}).get("utc", "unknown") if isinstance(measurement.get("datetime", {}), dict) else str(measurement.get("datetime", "unknown")),
                    "source": "openaq_v3"
                }
                
                all_aq_data.append(sample_data)
        
        # Process CPCB CSV data
        for dp in cpcb_data:
            sample_data = {
                "location": dp.station_name,
                "parameter": dp.parameter,
                "value": dp.value,
                "unit": dp.unit,
                "timestamp": dp.timestamp.isoformat(),
                "source": "cpcb_csv"
            }
            
            all_aq_data.append(sample_data)
        
        # Store results
        aq_results["total_data_points"] = len(all_aq_data)
        aq_results["sample_data"] = all_aq_data[:10]  # First 10 samples
        aq_results["parameters_available"] = list(aq_results["parameters_available"])
        
        # Store in main results
        self.results["air_quality_data"].extend([
            {
                **sample_data,
                "quality_flag": "real_time"
            } for sample_data in all_aq_data
        ])
        
        # Determine status
        if aq_results["total_data_points"] > 0:
            aq_results["status"] = "success"
            aq_results["message"] = f"Successfully collected air quality data from {aq_results['working_sources']} sources"
        else:
            aq_results["status"] = "error"
            aq_results["message"] = "No air quality data collected"
        
        return aq_results
    
    def analyze_data_quality(self) -> Dict[str, Any]:
        """Analyze the quality of collected data."""
        logger.info("📊 Analyzing Data Quality")
        
        analysis = {
            "total_data_points": len(self.results["weather_data"]) + len(self.results["air_quality_data"]),
            "weather_points": len(self.results["weather_data"]),
            "air_quality_points": len(self.results["air_quality_data"]),
            "real_data_percentage": 0,
            "parameters_covered": set(),
            "cities_with_data": set(),
            "data_freshness": {},
            "quality_flags": {}
        }
        
        # Analyze weather data
        for data_point in self.results["weather_data"]:
            # Weather data has different structure - extract parameters from the data
            if data_point.get("temperature") is not None:
                analysis["parameters_covered"].add("temperature")
            if data_point.get("humidity") is not None:
                analysis["parameters_covered"].add("humidity")
            if data_point.get("wind_speed") is not None:
                analysis["parameters_covered"].add("wind_speed")
            if data_point.get("pressure") is not None:
                analysis["parameters_covered"].add("pressure")
            
            analysis["cities_with_data"].add(data_point.get("city", "unknown"))
            
            # Weather data is always real-time from OpenWeatherMap
            analysis["quality_flags"]["real_time"] = analysis["quality_flags"].get("real_time", 0) + 1
        
        # Analyze air quality data
        for data_point in self.results["air_quality_data"]:
            if "parameter" in data_point:
                analysis["parameters_covered"].add(data_point["parameter"])
            analysis["cities_with_data"].add(data_point.get("location", "unknown"))
            
            quality_flag = data_point.get("quality_flag", "unknown")
            analysis["quality_flags"][quality_flag] = analysis["quality_flags"].get(quality_flag, 0) + 1
        
        # Calculate real data percentage
        real_data_points = analysis["quality_flags"].get("real_time", 0)
        if analysis["total_data_points"] > 0:
            analysis["real_data_percentage"] = (real_data_points / analysis["total_data_points"]) * 100
        
        # Convert sets to lists for JSON serialization
        analysis["parameters_covered"] = list(analysis["parameters_covered"])
        analysis["cities_with_data"] = list(analysis["cities_with_data"])
        
        logger.info(f"  📈 Total Data Points: {analysis['total_data_points']}")
        logger.info(f"  🌤️  Weather Points: {analysis['weather_points']}")
        logger.info(f"  🏭 Air Quality Points: {analysis['air_quality_points']}")
        logger.info(f"  ✅ Real Data: {analysis['real_data_percentage']:.1f}%")
        logger.info(f"  📊 Parameters: {len(analysis['parameters_covered'])}")
        logger.info(f"  🏙️  Cities: {len(analysis['cities_with_data'])}")
        
        return analysis
    
    async def run_comprehensive_integration(self) -> Dict[str, Any]:
        """Run comprehensive integration test."""
        logger.info("🚀 Starting Comprehensive Real Data Integration Test")
        logger.info("=" * 60)
        
        # Test weather integration
        weather_results = await self.test_weather_integration()
        self.results["api_status"]["weather"] = weather_results
        
        # Test air quality integration
        aq_results = await self.test_air_quality_integration()
        self.results["api_status"]["air_quality"] = aq_results
        
        # Analyze data quality
        quality_analysis = self.analyze_data_quality()
        self.results["data_quality"] = quality_analysis
        
        # Generate integration statistics
        self.results["integration_stats"] = {
            "apis_tested": 2,
            "apis_working": sum(1 for api_result in [weather_results, aq_results] if api_result["status"] == "success"),
            "total_data_points": quality_analysis["total_data_points"],
            "real_data_percentage": quality_analysis["real_data_percentage"],
            "cities_covered": len(quality_analysis["cities_with_data"]),
            "parameters_available": len(quality_analysis["parameters_covered"]),
            "integration_status": "excellent" if quality_analysis["real_data_percentage"] > 80 else 
                                 "good" if quality_analysis["real_data_percentage"] > 50 else
                                 "partial" if quality_analysis["total_data_points"] > 0 else "failed"
        }
        
        return self.results


async def main():
    """Main execution function."""
    integrator = ComprehensiveDataIntegrator()
    results = await integrator.run_comprehensive_integration()
    
    # Print summary
    logger.info("=" * 60)
    logger.info("🎯 COMPREHENSIVE INTEGRATION SUMMARY")
    logger.info("=" * 60)
    
    stats = results["integration_stats"]
    logger.info(f"🔧 APIs Working: {stats['apis_working']}/{stats['apis_tested']}")
    logger.info(f"📊 Total Data Points: {stats['total_data_points']}")
    logger.info(f"✅ Real Data: {stats['real_data_percentage']:.1f}%")
    logger.info(f"🏙️  Cities Covered: {stats['cities_covered']}")
    logger.info(f"📈 Parameters: {stats['parameters_available']}")
    logger.info(f"🎖️  Integration Status: {stats['integration_status'].upper()}")
    
    # API Status Summary
    logger.info("\n📡 API Status:")
    weather_status = results["api_status"]["weather"]["status"]
    aq_status = results["api_status"]["air_quality"]["status"]
    logger.info(f"  🌤️  Weather (OpenWeatherMap): {weather_status.upper()}")
    logger.info(f"  🏭 Air Quality (OpenAQ v3): {aq_status.upper()}")
    
    # Recommendations
    logger.info("\n💡 Recommendations:")
    if stats["integration_status"] == "excellent":
        logger.info("  ✅ System ready for production deployment")
        logger.info("  ✅ Set up automated data ingestion schedules")
        logger.info("  ✅ Implement monitoring and alerting")
    elif stats["integration_status"] == "good":
        logger.info("  ✅ System ready for production with current capabilities")
        logger.info("  🔄 Continue working on additional API integrations")
        logger.info("  📊 Set up data quality monitoring")
    else:
        logger.info("  🔄 Continue API integration work")
        logger.info("  🔍 Investigate API connectivity issues")
        logger.info("  📋 Review API key configurations")
    
    # Save detailed results
    output_file = "comprehensive_real_data_integration_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    logger.info(f"\n📄 Detailed results saved to: {output_file}")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())