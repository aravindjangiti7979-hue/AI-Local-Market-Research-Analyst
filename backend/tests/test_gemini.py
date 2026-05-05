import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.gemini_service import gemini_service

async def test_gemini():
    print("=" * 60)
    print("🔍 TESTING GEMINI API")
    print("=" * 60)
    
    try:
        response = await gemini_service._generate_content(
            "Generate a one-sentence market insight for a restaurant in Chicago."
        )
        print(f"✅ Gemini API working!")
        print(f"   Response: {response[:100]}...")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())