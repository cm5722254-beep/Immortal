#!/usr/bin/env python3
"""
MER DONGHUA — Website to Telegram Channel Auto-Downloader & Sync Studio (Production v3.0)
=========================================================================================
Key Capabilities:
1. Permanent Telegram Account Persistence:
   - Saves session in BOTH SQLite (merdonghua_user_session.session) AND StringSession backup
     inside tg_sync_config.json so the user NEVER needs to log in again.
2. Crash-Safe / Power-Outage Resume Engine (tg_sync_checkpoint.json):
   - Saves queue state and per-episode upload registry to disk after every single episode.
   - If the tool is closed or power goes out, upon restart it automatically resumes from the
     exact unfinished anime & episode without ever duplicating already-uploaded episodes.
3. Live Telegram Channel Audit & Anti-Duplicate Guard:
   - Before every anime AND before every episode, verifies live channel history:
     * If the anime has Episode 1 on the website and the channel is missing Episode 1
       (e.g. only has Ep 5..10 or Ep 8..26), it deletes the incomplete messages in the channel
       and uploads cleanly starting from Episode 1 (1..N).
     * If the channel already has a valid prefix starting from Episode 1 (e.g. Ep 1..5 out of 1..10,
       or Ep 1..50 out of 1..100), it skips 1..5 and continues uploading from Episode 6+.
     * If an episode already exists in the channel (when starting from Ep 1), it skips it immediately.
4. FFmpeg Smart Low-MB Compression (H.264 + faststart) for instant Telegram inline streaming.
5. Global Production iOS 27 White Liquid Glass GUI (Pure SVG Icons, Poster Thumbnails, Filter Tabs).
"""

import os
import sys
import re
import json
import time
import shutil
import asyncio
import datetime
import threading
import subprocess
import webbrowser
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional, Tuple, Set

# ── Auto-relaunch inside venv-py313 if Telethon is not in current interpreter ──
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
VENV_PY = ROOT_DIR / "venv-py313" / "Scripts" / "python.exe"

try:
    import telethon  # noqa: F401
except ImportError:
    if VENV_PY.exists() and Path(sys.executable).resolve() != VENV_PY.resolve():
        print(f"[*] Switching to virtual environment: {VENV_PY}")
        res = subprocess.run([str(VENV_PY), *sys.argv])
        sys.exit(res.returncode)
    else:
        raise

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from telethon import TelegramClient, errors, functions, types, utils
from telethon.sessions import StringSession
from telethon.tl.types import DocumentAttributeVideo, MessageMediaDocument

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = shutil.which("ffmpeg") or "ffmpeg"

# ── Constants & Paths ────────────────────────────────────────────────────────
PORT = 5199
WORK_DIR = Path(__file__).resolve().parent
WORK_DIR.mkdir(parents=True, exist_ok=True)

TEMP_VIDEO_DIR = WORK_DIR / "temp_videos"
TEMP_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_PATH = WORK_DIR / "tg_sync_config.json"
CHECKPOINT_PATH = WORK_DIR / "tg_sync_checkpoint.json"
SESSION_PATH = str(WORK_DIR / "merdonghua_user_session")

DEFAULT_FOLDER_LINK = "https://t.me/addlist/7NvrQmWmBNUwZDNl"
DEFAULT_PHONE = "+855888162192"
DEFAULT_API_ID = 2040
DEFAULT_API_HASH = "b18441a1ff607e10a989891a5462e627"

DEFAULT_CAPTION_TEMPLATE = (
    "👉Episode : {ep_num}\n"
    "👉Quality : 4K Ultra HD\n"
    "👉Subtitle : Chinese\n\n"
    "កុំភ្លេចហៅមិត្តភក្តិឲ្យមើលឲ្យច្រើនៗណាដើម្បីលើកទឹកចិត្ត Admin អគុណ❤️។"
)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
KM_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")

# ── 100% Verified Anime ID -> Telegram Folder Channel ID Mapping ─────────────
VERIFIED_ANIME_CHANNEL_MAP: Dict[int, int] = {
    1: -1003966318421,     # គុជអមតះធៀននី (ភាគ 1-108) -> គុជអមតះធានី 1-108
    1001: -1004460045186,  # គុជអមតះធៀននី (ភាគ 109+)  -> គុជអមតះធានី 109ឡើង
    2: -1004299262362,     # ពិភពនៃថាមពលវេទមន្ត -> ពិភពថាមពលវេទមន្ត
    3: -1004383626596,     # ដំណើស្វែងរកជីវិតអមតះ (Fanren / Han Li) -> ហានលី
    4: -1004359097963,     # ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥ -> ប្រយុទ្ធទៅកាន់មេឃា វគ្គ៥
    5: -1003713666544,     # ទឹកដីថាមពលវិញ្ញាណ វគ្ក២ -> ទឹកដីថាមពលវិញ្ញាណ វគ្គ២ ថ្មី
    6: -1004379363944,     # អាថ៌កំបាំងស្ថានសួគ៏ -> អាថ៌កំបាំងស្ថានសួគ៏
    7: -1004359660656,     # លេបផ្កាយ -> លេបផ្កាយ
    8: -1004397629543,     # ឆន្ទៈដ៏អស់កល្បជានិច្ច -> ឆន្ទៈអមតៈ
    9: -1003826552431,     # សិស្សច្បងកំពូលល្បិច -> សិស្សច្បងកំពូលល្បិច
    10: -1004286948144,    # អាទិទេពកំណប់ (zhu zhanlong) -> ស្តេចកំណប់ទូចានឡុង
    11: -1004424159444,    # បណ្ឌិតសភាក្បាច់គុណ -> បណ្ឌិតសភាក្បាច់គុនបូព៌ា
    12: -1004484774771,    # កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព -> កំណត់ថ្ងៃក្លាយជាអាទិទេព
    13: -1003848520726,    # កាំបិតមួយទៅកាន់ឋានសួគ៌ -> មួយកាំបិតរញ្ជួយមេឃ
    14: -1004466395269,    # ព្រេងនិទានរបស់ព្រះ (Qin Muer) -> និទានព្រះបុរាណ
    15: -1004458203834,    # ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣ -> ផ្នូរអាទិទេព រដូវទី៣
    16: -1004339599968,    # ខ្សែស្រឡាយនៃវាសនា (诡秘之主) -> ពិភពអាថ៏កំបាំង
    17: -1004454527094,    # អាទិទេពដាវ ឈិនភីងអាន វគ្ក២ -> ដាវទិពឈិនភីនអាន
    18: -1004314575327,    # ប្រហាអាទិទេព -> ប្រហារព្រះ
    19: -1004299284924,    # ស្ដេចដាវអមតះ (Sword and Fairy) -> ដាវអមត:ជីងធាន
    20: -1004428880906,    # មិនមែនពេលវាលានិងលំហរ (Xu Qing) -> វីរៈបុរសស៊ូឈីង
    21: -1004303466604,    # ស្វែងរកអាថកំបាំងអាទិទេព -> ដំណើរស្វែងរកអាទិទេព
    22: -1004480606059,    # ឃាតករអេលាន -> កំពូលឃាតករគ្មានគូប្រៀប
    23: -1003819008046,    # អ្នកប្រយុទ្ទឈាមនាគ (Coiling Dragon) -> កំនើតវីរៈបុរសនាគរាជ
    24: -1003778821950,    # យប់នៃការស្លាប់ (Ever Night) -> រាត្រីអន្ធការ
    25: -1004388776014,    # លោកប្ដីអឆរិយះ -> លោកប្តីអស្ចារ្យ
    26: -1004340185217,    # បុព្វបុរសក្បាច់គុណ វគ្ក៦ -> ពិភពក្បាច់គុន វគ្គ៦
    27: -1004428933078,    # យុទ្ទសិល្ប៍អមតះ វគ្ក៥ -> អមតៈភាពក្បាច់គុន
    28: -1004441056503,    # ផ្លូវមាគាកំសត់ -> ខ្សែជីវិតឯការ
    29: -1004459726612,    # ដំណើទៅកាន់ឋាណះអាទិទេព -> ដំណើរឆ្ពោះទៅរកកំរិតអាទិទេព
    30: -1004286121945,    # ដំណើអធិរាធអមតះ -> ខ្សែជីវិតអធិរាជអមតៈ
    31: -1003941733924,    # ប្រឆាំងនិងវាសនា -> ជ្រើសរើសវាសនា
    32: -1004449108231,    # រន្ទះដាវអ្នកប្រយុទ្ធ -> រន្ទះដាវឆ្មាំពិឃាត
    33: -1003944485299,    # ភ្លើងសង្រ្គាមបំផ្លាញលោក -> ភ្លើងសង្គ្រាមបំផ្លាញផែនដី
    34: -1004404239996,    # ច្រកទ្វាអាថកំបាំង -> ច្រកទ្វារវេទមន្តអាថ៏កំបាំង
    35: -1004405360186,    # ត្រើយម្ខាងនែសំហរ -> អាថ៌កំបាំងលំហ
    37: -1004461114905,    # សម្ព័នមនុស្សអាក្រក់ វគ្ក៧ -> សម្ពន្ធ័មនុស្សអាក្រក់
    38: -1003982245499,    # គុកវិញ្ញាណ -> គុកវិញ្ញាណ
    40: -1004355415996,    # អាទិទេពអាស៊ូរ៉ា វគ្ក ២ -> ក្បាច់គុនព្រះអសុរ៉ា
    41: -1004434250644,    # ដាវទេព ជូសៀន វគ្ក ៤ -> ដាវទេពជូសៀន វគ្គ៤
    50: -1004299041537,    # គ្រូពេទ្យទេវតា -> គ្រូពេទ្យទេវតា
    51: -1003974238554,    # រាជបុត្រនាគរាជ -> រាជបុត្រនាគរាជ
    52: -1004327876662,    # មហាទេវរាជ -> មហាទេវរាជ
    53: -1004390275877,    # អាទិទេពប្រម៉ាញ់បិសាច -> អ្នកប្រម៉ាញ់បិសាច វគ្គ ១
    54: -1003780776426,    # ទេពធីតាអមតៈ -> ទេពធីតាអមតៈ
    55: -1003933061598,    # អាទិទេពប្រឆាំងស្ថានសួគ៌ -> អាទិទេពប្រឆាំងស្ថានសួគ៌
    56: -1003909652537,    # ច្បាប់បិសាច -> ច្បាប់បិសាច
    57: -1003768121069,    # ព្រេងនិទានស៊ានវូ -> ព្រេងនិទានស៊ានវូ
    58: -1004322490156,    # មេបក្សសៀនឡុង -> មេបក្សសៀនឡុង
    59: -1004319112460,    # កំណត់ត្រាពន្លឺទេវភាព -> កំណត់ត្រាពន្លឺទេវភាព
    63: -1004263693768,    # អាទិទេពប្រម៉ាញ់បិសាច រដូវកាលទី២ -> កប្រម៉ាញ់បិសាច វគ្គ ២
    76: -1004301645763,    # ពិភពក្បាច់គុន វគ្គ៥ -> ពិភពក្បាច់គុន វគ្គ៥
}


