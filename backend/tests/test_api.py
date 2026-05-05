"""
Tests for API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
import json


def test_root_endpoint(test_client):
    """Test root endpoint."""
    response = test_client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "AI Local Market Research Analyst" in response.json()["message"]


def test_health_check(test_client):
    """Test health check endpoint."""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_user(test_client, sample_user_data):
    """Test user registration."""
    response = test_client.post("/api/v1/auth/register", json=sample_user_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["email"] == sample_user_data["email"]
    assert data["user"]["full_name"] == sample_user_data["full_name"]


def test_register_duplicate_user(test_client, sample_user_data):
    """Test duplicate user registration."""
    # First registration
    test_client.post("/api/v1/auth/register", json=sample_user_data)
    
    # Second registration with same email
    response = test_client.post("/api/v1/auth/register", json=sample_user_data)
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_user(test_client, sample_user_data):
    """Test user login."""
    # Register first
    test_client.post("/api/v1/auth/register", json=sample_user_data)
    
    # Login
    login_data = {
        "username": sample_user_data["email"],
        "password": sample_user_data["password"]
    }
    response = test_client.post("/api/v1/auth/token", data=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data


def test_login_invalid_credentials(test_client, sample_user_data):
    """Test login with invalid credentials."""
    # Register first
    test_client.post("/api/v1/auth/register", json=sample_user_data)
    
    # Login with wrong password
    login_data = {
        "username": sample_user_data["email"],
        "password": "WrongPassword123!"
    }
    response = test_client.post("/api/v1/auth/token", data=login_data)
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_get_current_user(test_client, auth_headers):
    """Test getting current user info."""
    response = test_client.get("/api/v1/auth/me", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "full_name" in data
    assert "company" in data


def test_get_current_user_unauthorized(test_client):
    """Test getting current user without authentication."""
    response = test_client.get("/api/v1/auth/me")
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_run_analysis(test_client, auth_headers, sample_analysis_request):
    """Test starting a new analysis."""
    response = test_client.post(
        "/api/v1/analysis/run",
        json=sample_analysis_request,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "request_id" in data
    assert "message" in data
    assert data["status"] == "pending"


def test_run_analysis_invalid_location(test_client, auth_headers):
    """Test analysis with invalid location."""
    invalid_request = {
        "location": "Invalid",  # Missing comma
        "business_type": "restaurant",
        "analysis_type": "sentiment",
        "timeframe_days": 30,
        "include_sources": ["reviews"]
    }
    
    response = test_client.post(
        "/api/v1/analysis/run",
        json=invalid_request,
        headers=auth_headers
    )
    
    assert response.status_code == 422  # Validation error


def test_get_analysis_history_empty(test_client, auth_headers):
    """Test getting empty analysis history."""
    response = test_client.get(
        "/api/v1/analysis/history",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert response.json() == []  # Empty list


def test_get_analysis_status_not_found(test_client, auth_headers):
    """Test getting status of non-existent analysis."""
    response = test_client.get(
        "/api/v1/analysis/nonexistent/status",
        headers=auth_headers
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_generate_report_no_analysis(test_client, auth_headers):
    """Test generating report without analysis."""
    report_request = {
        "analysis_id": "nonexistent",
        "format": "html"
    }
    
    response = test_client.post(
        "/api/v1/reports/generate",
        json=report_request,
        headers=auth_headers
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_data_sources(test_client, auth_headers):
    """Test getting data sources."""
    response = test_client.get(
        "/api/v1/market-data/sources",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert "total_active" in data
    assert "total_inactive" in data


def test_get_api_usage(test_client, auth_headers):
    """Test getting API usage statistics."""
    response = test_client.get(
        "/api/v1/market-data/api-usage",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "requests_today" in data
    assert "plan_limit" in data
    assert "remaining_requests" in data


def test_logout(test_client, auth_headers):
    """Test user logout."""
    response = test_client.post(
        "/api/v1/auth/logout",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert "successfully" in response.json()["message"].lower()


def test_update_profile(test_client, auth_headers):
    """Test updating user profile."""
    update_data = {
        "full_name": "Updated Name",
        "company": "Updated Company",
        "phone": "+1987654321"
    }
    
    response = test_client.put(
        "/api/v1/auth/profile",
        json=update_data,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["company"] == "Updated Company"
    assert data["phone"] == "+1987654321"


def test_collect_market_data(test_client, auth_headers):
    """Test starting market data collection."""
    collection_request = {
        "location": "New York, NY",
        "business_type": "restaurant",
        "data_sources": ["businesses", "reviews"],
        "max_results_per_source": 10,
        "timeframe_days": 30
    }
    
    response = test_client.post(
        "/api/v1/market-data/collect",
        json=collection_request,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "collection_id" in data
    assert data["location"] == "New York, NY"
    assert data["business_type"] == "restaurant"


def test_validation_error_handling(test_client, auth_headers):
    """Test validation error handling."""
    invalid_request = {
        "location": "",  # Empty location
        "business_type": "invalid_type",  # Invalid business type
        "analysis_type": "invalid_analysis",  # Invalid analysis type
        "timeframe_days": 1000,  # Too large
        "include_sources": []
    }
    
    response = test_client.post(
        "/api/v1/analysis/run",
        json=invalid_request,
        headers=auth_headers
    )
    
    assert response.status_code == 422  # Validation error
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]


def test_rate_limiting(test_client, auth_headers):
    """Test rate limiting (simplified)."""
    # Make multiple requests quickly
    for _ in range(5):
        response = test_client.get(
            "/api/v1/analysis/history",
            headers=auth_headers
        )
    
    # Note: Actual rate limiting would return 429 after exceeding limits
    # This test just ensures the endpoint still works for a few requests
    assert response.status_code == 200


def test_cors_headers(test_client):
    """Test CORS headers are present."""
    response = test_client.options("/")
    
    # Check for CORS headers
    assert "access-control-allow-origin" in response.headers
    assert "access-control-allow-methods" in response.headers
    assert "access-control-allow-headers" in response.headers


def test_swagger_documentation(test_client):
    """Test Swagger documentation is available."""
    response = test_client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_redoc_documentation(test_client):
    """Test ReDoc documentation is available."""
    response = test_client.get("/redoc")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]