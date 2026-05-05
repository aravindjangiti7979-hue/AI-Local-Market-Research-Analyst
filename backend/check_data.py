"""
Script to check what data is actually in the database.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import os
from dotenv import load_dotenv

load_dotenv()

from models.database_models import AnalysisRequest, AnalysisResult, User

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/market_analysis")

async def check_data():
    """Check what data exists in the database."""
    
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("=" * 60)
        print("DATABASE DATA CHECK")
        print("=" * 60)
        
        # Check users
        users_result = await session.execute(select(User))
        users = users_result.scalars().all()
        print(f"\n📊 Users: {len(users)}")
        for user in users:
            print(f"   - {user.id}: {user.email}")
        
        # Check analysis requests
        requests_result = await session.execute(select(AnalysisRequest))
        requests = requests_result.scalars().all()
        print(f"\n📊 Analysis Requests: {len(requests)}")
        for req in requests[:5]:  # Show first 5
            print(f"   - {req.id}: {req.location} ({req.business_type}) - {req.status}")
        
        # Check analysis results
        results_result = await session.execute(select(AnalysisResult))
        results = results_result.scalars().all()
        print(f"\n📊 Analysis Results: {len(results)}")
        for res in results[:5]:  # Show first 5
            print(f"   - {res.id}: Request {res.analysis_request_id}")
            print(f"     Confidence: {res.confidence_score}")
            
            # Show sample of competitor data
            if res.competitor_analysis:
                comp_data = res.competitor_analysis
                if isinstance(comp_data, dict):
                    if comp_data.get('competitor_analysis'):
                        print(f"     Competitors: {len(comp_data.get('competitor_analysis', []))}")
                    elif comp_data.get('key_competitors'):
                        print(f"     Key competitors: {len(comp_data.get('key_competitors', []))}")
        
        print("\n" + "=" * 60)
        print("CHECK COMPLETE")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(check_data())