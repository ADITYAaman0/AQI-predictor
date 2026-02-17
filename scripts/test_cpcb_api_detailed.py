#!/usr/bin/env python3
"""
Detailed CPCB/WAQI API Key Testing Script

This script specifically tests the CPCB API key (which uses WAQI API)
to determine if the updated key is working correctly.
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.development')

class CPCBAPITester:
    def __init__(self):
        self.api_key = os.getenv('CPCB_API_KEY')
        self.base_url = "https://api.waqi.info"
        
    async def test_api_key_validation(self) -> Dict[str, Any]:
        """Test API key validation with a simple request."""
        print("🔑 Testing CPCB/WAQI API Key Validation...")
        print(f"API Key: {self.api_key[:10]}...{self.api_key[-10:] if self.api_key else 'None'}")
        
        if not self.api_key:
            return {
                "status": "error",
                "message": "No API key configured",
                "details": "CPCB_API_KEY not found in environment"
            }
        
        try:
            # Test with Beijing (a reliable station)
            test_url = f"{self.base_url}/feed/beijing/"
            params = {"token": self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(test_url, params=params) as response:
                    response_data = await response.json()
                    
                    print(f"Response Status: {response.status}")
                    print(f"Response Data: {json.dumps(response_data, indent=2)}")
                    
                    if response_data.get("status") == "ok":
                        return {
                            "status": "success",
                            "message": "API key is valid",
                            "details": response_data
                        }
                    elif response_data.get("status") == "error":
                        error_msg = response_data.get("data", "Unknown error")
                        return {
                            "status": "error",
                            "message": f"API returned error: {error_msg}",
                            "details": response_data
                        }
                    else:
                        return {
                            "status": "error",
                            "message": "Unexpected API response",
                            "details": response_data
                        }
                        
        except Exception as e:
            return {
                "status": "error",
                "message": f"Request failed: {str(e)}",
                "details": {"exception": str(e)}
            }
    
    async def test_indian_stations(self) -> Dict[str, Any]:
        """Test access to Indian monitoring stations."""
        print("\n🇮🇳 Testing Indian Station Access...")
        
        # Test various Indian cities/stations
        indian_stations = [
            "delhi",
            "mumbai", 
            "bangalore",
            "chennai",
            "kolkata",
            "anand-vihar-delhi",
            "rk-puram-delhi",
            "colaba-mumbai",
            "btm-layout-bangalore"
        ]
        
        results = {}
        
        for station in indian_stations:
            try:
                url = f"{self.base_url}/feed/{station}/"
                params = {"token": self.api_key}
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params) as response:
                        response_data = await response.json()
                        
                        if response_data.get("status") == "ok":
                            data = response_data.get("data", {})
                            aqi = data.get("aqi", "N/A")
                            city_name = data.get("city", {}).get("name", station)
                            
                            results[station] = {
                                "status": "success",
                                "aqi": aqi,
                                "city_name": city_name,
                                "data_available": bool(data.get("iaqi"))
                            }
                            print(f"  ✅ {station}: AQI {aqi} ({city_name})")
                        else:
                            error_msg = response_data.get("data", "Unknown error")
                            results[station] = {
                                "status": "error",
                                "message": error_msg
                            }
                            print(f"  ❌ {station}: {error_msg}")
                            
            except Exception as e:
                results[station] = {
                    "status": "error",
                    "message": str(e)
                }
                print(f"  ❌ {station}: Exception - {str(e)}")
        
        return results
    
    async def test_search_functionality(self) -> Dict[str, Any]:
        """Test search functionality to find available stations."""
        print("\n🔍 Testing Search Functionality...")
        
        try:
            # Test search for Indian cities
            search_url = f"{self.base_url}/search/"
            params = {"token": self.api_key, "keyword": "delhi"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=params) as response:
                    response_data = await response.json()
                    
                    print(f"Search Response: {json.dumps(response_data, indent=2)}")
                    
                    if response_data.get("status") == "ok":
                        data = response_data.get("data", [])
                        print(f"Found {len(data)} stations for 'delhi'")
                        
                        for station in data[:5]:  # Show first 5 results
                            station_name = station.get("station", {}).get("name", "Unknown")
                            station_url = station.get("station", {}).get("url", "Unknown")
                            print(f"  - {station_name}: {station_url}")
                        
                        return {
                            "status": "success",
                            "stations_found": len(data),
                            "sample_stations": data[:5]
                        }
                    else:
                        error_msg = response_data.get("data", "Unknown error")
                        return {
                            "status": "error",
                            "message": error_msg
                        }
                        
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive results."""
        print("🧪 CPCB/WAQI API Comprehensive Testing")
        print("=" * 50)
        
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "api_key_configured": bool(self.api_key),
            "api_key_preview": f"{self.api_key[:10]}...{self.api_key[-10:]}" if self.api_key else None,
            "tests": {}
        }
        
        # Test 1: API Key Validation
        validation_result = await self.test_api_key_validation()
        results["tests"]["api_key_validation"] = validation_result
        
        if validation_result["status"] == "success":
            # Test 2: Indian Stations Access
            indian_stations_result = await self.test_indian_stations()
            results["tests"]["indian_stations"] = indian_stations_result
            
            # Test 3: Search Functionality
            search_result = await self.test_search_functionality()
            results["tests"]["search_functionality"] = search_result
            
            # Summary
            working_stations = sum(1 for station_data in indian_stations_result.values() 
                                 if station_data.get("status") == "success")
            total_stations = len(indian_stations_result)
            
            results["summary"] = {
                "api_key_valid": True,
                "working_indian_stations": working_stations,
                "total_tested_stations": total_stations,
                "success_rate": f"{working_stations}/{total_stations} ({working_stations/total_stations*100:.1f}%)",
                "recommendation": "API key is working - proceed with integration" if working_stations > 0 else "API key valid but no Indian stations accessible"
            }
        else:
            results["summary"] = {
                "api_key_valid": False,
                "error": validation_result["message"],
                "recommendation": "Fix API key issue before proceeding"
            }
        
        return results

async def main():
    """Main test execution."""
    tester = CPCBAPITester()
    results = await tester.run_comprehensive_test()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    summary = results.get("summary", {})
    if summary.get("api_key_valid"):
        print("✅ API Key Status: VALID")
        print(f"🏭 Working Stations: {summary.get('working_indian_stations', 0)}")
        print(f"📈 Success Rate: {summary.get('success_rate', 'N/A')}")
        print(f"💡 Recommendation: {summary.get('recommendation', 'N/A')}")
    else:
        print("❌ API Key Status: INVALID")
        print(f"🚫 Error: {summary.get('error', 'Unknown error')}")
        print(f"💡 Recommendation: {summary.get('recommendation', 'N/A')}")
    
    # Save detailed results
    output_file = "cpcb_api_detailed_test_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())