import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def test_newsapi():
    print("=" * 60)
    print("🔍 TESTING NEWSAPI")
    print("=" * 60)
    
    api_key = os.getenv("NEWS_API_KEY")
    
    async with aiohttp.ClientSession() as session:
        params = {
            "q": "restaurant Chicago",
            "apiKey": api_key,
            "pageSize": 5,
            "language": "en"
        }
        
        async with session.get("https://newsapi.org/v2/everything", params=params) as response:
            print(f"Status: {response.status}")
            data = await response.json()
            
            if response.status == 200:
                articles = data.get("articles", [])
                print(f"✅ Found {len(articles)} articles")
                for i, article in enumerate(articles[:3], 1):
                    print(f"\n{i}. {article.get('title')}")
                    print(f"   Source: {article.get('source', {}).get('name')}")
            else:
                print(f"❌ Error: {data}")

if __name__ == "__main__":
    asyncio.run(test_newsapi())