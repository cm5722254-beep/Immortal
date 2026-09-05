from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.dependencies.auth import require_user
from app.models.history import WatchHistory
from app.models.anime import Anime
from app.models.episode import Episode
from app.models.user import User
from app.schemas.common import HistoryCreate, HistoryRead

router = APIRouter(prefix="/history", tags=["Watch History"])


class HistoryDetailRead(HistoryRead):
    anime_title: str = ""
    anime_slug: str = ""
    anime_poster: str = ""
    episode_number: int = 0
    episode_thumbnail: str = ""


@router.get("")
async def get_history(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchHistory)
        .where(WatchHistory.user_id == current_user.id)
        .options(selectinload(WatchHistory.anime), selectinload(WatchHistory.episode))
        .order_by(WatchHistory.last_watched_at.desc())
    )
    items = result.scalars().all()
    output = []
    for h in items:
        output.append({
            "id": h.id,
            "user_id": h.user_id,
            "anime_id": h.anime_id,
            "episode_id": h.episode_id,
            "progress_seconds": h.progress_seconds,
            "duration_seconds": h.duration_seconds,
            "last_watched_at": h.last_watched_at.isoformat() if h.last_watched_at else None,
            "anime_title": h.anime.title if h.anime else "",
            "anime_slug": h.anime.slug if h.anime else "",
            "anime_poster": h.anime.poster_url if h.anime else "",
            "episode_number": h.episode.episode_number if h.episode else 0,
            "episode_thumbnail": (h.episode.thumbnail_url if (h.episode and h.episode.thumbnail_url and "unsplash.com" not in h.episode.thumbnail_url) else ((h.anime.banner_url or h.anime.poster_url) if h.anime else "")),
        })
    return output



@router.post("", status_code=200)
async def upsert_history(
    data: HistoryCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    # Check anime/episode exist
    anime = await db.get(Anime, data.anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")
    episode = await db.get(Episode, data.episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    result = await db.execute(
        select(WatchHistory).where(
            WatchHistory.user_id == current_user.id,
            WatchHistory.episode_id == data.episode_id,
        )
    )
    history = result.scalar_one_or_none()

    if history:
        history.progress_seconds = data.progress_seconds
        history.duration_seconds = data.duration_seconds
        history.last_watched_at = datetime.now(timezone.utc)
        db.add(history)
    else:
        history = WatchHistory(
            user_id=current_user.id,
            anime_id=data.anime_id,
            episode_id=data.episode_id,
            progress_seconds=data.progress_seconds,
            duration_seconds=data.duration_seconds,
        )
        db.add(history)

    await db.commit()
    return {"message": "History saved"}


@router.delete("/{history_id}", status_code=204)
async def delete_history(
    history_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchHistory).where(WatchHistory.id == history_id, WatchHistory.user_id == current_user.id)
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="History entry not found")
    await db.delete(h)
    await db.commit()


@router.delete("", status_code=204)
async def clear_history(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchHistory).where(WatchHistory.user_id == current_user.id)
    )
    for h in result.scalars().all():
        await db.delete(h)
    await db.commit()
