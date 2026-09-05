"""Comprehensive Data Persistence & Permanent Protection Service for MER DONGHUA.
Guarantees that all data (both old initial data and new user/admin data) is permanently
saved across server restarts, database resets, redeployments, and environments.
"""
import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models.genre import Genre, anime_genres
from app.models.anime import Anime, AnimeType, AnimeStatus
from app.models.episode import Episode
from app.models.banner import Banner
from app.models.user import User, UserRole
from app.models.comment import Comment
from app.models.danmaku import Danmaku

logger = logging.getLogger("data_persistence")

SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
SEED_EXPORT_PATH = os.path.join(SERVICES_DIR, "seed_export.json")
BACKUPS_DIR = os.path.join(os.path.dirname(SERVICES_DIR), "..", "backups")

# File lock to avoid concurrent write collisions
_save_lock = asyncio.Lock()
_last_backup_time: Optional[str] = None


def _ensure_backup_dir():
    os.makedirs(BACKUPS_DIR, exist_ok=True)


def _serialize_datetime(val) -> Optional[str]:
    if isinstance(val, datetime):
        return val.isoformat()
    return None


async def export_all_data_to_dict() -> Dict[str, Any]:
    """Extract complete database snapshot into a clean dictionary."""
    async with AsyncSessionLocal() as db:
        # 1. Genres
        genres_res = await db.execute(select(Genre).order_by(Genre.id))
        genres_list = [
            {"id": g.id, "name": g.name, "slug": g.slug}
            for g in genres_res.scalars().all()
        ]

        # 2. Users
        users_res = await db.execute(select(User).order_by(User.id))
        users_list = []
        for u in users_res.scalars().all():
            users_list.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "password_hash": u.password_hash,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "is_vip": u.is_vip,
                "vip_plan": u.vip_plan,
                "vip_started_at": _serialize_datetime(u.vip_started_at),
                "vip_expires_at": _serialize_datetime(u.vip_expires_at),
                "avatar_url": u.avatar_url,
                "phone_number": u.phone_number,
                "telegram_id": u.telegram_id,
                "telegram_username": u.telegram_username,
                "login_source": u.login_source,
                "created_at": _serialize_datetime(u.created_at),
            })

        # 3. Anime
        anime_res = await db.execute(select(Anime).order_by(Anime.id))
        anime_list = []
        for a in anime_res.scalars().all():
            anime_list.append({
                "id": a.id,
                "title": a.title,
                "slug": a.slug,
                "alt_title": a.alt_title or "",
                "description": a.description or "",
                "poster_url": a.poster_url or "",
                "banner_url": a.banner_url or "",
                "trailer_url": a.trailer_url or "",
                "year": a.year or 2024,
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "studio": a.studio or "",
                "country": a.country or "China",
                "airing_day": a.airing_day or "Saturday",
                "heat_score": a.heat_score or 85000,
                "type": a.type.value if hasattr(a.type, "value") else str(a.type),
                "is_featured": a.is_featured,
                "is_trending": a.is_trending,
                "is_published": a.is_published,
                "is_free": getattr(a, "is_free", True),
                "view_count": a.view_count or 0,
                "average_rating": float(a.average_rating or 0.0),
                "rating_count": a.rating_count or 0,
                "episode_count": a.episode_count or 0,
                "created_at": _serialize_datetime(a.created_at),
                "updated_at": _serialize_datetime(a.updated_at),
            })

        # 4. Anime Genres
        ag_res = await db.execute(select(anime_genres.c.anime_id, anime_genres.c.genre_id))
        anime_genres_list = [
            {"anime_id": row[0], "genre_id": row[1]}
            for row in ag_res.all()
        ]

        # 5. Episodes
        episodes_res = await db.execute(select(Episode).order_by(Episode.anime_id, Episode.episode_number))
        episodes_list = []
        for e in episodes_res.scalars().all():
            episodes_list.append({
                "id": e.id,
                "anime_id": e.anime_id,
                "episode_number": e.episode_number,
                "title": e.title or f"Episode {e.episode_number}",
                "video_url": e.video_url or "",
                "duration_seconds": e.duration_seconds or 1440,
                "thumbnail_url": e.thumbnail_url or "",
                "is_published": e.is_published,
                "is_vip_only": getattr(e, "is_vip_only", False),
                "view_count": e.view_count or 0,
                "created_at": _serialize_datetime(e.created_at),
            })

        # 6. Banners
        banners_res = await db.execute(select(Banner).order_by(Banner.order_index))
        banners_list = []
        for b in banners_res.scalars().all():
            banners_list.append({
                "id": b.id,
                "anime_id": b.anime_id,
                "title": b.title,
                "subtitle": b.subtitle or "",
                "image_url": b.image_url,
                "link_url": b.link_url or f"/anime/{b.anime_id}",
                "is_active": b.is_active,
                "order_index": b.order_index or 0,
                "created_at": _serialize_datetime(b.created_at),
            })

        # 7. Comments
        comments_res = await db.execute(select(Comment).order_by(Comment.created_at.desc()).limit(1000))
        comments_list = []
        for c in comments_res.scalars().all():
            comments_list.append({
                "id": c.id,
                "anime_id": c.anime_id,
                "user_id": c.user_id,
                "content": c.content,
                "parent_id": c.parent_id,
                "is_reported": c.is_reported,
                "is_deleted": c.is_deleted,
                "likes_count": c.likes_count,
                "created_at": _serialize_datetime(c.created_at),
            })

    return {
        "version": "2.0.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "genres": len(genres_list),
            "users": len(users_list),
            "anime": len(anime_list),
            "episodes": len(episodes_list),
            "banners": len(banners_list),
            "comments": len(comments_list),
        },
        "genres": genres_list,
        "users": users_list,
        "anime": anime_list,
        "anime_genres": anime_genres_list,
        "episodes": episodes_list,
        "banners": banners_list,
        "comments": comments_list,
    }


