import logging
import csv
import io
import re
import unicodedata
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
import httpx

from app.core.database import get_db
from app.models.episode import Episode
from app.models.anime import Anime
from app.models.user import User, UserRole
from app.core.security import decode_token
from app.dependencies.auth import require_admin, require_staff_or_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming Proxy"])

CSV_TITLE_ALIASES = {
    "ក្បាច់គុនព្រះអសុរ៉ា": 40,
    "កំណត់ថ្ងៃក្លាយជាអាទិទេព": 12,
    "កំនើតវីរៈបុរសនាគរាជ": 23,
    "កំពូលឃាតករគ្មានគូប្រៀប": 22,
    "ខ្សែជីវិតឯការ": 28,
    "ខ្សែជីវិតអធិរាជអមតៈ": 30,
    "គុកវិញ្ញាណ": 38,
    "គុជអមតះធានី": 1,
    "គ្រូពេទ្យទេវតា": 50,
    "ច្បាប់បិសាច": 56,
    "ច្រកទ្វារវេទមន្តអាថ៏កំបាំង": 34,
    "ឆន្ទៈអមតៈ": 8,
    "ជ្រើសរើសវាសនា": 31,
    "ដាវទិពឈិនភីនអាន": 17,
    "ដាវទេពជូសៀន": 41,
    "ដាវអមត ជីងធាន": 19,
    "ដំណើរឆ្ពោះទៅរកកំរិតអាទិទេព": 29,
    "ដំណើរស្វែងរកអាទិទេព": 21,
    "ទឹកដីថាមពលវិញ្ញាណ វគ្គ២": 5,
    "ទេពធីតាអមតៈ": 54,
    "និទានព្រះបុរាណ": 14,
    "បណ្ឌិតសភាក្បាច់គុនបូព៌ា": 11,
    "ប្រយុទ្ធទៅកាន់មេឃា វគ្គ៥": 4,
    "ប្រហារព្រះ": 18,
    "ប្រហារព្រះ វគ្ក២": 49,
    "ផ្នូរអាទិទេព រដូវទី៣": 15,
    "ពិភពថាមពលវេទមន្ត": 2,
    "ពិភពនៃក្បាច់គុន វគ្គ៦": 26,
    "ពិភពអាថ៏កំបាំង": 16,
    "ភ្លើងសង្គ្រាមបំផ្លាញផែនដី": 33,
    "មួយកាំបិតរញ្ជួយមេឃ": 13,
    "រន្ទះដាវឆ្មាំពិឃាត": 32,
    "រាត្រីអន្ធការ": 24,
    "លោកប្តីអស្ចារ្យ": 25,
    "វីរៈបុរសស៊ូឈីង": 20,
    "សង្គ្រាមគ្រោះមហន្តរាយ": 67,
    "សង្គ្រាមស្ដេចអមតៈ": 68,
    "សម្ពន្ធ័មនុស្សអាក្រក់": 37,
    "សិស្សច្បងកំពូលល្បិច": 9,
    "ស្តេចកំណប់ទូចានឡុង": 10,
    "ហានលី": 3,
}


def _normalize_csv_title(value: str) -> str:
    value = unicodedata.normalize("NFC", value)
    value = re.sub(r"[\u200b-\u200f\u2060\ufeff]", "", value)
    return " ".join(value.split()).strip().casefold()


def _parse_csv_episode(row: dict) -> tuple[str, int] | None:
    clean_title = (row.get("Clean Movie Title") or row.get("anime_title") or row.get("title") or "").strip()
    match = re.fullmatch(
        r"(?P<series>.+?)\s+(?:ភាគ\s*(?P<khmer>[0-9០-៩]+)|(?:episode|ep\.?)\s*(?P<english>[0-9]+)|E(?P<short>[0-9]{1,3}))",
        clean_title,
        flags=re.IGNORECASE,
    )
    if match:
        digits = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")
        raw_number = match.group("khmer") or match.group("english") or match.group("short")
        return match.group("series").strip(), int(raw_number.translate(digits))

    filename = row.get("Filename") or row.get("filename") or ""
    number_match = re.search(r"(?:ep|episode)[-_ ]?([0-9]+)", filename, re.IGNORECASE)
    if number_match:
        return clean_title, int(number_match.group(1))
    return None

