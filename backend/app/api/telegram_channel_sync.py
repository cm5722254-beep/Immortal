import os
import re
import json
import time
import shutil
import asyncio
import datetime
import subprocess
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

from fastapi import APIRouter, Depends, HTTPException, Body
from app.dependencies.auth import require_admin
from app.models.user import User

try:
    from telethon import TelegramClient, errors, functions, types, utils, events
    from telethon.sessions import StringSession
    from telethon.tl.types import DocumentAttributeVideo, MessageMediaDocument
    HAS_TELETHON = True
except ImportError:
    HAS_TELETHON = False

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = shutil.which("ffmpeg") or "ffmpeg"

router = APIRouter(prefix="/admin/telegram-sync", tags=["Admin Telegram Channel Sync"])

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
SYNC_WORK_DIR = ROOT_DIR / "tools" / "telegram_sync"
SYNC_WORK_DIR.mkdir(parents=True, exist_ok=True)

TEMP_VIDEO_DIR = SYNC_WORK_DIR / "temp_videos_cloud"
TEMP_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_PATH = SYNC_WORK_DIR / "tg_sync_config.json"
CHECKPOINT_PATH = SYNC_WORK_DIR / "tg_sync_checkpoint.json"

DEFAULT_FOLDER_LINK = "https://t.me/addlist/7NvrQmWmBNUwZDNl"
DEFAULT_PHONE = "+855888162192"
DEFAULT_API_ID = 2040
DEFAULT_API_HASH = "b18441a1ff607e10a989891a5462e627"
DEFAULT_SESSION_STRING = os.getenv(
    "TELEGRAM_USER_SESSION",
    "1BVtsOKsBuwSSlAqvCrWgTXUi86-t0cF3vF7h7dIXXk-LOrs9fIgQ-zP4bWOYgUF040JMiWa0oz_1lLLgzpVyq9jp_QwMleCuHI7OWDZibd5fa-1idlJi4DxIYt3YVZs0KNQ0EVRkKXtN4hu18mzci9ZtiZBcP4gXYcjZxAb4G1KMSQxPBXjpbdFD-yVmKHsIpIw9HUIl386qR-fNnbW6RJXmh2daU9pO4FSnq7OKN_vmj9NRc_PtmlgTJMFNgk4LLfxE55ikVY0QmLvjbrnmcLLJ0dPV4gqsiUNsu47RLj1zHy4obcqT2ad2UH6i44YJry2kp_m3c3Q0ANuvEJcbSB1JkBET0xM=",
)

DEFAULT_CAPTION_TEMPLATE = (
    "👉Episode : {ep_num}\n"
    "👉Quality : 4K Ultra HD\n"
    "👉Subtitle : Chinese\n\n"
    "កុំភ្លេចហៅមិត្តភក្តិឲ្យមើលឲ្យច្រើនៗណាដើម្បីលើកទឹកចិត្ត Admin អគុណ❤️។"
)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
KM_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")

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
        "session_string": DEFAULT_SESSION_STRING,
        "folder_link": DEFAULT_FOLDER_LINK,
        "caption_template": DEFAULT_CAPTION_TEMPLATE,
        "include_title_in_caption": False,
        "compression_preset": "720p_low_mb",
        "delay_seconds": 10,
        "auto_reset_incomplete_channel": True,
        "auto_resume_on_startup": True,
        "daemon_24_7_enabled": True,
        "delete_temp_after_upload": True,
        "local_videos_dir": r"D:\MerDonghua_Videos" if os.path.exists("D:\\") else str(ROOT_DIR / "downloaded_videos"),
        "channel_overrides": {},
    }
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
            if not saved.get("session_string"):
                saved["session_string"] = DEFAULT_SESSION_STRING
            default_cfg.update(saved)
        except Exception:
            pass
    return default_cfg


def save_config(cfg: Dict[str, Any]) -> None:
    try:
        tmp = CONFIG_PATH.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        tmp.replace(CONFIG_PATH)
    except Exception:
        pass