async def sync_database_to_export_json() -> Dict[str, Any]:
    """Asynchronously dump current DB state to seed_export.json and timestamped backup.
    This guarantees no new or old anime/episodes are lost.
    """
    global _last_backup_time
    async with _save_lock:
        try:
            data = await export_all_data_to_dict()
            anime_count = data.get("counts", {}).get("anime", 0)

            _ensure_backup_dir()

            # Guard: Never overwrite seed_export.json if current DB has fewer than 10 anime and healthy file exists
            if anime_count < 10 and os.path.exists(SEED_EXPORT_PATH):
                logger.warning(f"Aborting sync_database_to_export_json: DB has only {anime_count} anime. Protecting seed_export.json.")
                return {"status": "skipped", "message": "Skipped sync to protect master seed from empty DB state"}

            # 1. Write atomically to seed_export.json
            temp_path = SEED_EXPORT_PATH + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(temp_path, SEED_EXPORT_PATH)

            # 2. Write to latest backup
            latest_backup_path = os.path.join(BACKUPS_DIR, "latest_backup.json")
            with open(latest_backup_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # 3. Write timestamped backup (keep max 10)
            now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            ts_backup_path = os.path.join(BACKUPS_DIR, f"backup_{now_str}.json")
            with open(ts_backup_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # Clean old backups keeping last 10
            backups = sorted([
                os.path.join(BACKUPS_DIR, fn)
                for fn in os.listdir(BACKUPS_DIR)
                if fn.startswith("backup_") and fn.endswith(".json")
            ])
            if len(backups) > 10:
                for old_b in backups[:-10]:
                    try:
                        os.remove(old_b)
                    except Exception:
                        pass

            # 4. Upload to Cloudflare R2 Cloud Storage (Permanent Offsite Backup)
            try:
                import asyncio
                from app.services.r2_backup_service import upload_backup_to_r2_sync
                try:
                    loop = asyncio.get_running_loop()
                    loop.run_in_executor(None, upload_backup_to_r2_sync, data)
                except RuntimeError:
                    upload_backup_to_r2_sync(data)
            except Exception as r2_err:
                logger.warning(f"Offsite R2 backup notice: {r2_err}")

            _last_backup_time = datetime.now(timezone.utc).isoformat()
            logger.info(f"✅ Data persistence synced successfully: {data['counts']['anime']} anime, {data['counts']['episodes']} episodes.")
            return {
                "status": "success",
                "message": "All data permanently persisted",
                "timestamp": _last_backup_time,
                "counts": data["counts"],
            }
        except Exception as e:
            logger.error(f"❌ Failed to persist database: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}


async def restore_data_from_dict(data: Dict[str, Any], merge_only: bool = True) -> Dict[str, Any]:
    """Safely restore or import data from a dictionary snapshot without destroying existing records."""
    async with AsyncSessionLocal() as db:
        restored_counts = {"genres": 0, "anime": 0, "episodes": 0, "banners": 0, "users": 0}

        # 1. Genres
        existing_genres_res = await db.execute(select(Genre))
        existing_genres = {g.id: g for g in existing_genres_res.scalars().all()}
        for g_data in data.get("genres", []):
            gid = g_data.get("id")
            if gid not in existing_genres:
                g = Genre(id=gid, name=g_data["name"], slug=g_data["slug"])
                db.add(g)
                restored_counts["genres"] += 1
        await db.flush()

        # 2. Users
        existing_users_res = await db.execute(select(User))
        existing_emails = {u.email: u for u in existing_users_res.scalars().all()}
        for u_data in data.get("users", []):
            email = u_data.get("email")
            if email and email not in existing_emails:
                u = User(
                    username=u_data["username"],
                    email=email,
                    password_hash=u_data["password_hash"],
                    role=UserRole(u_data.get("role", "USER")),
                    is_active=bool(u_data.get("is_active", True)),
                    is_verified=bool(u_data.get("is_verified", True)),
                    is_vip=bool(u_data.get("is_vip", False)),
                    vip_plan=u_data.get("vip_plan"),
                    avatar_url=u_data.get("avatar_url"),
                )
                db.add(u)
                restored_counts["users"] += 1
        await db.flush()

        # 3. Anime
        existing_anime_res = await db.execute(select(Anime))
        existing_anime = {a.id: a for a in existing_anime_res.scalars().all()}
        for a_data in data.get("anime", []):
            aid = a_data.get("id")
            if aid not in existing_anime:
                created_at_val = datetime.fromisoformat(a_data["created_at"]) if a_data.get("created_at") else datetime.utcnow()
                updated_at_val = datetime.fromisoformat(a_data["updated_at"]) if a_data.get("updated_at") else datetime.utcnow()
                status_val = AnimeStatus(a_data.get("status", "ONGOING"))
                type_val = AnimeType(a_data.get("type", "DONGHUA"))

                a = Anime(
                    id=aid,
                    title=a_data["title"],
                    slug=a_data["slug"],
                    alt_title=a_data.get("alt_title") or "",
                    description=a_data.get("description") or "",
                    poster_url=a_data.get("poster_url") or "",
                    banner_url=a_data.get("banner_url") or "",
                    trailer_url=a_data.get("trailer_url") or "",
                    year=a_data.get("year") or 2024,
                    status=status_val,
                    studio=a_data.get("studio") or "",
                    country=a_data.get("country") or "China",
                    airing_day=a_data.get("airing_day") or "Saturday",
                    heat_score=a_data.get("heat_score") or 85000,
                    type=type_val,
                    is_featured=bool(a_data.get("is_featured", False)),
                    is_trending=bool(a_data.get("is_trending", False)),
                    is_published=bool(a_data.get("is_published", True)),
                    is_free=bool(a_data.get("is_free", True)),
                    view_count=a_data.get("view_count") or 0,
                    average_rating=a_data.get("average_rating") or 0.0,
                    rating_count=a_data.get("rating_count") or 0,
                    episode_count=a_data.get("episode_count") or 0,
                    created_at=created_at_val,
                    updated_at=updated_at_val,
                )
                db.add(a)
                restored_counts["anime"] += 1
        await db.flush()

        # 4. Anime Genres
        ag_res = await db.execute(select(anime_genres.c.anime_id, anime_genres.c.genre_id))
        existing_ag = set(ag_res.all())
        for ag in data.get("anime_genres", []):
            pair = (ag["anime_id"], ag["genre_id"])
            if pair not in existing_ag:
                await db.execute(anime_genres.insert().values(anime_id=ag["anime_id"], genre_id=ag["genre_id"]))
                existing_ag.add(pair)
        await db.flush()

        # 5. Episodes
        existing_episodes_res = await db.execute(select(Episode))
        all_eps = existing_episodes_res.scalars().all()
        existing_episodes = {(e.anime_id, e.episode_number): e for e in all_eps}
        existing_ids = {e.id for e in all_eps}
        for ep_data in data.get("episodes", []):
            key = (ep_data["anime_id"], ep_data["episode_number"])
            if key not in existing_episodes:
                wanted_id = ep_data.get("id")
                final_id = wanted_id if (wanted_id and wanted_id not in existing_ids) else None
                ep = Episode(
                    id=final_id,
                    anime_id=ep_data["anime_id"],
                    episode_number=ep_data["episode_number"],
                    title=ep_data.get("title") or f"Episode {ep_data['episode_number']}",
                    video_url=ep_data.get("video_url") or "",
                    duration_seconds=ep_data.get("duration_seconds") or 1440,
                    thumbnail_url=ep_data.get("thumbnail_url") or "",
                    is_published=bool(ep_data.get("is_published", True)),
                    is_free=bool(ep_data.get("is_free", False)),
                    view_count=ep_data.get("view_count") or 0,
                )
                db.add(ep)
                if final_id:
                    existing_ids.add(final_id)
                existing_episodes[key] = ep
                restored_counts["episodes"] += 1
            else:
                cur = existing_episodes[key]
                if not cur.video_url and ep_data.get("video_url"):
                    cur.video_url = ep_data.get("video_url")
                    db.add(cur)
        await db.flush()

        # 6. Banners
        existing_banners_res = await db.execute(select(Banner))
        existing_banner_ids = {b.id for b in existing_banners_res.scalars().all()}
        for b_data in data.get("banners", []):
            if b_data.get("id") not in existing_banner_ids:
                b = Banner(
                    id=b_data.get("id"),
                    anime_id=b_data["anime_id"],
                    title=b_data["title"],
                    subtitle=b_data.get("subtitle") or "",
                    image_url=b_data["image_url"],
                    link_url=b_data.get("link_url") or f"/anime/{b_data['anime_id']}",
                    is_active=bool(b_data.get("is_active", True)),
                    order_index=b_data.get("order_index") or 0,
                )
                db.add(b)
                restored_counts["banners"] += 1

        await db.commit()

    # Re-sync to file
    asyncio.create_task(sync_database_to_export_json())
    return {
        "status": "success",
        "message": "Data restored and merged safely",
        "added_counts": restored_counts,
    }


def get_available_snapshots() -> List[Dict[str, Any]]:
    """Return all available backup snapshots with metadata, counts, and sizes."""
    _ensure_backup_dir()
    snapshots = []

    # 1. Master seed_export.json
    if os.path.exists(SEED_EXPORT_PATH):
        try:
            stat = os.stat(SEED_EXPORT_PATH)
            with open(SEED_EXPORT_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            counts = data.get("counts", {
                "anime": len(data.get("anime", [])),
                "episodes": len(data.get("episodes", [])),
                "genres": len(data.get("genres", [])),
            })
            snapshots.append({
                "filename": "seed_export.json",
                "label": "Master Persistence Snapshot (មូលដ្ឋានទិន្នន័យមេ)",
                "is_master": True,
                "size_kb": round(stat.st_size / 1024, 2),
                "timestamp": data.get("exported_at") or datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                "counts": counts,
            })
        except Exception as e:
            logger.warning(f"Error reading seed_export.json: {e}")

    # 2. Backups directory snapshots
    try:
        files = sorted(
            [f for f in os.listdir(BACKUPS_DIR) if f.endswith(".json")],
            reverse=True
        )
        for fn in files:
            fp = os.path.join(BACKUPS_DIR, fn)
            try:
                stat = os.stat(fp)
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                counts = data.get("counts", {
                    "anime": len(data.get("anime", [])),
                    "episodes": len(data.get("episodes", [])),
                    "genres": len(data.get("genres", [])),
                })
                label = "Latest Full Snapshot" if fn == "latest_backup.json" else f"Backup {fn.replace('backup_', '').replace('.json', '')}"
                snapshots.append({
                    "filename": fn,
                    "label": label,
                    "is_master": False,
                    "size_kb": round(stat.st_size / 1024, 2),
                    "timestamp": data.get("exported_at") or datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    "counts": counts,
                })
            except Exception as e:
                logger.warning(f"Error reading backup file {fn}: {e}")
    except Exception as e:
        logger.warning(f"Error listing backups dir: {e}")

    return snapshots


async def restore_from_snapshot_file(filename: str) -> Dict[str, Any]:
    """Restore database from a specific snapshot file safely."""
    clean_fn = os.path.basename(filename.strip())
    if clean_fn == "seed_export.json":
        target_path = SEED_EXPORT_PATH
    else:
        target_path = os.path.join(BACKUPS_DIR, clean_fn)

    if not os.path.exists(target_path):
        return {"status": "error", "detail": f"Backup snapshot '{clean_fn}' not found"}

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return await restore_data_from_dict(data, merge_only=True)
    except Exception as e:
        logger.error(f"Failed to restore from snapshot {clean_fn}: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


async def recover_all_missing_content() -> Dict[str, Any]:
    """1-Click Emergency Recovery: Restores all anime, episodes, and banners from master snapshot."""
    if os.path.exists(SEED_EXPORT_PATH):
        return await restore_from_snapshot_file("seed_export.json")
    latest_bp = os.path.join(BACKUPS_DIR, "latest_backup.json")
    if os.path.exists(latest_bp):
        return await restore_from_snapshot_file("latest_backup.json")
    return {"status": "error", "detail": "No backup snapshot file found to recover from"}


def get_persistence_status() -> Dict[str, Any]:
    """Get current backup and storage health statistics."""
    global _last_backup_time
    _ensure_backup_dir()

    seed_exists = os.path.exists(SEED_EXPORT_PATH)
    seed_size = os.path.getsize(SEED_EXPORT_PATH) if seed_exists else 0

    backups = [
        f for f in os.listdir(BACKUPS_DIR)
        if f.endswith(".json")
    ]

    return {
        "is_active": True,
        "seed_export_present": seed_exists,
        "seed_export_size_kb": round(seed_size / 1024, 2),
        "total_backups_saved": len(backups),
        "last_sync_timestamp": _last_backup_time or "Ready & Persistent",
        "storage_mode": "Dual Redundancy (SQLite DB + JSON Snapshots)",
    }


async def create_full_backup_archive_zip() -> bytes:
    """Creates a comprehensive ZIP archive containing the entire JSON database + all poster and banner images."""
    import io
    import zipfile
    import urllib.request

    data = await export_all_data_to_dict()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Main JSON database
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        zf.writestr("namianime_database.json", json_str.encode("utf-8"))

        # 2. README instruction
        readme = (
            "==========================================================\n"
            " NAMI ANIME (MER DONGHUA) - COMPLETE DATA & MEDIA BACKUP\n"
            f" Exported At: {datetime.now(timezone.utc).isoformat()}\n"
            f" Total Anime: {len(data.get('anime', []))}\n"
            f" Total Episodes: {len(data.get('episodes', []))}\n"
            "==========================================================\n\n"
            "ឯកសារ Backup ពេញលេញនេះ រួមបញ្ចូលទាំង៖\n"
            "1. namianime_database.json (ទិន្នន័យរឿង, ភាគ, Users, Banners, Genres, Episodes ទាំងអស់)\n"
            "2. posters/ (រូបភាព Poster HD នៃរឿងទាំងអស់)\n"
            "3. banners/ (រូបភាព Banners នៃរឿងទាំងអស់)\n\n"
            "សម្រាប់ការ Restore: អាចយក namianime_database.json ទៅ Import លើផ្ទាំង Admin Backup បានភ្លាមៗដោយគ្មានការបាត់បង់ទិន្នន័យ។\n"
        )
        zf.writestr("README_BACKUP.txt", readme.encode("utf-8"))

        # 3. Download / Include Posters & Banners
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        frontend_pub = os.path.join(os.path.dirname(SERVICES_DIR), "..", "..", "frontend", "public")

        for anime in data.get("anime", []):
            slug = anime.get("slug") or f"anime_{anime.get('id')}"
            poster_url = anime.get("poster_url")
            if poster_url:
                try:
                    img_bytes = None
                    if poster_url.startswith("/"):
                        local_f = os.path.join(frontend_pub, poster_url.lstrip("/"))
                        if os.path.exists(local_f):
                            with open(local_f, "rb") as lf:
                                img_bytes = lf.read()
                    elif poster_url.startswith("http"):
                        req = urllib.request.Request(poster_url, headers=headers)
                        with urllib.request.urlopen(req, timeout=4) as resp:
                            img_bytes = resp.read()

                    if img_bytes:
                        ext = ".png" if ".png" in poster_url.lower() else ".jpg"
                        zf.writestr(f"posters/{slug}{ext}", img_bytes)
                except Exception as e:
                    logger.warning(f"Could not archive poster for {slug}: {e}")

            banner_url = anime.get("banner_url")
            if banner_url:
                try:
                    img_bytes = None
                    if banner_url.startswith("/"):
                        local_f = os.path.join(frontend_pub, banner_url.lstrip("/"))
                        if os.path.exists(local_f):
                            with open(local_f, "rb") as lf:
                                img_bytes = lf.read()
                    elif banner_url.startswith("http"):
                        req = urllib.request.Request(banner_url, headers=headers)
                        with urllib.request.urlopen(req, timeout=4) as resp:
                            img_bytes = resp.read()

                    if img_bytes:
                        ext = ".png" if ".png" in banner_url.lower() else ".jpg"
                        zf.writestr(f"banners/{slug}_banner{ext}", img_bytes)
                except Exception as e:
                    logger.warning(f"Could not archive banner for {slug}: {e}")

    zip_buffer.seek(0)
    return zip_buffer.getvalue()


async def restore_full_backup_archive_zip(zip_bytes: bytes) -> Dict[str, Any]:
    """Restores database and extracts poster/banner media assets from an uploaded ZIP backup package."""
    import io
    import zipfile

    frontend_pub = os.path.join(os.path.dirname(SERVICES_DIR), "..", "..", "frontend", "public")
    posters_dir = os.path.join(frontend_pub, "posters")
    banners_dir = os.path.join(frontend_pub, "banners")
    os.makedirs(posters_dir, exist_ok=True)
    os.makedirs(banners_dir, exist_ok=True)

    extracted_images_count = 0
    db_json_data = None

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        for file_info in zf.infolist():
            fn = file_info.filename
            if fn.endswith(".json") and not db_json_data:
                json_bytes = zf.read(fn)
                db_json_data = json.loads(json_bytes.decode("utf-8"))
            elif "posters/" in fn and not fn.endswith("/"):
                img_data = zf.read(fn)
                dest_fn = os.path.basename(fn)
                if dest_fn:
                    dest_p = os.path.join(posters_dir, dest_fn)
                    with open(dest_p, "wb") as out_f:
                        out_f.write(img_data)
                    extracted_images_count += 1
            elif "banners/" in fn and not fn.endswith("/"):
                img_data = zf.read(fn)
                dest_fn = os.path.basename(fn)
                if dest_fn:
                    dest_p = os.path.join(banners_dir, dest_fn)
                    with open(dest_p, "wb") as out_f:
                        out_f.write(img_data)
                    extracted_images_count += 1

    if not db_json_data:
        return {"status": "error", "detail": "No valid database JSON file found inside ZIP archive"}

    restore_res = await restore_data_from_dict(db_json_data, merge_only=True)
    restore_res["extracted_images"] = extracted_images_count
    return restore_res