# Global client for persistent connection pooling and streaming
_http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=120.0, write=60.0, pool=60.0),
            follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=100, max_connections=300),
            verify=False,
        )
    return _http_client


def build_upstream_headers(request: Request, real_url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
    }
    if "nintanime.com" in real_url:
        headers["Referer"] = "https://nintanime.com/"
        headers["Origin"] = "https://nintanime.com"
    elif "mediadelivery.net" in real_url or "b-cdn.net" in real_url:
        headers["Referer"] = "https://iframe.mediadelivery.net/"
        headers["Origin"] = "https://iframe.mediadelivery.net"
    elif "s3." in real_url:
        headers["Referer"] = "https://nintanime.com/"

    # Pass along range header if provided by video player
    range_header = request.headers.get("range")
    if range_header:
        headers["range"] = range_header

    return headers


async def verify_stream_vip(request: Request, db: AsyncSession, episode: Optional[Episode] = None) -> Optional[User]:
    """Verifies that the incoming stream request is authorized (User MUST be logged in).
    
    Rules:
    - All users MUST be logged in to stream.
    - Admin/Owner/Staff bypass all VIP checks.
    - Episodes with is_free=True or is_free=None => any logged-in user can watch.
    - Episodes with is_free=False => VIP, active promo, or matching active series trial required.
    """
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "token" in request.query_params:
        token = request.query_params["token"].strip()

    # User MUST be logged in!
    if not token:
        raise HTTPException(
            status_code=401,
            detail="សូមចូលគណនីជាមុនសិន ដើម្បីទស្សនាវីដេអូ (Please log in to watch videos)."
        )

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid auth token")

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=403, detail="User account is disabled or not found")

        # ✅ Admin / Owner / Staff always bypass VIP checks
        if user.role in ("ADMIN", "OWNER", "STAFF"):
            return user

        # ✅ If episode is free (is_free=True or is_free=None/unset), allow all logged-in users
        # Only lock if is_free is explicitly set to False (VIP-only episode)
        episode_is_vip_only = episode is not None and getattr(episode, "is_free", None) is False
        if not episode_is_vip_only:
            return user  # Free episode — any logged-in user can watch

        # ⚠️ Episode is VIP-only (is_free=False) — check VIP membership status
        if not user.is_vip_active:
            from datetime import datetime, timezone
            trial_expiry = user.trial_expires_at
            if trial_expiry and trial_expiry.tzinfo is None:
                trial_expiry = trial_expiry.replace(tzinfo=timezone.utc)
            if (
                episode is not None
                and user.trial_anime_id == episode.anime_id
                and trial_expiry is not None
                and trial_expiry > datetime.now(timezone.utc)
            ):
                return user

            from app.api.site_settings import load_promo_config, compute_promo_status
            config = load_promo_config()
            promo = compute_promo_status(config)
            if not promo.get("is_active"):
                raise HTTPException(
                    status_code=403,
                    detail="VIP membership required. Please contact Admin or upgrade your VIP plan."
                )
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Stream auth verification failed: {e}")
        raise HTTPException(status_code=403, detail="Unauthorized video stream access")




