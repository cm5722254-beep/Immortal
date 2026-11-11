"""
Standalone 24/7 Cloud Auto-Sync Worker for MerDonghua Telegram Channels.
Reuses the core sync, download, FFmpeg compression, and Telethon upload engine
from backend/app/api/telegram_channel_sync.py, adds an optional standalone HTTP
status dashboard on 0.0.0.0:$PORT, and uses an exclusive TELEGRAM_USER_SESSION ENV.
"""

from __future__ import annotations

import asyncio
import html
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
import uvicorn
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse

WORKER_DIR = Path(__file__).resolve().parent
REPO_ROOT = WORKER_DIR.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Cloud worker always opts into 24/7 daemon when TELEGRAM_USER_SESSION is present
os.environ.setdefault("ENABLE_24_7_SYNC", "1")
os.environ.setdefault("FORCE_24_7_SYNC", "1")

from app.api import telegram_channel_sync as tcs  # noqa: E402


def configure_worker_storage() -> Path:
    """Point checkpoint, config, and temp video storage to a persistent volume when configured."""
    default_data_dir = "/data/telegram_sync" if os.name != "nt" and Path("/data").exists() else str(WORKER_DIR / "cloud_data")
    data_dir = Path(os.getenv("SYNC_DATA_DIR", default_data_dir)).resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    temp_dir = data_dir / "temp_videos_cloud"
    temp_dir.mkdir(parents=True, exist_ok=True)

    tcs.SYNC_WORK_DIR = data_dir
    tcs.CHECKPOINT_PATH = data_dir / "tg_sync_checkpoint.json"
    tcs.CONFIG_PATH = data_dir / "tg_sync_config.json"
    tcs.TEMP_VIDEO_DIR = temp_dir
    return data_dir


def _verify_secret(x_worker_secret: Optional[str], secret: Optional[str]) -> None:
    expected = os.getenv("WORKER_ADMIN_SECRET", "").strip()
    if not expected:
        return
    provided = (x_worker_secret or secret or "").strip()
    if provided != expected:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid WORKER_ADMIN_SECRET")


async def _optional_bot_command_loop() -> None:
    """
    Optional standalone Telegram Bot API command poller (/sync_status, /sync_start, /sync_stop, /sync_audit).
    Enable ONLY when this worker is deployed standalone without the main backend polling the same bot token.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    enabled = os.getenv("ENABLE_BOT_COMMANDS", "0").strip().lower() in ("1", "true", "yes")
    if not enabled or not token:
        return

    base_url = f"https://api.telegram.org/bot{token}"
    offset = 0
    tcs.add_log("Standalone Bot Command Poller started (ENABLE_BOT_COMMANDS=1).", "info")
    async with httpx.AsyncClient(timeout=35.0) as client:
        while True:
            try:
                resp = await client.get(f"{base_url}/getUpdates", params={"offset": offset, "timeout": 25})
                if resp.status_code != 200:
                    await asyncio.sleep(5)
                    continue
                for upd in resp.json().get("result", []):
                    offset = max(offset, upd["update_id"] + 1)
                    msg = upd.get("message") or {}
                    text = (msg.get("text") or "").strip().split()[0].lower() if msg.get("text") else ""
                    chat_id = msg.get("chat", {}).get("id")
                    if not chat_id or not text.startswith("/sync_"):
                        continue
                    reply = await _handle_bot_sync_command(text)
                    await client.post(f"{base_url}/sendMessage", json={"chat_id": chat_id, "text": reply})
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(5)


async def _handle_bot_sync_command(cmd: str) -> str:
    if cmd == "/sync_status":
        st = tcs.sync_state
        return (
            f"MerDonghua Cloud Worker\n"
            f"- Running: {st.get('is_running')}\n"
            f"- Current Anime: {st.get('current_anime_title') or '-'}\n"
            f"- Episode: {st.get('current_episode') or '-'} ({st.get('current_step') or '-'})\n"
            f"- Progress: {st.get('progress_percent', 0)}%\n"
            f"- Uploaded This Run: {st.get('uploaded_count', 0)}"
        )
    if cmd == "/sync_audit":
        summary = await tcs.audit_all_matched_channels()
        return f"Channel Audit complete: {summary}"
    if cmd == "/sync_start":
        incomplete_ids = [
            int(a["id"])
            for a in tcs.sync_state.get("catalog_anime", [])
            if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
            and a.get("channel_audit", {}).get("status") != "complete"
        ]
        if not incomplete_ids:
            return "All matched channels appear complete. Run /sync_audit first if needed."
        started = tcs.trigger_sync_queue_async(incomplete_ids, is_resume=False)
        return f"Queued {len(incomplete_ids)} anime for upload." if started else "Sync is already running."
    if cmd == "/sync_stop":
        tcs.sync_state["should_stop"] = True
        return "Stop signal sent; worker will pause cleanly after the active step."
    return "Supported commands: /sync_status, /sync_audit, /sync_start, /sync_stop"


@asynccontextmanager
async def lifespan(_: FastAPI):
    data_dir = configure_worker_storage()
    has_session = bool(os.getenv("TELEGRAM_USER_SESSION", "").strip())
    print(f"[CloudWorker] Storage dir : {data_dir}")
    print(f"[CloudWorker] Session ENV : {'CONFIGURED' if has_session else 'MISSING (Standby)'}")
    print(f"[CloudWorker] Preset      : {os.getenv('COMPRESSION_PRESET', '720p_low_mb')}")

    daemon_task = asyncio.create_task(tcs.start_24_7_channel_sync_daemon())
    bot_task = asyncio.create_task(_optional_bot_command_loop())
    try:
        yield
    finally:
        daemon_task.cancel()
        bot_task.cancel()


app = FastAPI(title="MerDonghua 24/7 Telegram Cloud Sync Worker", lifespan=lifespan)


@app.get("/health")
async def health() -> JSONResponse:
    env_sess = bool(os.getenv("TELEGRAM_USER_SESSION", "").strip())
    st = tcs.sync_state
    return JSONResponse(
        {
            "status": "ok",
            "mode": "cloud_24_7_worker",
            "session_configured": env_sess,
            "is_running": st.get("is_running", False),
            "current_anime_id": st.get("current_anime_id"),
            "current_anime_title": st.get("current_anime_title"),
            "current_episode": st.get("current_episode"),
            "current_step": st.get("current_step"),
            "progress_percent": st.get("progress_percent", 0),
            "uploaded_count": st.get("uploaded_count", 0),
            "checkpoint": st.get("checkpoint", {}),
            "logs_tail": list(st.get("logs", []))[-25:],
        }
    )


@app.get("/", response_class=HTMLResponse)
async def status_page() -> str:
    st = tcs.sync_state
    env_sess = bool(os.getenv("TELEGRAM_USER_SESSION", "").strip())
    logs_lines = []
    for item in list(st.get("logs", []))[-30:]:
        line = f"[{item.get('time', '')}] {item.get('msg', '')}" if isinstance(item, dict) else str(item)
        logs_lines.append(f"<div><code>{html.escape(line)}</code></div>")
    logs_html = "\n".join(logs_lines)
    badge = "ACTIVE (ENV SET)" if env_sess else "STANDBY (SET TELEGRAM_USER_SESSION)"
    return f"""<!doctype html>
