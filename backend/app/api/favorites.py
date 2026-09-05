from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.dependencies.auth import require_user
from app.models.favorite import Favorite
from app.models.anime import Anime
from app.models.user import User
from app.schemas.anime import AnimeRead

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("", response_model=List[AnimeRead])
async def get_favorites(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Anime)
        .join(Favorite, Favorite.anime_id == Anime.id)
        .where(Favorite.user_id == current_user.id)
        .options(selectinload(Anime.genres))
        .order_by(Favorite.created_at.desc())
    )
    return [AnimeRead.model_validate(a) for a in result.scalars().unique().all()]


@router.post("/{anime_id}", status_code=201)
async def add_favorite(
    anime_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    anime = await db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.anime_id == anime_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already in favorites")

    fav = Favorite(user_id=current_user.id, anime_id=anime_id)
    db.add(fav)
    await db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{anime_id}", status_code=204)
async def remove_favorite(
    anime_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.anime_id == anime_id)
    )
    fav = result.scalar_one_or_none()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    await db.delete(fav)
    await db.commit()