@router.get("/proxy")
async def stream_raw_proxy(
    url: str,
    request: Request,
):
    """Universal direct video stream proxy that injects proper upstream headers."""
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")

    real_url = url.strip()
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    try:
        upstream_req = client.build_request("GET", real_url, headers=req_headers)
        upstream_res = await client.send(upstream_req, stream=True)

        content_type = upstream_res.headers.get("Content-Type", "video/mp4")
        forward_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        }

        if "Content-Range" in upstream_res.headers:
            forward_headers["Content-Range"] = upstream_res.headers["Content-Range"]
        if "Content-Length" in upstream_res.headers:
            forward_headers["Content-Length"] = upstream_res.headers["Content-Length"]

        async def video_iterator():
            try:
                async for chunk in upstream_res.aiter_bytes(chunk_size=65536):
                    yield chunk
            except Exception:
                pass
            finally:
                await upstream_res.aclose()

        return StreamingResponse(
            video_iterator(),
            status_code=upstream_res.status_code,
            headers=forward_headers,
            media_type=content_type,
        )
    except Exception as e:
        logger.error(f"Proxy stream raw error: {e}")
        raise HTTPException(status_code=502, detail="Failed to stream video from host")


class BulkEpisodeImportItem(BaseModel):
    episode_number: int
    title: Optional[str] = None
    video_url: str
    is_free: Optional[bool] = False


class BulkImportRequest(BaseModel):
    anime_id: int
    episodes: List[BulkEpisodeImportItem]


@router.get("/csv-export")
async def export_episode_csv(
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_staff_or_admin),
):
    """Download published anime and episode video links as a re-importable CSV."""
    result = await db.execute(
        select(Anime, Episode)
        .join(Episode, Episode.anime_id == Anime.id)
        .where(Anime.is_published == True, Episode.is_published == True)
        .order_by(Anime.id, Episode.episode_number)
    )
    rows = result.all()
    output = io.StringIO(newline="")
    output.write("\ufeff")
    writer = csv.DictWriter(output, fieldnames=[
        "Anime ID",
        "Clean Movie Title",
        "Episode ID",
        "Episode Number",
        "Episode Title",
        "Source Type",
        "Quality",
        "video_url",
        "Public URL",
        "Status",
    ])
    writer.writeheader()
    for anime, episode in rows:
        video_url = (episode.video_url or "").strip()
        writer.writerow({
            "Anime ID": anime.id,
            "Clean Movie Title": f"{anime.title} ភាគ {episode.episode_number}",
            "Episode ID": episode.id,
            "Episode Number": episode.episode_number,
            "Episode Title": episode.title or f"ភាគ {episode.episode_number}",
            "video_url": video_url,
            "Status": "completed" if video_url else "NO_LINK",
        })
        for quality in episode.video_qualities or []:
            quality_url = (quality.get("src") or "").strip()
            if not quality_url:
                continue
            writer.writerow({
                "Anime ID": anime.id,
                "Clean Movie Title": f"{anime.title} ភាគ {episode.episode_number}",
                "Episode ID": episode.id,
                "Episode Number": episode.episode_number,
                "Episode Title": episode.title or f"ភាគ {episode.episode_number}",
                "Source Type": "quality",
                "Quality": (quality.get("label") or "").strip(),
                "video_url": "",
                "Public URL": quality_url,
                "Status": "completed",
            })
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="anime_video_links.csv"',
            "X-Exported-Rows": str(len(rows)),
        },
    )


