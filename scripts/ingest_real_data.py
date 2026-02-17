#!/usr/bin/env python3
"""
Script to ingest real data from working APIs and populate the system.
Uses the validated API keys to fetch and store actual air quality and weather data.
"""

import os
import sys
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.development')

# Import after setting up path
from src.data.ingestion_clients import IMDClient, OpenAQClient, CPCBClient, DataIngestionOrchestrator

class RealDataIngester:
    """Ingest real data from working APIs."""
    
    def __init__(self):
        self.results = {}
        self.ingested_data = {
            "weather": [],
            "air_quality": [],
            "total_points": 0
        }
    
    async def test_imd_weather_ingestion(self) -> Dict[str, Any]:
        """Test real weather data ingestion via OpenWeatherMap."""
        print("🌤️  Testing IMD Weather Data Ingestion...")
        
        try:
            # Test major Indian cities
            cities = [
                ("Delhi", 28.6139, 77.2090),
                ("Mumbai", 19.0760, 72.8777),
                ("Bangalore", 12.9716, 77.5946),
                ("Chennai", 13.0827, 80.2707),
                ("Kolkata", 22.5726, 88.3639)
            ]
            
            async with IMDClient() as client:
                weather_data = []
                
                for city_name, lat, lon in cities:
                    try:
                        # Fetch current weather
                        city_weather = await client.fetch_weather_data(
                            locations=[(lat, lon)],
                            start_time=datetime.utcnow() - timedelta(hours=1),
                            end_time=datetime.utcnow()
                        )
                        
                        if city_weather:
                            weather_point = city_weather[0]
                            weather_data.append({
                                "city": city_name,
                                "temperature": weather_point.temperature,
                                "humidity": weather_point.humidity,
                                "wind_speed": weather_point.wind_speed,
                                "pressure": weather_point.pressure,
                                "visibility": weather_point.visibility,
                                "source": weather_point.source,
                                "timestamp": weather_point.timestamp.isoformat()
                            })
                            print(f"   ✅ {city_name}: {weather_point.temperature}°C, {weather_point.humidity}% humidity")
                        else:
                            print(f"   ⚠️  {city_name}: No data available")
                            
                    except Exception as e:
                        print(f"   ❌ {city_name}: {str(e)}")
                
                self.ingested_data["weather"] = weather_data
                self.ingested_data["total_points"] += len(weather_data)
                
                return {
                    "status": "success",
                    "cities_processed": len(cities),
                    "data_points": len(weather_data),
                    "sample_data": weather_data[:2] if weather_data else None
                }
                
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_openaq_fallback(self) -> Dict[str, Any]:
        """Test OpenAQ data ingestion (may work without API key)."""
        print("🌬️  Testing OpenAQ Data Ingestion...")
        
        try:
            async with OpenAQClient() as client:
                # Try without API key first
                openaq_data = await client.fetch_data(
                    cities=["Delhi", "Mumbai"],
                    start_time=datetime.utcnow() - timedelta(hours=24),
                    end_time=datetime.utcnow(),
                    limit=10
                )
                
                if openaq_data:
                    sample_data = []
                    for data_point in openaq_data[:5]:  # First 5 points
                        sample_data.append({
                            "parameter": data_point.parameter,
                            "value": data_point.value,
                            "unit": data_point.unit,
                            "location": data_point.location,
                            "source": data_point.source,
                            "timestamp": data_point.timestamp.isoformat()
                        })
                        print(f"   ✅ {data_point.parameter}: {data_point.value} {data_point.unit}")
                    
                    self.ingested_data["air_quality"] = sample_data
                    self.ingested_data["total_points"] += len(openaq_data)
                    
                    return {
                        "status": "success",
                        "data_points": len(openaq_data),
                        "parameters": list(set(dp.parameter for dp in openaq_data)),
                        "sample_data": sample_data
                    }
                else:
                    return {"status": "warning", "message": "No data available"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_cpcb_simulation(self) -> Dict[str, Any]:
        """Test CPCB data ingestion with realistic simulation."""
        print("🏭 Testing CPCB Data Ingestion (Simulation)...")
        
        try:
            async with CPCBClient() as client:
                # Test Delhi stations
                delhi_stations = ["DL001", "DL002", "DL003"]
                
                cpcb_data = await client.fetch_data(
                    stations=delhi_stations,
                    start_time=datetime.utcnow() - timedelta(hours=1),
                    end_time=datetime.utcnow()
                )
                
                if cpcb_data:
                    sample_data = []
                    for data_point in cpcb_data[:10]:  # First 10 points
                        sample_data.append({
                            "station_id": data_point.station_id,
                            "parameter": data_point.parameter,
                            "value": data_point.value,
                            "unit": data_point.unit,
                            "quality_flag": data_point.quality_flag,
                            "source": data_point.source,
                            "timestamp": data_point.timestamp.isoformat()
                        })
                        print(f"   ✅ {data_point.station_id} {data_point.parameter}: {data_point.value} {data_point.unit}")
                    
                    self.ingested_data["air_quality"].extend(sample_data)
                    self.ingested_data["total_points"] += len(cpcb_data)
                    
                    return {
                        "status": "success",
                        "stations_processed": len(delhi_stations),
                        "data_points": len(cpcb_data),
                        "parameters": list(set(dp.parameter for dp in cpcb_data)),
                        "sample_data": sample_data
                    }
                else:
                    return {"status": "warning", "message": "No data available"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_comprehensive_ingestion(self) -> Dict[str, Any]:
        """Test comprehensive data ingestion using orchestrator."""
        print("🔄 Testing Comprehensive Data Ingestion...")
        
        try:
            orchestrator = DataIngestionOrchestrator()
            await orchestrator.initialize_clients()
            
            # Test ingestion for Delhi area
            locations = [
                (28.6139, 77.2090),  # Central Delhi
                (28.7041, 77.1025),  # North Delhi
                (28.5355, 77.3910),  # East Delhi
            ]
            
            results = await orchestrator.ingest_all_sources(
                locations=locations,
                start_time=datetime.utcnow() - timedelta(hours=1),
                end_time=datetime.utcnow()
            )
            
            summary = {
                "air_quality_points": len(results["air_quality"]),
                "weather_points": len(results["weather"]),
                "traffic_points": len(results["traffic"]),
                "total_points": len(results["air_quality"]) + len(results["weather"]) + len(results["traffic"])
            }
            
            print(f"   ✅ Air Quality: {summary['air_quality_points']} points")
            print(f"   ✅ Weather: {summary['weather_points']} points")
            print(f"   ✅ Traffic: {summary['traffic_points']} points")
            print(f"   ✅ Total: {summary['total_points']} points")
            
            return {
                "status": "success",
                "summary": summary,
                "locations_processed": len(locations)
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def run_all_ingestion_tests(self) -> Dict[str, Any]:
        """Run all data ingestion tests."""
        print("📥 Testing Real Data Ingestion...")
        print("=" * 60)
        
        tests = [
            ("IMD Weather", self.test_imd_weather_ingestion),
            ("OpenAQ Air Quality", self.test_openaq_fallback),
            ("CPCB Simulation", self.test_cpcb_simulation),
            ("Comprehensive Ingestion", self.test_comprehensive_ingestion)
        ]
        
        results = {}
        
        for name, test_func in tests:
            print(f"\n{name}:")
            print("-" * 40)
            try:
                result = await test_func()
                results[name] = result
                
                if result["status"] == "success":
                    print(f"✅ {name}: SUCCESS")
                    if "data_points" in result:
                        print(f"   Data Points: {result['data_points']}")
                elif result["status"] == "warning":
                    print(f"⚠️  {name}: WARNING - {result['message']}")
                else:
                    print(f"❌ {name}: ERROR - {result['message']}")
                    
            except Exception as e:
                print(f"❌ {name}: EXCEPTION - {str(e)}")
                results[name] = {"status": "error", "message": str(e)}
        
        return results


async def main():
    """Main function to test real data ingestion."""
    ingester = RealDataIngester()
    results = await ingester.run_all_ingestion_tests()
    
    print("\n" + "=" * 60)
    print("📊 Data Ingestion Test Summary")
    print("=" * 60)
    
    successful_tests = []
    failed_tests = []
    
    for test_name, result in results.items():
        if result["status"] == "success":
            successful_tests.append(test_name)
        else:
            failed_tests.append(test_name)
    
    print(f"✅ Successful Tests: {len(successful_tests)}")
    for test in successful_tests:
        print(f"   - {test}")
    
    print(f"\n❌ Failed Tests: {len(failed_tests)}")
    for test in failed_tests:
        print(f"   - {test}: {results[test]['message']}")
    
    print(f"\n📈 Total Data Points Ingested: {ingester.ingested_data['total_points']}")
    print(f"   - Weather Points: {len(ingester.ingested_data['weather'])}")
    print(f"   - Air Quality Points: {len(ingester.ingested_data['air_quality'])}")
    
    # Save detailed results
    output_data = {
        "test_results": results,
        "ingested_data": ingester.ingested_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    with open('real_data_ingestion_results.json', 'w') as f:
        json.dump(output_data, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: real_data_ingestion_results.json")
    
    return results


if __name__ == "__main__":
    asyncio.run(main())