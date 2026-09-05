from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.core.redis import get_cache, set_cache, delete_cache_pattern
from app.dependencies.auth import require_admin, require_staff_or_admin
from app.models.anime import Anime
from app.models.episode import Episode
from app.models.user import User
from app.schemas.episode import EpisodeCreate, EpisodeUpdate, EpisodeRead
from typing import List

router = APIRouter(tags=["Episodes"])


@router.get("/anime/{anime_id_or_slug}/episodes", response_model=List[EpisodeRead])
@router.get("/episodes/anime/{anime_id_or_slug}", response_model=List[EpisodeRead])
async def list_episodes(anime_id_or_slug: str, db: AsyncSession = Depends(get_db)):
    from urllib.parse import unquote
    raw_slug = anime_id_or_slug.strip()
    decoded_slug = unquote(anime_id_or_slug).strip()

    cache_key = f"episodes:list:{raw_slug}"
    cached = await get_cache(cache_key)
    if cached:
        return [EpisodeRead(**e) for e in cached]

    if raw_slug.isdigit():
        target_anime_id = int(raw_slug)
    else:
        anime_res = await db.execute(
            select(Anime.id).where(
                or_(
                    Anime.slug == raw_slug,
                    Anime.slug == decoded_slug,
                    func.trim(Anime.slug) == raw_slug,
                    func.trim(Anime.slug) == decoded_slug,
                    func.lower(Anime.slug) == raw_slug.lower(),
                    func.lower(Anime.slug) == decoded_slug.lower(),
                    Anime.title == raw_slug,
                    Anime.title == decoded_slug,
                    func.trim(Anime.title) == decoded_slug
                )
            )
        )
        target_anime_id = anime_res.scalar_one_or_none()
        if not target_anime_id:
            return []

    result = await db.execute(
        select(Episode)
        .where(Episode.anime_id == target_anime_id, Episode.is_published == True)
        .order_by(Episode.episode_number)
    )
    items = [EpisodeRead.model_validate(e) for e in result.scalars().all()]
    await set_cache(cache_key, [e.model_dump() for e in items], ttl=300)
    return items


