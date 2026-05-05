import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.geoapify_service import geoapify_service

async def test_geoapify_coords():
    print("=" * 60)
    print("🔍 TESTING GEOAPIFY COORDINATES")
    print("=" * 60)
    
    businesses = await geoapify_service.search_businesses(
        location="Chicago, IL",
        business_type="restaurant",
        limit=5
    )
    
    print(f"\n✅ Found {len(businesses)} restaurants:")
    
    businesses_with_coords = 0
    for i, b in enumerate(businesses, 1):
        print(f"\n{i}. {b.name}")
        print(f"   Address: {b.address}")
        print(f"   City: {b.city}, {b.state}")
        print(f"   Latitude: {b.latitude}")
        print(f"   Longitude: {b.longitude}")
        print(f"   Has coordinates: {'✅ YES' if b.latitude and b.longitude else '❌ NO'}")
        
        if b.latitude and b.longitude:
            businesses_with_coords += 1
    
    print(f"\n📊 {businesses_with_coords}/{len(businesses)} businesses have coordinates")

if __name__ == "__main__":
    asyncio.run(test_geoapify_coords())