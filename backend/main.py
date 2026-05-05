"""
Main FastAPI application.
"""
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging - CONSOLE ONLY (no file to avoid reloads)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Only console, no file handler
    ]
)
logger = logging.getLogger(__name__)

# Import database connection
from database.connection import get_db, init_db, close_db, test_connection

# Import settings
from core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting up...")
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        # Continue anyway - database might be initialized already
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    description="AI Local Market Research Analyst API",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Add GZip middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)

# Import routers AFTER app creation
from api.routes import auth, analysis, reports, market_data, alerts

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(market_data.router, prefix="/api/v1/market-data", tags=["market-data"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["alerts"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.APP_VERSION
    }


# Database connection test endpoint
@app.get("/db-test")
async def database_test():
    """
    Test database connection.
    """
    is_connected = await test_connection()
    if is_connected:
        return {"status": "connected", "database": "postgresql"}
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False, 
        reload_excludes=[
            "venv/*",
            "*.pyc",
            ".git/*",
            ".env",
            "data/*",
            "__pycache__/*"
        ],
        log_level="info"
    )