import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.geoapify_service import geoapify_service

async def test_geoapify():
    print("=" * 50)
    print("🔍 TESTING GEOAPIFY INTEGRATION")
    print("=" * 50)
    
    # Test 1: Geocoding
    print("\n📌 Test 1: Geocoding Chicago, IL")
    coords = await geoapify_service._geocode_location("Chicago, IL")
    if coords:
        print(f"   ✅ Success! Coordinates: {coords}")
        lat, lon = coords
    else:
        print("   ❌ Geocoding failed")
        return
    
    # Test 2: Search for restaurants
    print("\n🍽️ Test 2: Search for restaurants in Chicago")
    businesses = await geoapify_service.search_businesses(
        location="Chicago, IL",
        business_type="restaurant",
        limit=5
    )
    
    if businesses:
        print(f"   ✅ Found {len(businesses)} restaurants:")
        for i, b in enumerate(businesses, 1):
            rating = f"⭐ {b.rating}" if b.rating else "No rating"
            print(f"   {i}. {b.name} - {b.city}, {b.state} - {rating}")
    else:
        print("   ❌ No restaurants found")
    
    # Test 3: Search for cafes
    print("\n☕ Test 3: Search for cafes in Chicago")
    cafes = await geoapify_service.search_businesses(
        location="Chicago, IL",
        business_type="cafe",
        limit=5
    )
    
    if cafes:
        print(f"   ✅ Found {len(cafes)} cafes:")
        for i, c in enumerate(cafes, 1):
            print(f"   {i}. {c.name} - {c.city}, {c.state}")
    else:
        print("   ❌ No cafes found")
    
    print("\n" + "=" * 50)
    print("✅ TEST COMPLETE")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_geoapify())