"""
API Key management router.
Provides endpoints for creating, listing, and managing API keys.
"""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.models import User
from src.api.auth import get_current_active_user, require_admin
from src.api.api_keys import (
    APIKeyManager, APIKeyCreate, APIKeyResponse, APIKeyCreateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create API key",
    description="Create a new API key for the current user"
)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> APIKeyCreateResponse:
    """Create a new API key for the current user."""
    try:
        api_key, full_key = await APIKeyManager.create_api_key(
            db=db,
            user_id=current_user.id,
            name=key_data.name,
            description=key_data.description,
            expires_days=key_data.expires_days,
            rate_limit_per_hour=key_data.rate_limit_per_hour,
            scopes=key_data.scopes
        )
        
        return APIKeyCreateResponse(
            api_key=full_key,
            key_info=APIKeyResponse.from_orm(api_key)
        )
        
    except Exception as e:
        logger.error(f"Failed to create API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )

@router.get(
    "/",
    response_model=List[APIKeyResponse],
    summary="List API keys",
    description="List all API keys for the current user"
)
async def list_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> List[APIKeyResponse]:
    """List all API keys for the current user."""
    try:
        api_keys = await APIKeyManager.list_user_api_keys(db, current_user.id)
        return [APIKeyResponse.from_orm(key) for key in api_keys]
        
    except Exception as e:
        logger.error(f"Failed to list API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API keys"
        )

@router.put(
    "/{key_id}/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke API key",
    description="Revoke (deactivate) an API key"
)
async def revoke_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Revoke (deactivate) an API key."""
    try:
        success = await APIKeyManager.revoke_api_key(db, key_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return {"message": "API key revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key"
        )

@router.delete(
    "/{key_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete API key",
    description="Permanently delete an API key"
)
async def delete_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Permanently delete an API key."""
    try:
        success = await APIKeyManager.delete_api_key(db, key_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return {"message": "API key deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )

# Admin endpoints for API key management

@router.get(
    "/admin/all",
    response_model=List[APIKeyResponse],
    summary="List all API keys (Admin only)",
    description="List all API keys in the system - requires admin role"
)
async def list_all_api_keys(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> List[APIKeyResponse]:
    """List all API keys in the system (admin only)."""
    try:
        from sqlalchemy import select
        from src.api.api_keys import APIKey
        
        result = await db.execute(
            select(APIKey)
            .offset(skip)
            .limit(limit)
            .order_by(APIKey.created_at.desc())
        )
        api_keys = result.scalars().all()
        
        return [APIKeyResponse.from_orm(key) for key in api_keys]
        
    except Exception as e:
        logger.error(f"Failed to list all API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API keys"
        )

@router.put(
    "/admin/{key_id}/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke any API key (Admin only)",
    description="Revoke any API key in the system - requires admin role"
)
async def admin_revoke_api_key(
    key_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Revoke any API key in the system (admin only)."""
    try:
        from sqlalchemy import update
        from src.api.api_keys import APIKey
        from datetime import datetime
        
        result = await db.execute(
            update(APIKey)
            .where(APIKey.id == key_id)
            .values(is_active=False, updated_at=datetime.utcnow())
        )
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return {"message": "API key revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke API key: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key"
        )