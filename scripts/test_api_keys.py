#!/usr/bin/env python3
"""
Script to test and validate API keys from .env.development file.
Tests connectivity and data retrieval from all configured external APIs.
"""

import os
import sys
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.development')

class APIKeyTester:
    """Test API keys and validate data retrieval."""
    
    def __init__(self):
        self.results = {}
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_openweather_api(self) -> Dict[str, Any]:
        """Test OpenWeatherMap API key."""
        api_key = os.getenv('OPENWEATHER_API_KEY')
        if not api_key:
            return {"status": "error", "message": "API key not found"}
        
        try:
            # Test current weather for Delhi
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "q": "Delhi,IN",
                "appid": api_key,
                "units": "metric"
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "status": "success",
                        "api": "OpenWeatherMap",
                        "test_location": "Delhi",
                        "temperature": data["main"]["temp"],
                        "humidity": data["main"]["humidity"],
                        "description": data["weather"][0]["description"],
                        "timestamp": datetime.utcnow().isoformat()
                    }
                elif response.status == 401:
                    return {"status": "error", "message": "Invalid API key"}
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_openaq_api(self) -> Dict[str, Any]:
        """Test OpenAQ API key."""
        api_key = os.getenv('OPENAQ_API_KEY')
        if not api_key:
            return {"status": "error", "message": "API key not found"}
        
        try:
            # Test latest measurements for Delhi
            url = "https://api.openaq.org/v2/latest"
            params = {
                "city": "Delhi",
                "country": "IN",
                "limit": 5
            }
            headers = {"X-API-Key": api_key}
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    results = data.get("results", [])
                    if results:
                        sample = results[0]
                        measurements = sample.get("measurements", [])
                        return {
                            "status": "success",
                            "api": "OpenAQ",
                            "location": sample.get("location"),
                            "city": sample.get("city"),
                            "measurements_count": len(measurements),
                            "sample_measurement": measurements[0] if measurements else None,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    else:
                        return {"status": "warning", "message": "No data available for Delhi"}
                elif response.status == 401:
                    return {"status": "error", "message": "Invalid API key"}
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_cpcb_api(self) -> Dict[str, Any]:
        """Test CPCB API key (via WAQI)."""
        api_key = os.getenv('CPCB_API_KEY')
        if not api_key:
            return {"status": "error", "message": "API key not found"}
        
        try:
            # Test WAQI API for Delhi
            url = "https://api.waqi.info/feed/delhi/"
            params = {"token": api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "ok":
                        aqi_data = data.get("data", {})
                        return {
                            "status": "success",
                            "api": "WAQI (CPCB)",
                            "location": aqi_data.get("city", {}).get("name"),
                            "aqi": aqi_data.get("aqi"),
                            "dominant_pollutant": aqi_data.get("dominentpol"),
                            "measurements": aqi_data.get("iaqi", {}),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    else:
                        return {"status": "error", "message": data.get("data", "Unknown error")}
                elif response.status == 401:
                    return {"status": "error", "message": "Invalid API key"}
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_google_maps_api(self) -> Dict[str, Any]:
        """Test Google Maps API key."""
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            return {"status": "warning", "message": "API key not configured"}
        
        try:
            # Test geocoding API
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": "Delhi, India",
                "key": api_key
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "OK":
                        result = data.get("results", [{}])[0]
                        location = result.get("geometry", {}).get("location", {})
                        return {
                            "status": "success",
                            "api": "Google Maps",
                            "test_address": "Delhi, India",
                            "formatted_address": result.get("formatted_address"),
                            "coordinates": location,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    else:
                        return {"status": "error", "message": data.get("error_message", data.get("status"))}
                elif response.status == 403:
                    return {"status": "error", "message": "API key invalid or quota exceeded"}
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all API key tests."""
        print("🔍 Testing API Keys from .env.development...")
        print("=" * 60)
        
        tests = [
            ("OpenWeatherMap", self.test_openweather_api),
            ("OpenAQ", self.test_openaq_api),
            ("CPCB/WAQI", self.test_cpcb_api),
            ("Google Maps", self.test_google_maps_api)
        ]
        
        results = {}
        
        for name, test_func in tests:
            print(f"\n🧪 Testing {name}...")
            try:
                result = await test_func()
                results[name] = result
                
                if result["status"] == "success":
                    print(f"✅ {name}: SUCCESS")
                    if "temperature" in result:
                        print(f"   Temperature: {result['temperature']}°C")
                    if "aqi" in result:
                        print(f"   AQI: {result['aqi']}")
                    if "measurements_count" in result:
                        print(f"   Measurements: {result['measurements_count']}")
                elif result["status"] == "warning":
                    print(f"⚠️  {name}: WARNING - {result['message']}")
                else:
                    print(f"❌ {name}: ERROR - {result['message']}")
                    
            except Exception as e:
                print(f"❌ {name}: EXCEPTION - {str(e)}")
                results[name] = {"status": "error", "message": str(e)}
        
        return results


async def main():
    """Main function to test all API keys."""
    async with APIKeyTester() as tester:
        results = await tester.run_all_tests()
        
        print("\n" + "=" * 60)
        print("📊 API Key Test Summary")
        print("=" * 60)
        
        working_apis = []
        failed_apis = []
        
        for api_name, result in results.items():
            if result["status"] == "success":
                working_apis.append(api_name)
            else:
                failed_apis.append(api_name)
        
        print(f"✅ Working APIs: {len(working_apis)}")
        for api in working_apis:
            print(f"   - {api}")
        
        print(f"\n❌ Failed APIs: {len(failed_apis)}")
        for api in failed_apis:
            print(f"   - {api}: {results[api]['message']}")
        
        # Save detailed results
        with open('api_key_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed results saved to: api_key_test_results.json")
        
        return results


if __name__ == "__main__":
    asyncio.run(main())