def khmer_to_ascii_digits(text: str) -> str:
    return (text or "").translate(KM_DIGITS)


def load_config() -> Dict[str, Any]:
    default_cfg = {
        "phone": DEFAULT_PHONE,
        "api_id": DEFAULT_API_ID,
        "api_hash": DEFAULT_API_HASH,
        "session_string": "",
        "folder_link": DEFAULT_FOLDER_LINK,
        "caption_template": DEFAULT_CAPTION_TEMPLATE,
        "include_title_in_caption": False,
        "compression_preset": "720p_low_mb",
        "delay_seconds": 10,
        "auto_reset_incomplete_channel": True,
        "auto_resume_on_startup": True,
        "delete_temp_after_upload": True,
        "api_base": "https://merdonghua-com.onrender.com/api",
        "local_videos_dir": r"D:\MerDonghua_Videos" if os.path.exists("D:\\") else str(ROOT_DIR / "downloaded_videos"),
        "channel_overrides": {},
    }
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
            default_cfg.update(saved)
        except Exception:
            pass
    return default_cfg


def save_config(cfg: Dict[str, Any]) -> None:
    tmp = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    tmp.replace(CONFIG_PATH)


# ── Persistent Crash-Safe Checkpoint Manager ─────────────────────────────────
checkpoint_lock = threading.Lock()


def load_checkpoint() -> Dict[str, Any]:
    default_cp = {
        "unfinished_queue": False,
        "active_queue_anime_ids": [],
        "completed_anime_ids": [],
        "current_anime_id": None,
        "current_ep_num": None,
        "uploaded_registry": {},  # "{channel_id}:{ep_num}" -> {"anime_id": int, "ep": int, "ts": str}
        "cleaned_channels": {},   # "{channel_id}" -> timestamp when broken history was wiped
        "total_uploaded_all_time": 0,
        "last_updated": "",
    }
    if CHECKPOINT_PATH.exists():
        try:
            with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
            default_cp.update(saved)
        except Exception:
            pass
    return default_cp


def save_checkpoint(cp: Dict[str, Any]) -> None:
    with checkpoint_lock:
        cp["last_updated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tmp = CHECKPOINT_PATH.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cp, f, ensure_ascii=False, indent=2)
        tmp.replace(CHECKPOINT_PATH)


def mark_episode_uploaded_in_checkpoint(anime_id: int, channel_id: int, ep_num: int) -> None:
    cp = load_checkpoint()
    key = f"{channel_id}:{ep_num}"
    cp.setdefault("uploaded_registry", {})[key] = {
        "anime_id": anime_id,
        "ep": ep_num,
        "ts": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    cp["current_anime_id"] = anime_id
    cp["current_ep_num"] = ep_num
    cp["total_uploaded_all_time"] = len(cp["uploaded_registry"])
    save_checkpoint(cp)


# ── Global State & Logging ───────────────────────────────────────────────────
state_lock = threading.Lock()
app_state: Dict[str, Any] = {
    "tg_connected": False,
    "tg_authorized": False,
    "tg_user": None,
    "tg_phone_code_hash": None,
    "tg_awaiting_code": False,
    "tg_awaiting_2fa": False,
    "folder_channels": [],
    "catalog_anime": [],
    "is_running": False,
    "should_stop": False,
    "pipeline_stage": 0,  # 0=Idle, 1=Audit/Clean, 2=Download, 3=Compress, 4=Upload, 5=Cooldown
    "current_phase": "រួចរាល់ (Idle)",
    "current_anime": "",
    "current_ep": 0,
    "step_progress": 0.0,
    "total_jobs": 0,
    "completed_jobs": 0,
    "checkpoint_summary": {},
    "logs": [],
}


def refresh_checkpoint_summary_in_state() -> None:
    cp = load_checkpoint()
    remaining_ids = [
        aid for aid in (cp.get("active_queue_anime_ids") or [])
        if aid not in (cp.get("completed_anime_ids") or [])
    ]
    with state_lock:
        app_state["checkpoint_summary"] = {
            "unfinished_queue": bool(cp.get("unfinished_queue") and remaining_ids),
            "remaining_anime_ids": remaining_ids,
            "remaining_anime_count": len(remaining_ids),
            "current_anime_id": cp.get("current_anime_id"),
            "current_ep_num": cp.get("current_ep_num"),
            "total_uploaded_all_time": cp.get("total_uploaded_all_time", 0),
            "last_updated": cp.get("last_updated", ""),
        }


def add_log(msg: str, level: str = "info") -> None:
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level.upper()}] {msg}", flush=True)
    with state_lock:
        app_state["logs"].append({"time": ts, "msg": msg, "level": level})
        if len(app_state["logs"]) > 300:
            app_state["logs"].pop(0)


# ── Website Catalog Loader (Local Seed + Split Support for Xian Ni) ──────────
raw_anime_map: Dict[int, Dict[str, Any]] = {}
raw_episodes_by_anime: Dict[int, List[Dict[str, Any]]] = {}


def load_website_catalog() -> Tuple[int, int]:
    global raw_anime_map, raw_episodes_by_anime
    candidates = [
        ROOT_DIR / "backend" / "app" / "services" / "seed_export.json",
        ROOT_DIR / "ALL_MOVIES_AND_EPISODE_LINKS.json",
    ]
    anime_list: List[Dict[str, Any]] = []
    episodes_list: List[Dict[str, Any]] = []

    for path in candidates:
        if not path.exists():
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "anime" in data:
                anime_list = data.get("anime", [])
                episodes_list = data.get("episodes", [])
                add_log(f"បានទាញទិន្នន័យរឿងពី {path.name}: {len(anime_list)} រឿង, {len(episodes_list)} ភាគ", "ok")
                break
            elif isinstance(data, list) and data and "anime" in data[0]:
                for item in data:
                    anime_list.append(item.get("anime", {}))
                    episodes_list.extend(item.get("episodes", []))
                add_log(f"បានទាញទិន្នន័យរឿងពី {path.name}: {len(anime_list)} រឿង, {len(episodes_list)} ភាគ", "ok")
                break
        except Exception as e:
            add_log(f"កំហុសអាន {path.name}: {e}", "err")

    raw_anime_map.clear()
    raw_episodes_by_anime.clear()

    for a in anime_list:
        aid = int(a.get("id") or 0)
        if aid > 0:
            raw_anime_map[aid] = dict(a)
            raw_episodes_by_anime[aid] = []

    for ep in episodes_list:
        aid = int(ep.get("anime_id") or 0)
        if aid in raw_episodes_by_anime:
            video_url = (ep.get("video_url") or ep.get("stream_url") or "").strip()
            if video_url:
                raw_episodes_by_anime[aid].append(ep)

    for aid, eps in list(raw_episodes_by_anime.items()):
        dedup_by_num: Dict[int, Dict[str, Any]] = {}
        for ep in eps:
            ep_num = int(ep.get("episode_number") or 0)
            if ep_num > 0:
                dedup_by_num[ep_num] = ep
        raw_episodes_by_anime[aid] = [dedup_by_num[n] for n in sorted(dedup_by_num.keys())]

    if 1 in raw_anime_map and raw_episodes_by_anime.get(1):
        all_eps_1 = raw_episodes_by_anime[1]
        eps_1_to_108 = [e for e in all_eps_1 if int(e.get("episode_number") or 0) <= 108]
        eps_109_plus = [e for e in all_eps_1 if int(e.get("episode_number") or 0) >= 109]
        raw_anime_map[1]["title"] = "គុជអមតះធៀននី (ភាគ 1-108)"
        raw_episodes_by_anime[1] = eps_1_to_108

        anime_109 = dict(raw_anime_map[1])
        anime_109["id"] = 1001
        anime_109["title"] = "គុជអមតះធៀននី (ភាគ 109ឡើង)"
        raw_anime_map[1001] = anime_109
        raw_episodes_by_anime[1001] = eps_109_plus

    rebuild_catalog_state()
    refresh_checkpoint_summary_in_state()
    return len(raw_anime_map), sum(len(v) for v in raw_episodes_by_anime.values())


