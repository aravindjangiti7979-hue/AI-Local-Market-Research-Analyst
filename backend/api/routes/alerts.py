"""
Alerts routes for managing user notifications and monitoring.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from database.connection import get_db
from database.queries import (
    create_alert,
    get_user_alerts,
    get_alert,
    update_alert,
    toggle_alert,
    delete_alert
)
from models.schemas import (
    AlertCreate,
    AlertUpdate,
    AlertResponse,
    UserResponse
)
from api.dependencies import get_current_active_user_with_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    enabled_only: bool = False,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get all alerts for the current user.
    """
    alerts = await get_user_alerts(db, current_user.id, enabled_only)
    return alerts


@router.post("/", response_model=AlertResponse)
async def create_new_alert(
    alert_data: AlertCreate,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Create a new alert.
    """
    alert = await create_alert(db, current_user.id, alert_data)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert"
        )
    
    logger.info(f"Alert created: {alert.id} for user {current_user.id}")
    return alert


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert_by_id(
    alert_id: int,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get a specific alert by ID.
    """
    alert = await get_alert(db, alert_id, current_user.id)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert_by_id(
    alert_id: int,
    alert_data: AlertUpdate,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update an alert.
    """
    alert = await update_alert(db, alert_id, current_user.id, alert_data)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or update failed"
        )
    
    logger.info(f"Alert updated: {alert_id}")
    return alert


@router.patch("/{alert_id}/toggle")
async def toggle_alert_status(
    alert_id: int,
    enabled: bool,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Toggle alert enabled/disabled status.
    """
    success = await toggle_alert(db, alert_id, current_user.id, enabled)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return {
        "message": f"Alert {'enabled' if enabled else 'disabled'} successfully",
        "enabled": enabled
    }


@router.delete("/{alert_id}")
async def delete_alert_by_id(
    alert_id: int,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Delete an alert.
    """
    success = await delete_alert(db, alert_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    logger.info(f"Alert deleted: {alert_id}")
    return {"message": "Alert deleted successfully"}