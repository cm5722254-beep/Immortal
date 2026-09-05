from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.core.redis import get_cache, set_cache
from app.models.anime import Anime
from app.models.genre import Genre
from app.schemas.anime import AnimeRead

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=List[AnimeRead])
async def search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    q_clean = q.strip().lower()
    cache_key = f"search:query:{q_clean}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return [AnimeRead(**a) for a in cached]

    result = await db.execute(
        select(Anime)
        .where(
            Anime.is_published == True,
            or_(
                Anime.title.ilike(f"%{q.strip()}%"),
                Anime.alt_title.ilike(f"%{q.strip()}%"),
                Anime.studio.ilike(f"%{q.strip()}%"),
            ),
        )
        .options(selectinload(Anime.genres))
        .order_by(Anime.view_count.desc())
        .limit(30)
    )
    items = [AnimeRead.model_validate(a) for a in result.scalars().unique().all()]
    await set_cache(cache_key, [a.model_dump() for a in items], ttl=300)
    return items