def normalize_name(s: str) -> str:
    if not s:
        return ""
    s = khmer_to_ascii_digits(s.lower())
    s = re.sub(r"(\[.*?\]|\(.*?\)|【.*?】|4k|uhd|full\s*hd|1080p|donghua|anime)", " ", s)
    s = re.sub(r"[^\w\u1780-\u17FF\u4e00-\u9fff]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def compute_match_score(anime: Dict[str, Any], channel_title: str) -> float:
    ch_norm = normalize_name(channel_title)
    if len(ch_norm) < 3:
        return 0.0
    candidates = [anime.get("title") or "", anime.get("alt_title") or ""]
    best = 0.0
    for cand in candidates:
        c_norm = normalize_name(cand)
        if len(c_norm) < 3:
            continue
        if c_norm == ch_norm:
            return 1.0
        if len(c_norm) >= 5 and len(ch_norm) >= 5 and (c_norm in ch_norm or ch_norm in c_norm):
            ratio = min(len(c_norm), len(ch_norm)) / max(len(c_norm), len(ch_norm))
            if ratio >= 0.5:
                best = max(best, 0.80 + 0.15 * ratio)
    return round(best, 3)


def rebuild_catalog_state(audit_map: Optional[Dict[int, Dict[str, Any]]] = None) -> None:
    cfg = load_config()
    overrides: Dict[str, Any] = cfg.get("channel_overrides") or {}
    with state_lock:
        channels = list(app_state["folder_channels"])
        prev_audits = {
            item["id"]: item.get("channel_audit")
            for item in app_state.get("catalog_anime", [])
            if item.get("channel_audit")
        }

    ch_by_id = {int(c["id"]): c for c in channels}
    folder_only_channels = [c for c in channels if c.get("from_folder")]
    catalog_rows: List[Dict[str, Any]] = []

    def _sort_key(item):
        aid = item[0]
        return 1.5 if aid == 1001 else float(aid)

    for aid, anime in sorted(raw_anime_map.items(), key=_sort_key):
        eps = raw_episodes_by_anime.get(aid, [])
        ep_nums = [int(e.get("episode_number") or 0) for e in eps]

        matched_id: Optional[int] = None
        matched_title: str = ""
        best_score = 0.0

        ov_val = overrides.get(str(aid))
        if ov_val and int(ov_val) in ch_by_id:
            matched_id = int(ov_val)
            matched_title = ch_by_id[matched_id]["title"]
            best_score = 1.0
        elif aid in VERIFIED_ANIME_CHANNEL_MAP and VERIFIED_ANIME_CHANNEL_MAP[aid] in ch_by_id:
            matched_id = VERIFIED_ANIME_CHANNEL_MAP[aid]
            matched_title = ch_by_id[matched_id]["title"]
            best_score = 1.0
        else:
            for ch in folder_only_channels:
                sc = compute_match_score(anime, ch["title"])
                if sc > best_score and sc >= 0.75:
                    best_score = sc
                    matched_id = int(ch["id"])
                    matched_title = ch["title"]

        audit_info = None
        if audit_map and aid in audit_map:
            audit_info = audit_map[aid]
        elif aid in prev_audits:
            audit_info = prev_audits[aid]

        catalog_rows.append({
            "id": aid,
            "title": anime.get("title") or f"Anime #{aid}",
            "alt_title": anime.get("alt_title") or "",
            "slug": anime.get("slug") or "",
            "poster_url": anime.get("poster_url") or "",
            "episodes_count": len(eps),
            "ep_range": f"ភាគ {ep_nums[0]} - {ep_nums[-1]}" if ep_nums else "គ្មានភាគលើ Website",
            "ep_numbers": ep_nums,
            "matched_channel_id": matched_id,
            "matched_channel_title": matched_title,
            "match_score": best_score,
            "channel_audit": audit_info,
        })

    with state_lock:
        app_state["catalog_anime"] = catalog_rows


# ── Dedicated Asyncio Thread for Telethon Client ─────────────────────────────
class TelethonWorker:
    def __init__(self) -> None:
        self.loop = asyncio.new_event_loop()
        self.client: Optional[TelegramClient] = None
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def run_coro(self, coro, timeout: float = 180.0):
        fut = asyncio.run_coroutine_threadsafe(coro, self.loop)
        return fut.result(timeout=timeout)

    async def ensure_client(self) -> TelegramClient:
        cfg = load_config()
        api_id = int(cfg.get("api_id") or DEFAULT_API_ID)
        api_hash = str(cfg.get("api_hash") or DEFAULT_API_HASH).strip()
        session_str = (cfg.get("session_string") or "").strip()

        if self.client is None:
            sql_file = Path(f"{SESSION_PATH}.session")
            if not sql_file.exists() and session_str:
                self.client = TelegramClient(
                    StringSession(session_str),
                    api_id,
                    api_hash,
                    loop=self.loop,
                    device_model="MerDonghua Studio PC",
                    system_version="Windows 11",
                    app_version="3.0.0",
                )
            else:
                self.client = TelegramClient(
                    SESSION_PATH,
                    api_id,
                    api_hash,
                    loop=self.loop,
                    device_model="MerDonghua Studio PC",
                    system_version="Windows 11",
                    app_version="3.0.0",
                )
        if not self.client.is_connected():
            await self.client.connect()
        return self.client

    async def persist_session_forever(self) -> None:
        if not self.client:
            return
        try:
            s_str = StringSession.save(self.client.session)
            if s_str:
                cfg = load_config()
                if cfg.get("session_string") != s_str:
                    cfg["session_string"] = s_str
                    save_config(cfg)
        except Exception:
            pass

    async def check_auth_status(self) -> Dict[str, Any]:
        try:
            client = await self.ensure_client()
            authorized = await client.is_user_authorized()
            user_info = None
            if authorized:
                await self.persist_session_forever()
                me = await client.get_me()
                user_info = {
                    "id": me.id,
                    "first_name": me.first_name or "",
                    "last_name": me.last_name or "",
                    "username": me.username or "",
                    "phone": me.phone or "",
                }
            with state_lock:
                app_state["tg_connected"] = True
                app_state["tg_authorized"] = authorized
                app_state["tg_user"] = user_info
            return {"authorized": authorized, "user": user_info}
        except Exception as e:
            add_log(f"Telegram connection check error: {e}", "err")
            return {"authorized": False, "error": str(e)}

    async def send_login_code(self, phone: str, api_id: int, api_hash: str) -> Dict[str, Any]:
        cfg = load_config()
        cfg["phone"] = phone
        cfg["api_id"] = int(api_id or DEFAULT_API_ID)
        cfg["api_hash"] = str(api_hash or DEFAULT_API_HASH).strip()
        save_config(cfg)

        client = await self.ensure_client()
        if await client.is_user_authorized():
            status = await self.check_auth_status()
            add_log("គណនី Telegram បាន Log in និងចងចាំ Session រួចរាល់ហើយ!", "ok")
            return {"status": "already_logged_in", **status}

        sent = await client.send_code_request(phone)
        with state_lock:
            app_state["tg_phone_code_hash"] = sent.phone_code_hash
            app_state["tg_awaiting_code"] = True
        add_log(f"បានផ្ញើកូដ OTP ទៅកាន់លេខ {phone} នៅក្នុងកម្មវិធី Telegram រួចរាល់!", "ok")
        return {"status": "code_sent", "phone": phone}

    async def verify_login_code(self, phone: str, code: str, password: str = "") -> Dict[str, Any]:
        client = await self.ensure_client()
        with state_lock:
            phone_code_hash = app_state.get("tg_phone_code_hash")
        try:
            await client.sign_in(phone=phone, code=code.strip(), phone_code_hash=phone_code_hash)
        except errors.SessionPasswordNeededError:
            if not password:
                with state_lock:
                    app_state["tg_awaiting_2fa"] = True
                add_log("គណនីនេះមាន Two-Step Verification (2FA Password) សូមបញ្ចូលលេខសម្ងាត់ 2FA!", "warn")
                return {"status": "2fa_required"}
            await client.sign_in(password=password)

        await self.persist_session_forever()
        with state_lock:
            app_state["tg_awaiting_code"] = False
            app_state["tg_awaiting_2fa"] = False
        status = await self.check_auth_status()
        add_log("Log in ចូលគណនី Telegram និងរក្សាទុក Session ជាអចិន្ត្រៃយ៍ជោគជ័យ ១០០%!", "ok")
        return {"status": "logged_in", **status}

    async def scan_folder_and_channels(self, folder_link: str, auto_join: bool = True) -> Dict[str, Any]:
        client = await self.ensure_client()
        if not await client.is_user_authorized():
            raise RuntimeError("សូម Log in គណនី Telegram ជាមុនសិន!")

        cfg = load_config()
        if folder_link:
            cfg["folder_link"] = folder_link.strip()
            save_config(cfg)
        else:
            folder_link = cfg.get("folder_link", DEFAULT_FOLDER_LINK)

        slug = ""
        m = re.search(r"(?:addlist/|chatlist/)([A-Za-z0-9_\-]+)", folder_link)
        if m:
            slug = m.group(1)

        discovered: Dict[int, Dict[str, Any]] = {}

        if slug:
            add_log(f"កំពុងទាញបញ្ជី Channel ពី Folder Link (slug={slug})...", "info")
            try:
                res = await client(functions.chatlists.CheckChatlistInviteRequest(slug=slug))
                chats = getattr(res, "chats", []) or []
                missing_peers = getattr(res, "missing_peers", []) or []

                if auto_join and missing_peers:
                    try:
                        await client(functions.chatlists.JoinChatlistInviteRequest(slug=slug, peers=missing_peers))
                        add_log(f"បានចូលរួម (Join) ចំនួន {len(missing_peers)} Channels ក្នុង Folder ដោយស្វ័យប្រវត្តិ!", "ok")
                    except Exception as je:
                        add_log(f"ចំណាំពេល Join Folder: {je}", "warn")

                for ch in chats:
                    if isinstance(ch, (types.Channel, types.Chat)) and not getattr(ch, "megagroup", False):
                        cid = int(utils.get_peer_id(ch))
                        discovered[cid] = {
                            "id": cid,
                            "raw_id": ch.id,
                            "title": getattr(ch, "title", "") or f"Channel {ch.id}",
                            "username": getattr(ch, "username", "") or "",
                            "from_folder": True,
                        }
                add_log(f"រកឃើញ {len(discovered)} Channels នៅក្នុង Folder Link!", "ok")
            except Exception as e:
                add_log(f"ចំណាំពេលអាន Folder Link ({slug}): {e}", "warn")

        channel_list = sorted(discovered.values(), key=lambda x: x.get("title", "").lower())
        with state_lock:
            app_state["folder_channels"] = channel_list

        rebuild_catalog_state()
        matched_count = sum(1 for a in app_state["catalog_anime"] if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0)
        add_log(
            f"ផ្គូផ្គងរួចរាល់៖ រកឃើញ {len(channel_list)} Channels ក្នុង Folder និងផ្គូផ្គងរឿងដែលមានភាគចំនួន {matched_count} រឿង!",
            "ok",
        )
        return {"channels_count": len(channel_list), "matched_anime_count": matched_count}

    async def audit_single_channel(self, anime_id: int, channel_id: int, expected_ep_numbers: List[int]) -> Dict[str, Any]:
        """
        Live Channel Audit & Anti-Duplicate Logic:
        - Reads all existing messages in the target Telegram channel.
        - If Website has Episode 1 (or 109 for Xian Ni 109+):
          * If Channel has episodes starting from Episode 1 (e.g. 1..5 out of 1..10, or 1..50 out of 1..100),
            it NEVER duplicates 1..5 — it marks 1..5 as already present and queues 6..10!
          * If Channel is missing Episode 1 (e.g. only has 5..10 or 8..26), it marks needs_reset = True
            so the incomplete messages are deleted and re-uploaded cleanly from Episode 1 (1..10)!
        """
        client = await self.ensure_client()
        entity = await client.get_entity(channel_id)

        ep_messages: List[Tuple[int, int]] = []
        all_deletable_msg_ids: List[int] = []
        total_video_msgs = 0

        async for msg in client.iter_messages(entity, limit=1500):
            if isinstance(msg, types.MessageService):
                continue
            all_deletable_msg_ids.append(msg.id)
            has_video = bool(msg.video or (msg.media and isinstance(msg.media, MessageMediaDocument)))
            if has_video:
                total_video_msgs += 1
            text = (msg.message or "").strip()
            file_name = ""
            if msg.media and isinstance(msg.media, MessageMediaDocument) and msg.media.document:
                for attr in msg.media.document.attributes:
                    if hasattr(attr, "file_name") and attr.file_name:
                        file_name = attr.file_name
                        break
            ep_num = extract_episode_number(f"{text}\n{file_name}")
            if ep_num is not None and ep_num > 0:
                ep_messages.append((msg.id, ep_num))

        ep_messages.reverse()
        found_eps_ordered = [ep for _, ep in ep_messages]
        found_set = sorted(set(found_eps_ordered))
        expected_sorted = sorted(set(expected_ep_numbers))

        if not expected_sorted:
            return {
                "status": "no_website_eps",
                "status_label": f"ក្នុង Channel មាន {len(found_set)} ភាគ (លើ Website មិនទាន់ដាក់ភាគ)",
                "found_episodes": found_set,
                "needs_reset": False,
                "episodes_to_upload": [],
                "msg_ids_to_delete": [],
            }

        required_start_ep = 109 if anime_id == 1001 else 1
        website_has_start_ep = (expected_sorted[0] == required_start_ep)

        if not found_set:
            if total_video_msgs > 0 and website_has_start_ep:
                return {
                    "status": "incomplete_reset_needed",
                    "status_label": f"មានវីដេអូអត់លេខភាគ ({total_video_msgs}) -> លុបដាក់សារថ្មីពីភាគ {expected_sorted[0]}",
                    "found_episodes": [],
                    "needs_reset": True,
                    "episodes_to_upload": expected_sorted,
                    "msg_ids_to_delete": all_deletable_msg_ids,
                }
            return {
                "status": "empty",
                "status_label": f"Channel ទទេ -> ត្រៀម Upload ពីភាគ {expected_sorted[0]} ដល់ {expected_sorted[-1]}",
                "found_episodes": [],
                "needs_reset": False,
                "episodes_to_upload": expected_sorted,
                "msg_ids_to_delete": [],
            }

        # Case 1: Website does not start at Episode 1 (e.g. starts at Ep 157 or Ep 226)
        if not website_has_start_ep:
            missing_from_web = [ep for ep in expected_sorted if ep not in found_set]
            if not missing_from_web:
                return {
                    "status": "complete",
                    "status_label": f"គ្រប់ភាគរួចរាល់ (មានភាគ {found_set[0]} ដល់ {found_set[-1]})",
                    "found_episodes": found_set,
                    "needs_reset": False,
                    "episodes_to_upload": [],
                    "msg_ids_to_delete": [],
                }
            return {
                "status": "partial_valid",
                "status_label": f"មានភាគ {found_set[0]}-{found_set[-1]} -> បន្ត Upload ភាគ {missing_from_web[0]}-{missing_from_web[-1]}",
                "found_episodes": found_set,
                "needs_reset": False,
                "episodes_to_upload": missing_from_web,
                "msg_ids_to_delete": [],
            }

        # Case 2: Website starts at Episode 1 (or 109 for Xian Ni 109+)
        has_start = (required_start_ep in found_set)
        max_found = found_set[-1]

        if not has_start:
            return {
                "status": "incomplete_reset_needed",
                "status_label": f"អត់មានភាគ {required_start_ep} (មានតែភាគ {found_set[0]}-{found_set[-1]}) -> លុបចោល & Upload សារថ្មីពីភាគ {required_start_ep}",
                "found_episodes": found_set,
                "needs_reset": True,
                "episodes_to_upload": expected_sorted,
                "msg_ids_to_delete": all_deletable_msg_ids,
            }

        remaining_to_upload = [ep for ep in expected_sorted if ep > max_found and ep not in found_set]
        if not remaining_to_upload:
            return {
                "status": "complete",
                "status_label": f"ត្រឹមត្រូវ ១០០% (មានភាគ {found_set[0]} ដល់ {found_set[-1]} គ្រប់ហើយ)",
                "found_episodes": found_set,
                "needs_reset": False,
                "episodes_to_upload": [],
                "msg_ids_to_delete": [],
            }

        return {
            "status": "partial_valid",
            "status_label": f"មានភាគ {found_set[0]}-{found_set[-1]} ត្រឹមត្រូវ -> បន្ត Upload ពីភាគ {remaining_to_upload[0]}-{remaining_to_upload[-1]}",
            "found_episodes": found_set,
            "needs_reset": False,
            "episodes_to_upload": remaining_to_upload,
            "msg_ids_to_delete": [],
        }


def extract_episode_number(text: str) -> Optional[int]:
    if not text:
        return None
    clean = khmer_to_ascii_digits(text)
    patterns = [
        r"(?:episode|ep)\s*[:#\-]?\s*0*(\d{1,4})\b",
        r"ភាគ\s*(?:ទី)?\s*[:#\-]?\s*0*(\d{1,4})\b",
        r"(?:^|[_\-\s\[\(])ep?0*(\d{1,4})(?:[_\-\s\]\)\.]|$)",
    ]
    for pat in patterns:
        m = re.search(pat, clean, flags=re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


# ── Video Download & FFmpeg Low-MB Compression Engine ────────────────────────
def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "_", (name or "video").strip())
    return re.sub(r"\s+", " ", clean)[:100]


def find_existing_local_episode(anime: Dict[str, Any], ep_num: int, local_base: str) -> Optional[Path]:
    if not local_base or not os.path.isdir(local_base):
        return None
    title_candidates = [
        sanitize_filename(anime.get("title") or ""),
        sanitize_filename(anime.get("alt_title") or ""),
        sanitize_filename(anime.get("slug") or ""),
    ]
    for folder_name in os.listdir(local_base):
        folder_path = os.path.join(local_base, folder_name)
        if not os.path.isdir(folder_path):
            continue
        if any(tc and (tc.lower() in folder_name.lower() or folder_name.lower() in tc.lower()) for tc in title_candidates):
            for fname in os.listdir(folder_path):
                if not fname.lower().endswith((".mp4", ".mkv", ".ts", ".webm")):
                    continue
                ep_detected = extract_episode_number(fname)
                if ep_detected == ep_num:
                    fpath = Path(folder_path) / fname
                    if fpath.stat().st_size > 500 * 1024:
                        return fpath
    return None


def download_episode_video(video_url: str, dest_path: Path) -> Path:
    if dest_path.exists():
        dest_path.unlink(missing_ok=True)

    if ".m3u8" in video_url.lower():
        cmd = [
            FFMPEG_EXE, "-y",
            "-user_agent", UA,
            "-i", video_url,
            "-c", "copy",
            "-bsf:a", "aac_adtstoasc",
            str(dest_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return dest_path

    req = urllib.request.Request(video_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        downloaded = 0
        chunk_size = 512 * 1024
        with open(dest_path, "wb") as out_f:
            while True:
                if app_state["should_stop"]:
                    raise InterruptedError("បានបញ្ឈប់ដោយអ្នកប្រើប្រាស់ (Stopped by user)")
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out_f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    with state_lock:
                        app_state["step_progress"] = round((downloaded / total) * 100.0, 1)
    return dest_path


def compress_video_for_telegram(src_path: Path, out_path: Path, preset: str) -> Tuple[Path, int, int, int, Optional[Path]]:
    thumb_path = out_path.with_suffix(".jpg")
    try:
        subprocess.run(
            [FFMPEG_EXE, "-y", "-ss", "00:00:05", "-i", str(src_path), "-vframes", "1", "-q:v", "4", str(thumb_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=30,
        )
    except Exception:
        pass

    if preset == "copy_raw":
        return src_path, 1440, 1280, 720, (thumb_path if thumb_path.exists() else None)

    if preset == "480p_ultra":
        scale_filter = "scale='min(854,iw)':-2"
        crf = "28"
        audio_br = "80k"
        w, h = 854, 480
    elif preset == "1080p_opt":
        scale_filter = "scale='min(1920,iw)':-2"
        crf = "26"
        audio_br = "128k"
        w, h = 1920, 1080
    else:
        scale_filter = "scale='min(1280,iw)':-2"
        crf = "27"
        audio_br = "96k"
        w, h = 1280, 720

    cmd = [
        FFMPEG_EXE,
        "-y",
        "-i", str(src_path),
        "-vf", scale_filter,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", crf,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", audio_br,
        "-movflags", "+faststart",
        str(out_path),
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 100 * 1024:
        add_log("FFmpeg បង្រួមមិនជោគជ័យ ប្រើវីដេអូដើមជំនួសវិញ", "warn")
        return src_path, 1440, w, h, (thumb_path if thumb_path.exists() else None)

    duration_sec = 1440
    m_dur = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", proc.stderr or "")
    if m_dur:
        duration_sec = int(m_dur.group(1)) * 3600 + int(m_dur.group(2)) * 60 + int(float(m_dur.group(3)))

    if out_path.stat().st_size >= src_path.stat().st_size:
        out_path.unlink(missing_ok=True)
        return src_path, duration_sec, w, h, (thumb_path if thumb_path.exists() else None)

    return out_path, duration_sec, w, h, (thumb_path if thumb_path.exists() else None)


def format_caption(anime: Dict[str, Any], ep_num: int, cfg: Dict[str, Any]) -> str:
    tpl = (cfg.get("caption_template") or DEFAULT_CAPTION_TEMPLATE).strip()
    title = re.sub(r"\s*\(ភាគ.*\)$", "", (anime.get("title") or "").strip())
    alt_title = (anime.get("alt_title") or "").strip()
    text = (
        tpl.replace("{ep_num}", str(ep_num))
        .replace("{episode}", str(ep_num))
        .replace("{anime_title}", title)
        .replace("{alt_title}", alt_title)
    )
    if cfg.get("include_title_in_caption") and title and title not in text:
        text = f"{title}\n{text}"
    return text


# ── Main Crash-Safe Sync Pipeline ────────────────────────────────────────────
tg_worker = TelethonWorker()


async def process_anime_sync_queue(anime_ids: List[int]) -> None:
    cfg = load_config()
    client = await tg_worker.ensure_client()
    if not await client.is_user_authorized():
        add_log("មិនទាន់បាន Log in គណនី Telegram ទេ! សូម Log in ជាមុនសិន។", "err")
        return

    # Save queue into persistent checkpoint immediately so power outage can resume it
    cp = load_checkpoint()
    cp["unfinished_queue"] = True
    cp["active_queue_anime_ids"] = list(anime_ids)
    save_checkpoint(cp)
    refresh_checkpoint_summary_in_state()

    with state_lock:
        catalog_by_id = {int(item["id"]): item for item in app_state["catalog_anime"]}

    for aid in anime_ids:
        if app_state["should_stop"]:
            break
        anime = raw_anime_map.get(aid)
        cat_row = catalog_by_id.get(aid)
        if not anime or not cat_row:
            continue

        channel_id = cat_row.get("matched_channel_id")
        channel_title = cat_row.get("matched_channel_title") or ""
        if not channel_id:
            add_log(f"រំលងរឿង [{anime.get('title')}] ព្រោះមិនទាន់មាន Channel ផ្គូផ្គង!", "warn")
            continue

        episodes = raw_episodes_by_anime.get(aid, [])
        if not episodes:
            continue

        expected_ep_nums = [int(e.get("episode_number") or 0) for e in episodes]
        with state_lock:
            app_state["pipeline_stage"] = 1
            app_state["current_anime"] = f"{anime.get('title')} -> {channel_title}"
            app_state["current_phase"] = "កំពុងឆែកមើលភាគក្នុង Channel ដើម្បីការពារការ Upload ស្ទួន..."

        add_log(f"កំពុងត្រួតពិនិត្យ Channel [{channel_title}] សម្រាប់រឿង [{anime.get('title')}]...", "info")
        audit = await tg_worker.audit_single_channel(aid, int(channel_id), expected_ep_nums)
        cat_row["channel_audit"] = audit

        if audit["status"] == "complete":
            add_log(f"Channel [{channel_title}] មានគ្រប់ភាគរួចរាល់ហើយ ({audit['status_label']}) — រំលងដោយស្វ័យប្រវត្តិ!", "ok")
            cp = load_checkpoint()
            if aid not in cp.get("completed_anime_ids", []):
                cp.setdefault("completed_anime_ids", []).append(aid)
                save_checkpoint(cp)
                refresh_checkpoint_summary_in_state()
            continue

        entity = await client.get_entity(int(channel_id))
        existing_in_channel: Set[int] = set(audit.get("found_episodes") or [])

        if audit["needs_reset"] and cfg.get("auto_reset_incomplete_channel", True):
            msg_ids = audit.get("msg_ids_to_delete") or []
            add_log(
                f"Channel [{channel_title}] {audit['status_label']} -> កំពុងលុបសារចាស់ចំនួន {len(msg_ids)} ដើម្បីរៀប Upload សារថ្មីពីភាគដំបូង...",
                "warn",
            )
            for i in range(0, len(msg_ids), 100):
                batch_ids = msg_ids[i : i + 100]
                try:
                    await client.delete_messages(entity, batch_ids, revoke=True)
                    await asyncio.sleep(1.0)
                except Exception as de:
                    add_log(f"ចំណាំពេលលុបសារចាស់ក្នុង Channel: {de}", "warn")
            add_log(f"បានសម្អាត Channel [{channel_title}] រួចរាល់! ចាប់ផ្ដើម Upload សារថ្មីពីភាគដំបូង។", "ok")
            existing_in_channel.clear()
            # Clear old checkpoint registry entries for this wiped channel
            cp = load_checkpoint()
            reg = cp.get("uploaded_registry") or {}
            prefix_rm = f"{channel_id}:"
            for k in list(reg.keys()):
                if k.startswith(prefix_rm):
                    reg.pop(k, None)
            cp.setdefault("cleaned_channels", {})[str(channel_id)] = datetime.datetime.now().isoformat()
            save_checkpoint(cp)
            target_ep_set = set(expected_ep_nums)
        else:
            target_ep_set = set(audit.get("episodes_to_upload") or [])

        episodes_to_upload = [e for e in episodes if int(e.get("episode_number") or 0) in target_ep_set]

        for ep in episodes_to_upload:
            if app_state["should_stop"]:
                break
            ep_num = int(ep.get("episode_number") or 0)
            video_url = (ep.get("video_url") or ep.get("stream_url") or "").strip()
            if not video_url:
                continue

            # Anti-Duplicate Guard: skip if already in channel!
            if ep_num in existing_in_channel:
                add_log(f"[ភាគ {ep_num}] មាននៅក្នុង Channel [{channel_title}] រួចហើយ — រំលងមិន Upload ស្ទួនទេ!", "info")
                continue

            with state_lock:
                app_state["current_ep"] = ep_num
                app_state["step_progress"] = 0.0

            raw_temp_path = TEMP_VIDEO_DIR / f"anime_{aid}_ep_{ep_num:03d}_raw.mp4"
            opt_temp_path = TEMP_VIDEO_DIR / f"anime_{aid}_ep_{ep_num:03d}_opt.mp4"
            is_temp_download = False

            try:
                local_existing = find_existing_local_episode(anime, ep_num, cfg.get("local_videos_dir", ""))
                if local_existing and local_existing.exists():
                    src_video_path = local_existing
                    add_log(f"[ភាគ {ep_num}] ប្រើវីដេអូដែលមានស្រាប់ក្នុងកុំព្យូទ័រ: {src_video_path.name}", "info")
                else:
                    with state_lock:
                        app_state["pipeline_stage"] = 2
                        app_state["current_phase"] = f"កំពុង Download ភាគ {ep_num} ពី Website..."
                    add_log(f"[ភាគ {ep_num}] កំពុង Download វីដេអូពី Website...", "info")
                    src_video_path = await asyncio.to_thread(download_episode_video, video_url, raw_temp_path)
                    is_temp_download = True
                    orig_mb = src_video_path.stat().st_size / (1024 * 1024)
                    add_log(f"[ភាគ {ep_num}] Download ជោគជ័យ ({orig_mb:.1f} MB)", "ok")

                if app_state["should_stop"]:
                    break

                preset = cfg.get("compression_preset", "720p_low_mb")
                with state_lock:
                    app_state["pipeline_stage"] = 3
                    app_state["current_phase"] = f"កំពុងបង្រួមទំហំ (MB) ភាគ {ep_num}..."
                    app_state["step_progress"] = 50.0
                add_log(f"[ភាគ {ep_num}] កំពុងបង្រួមទំហំវីដេអូឲ្យតិច MB បំផុត ({preset})...", "info")

                final_video, dur_sec, w, h, thumb_path = await asyncio.to_thread(
                    compress_video_for_telegram, src_video_path, opt_temp_path, preset
                )
                final_mb = final_video.stat().st_size / (1024 * 1024)
                add_log(f"[ភាគ {ep_num}] ទំហំវីដេអូត្រៀម Upload: {final_mb:.1f} MB", "ok")

                if app_state["should_stop"]:
                    break

                caption = format_caption(anime, ep_num, cfg)
                with state_lock:
                    app_state["pipeline_stage"] = 4
                    app_state["current_phase"] = f"កំពុង Upload ភាគ {ep_num} ចូល Channel [{channel_title}]..."
                    app_state["step_progress"] = 0.0

                def _progress_cb(sent_bytes: int, total_bytes: int) -> None:
                    if total_bytes > 0:
                        with state_lock:
                            app_state["step_progress"] = round((sent_bytes / total_bytes) * 100.0, 1)

                add_log(f"[ភាគ {ep_num}] កំពុង Upload ចូល Channel [{channel_title}]...", "info")
                while True:
                    try:
                        await client.send_file(
                            entity,
                            file=str(final_video),
                            caption=caption,
                            thumb=str(thumb_path) if thumb_path and thumb_path.exists() else None,
                            supports_streaming=True,
                            attributes=[
                                DocumentAttributeVideo(
                                    duration=dur_sec,
                                    w=w,
                                    h=h,
                                    supports_streaming=True,
                                )
                            ],
                            progress_callback=_progress_cb,
                        )
                        break
                    except errors.FloodWaitError as fwe:
                        wait_s = int(fwe.seconds) + 3
                        add_log(f"Telegram FloodWait: រង់ចាំ {wait_s} វិនាទីដើម្បីការពារគណនី...", "warn")
                        await asyncio.sleep(wait_s)

                existing_in_channel.add(ep_num)
                mark_episode_uploaded_in_checkpoint(aid, int(channel_id), ep_num)
                refresh_checkpoint_summary_in_state()

                with state_lock:
                    app_state["completed_jobs"] += 1
                    app_state["step_progress"] = 100.0
                add_log(f"[ភាគ {ep_num}] បាន Upload ចូល [{channel_title}] និងកត់ត្រាទុកក្នុង Checkpoint ជោគជ័យ!", "ok")

            except InterruptedError:
                add_log("បានផ្អាកដំណើរការ — វឌ្ឍនភាពត្រូវបានរក្សាទុកក្នុង Checkpoint សម្រាប់បន្តលើកក្រោយ!", "warn")
                break
            except Exception as ex:
                add_log(f"[ភាគ {ep_num}] កំហុស: {ex}", "err")
            finally:
                if cfg.get("delete_temp_after_upload", True):
                    if is_temp_download and raw_temp_path.exists():
                        raw_temp_path.unlink(missing_ok=True)
                    if opt_temp_path.exists():
                        opt_temp_path.unlink(missing_ok=True)
                    thumb_f = opt_temp_path.with_suffix(".jpg")
                    if thumb_f.exists():
                        thumb_f.unlink(missing_ok=True)

            delay_s = max(2, int(cfg.get("delay_seconds") or 10))
            if not app_state["should_stop"]:
                with state_lock:
                    app_state["pipeline_stage"] = 5
                    app_state["current_phase"] = f"សម្រាក {delay_s} វិនាទីមុនបន្តភាគបន្ទាប់..."
                await asyncio.sleep(delay_s)

        try:
            updated_audit = await tg_worker.audit_single_channel(aid, int(channel_id), expected_ep_nums)
            cat_row["channel_audit"] = updated_audit
            if updated_audit.get("status") == "complete":
                cp = load_checkpoint()
                if aid not in cp.get("completed_anime_ids", []):
                    cp.setdefault("completed_anime_ids", []).append(aid)
                    save_checkpoint(cp)
                    refresh_checkpoint_summary_in_state()
        except Exception:
            pass

    if not app_state["should_stop"]:
        cp = load_checkpoint()
        cp["unfinished_queue"] = False
        save_checkpoint(cp)
        refresh_checkpoint_summary_in_state()


def start_sync_in_background(anime_ids: List[int], is_resume: bool = False) -> bool:
    with state_lock:
        if app_state["is_running"]:
            return False
        app_state["is_running"] = True
        app_state["should_stop"] = False
        if not is_resume:
            app_state["completed_jobs"] = 0
        app_state["total_jobs"] = sum(len(raw_episodes_by_anime.get(aid, [])) for aid in anime_ids)

    if not is_resume:
        cp = load_checkpoint()
        cp["unfinished_queue"] = True
        cp["active_queue_anime_ids"] = list(anime_ids)
        cp["completed_anime_ids"] = []
        save_checkpoint(cp)
        refresh_checkpoint_summary_in_state()

    def _runner():
        try:
            tg_worker.run_coro(process_anime_sync_queue(anime_ids), timeout=86400 * 7)
        except Exception as e:
            add_log(f"ដំណើរការ Sync បានផ្អាកដោយកំហុស: {e}", "err")
        finally:
            with state_lock:
                app_state["is_running"] = False
                app_state["pipeline_stage"] = 0
                app_state["current_phase"] = "រួចរាល់ (Idle)"
            refresh_checkpoint_summary_in_state()
            add_log("ដំណើរការ Queue បានបញ្ចប់ ឬផ្អាកដោយសុវត្ថិភាព។", "ok")

    threading.Thread(target=_runner, daemon=True).start()
    return True


# ── Global Real Production iOS 27 White Liquid Glass Studio UI ───────────────
HTML_PAGE = r"""<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MerDonghua — Telegram Channel Auto-Sync Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-main: #F8FAFC;
    --bg-glass: rgba(255, 255, 255, 0.92);
    --bg-subtle: #F1F5F9;
    --border-light: #E2E8F0;
    --border-hover: #CBD5E1;
    --text-primary: #0F172A;
    --text-secondary: #475569;
    --text-muted: #64748B;
    --accent-blue: #2563EB;
    --accent-blue-hover: #1D4ED8;
    --accent-blue-soft: #EFF6FF;
    --accent-green: #059669;
    --accent-green-soft: #ECFDF5;
    --accent-amber: #D97706;
    --accent-amber-soft: #FFFBEB;
    --accent-red: #DC2626;
    --accent-red-soft: #FEF2F2;
    --shadow-card: 0 10px 30px -10px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.03);
    --radius-xl: 22px;
    --radius-lg: 16px;
    --radius-md: 12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: radial-gradient(circle at top right, #EFF6FF 0%, #F8FAFC 45%, #FFFFFF 100%);
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
    padding: 24px 28px;
  }
  .shell { max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

  /* Top Navigation Bar */
  .topbar {
    background: var(--bg-glass);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xl);
    padding: 18px 26px;
    box-shadow: var(--shadow-card);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .brand-wrap { display: flex; align-items: center; gap: 16px; }
  .brand-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #FFFFFF; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.45);
  }
  .brand-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); }
  .brand-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

  /* KPI Grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  @media (max-width: 1180px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }
  .kpi-card {
    background: var(--bg-glass);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
    box-shadow: var(--shadow-card);
    display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
  }
  .kpi-head { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
  .kpi-val { font-size: 22px; font-weight: 800; color: var(--text-primary); }
  .kpi-foot { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  /* Cards & Layout */
  .card {
    background: var(--bg-glass);
    backdrop-filter: blur(24px);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xl);
    padding: 22px 26px;
    box-shadow: var(--shadow-card);
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 1024px) { .grid-2 { grid-template-columns: 1fr; } }
  .sec-title {
    font-size: 15.5px; font-weight: 700; color: var(--text-primary);
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  }
  .sec-title svg { color: var(--accent-blue); flex-shrink: 0; }

  /* Form Controls */
  label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
  input[type="text"], input[type="password"], input[type="number"], select, textarea {
    width: 100%; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
    font-family: inherit; font-size: 13.5px; color: var(--text-primary); background: #FFFFFF;
    outline: none; transition: all 0.15s ease;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
  textarea { min-height: 112px; resize: vertical; }
  .row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 14px; }
  .row > div { flex: 1; min-width: 180px; }

  /* Buttons */
  button {
    padding: 10px 18px; border-radius: var(--radius-md); border: 1px solid transparent;
    font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    white-space: nowrap;
  }
  .btn-primary { background: var(--accent-blue); color: #FFFFFF; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
  .btn-primary:hover { background: var(--accent-blue-hover); transform: translateY(-1px); }
  .btn-success { background: var(--accent-green); color: #FFFFFF; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
  .btn-success:hover { background: #047857; transform: translateY(-1px); }
  .btn-amber { background: var(--accent-amber); color: #FFFFFF; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); }
  .btn-danger { background: var(--accent-red); color: #FFFFFF; }
  .btn-outline { background: #FFFFFF; color: var(--text-primary); border-color: var(--border-light); }
  .btn-outline:hover { background: var(--bg-subtle); border-color: var(--border-hover); }

  /* Badges */
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
  }
  .badge-ok { background: var(--accent-green-soft); color: var(--accent-green); border: 1px solid #A7F3D0; }
  .badge-warn { background: var(--accent-amber-soft); color: var(--accent-amber); border: 1px solid #FDE68A; }
  .badge-err { background: var(--accent-red-soft); color: var(--accent-red); border: 1px solid #FECACA; }
  .badge-blue { background: var(--accent-blue-soft); color: var(--accent-blue); border: 1px solid #BFDBFE; }

  /* 4-Stage Pipeline Stepper */
  .pipeline-steps {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0;
  }
  @media (max-width: 768px) { .pipeline-steps { grid-template-columns: repeat(2, 1fr); } }
  .p-step {
    padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-light);
    background: #FFFFFF; display: flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 600; color: var(--text-muted);
    transition: all 0.2s;
  }
  .p-step.active {
    border-color: var(--accent-blue); background: var(--accent-blue-soft); color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }
  .p-step-num {
    width: 24px; height: 24px; border-radius: 999px; background: var(--bg-subtle);
    display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
  }
  .p-step.active .p-step-num { background: var(--accent-blue); color: #FFFFFF; }

  .progress-track { background: #E2E8F0; height: 10px; border-radius: 999px; overflow: hidden; }
  .progress-fill {
    background: linear-gradient(90deg, #2563EB 0%, #06B6D4 100%);
    height: 100%; width: 0%; transition: width 0.25s ease;
  }

  /* Filter Pills */
  .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .tab-pill {
    padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
    background: #FFFFFF; color: var(--text-secondary); border: 1px solid var(--border-light); cursor: pointer;
  }
  .tab-pill.active { background: var(--text-primary); color: #FFFFFF; border-color: var(--text-primary); }

  /* Table */
  .table-wrap { max-height: 520px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-lg); background: #FFFFFF; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); text-align: left; vertical-align: middle; }
  th { font-weight: 700; font-size: 12px; color: var(--text-muted); background: #F8FAFC; position: sticky; top: 0; z-index: 5; }
  tr:hover td { background: #F8FAFC; }
  .anime-cell { display: flex; align-items: center; gap: 12px; }
  .poster-thumb {
    width: 42px; height: 56px; border-radius: 8px; object-fit: cover;
    background: #E2E8F0; border: 1px solid var(--border-light); flex-shrink: 0;
  }

  /* Logs */
  .log-console {
    background: #0F172A; color: #E2E8F0; border-radius: var(--radius-lg); padding: 16px;
    font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12.5px; height: 220px; overflow-y: auto;
  }
  .log-ok { color: #34D399; }
  .log-warn { color: #FBBF24; }
  .log-err { color: #F87171; }
  .check-line { display: flex; align-items: center; gap: 9px; font-size: 13px; margin-top: 8px; cursor: pointer; color: var(--text-secondary); }
  .check-line input { width: 16px; height: 16px; accent-color: var(--accent-blue); }
</style>
</head>
<body>
<div class="shell">
  <!-- Top Bar -->
  <div class="topbar">
    <div class="brand-wrap">
      <div class="brand-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
      </div>
      <div>
        <div class="brand-title">MerDonghua — Telegram Channel Auto-Sync Studio</div>
        <div class="brand-sub">ប្រព័ន្ធស្វ័យប្រវត្តិ Download ពី Website • បង្រួមទំហំ MB • ឆែកលំដាប់ភាគ • ចងចាំការងារបន្តពេលដាច់ភ្លើង ឬបិទកម្មវិធី</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <div id="authBadge" class="badge badge-ok">កំពុងពិនិត្យគណនី Telegram...</div>
      <button class="btn-outline" onclick="scanFolderChannels()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        ស្កេន Folder ឡើងវិញ
      </button>
    </div>
  </div>

  <!-- 4 Production KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-head">
        <span>គណនី TELEGRAM & SESSION</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <div class="kpi-val" id="kpiAccountName">Song Ra</div>
      <div class="kpi-foot">
        <span class="badge badge-ok">ចងចាំ Session អចិន្ត្រៃយ៍ ១០០%</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span>ស្ថានភាព CHANNEL ក្នុង FOLDER</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </div>
      <div class="kpi-val" id="kpiChannelStats">45 រឿង</div>
      <div class="kpi-foot" id="kpiChannelBreakdown">គ្រប់ភាគ: 14 • បន្តភាគ: 9 • ទទេ: 21 • លុបដាក់ថ្មី: 1</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span>ប្រព័ន្ធចងចាំការងារ (CRASH-SAFE RESUME)</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
      </div>
      <div class="kpi-val" id="kpiResumeStatus">គ្មានការងារសល់</div>
      <div class="kpi-foot">
        <button id="resumeBtn" class="btn-amber" style="padding:5px 12px; font-size:12px; display:none;" onclick="resumeUnfinishedQueue()">
          បន្តការងារពីកន្លែងឈប់ចុងក្រោយ
        </button>
        <span id="kpiAllTimeCount">ការពារការ Upload ស្ទួន ១០០%</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span>វឌ្ឍនភាពបច្ចុប្បន្ន (LIVE PIPELINE)</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div class="kpi-val" id="kpiProgressPct">0%</div>
      <div class="kpi-foot" id="kpiCompletedJobs">ជោគជ័យក្នុងវគ្គនេះ: 0 ភាគ</div>
    </div>
  </div>

  <!-- Pipeline Control & Live Telemetry Card -->
  <div class="card">
    <div class="topbar" style="padding:0; border:none; box-shadow:none; background:transparent;">
      <div>
        <div class="sec-title" style="margin-bottom:4px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>បញ្ជាដំណើរការ និងតាមដានជំហានផ្ទាល់ (Real-Time Pipeline Control)</span>
        </div>
        <div class="brand-sub" id="phaseText">រួចរាល់ (Idle) — រាល់ភាគដែលមានរួចហើយនឹងត្រូវរំលងដោយស្វ័យប្រវត្តិ</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn-outline" onclick="auditAllMatched()">ឆែកមើលភាគក្នុង Channel ទាំងអស់</button>
        <button class="btn-success" onclick="startSelectedSync()">ដំណើរការរឿងដែលបានជ្រើសរើស</button>
        <button class="btn-primary" onclick="startAllMatchedSync()">ដំណើរការគ្រប់រឿងដែលមិនទាន់គ្រប់ភាគទាំងអស់</button>
        <button class="btn-danger" onclick="stopSync()">ផ្អាក និងរក្សាទុក (Pause & Save)</button>
      </div>
    </div>

    <div class="pipeline-steps">
      <div class="p-step" id="pStep1"><span class="p-step-num">1</span><span>ឆែក Channel & លុបបើខ្វះភាគ ១</span></div>
      <div class="p-step" id="pStep2"><span class="p-step-num">2</span><span>Download ភាគពី Website</span></div>
      <div class="p-step" id="pStep3"><span class="p-step-num">3</span><span>FFmpeg បង្រួមទំហំ (តិច MB)</span></div>
      <div class="p-step" id="pStep4"><span class="p-step-num">4</span><span>Upload ចូល Telegram & កត់ត្រា</span></div>
    </div>
    <div class="progress-track"><div class="progress-fill" id="stepBar"></div></div>
  </div>

  <!-- Settings Grid -->
  <div class="grid-2">
    <div class="card">
      <div class="sec-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>១. គណនី Telegram និង Link Folder គោលដៅ</span>
      </div>
      <div class="row">
        <div>
          <label>លេខទូរស័ព្ទគណនី Telegram (ចងចាំអចិន្ត្រៃយ៍)</label>
          <input type="text" id="phoneInput" value="+855888162192">
        </div>
        <div style="flex:0 0 auto;">
          <button class="btn-outline" onclick="sendOtpCode()">ពិនិត្យ / ផ្ញើកូដ OTP</button>
        </div>
      </div>

      <div id="otpRow" class="row" style="display:none; background:#F1F5F9; padding:12px; border-radius:12px;">
        <div>
          <label>កូដ OTP (៥ ខ្ទង់ពី Telegram)</label>
          <input type="text" id="otpInput" placeholder="ឧ. 12345">
        </div>
        <div>
          <label>2FA Password (បើមាន)</label>
          <input type="password" id="pwdInput" placeholder="ទុកទទេបើគ្មាន">
        </div>
        <div style="flex:0 0 auto;">
          <button class="btn-success" onclick="verifyOtpCode()">បញ្ជាក់ការ Log In</button>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Link Folder Telegram (t.me/addlist/...)</label>
          <input type="text" id="folderInput" value="https://t.me/addlist/7NvrQmWmBNUwZDNl">
        </div>
      </div>

      <label class="check-line">
        <input type="checkbox" id="autoResumeCheck" checked>
        <span>បន្តការងារដោយស្វ័យប្រវត្តិ (Auto-Resume) នៅពេលបើក Tool ឡើងវិញក្រោយពេលបិទ ឬដាច់ភ្លើង</span>
      </label>
      <label class="check-line">
        <input type="checkbox" id="autoResetCheck" checked>
        <span>លុបវីដេអូចាស់ក្នុង Channel ចោលស្វ័យប្រវត្តិ បើរឿងមានភាគ ១ តែក្នុង Channel អត់មានភាគ ១ (ឧ. មានតែភាគ ៥-១០) រួច Upload ពីភាគ ១ ឡើងវិញ</span>
      </label>
    </div>

    <div class="card">
      <div class="sec-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>២. ការកំណត់ការបង្រួមទំហំ (MB) និង Description ពីក្រោមវីដេអូ</span>
      </div>
      <div class="row">
        <div>
          <label>កម្រិតបង្រួមទំហំវីដេអូ (FFmpeg Smart Low-MB)</label>
          <select id="presetSelect">
            <option value="720p_low_mb">720p HD តិច MB បំផុត (~35-70MB/ភាគ - ណែនាំ)</option>
            <option value="480p_ultra">480p Ultra-Light (~20-35MB/ភាគ - ស៊ីមេតិចបំផុត)</option>
            <option value="1080p_opt">1080p Full HD Optimized (~80-120MB/ភាគ)</option>
            <option value="copy_raw">មិនបង្រួម (ប្រើទំហំដើមពី Website)</option>
          </select>
        </div>
        <div style="max-width: 170px;">
          <label>សម្រាករវាងភាគ (វិនាទី)</label>
          <input type="number" id="delayInput" value="10" min="2" max="300">
        </div>
      </div>

      <label>Description ពីក្រោមវីដេអូ ({ep_num} នឹងជំនួសដោយលេខភាគ 1, 2, 3... ស្វ័យប្រវត្តិ)</label>
      <textarea id="captionInput"></textarea>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <label class="check-line" style="margin:0;">
          <input type="checkbox" id="includeTitleCheck">
          <span>ដាក់ឈ្មោះរឿងនៅបន្ទាត់ខាងលើគេនៃ Description</span>
        </label>
        <button class="btn-outline" onclick="saveSettings()">រក្សាទុកការកំណត់ (Save Settings)</button>
      </div>
    </div>
  </div>

  <!-- Series Mapping & Audit Table -->
  <div class="card">
    <div class="topbar" style="padding:0 0 14px 0; border:none; box-shadow:none; background:transparent;">
      <div class="filter-tabs" id="filterTabs">
        <span class="tab-pill active" onclick="setFilter('all', this)">ទាំងអស់ (45)</span>
        <span class="tab-pill" onclick="setFilter('need_action', this)">ត្រូវការ Upload (31)</span>
        <span class="tab-pill" onclick="setFilter('incomplete_reset_needed', this)">ត្រូវលុបដាក់ថ្មីពីភាគ ១ (1)</span>
        <span class="tab-pill" onclick="setFilter('partial_valid', this)">បន្តភាគបន្ទាប់ (9)</span>
        <span class="tab-pill" onclick="setFilter('empty', this)">Channel ទទេ (21)</span>
        <span class="tab-pill" onclick="setFilter('complete', this)">គ្រប់ភាគ ១០០% (14)</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <input type="text" id="searchFilter" placeholder="ស្វែងរកឈ្មោះរឿង ឬ Channel..." style="width: 260px;" oninput="renderTable()">
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:40px;"><input type="checkbox" id="selectAllBox" onchange="toggleSelectAll(this.checked)"></th>
            <th style="width:65px;">ID</th>
            <th>រឿងនៅលើ Website</th>
            <th>ភាគលើ Website</th>
            <th>Telegram Channel ក្នុង Folder</th>
            <th>ស្ថានភាពភាគក្នុង Channel ផ្ទាល់</th>
            <th style="text-align:right;">សកម្មភាព</th>
          </tr>
        </thead>
        <tbody id="catalogBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Live Logs -->
  <div class="card">
    <div class="sec-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
      <span>កំណត់ហេតុដំណើរការផ្ទាល់ (Live Production Telemetry Logs)</span>
    </div>
    <div class="log-console" id="logBox"></div>
  </div>
</div>

<script>
let globalState = { folder_channels: [], catalog_anime: [], checkpoint_summary: {} };
let selectedAnimeIds = new Set();
let currentFilter = 'all';

async function apiPost(path, body = {}) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await res.json();
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderTable();
}

async function initStudio() {
  const cfg = await (await fetch('/api/config')).json();
  document.getElementById('phoneInput').value = cfg.phone || '+855888162192';
  document.getElementById('folderInput').value = cfg.folder_link || 'https://t.me/addlist/7NvrQmWmBNUwZDNl';
  document.getElementById('captionInput').value = cfg.caption_template || '';
  document.getElementById('presetSelect').value = cfg.compression_preset || '720p_low_mb';
  document.getElementById('delayInput').value = cfg.delay_seconds || 10;
  document.getElementById('autoResetCheck').checked = cfg.auto_reset_incomplete_channel !== false;
  document.getElementById('autoResumeCheck').checked = cfg.auto_resume_on_startup !== false;
  document.getElementById('includeTitleCheck').checked = !!cfg.include_title_in_caption;

  await refreshState();
  setInterval(refreshState, 2000);
}

async function refreshState() {
  try {
    const st = await (await fetch('/api/state')).json();
    globalState = st;

    const badge = document.getElementById('authBadge');
    if (st.tg_authorized && st.tg_user) {
      badge.className = 'badge badge-ok';
      badge.textContent = `បានភ្ជាប់អចិន្ត្រៃយ៍: ${st.tg_user.first_name || ''} (+${st.tg_user.phone || ''})`;
      document.getElementById('kpiAccountName').textContent = `${st.tg_user.first_name || 'Admin'} (+${st.tg_user.phone || ''})`;
      document.getElementById('otpRow').style.display = 'none';
    } else if (st.tg_awaiting_code) {
      badge.className = 'badge badge-warn';
      badge.textContent = 'កំពុងរង់ចាំបញ្ចូលកូដ OTP ពី Telegram...';
      document.getElementById('otpRow').style.display = 'flex';
    } else {
      badge.className = 'badge badge-err';
      badge.textContent = 'មិនទាន់បាន Log in Telegram';
    }

    // Update KPI Channel Breakdown
    const matched = (st.catalog_anime || []).filter(a => a.matched_channel_id && a.episodes_count > 0);
    let cComplete = 0, cPartial = 0, cEmpty = 0, cReset = 0;
    matched.forEach(a => {
      const s = a.channel_audit ? a.channel_audit.status : '';
      if (s === 'complete') cComplete++;
      else if (s === 'partial_valid') cPartial++;
      else if (s === 'empty') cEmpty++;
      else if (s === 'incomplete_reset_needed') cReset++;
    });
    document.getElementById('kpiChannelStats').textContent = `${matched.length} រឿងក្នុង Folder`;
    document.getElementById('kpiChannelBreakdown').textContent =
      `គ្រប់ភាគ: ${cComplete} • បន្តភាគ: ${cPartial} • ទទេ: ${cEmpty} • លុបដាក់ថ្មី: ${cReset}`;

    // Update Checkpoint Resume Card
    const cp = st.checkpoint_summary || {};
    const resumeBtn = document.getElementById('resumeBtn');
    if (cp.unfinished_queue && !st.is_running) {
      document.getElementById('kpiResumeStatus').textContent = `សល់ការងារ ${cp.remaining_anime_count} រឿង`;
      resumeBtn.style.display = 'inline-flex';
    } else if (st.is_running) {
      document.getElementById('kpiResumeStatus').textContent = 'កំពុងដំណើរការ & កត់ត្រា...';
      resumeBtn.style.display = 'none';
    } else {
      document.getElementById('kpiResumeStatus').textContent = 'រួចរាល់ (គ្មានការងារសល់)';
      resumeBtn.style.display = 'none';
    }
    document.getElementById('kpiAllTimeCount').textContent =
      `បាន Upload សរុប: ${cp.total_uploaded_all_time || 0} ភាគ`;

    // Pipeline stage highlights
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`pStep${i}`);
      if (el) el.classList.toggle('active', st.pipeline_stage === i);
    }

    document.getElementById('kpiProgressPct').textContent = `${st.step_progress || 0}%`;
    document.getElementById('kpiCompletedJobs').textContent = `ជោគជ័យក្នុងវគ្គនេះ: ${st.completed_jobs} ភាគ`;
    document.getElementById('phaseText').textContent =
      `${st.current_phase} ${st.current_anime ? ' | ' + st.current_anime : ''} ${st.current_ep ? ' (ភាគ ' + st.current_ep + ')' : ''}`;
    document.getElementById('stepBar').style.width = `${st.step_progress || 0}%`;

    const logBox = document.getElementById('logBox');
    logBox.innerHTML = (st.logs || []).map(l =>
      `<div class="log-${l.level}">[${l.time}] ${l.msg}</div>`
    ).join('');
    logBox.scrollTop = logBox.scrollHeight;

    renderTable();
  } catch (e) {}
}

function renderTable() {
  const q = (document.getElementById('searchFilter').value || '').toLowerCase().trim();
  const tbody = document.getElementById('catalogBody');
  const channels = globalState.folder_channels || [];

  const rows = (globalState.catalog_anime || []).filter(a => {
    if (!a.matched_channel_id || a.episodes_count === 0) return false;
    const st = a.channel_audit ? a.channel_audit.status : '';
    if (currentFilter === 'need_action' && st === 'complete') return false;
    if (currentFilter !== 'all' && currentFilter !== 'need_action' && st !== currentFilter) return false;
    if (!q) return true;
    return (a.title || '').toLowerCase().includes(q) ||
           (a.alt_title || '').toLowerCase().includes(q) ||
           (a.matched_channel_title || '').toLowerCase().includes(q);
  });

  tbody.innerHTML = rows.map(a => {
    const checked = selectedAnimeIds.has(a.id) ? 'checked' : '';
    const options = channels.map(c =>
      `<option value="${c.id}" ${c.id === a.matched_channel_id ? 'selected' : ''}>${c.title}</option>`
    ).join('');

    let auditHtml = '<span class="badge badge-warn">កំពុងឆែក...</span>';
    if (a.channel_audit) {
      const st = a.channel_audit.status;
      const cls = st === 'complete' ? 'badge-ok' : (st === 'incomplete_reset_needed' ? 'badge-err' : (st === 'partial_valid' ? 'badge-blue' : 'badge-warn'));
      auditHtml = `<span class="badge ${cls}">${a.channel_audit.status_label}</span>`;
    }

    const poster = a.poster_url || 'https://placehold.co/84x112/E2E8F0/475569?text=No+Poster';

    return `<tr>
      <td><input type="checkbox" ${checked} onchange="toggleAnime(${a.id}, this.checked)"></td>
      <td style="font-weight:700; color:var(--text-muted);">#${a.id}</td>
      <td>
        <div class="anime-cell">
          <img class="poster-thumb" src="${poster}" alt="" onerror="this.src='https://placehold.co/84x112/E2E8F0/475569?text=Anime'">
          <div>
            <div style="font-weight:700; color:var(--text-primary);">${a.title}</div>
            <div style="font-size:12px; color:var(--text-muted);">${a.alt_title || ''}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge badge-blue">${a.episodes_count} ភាគ</span>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${a.ep_range}</div>
      </td>
      <td>
        <select onchange="overrideChannel(${a.id}, this.value)">${options}</select>
      </td>
      <td>${auditHtml}</td>
      <td style="text-align:right;">
        <button class="btn-primary" style="padding:7px 14px; font-size:12.5px;" onclick="startSingleAnime(${a.id})">
          Upload រឿងនេះ
        </button>
      </td>
    </tr>`;
  }).join('');
}

function toggleAnime(id, checked) {
  if (checked) selectedAnimeIds.add(id);
  else selectedAnimeIds.delete(id);
}

function toggleSelectAll(checked) {
  selectedAnimeIds.clear();
  if (checked) {
    (globalState.catalog_anime || []).forEach(a => {
      if (a.matched_channel_id && a.episodes_count > 0) selectedAnimeIds.add(a.id);
    });
  }
  renderTable();
}

async function sendOtpCode() {
  const phone = document.getElementById('phoneInput').value.trim();
  const res = await apiPost('/api/send_code', { phone });
  if (res.status === 'code_sent') {
    document.getElementById('otpRow').style.display = 'flex';
  }
  await refreshState();
}

async function verifyOtpCode() {
  const phone = document.getElementById('phoneInput').value.trim();
  const code = document.getElementById('otpInput').value.trim();
  const password = document.getElementById('pwdInput').value;
  await apiPost('/api/verify_code', { phone, code, password });
  await refreshState();
}

async function scanFolderChannels() {
  const folder_link = document.getElementById('folderInput').value.trim();
  await apiPost('/api/scan_folder', { folder_link });
  await refreshState();
}

async function overrideChannel(animeId, channelId) {
  await apiPost('/api/override_channel', { anime_id: animeId, channel_id: channelId ? parseInt(channelId) : null });
  await refreshState();
}

async function saveSettings() {
  await apiPost('/api/save_config', {
    phone: document.getElementById('phoneInput').value.trim(),
    folder_link: document.getElementById('folderInput').value.trim(),
    caption_template: document.getElementById('captionInput').value,
    compression_preset: document.getElementById('presetSelect').value,
    delay_seconds: parseInt(document.getElementById('delayInput').value || '10'),
    auto_reset_incomplete_channel: document.getElementById('autoResetCheck').checked,
    auto_resume_on_startup: document.getElementById('autoResumeCheck').checked,
    include_title_in_caption: document.getElementById('includeTitleCheck').checked,
  });
}

async function auditAllMatched() {
  await apiPost('/api/audit_channels', {});
  await refreshState();
}

async function startSingleAnime(animeId) {
  await saveSettings();
  await apiPost('/api/start_sync', { anime_ids: [animeId] });
  await refreshState();
}

async function startSelectedSync() {
  const ids = Array.from(selectedAnimeIds);
  if (!ids.length) {
    alert('សូមជ្រើសរើសរឿងយ៉ាងហោចណាស់ ១ ជាមុនសិន!');
    return;
  }
  await saveSettings();
  await apiPost('/api/start_sync', { anime_ids: ids });
  await refreshState();
}

async function startAllMatchedSync() {
  const ids = (globalState.catalog_anime || [])
    .filter(a => a.matched_channel_id && a.episodes_count > 0 && (!a.channel_audit || a.channel_audit.status !== 'complete'))
    .map(a => a.id);
  if (!ids.length) {
    alert('គ្រប់រឿងទាំងអស់មានភាគគ្រប់រួចរាល់ហើយ!');
    return;
  }
  await saveSettings();
  await apiPost('/api/start_sync', { anime_ids: ids });
  await refreshState();
}

async function resumeUnfinishedQueue() {
  await apiPost('/api/resume_queue', {});
  await refreshState();
}

async function stopSync() {
  await apiPost('/api/stop_sync', {});
  await refreshState();
}

window.addEventListener('DOMContentLoaded', initStudio);
</script>
</body>
</html>
"""


class StudioHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def _send_json(self, payload: Any, status: int = 200) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/" or self.path.startswith("/index"):
            raw = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        elif self.path == "/api/config":
            self._send_json(load_config())
        elif self.path == "/api/state":
            refresh_checkpoint_summary_in_state()
            with state_lock:
                self._send_json(app_state)
        else:
            self.send_error(404)

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}

        try:
            if self.path == "/api/send_code":
                phone = body.get("phone") or DEFAULT_PHONE
                res = tg_worker.run_coro(tg_worker.send_login_code(phone, DEFAULT_API_ID, DEFAULT_API_HASH))
                self._send_json(res)
            elif self.path == "/api/verify_code":
                res = tg_worker.run_coro(
                    tg_worker.verify_login_code(
                        body.get("phone") or DEFAULT_PHONE,
                        body.get("code") or "",
                        body.get("password") or "",
                    )
                )
                self._send_json(res)
            elif self.path == "/api/scan_folder":
                res = tg_worker.run_coro(tg_worker.scan_folder_and_channels(body.get("folder_link") or DEFAULT_FOLDER_LINK))
                self._send_json(res)
            elif self.path == "/api/override_channel":
                cfg = load_config()
                overrides = cfg.get("channel_overrides") or {}
                aid_str = str(body.get("anime_id"))
                cid = body.get("channel_id")
                if cid:
                    overrides[aid_str] = int(cid)
                else:
                    overrides.pop(aid_str, None)
                cfg["channel_overrides"] = overrides
                save_config(cfg)
                rebuild_catalog_state()
                self._send_json({"ok": True})
            elif self.path == "/api/save_config":
                cfg = load_config()
                cfg.update(body)
                save_config(cfg)
                add_log("បានរក្សាទុកការកំណត់ជោគជ័យ!", "ok")
                self._send_json({"ok": True})
            elif self.path == "/api/audit_channels":
                async def _audit_all():
                    audit_map = {}
                    with state_lock:
                        rows = list(app_state["catalog_anime"])
                    for r in rows:
                        cid = r.get("matched_channel_id")
                        if cid and r.get("episodes_count", 0) > 0:
                            add_log(f"កំពុងឆែក Channel [{r.get('matched_channel_title')}]...", "info")
                            audit_map[int(r["id"])] = await tg_worker.audit_single_channel(
                                int(r["id"]), int(cid), r.get("ep_numbers") or []
                            )
                    rebuild_catalog_state(audit_map)
                    add_log("ស្កេនឆែកមើលភាគក្នុង Channel ទាំងអស់រួចរាល់ ១០០%!", "ok")
                    return {"ok": True, "audited_count": len(audit_map)}

                res = tg_worker.run_coro(_audit_all(), timeout=900)
                self._send_json(res)
            elif self.path == "/api/start_sync":
                ids = [int(x) for x in (body.get("anime_ids") or [])]
                started = start_sync_in_background(ids, is_resume=False)
                self._send_json({"started": started})
            elif self.path == "/api/resume_queue":
                cp = load_checkpoint()
                rem = [
                    int(aid) for aid in (cp.get("active_queue_anime_ids") or [])
                    if int(aid) not in (cp.get("completed_anime_ids") or [])
                ]
                if rem:
                    add_log(f"កំពុងបន្តការងារពីកន្លែងឈប់ចុងក្រោយ ({len(rem)} រឿងនៅសល់)...", "ok")
                    started = start_sync_in_background(rem, is_resume=True)
                    self._send_json({"started": started, "resumed_count": len(rem)})
                else:
                    self._send_json({"started": False, "message": "គ្មានការងារសល់ក្នុង Checkpoint ទេ"})
            elif self.path == "/api/stop_sync":
                with state_lock:
                    app_state["should_stop"] = True
                add_log("កំពុងផ្អាកដំណើរការ និងរក្សាទុកក្នុង Checkpoint សម្រាប់បន្តលើកក្រោយ...", "warn")
                self._send_json({"ok": True})
            else:
                self.send_error(404)
        except Exception as e:
            add_log(f"API Error ({self.path}): {e}", "err")
            self._send_json({"error": str(e)}, status=500)


def launch_native_app_window(url: str) -> None:
    """Opens the Studio GUI in a standalone native-style Chrome/Edge app window."""
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for exe in candidates:
        if os.path.exists(exe):
            try:
                subprocess.Popen([exe, f"--app={url}", "--window-size=1440,920"])
                return
            except Exception:
                pass
    webbrowser.open(url)


def main() -> None:
    print("=" * 72, flush=True)
    print("  MER DONGHUA — WEBSITE TO TELEGRAM CHANNEL AUTO-SYNC STUDIO (v3.0)", flush=True)
    print(f"  Telegram Account : {DEFAULT_PHONE}", flush=True)
    print(f"  Folder Link      : {DEFAULT_FOLDER_LINK}", flush=True)
    print(f"  Dashboard URL    : http://127.0.0.1:{PORT}", flush=True)
    print("=" * 72, flush=True)

    # Clean any partial/interrupted temporary video files left from a power outage
    for f in TEMP_VIDEO_DIR.glob("*"):
        try:
            f.unlink(missing_ok=True)
        except Exception:
            pass

    load_website_catalog()
    status = tg_worker.run_coro(tg_worker.check_auth_status())
    if status.get("authorized"):
        try:
            tg_worker.run_coro(tg_worker.scan_folder_and_channels(DEFAULT_FOLDER_LINK, auto_join=True))

            def _bg_initial_audit_and_resume():
                try:
                    async def _run_audit():
                        audit_map = {}
                        with state_lock:
                            rows = list(app_state["catalog_anime"])
                        for r in rows:
                            cid = r.get("matched_channel_id")
                            if cid and r.get("episodes_count", 0) > 0:
                                audit_map[int(r["id"])] = await tg_worker.audit_single_channel(
                                    int(r["id"]), int(cid), r.get("ep_numbers") or []
                                )
                        rebuild_catalog_state(audit_map)
                        add_log("ស្កេនឆែកមើលភាគក្នុងគ្រប់ Channel ទាំងអស់រួចរាល់ ១០០%!", "ok")
                    tg_worker.run_coro(_run_audit(), timeout=900)

                    # Auto-resume interrupted queue if configured
                    cfg = load_config()
                    cp = load_checkpoint()
                    rem = [
                        int(aid) for aid in (cp.get("active_queue_anime_ids") or [])
                        if int(aid) not in (cp.get("completed_anime_ids") or [])
                    ]
                    if cfg.get("auto_resume_on_startup", True) and cp.get("unfinished_queue") and rem:
                        add_log(f"រកឃើញការងារដែលមិនទាន់ចប់ ({len(rem)} រឿង) — កំពុងបន្តដោយស្វ័យប្រវត្តិ (Auto-Resume)...", "ok")
                        start_sync_in_background(rem, is_resume=True)
                except Exception as ex:
                    add_log(f"Initial audit note: {ex}", "warn")

            threading.Thread(target=_bg_initial_audit_and_resume, daemon=True).start()
        except Exception as e:
            add_log(f"Auto folder scan note: {e}", "warn")

    server = HTTPServer(("127.0.0.1", PORT), StudioHTTPHandler)
    url = f"http://127.0.0.1:{PORT}"
    if "--no-window" not in sys.argv:
        threading.Timer(1.2, lambda: launch_native_app_window(url)).start()
    add_log(f"Studio GUI កំពុងដំណើរការនៅលើ {url}", "ok")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")


if __name__ == "__main__":
    main()
