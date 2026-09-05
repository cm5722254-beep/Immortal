from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import require_user
from app.models.rating import Rating
from app.models.anime import Anime
from app.models.user import User
from app.schemas.common import RatingCreate, RatingRead

router = APIRouter(prefix="/anime", tags=["Ratings"])


@router.post("/{anime_id}/rate", response_model=RatingRead)
async def rate_anime(
    anime_id: int,
    data: RatingCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    anime = await db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    result = await db.execute(
        select(Rating).where(Rating.user_id == current_user.id, Rating.anime_id == anime_id)
    )
    rating = result.scalar_one_or_none()

    if rating:
        rating.score = data.score
    else:
        rating = Rating(anime_id=anime_id, user_id=current_user.id, score=data.score)
        db.add(rating)

    await db.flush()

    # Recalculate average
    avg_result = await db.execute(
        select(func.avg(Rating.score), func.count(Rating.id)).where(Rating.anime_id == anime_id)
    )
    avg, count = avg_result.one()
    anime.average_rating = round(float(avg or 0), 2)
    anime.rating_count = count or 0
    db.add(anime)

    await db.commit()
    await db.refresh(rating)
    return RatingRead.model_validate(rating)


@router.get("/{anime_id}/my-rating", response_model=RatingRead | None)
async def get_my_rating(
    anime_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Rating).where(Rating.user_id == current_user.id, Rating.anime_id == anime_id)
    )
    rating = result.scalar_one_or_none()
    return RatingRead.model_validate(rating) if rating else None
