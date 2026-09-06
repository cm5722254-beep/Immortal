from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

from typing import Optional
from app.core.config import settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        # In development mode, auto-resolve to Owner if no credentials supplied
        if settings.ENVIRONMENT == "development":
            result = await db.execute(select(User).where(User.email == "cm5722254@gmail.com"))
            owner = result.scalar_one_or_none()
            if owner:
                owner.role = UserRole.OWNER
                owner.is_active = True
                return owner
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        if settings.ENVIRONMENT == "development":
            result = await db.execute(select(User).where(User.email == "cm5722254@gmail.com"))
            owner = result.scalar_one_or_none()
            if owner:
                owner.role = UserRole.OWNER
                owner.is_active = True
                return owner
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    # 1. If email is in token payload (e.g. Google ID token or Owner account)
    email = payload.get("email")
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            if not user.is_active and user.email != "cm5722254@gmail.com":
                raise HTTPException(status_code=403, detail="Account is disabled")
            if user.email == "cm5722254@gmail.com":
                user.role = UserRole.OWNER
                user.is_active = True
                user.is_verified = True
            return user
        elif email == "cm5722254@gmail.com":
            # Auto-create Owner if not yet seeded
            user = User(
                username="cheat_admin",
                email="cm5722254@gmail.com",
                password_hash="google_verified",
                role=UserRole.OWNER,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            return user

    # 2. Lookup by numeric ID
    user_id = payload.get("sub")
    if not user_id:
        if settings.ENVIRONMENT == "development":
            result = await db.execute(select(User).where(User.email == "cm5722254@gmail.com"))
            owner = result.scalar_one_or_none()
            if owner:
                owner.role = UserRole.OWNER
                return owner
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        uid = int(user_id)
        result = await db.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            if settings.ENVIRONMENT == "development":
                res_owner = await db.execute(select(User).where(User.email == "cm5722254@gmail.com"))
                owner = res_owner.scalar_one_or_none()
                if owner:
                    owner.role = UserRole.OWNER
                    return owner
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active and user.email != "cm5722254@gmail.com":
            raise HTTPException(status_code=403, detail="Account is disabled")
        if user.email == "cm5722254@gmail.com":
            user.role = UserRole.OWNER
        return user
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="User not found")


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        email = payload.get("email")
        if email:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user

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