@router.post("/csv-import")
async def import_episode_csv(
    file: UploadFile = File(...),
    apply: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_staff_or_admin),
):
    """Preview or apply episode links from a CSV using resolved anime titles and episode numbers."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")
    content = await file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV file must be 10 MB or smaller")
    try:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid UTF-8 CSV: {exc}") from exc

    if not reader.fieldnames or not rows:
        raise HTTPException(status_code=400, detail="CSV must include a header and at least one data row")

    anime_result = await db.execute(select(Anime).where(Anime.is_published == True))
    anime_list = anime_result.scalars().all()
    anime_by_id = {anime.id: anime for anime in anime_list}
    title_index: dict[str, list[Anime]] = {}
    for anime in anime_list:
        for title in (anime.title, anime.alt_title, anime.slug):
            normalized = _normalize_csv_title(title or "")
            if normalized:
                title_index.setdefault(normalized, []).append(anime)

    has_quality_columns = any(
        field.strip().casefold() in {"quality", "source type", "source_type"}
        for field in reader.fieldnames
    )
    parsed_rows: dict[tuple[int, int], dict] = {}
    skipped: list[dict] = []
    conflicts: list[dict] = []
    for line_number, row in enumerate(rows, start=2):
        status_value = (row.get("Status") or "completed").strip().casefold()
        if status_value not in {"", "completed", "complete", "success", "ok"}:
            skipped.append({"row": line_number, "reason": f"status is {status_value}"})
            continue

        video_url = (row.get("Public URL") or row.get("video_url") or row.get("Video Link URL") or "").strip()
        if not video_url:
            skipped.append({"row": line_number, "reason": "video URL is empty"})
            continue
        if not re.match(r"^https?://", video_url, re.IGNORECASE):
            skipped.append({"row": line_number, "reason": "video URL must use http or https"})
            continue

        source_type = (row.get("Source Type") or row.get("source_type") or "").strip().casefold()
        quality_label = (row.get("Quality") or row.get("quality") or "").strip()
        primary_source_types = {"primary", "main", "default", "original"}
        alternate_source_types = {"quality", "alternate", "alternate quality"}
        is_primary_quality = source_type in primary_source_types and bool(quality_label)
        is_quality_source = source_type in alternate_source_types or (bool(quality_label) and not source_type)
        if is_quality_source and not quality_label:
            conflicts.append({"row": line_number, "reason": "quality source is missing its Quality label"})
            continue
        if source_type and source_type not in primary_source_types | alternate_source_types:
            conflicts.append({"row": line_number, "reason": f"unsupported source type: {source_type}"})
            continue

        parsed = _parse_csv_episode(row)
        if not parsed:
            skipped.append({"row": line_number, "reason": "could not resolve episode number from title or filename"})
            continue
        series_title, episode_number = parsed

        anime_id_value = (row.get("Anime ID") or row.get("anime_id") or row.get("ID" if "Public URL" not in row else "") or "").strip()
        anime = None
        if anime_id_value.isdigit() and int(anime_id_value) in anime_by_id:
            anime = anime_by_id[int(anime_id_value)]
        else:
            matches = title_index.get(_normalize_csv_title(series_title), [])
            unique_matches = {candidate.id: candidate for candidate in matches}
            if not unique_matches:
                alias_id = next(
                    (anime_id for alias, anime_id in CSV_TITLE_ALIASES.items() if _normalize_csv_title(alias) == _normalize_csv_title(series_title)),
                    None,
                )
                anime = anime_by_id.get(alias_id) if alias_id else None
            elif len(unique_matches) == 1:
                anime = next(iter(unique_matches.values()))
            else:
                conflicts.append({"row": line_number, "title": series_title, "reason": "anime title matches multiple catalog entries"})
                continue

        if anime is None:
            skipped.append({"row": line_number, "title": series_title, "reason": "anime title did not match the catalog"})
            continue

        key = (anime.id, episode_number)
        previous = parsed_rows.get(key)
        if previous and is_primary_quality:
            if previous.get("primary_is_quality_fallback"):
                previous["video_url"] = video_url
                previous["primary_is_quality_fallback"] = False
            elif previous["video_url"] != video_url:
                conflicts.append({"row": line_number, "title": series_title, "episode_number": episode_number, "reason": "duplicate episode has different primary video URLs"})
                continue
            same_label = next((quality for quality in previous["video_qualities"] if quality["label"].casefold() == quality_label.casefold()), None)
            if same_label and same_label["src"] != video_url:
                conflicts.append({"row": line_number, "title": series_title, "episode_number": episode_number, "reason": f"quality {quality_label} has different video URLs"})
            elif not same_label:
                previous["video_qualities"].append({"label": quality_label, "src": video_url})
            previous["quality_data_provided"] = True
            continue
        if previous and is_quality_source:
            same_label = next((quality for quality in previous["video_qualities"] if quality["label"].casefold() == quality_label.casefold()), None)
            if same_label and same_label["src"] != video_url:
                conflicts.append({"row": line_number, "title": series_title, "episode_number": episode_number, "reason": f"quality {quality_label} has different video URLs"})
            elif not same_label:
                previous["video_qualities"].append({"label": quality_label, "src": video_url})
            previous["quality_data_provided"] = True
            continue
        if previous and not is_quality_source and previous.get("primary_is_quality_fallback"):
            previous["video_url"] = video_url
            previous["primary_is_quality_fallback"] = False
            continue
        if previous and previous["video_url"] != video_url:
            conflicts.append({"row": line_number, "title": series_title, "episode_number": episode_number, "reason": "duplicate episode has different video URLs"})
            parsed_rows.pop(key, None)
            continue
        parsed_rows[key] = {
            "anime_id": anime.id,
            "anime_title": anime.title,
            "episode_number": episode_number,
            "episode_title": (row.get("Episode Title") or row.get("title") or f"ភាគ {episode_number}").strip(),
            "video_url": video_url,
            "video_qualities": ([{"label": quality_label, "src": video_url}] if is_quality_source or is_primary_quality else []),
            "quality_data_provided": has_quality_columns,
            "primary_is_quality_fallback": is_quality_source,
        }

    keys = list(parsed_rows)
    existing_result = await db.execute(
        select(Episode).where(
            Episode.anime_id.in_([anime_id for anime_id, _ in keys]),
            Episode.episode_number.in_([episode_number for _, episode_number in keys]),
        ) if keys else select(Episode).where(Episode.id == -1)
    )
    existing_by_key: dict[tuple[int, int], list[Episode]] = {}
    for episode in existing_result.scalars().all():
        existing_by_key.setdefault((episode.anime_id, episode.episode_number), []).append(episode)

    preview = []
    for key, item in parsed_rows.items():
        existing = existing_by_key.get(key, [])
        if len(existing) > 1:
            conflicts.append({"title": item["anime_title"], "episode_number": item["episode_number"], "reason": "database contains duplicate episode numbers"})
            continue
        source_changed = bool(existing and existing[0].video_url != item["video_url"])
        qualities_changed = bool(
            existing
            and item["quality_data_provided"]
            and (existing[0].video_qualities or []) != item["video_qualities"]
        )
        action = "add" if not existing else ("update" if source_changed or qualities_changed else "unchanged")
        preview.append({**item, "action": action})

    counts = {action: sum(1 for item in preview if item["action"] == action) for action in ("add", "update", "unchanged")}
    if apply:
        if conflicts:
            raise HTTPException(status_code=409, detail={"message": "Resolve CSV conflicts before applying", "conflicts": conflicts, "preview": counts})
        for item in preview:
            if item["action"] == "unchanged":
                continue
            key = (item["anime_id"], item["episode_number"])
            existing = existing_by_key.get(key, [])
            if existing:
                existing[0].video_url = item["video_url"]
                if item["quality_data_provided"]:
                    existing[0].video_qualities = item["video_qualities"]
            else:
                db.add(Episode(
                    anime_id=item["anime_id"],
                    episode_number=item["episode_number"],
                    title=item["episode_title"],
                    video_url=item["video_url"],
                    video_qualities=item["video_qualities"],
                    duration_seconds=1200,
                    is_published=True,
                    is_free=item["episode_number"] <= 3,
                ))
        affected_anime_ids = {item["anime_id"] for item in preview if item["action"] == "add"}
        for anime_id in affected_anime_ids:
            anime = anime_by_id[anime_id]
            episode_count = await db.scalar(
                select(func.count()).where(Episode.anime_id == anime_id, Episode.is_published == True)
            )
            anime.episode_count = (episode_count or 0) + sum(
                1 for item in preview if item["anime_id"] == anime_id and item["action"] == "add"
            )
        await db.commit()
        try:
            from app.core.redis import delete_cache_pattern
            import asyncio
            asyncio.create_task(delete_cache_pattern("episodes:*"))
            asyncio.create_task(delete_cache_pattern("anime:*"))
            from app.services.data_persistence import sync_database_to_export_json
            asyncio.create_task(sync_database_to_export_json())
        except Exception:
            logger.exception("CSV import succeeded but cache/persistence refresh did not start")

    return {
        "applied": apply,
        "counts": counts,
        "preview": preview[:500],
        "preview_truncated": len(preview) > 500,
        "skipped": skipped[:200],
        "conflicts": conflicts[:200],
    }


@router.post("/bulk-import")
async def bulk_import_episodes(
    data: BulkImportRequest,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_staff_or_admin),
):
    """
    Bulk Import & Generator API: Add or update multiple episodes in an anime from R2/direct URLs.
    """
    from app.models.anime import Anime
    anime_res = await db.execute(select(Anime).where(Anime.id == data.anime_id))
    anime = anime_res.scalar_one_or_none()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    added_count = 0
    updated_count = 0

    for item in data.episodes:
        # Check if episode number already exists
        ep_res = await db.execute(
            select(Episode).where(
                Episode.anime_id == data.anime_id,
                Episode.episode_number == item.episode_number
            )
        )
        existing_ep = ep_res.scalar_one_or_none()

        title_text = item.title or f"ភាគ {item.episode_number}"
        if existing_ep:
            existing_ep.video_url = item.video_url.strip()
            existing_ep.title = title_text
            existing_ep.is_free = item.is_free if item.is_free is not None else existing_ep.is_free
            updated_count += 1
        else:
            new_ep = Episode(
                anime_id=data.anime_id,
                episode_number=item.episode_number,
                title=title_text,
                video_url=item.video_url.strip(),
                is_free=item.is_free or False,
                view_count=0,
            )
            db.add(new_ep)
            added_count += 1

    await db.commit()

    # Dispatch Telegram notification & auto-persist
    try:
        from app.services.telegram_service import notify_new_episode
        from app.services.data_persistence import sync_database_to_export_json
        import asyncio
        
        anime = await db.get(Anime, data.anime_id)
        if anime and data.episodes:
            latest_item = data.episodes[-1]
            ep_res = await db.execute(
                select(Episode).where(
                    Episode.anime_id == data.anime_id,
                    Episode.episode_number == latest_item.episode_number
                )
            )
            latest_ep = ep_res.scalar_one_or_none()
            if latest_ep:
                asyncio.create_task(notify_new_episode(anime, latest_ep))
        
        asyncio.create_task(sync_database_to_export_json())
    except Exception:
        pass

    return {
        "success": True,
        "anime_id": data.anime_id,
        "added": added_count,
        "updated": updated_count,
        "total": len(data.episodes)
    }




# ==============================================================================
# ⚡ DYNAMIC HLS PLAYLIST GENERATOR & SEGMENT CHUNKER (NO RAW MP4 EXPOSURE)
# ==============================================================================
@router.get("/hls/{episode_id}/master.m3u8")
async def generate_hls_playlist(
    episode_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a real-time HLS Playlist (.m3u8) for any episode.
    Chunks the stream into 6-second cryptographic segments so clients never see raw .mp4 or R2 links.
    """
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode or not episode.video_url:
        raise HTTPException(status_code=404, detail="Episode video stream not found")

    real_url = episode.video_url.strip()

    # If the source is already native HLS (.m3u8), proxy the manifest directly
    if ".m3u8" in real_url:
        client = get_http_client()
        req_headers = build_upstream_headers(request, real_url)
        try:
            res = await client.get(real_url, headers=req_headers)
            return Response(
                content=res.text,
                media_type="application/vnd.apple.mpegurl",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                }
            )
        except Exception as e:
            logger.error(f"Failed to fetch native HLS manifest: {e}")

    # For MP4 / R2 files: generate dynamic byte-range HLS Playlist
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    total_bytes = 0
    try:
        head_res = await client.head(real_url, headers=req_headers)
        if "Content-Length" in head_res.headers:
            total_bytes = int(head_res.headers["Content-Length"])
    except Exception as e:
        logger.warning(f"Could not retrieve Content-Length for HLS generation: {e}")

    # Default chunk size: ~1.5 MB per 4-6 second segment (or 40 segments if size unknown)
    chunk_size = 1500000
    num_segments = max(1, (total_bytes // chunk_size) + 1) if total_bytes > 0 else 50
    target_duration = 6

    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:4",
        f"#EXT-X-TARGETDURATION:{target_duration}",
        "#EXT-X-MEDIA-SEQUENCE:0",
        "#EXT-X-PLAYLIST-TYPE:VOD",
    ]

    base_url = str(request.base_url).rstrip("/")
    for idx in range(num_segments):
        start_byte = idx * chunk_size
        end_byte = min(total_bytes - 1, start_byte + chunk_size - 1) if total_bytes > 0 else start_byte + chunk_size - 1
        seg_bytes = end_byte - start_byte + 1
        
        lines.append(f"#EXTINF:{target_duration:.1f},")
        if total_bytes > 0:
            lines.append(f"#EXT-X-BYTERANGE:{seg_bytes}@{start_byte}")
        lines.append(f"{base_url}/api/stream/hls/{episode_id}/segment_{idx}.ts")

    lines.append("#EXT-X-ENDLIST")
    manifest_content = "\n".join(lines)

    return Response(
        content=manifest_content,
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
        }
    )


