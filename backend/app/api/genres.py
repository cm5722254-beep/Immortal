from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.redis import get_cache, set_cache
from app.models.genre import Genre

router = APIRouter(prefix="/genres", tags=["Genres"])


@router.get("")
async def list_genres(db: AsyncSession = Depends(get_db)):
    cache_key = "genres:list:all"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(select(Genre).order_by(Genre.name))
    items = [{"id": g.id, "name": g.name, "slug": g.slug} for g in result.scalars().all()]
    await set_cache(cache_key, items, ttl=3600)
    return items
