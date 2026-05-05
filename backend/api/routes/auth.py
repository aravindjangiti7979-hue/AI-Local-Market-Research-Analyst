"""
Authentication routes.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
import logging
from pydantic import BaseModel

from database.connection import get_db
from database.queries import get_user_by_email, create_user, update_user_last_login, get_user_by_id
from core.security import (
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    extract_token_from_request,
    decode_token,
    get_password_hash
)
from models.schemas import UserCreate, UserLogin, UserResponse, Token
from api.dependencies import get_current_active_user_with_db, get_current_user_simple
from models.database_models import User

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for profile and password updates
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    """
    # Check if user already exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = await create_user(db, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Convert to UserResponse
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company=user.company,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login.
    """
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    await update_user_last_login(db, user.id)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.
    """
    user = await get_user_by_email(db, user_data.email)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    await update_user_last_login(db, user.id)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user = Depends(get_current_active_user_with_db)
):
    """
    Get current user information.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        company=current_user.company,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user profile information.
    """
    # Update only provided fields
    update_data = {}
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    if profile_data.company is not None:
        update_data["company"] = profile_data.company
    if profile_data.phone is not None:
        update_data["phone"] = profile_data.phone
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        stmt = update(User).where(User.id == current_user.id).values(**update_data)
        await db.execute(stmt)
        await db.commit()
        
        # Get updated user
        updated_user = await get_user_by_id(db, current_user.id)
        
        logger.info(f"Profile updated for user {current_user.id}")
        
        return UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            full_name=updated_user.full_name,
            company=updated_user.company,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at
        )
    
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordUpdate,
    current_user = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user password.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_hashed_password = get_password_hash(password_data.new_password)
    
    # Update password in database
    stmt = update(User).where(User.id == current_user.id).values(
        hashed_password=new_hashed_password,
        updated_at=datetime.utcnow()
    )
    await db.execute(stmt)
    await db.commit()
    
    logger.info(f"Password changed for user {current_user.id}")
    
    return {"message": "Password updated successfully"}


@router.post("/logout")
async def logout():
    """
    Logout user (client should discard token).
    """
    return {"message": "Successfully logged out"}


@router.get("/verify-token")
async def verify_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify if token is valid.
    """
    token = await extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return {
        "valid": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    }


@router.post("/refresh-token")
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token.
    """
    token = await extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )