"""Create durable episode stills from public Cloudflare R2 video objects."""
import json
import os
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from app.services.r2_backup_service import get_r2_client


def _public_r2_domain() -> str:
    configured = os.getenv("R2_PUBLIC_DOMAIN", "").strip()
    if configured:
        return configured.rstrip("/")

    paths = [
        Path(__file__).resolve().parents[2] / "r2_config.json",
        Path(__file__).resolve().parents[3] / "r2_config.json",
        Path("r2_config.json"),
        Path("backend/r2_config.json"),
    ]
    for path in paths:
        try:
            with path.open("r", encoding="utf-8") as config_file:
                value = json.load(config_file).get("public_domain", "")
            if value:
                return value.rstrip("/")
        except (OSError, ValueError, AttributeError):
            continue
    return ""


def create_episode_thumbnail(video_url: str, anime_id: int, episode_number: int) -> str:
    """Extract a small JPEG frame and save it in the configured public R2 bucket."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("Thumbnail generation is unavailable: FFmpeg is not installed on the API server.")

    video = urlparse(video_url)
    public_domain = _public_r2_domain()
    public_host = urlparse(public_domain).hostname if public_domain else None
    video_host = (video.hostname or "").lower()
    if video.scheme != "https" or not video_host or not public_host or video_host != public_host.lower():
        raise ValueError("Only video links from the configured public R2 domain can be used to generate thumbnails.")

    command = [
        ffmpeg,
        "-hide_banner", "-loglevel", "error", "-nostdin",
        "-rw_timeout", "20000000",
        "-ss", "5", "-i", video_url,
        "-frames:v", "1", "-vf", "scale=640:-2",
        "-q:v", "4", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
    ]
    try:
        result = subprocess.run(command, capture_output=True, timeout=30, check=False)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("The video took too long to load. Try again later.") from exc
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError("Could not extract a frame from this video. Check that the R2 link is playable.")

    client, bucket = get_r2_client()
    if not client or not bucket:
        raise RuntimeError("R2 storage is not configured on the API server.")

    key = f"episode-thumbnails/{anime_id}/episode-{episode_number}.jpg"
    client.put_object(Bucket=bucket, Key=key, Body=result.stdout, ContentType="image/jpeg", CacheControl="public, max-age=86400")
    return f"{public_domain}/{key}"
