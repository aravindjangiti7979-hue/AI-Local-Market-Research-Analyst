import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.foursquare_service import foursquare_service

async def test_foursquare():
    print("=" * 60)
    print("🔍 TESTING FOURSQUARE API WITH YOUR KEY")
    print("=" * 60)
    
    # Test searching for restaurants in Chicago
    print("\n📌 Searching for restaurants in Chicago...")
    businesses = await foursquare_service.search_businesses(
        location="Chicago, IL",
        business_type="restaurant",
        limit=5
    )
    
    if businesses:
        print(f"✅ Found {len(businesses)} restaurants:")
        for i, b in enumerate(businesses, 1):
            print(f"\n{i}. {b.name}")
            print(f"   Address: {b.address}")
            print(f"   City: {b.city}, {b.state}")
            print(f"   Rating: {b.rating}")
            print(f"   Categories: {', '.join(b.categories)}")
    else:
        print("❌ No restaurants found")
    
    # Test searching for cafes
    print("\n" + "=" * 60)
    print("\n📌 Searching for cafes in Chicago...")
    cafes = await foursquare_service.search_businesses(
        location="Chicago, IL",
        business_type="cafe",
        limit=5
    )
    
    if cafes:
        print(f"✅ Found {len(cafes)} cafes:")
        for i, b in enumerate(cafes, 1):
            print(f"\n{i}. {b.name}")
            print(f"   Address: {b.address}")
            print(f"   City: {b.city}, {b.state}")
            print(f"   Rating: {b.rating}")
    else:
        print("❌ No cafes found")

if __name__ == "__main__":
    asyncio.run(test_foursquare())