# test_reports_api.py
import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token

client = TestClient(app)

def test_reports_api():
    print("=" * 60)
    print("🔍 TESTING REPORTS API")
    print("=" * 60)
    
    # Create test token (you'll need a valid user ID)
    test_user_id = 1  # Change this to your actual user ID
    token = create_access_token({"sub": "test@example.com"})
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test getting reports
    print("\n📋 Getting reports...")
    response = client.get("/api/v1/reports/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        reports = response.json()
        print(f"Found {len(reports)} reports")
        if reports:
            print(f"First report: {reports[0].get('title')}")
    
    # Test getting report stats
    print("\n📊 Getting report stats...")
    response = client.get("/api/v1/reports/stats", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"Total reports: {stats.get('total_reports')}")
        print(f"PDF count: {stats.get('pdf_count')}")
        print(f"HTML count: {stats.get('html_count')}")
        print(f"JSON count: {stats.get('json_count')}")

if __name__ == "__main__":
    test_reports_api()