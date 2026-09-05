from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import math

from app.core.database import get_db
from app.dependencies.auth import require_admin, require_staff_or_admin
from app.models.user import User, UserRole
from app.models.anime import Anime, AnimeType
from app.models.episode import Episode
from app.models.comment import Comment
from app.models.banner import Banner
from app.schemas.common import AdminStats, BannerCreate, BannerRead
from app.schemas.user import UserRead, UserAdminUpdate, VIPGrantRequest, MovieUnlockRequest
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStats)
async def get_stats(staff: User = Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db)):
    total_users = await db.scalar(select(func.count(User.id)))
    total_anime = await db.scalar(select(func.count(Anime.id)).where(Anime.type == AnimeType.ANIME))
    total_donghua = await db.scalar(select(func.count(Anime.id)).where(Anime.type == AnimeType.DONGHUA))
    total_drama = await db.scalar(select(func.count(Anime.id)).where(Anime.type == AnimeType.DRAMA))
    total_movies = await db.scalar(select(func.count(Anime.id)).where(Anime.type == AnimeType.MOVIE))
    total_episodes = await db.scalar(select(func.count(Episode.id)))
    total_views = await db.scalar(select(func.sum(Anime.view_count)))
    active_users = await db.scalar(select(func.count(User.id)).where(User.is_active == True))
    return AdminStats(
        total_users=total_users or 0,
        total_anime=total_anime or 0,
        total_donghua=total_donghua or 0,
        total_drama=total_drama or 0,
        total_movies=total_movies or 0,
        total_episodes=total_episodes or 0,
        total_views=total_views or 0,
        active_users=active_users or 0,
    )


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    vip_only: Optional[bool] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    if vip_only is True:
        q = q.where(User.is_vip == True)
    elif vip_only is False:
        q = q.where(User.is_vip == False)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        q = q.where(
            func.lower(User.username).like(term)
            | func.lower(User.email).like(term)
            | func.lower(User.phone_number).like(term)
            | func.lower(User.telegram_username).like(term)
            | func.lower(User.telegram_id).like(term)
        )

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(
        q.order_by(User.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    users = result.scalars().all()
    return {
        "items": [UserRead.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, math.ceil((total or 0) / per_page)),
    }


@router.post("/users/{user_id}/vip", response_model=UserRead)
async def admin_set_user_vip(
    user_id: int,
    data: VIPGrantRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan = data.plan.lower().strip()
    now = datetime.now(timezone.utc)

    if plan == "revoke":
        user.is_vip = False
        user.vip_plan = None
        user.vip_started_at = None
        user.vip_expires_at = None
    elif plan == "lifetime":
        user.is_vip = True
        user.vip_plan = "lifetime"
        user.vip_started_at = now
        user.vip_expires_at = None
    else:
        # Duration mapping
        duration_days_map = {
            "1month": 30,
            "3month": 90,
            "6month": 180,
            "1year": 365,
        }
        days = data.custom_days or duration_days_map.get(plan, 30)
        
        # If already VIP with time remaining, extend from current expiration
        if user.is_vip and user.vip_expires_at:
            base_time = user.vip_expires_at if user.vip_expires_at > now else now
        else:
            base_time = now

        user.is_vip = True
        user.vip_plan = plan
        if not user.vip_started_at:
            user.vip_started_at = now
        user.vip_expires_at = base_time + timedelta(days=days)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/users/{user_id}/movies", response_model=UserRead)
async def admin_manage_user_movie(
    user_id: int,
    data: MovieUnlockRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    import json
    try:
        current_list = json.loads(user.unlocked_movies or "[]")
        if not isinstance(current_list, list):
            current_list = []
    except Exception:
        current_list = []

    slug = data.movie_slug.strip()
    if data.action == "unlock":
        if slug and slug not in current_list:
            current_list.append(slug)
    elif data.action == "lock":
        if slug in current_list:
            current_list.remove(slug)

    user.unlocked_movies = json.dumps(current_list)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.put("/users/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: int,
    data: UserAdminUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_owner_target = user.role == UserRole.OWNER or user.email == "cm5722254@gmail.com"
    is_acting_owner = admin.role == UserRole.OWNER or admin.email == "cm5722254@gmail.com"

    # IMMUNITY: Only the Owner can modify an Owner account
    if is_owner_target:
        if not is_acting_owner:
            raise HTTPException(
                status_code=403,
                detail="គណនី OWNER (ម្ចាស់វេបសាយ) ត្រូវបានការពារដាច់ខាត មិនអាចកែប្រែបានឡើយ (Protected Owner cannot be modified by others)"
            )
        if data.role is not None and data.role != UserRole.OWNER:
            raise HTTPException(
                status_code=400,
                detail="មិនអាចទម្លាក់ ឬផ្លាស់ប្តូរ Role របស់ OWNER បានឡើយ (Cannot demote Owner role)"
            )
        if data.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="មិនអាចបិទ (Disable) គណនី OWNER បានឡើយ (Cannot disable Owner account)"
            )

    # Only Owner can promote anyone to OWNER
    if data.role == UserRole.OWNER and not is_acting_owner:
        raise HTTPException(
            status_code=403,
            detail="មានតែ OWNER ផ្ទាល់ប៉ុណ្ណោះដែលអាចផ្ដល់សិទ្ធិ OWNER បាន (Only Owner can assign Owner role)"
        )

    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_verified is not None:
        user.is_verified = data.is_verified
    if data.is_vip is not None:
        user.is_vip = data.is_vip
    if data.vip_plan is not None:
        user.vip_plan = data.vip_plan
    if data.vip_duration_days is not None:
        now = datetime.now(timezone.utc)
        if data.vip_duration_days <= 0:
            user.vip_expires_at = None
        else:
            user.vip_expires_at = now + timedelta(days=data.vip_duration_days)
        user.is_vip = True
        user.vip_started_at = now

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)



@router.delete("/users/{user_id}", status_code=204)
async def admin_delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account from admin panel")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_acting_owner = admin.role == UserRole.OWNER or admin.email == "cm5722254@gmail.com"

    # IMMUNITY: Owner can NEVER be deleted by anyone, even Admins
    if user.role == UserRole.OWNER or user.email == "cm5722254@gmail.com":
        raise HTTPException(
            status_code=403,
            detail="គណនី OWNER (ម្ចាស់វេបសាយ) ត្រូវបានការពារដាច់ខាត ទោះបីជា Admin ក៏មិនអាចលុបបានឡើយ (Owner account is strictly protected and cannot be deleted)"
        )

    # Non-owner Admin cannot delete another Admin or Staff
    if not is_acting_owner and user.role in (UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(
            status_code=403,
            detail="Admin ធម្មតាមិនអាចលុបគណនី Admin ឬ Staff ផ្សេងទៀតបានឡើយ (Only Owner can delete Admin/Staff accounts)"
        )

    await db.delete(user)
    await db.commit()


@router.get("/comments")
async def admin_get_comments(
    page: int = Query(1, ge=1),
    reported_only: bool = False,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Comment).options(selectinload(Comment.user), selectinload(Comment.anime))
    if reported_only:
        q = q.where(Comment.is_reported == True)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.order_by(Comment.created_at.desc()).offset((page - 1) * 20).limit(20)
    result = await db.execute(q)
    comments = result.scalars().unique().all()
    return {
        "items": [
            {
                "id": c.id,
                "content": c.content,
                "is_reported": c.is_reported,
                "is_deleted": c.is_deleted,
                "likes_count": c.likes_count,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "user": {"id": c.user.id, "username": c.user.username} if c.user else None,
                "anime": {"id": c.anime.id, "title": c.anime.title, "slug": c.anime.slug} if c.anime else None,
            }
            for c in comments
        ],
        "total": total or 0,
    }


@router.delete("/comments/{comment_id}", status_code=204)
async def admin_delete_comment(
    comment_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_deleted = True
    comment.content = "[deleted by admin]"
    db.add(comment)
    await db.commit()


# Banner CRUD
@router.get("/banners", response_model=List[BannerRead])
async def get_banners(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Banner).order_by(Banner.order_index))
    return [BannerRead.model_validate(b) for b in result.scalars().all()]


@router.post("/banners", response_model=BannerRead, status_code=201)
async def create_banner(
    data: BannerCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    banner = Banner(**data.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)

    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return BannerRead.model_validate(banner)


@router.delete("/banners/{banner_id}", status_code=204)
async def delete_banner(
    banner_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    await db.delete(banner)
    await db.commit()

    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass


# Genres
@router.get("/genres")
async def list_genres(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    from app.models.genre import Genre
    result = await db.execute(select(Genre).order_by(Genre.name))
    return [{"id": g.id, "name": g.name, "slug": g.slug} for g in result.scalars().all()]


@router.post("/genres", status_code=201)
async def create_genre(
    name: str,
    slug: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.genre import Genre
    genre = Genre(name=name, slug=slug)
    db.add(genre)
    await db.commit()
    await db.refresh(genre)

    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return {"id": genre.id, "name": genre.name, "slug": genre.slug}


# Telegram Bot Management
@router.get("/telegram/status")
async def get_telegram_status(admin: User = Depends(require_admin)):
    from app.services.telegram_service import sync_telegram_subscribers, _get_subscribers, _call_telegram_api
    import asyncio
    
    bot_info = await asyncio.to_thread(_call_telegram_api, "getMe", {})
    subscribers = await sync_telegram_subscribers()
    return {
        "bot_info": bot_info.get("result", {}),
        "bot_online": bot_info.get("ok", False),
        "bot_username": bot_info.get("result", {}).get("username", "merdonghuakh_bot"),
        "subscribers_count": len(subscribers),
        "subscribers": subscribers,
    }


@router.post("/telegram/test")
async def test_telegram_notification(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.services.telegram_service import notify_new_anime
    result = await db.execute(select(Anime).options(selectinload(Anime.genres)).limit(1))
    sample_anime = result.scalar_one_or_none()
    if not sample_anime:
        sample_anime = Anime(
            title="Battle Through the Heavens (斗破苍穹)",
            alt_title="Doupo Cangqiong",
            slug="battle-through-the-heavens",
            type=AnimeType.DONGHUA,
            status="ONGOING",
            average_rating=4.9,
            poster_url="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
            description="Xiao Yan is a genius who suddenly loses all his powers in a world ruled by strength and power...",
        )
    genre_names = [g.name for g in sample_anime.genres] if hasattr(sample_anime, "genres") and sample_anime.genres else ["Cultivation", "Action", "Fantasy"]
    res = await notify_new_anime(sample_anime, genre_names)
    return {"status": "ok", "sent_count": len(res), "results": res}


# ── Data Persistence, Permanent Protection & Backup API ──
@router.get("/backup/status")
async def get_backup_status(staff: User = Depends(require_staff_or_admin)):
    from app.services.data_persistence import get_persistence_status
    return get_persistence_status()


@router.post("/backup/sync")
async def sync_database_permanently(staff: User = Depends(require_staff_or_admin)):
    """1-Click Save Data: Saves all anime and episodes permanently to database + backup snapshots."""
    from app.services.data_persistence import sync_database_to_export_json
    result = await sync_database_to_export_json()
    return result


@router.get("/backup/snapshots")
async def list_backup_snapshots(staff: User = Depends(require_staff_or_admin)):
    """List all available backup snapshots with anime/episode counts and timestamps."""
    from app.services.data_persistence import get_available_snapshots
    return get_available_snapshots()


@router.post("/backup/restore-snapshot/{filename}")
async def restore_specific_snapshot(
    filename: str,
    admin: User = Depends(require_admin),
):
    """Restore database from a specific snapshot filename."""
    from app.services.data_persistence import restore_from_snapshot_file
    result = await restore_from_snapshot_file(filename)
    return result


@router.post("/backup/recover-missing")
async def recover_missing_content_emergency(staff: User = Depends(require_staff_or_admin)):
    """1-Click Emergency Recover: Restores any lost or missing anime/episodes from the master snapshot."""
    from app.services.data_persistence import recover_all_missing_content
    result = await recover_all_missing_content()
    return result


@router.get("/backup/export")
async def export_full_database_backup(admin: User = Depends(require_admin)):
    from app.services.data_persistence import export_all_data_to_dict
    return await export_all_data_to_dict()


@router.get("/backup/export-archive")
async def export_complete_archive_zip(admin: User = Depends(require_admin)):
    """Exports a complete standalone ZIP backup containing both JSON database and all poster/banner images."""
    from fastapi.responses import Response
    from datetime import datetime, timezone
    from app.services.data_persistence import create_full_backup_archive_zip

    zip_bytes = await create_full_backup_archive_zip()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    filename = f"namianime_complete_backup_{today_str}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/backup/import")
async def import_database_backup(
    data: dict,
    admin: User = Depends(require_admin),
):
    from app.services.data_persistence import restore_data_from_dict
    result = await restore_data_from_dict(data, merge_only=True)
    return result


@router.post("/backup/import-archive")
async def import_complete_archive_zip(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
):
    """Restores database and extracts poster/banner images from an uploaded .zip archive."""
    from app.services.data_persistence import restore_full_backup_archive_zip
    
    zip_bytes = await file.read()
    result = await restore_full_backup_archive_zip(zip_bytes)
    return result


# ── Global Episode VIP & Free Management (All Series & Episodes) ──
@router.put("/episodes/set-all-free")
async def set_all_episodes_free_globally(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update
    await db.execute(update(Episode).values(is_free=True))
    await db.execute(update(Anime).values(is_free=True))
    await db.commit()
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass
    return {"status": "success", "message": "All episodes across all series are now set to Free"}


@router.put("/episodes/set-all-vip")
async def set_all_episodes_vip_globally(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update
    await db.execute(update(Episode).values(is_free=False))
    await db.execute(update(Anime).values(is_free=False))
    await db.commit()
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass
    return {"status": "success", "message": "All episodes across all series are now locked to VIP"}


@router.put("/episodes/set-free-3-episodes-all")
async def set_free_3_episodes_all_globally(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update, case
    # Set Ep 1, 2, 3 to Free (is_free=True) and Ep 4+ to VIP (is_free=False)
    await db.execute(
        update(Episode).values(
            is_free=case((Episode.episode_number <= 3, True), else_=False)
        )
    )
    await db.commit()
    try:
        import asyncio
        from app.services.data_persistence import sync_database_to_export_json
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass
    return {"status": "success", "message": "Episodes 1-3 set to Free and Ep 4+ locked to VIP for all series"}

from pydantic import BaseModel

class ConvertLinkRequest(BaseModel):
    url: str


@router.post("/convert-stream-link")
async def convert_stream_link(
    req: ConvertLinkRequest,
    staff: User = Depends(require_staff_or_admin),
):
    """Resolve a signed stream URL into its underlying direct S3 storage MP4 URL."""
    raw_url = req.url.strip()
    if not raw_url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    import urllib.request
    import urllib.parse

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://nintanime.com/",
    }

    try:
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def http_error_302(self, req, fp, code, msg, headers):
                return fp or headers
            http_error_301 = http_error_302
            http_error_303 = http_error_302
            http_error_307 = http_error_302
            http_error_308 = http_error_302

        opener = urllib.request.build_opener(NoRedirectHandler)
        request = urllib.request.Request(raw_url, headers=headers)

        try:
            resp = opener.open(request, timeout=12)
            loc = resp.headers.get("Location") if hasattr(resp, "headers") else getattr(resp, "getheader", lambda k: None)("Location")
            if loc:
                return {"status": "success", "original_url": raw_url, "direct_url": loc, "type": "redirect"}
            final_url = resp.geturl() if hasattr(resp, "geturl") else raw_url
            return {"status": "success", "original_url": raw_url, "direct_url": final_url, "type": "direct"}
        except Exception:
            with urllib.request.urlopen(urllib.request.Request(raw_url, headers=headers), timeout=12) as full_resp:
                final_url = full_resp.geturl()
                return {"status": "success", "original_url": raw_url, "direct_url": final_url, "type": "resolved"}
    except Exception as e:
        parsed = urllib.parse.urlparse(raw_url)
        params = urllib.parse.parse_qs(parsed.query)
        ep_id = params.get("episodeId", [""])[0]
        return {
            "status": "partial",
            "original_url": raw_url,
            "direct_url": raw_url,
            "episode_id": ep_id,
            "error": str(e),
        }


# ─── 📩 ADMIN UNBAN REQUESTS MANAGEMENT ───
@router.get("/unban-requests")
async def list_unban_requests(admin: User = Depends(require_admin)):
    """Admin views all user unban appeals."""
    from app.api.auth import load_unban_requests
    return load_unban_requests()


@router.post("/unban-requests/{req_id}/approve")
async def approve_unban_request(
    req_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin approves an appeal, setting the user to Active (is_active = True)."""
    from app.api.auth import load_unban_requests, save_unban_requests
    reqs = load_unban_requests()
    target_req = next((r for r in reqs if r.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Unban request not found")

    identifier = target_req.get("username_or_email", "")
    # Find user by username or email or phone
    res = await db.execute(
        select(User).where(
            (User.username == identifier) | (User.email == identifier) | (User.phone_number == identifier)
        )
    )
    user = res.scalar_one_or_none()
    if user:
        user.is_active = True
        await db.commit()

    target_req["status"] = "APPROVED"
    save_unban_requests(reqs)

    return {
        "success": True,
        "message": f"បានដោះសោរគណនី {identifier} (Active) ដោយជោគជ័យ!",
        "username": identifier,
    }


@router.post("/unban-requests/{req_id}/reject")
async def reject_unban_request(
    req_id: str,
    admin: User = Depends(require_admin),
):
    """Admin rejects an appeal."""
    from app.api.auth import load_unban_requests, save_unban_requests
    reqs = load_unban_requests()
    target_req = next((r for r in reqs if r.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Unban request not found")

    target_req["status"] = "REJECTED"
    save_unban_requests(reqs)

    return {"success": True, "message": "បានបដិសេធសំណើស្នើសុំដោះសោរ"}

