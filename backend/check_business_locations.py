import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult
from sqlalchemy import select
import json

async def check_business_locations():
    print("=" * 60)
    print("🔍 CHECKING BUSINESS LOCATIONS IN DATABASE")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get the most recent analysis results
        result = await db.execute(
            select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(5)
        )
        results = result.scalars().all()
        
        print(f"\n📊 Found {len(results)} recent analysis results")
        
        total_businesses = 0
        total_with_coords = 0
        
        for i, r in enumerate(results):
            print(f"\n--- Result {i+1} (ID: {r.id}) ---")
            
            if r.competitor_analysis:
                comp_data = r.competitor_analysis
                competitors = comp_data.get('competitor_analysis', [])
                
                print(f"Total competitors: {len(competitors)}")
                total_businesses += len(competitors)
                
                businesses_with_coords = 0
                for comp in competitors[:10]:  # Check first 10
                    lat = comp.get('latitude')
                    lng = comp.get('longitude')
                    name = comp.get('competitor_name', 'Unknown')
                    
                    if lat and lng:
                        businesses_with_coords += 1
                        print(f"  ✅ {name[:30]}...: ({lat}, {lng})")
                    else:
                        print(f"  ❌ {name[:30]}...: No coordinates")
                
                total_with_coords += businesses_with_coords
                print(f"Businesses with coordinates in this result: {businesses_with_coords}/{min(10, len(competitors))}")
            else:
                print("❌ No competitor_analysis data found!")
        
        print("\n" + "=" * 60)
        print(f"📊 SUMMARY: {total_with_coords} out of {total_businesses} businesses have coordinates")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(check_business_locations())