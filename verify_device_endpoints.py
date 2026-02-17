"""
Quick verification script for device endpoints.
This script demonstrates that all device endpoints are properly registered.
"""

from src.api.routers import devices

def verify_device_router():
    """Verify device router is properly configured."""
    print("=" * 60)
    print("Device Router Verification")
    print("=" * 60)
    
    # Check router exists
    print(f"\n✓ Device router imported successfully")
    print(f"✓ Router object: {devices.router}")
    
    # Check routes
    routes = devices.router.routes
    print(f"\n✓ Total routes registered: {len(routes)}")
    
    print("\nRegistered Endpoints:")
    print("-" * 60)
    
    for i, route in enumerate(routes, 1):
        methods = ", ".join(route.methods) if hasattr(route, 'methods') else "N/A"
        path = route.path if hasattr(route, 'path') else "N/A"
        name = route.name if hasattr(route, 'name') else "N/A"
        print(f"{i}. {methods:6} {path:35} ({name})")
    
    # Verify expected endpoints
    expected_endpoints = [
        ("GET", ""),
        ("POST", ""),
        ("GET", "/{device_id}"),
        ("PUT", "/{device_id}"),
        ("DELETE", "/{device_id}"),
        ("PATCH", "/{device_id}/status"),
        ("PATCH", "/{device_id}/reading"),
        ("PATCH", "/{device_id}/toggle"),
    ]
    
    print("\n" + "=" * 60)
    print("Endpoint Verification")
    print("=" * 60)
    
    found_endpoints = []
    for route in routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            for method in route.methods:
                found_endpoints.append((method, route.path))
    
    all_found = True
    for method, path in expected_endpoints:
        if (method, path) in found_endpoints:
            print(f"✓ {method:6} /api/v1/devices{path}")
        else:
            print(f"✗ {method:6} /api/v1/devices{path} - NOT FOUND")
            all_found = False
    
    print("\n" + "=" * 60)
    if all_found:
        print("✓ All expected endpoints are registered!")
    else:
        print("✗ Some endpoints are missing!")
    print("=" * 60)
    
    return all_found


if __name__ == "__main__":
    try:
        success = verify_device_router()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
