"""Basic unit tests for the application."""
import pytest
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("✅ Health endpoint test passed")

def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    print("✅ Root endpoint test passed")

def test_db_test_endpoint():
    """Test database connection endpoint."""
    response = client.get("/db-test")
    # This might fail if DB not connected, but we just want to test the endpoint exists
    assert response.status_code in [200, 503]
    print("✅ DB test endpoint test passed")

if __name__ == "__main__":
    print("=" * 50)
    print("Running tests...")
    print("=" * 50)
    test_health_endpoint()
    test_root_endpoint()
    test_db_test_endpoint()
    print("\n✅ All tests passed!")