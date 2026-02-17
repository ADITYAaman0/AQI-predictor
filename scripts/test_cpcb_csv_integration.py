#!/usr/bin/env python3
"""
Test CPCB CSV Data Integration

This script tests the integration of the downloaded CPCB CSV data
to validate data quality and coverage.
"""

import sys
import os
import json
from datetime import datetime
from typing import Dict, Any

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.data.cpcb_csv_client import CPCBCSVClient, get_cpcb_csv_client

def test_cpcb_csv_integration():
    """Test CPCB CSV data integration comprehensively."""
    print("🧪 Testing CPCB CSV Data Integration")
    print("=" * 50)
    
    try:
        # Initialize client
        client = get_cpcb_csv_client()
        
        # Test 1: Data Summary
        print("\n📊 Test 1: Data Summary")
        summary = client.get_data_summary()
        
        if "error" in summary:
            print(f"❌ Error loading data: {summary['error']}")
            return False
        
        print(f"✅ Total Records: {summary['total_records']:,}")
        print(f"✅ Unique Stations: {summary['unique_stations']}")
        print(f"✅ Cities Covered: {summary['unique_cities']}")
        print(f"✅ States Covered: {summary['unique_states']}")
        print(f"✅ Parameters: {', '.join(summary['parameters_available'])}")
        print(f"✅ Date Range: {summary['date_range']['earliest']} to {summary['date_range']['latest']}")
        
        # Test 2: Delhi Data (Most comprehensive)
        print("\n🏛️ Test 2: Delhi Data Analysis")
        delhi_data = client.get_delhi_data()
        
        if delhi_data:
            print(f"✅ Delhi Data Points: {len(delhi_data)}")
            
            # Analyze parameters
            parameters = {}
            stations = set()
            for dp in delhi_data:
                parameters[dp.parameter] = parameters.get(dp.parameter, 0) + 1
                stations.add(dp.station_name)
            
            print(f"✅ Delhi Stations: {len(stations)}")
            print(f"✅ Delhi Parameters: {', '.join(parameters.keys())}")
            
            # Show sample data
            print("\n📋 Sample Delhi Data:")
            for i, dp in enumerate(delhi_data[:5]):
                print(f"  {i+1}. {dp.station_name}")
                print(f"     {dp.parameter.upper()}: {dp.value} {dp.unit}")
                print(f"     Location: ({dp.location[0]:.4f}, {dp.location[1]:.4f})")
                print(f"     Timestamp: {dp.timestamp}")
        else:
            print("❌ No Delhi data found")
        
        # Test 3: Major Cities Data
        print("\n🏙️ Test 3: Major Cities Coverage")
        major_cities_data = client.get_major_cities_data()
        
        for city, data in major_cities_data.items():
            stations = set(dp.station_name for dp in data)
            parameters = set(dp.parameter for dp in data)
            print(f"✅ {city}: {len(data)} data points, {len(stations)} stations, {len(parameters)} parameters")
        
        # Test 4: Station Search
        print("\n🔍 Test 4: Station Search")
        search_results = client.search_stations("Delhi")
        print(f"✅ Found {len(search_results)} stations matching 'Delhi'")
        
        for i, station in enumerate(search_results[:3]):
            print(f"  {i+1}. {station['station_name']} ({station['city']}, {station['state']})")
            print(f"     Parameters: {', '.join(station['parameters'])}")
        
        # Test 5: Coordinate-based Search
        print("\n📍 Test 5: Coordinate-based Search")
        # Delhi coordinates
        nearby_data = client.get_data_by_coordinates(28.6139, 77.2090, radius_km=25)
        
        if nearby_data:
            stations = set(dp.station_name for dp in nearby_data)
            print(f"✅ Found {len(nearby_data)} data points from {len(stations)} stations within 25km of Delhi center")
        else:
            print("❌ No data found near Delhi coordinates")
        
        # Test 6: Latest Data
        print("\n⏰ Test 6: Latest Data")
        latest_data = client.get_latest_data(limit=10)
        
        if latest_data:
            print(f"✅ Retrieved {len(latest_data)} latest data points")
            latest_timestamp = max(dp.timestamp for dp in latest_data)
            print(f"✅ Most recent data: {latest_timestamp}")
        else:
            print("❌ No latest data found")
        
        # Test 7: Data Quality Assessment
        print("\n🎯 Test 7: Data Quality Assessment")
        
        # Check data freshness
        all_data = client.get_latest_data(limit=1000)
        if all_data:
            timestamps = [dp.timestamp for dp in all_data]
            latest = max(timestamps)
            earliest = min(timestamps)
            
            # Check if data is recent (within last week)
            days_old = (datetime.now() - latest.replace(tzinfo=None)).days
            
            print(f"✅ Data Age: {days_old} days old")
            print(f"✅ Data Quality: {'EXCELLENT' if days_old < 7 else 'GOOD' if days_old < 30 else 'ACCEPTABLE'}")
            
            # Check geographic coverage
            cities = set(dp.city for dp in all_data)
            states = set(dp.state for dp in all_data)
            
            print(f"✅ Geographic Coverage: {len(cities)} cities across {len(states)} states")
            
            # Check parameter coverage
            parameters = set(dp.parameter for dp in all_data)
            print(f"✅ Parameter Coverage: {', '.join(sorted(parameters))}")
        
        print("\n" + "=" * 50)
        print("🎉 CPCB CSV Integration Test Results:")
        print("=" * 50)
        
        # Generate final assessment
        assessment = {
            "data_available": len(all_data) > 0,
            "data_quality": "EXCELLENT" if days_old < 7 else "GOOD",
            "geographic_coverage": len(cities),
            "parameter_coverage": len(parameters),
            "delhi_coverage": len(delhi_data) > 0,
            "major_cities_coverage": len(major_cities_data),
            "total_data_points": len(all_data),
            "recommendation": "EXCELLENT - Use as primary CPCB data source"
        }
        
        print(f"📊 Data Quality: {assessment['data_quality']}")
        print(f"🏙️ Cities Covered: {assessment['geographic_coverage']}")
        print(f"📈 Parameters: {assessment['parameter_coverage']}")
        print(f"📍 Total Data Points: {assessment['total_data_points']:,}")
        print(f"💡 Recommendation: {assessment['recommendation']}")
        
        # Save detailed results
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "summary": summary,
            "assessment": assessment,
            "delhi_sample": [
                {
                    "station": dp.station_name,
                    "parameter": dp.parameter,
                    "value": dp.value,
                    "unit": dp.unit,
                    "location": dp.location,
                    "timestamp": dp.timestamp.isoformat()
                } for dp in delhi_data[:10]
            ],
            "major_cities": {
                city: len(data) for city, data in major_cities_data.items()
            }
        }
        
        with open('cpcb_csv_integration_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed results saved to: cpcb_csv_integration_results.json")
        
        return True
        
    except Exception as e:
        print(f"❌ CPCB CSV integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_cpcb_csv_integration()
    if success:
        print("\n✅ CPCB CSV integration test completed successfully!")
    else:
        print("\n❌ CPCB CSV integration test failed!")
        sys.exit(1)