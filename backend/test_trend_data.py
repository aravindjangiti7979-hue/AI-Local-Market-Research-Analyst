"""
Diagnostic test to check trend data and competitor counts in analysis results.
"""
import asyncio
import sys
import os
import json
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult, AnalysisRequest
from sqlalchemy import select, func, and_
from sqlalchemy.sql import text

async def test_competitor_counts():
    print("=" * 80)
    print("🔍 COMPETITOR COUNT DIAGNOSTIC TEST")
    print("=" * 80)
    
    async with AsyncSessionLocal() as db:
        # 1. Check analysis results in the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        results_query = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.created_at >= thirty_days_ago)
            .order_by(AnalysisResult.created_at)
        )
        results = results_query.scalars().all()
        
        print(f"\n📊 Found {len(results)} analysis results in the last 30 days")
        print("-" * 60)
        
        # 2. Examine each result's competitor data
        for i, result in enumerate(results):
            print(f"\n--- Result {i+1} (ID: {result.id}) ---")
            print(f"Created: {result.created_at}")
            
            # Check competitor_analysis field
            competitor_data = result.competitor_analysis or {}
            competitors_list = competitor_data.get('competitor_analysis', [])
            
            print(f"competitor_analysis type: {type(competitor_data)}")
            print(f"Number of competitors: {len(competitors_list)}")
            
            # Show first few competitor names if any
            if competitors_list:
                print(f"First 3 competitors:")
                for j, comp in enumerate(competitors_list[:3]):
                    name = comp.get('competitor_name', 'Unknown')
                    strength = comp.get('strength_score', 'N/A')
                    print(f"  {j+1}. {name} (strength: {strength})")
            else:
                print("⚠️ No competitors found in this result!")
                
                # Check if competitor_data has any other structure
                print(f"competitor_data keys: {list(competitor_data.keys())}")
                
                # Try to find competitors in other fields
                for key, value in competitor_data.items():
                    if isinstance(value, list) and len(value) > 0:
                        print(f"Found list in key '{key}' with {len(value)} items")
                        if value and isinstance(value[0], dict) and 'competitor_name' in value[0]:
                            print(f"✅ This looks like competitor data in '{key}' instead of 'competitor_analysis'!")
            
            # Check confidence score
            print(f"Confidence score: {result.confidence_score}")
        
        # 3. Check how many results have competitor data
        results_with_competitors = 0
        total_competitor_count = 0
        
        for result in results:
            competitor_data = result.competitor_analysis or {}
            competitors = competitor_data.get('competitor_analysis', [])
            if competitors:
                results_with_competitors += 1
                total_competitor_count += len(competitors)
        
        print("\n" + "=" * 60)
        print(f"SUMMARY:")
        print(f"Total results: {len(results)}")
        print(f"Results with competitors: {results_with_competitors}")
        print(f"Total competitors across all results: {total_competitor_count}")
        print(f"Average competitors per result: {total_competitor_count/len(results) if results else 0:.1f}")
        
        # 4. Check date grouping for trend data
        print("\n" + "=" * 60)
        print("DATE GROUPING FOR TREND DATA:")
        
        # Group by date
        date_groups = {}
        for result in results:
            date_key = result.created_at.strftime("%Y-%m-%d")
            if date_key not in date_groups:
                date_groups[date_key] = []
            date_groups[date_key].append(result)
        
        print(f"Found {len(date_groups)} unique dates with results")
        
        for date_key, day_results in sorted(date_groups.items()):
            total_day_competitors = 0
            for r in day_results:
                comp_data = r.competitor_analysis or {}
                total_day_competitors += len(comp_data.get('competitor_analysis', []))
            
            print(f"  {date_key}: {len(day_results)} results, {total_day_competitors} total competitors")
        
        # 5. Check raw JSON of competitor_analysis for a result that should have data
        print("\n" + "=" * 60)
        print("RAW JSON OF COMPETITOR_ANALYSIS (first result):")
        
        if results:
            result = results[0]
            competitor_data = result.competitor_analysis
            
            if competitor_data:
                print(json.dumps(competitor_data, indent=2)[:1000])  # First 1000 chars
            else:
                print("competitor_analysis is None or empty")

async def test_market_data_endpoint():
    """Test the actual API endpoint that serves trend data"""
    print("\n" + "=" * 80)
    print("TESTING MARKET DATA ENDPOINT")
    print("=" * 80)
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            # First login to get token
            login_response = await client.post(
                "http://localhost:8000/api/v1/auth/login",
                json={"email": "testapi@example.com", "password": "Test123!@#"}
            )
            
            if login_response.status_code != 200:
                print(f"❌ Login failed: {login_response.status_code}")
                return
            
            token = login_response.json().get("access_token")
            print(f"✅ Login successful, token obtained")
            
            # Get dashboard data
            dashboard_response = await client.get(
                "http://localhost:8000/api/v1/market-data/dashboard?time_range=30d",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if dashboard_response.status_code != 200:
                print(f"❌ Dashboard API failed: {dashboard_response.status_code}")
                return
            
            data = dashboard_response.json()
            
            # Check trend_data
            trend_data = data.get('trend_data', [])
            print(f"\n📈 Trend data from API: {len(trend_data)} points")
            
            for point in trend_data:
                print(f"  Date: {point.get('date')}")
                print(f"    competitors: {point.get('competitors')}")
                print(f"    growth_rate: {point.get('growth_rate')}")
                print(f"    market_share: {point.get('market_share')}")
            
            # Check top_competitors
            top_competitors = data.get('top_competitors', [])
            print(f"\n🏆 Top competitors from API: {len(top_competitors)}")
            for comp in top_competitors[:5]:
                print(f"  {comp.get('competitor_name')} - {comp.get('strength_score')}")
    
    except Exception as e:
        print(f"❌ Error testing API: {e}")

async def main():
    await test_competitor_counts()
    await test_market_data_endpoint()
    
    print("\n" + "=" * 80)
    print("✅ Test complete")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())