<html lang="km">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="8" />
  <title>MerDonghua 24/7 Cloud Worker</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px; background: #0f172a; color: #e2e8f0; }}
    .card {{ background: #1e293b; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #334155; }}
    code {{ color: #93c5fd; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>MerDonghua Telegram 24/7 Cloud Sync Worker</h2>
    <p><strong>Session Status:</strong> {badge}</p>
    <p><strong>Running:</strong> {st.get("is_running")} | <strong>Progress:</strong> {st.get("progress_percent", 0)}%</p>
    <p><strong>Current Anime:</strong> {html.escape(str(st.get("current_anime_title") or "-"))} | <strong>Ep:</strong> {html.escape(str(st.get("current_episode") or "-"))}</p>
    <p><strong>Step:</strong> {html.escape(str(st.get("current_step") or "-"))} | <strong>Uploaded:</strong> {st.get("uploaded_count", 0)}</p>
  </div>
  <div class="card">
    <h3>Recent Worker Logs (auto-refresh 8s)</h3>
    {logs_html or "<div>No logs yet.</div>"}
  </div>
</body>
</html>"""


@app.post("/api/sync/audit")
async def trigger_audit(
    x_worker_secret: Optional[str] = Header(default=None),
    secret: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    _verify_secret(x_worker_secret, secret)
    return await tcs.audit_all_matched_channels()


@app.post("/api/sync/start")
async def trigger_start(
    x_worker_secret: Optional[str] = Header(default=None),
    secret: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    _verify_secret(x_worker_secret, secret)
    await tcs.audit_all_matched_channels()
    incomplete_ids = [
        int(a["id"])
        for a in tcs.sync_state.get("catalog_anime", [])
        if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
        and a.get("channel_audit", {}).get("status") != "complete"
    ]
    started = tcs.trigger_sync_queue_async(incomplete_ids, is_resume=False) if incomplete_ids else False
    return {"started": started, "queued_anime_ids": incomplete_ids}


@app.post("/api/sync/stop")
async def trigger_stop(
    x_worker_secret: Optional[str] = Header(default=None),
    secret: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    _verify_secret(x_worker_secret, secret)
    tcs.sync_state["should_stop"] = True
    return {"stopping": True}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
