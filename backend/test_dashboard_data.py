import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult
from sqlalchemy import select, desc
import json

async def test_dashboard_format():
    print("=" * 70)
    print("🔍 TESTING DASHBOARD DATA FORMAT")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        # Get most recent analysis result
        result = await db.execute(
            select(AnalysisResult).order_by(desc(AnalysisResult.created_at)).limit(1)
        )
        latest = result.scalar_one_or_none()
        
        if not latest:
            print("❌ No analysis results found")
            return
        
        print(f"\n📊 Latest Result ID: {latest.id}")
        print(f"   Created: {latest.created_at}")
        
        if latest.competitor_analysis:
            comp_data = latest.competitor_analysis
            competitors = comp_data.get('competitor_analysis', [])
            
            print(f"\n📋 Found {len(competitors)} competitors in database")
            
            if competitors:
                print("\n✅ First 5 competitors with their data:")
                print("-" * 70)
                for i, comp in enumerate(competitors[:5]):
                    print(f"\n{i+1}. {comp.get('competitor_name', 'Unknown')}")
                    print(f"   Strength: {comp.get('strength_score', 0)}")
                    print(f"   Weakness: {comp.get('weakness_score', 0)}")
                    print(f"   Sentiment: {comp.get('customer_sentiment', 0)}")
                    print(f"   Market Share: {comp.get('market_share_estimate', 0)}")
                    print(f"   Location: {comp.get('location', 'N/A')}")
                    print(f"   Categories: {comp.get('categories', [])}")
                    
                    # This is exactly what market_data.py will send to frontend
                    dashboard_format = {
                        "competitor_name": comp.get('competitor_name'),
                        "strength_score": comp.get('strength_score'),
                        "weakness_score": comp.get('weakness_score'),
                        "customer_sentiment": comp.get('customer_sentiment'),
                        "market_share_estimate": comp.get('market_share_estimate'),
                        "location": comp.get('location'),
                        "rating": comp.get('rating'),
                        "review_count": comp.get('review_count')
                    }
                    print(f"   Dashboard format: {dashboard_format}")
            else:
                print("❌ No competitors in competitor_analysis list")
        else:
            print("❌ No competitor_analysis field found")

if __name__ == "__main__":
    asyncio.run(test_dashboard_format())