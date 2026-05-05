"""
Test configuration and fixtures.
"""
import asyncio
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database.connection import get_db
from models.database_models import Base
from core.config import settings

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False}
)

# Test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """
    Create event loop for tests.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """
    Create test database tables.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def test_session(test_db):
    """
    Create test database session.
    """
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="function")
def test_client(test_session):
    """
    Create test client with overridden dependencies.
    """
    def override_get_db():
        yield test_session
    
    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for tests."""
    return {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "TestPass123!",
        "company": "Test Company",
        "phone": "+1234567890"
    }


@pytest.fixture
def sample_analysis_request():
    """Sample analysis request data for tests."""
    return {
        "location": "New York, NY",
        "business_type": "restaurant",
        "analysis_type": "sentiment",
        "timeframe_days": 30,
        "include_sources": ["reviews", "news"],
        "competitors": ["Competitor A", "Competitor B"]
    }


@pytest.fixture
def auth_headers(test_client, sample_user_data):
    """Get authentication headers for tests."""
    # Register user
    response = test_client.post("/api/v1/auth/register", json=sample_user_data)
    assert response.status_code == 200
    
    # Get token
    login_data = {
        "username": sample_user_data["email"],
        "password": sample_user_data["password"]
    }
    response = test_client.post("/api/v1/auth/token", data=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}