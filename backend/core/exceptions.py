"""
Custom exceptions and exception handlers.
"""
from typing import Any, Dict
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


class MarketResearchException(Exception):
    """Base exception for market research errors."""
    
    def __init__(self, message: str, code: str = "MARKET_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class APIConnectionError(MarketResearchException):
    """Raised when external API connection fails."""
    
    def __init__(self, message: str, api_name: str = "external"):
        super().__init__(message, code=f"{api_name.upper()}_CONNECTION_ERROR")
        self.api_name = api_name


class DataProcessingError(MarketResearchException):
    """Raised when data processing fails."""
    
    def __init__(self, message: str):
        super().__init__(message, code="DATA_PROCESSING_ERROR")


class AnalysisError(MarketResearchException):
    """Raised when analysis fails."""
    
    def __init__(self, message: str):
        super().__init__(message, code="ANALYSIS_ERROR")


class RateLimitExceeded(MarketResearchException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, code="RATE_LIMIT_EXCEEDED")


class InsufficientDataError(MarketResearchException):
    """Raised when insufficient data is available for analysis."""
    
    def __init__(self, message: str = "Insufficient data for analysis"):
        super().__init__(message, code="INSUFFICIENT_DATA")


async def market_research_exception_handler(
    request: Request, exc: MarketResearchException
) -> JSONResponse:
    """
    Handle MarketResearchException.
    """
    logger.error(f"Market research error: {exc.message}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "type": "market_research_error"
            }
        }
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle request validation errors.
    """
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"Validation error: {errors}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "details": errors,
                "type": "validation_error"
            }
        }
    )


async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Handle general exceptions.
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "type": "server_error"
            }
        }
    )


async def rate_limit_exception_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """
    Handle rate limit exceptions.
    """
    logger.warning(f"Rate limit exceeded for {request.client.host}")
    
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "type": "rate_limit_error"
            }
        },
        headers={"Retry-After": "60"}
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Setup exception handlers for the application.
    """
    app.add_exception_handler(MarketResearchException, market_research_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)