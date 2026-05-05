import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal, test_connection
from sqlalchemy import text

async def test_database():
    print("=" * 60)
    print("🔍 TESTING DATABASE CONNECTION")
    print("=" * 60)
    
    # Test basic connection
    connected = await test_connection()
    if connected:
        print("✅ Database connection: SUCCESS")
    else:
        print("❌ Database connection: FAILED")
        return
    
    # List tables
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = result.fetchall()
        
        table_names = [t[0] for t in tables]
        print(f"\n📋 Tables found: {', '.join(table_names)}")
        
        # Check for required tables
        required = ['users', 'analysis_requests', 'analysis_results', 'reports']
        missing = [t for t in required if t not in table_names]
        
        if not missing:
            print("✅ All required tables present")
        else:
            print(f"❌ Missing tables: {missing}")

if __name__ == "__main__":
    asyncio.run(test_database())