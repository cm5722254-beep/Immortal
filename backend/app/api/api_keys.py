import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Security, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.user import User, UserRole
from app.dependencies.auth import require_admin
from app.core.security import generate_api_key, hash_api_key


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api-keys", tags=["Admin API Keys"])


# Pydantic Schemas
class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Friendly identifier name")
    scopes: List[str] = Field(default=["all"], description="Permissions list e.g. ['anime:read', 'episodes:write', 'stream:access']")
    expires_in_days: Optional[int] = Field(default=None, ge=0, le=3650, description="Expiration in days (0 or null for never expires)")


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    scopes: str
    is_active: bool
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    request_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyGeneratedResponse(ApiKeyResponse):
    raw_api_key: str  # Only returned once upon creation!


@router.get("", response_model=List[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all API keys."""
    result = await db.execute(select(ApiKey).order_by(desc(ApiKey.created_at)))
    return result.scalars().all()


@router.post("", response_model=ApiKeyGeneratedResponse)
async def create_api_key_endpoint(
    data: ApiKeyCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Generate a new secure API Key for external clients/apps."""
    raw_key, prefix, key_hash = generate_api_key()

    expires_at = None
    if data.expires_in_days and data.expires_in_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

    scopes_str = ",".join(data.scopes) if data.scopes else "all"

    api_key_obj = ApiKey(
        name=data.name.strip(),
        key_prefix=prefix,
        key_hash=key_hash,
        scopes=scopes_str,
        is_active=True,
        created_by_user_id=admin.id,
        expires_at=expires_at,
        request_count=0,
    )
    db.add(api_key_obj)
    await db.commit()
    await db.refresh(api_key_obj)


    # Return response including raw key
    resp_dict = {
        "id": api_key_obj.id,
        "name": api_key_obj.name,
        "key_prefix": api_key_obj.key_prefix,
        "scopes": api_key_obj.scopes,
        "is_active": api_key_obj.is_active,
        "expires_at": api_key_obj.expires_at,
        "last_used_at": api_key_obj.last_used_at,
        "request_count": api_key_obj.request_count,
        "created_at": api_key_obj.created_at,
        "raw_api_key": raw_key,
    }
    return resp_dict


@router.patch("/{key_id}/toggle")
async def toggle_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Toggle API Key active/inactive status."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="API Key not found")

    key_obj.is_active = not key_obj.is_active
    await db.commit()
    await db.refresh(key_obj)
    return {"message": "API key updated", "id": key_obj.id, "is_active": key_obj.is_active}


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Revoke / Delete an API Key."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="API Key not found")

    await db.delete(key_obj)
    await db.commit()
    return {"message": "API Key revoked successfully", "id": key_id}
