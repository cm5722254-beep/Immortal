from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
import math

from app.core.database import get_db
from app.core.redis import get_cache, set_cache, delete_cache_pattern
from app.dependencies.auth import require_admin, require_staff_or_admin, get_optional_user
from app.models.anime import Anime, AnimeType, AnimeStatus
from app.models.genre import Genre
from app.models.user import User
from app.schemas.anime import AnimeCreate, AnimeUpdate, AnimeRead, AnimeListResponse

router = APIRouter(prefix="/anime", tags=["Anime"])


def _apply_options(query):
    return query.options(selectinload(Anime.genres))


@router.get("", response_model=AnimeListResponse)
async def list_anime(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[AnimeType] = None,
    genre: Optional[str] = None,
    status: Optional[AnimeStatus] = None,
    year: Optional[int] = None,
    is_free: Optional[bool] = None,
    sort: str = Query("latest", pattern="^(latest|popular|rating|az|za)$"),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"anime:list:{page}:{per_page}:{type}:{genre}:{status}:{year}:{is_free}:{sort}"
    cached = await get_cache(cache_key)
    if cached:
        return AnimeListResponse(**cached)

    q = select(Anime).where(Anime.is_published == True)
    if type:
        q = q.where(Anime.type == type)
    if is_free is not None:
        q = q.where(Anime.is_free == is_free)
    if status:
        q = q.where(Anime.status == status)
    if year:
        q = q.where(Anime.year == year)
    if genre:
        q = q.join(Anime.genres).where(Genre.slug == genre)

    if sort == "latest":
        q = q.order_by(Anime.created_at.desc())
    elif sort == "popular":
        q = q.order_by(Anime.view_count.desc())
    elif sort == "rating":
        q = q.order_by(Anime.average_rating.desc())
    elif sort == "az":
        q = q.order_by(Anime.title.asc())
    elif sort == "za":
        q = q.order_by(Anime.title.desc())

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0

    q = _apply_options(q).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    items = result.scalars().unique().all()

    response_obj = AnimeListResponse(
        items=[AnimeRead.model_validate(a) for a in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, math.ceil(total / per_page)),
    )
    await set_cache(cache_key, response_obj.model_dump(), ttl=180)
    return response_obj


@router.get("/{slug_or_id}", response_model=AnimeRead)
async def get_anime(slug_or_id: str, db: AsyncSession = Depends(get_db)):
    from urllib.parse import unquote
    raw_slug = slug_or_id.strip()
    decoded_slug = unquote(slug_or_id).strip()

    cache_key = f"anime:detail:{raw_slug}"
    cached = await get_cache(cache_key)
    if cached:
        return AnimeRead(**cached)

    if raw_slug.isdigit():
        cond = or_(Anime.id == int(raw_slug), Anime.slug == raw_slug, func.trim(Anime.slug) == raw_slug)
    else:
        cond = or_(
            Anime.slug == raw_slug,
            Anime.slug == decoded_slug,
            func.trim(Anime.slug) == raw_slug,
            func.trim(Anime.slug) == decoded_slug,
            func.lower(Anime.slug) == raw_slug.lower(),
            func.lower(Anime.slug) == decoded_slug.lower()
        )

    result = await db.execute(
        _apply_options(select(Anime).where(cond, Anime.is_published == True))
    )
    anime = result.scalar_one_or_none()
    if not anime:
        # Fallback: check if slug matches anime title
        title_res = await db.execute(
            _apply_options(select(Anime).where(
                or_(
                    Anime.title == raw_slug,
                    Anime.title == decoded_slug,
                    func.trim(Anime.title) == decoded_slug
                ),
                Anime.is_published == True
            ))
        )
        anime = title_res.scalar_one_or_none()

    if not anime:
        raise HTTPException(status_code=404, detail="Anime/Donghua title not found")
    # Increment view count
    anime.view_count += 1
    db.add(anime)
    await db.commit()
    await db.refresh(anime)

    res_obj = AnimeRead.model_validate(anime)
    await set_cache(cache_key, res_obj.model_dump(), ttl=300)
    return res_obj



@router.post("", response_model=AnimeRead, status_code=201)
async def create_anime(
    data: AnimeCreate,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Anime).where(Anime.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    genre_objs = []
    if data.genre_ids:
        result = await db.execute(select(Genre).where(Genre.id.in_(data.genre_ids)))
        genre_objs = list(result.scalars().all())

    anime = Anime(
        title=data.title, slug=data.slug, alt_title=data.alt_title,
        description=data.description, poster_url=data.poster_url, banner_url=data.banner_url,
        trailer_url=data.trailer_url, year=data.year, status=data.status,
        studio=data.studio, country=data.country, type=data.type,
        is_featured=data.is_featured, is_trending=data.is_trending, is_published=data.is_published,
        genres=genre_objs,
    )
    db.add(anime)
    await db.commit()
    await db.refresh(anime)
    result = await db.execute(_apply_options(select(Anime).where(Anime.id == anime.id)))
    created = result.scalar_one()

    # Dispatch Telegram notification in background
    if created.is_published:
        from app.services.telegram_service import notify_new_anime
        import asyncio
        genre_names = [g.name for g in created.genres] if created.genres else []
        asyncio.create_task(notify_new_anime(created, genre_names))

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("anime:*"))
        asyncio.create_task(delete_cache_pattern("search:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return AnimeRead.model_validate(created)


@router.put("/{anime_id}", response_model=AnimeRead)
async def update_anime(
    anime_id: int,
    data: AnimeUpdate,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(_apply_options(select(Anime).where(Anime.id == anime_id)))
    anime = result.scalar_one_or_none()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    for field, value in data.model_dump(exclude_none=True, exclude={"genre_ids"}).items():
        setattr(anime, field, value)

    if data.genre_ids is not None:
        g_result = await db.execute(select(Genre).where(Genre.id.in_(data.genre_ids)))
        anime.genres = list(g_result.scalars().all())

    db.add(anime)
    await db.commit()

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("anime:*"))
        asyncio.create_task(delete_cache_pattern("search:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    result = await db.execute(_apply_options(select(Anime).where(Anime.id == anime.id)))
    return AnimeRead.model_validate(result.scalar_one())


@router.delete("/{anime_id}", status_code=204)
async def delete_anime(
    anime_id: int,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Anime).where(Anime.id == anime_id))
    anime = result.scalar_one_or_none()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    from sqlalchemy import delete
    from app.models.genre import anime_genres
    from app.models.episode import Episode
    from app.models.favorite import Favorite
    from app.models.history import WatchHistory
    from app.models.comment import Comment
    from app.models.rating import Rating
    from app.models.banner import Banner
    from app.models.danmaku import Danmaku

    # Delete all dependent relationships first
    ep_result = await db.execute(select(Episode.id).where(Episode.anime_id == anime_id))
    ep_ids = ep_result.scalars().all()
    if ep_ids:
        await db.execute(delete(Danmaku).where(Danmaku.episode_id.in_(ep_ids)))

    await db.execute(anime_genres.delete().where(anime_genres.c.anime_id == anime_id))
    await db.execute(delete(Episode).where(Episode.anime_id == anime_id))
    await db.execute(delete(Banner).where(Banner.anime_id == anime_id))
    await db.execute(delete(Favorite).where(Favorite.anime_id == anime_id))
    await db.execute(delete(WatchHistory).where(WatchHistory.anime_id == anime_id))
    await db.execute(delete(Comment).where(Comment.anime_id == anime_id))
    await db.execute(delete(Rating).where(Rating.anime_id == anime_id))

    await db.delete(anime)
    await db.commit()

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("anime:*"))
        asyncio.create_task(delete_cache_pattern("search:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass



@router.post("/{anime_id}/broadcast-telegram", status_code=200)
@router.post("/anime/{anime_id}/broadcast-telegram", status_code=200)
async def broadcast_anime_series_to_telegram(
    anime_id: int,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger Telegram broadcast for an entire anime series."""
    anime = await db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    from app.services.telegram_service import notify_new_anime
    res = await notify_new_anime(anime)
    return {
        "success": True,
        "message": f"បានផ្សាយដំណឹងរឿង «{anime.title}» ទៅកាន់ Telegram រួចរាល់!",
        "result": res
    }

