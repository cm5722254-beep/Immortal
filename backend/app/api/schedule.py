from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Dict, List
from app.core.database import get_db
from app.models.anime import Anime, AnimeStatus
from app.schemas.anime import AnimeRead

router = APIRouter(prefix="/schedule", tags=["Schedule"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.get("", response_model=Dict[str, List[AnimeRead]])
async def get_weekly_schedule(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Anime)
        .options(selectinload(Anime.genres))
        .where(Anime.is_published == True)
        .where(Anime.status == AnimeStatus.ONGOING)
        .order_by(Anime.heat_score.desc())
    )
    all_ongoing = result.scalars().all()

    schedule: Dict[str, List[AnimeRead]] = {day: [] for day in DAYS}
    for anime in all_ongoing:
        day = anime.airing_day if anime.airing_day in schedule else "Saturday"
        schedule[day].append(anime)

    return schedule


@router.get("/top-rank", response_model=List[AnimeRead])
async def get_top_ranked_donghua(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Anime)
        .options(selectinload(Anime.genres))
        .where(Anime.is_published == True)
        .order_by(Anime.heat_score.desc(), Anime.view_count.desc())
        .limit(limit)
    )
    return result.scalars().all()
