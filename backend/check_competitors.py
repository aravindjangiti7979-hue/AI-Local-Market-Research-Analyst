import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult
from sqlalchemy import select
import json

async def check_competitors():
    print("=" * 60)
    print("🔍 CHECKING COMPETITOR DATA IN DATABASE")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get the most recent analysis results
        result = await db.execute(
            select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(5)
        )
        results = result.scalars().all()
        
        print(f"\n📊 Found {len(results)} recent analysis results")
        
        for i, r in enumerate(results):
            print(f"\n--- Result {i+1} (ID: {r.id}) ---")
            print(f"Created: {r.created_at}")
            
            if r.competitor_analysis:
                comp_data = r.competitor_analysis
                total = comp_data.get('total_competitors', 0)
                comp_list = comp_data.get('competitor_analysis', [])
                
                print(f"Total competitors: {total}")
                print(f"Competitors in list: {len(comp_list)}")
                
                if comp_list:
                    print("\nFirst 3 competitors:")
                    for j, comp in enumerate(comp_list[:3]):
                        print(f"  {j+1}. {comp.get('competitor_name', 'Unknown')}")
                        print(f"     Strength: {comp.get('strength_score', 0)}")
                        print(f"     Location: {comp.get('location', 'N/A')}")
                else:
                    print("❌ No competitor_analysis list found!")
            else:
                print("❌ No competitor_analysis data found!")

if __name__ == "__main__":
    asyncio.run(check_competitors())