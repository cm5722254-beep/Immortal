import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_external_api_key
from app.models.anime import Anime
from app.models.episode import Episode
from app.models.api_key import ApiKey


router = APIRouter(prefix="/v1/catalog", tags=["Partner Catalog API"])


@router.get("/anime")
async def export_anime(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    query: Optional[str] = Query(default=None, max_length=120),
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(require_external_api_key),
):
    statement = select(Anime).where(Anime.is_published == True)
    if query and query.strip():
        term = f"%{query.strip().casefold()}%"
        statement = statement.where(
            func.lower(Anime.title).like(term)
            | func.lower(Anime.alt_title).like(term)
            | func.lower(Anime.slug).like(term)
        )
    total = await db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    result = await db.execute(statement.order_by(Anime.id).offset((page - 1) * per_page).limit(per_page))
    anime_list = result.scalars().all()
    return {
        "data": [
            {
                "id": anime.id,
                "title": anime.title,
                "alt_title": anime.alt_title,
                "slug": anime.slug,
                "type": anime.type.value if hasattr(anime.type, "value") else anime.type,
                "year": anime.year,
                "status": anime.status.value if hasattr(anime.status, "value") else anime.status,
                "poster_url": anime.poster_url,
                "episode_count": anime.episode_count,
                "episodes_url": f"/api/v1/catalog/anime/{anime.slug}/episodes",
            }
            for anime in anime_list
        ],
        "pagination": {"page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))},
        "api_key": api_key.key_prefix,
    }


@router.get("/anime/{slug_or_id}/episodes")
async def export_anime_episodes(
    slug_or_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(require_external_api_key),
):
    if slug_or_id.isdigit():
        condition = Anime.id == int(slug_or_id)
    else:
        condition = Anime.slug == slug_or_id
    anime_result = await db.execute(select(Anime).where(condition, Anime.is_published == True))
    anime = anime_result.scalar_one_or_none()
    if not anime:
        raise HTTPException(status_code=404, detail="Published anime not found")

    statement = select(Episode).where(Episode.anime_id == anime.id, Episode.is_published == True)
    total = await db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    result = await db.execute(statement.order_by(Episode.episode_number).offset((page - 1) * per_page).limit(per_page))
    episodes = result.scalars().all()
    return {
        "anime": {"id": anime.id, "title": anime.title, "slug": anime.slug},
        "data": [
            {
                "id": episode.id,
                "episode_number": episode.episode_number,
                "title": episode.title,
                "video_url": episode.video_url,
                "subtitle_url": episode.subtitle_url,
                "subtitle_tracks": episode.subtitle_tracks or [],
                "thumbnail_url": episode.thumbnail_url,
                "duration_seconds": episode.duration_seconds,
                "is_free": episode.is_free,
            }
            for episode in episodes
        ],
        "pagination": {"page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))},
        "api_key": api_key.key_prefix,
    }