@router.get("/hls/{episode_id}/segment_{segment_idx}.ts")
async def stream_hls_segment(
    episode_id: int,
    segment_idx: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Streams a single 6-second video chunk for HLS playback.
    Directs from R2 / host using byte ranges without exposing real URL.
    """
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode or not episode.video_url:
        raise HTTPException(status_code=404, detail="Episode video stream not found")

    real_url = episode.video_url.strip()
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    chunk_size = 1500000
    start_byte = segment_idx * chunk_size
    end_byte = start_byte + chunk_size - 1

    # Override range header for segment
    req_headers["range"] = f"bytes={start_byte}-{end_byte}"

    try:
        upstream_req = client.build_request("GET", real_url, headers=req_headers)
        upstream_res = await client.send(upstream_req, stream=True)

        forward_headers = {
            "Content-Type": "video/MP2T",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        }

        async def segment_iterator():
            try:
                async for chunk in upstream_res.aiter_bytes(chunk_size=32768):
                    yield chunk
            except Exception:
                pass
            finally:
                await upstream_res.aclose()

        return StreamingResponse(
            segment_iterator(),
            status_code=200,
            headers=forward_headers,
            media_type="video/MP2T",
        )
    except Exception as e:
        logger.error(f"HLS segment error {segment_idx} for episode {episode_id}: {e}")
        raise HTTPException(status_code=502, detail="Segment stream failed")


class SignStreamRequest(BaseModel):
    episode_id: int
    expires_in_seconds: Optional[int] = 86400  # Default 24 hours


class SignStreamResponse(BaseModel):
    episode_id: int
    expires_at: int
    signature: str
    signed_url: str
    direct_stream_path: str


@router.post("/sign", response_model=SignStreamResponse)
async def generate_signed_stream_url(
    data: SignStreamRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_staff_or_admin),
):
    """
    Generates a secure HMAC-SHA256 Signed Stream URL for an episode.
    Prevents unauthorized hotlinking and expires automatically.
    """
    from app.core.security import sign_stream_url

    # Check episode exists
    result = await db.execute(select(Episode).where(Episode.id == data.episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    expires_at, sig = sign_stream_url(
        episode_id=data.episode_id,
        expires_in_seconds=data.expires_in_seconds or 86400
    )

    base_url = str(request.base_url).rstrip("/")
    signed_path = f"/api/stream/signed?episodeId={data.episode_id}&expires={expires_at}&sig={sig}"
    full_signed_url = f"{base_url}{signed_path}"

    return {
        "episode_id": data.episode_id,
        "expires_at": expires_at,
        "signature": sig,
        "signed_url": full_signed_url,
        "direct_stream_path": signed_path
    }


@router.get("/signed")
async def stream_signed_video(
    episodeId: int,
    expires: int,
    sig: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    High-performance secure video streaming endpoint verified by HMAC-SHA256 signature.
    Works directly with browser <video> and external players.
    """
    from app.core.security import verify_stream_signature

    if not verify_stream_signature(episode_id=episodeId, expires_at=expires, sig=sig):
        raise HTTPException(
            status_code=403,
            detail="Signed stream link is invalid or has expired. Please request a new playback session."
        )

    result = await db.execute(select(Episode).where(Episode.id == episodeId))
    episode = result.scalar_one_or_none()
    if not episode or not episode.video_url:
        raise HTTPException(status_code=404, detail="Episode video not found")

    real_url = episode.video_url.strip()
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    try:
        upstream_req = client.build_request("GET", real_url, headers=req_headers)
        upstream_res = await client.send(upstream_req, stream=True)

        content_type = upstream_res.headers.get("Content-Type", "video/mp4")
        forward_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        }

        if "Content-Range" in upstream_res.headers:
            forward_headers["Content-Range"] = upstream_res.headers["Content-Range"]
        if "Content-Length" in upstream_res.headers:
            forward_headers["Content-Length"] = upstream_res.headers["Content-Length"]

        async def video_iterator():
            try:
                async for chunk in upstream_res.aiter_bytes(chunk_size=65536):
                    yield chunk
            except Exception:
                pass
            finally:
                await upstream_res.aclose()

        return StreamingResponse(
            video_iterator(),
            status_code=upstream_res.status_code,
            headers=forward_headers,
            media_type=content_type,
        )
    except Exception as e:
        logger.error(f"Signed stream proxy error for episode {episodeId}: {e}")
        raise HTTPException(status_code=502, detail="Failed to stream video from host")


