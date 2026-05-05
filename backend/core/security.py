"""
Security utilities for authentication and authorization.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
import logging
import bcrypt
import os
import hashlib
import secrets
import string
import re

from models.schemas import TokenData, UserInDB
from core.config import settings

logger = logging.getLogger(__name__)

# Security constants from config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# OAuth2 scheme for token endpoint
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    auto_error=False
)

# HTTP Bearer for general token validation
http_bearer = HTTPBearer(auto_error=False)


# Password hashing - using bcrypt directly
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password using bcrypt.
    """
    try:
        # Ensure password is encoded to bytes
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    """
    # Check password length (bcrypt limitation: max 72 bytes)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes
        password_bytes = password_bytes[:72]
        logger.warning("Password truncated to 72 bytes for bcrypt compatibility")
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode JWT token.
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def extract_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from request header.
    """
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return token
    except ValueError:
        return None


async def get_current_user(token: Optional[str], db) -> Optional[UserInDB]:
    """
    Get current user from JWT token.
    """
    if not token:
        return None
    
    try:
        payload = decode_token(token)
        if not payload:
            return None
        
        email = payload.get("sub")
        if not email:
            return None
        
        if db is None:
            return None
        
        # Import here to avoid circular import
        from database.queries import get_user_by_email
        user = await get_user_by_email(db, email=email)
        if user is None:
            return None
        
        return user
        
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None


def validate_api_key(api_key: str, expected_key: str) -> bool:
    """
    Validate an API key.
    """
    return api_key == expected_key


def sanitize_input(input_string: str) -> str:
    """
    Sanitize user input to prevent XSS attacks.
    """
    import html
    return html.escape(input_string)


def validate_location_input(location: str) -> bool:
    """
    Validate location input format.
    """
    # Basic validation - should contain city and state/country
    parts = location.split(",")
    if len(parts) < 2:
        return False
    
    # Check if it looks like a valid location format
    # e.g., "New York, NY" or "London, UK"
    if len(location) > 100:
        return False
    
    # Check for minimum length
    if len(location.strip()) < 3:
        return False
    
    return True


def rate_limit_key(user_id: int, endpoint: str) -> str:
    """
    Generate rate limit key for Redis.
    """
    return f"rate_limit:{user_id}:{endpoint}"


def generate_api_key(user_id: int, email: str) -> str:
    """
    Generate a secure API key for a user.
    """
    # Generate a random string
    alphabet = string.ascii_letters + string.digits
    random_part = ''.join(secrets.choice(alphabet) for _ in range(32))
    
    # Combine with user info and hash
    combined = f"{user_id}:{email}:{random_part}:{SECRET_KEY}"
    api_key = hashlib.sha256(combined.encode()).hexdigest()
    
    return f"marketai_{api_key[:40]}"


def validate_email_format(email: str) -> bool:
    """
    Validate email format.
    """
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_regex, email))


def validate_api_key_format(api_key: str) -> bool:
    """
    Validate API key format.
    """
    # Check if API key starts with marketai_ and is 48 characters
    return api_key.startswith("marketai_") and len(api_key) == 48