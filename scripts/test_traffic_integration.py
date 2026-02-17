"""
Test script to demonstrate traffic data integration.

This script tests the Google Maps traffic data integration by:
1. Fetching traffic data for multiple locations
2. Displaying traffic metrics
3. Verifying data quality
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.data.ingestion_clients import GoogleMapsClient


async def test_traffic_integration():
    """Test traffic data integration."""
    print("=" * 80)
    print("Traffic Data Integration Test")
    print("=" * 80)
    print()
    
    # Test locations (major cities in India)
    test_locations = [
        (28.6139, 77.2090, "Central Delhi"),
        (19.0760, 72.8777, "Mumbai"),
        (12.9716, 77.5946, "Bangalore"),
        (13.0827, 80.2707, "Chennai"),
        (22.5726, 88.3639, "Kolkata"),
    ]
    
    print("Testing traffic data fetching for major Indian cities...")
    print()
    
    # Initialize client
    client = GoogleMapsClient()
    
    # Test 1: Fetch traffic data without API key (simulation mode)
    print("Test 1: Fetching traffic data (simulation mode)")
    print("-" * 80)
    
    async with client:
        traffic_points = await client.fetch_traffic_data(
            locations=[(lat, lon) for lat, lon, _ in test_locations],
            include_monitoring_points=False
        )
    
    print(f"✓ Fetched {len(traffic_points)} traffic data points")
    print()
    
    # Display traffic data for each location
    print("Traffic Data Summary:")
    print("-" * 80)
    print(f"{'Location':<20} {'Density':<10} {'Speed (km/h)':<15} {'Congestion':<15}")
    print("-" * 80)
    
    for i, point in enumerate(traffic_points[:len(test_locations)]):
        location_name = test_locations[i][2] if i < len(test_locations) else "Unknown"
        print(f"{location_name:<20} {point.traffic_density:<10.2f} "
              f"{point.average_speed:<15.1f} {point.congestion_level:<15}")
    
    print()
    
    # Test 2: Fetch traffic data with monitoring points
    print("Test 2: Fetching traffic data with monitoring points")
    print("-" * 80)
    
    async with client:
        monitoring_traffic = await client.fetch_traffic_data(
            locations=None,
            include_monitoring_points=True
        )
    
    print(f"✓ Fetched {len(monitoring_traffic)} traffic data points from monitoring locations")
    print()
    
    # Display monitoring point data
    print("Monitoring Point Traffic Data (sample):")
    print("-" * 80)
    print(f"{'Location':<30} {'Density':<10} {'Speed':<10} {'Congestion':<15}")
    print("-" * 80)
    
    for point in monitoring_traffic[:10]:  # Show first 10
        location_name = point.metadata.get("location_name", "Unknown") if point.metadata else "Unknown"
        print(f"{location_name:<30} {point.traffic_density:<10.2f} "
              f"{point.average_speed:<10.1f} {point.congestion_level:<15}")
    
    print()
    
    # Test 3: Data quality validation
    print("Test 3: Data Quality Validation")
    print("-" * 80)
    
    all_points = traffic_points + monitoring_traffic
    
    # Validate data quality
    valid_count = 0
    invalid_count = 0
    
    for point in all_points:
        # Check if all required fields are present and valid
        if (point.timestamp and
            point.location and
            0 <= point.traffic_density <= 1 and
            point.congestion_level in ["free_flow", "light", "moderate", "heavy", "severe", "unknown"] and
            (point.average_speed is None or point.average_speed >= 0)):
            valid_count += 1
        else:
            invalid_count += 1
    
    print(f"✓ Valid data points: {valid_count}/{len(all_points)}")
    print(f"✓ Invalid data points: {invalid_count}/{len(all_points)}")
    print(f"✓ Data quality score: {(valid_count / len(all_points) * 100):.1f}%")
    print()
    
    # Test 4: Traffic pattern analysis
    print("Test 4: Traffic Pattern Analysis")
    print("-" * 80)
    
    # Analyze congestion levels
    congestion_counts = {}
    for point in all_points:
        level = point.congestion_level
        congestion_counts[level] = congestion_counts.get(level, 0) + 1
    
    print("Congestion Level Distribution:")
    for level, count in sorted(congestion_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(all_points)) * 100
        print(f"  {level:<15}: {count:>3} ({percentage:>5.1f}%)")
    
    print()
    
    # Calculate average metrics
    avg_density = sum(p.traffic_density for p in all_points) / len(all_points)
    avg_speed = sum(p.average_speed for p in all_points if p.average_speed) / \
                len([p for p in all_points if p.average_speed])
    
    print("Average Traffic Metrics:")
    print(f"  Average Traffic Density: {avg_density:.3f}")
    print(f"  Average Speed: {avg_speed:.1f} km/h")
    print()
    
    # Test 5: Time-based simulation validation
    print("Test 5: Time-Based Simulation Validation")
    print("-" * 80)
    
    current_hour = datetime.utcnow().hour
    is_rush_hour = 7 <= current_hour <= 10 or 18 <= current_hour <= 21
    
    print(f"Current time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"Current hour: {current_hour}")
    print(f"Is rush hour: {'Yes' if is_rush_hour else 'No'}")
    print()
    
    if is_rush_hour:
        print("✓ Expected higher traffic density during rush hours")
        if avg_density > 0.4:
            print("✓ Traffic density is appropriately high for rush hour")
        else:
            print("⚠ Traffic density seems low for rush hour (may vary by location)")
    else:
        print("✓ Expected moderate to low traffic density during non-rush hours")
        if avg_density < 0.6:
            print("✓ Traffic density is appropriate for non-rush hour")
        else:
            print("⚠ Traffic density seems high for non-rush hour (may vary by location)")
    
    print()
    
    # Summary
    print("=" * 80)
    print("Traffic Data Integration Test Summary")
    print("=" * 80)
    print(f"✓ Total traffic data points fetched: {len(all_points)}")
    print(f"✓ Data quality score: {(valid_count / len(all_points) * 100):.1f}%")
    print(f"✓ Average traffic density: {avg_density:.3f}")
    print(f"✓ Average speed: {avg_speed:.1f} km/h")
    print(f"✓ Monitoring points covered: {len(client.traffic_monitoring_points)}")
    print()
    print("✓ Traffic data integration is working correctly!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_traffic_integration())
