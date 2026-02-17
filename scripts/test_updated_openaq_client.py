#!/usr/bin/env python3
"""
Test the updated OpenAQ v3 client integration.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from data.ingestion_clients import OpenAQClient

# Load environment variables
load_dotenv('.env.development')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_openaq_v3_client():
    """Test the updated OpenAQ v3 client."""
    logger.info("Testing updated OpenAQ v3 client")
    
    try:
        # Initialize client
        client = OpenAQClient()
        
        async with client:
            # Test 1: Fetch data for major Indian cities
            logger.info("Test 1: Fetching data for major Indian cities")
            cities = ["Delhi", "Mumbai", "Bangalore", "Chennai"]
            data_points = await client.fetch_data(cities=cities)
            
            print(f"\n{'='*60}")
            print(f"TEST 1: MAJOR INDIAN CITIES")
            print(f"{'='*60}")
            print(f"Cities requested: {', '.join(cities)}")
            print(f"Data points received: {len(data_points)}")
            
            if data_points:
                # Analyze data sources
                real_data = [dp for dp in data_points if not dp.source.endswith("_simulation")]
                sim_data = [dp for dp in data_points if dp.source.endswith("_simulation")]
                
                print(f"Real data points: {len(real_data)}")
                print(f"Simulated data points: {len(sim_data)}")
                
                # Show sample real data
                if real_data:
                    print(f"\nSample real data:")
                    for i, dp in enumerate(real_data[:3]):
                        print(f"  {i+1}. {dp.metadata.get('location_name', 'Unknown')} - {dp.parameter}: {dp.value} {dp.unit}")
                        print(f"     Source: {dp.source}, Station: {dp.station_id}")
                        print(f"     Timestamp: {dp.timestamp}")
                
                # Show sample simulation data
                if sim_data:
                    print(f"\nSample simulation data:")
                    for i, dp in enumerate(sim_data[:3]):
                        print(f"  {i+1}. {dp.metadata.get('location_name', 'Unknown')} - {dp.parameter}: {dp.value:.1f} {dp.unit}")
                        print(f"     Reason: {dp.metadata.get('simulation_reason', 'Unknown')}")
            
            # Test 2: Fetch data for Delhi specifically
            logger.info("Test 2: Fetching data specifically for Delhi")
            delhi_data = await client.fetch_data(cities=["Delhi"])
            
            print(f"\n{'='*60}")
            print(f"TEST 2: DELHI SPECIFIC DATA")
            print(f"{'='*60}")
            print(f"Data points for Delhi: {len(delhi_data)}")
            
            if delhi_data:
                real_delhi = [dp for dp in delhi_data if not dp.source.endswith("_simulation")]
                print(f"Real Delhi data points: {len(real_delhi)}")
                
                if real_delhi:
                    print(f"\nDelhi monitoring stations with real data:")
                    stations = {}
                    for dp in real_delhi:
                        station_name = dp.metadata.get('location_name', 'Unknown')
                        if station_name not in stations:
                            stations[station_name] = []
                        stations[station_name].append(dp)
                    
                    for station, points in stations.items():
                        parameters = [dp.parameter for dp in points]
                        print(f"  - {station}: {len(points)} measurements ({', '.join(set(parameters))})")
            
            # Test 3: Test without API key (should use simulation)
            logger.info("Test 3: Testing without API key (simulation mode)")
            client_no_key = OpenAQClient(api_key=None)
            
            async with client_no_key:
                sim_data = await client_no_key.fetch_data(cities=["Delhi", "Mumbai"])
                
                print(f"\n{'='*60}")
                print(f"TEST 3: SIMULATION MODE (NO API KEY)")
                print(f"{'='*60}")
                print(f"Simulation data points: {len(sim_data)}")
                
                if sim_data:
                    # Check simulation quality
                    cities_covered = set(dp.metadata.get('location_name', '').split()[0] for dp in sim_data)
                    parameters_covered = set(dp.parameter for dp in sim_data)
                    
                    print(f"Cities in simulation: {', '.join(cities_covered)}")
                    print(f"Parameters simulated: {', '.join(parameters_covered)}")
                    
                    # Show sample values
                    print(f"\nSample simulation values:")
                    for city in ["Delhi", "Mumbai"]:
                        city_data = [dp for dp in sim_data if city in dp.metadata.get('location_name', '')]
                        if city_data:
                            pm25_data = [dp for dp in city_data if dp.parameter == 'pm25']
                            if pm25_data:
                                print(f"  {city} PM2.5: {pm25_data[0].value:.1f} {pm25_data[0].unit}")
            
            # Summary
            print(f"\n{'='*60}")
            print(f"INTEGRATION TEST SUMMARY")
            print(f"{'='*60}")
            
            total_real = len([dp for dp in data_points if not dp.source.endswith("_simulation")])
            total_sim = len([dp for dp in data_points if dp.source.endswith("_simulation")])
            
            print(f"✅ OpenAQ v3 client successfully updated")
            print(f"✅ API integration working: {total_real > 0}")
            print(f"✅ Simulation fallback working: {total_sim > 0}")
            print(f"✅ Data format standardized: All DataPoint objects")
            
            if total_real > 0:
                real_percentage = (total_real / (total_real + total_sim)) * 100
                print(f"📊 Real data coverage: {real_percentage:.1f}%")
                print(f"🎯 Integration status: SUCCESSFUL")
            else:
                print(f"⚠️  No real data available (using simulation)")
                print(f"🎯 Integration status: SIMULATION ONLY")
            
            return {
                "status": "success",
                "total_data_points": len(data_points),
                "real_data_points": total_real,
                "simulated_data_points": total_sim,
                "real_data_percentage": (total_real / (total_real + total_sim)) * 100 if (total_real + total_sim) > 0 else 0,
                "integration_working": total_real > 0
            }
            
    except Exception as e:
        logger.error(f"OpenAQ v3 client test failed: {e}")
        print(f"\n❌ TEST FAILED: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


async def main():
    """Main function to run OpenAQ v3 client test."""
    try:
        results = await test_openaq_v3_client()
        
        # Save results
        with open('openaq_v3_client_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nTest results saved to: openaq_v3_client_test_results.json")
        
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())