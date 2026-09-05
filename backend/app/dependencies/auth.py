from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id: int = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        return user if (user and user.is_active) else None
    except Exception:
        return None


async def require_user(user: User = Depends(get_current_user)) -> User:
    return user


async def require_vip_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_vip_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="VIP membership required to watch episodes. Please upgrade to VIP.",
        )
    return user


async def require_staff_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Administrator privileges required to manage anime and episodes",
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return user


async def require_owner(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.OWNER and user.email != "cm5722254@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Owner privileges required",
        )
    return user

