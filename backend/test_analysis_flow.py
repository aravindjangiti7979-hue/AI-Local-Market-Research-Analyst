import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.geoapify_service import geoapify_service
from models.market_models import BusinessData

async def test_competitor_data():
    print("=" * 60)
    print("🔍 TESTING COMPETITOR DATA FOR DASHBOARD")
    print("=" * 60)
    
    # Test parameters
    location = "Chicago, IL"
    business_type = "restaurant"
    
    print(f"\n📌 Searching for {business_type} competitors in {location}...")
    
    # Get businesses from Geoapify
    businesses = await geoapify_service.search_businesses(
        location=location,
        business_type=business_type,
        limit=10
    )
    
    print(f"\n✅ Found {len(businesses)} businesses:")
    print("-" * 50)
    
    for i, business in enumerate(businesses, 1):
        print(f"\n{i}. {business.name}")
        print(f"   Address: {business.address}")
        print(f"   City: {business.city}, {business.state}")
        print(f"   Rating: {business.rating or 'N/A'}")
        print(f"   Reviews: {business.review_count or 'N/A'}")
        print(f"   Categories: {', '.join(business.categories[:3]) if business.categories else 'N/A'}")
        
        # This is what will be sent to the dashboard
        competitor_data = {
            "competitor_name": business.name,
            "strength_score": (business.rating or 3.0) * 2,
            "weakness_score": 10 - ((business.rating or 3.0) * 2),
            "market_share_estimate": 1.0 / len(businesses) if businesses else 0,
            "customer_sentiment": ((business.rating or 3.0) - 3) / 2,
            "rating": business.rating,
            "review_count": business.review_count,
            "categories": business.categories
        }
        print(f"   Dashboard data: {competitor_data}")
    
    print("\n" + "=" * 60)
    print("✅ Test complete - This data will appear in your dashboard!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_competitor_data())