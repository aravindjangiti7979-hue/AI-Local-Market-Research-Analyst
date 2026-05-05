# test_reports_with_auth.py
import asyncio
import httpx
import json

async def test_reports_with_auth():
    print("=" * 60)
    print("🔍 TESTING REPORTS API WITH AUTHENTICATION")
    print("=" * 60)
    
    # First, login to get token
    async with httpx.AsyncClient() as client:
        login_response = await client.post(
            "http://localhost:8000/api/v1/auth/login",
            json={
                "email": "testapi@example.com",  # Use your test user email
                "password": "Test123!@#"
            }
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("✅ Login successful")
        
        # Get reports
        reports_response = await client.get(
            "http://localhost:8000/api/v1/reports",
            headers=headers
        )
        
        if reports_response.status_code == 200:
            reports = reports_response.json()
            print(f"\n📋 Found {len(reports)} reports:")
            for report in reports[:5]:
                print(f"  • {report.get('title')} ({report.get('format')})")
        else:
            print(f"❌ Failed to get reports: {reports_response.status_code}")
        
        # Get report stats
        stats_response = await client.get(
            "http://localhost:8000/api/v1/reports/stats",
            headers=headers
        )
        
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print(f"\n📊 Report Stats:")
            print(f"  Total Reports: {stats.get('total_reports')}")
            print(f"  PDF: {stats.get('pdf_count')}")
            print(f"  HTML: {stats.get('html_count')}")
            print(f"  JSON: {stats.get('json_count')}")
        else:
            print(f"❌ Failed to get stats: {stats_response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_reports_with_auth())