def load_checkpoint() -> Dict[str, Any]:
    default_cp = {
        "unfinished_queue": False,
        "active_queue_anime_ids": [],
        "completed_anime_ids": [],
        "current_anime_id": None,
        "current_ep_num": None,
        "uploaded_registry": {},
        "cleaned_channels": {},
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
    try:
        cp["last_updated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tmp = CHECKPOINT_PATH.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cp, f, ensure_ascii=False, indent=2)
        tmp.replace(CHECKPOINT_PATH)
    except Exception:
        pass


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


# ── In-Memory Live State ─────────────────────────────────────────────────────
sync_state: Dict[str, Any] = {
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
    "pipeline_stage": 0,
    "current_phase": "រួចរាល់ (24/7 Cloud Auto-Sync Active)",
    "current_anime": "",
    "current_ep": 0,
    "step_progress": 0.0,
    "total_jobs": 0,
    "completed_jobs": 0,
    "checkpoint_summary": {},
    "logs": [],
}

raw_anime_map: Dict[int, Dict[str, Any]] = {}
raw_episodes_by_anime: Dict[int, List[Dict[str, Any]]] = {}
_tg_client: Optional["TelegramClient"] = None
_tg_lock = asyncio.Lock()
_sync_task: Optional[asyncio.Task] = None
_handlers_registered = False


def add_log(msg: str, level: str = "info") -> None:
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    sync_state["logs"].append({"time": ts, "msg": msg, "level": level})
    if len(sync_state["logs"]) > 250:
        sync_state["logs"].pop(0)


def refresh_checkpoint_summary() -> None:
    cp = load_checkpoint()
    remaining_ids = [
        aid for aid in (cp.get("active_queue_anime_ids") or [])
        if aid not in (cp.get("completed_anime_ids") or [])
    ]
    sync_state["checkpoint_summary"] = {
        "unfinished_queue": bool(cp.get("unfinished_queue") and remaining_ids),
        "remaining_anime_ids": remaining_ids,
        "remaining_anime_count": len(remaining_ids),
        "current_anime_id": cp.get("current_anime_id"),
        "current_ep_num": cp.get("current_ep_num"),
        "total_uploaded_all_time": cp.get("total_uploaded_all_time", 0),
        "last_updated": cp.get("last_updated", ""),
    }


def load_website_catalog() -> Tuple[int, int]:
    global raw_anime_map, raw_episodes_by_anime
    candidates = [
        ROOT_DIR / "backend" / "app" / "services" / "seed_export.json",
        Path(__file__).resolve().parent.parent / "services" / "seed_export.json",
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
                break
            elif isinstance(data, list) and data and "anime" in data[0]:
                for item in data:
                    anime_list.append(item.get("anime", {}))
                    episodes_list.extend(item.get("episodes", []))
                break
        except Exception:
            pass

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
    refresh_checkpoint_summary()
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
    for cand in [anime.get("title") or "", anime.get("alt_title") or ""]:
        c_norm = normalize_name(cand)
        if len(c_norm) < 3:
            continue
        if c_norm == ch_norm:
            return 1.0
        if len(c_norm) >= 5 and len(ch_norm) >= 5 and (c_norm in ch_norm or ch_norm in c_norm):
            ratio = min(len(c_norm), len(ch_norm)) / max(len(c_norm), len(ch_norm))
            if ratio >= 0.5:
                return round(0.80 + 0.15 * ratio, 3)
    return 0.0


def rebuild_catalog_state(audit_map: Optional[Dict[int, Dict[str, Any]]] = None) -> None:
    cfg = load_config()
    overrides: Dict[str, Any] = cfg.get("channel_overrides") or {}
    channels = list(sync_state["folder_channels"])
    prev_audits = {
        item["id"]: item.get("channel_audit")
        for item in sync_state.get("catalog_anime", [])
        if item.get("channel_audit")
    }

    ch_by_id = {int(c["id"]): c for c in channels}
    folder_only_channels = [c for c in channels if c.get("from_folder")]
    catalog_rows: List[Dict[str, Any]] = []

    for aid, anime in sorted(raw_anime_map.items(), key=lambda x: 1.5 if x[0] == 1001 else float(x[0])):
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

    sync_state["catalog_anime"] = catalog_rows


async def get_tg_client() -> "TelegramClient":
    global _tg_client, _handlers_registered
    if not HAS_TELETHON:
        raise RuntimeError("Telethon is not installed in the current Python environment.")
    async with _tg_lock:
        cfg = load_config()
        api_id = int(cfg.get("api_id") or DEFAULT_API_ID)
        api_hash = str(cfg.get("api_hash") or DEFAULT_API_HASH).strip()
        session_str = (cfg.get("session_string") or DEFAULT_SESSION_STRING).strip()

        if _tg_client is None:
            _tg_client = TelegramClient(
                StringSession(session_str),
                api_id,
                api_hash,
                device_model="MerDonghua 24/7 Cloud Sync",
                system_version="Linux Cloud",
                app_version="3.0.0",
            )
        if not _tg_client.is_connected():
            await _tg_client.connect()

        if not _handlers_registered:
            _register_telegram_web_commands(_tg_client)
            _handlers_registered = True

        return _tg_client


def _register_telegram_web_commands(client: "TelegramClient") -> None:
    """
    Allows the Admin to control the 24/7 Auto-Sync directly from Telegram Web (web.telegram.org)
    or Telegram App by typing commands in Saved Messages or any chat:
      /sync_status — View live 24/7 sync status
      /sync_start  — Start/Resume syncing all incomplete channels
      /sync_stop   — Pause the queue and save checkpoint
      /sync_audit  — Audit all 45 channels in the folder
    """
    @client.on(events.NewMessage(outgoing=True, pattern=r"^/(sync_status|sync_start|sync_stop|sync_audit)\b"))
    async def _on_admin_tg_web_cmd(event):
        cmd = (event.raw_text or "").strip().split()[0].lower()
        if cmd == "/sync_status":
            matched = [a for a in sync_state["catalog_anime"] if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0]
            c_comp = sum(1 for a in matched if a.get("channel_audit", {}).get("status") == "complete")
            c_need = len(matched) - c_comp
            msg = (
                "📊 **MER DONGHUA — 24/7 TELEGRAM AUTO-SYNC STATUS**\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                f"• **ស្ថានភាព:** `{sync_state['current_phase']}`\n"
                f"• **កំពុងដំណើរការ:** `{'បាទ (Running)' if sync_state['is_running'] else 'រង់ចាំ (Idle)'}`\n"
                f"• **រឿងបច្ចុប្បន្ន:** `{sync_state['current_anime'] or '-'}` (ភាគ `{sync_state['current_ep']}` — `{sync_state['step_progress']}%`)\n"
                f"• **រឿងក្នុង Folder សរុប:** `{len(matched)}` រឿង (គ្រប់ភាគ: `{c_comp}`, ត្រូវ Upload បន្ត: `{c_need}`)\n"
                f"• **Upload ជោគជ័យសរុប:** `{sync_state.get('checkpoint_summary', {}).get('total_uploaded_all_time', 0)}` ភាគ\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "ពាក្យបញ្ជាលើ Telegram Web:\n"
                "`/sync_start` — ចាប់ផ្ដើម Upload 24/7\n"
                "`/sync_stop` — ផ្អាក និងរក្សាទុក Checkpoint\n"
                "`/sync_audit` — ឆែកមើលភាគក្នុង Channel ទាំងអស់"
            )
            await event.reply(msg)
        elif cmd == "/sync_start":
            ids = [
                int(a["id"]) for a in sync_state["catalog_anime"]
                if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
                and a.get("channel_audit", {}).get("status") != "complete"
            ]
            started = trigger_sync_queue_async(ids, is_resume=False)
            await event.reply(
                f"✅ បានចាប់ផ្ដើមដំណើរការ 24/7 Auto-Sync សម្រាប់ `{len(ids)}` រឿងរួចរាល់!" if started else "⚠️ ប្រព័ន្ធកំពុងតែដំណើរការរួចហើយ!"
            )
        elif cmd == "/sync_stop":
            sync_state["should_stop"] = True
            await event.reply("⏸ កំពុងផ្អាកដំណើរការ និងរក្សាទុកក្នុង Checkpoint សម្រាប់បន្តលើកក្រោយ!")
        elif cmd == "/sync_audit":
            await event.reply("🔍 កំពុងស្កេនឆែកមើលភាគក្នុងគ្រប់ Channel ទាំងអស់ សូមរង់ចាំបន្តិច...")
            await audit_all_matched_channels()
            matched = [a for a in sync_state["catalog_anime"] if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0]
            c_comp = sum(1 for a in matched if a.get("channel_audit", {}).get("status") == "complete")
            c_part = sum(1 for a in matched if a.get("channel_audit", {}).get("status") == "partial_valid")
            c_empty = sum(1 for a in matched if a.get("channel_audit", {}).get("status") == "empty")
            c_reset = sum(1 for a in matched if a.get("channel_audit", {}).get("status") == "incomplete_reset_needed")
            await event.reply(
                f"✅ **ស្កេនគ្រប់ Channel ទាំង {len(matched)} រឿងរួចរាល់!**\n"
                f"• គ្រប់ភាគ ១០០%: `{c_comp}` រឿង\n"
                f"• ត្រូវ Upload បន្តភាគ: `{c_part}` រឿង\n"
                f"• Channel ទទេ: `{c_empty}` រឿង\n"
                f"• ខ្វះភាគ ១ (ត្រូវលុបដាក់ថ្មី): `{c_reset}` រឿង"
            )


async def check_tg_auth_status() -> Dict[str, Any]:
    try:
        client = await get_tg_client()
        authorized = await client.is_user_authorized()
        user_info = None
        if authorized:
            s_str = StringSession.save(client.session)
            if s_str:
                cfg = load_config()
                if cfg.get("session_string") != s_str:
                    cfg["session_string"] = s_str
                    save_config(cfg)
            me = await client.get_me()
            user_info = {
                "id": me.id,
                "first_name": me.first_name or "",
                "last_name": me.last_name or "",
                "username": me.username or "",
                "phone": me.phone or "",
            }
        sync_state["tg_connected"] = True
        sync_state["tg_authorized"] = authorized
        sync_state["tg_user"] = user_info
        return {"authorized": authorized, "user": user_info}
    except Exception as e:
        add_log(f"Telegram connection notice: {e}", "warn")
        return {"authorized": False, "error": str(e)}


async def scan_folder_channels(folder_link: str = DEFAULT_FOLDER_LINK, auto_join: bool = True) -> Dict[str, Any]:
    client = await get_tg_client()
    if not await client.is_user_authorized():
        raise RuntimeError("Telegram account is not authorized yet.")

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
        try:
            res = await client(functions.chatlists.CheckChatlistInviteRequest(slug=slug))
            chats = getattr(res, "chats", []) or []
            missing_peers = getattr(res, "missing_peers", []) or []
            if auto_join and missing_peers:
                try:
                    await client(functions.chatlists.JoinChatlistInviteRequest(slug=slug, peers=missing_peers))
                except Exception:
                    pass
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
        except Exception as e:
            add_log(f"Folder scan note: {e}", "warn")

    channel_list = sorted(discovered.values(), key=lambda x: x.get("title", "").lower())
    sync_state["folder_channels"] = channel_list
    rebuild_catalog_state()
    matched_count = sum(1 for a in sync_state["catalog_anime"] if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0)
    add_log(f"បានស្កេន Folder ({len(channel_list)} Channels) និងផ្គូផ្គងរឿងចំនួន {matched_count} រឿង!", "ok")
    return {"channels_count": len(channel_list), "matched_anime_count": matched_count}


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


async def audit_single_channel(anime_id: int, channel_id: int, expected_ep_numbers: List[int]) -> Dict[str, Any]:
    client = await get_tg_client()
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
            "status_label": f"ក្នុង Channel មាន {len(found_set)} ភាគ (លើ Website គ្មានភាគ)",
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


async def audit_all_matched_channels() -> Dict[str, Any]:
    audit_map = {}
    rows = list(sync_state["catalog_anime"])
    for r in rows:
        cid = r.get("matched_channel_id")
        if cid and r.get("episodes_count", 0) > 0:
            audit_map[int(r["id"])] = await audit_single_channel(int(r["id"]), int(cid), r.get("ep_numbers") or [])
    rebuild_catalog_state(audit_map)
    add_log("ស្កេនឆែកមើលភាគក្នុង Channel ទាំងអស់រួចរាល់ ១០០%!", "ok")
    return {"ok": True, "audited_count": len(audit_map)}


def download_episode_video_sync(video_url: str, dest_path: Path) -> Path:
    if dest_path.exists():
        dest_path.unlink(missing_ok=True)
    if ".m3u8" in video_url.lower():
        cmd = [FFMPEG_EXE, "-y", "-user_agent", UA, "-i", video_url, "-c", "copy", "-bsf:a", "aac_adtstoasc", str(dest_path)]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return dest_path

    req = urllib.request.Request(video_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        downloaded = 0
        with open(dest_path, "wb") as out_f:
            while True:
                if sync_state["should_stop"]:
                    raise InterruptedError("Paused by admin")
                chunk = resp.read(512 * 1024)
                if not chunk:
                    break
                out_f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    sync_state["step_progress"] = round((downloaded / total) * 100.0, 1)
    return dest_path


def compress_video_sync(src_path: Path, out_path: Path, preset: str) -> Tuple[Path, int, int, int, Optional[Path]]:
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
        scale_filter, crf, audio_br, w, h = "scale='min(854,iw)':-2", "28", "80k", 854, 480
    elif preset == "1080p_opt":
        scale_filter, crf, audio_br, w, h = "scale='min(1920,iw)':-2", "26", "128k", 1920, 1080
    else:
        scale_filter, crf, audio_br, w, h = "scale='min(1280,iw)':-2", "27", "96k", 1280, 720

    cmd = [
        FFMPEG_EXE, "-y", "-i", str(src_path),
        "-vf", scale_filter, "-c:v", "libx264", "-preset", "veryfast", "-crf", crf,
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", audio_br, "-movflags", "+faststart",
        str(out_path),
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 100 * 1024:
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


async def process_anime_sync_queue(anime_ids: List[int]) -> None:
    cfg = load_config()
    client = await get_tg_client()
    if not await client.is_user_authorized():
        add_log("គណនី Telegram មិនទាន់បានភ្ជាប់ទេ!", "err")
        return

    cp = load_checkpoint()
    cp["unfinished_queue"] = True
    cp["active_queue_anime_ids"] = list(anime_ids)
    save_checkpoint(cp)
    refresh_checkpoint_summary()

    catalog_by_id = {int(item["id"]): item for item in sync_state["catalog_anime"]}

    for aid in anime_ids:
        if sync_state["should_stop"]:
            break
        anime = raw_anime_map.get(aid)
        cat_row = catalog_by_id.get(aid)
        if not anime or not cat_row:
            continue

        channel_id = cat_row.get("matched_channel_id")
        channel_title = cat_row.get("matched_channel_title") or ""
        if not channel_id:
            continue

        episodes = raw_episodes_by_anime.get(aid, [])
        if not episodes:
            continue

        expected_ep_nums = [int(e.get("episode_number") or 0) for e in episodes]
        sync_state["pipeline_stage"] = 1
        sync_state["current_anime"] = f"{anime.get('title')} -> {channel_title}"
        sync_state["current_phase"] = "កំពុងឆែកមើលភាគក្នុង Channel ដើម្បីការពារការ Upload ស្ទួន..."

        audit = await audit_single_channel(aid, int(channel_id), expected_ep_nums)
        cat_row["channel_audit"] = audit

        if audit["status"] == "complete":
            cp = load_checkpoint()
            if aid not in cp.get("completed_anime_ids", []):
                cp.setdefault("completed_anime_ids", []).append(aid)
                save_checkpoint(cp)
                refresh_checkpoint_summary()
            continue

        entity = await client.get_entity(int(channel_id))
        existing_in_channel: Set[int] = set(audit.get("found_episodes") or [])

        if audit["needs_reset"] and cfg.get("auto_reset_incomplete_channel", True):
            msg_ids = audit.get("msg_ids_to_delete") or []
            add_log(f"Channel [{channel_title}] {audit['status_label']} -> កំពុងលុបសារចាស់ {len(msg_ids)}...", "warn")
            for i in range(0, len(msg_ids), 100):
                try:
                    await client.delete_messages(entity, msg_ids[i : i + 100], revoke=True)
                    await asyncio.sleep(1.0)
                except Exception:
                    pass
            existing_in_channel.clear()
            target_ep_set = set(expected_ep_nums)
        else:
            target_ep_set = set(audit.get("episodes_to_upload") or [])

        episodes_to_upload = [e for e in episodes if int(e.get("episode_number") or 0) in target_ep_set]

        for ep in episodes_to_upload:
            if sync_state["should_stop"]:
                break
            ep_num = int(ep.get("episode_number") or 0)
            video_url = (ep.get("video_url") or ep.get("stream_url") or "").strip()
            if not video_url or ep_num in existing_in_channel:
                continue

            if "EP000.mp4" in video_url or "{id}" in video_url or "%7Bid%7D" in video_url:
                add_log(f"[ភាគ {ep_num}] វីដេអូជាគំរូ Placeholder (EP000.mp4 មិនទាន់មានភាគពេញ) -> រំលងដើម្បីកុំឲ្យ Upload ខុស", "warn")
                continue

            sync_state["current_ep"] = ep_num
            sync_state["step_progress"] = 0.0

            raw_temp_path = TEMP_VIDEO_DIR / f"anime_{aid}_ep_{ep_num:03d}_raw.mp4"
            opt_temp_path = TEMP_VIDEO_DIR / f"anime_{aid}_ep_{ep_num:03d}_opt.mp4"

            try:
                sync_state["pipeline_stage"] = 2
                sync_state["current_phase"] = f"កំពុង Download ភាគ {ep_num} ពី Website..."
                src_video_path = await asyncio.to_thread(download_episode_video_sync, video_url, raw_temp_path)

                if sync_state["should_stop"]:
                    break

                preset = cfg.get("compression_preset", "720p_low_mb")
                sync_state["pipeline_stage"] = 3
                sync_state["current_phase"] = f"កំពុងបង្រួមទំហំ (MB) ភាគ {ep_num}..."
                sync_state["step_progress"] = 50.0
                final_video, dur_sec, w, h, thumb_path = await asyncio.to_thread(
                    compress_video_sync, src_video_path, opt_temp_path, preset
                )

                if dur_sec < 60:
                    add_log(f"[ភាគ {ep_num}] វីដេអូមានប្រវែងក្រោម ៦០ វិនាទី ({dur_sec}s ជា Trailer/Sample) -> រំលងមិន Upload ទេ", "warn")
                    continue

                if sync_state["should_stop"]:
                    break

                caption = format_caption(anime, ep_num, cfg)
                sync_state["pipeline_stage"] = 4
                sync_state["current_phase"] = f"កំពុង Upload ភាគ {ep_num} ចូល Channel [{channel_title}]..."
                sync_state["step_progress"] = 0.0

                def _progress_cb(sent_bytes: int, total_bytes: int) -> None:
                    if total_bytes > 0:
                        sync_state["step_progress"] = round((sent_bytes / total_bytes) * 100.0, 1)

                while True:
                    try:
                        await client.send_file(
                            entity,
                            file=str(final_video),
                            caption=caption,
                            thumb=str(thumb_path) if thumb_path and thumb_path.exists() else None,
                            supports_streaming=True,
                            attributes=[DocumentAttributeVideo(duration=dur_sec, w=w, h=h, supports_streaming=True)],
                            progress_callback=_progress_cb,
                        )
                        break
                    except errors.FloodWaitError as fwe:
                        wait_s = int(fwe.seconds) + 3
                        add_log(f"Telegram FloodWait: រង់ចាំ {wait_s} វិនាទី...", "warn")
                        await asyncio.sleep(wait_s)

                existing_in_channel.add(ep_num)
                mark_episode_uploaded_in_checkpoint(aid, int(channel_id), ep_num)
                refresh_checkpoint_summary()
                sync_state["completed_jobs"] += 1
                sync_state["step_progress"] = 100.0
                add_log(f"[ភាគ {ep_num}] បាន Upload ចូល [{channel_title}] ជោគជ័យ!", "ok")

            except InterruptedError:
                add_log("បានផ្អាកដំណើរការ និងរក្សាទុកក្នុង Checkpoint!", "warn")
                break
            except Exception as ex:
                add_log(f"[ភាគ {ep_num}] កំហុស: {ex}", "err")
            finally:
                raw_temp_path.unlink(missing_ok=True)
                opt_temp_path.unlink(missing_ok=True)
                opt_temp_path.with_suffix(".jpg").unlink(missing_ok=True)

            delay_s = max(2, int(cfg.get("delay_seconds") or 10))
            if not sync_state["should_stop"]:
                sync_state["pipeline_stage"] = 5
                sync_state["current_phase"] = f"សម្រាក {delay_s} វិនាទីមុនបន្តភាគបន្ទាប់..."
                await asyncio.sleep(delay_s)

        try:
            cat_row["channel_audit"] = await audit_single_channel(aid, int(channel_id), expected_ep_nums)
            if cat_row["channel_audit"].get("status") == "complete":
                cp = load_checkpoint()
                if aid not in cp.get("completed_anime_ids", []):
                    cp.setdefault("completed_anime_ids", []).append(aid)
                    save_checkpoint(cp)
                    refresh_checkpoint_summary()
        except Exception:
            pass

    if not sync_state["should_stop"]:
        cp = load_checkpoint()
        cp["unfinished_queue"] = False
        save_checkpoint(cp)
        refresh_checkpoint_summary()


def trigger_sync_queue_async(anime_ids: List[int], is_resume: bool = False) -> bool:
    global _sync_task
    if sync_state["is_running"]:
        return False
    sync_state["is_running"] = True
    sync_state["should_stop"] = False
    if not is_resume:
        sync_state["completed_jobs"] = 0
    sync_state["total_jobs"] = sum(len(raw_episodes_by_anime.get(aid, [])) for aid in anime_ids)

    async def _runner():
        try:
            await process_anime_sync_queue(anime_ids)
        except Exception as e:
            add_log(f"Sync queue error: {e}", "err")
        finally:
            sync_state["is_running"] = False
            sync_state["pipeline_stage"] = 0
            sync_state["current_phase"] = "រួចរាល់ (24/7 Cloud Auto-Sync Active)"
            refresh_checkpoint_summary()

    _sync_task = asyncio.create_task(_runner())
    return True


async def start_24_7_channel_sync_daemon() -> None:
    """
    Runs inside FastAPI lifespan 24/7:
    1. Loads website catalog & pre-verified 45 channel mappings.
    2. On Cloud/Render (or when enabled), connects to Telegram via StringSession,
       scans Folder Link, audits all channels, and starts uploading 24/7 automatically.
    3. Periodically checks for new episodes added to the website every 5 minutes.
    """
    if not HAS_TELETHON:
        return
    await asyncio.sleep(3.0)
    load_website_catalog()
    refresh_checkpoint_summary()

    is_cloud_env = bool(
        os.getenv("RENDER")
        or os.getenv("RENDER_EXTERNAL_URL")
        or os.getenv("RAILWAY_ENVIRONMENT")
        or os.getenv("ENVIRONMENT", "").lower() == "production"
        or os.getenv("ENABLE_24_7_SYNC") == "1"
    )
    if not is_cloud_env:
        sync_state["current_phase"] = "Standby លើ Local (Render Cloud កំពុងដំណើរការ 24/7 ឬចុច Start ដើម្បីរត់លើម៉ាស៊ីននេះ)"
        add_log("Local Standby Mode: ការពារកុំឲ្យជាន់ IP ជាមួយម៉ាស៊ីនមេ Render 24/7 (អាចចុច Start/Scan ផ្ទាល់បានគ្រប់ពេល)", "info")
        return

    try:
        st = await check_tg_auth_status()
        if st.get("authorized"):
            await scan_folder_channels(DEFAULT_FOLDER_LINK, auto_join=True)
            await audit_all_matched_channels()

            cfg = load_config()
            cp = load_checkpoint()
            rem = [
                int(aid) for aid in (cp.get("active_queue_anime_ids") or [])
                if int(aid) not in (cp.get("completed_anime_ids") or [])
            ]
            incomplete_ids = [
                int(a["id"]) for a in sync_state["catalog_anime"]
                if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
                and a.get("channel_audit", {}).get("status") != "complete"
            ]
            # Merge checkpoint priority queue with all incomplete channels
            auto_queue = list(dict.fromkeys(rem + incomplete_ids))
            if cfg.get("daemon_24_7_enabled", True) and auto_queue:
                add_log(f"24/7 Cloud Auto-Start: ចាប់ផ្ដើមដំណើរការ Upload ស្វ័យប្រវត្តិសម្រាប់ {len(auto_queue)} រឿង...", "ok")
                trigger_sync_queue_async(auto_queue, is_resume=bool(rem))
    except Exception as e:
        add_log(f"24/7 Daemon startup note: {e}", "warn")

    # Continuous 24/7 Watcher Loop
    while True:
        await asyncio.sleep(300)  # Check every 5 minutes
        try:
            cfg = load_config()
            if not cfg.get("daemon_24_7_enabled", True) or sync_state["is_running"]:
                continue
            load_website_catalog()
            await audit_all_matched_channels()
            incomplete_ids = [
                int(a["id"]) for a in sync_state["catalog_anime"]
                if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
                and a.get("channel_audit", {}).get("status") != "complete"
            ]
            if incomplete_ids:
                add_log(f"24/7 Auto-Watcher: រកឃើញ {len(incomplete_ids)} រឿងមានភាគថ្មី/មិនទាន់គ្រប់ -> ចាប់ផ្ដើម Upload ស្វ័យប្រវត្តិ...", "ok")
                trigger_sync_queue_async(incomplete_ids, is_resume=False)
        except Exception:
            pass


# ── FastAPI Admin Endpoints ──────────────────────────────────────────────────
@router.get("/state")
async def get_sync_state(admin: User = Depends(require_admin)):
    if not sync_state["catalog_anime"]:
        load_website_catalog()
    refresh_checkpoint_summary()
    return {
        **sync_state,
        "config": load_config(),
    }


@router.post("/config")
async def update_sync_config(payload: Dict[str, Any] = Body(...), admin: User = Depends(require_admin)):
    cfg = load_config()
    cfg.update(payload)
    save_config(cfg)
    add_log("បានរក្សាទុកការកំណត់ 24/7 Auto-Sync ជោគជ័យ!", "ok")
    return {"ok": True, "config": cfg}


@router.post("/override-channel")
async def override_channel_mapping(payload: Dict[str, Any] = Body(...), admin: User = Depends(require_admin)):
    cfg = load_config()
    overrides = cfg.get("channel_overrides") or {}
    aid_str = str(payload.get("anime_id"))
    cid = payload.get("channel_id")
    if cid:
        overrides[aid_str] = int(cid)
    else:
        overrides.pop(aid_str, None)
    cfg["channel_overrides"] = overrides
    save_config(cfg)
    rebuild_catalog_state()
    return {"ok": True}


@router.post("/scan-folder")
async def api_scan_folder(payload: Dict[str, Any] = Body(default={}), admin: User = Depends(require_admin)):
    folder_link = payload.get("folder_link") or load_config().get("folder_link") or DEFAULT_FOLDER_LINK
    return await scan_folder_channels(folder_link, auto_join=True)


@router.post("/audit-channels")
async def api_audit_channels(admin: User = Depends(require_admin)):
    return await audit_all_matched_channels()


@router.post("/start")
async def api_start_sync(payload: Dict[str, Any] = Body(default={}), admin: User = Depends(require_admin)):
    ids = [int(x) for x in (payload.get("anime_ids") or [])]
    if not ids:
        ids = [
            int(a["id"]) for a in sync_state["catalog_anime"]
            if a.get("matched_channel_id") and a.get("episodes_count", 0) > 0
            and a.get("channel_audit", {}).get("status") != "complete"
        ]
    started = trigger_sync_queue_async(ids, is_resume=False)
    return {"started": started, "count": len(ids)}


@router.post("/resume")
async def api_resume_sync(admin: User = Depends(require_admin)):
    cp = load_checkpoint()
    rem = [
        int(aid) for aid in (cp.get("active_queue_anime_ids") or [])
        if int(aid) not in (cp.get("completed_anime_ids") or [])
    ]
    if not rem:
        return {"started": False, "message": "គ្មានការងារសល់ក្នុង Checkpoint ទេ"}
    started = trigger_sync_queue_async(rem, is_resume=True)
    return {"started": started, "resumed_count": len(rem)}


@router.post("/stop")
async def api_stop_sync(admin: User = Depends(require_admin)):
    sync_state["should_stop"] = True
    add_log("កំពុងផ្អាកដំណើរការ និងរក្សាទុកក្នុង Checkpoint...", "warn")
    return {"ok": True}

