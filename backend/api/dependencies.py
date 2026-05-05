"""
Dependencies for API endpoints.
"""
from typing import Optional, Generator
from fastapi import Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from database.connection import get_db
from core.security import (
    rate_limit_key,
    extract_token_from_request,
    decode_token
)
from core.config import settings
from models.schemas import UserInDB

# Redis connection pool
redis_pool = None


async def get_redis() -> redis.Redis:
    """
    Get Redis connection.
    """
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=20,
            decode_responses=True
        )
    
    return redis.Redis(connection_pool=redis_pool)


async def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from request header.
    """
    return await extract_token_from_request(request)


# Create a wrapper dependency that combines get_current_user with get_db
async def get_current_user_with_db(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[UserInDB]:
    """
    Get current user with database dependency.
    """
    token = await get_token_from_request(request)
    if not token:
        return None
    
    try:
        # Decode token to get email
        payload = decode_token(token)
        if not payload:
            return None
        
        email = payload.get("sub")
        if not email:
            return None
        
        # Import here to avoid circular import
        from database.queries import get_user_by_email
        user = await get_user_by_email(db, email=email)
        return user
        
    except Exception as e:
        return None


async def get_current_active_user_with_db(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> UserInDB:
    """
    Get current active user with database dependency.
    """
    token = await get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Import here to avoid circular import
    from core.security import get_current_user
    user = await get_current_user(token, db)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


async def get_current_user_simple(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Simple current user dependency that doesn't throw errors.
    """
    token = await get_token_from_request(request)
    if not token:
        return None
    
    from core.security import get_current_user
    user = await get_current_user(token, db)
    return user


async def rate_limit(
    user: UserInDB = Depends(get_current_active_user_with_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> None:
    """
    Rate limiting dependency.
    """
    if not settings.DEBUG:
        endpoint = "api_request"
        key = rate_limit_key(user.id, endpoint)
        
        # Check rate limit
        current = await redis_client.get(key)
        if current and int(current) >= settings.RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Increment counter
        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)  # 1 minute TTL
        await pipe.execute()


async def get_pagination_params(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return")
) -> dict:
    """
    Get pagination parameters.
    """
    return {"skip": skip, "limit": limit}


async def get_location_filter(
    location: Optional[str] = Query(None, description="Filter by location"),
    city: Optional[str] = Query(None, description="Filter by city"),
    region: Optional[str] = Query(None, description="Filter by region")
) -> dict:
    """
    Get location filter parameters.
    """
    return {
        "location": location,
        "city": city,
        "region": region
    }


async def get_time_filter(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    timeframe_days: Optional[int] = Query(None, ge=1, le=365, description="Timeframe in days")
) -> dict:
    """
    Get time filter parameters.
    """
    return {
        "start_date": start_date,
        "end_date": end_date,
        "timeframe_days": timeframe_days
    }


async def get_business_filter(
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    min_rating: Optional[float] = Query(None, ge=1, le=5, description="Minimum rating"),
    max_price: Optional[int] = Query(None, ge=1, le=4, description="Maximum price level")
) -> dict:
    """
    Get business filter parameters.
    """
    return {
        "business_type": business_type,
        "min_rating": min_rating,
        "max_price": max_price
    }


async def verify_admin(
    current_user: UserInDB = Depends(get_current_active_user_with_db)
) -> UserInDB:
    """
    Verify user is admin.
    
    Note: In a real application, you would have proper role-based access control.
    This is a simplified implementation.
    """
    # For now, check if user is the first user (id=1) or email contains admin
    # In production, you would have a proper is_admin field in the database
    if current_user.id != 1 and "admin" not in current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


async def validate_api_key(
    api_key: Optional[str] = Query(None, description="API key for external access"),
    current_user: Optional[UserInDB] = Depends(get_current_user_simple)
) -> UserInDB:
    """
    Validate API key or user authentication.
    
    Allows both authenticated users and API key access.
    """
    if current_user:
        return current_user
    
    if api_key:
        # Validate API key
        from core.security import validate_api_key_format
        if validate_api_key_format(api_key):
            # Create minimal user object for API key access
            class APIUser:
                id = 0  # System user ID
                email = "api@system"
                full_name = "API User"
                company = "External System"
                is_active = True
                
            return APIUser()
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid API key or authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optimized_db(
    read_only: bool = False
) -> Generator[AsyncSession, None, None]:
    """
    Get database session optimized for read or write operations.
    """
    from database.connection import AsyncSessionLocal
    
    session = None
    try:
        session = AsyncSessionLocal()
        
        if read_only:
            # Configure session for read operations
            await session.execute("SET TRANSACTION READ ONLY")
        
        yield session
        await session.commit()
    except Exception as e:
        if session:
            await session.rollback()
        raise e
    finally:
        if session:
            await session.close()