@router.head("/{episode_id}")
async def stream_head(
    episode_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode or not episode.video_url:
        raise HTTPException(status_code=404, detail="Episode video stream not found")

    await verify_stream_vip(request, db, episode)
    real_url = episode.video_url.strip()
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    try:
        upstream_res = await client.head(real_url, headers=req_headers)
        forward_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": upstream_res.headers.get("Content-Type", "video/mp4"),
        }
        if "Content-Length" in upstream_res.headers:
            forward_headers["Content-Length"] = upstream_res.headers["Content-Length"]
        return Response(status_code=upstream_res.status_code, headers=forward_headers)
    except Exception as e:
        logger.error(f"Proxy stream head error for episode {episode_id}: {e}")
        return Response(status_code=200, headers={"Accept-Ranges": "bytes", "Content-Type": "video/mp4"})


@router.get("/{episode_id}")
async def stream_video(
    episode_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode or not episode.video_url:
        raise HTTPException(status_code=404, detail="Episode video stream not found")

    await verify_stream_vip(request, db, episode)

    real_url = episode.video_url.strip()
    client = get_http_client()
    req_headers = build_upstream_headers(request, real_url)

    try:
        upstream_req = client.build_request("GET", real_url, headers=req_headers)
        upstream_res = await client.send(upstream_req, stream=True)

        content_type = upstream_res.headers.get("Content-Type", "video/mp4")
        forward_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        }

        if "Content-Range" in upstream_res.headers:
            forward_headers["Content-Range"] = upstream_res.headers["Content-Range"]
        if "Content-Length" in upstream_res.headers:
            forward_headers["Content-Length"] = upstream_res.headers["Content-Length"]

        async def video_iterator():
            try:
                async for chunk in upstream_res.aiter_bytes(chunk_size=65536):
                    yield chunk
            except Exception:
                pass
            finally:
                await upstream_res.aclose()

        return StreamingResponse(
            video_iterator(),
            status_code=upstream_res.status_code,
            headers=forward_headers,
            media_type=content_type,
        )
    except Exception as e:
        logger.error(f"Proxy stream error for episode {episode_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to stream video from host")

