"""
Integration tests for reports with real API calls.
Run with: pytest backend/tests/test_reports_integration.py -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
import asyncio
import json

from main import app


@pytest.mark.asyncio
async def test_full_report_workflow():
    """
    Test complete report workflow:
    1. Create analysis
    2. Wait for completion
    3. Generate report
    4. Download report in multiple formats
    5. Get report stats
    6. Delete report
    """
    # Step 1: Login to get token
    async with AsyncClient(app=app, base_url="http://test") as ac:
        login_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "testpass123"}
        )
    
    # If login fails, create user first
    if login_response.status_code != 200:
        async with AsyncClient(app=app, base_url="http://test") as ac:
            await ac.post(
                "/api/v1/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "testpass123",
                    "full_name": "Test User"
                }
            )
        
        # Login again
        async with AsyncClient(app=app, base_url="http://test") as ac:
            login_response = await ac.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "testpass123"}
            )
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Create analysis
    async with AsyncClient(app=app, base_url="http://test") as ac:
        analysis_response = await ac.post(
            "/api/v1/analysis",
            headers=headers,
            json={
                "location": "Chicago, IL",
                "business_type": "restaurant",
                "analysis_type": "comprehensive",
                "timeframe_days": 30
            }
        )
    
    assert analysis_response.status_code == 200
    analysis_data = analysis_response.json()
    request_id = analysis_data["request_id"]
    
    # Step 3: Wait for analysis completion (polling)
    max_attempts = 30
    for attempt in range(max_attempts):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            status_response = await ac.get(
                f"/api/v1/analysis/{request_id}/status",
                headers=headers
            )
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            if status_data["status"] == "completed":
                break
        
        await asyncio.sleep(2)  # Wait 2 seconds between polls
    
    # Step 4: Generate report
    async with AsyncClient(app=app, base_url="http://test") as ac:
        report_response = await ac.post(
            f"/api/v1/reports/generate/{request_id}",
            headers=headers
        )
    
    assert report_response.status_code == 200
    report_data = report_response.json()
    report_id = report_data["report_id"]
    
    # Wait for report generation
    await asyncio.sleep(3)
    
    # Step 5: Get report details
    async with AsyncClient(app=app, base_url="http://test") as ac:
        details_response = await ac.get(
            f"/api/v1/reports/{report_id}",
            headers=headers
        )
    
    assert details_response.status_code == 200
    details = details_response.json()
    assert details["id"] == report_id
    assert "content" in details
    
    # Step 6: Download report as JSON
    async with AsyncClient(app=app, base_url="http://test") as ac:
        download_response = await ac.get(
            f"/api/v1/reports/{report_id}/download?format=json",
            headers=headers
        )
    
    assert download_response.status_code == 200
    assert "attachment" in download_response.headers["content-disposition"]
    
    # Step 7: Download report as CSV
    async with AsyncClient(app=app, base_url="http://test") as ac:
        download_response = await ac.get(
            f"/api/v1/reports/{report_id}/download?format=csv",
            headers=headers
        )
    
    assert download_response.status_code == 200
    assert "attachment" in download_response.headers["content-disposition"]
    
    # Step 8: Get report stats
    async with AsyncClient(app=app, base_url="http://test") as ac:
        stats_response = await ac.get(
            "/api/v1/reports/stats",
            headers=headers
        )
    
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_reports"] >= 1
    
    # Step 9: Get all reports
    async with AsyncClient(app=app, base_url="http://test") as ac:
        reports_response = await ac.get(
            "/api/v1/reports/",
            headers=headers
        )
    
    assert reports_response.status_code == 200
    reports = reports_response.json()
    assert len(reports) >= 1
    
    # Step 10: Delete report
    async with AsyncClient(app=app, base_url="http://test") as ac:
        delete_response = await ac.delete(
            f"/api/v1/reports/{report_id}",
            headers=headers
        )
    
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Report deleted successfully"
    
    # Verify deletion
    async with AsyncClient(app=app, base_url="http://test") as ac:
        verify_response = await ac.get(
            f"/api/v1/reports/{report_id}",
            headers=headers
        )
    
    assert verify_response.status_code == 404


@pytest.mark.asyncio
async def test_reports_filtering_and_search():
    """Test reports filtering and search functionality."""
    # Login
    async with AsyncClient(app=app, base_url="http/test") as ac:
        login_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "testpass123"}
        )
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test format filter
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/reports/?format=json",
            headers=headers
        )
    
    assert response.status_code == 200
    reports = response.json()
    for report in reports:
        assert report["format"] == "json"
    
    # Test search
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/reports/?search=Market",
            headers=headers
        )
    
    assert response.status_code == 200
    
    # Test sorting
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/reports/?sort_by=title&sort_order=asc",
            headers=headers
        )
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_concurrent_report_generation():
    """Test generating multiple reports concurrently."""
    # Login
    async with AsyncClient(app=app, base_url="http://test") as ac:
        login_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "testpass123"}
        )
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create multiple analyses
    request_ids = []
    locations = ["Chicago, IL", "New York, NY", "Los Angeles, CA"]
    
    for location in locations:
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/analysis",
                headers=headers,
                json={
                    "location": location,
                    "business_type": "restaurant",
                    "analysis_type": "comprehensive"
                }
            )
        
        assert response.status_code == 200
        request_ids.append(response.json()["request_id"])
    
    # Wait for analyses to complete
    await asyncio.sleep(10)
    
    # Generate reports concurrently
    report_tasks = []
    for request_id in request_ids:
        report_tasks.append(
            ac.post(
                f"/api/v1/reports/generate/{request_id}",
                headers=headers
            )
        )
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        responses = await asyncio.gather(*[task for task in report_tasks])
    
    for response in responses:
        assert response.status_code == 200
    
    # Verify reports were created
    async with AsyncClient(app=app, base_url="http/test") as ac:
        stats_response = await ac.get("/api/v1/reports/stats", headers=headers)
    
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_reports"] >= len(request_ids)