@router.get("/episodes/{episode_id}", response_model=EpisodeRead)
async def get_episode(episode_id: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"episodes:detail:{episode_id}"
    cached = await get_cache(cache_key)
    if cached:
        return EpisodeRead(**cached)

    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = result.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    # Increment view count
    ep.view_count += 1
    db.add(ep)
    await db.commit()
    await db.refresh(ep)

    res_obj = EpisodeRead.model_validate(ep)
    await set_cache(cache_key, res_obj.model_dump(), ttl=300)
    return res_obj


@router.post("/episodes", response_model=EpisodeRead, status_code=201)
async def create_episode(
    data: EpisodeCreate,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    anime = await db.get(Anime, data.anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    ep = Episode(**data.model_dump())
    db.add(ep)
    # Update episode count on anime
    anime.episode_count = (
        await db.scalar(
            select(func.count()).where(Episode.anime_id == anime.id, Episode.is_published == True)
        ) or 0
    ) + 1
    db.add(anime)
    await db.commit()
    # Dispatch Telegram notification in background
    if ep.is_published:
        from app.services.telegram_service import notify_new_episode
        import asyncio
        asyncio.create_task(notify_new_episode(anime, ep))

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("episodes:*"))
        asyncio.create_task(delete_cache_pattern("anime:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return EpisodeRead.model_validate(ep)


@router.put("/episodes/{episode_id}", response_model=EpisodeRead)
async def update_episode(
    episode_id: int,
    data: EpisodeUpdate,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = result.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ep, field, value)

    db.add(ep)

    # Update anime episode count
    anime = await db.get(Anime, ep.anime_id)
    if anime:
        count = await db.scalar(
            select(func.count()).where(Episode.anime_id == anime.id, Episode.is_published == True)
        )
        anime.episode_count = count or 0
        db.add(anime)

    await db.commit()
    await db.refresh(ep)

    # Dispatch Telegram notification if published with video url
    if ep.is_published and ep.video_url and anime:
        try:
            from app.services.telegram_service import notify_new_episode
            import asyncio
            asyncio.create_task(notify_new_episode(anime, ep))
        except Exception:
            pass

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("episodes:*"))
        asyncio.create_task(delete_cache_pattern("anime:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return EpisodeRead.model_validate(ep)


@router.delete("/episodes/{episode_id}", status_code=204)
async def delete_episode(
    episode_id: int,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = result.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    from sqlalchemy import delete
    from app.models.history import WatchHistory
    from app.models.danmaku import Danmaku

    anime_id = ep.anime_id
    await db.execute(delete(Danmaku).where(Danmaku.episode_id == episode_id))
    await db.execute(delete(WatchHistory).where(WatchHistory.episode_id == episode_id))
    await db.delete(ep)

    anime = await db.get(Anime, anime_id)
    if anime:
        count = await db.scalar(
            select(func.count()).where(Episode.anime_id == anime_id, Episode.is_published == True)
        )
        anime.episode_count = max(0, (count or 1) - 1)
        db.add(anime)

    await db.commit()

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("episodes:*"))
        asyncio.create_task(delete_cache_pattern("anime:*"))
    except Exception:
        pass

    # Auto-persist to permanent storage
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass


from pydantic import BaseModel

class BatchDeleteEpisodesRequest(BaseModel):
    episode_ids: List[int]


@router.post("/episodes/batch-delete", status_code=200)
async def batch_delete_episodes(
    data: BatchDeleteEpisodesRequest,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if not data.episode_ids:
        return {"deleted_count": 0, "message": "No episodes selected"}

    from sqlalchemy import delete
    from app.models.history import WatchHistory
    from app.models.danmaku import Danmaku

    # Get affected anime ids
    affected_eps = await db.execute(select(Episode.anime_id).where(Episode.id.in_(data.episode_ids)))
    affected_anime_ids = set(affected_eps.scalars().all())

    await db.execute(delete(Danmaku).where(Danmaku.episode_id.in_(data.episode_ids)))
    await db.execute(delete(WatchHistory).where(WatchHistory.episode_id.in_(data.episode_ids)))
    result = await db.execute(delete(Episode).where(Episode.id.in_(data.episode_ids)))
    deleted_count = result.rowcount

    for aid in affected_anime_ids:
        anime = await db.get(Anime, aid)
        if anime:
            count = await db.scalar(
                select(func.count()).where(Episode.anime_id == aid, Episode.is_published == True)
            )
            anime.episode_count = count or 0
            db.add(anime)

    await db.commit()

    # Clear cached queries
    try:
        import asyncio
        asyncio.create_task(delete_cache_pattern("episodes:*"))
        asyncio.create_task(delete_cache_pattern("anime:*"))
    except Exception:
        pass

    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass


    return {"deleted_count": deleted_count, "message": f"Successfully deleted {deleted_count} episodes"}


class BatchBroadcastEpisodesRequest(BaseModel):
    episode_ids: List[int]


@router.post("/episodes/{episode_id}/broadcast-telegram", status_code=200)
async def broadcast_single_episode_to_telegram(
    episode_id: int,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger Telegram broadcast for a specific episode instantly."""
    ep = await db.get(Episode, episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    anime = await db.get(Anime, ep.anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    from app.services.telegram_service import notify_new_episode
    import asyncio
    asyncio.create_task(notify_new_episode(anime, ep))

    return {
        "success": True,
        "message": f"⚡ បានបញ្ជូនភាគ {ep.episode_number} នៃរឿង «{anime.title}» ចូល Telegram Group ភ្លាមៗ!"
    }


@router.post("/episodes/batch-broadcast-telegram", status_code=200)
async def batch_broadcast_episodes_to_telegram(
    data: BatchBroadcastEpisodesRequest,
    staff: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger Telegram broadcast for multiple selected episodes instantly."""
    if not data.episode_ids:
        return {"sent_count": 0, "message": "No episodes selected"}

    from app.services.telegram_service import notify_new_episode
    import asyncio

    episodes_res = await db.execute(select(Episode).where(Episode.id.in_(data.episode_ids)).order_by(Episode.episode_number))
    episodes_list = episodes_res.scalars().all()

    async def _dispatch_all():
        for ep in episodes_list:
            anime = await db.get(Anime, ep.anime_id)
            if anime:
                await notify_new_episode(anime, ep)
                await asyncio.sleep(0.8)

    asyncio.create_task(_dispatch_all())

    return {
        "success": True,
        "sent_count": len(episodes_list),
        "message": f"⚡ បានបញ្ជូន {len(episodes_list)} ភាគដែលបានជ្រើសរើស ចូល Telegram Group ភ្លាមៗ!"
    }


