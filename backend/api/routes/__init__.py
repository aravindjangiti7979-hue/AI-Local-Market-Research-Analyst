"""
API routes package.
"""

# Import all routers
from .auth import router as auth_router
from .analysis import router as analysis_router
from .reports import router as reports_router
from .market_data import router as market_data_router

# List all routers for easy import
__all__ = [
    "auth_router",
    "analysis_router",
    "reports_router",
    "market_data_router"
]

# Optional: Create a function to register all routers
def register_routes(app):
    """
    Register all API routes with the FastAPI app.
    """
    from fastapi import FastAPI
    
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(analysis_router, prefix="/api/v1/analysis", tags=["analysis"])
    app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])
    app.include_router(market_data_router, prefix="/api/v1/market-data", tags=["market-data"])
    
    return app