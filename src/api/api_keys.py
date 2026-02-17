"""
API Key management system for AQI Predictor API.
Provides alternative authentication method using API keys.
"""

import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from fastapi import HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.api.database import Base, get_db
from src.api.models import User, TimestampMixin
from src.api.auth import get_user_by_id

logger = logging.getLogger(__name__)

class APIKey(Base, TimestampMixin):
    """API Key model for alternative authentication."""
    __tablename__ = "api_keys"
    
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    key_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)  # First 8 chars for identification
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Usage tracking
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Permissions and limits
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rate_limit_per_hour: Mapped[Optional[int]] = mapped_column(Integer)  # Override default rate limit
    
    # Allowed scopes/permissions
    scopes: Mapped[Optional[List[str]]] = mapped_column(Text)  # JSON array as string
    
    # Relationships
    user: Mapped["User"] = relationship("User")

class APIKeyManager:
    """Manager for API key operations."""
    
    @staticmethod
    def generate_api_key() -> tuple[str, str, str]:
        """
        Generate a new API key.
        Returns: (full_key, key_hash, key_prefix)
        """
        # Generate random key
        key_bytes = secrets.token_bytes(32)
        key_b64 = secrets.token_urlsafe(32)
        full_key = f"aqi_{key_b64}"
        
        # Create hash for storage
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        key_hash = pwd_context.hash(full_key)
        
        # Create prefix for identification
        key_prefix = full_key[:12]  # "aqi_" + first 8 chars
        
        return full_key, key_hash, key_prefix
    
    @staticmethod
    def verify_api_key(key: str, key_hash: str) -> bool:
        """Verify API key against stored hash."""
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(key, key_hash)
    
    @staticmethod
    async def create_api_key(
        db: AsyncSession,
        user_id: UUID,
        name: str,
        description: Optional[str] = None,
        expires_days: Optional[int] = None,
        rate_limit_per_hour: Optional[int] = None,
        scopes: Optional[List[str]] = None
    ) -> tuple[APIKey, str]:
        """Create a new API key for a user."""
        try:
            # Generate key
            full_key, key_hash, key_prefix = APIKeyManager.generate_api_key()
            
            # Set expiration
            expires_at = None
            if expires_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_days)
            
            # Create API key record
            api_key = APIKey(
                user_id=user_id,
                key_hash=key_hash,
                key_prefix=key_prefix,
                name=name,
                description=description,
                expires_at=expires_at,
                rate_limit_per_hour=rate_limit_per_hour,
                scopes=",".join(scopes) if scopes else None
            )
            
            db.add(api_key)
            await db.commit()
            await db.refresh(api_key)
            
            logger.info(f"API key created for user {user_id}: {key_prefix}...")
            return api_key, full_key
            
        except Exception as e:
            logger.error(f"Failed to create API key: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def validate_api_key(db: AsyncSession, key: str) -> Optional[tuple[User, APIKey]]:
        """Validate API key and return associated user and key info."""
        try:
            if not key.startswith("aqi_"):
                return None
            
            key_prefix = key[:12]
            
            # Find API key by prefix
            result = await db.execute(
                select(APIKey).where(
                    APIKey.key_prefix == key_prefix,
                    APIKey.is_active == True
                )
            )
            api_key = result.scalar_one_or_none()
            
            if not api_key:
                return None
            
            # Check expiration
            if api_key.expires_at and api_key.expires_at < datetime.utcnow():
                return None
            
            # Verify key hash
            if not APIKeyManager.verify_api_key(key, api_key.key_hash):
                return None
            
            # Get user
            user = await get_user_by_id(db, api_key.user_id)
            if not user or not user.is_active:
                return None
            
            # Update usage tracking
            api_key.last_used_at = datetime.utcnow()
            api_key.usage_count += 1
            await db.commit()
            
            return user, api_key
            
        except Exception as e:
            logger.error(f"API key validation error: {e}")
            return None
    
    @staticmethod
    async def list_user_api_keys(db: AsyncSession, user_id: UUID) -> List[APIKey]:
        """List all API keys for a user."""
        try:
            result = await db.execute(
                select(APIKey)
                .where(APIKey.user_id == user_id)
                .order_by(APIKey.created_at.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Failed to list API keys: {e}")
            return []
    
    @staticmethod
    async def revoke_api_key(db: AsyncSession, key_id: UUID, user_id: UUID) -> bool:
        """Revoke (deactivate) an API key."""
        try:
            result = await db.execute(
                update(APIKey)
                .where(APIKey.id == key_id, APIKey.user_id == user_id)
                .values(is_active=False, updated_at=datetime.utcnow())
            )
            await db.commit()
            return result.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to revoke API key: {e}")
            await db.rollback()
            return False
    
    @staticmethod
    async def delete_api_key(db: AsyncSession, key_id: UUID, user_id: UUID) -> bool:
        """Permanently delete an API key."""
        try:
            result = await db.execute(
                delete(APIKey)
                .where(APIKey.id == key_id, APIKey.user_id == user_id)
            )
            await db.commit()
            return result.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to delete API key: {e}")
            await db.rollback()
            return False

# FastAPI dependencies for API key authentication

async def get_api_key_from_header(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """Extract API key from headers."""
    # Try X-API-Key header first
    if x_api_key:
        return x_api_key
    
    # Try Authorization header with "ApiKey" scheme
    if authorization and authorization.startswith("ApiKey "):
        return authorization.split(" ", 1)[1]
    
    return None

async def get_current_user_from_api_key(
    api_key: Optional[str] = Depends(get_api_key_from_header),
    db: AsyncSession = Depends(get_db)
) -> Optional[tuple[User, APIKey]]:
    """Get current user from API key."""
    if not api_key:
        return None
    
    return await APIKeyManager.validate_api_key(db, api_key)

async def require_api_key(
    user_and_key: Optional[tuple[User, APIKey]] = Depends(get_current_user_from_api_key)
) -> tuple[User, APIKey]:
    """Require valid API key authentication."""
    if not user_and_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid API key required",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return user_and_key

# Pydantic schemas for API key management

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class APIKeyCreate(BaseModel):
    """Schema for creating API key."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    expires_days: Optional[int] = Field(None, gt=0, le=365)
    rate_limit_per_hour: Optional[int] = Field(None, gt=0, le=10000)
    scopes: Optional[List[str]] = Field(None)

class APIKeyResponse(BaseModel):
    """Schema for API key response (without the actual key)."""
    id: UUID
    name: str
    description: Optional[str]
    key_prefix: str
    is_active: bool
    expires_at: Optional[datetime]
    rate_limit_per_hour: Optional[int]
    scopes: Optional[List[str]]
    last_used_at: Optional[datetime]
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, api_key: APIKey):
        """Convert from ORM model."""
        scopes = None
        if api_key.scopes:
            scopes = api_key.scopes.split(",")
        
        return cls(
            id=api_key.id,
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.key_prefix,
            is_active=api_key.is_active,
            expires_at=api_key.expires_at,
            rate_limit_per_hour=api_key.rate_limit_per_hour,
            scopes=scopes,
            last_used_at=api_key.last_used_at,
            usage_count=api_key.usage_count,
            created_at=api_key.created_at
        )

class APIKeyCreateResponse(BaseModel):
    """Schema for API key creation response (includes the actual key)."""
    api_key: str
    key_info: APIKeyResponse
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }