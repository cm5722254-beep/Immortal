from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.dependencies.auth import get_optional_user
from app.models.user import User
from app.models.danmaku import Danmaku
from app.models.episode import Episode
from app.schemas.danmaku import DanmakuCreate, DanmakuRead

router = APIRouter(prefix="/danmaku", tags=["Danmaku"])


@router.get("/episode/{episode_id}", response_model=List[DanmakuRead])
async def get_episode_danmaku(
    episode_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Danmaku)
        .where(Danmaku.episode_id == episode_id)
        .order_by(Danmaku.time_seconds.asc())
    )
    return result.scalars().all()


@router.post("", response_model=DanmakuRead, status_code=status.HTTP_201_CREATED)
async def create_danmaku(
    data: DanmakuCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Verify episode exists
    ep_res = await db.execute(select(Episode).where(Episode.id == data.episode_id))
    episode = ep_res.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    danmaku = Danmaku(
        episode_id=data.episode_id,
        user_id=current_user.id if current_user else None,
        text=data.text.strip(),
        time_seconds=data.time_seconds,
        color=data.color or "#ffffff",
        position=data.position or "scroll"
    )
    db.add(danmaku)
    await db.commit()
    await db.refresh(danmaku)
    return danmaku
