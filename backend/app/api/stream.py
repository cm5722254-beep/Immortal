import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
import httpx

from app.core.database import get_db
from app.models.episode import Episode
from app.models.user import User, UserRole
from app.core.security import decode_token
from app.dependencies.auth import require_admin, require_staff_or_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming Proxy"])

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
    """Verifies that the incoming stream request is authorized (User MUST be logged in)."""
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

        if not user.is_vip_active:
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


class BulkEpisodeImportItem(BaseModel):
    episode_number: int
    title: Optional[str] = None
    video_url: str
    is_free: Optional[bool] = False


class BulkImportRequest(BaseModel):
    anime_id: int
    episodes: List[BulkEpisodeImportItem]


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
