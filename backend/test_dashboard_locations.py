# test_dashboard_locations.py
import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult
from sqlalchemy import select, func
import json

async def test_dashboard_locations():
    print("=" * 60)
    print("🔍 TESTING DASHBOARD DATA FLOW")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get the most recent analysis result
        result = await db.execute(
            select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(1)
        )
        latest = result.scalar_one_or_none()
        
        if not latest:
            print("❌ No analysis results found")
            return
        
        print(f"\n📊 Latest Result ID: {latest.id}")
        
        if latest.competitor_analysis:
            comp_data = latest.competitor_analysis
            competitors = comp_data.get('competitor_analysis', [])
            
            print(f"\n📍 Extracting locations for dashboard:")
            locations = []
            
            for comp in competitors[:5]:
                lat = comp.get('latitude')
                lng = comp.get('longitude')
                name = comp.get('competitor_name', 'Unknown')
                
                if lat and lng:
                    locations.append({
                        "name": name,
                        "lat": lat,
                        "lng": lng
                    })
                    print(f"  ✅ {name}: ({lat}, {lng})")
            
            print(f"\n📊 Found {len(locations)} locations for Market Map")
            
            # This is exactly what will be sent to the frontend
            print(f"\n🚀 Dashboard will receive: {len(locations)} business locations")
        else:
            print("❌ No competitor_analysis found")

if __name__ == "__main__":
    asyncio.run(test_dashboard_locations())