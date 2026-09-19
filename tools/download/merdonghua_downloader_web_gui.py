#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Modern Visual Downloader & Website Scanner Studio (Web GUI v5.0)
==================================================================================
Ultra-modern, glassmorphic visual dashboard matching the official Mer Donghua website.
Features:
- Visual Anime Catalog & Website Scanner (with Poster & Video Preview Player)
- Selective Episode Downloading (Old Episodes, New Episodes, Range Selection)
- Built-in Video Streaming Proxy for Instant Episode Previews
- Smart Duplicate Guard, Multi-threaded Downloads & Auto-Resume
- Full Khmer Localization & High-Performance UI
"""

import os
import sys
import re
import json
import time
import math
import socket
import datetime
import threading
import webbrowser
import urllib.request
import urllib.parse
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8 on Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PORT = 5188
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(TOOLS_DIR, "downloader_config.json")
DEFAULT_OUT = r"D:\MerDonghua_Videos" if os.path.exists("D:\\") else os.path.join(os.path.expanduser("~"), "Desktop", "MerDonghua_Videos")
DEFAULT_API = "https://merdonghua-com.onrender.com/api"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"

# Global data caches
raw_catalog_cache = {"anime": [], "episodes": []}
anime_lookup: Dict[str, dict] = {}

def find_seed_files() -> List[str]:
    candidates = [
        os.path.join(ROOT_DIR, "ALL_MOVIES_AND_EPISODE_LINKS.json"),
        os.path.join(ROOT_DIR, "backend", "app", "services", "seed_export.json"),
        os.path.join(ROOT_DIR, "frontend", "public", "data", "catalog.json")
    ]
    return [c for c in candidates if os.path.exists(c)]

def load_config() -> dict:
    cfg = {
        "out_dir": DEFAULT_OUT,
        "threads": 3,
        "token": "",
        "api_url": DEFAULT_API,
        "naming": "kh",
        "filter": "all",
        "scan_new_only": False,
        "overwrite_existing": False
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception:
            pass
    return cfg

def save_config(cfg: dict):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def sanitize(name: str, mx: int = 100) -> str:
    if not name:
        return "unnamed"
    return re.sub(r'\s+', ' ', re.sub(r'[\\/*?:"<>|]', '_', str(name).strip()))[:mx]

def fmt_bytes(b: float) -> str:
    if b <= 0: return "0 B"
    if b >= 1<<30: return f"{b/(1<<30):.2f} GB"
    if b >= 1<<20: return f"{b/(1<<20):.1f} MB"
    if b >= 1<<10: return f"{b/(1<<10):.1f} KB"
    return f"{int(b)} B"

def fmt_time(s: float) -> str:
    if not math.isfinite(s) or s <= 0: return "--:--"
    m, sec = divmod(int(s), 60); h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"

def build_hdrs(url: str, token: str = "") -> dict:
    h = {"User-Agent": UA, "Accept": "*/*", "Accept-Encoding": "identity"}
    if "nintanime.com" in url or "s3." in url:
        h["Referer"] = "https://nintanime.com/"
        h["Origin"] = "https://nintanime.com"
    elif "r2.dev" in url or "cloudflarestorage" in url:
        h["Referer"] = "https://merdonghua.com/"
    elif "mediadelivery.net" in url or "b-cdn.net" in url:
        h["Referer"] = "https://iframe.mediadelivery.net/"
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h

def clean_title_for_match(t: str) -> str:
    if not t: return ""
    t = re.sub(r'\s+', ' ', str(t)).strip().lower()
    t = re.sub(r'(?:វគ្គ|រដូវ|រដូវកាល|season|part)[\s\S]*$', '', t, flags=re.IGNORECASE).strip()
    return t

def get_anime_folder(out_base: str, anime: dict, existing_folders: Optional[List[str]] = None) -> str:
    if existing_folders is None:
        try:
            existing_folders = [f for f in os.listdir(out_base) if os.path.isdir(os.path.join(out_base, f))]
        except Exception:
            existing_folders = []
    aid = anime.get('id', 0)
    titles = [anime.get('title') or '', anime.get('title_en') or '', anime.get('slug') or '', anime.get('alt_title') or '', f"Anime_{aid}"]
    for t in titles:
        if not t: continue
        s = sanitize(t)
        if s in existing_folders:
            return os.path.join(out_base, s)
    kh = clean_title_for_match(anime.get('title') or '')
    if kh and len(kh) >= 4:
        for ef in existing_folders:
            ef_clean = clean_title_for_match(ef)
            if kh == ef_clean or kh in ef_clean or ef_clean in kh:
                return os.path.join(out_base, ef)
    std = sanitize(anime.get('title') or anime.get('title_en') or f"Anime_{aid}")
    return os.path.join(out_base, std)

def is_episode_downloaded(folder_path: str, ep_num: int, ep_title: str = "") -> Tuple[bool, Optional[str], int]:
    if not os.path.isdir(folder_path):
        return False, None, 0
    try:
        files = os.listdir(folder_path)
    except Exception:
        return False, None, 0

    patterns = [
        rf'(?:^|[_\s\-\(\[])0*{ep_num}(?:[_\s\-\.\)\]]|$)',
        rf'(?:ភាគ|ep|episode)[\s_#\-]*0*{ep_num}(?:[_\s\-\.\)\]]|$)'
    ]
    for f in files:
        if not f.lower().endswith(('.mp4', '.mkv', '.ts', '.webm')):
            continue
        fp = os.path.join(folder_path, f)
        try:
            sz = os.path.getsize(fp)
        except OSError:
            continue
        if sz < 500 * 1024:
            continue
        f_clean = f.lower()
        for p_regex in patterns:
            if re.search(p_regex, f_clean):
                return True, fp, sz
    return False, None, 0

# Global Engine State
engine_lock = threading.Lock()
engine_state = {
    "is_downloading": False,
    "should_stop": False,
    "total_tasks": 0,
    "completed_tasks": 0,
    "total_bytes": 0,
    "downloaded_bytes": 0,
    "speed_bps": 0,
    "eta_seconds": 0,
    "active_tasks": [],
    "logs": [],
    "disk_status": {
        "scanned_at": "",
        "total_downloaded_eps": 0,
        "total_missing_eps": 0,
        "total_anime": 0,
        "new_anime_count": 0,
        "anime_map": {}
    }
}

def add_log(msg: str, kind: str = "info"):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    with engine_lock:
        engine_state["logs"].append({"time": ts, "msg": msg, "kind": kind})
        if len(engine_state["logs"]) > 250:
            engine_state["logs"].pop(0)

def load_raw_data():
    global raw_catalog_cache, anime_lookup
    seed_files = find_seed_files()
    if not seed_files:
        add_log("⚠️ រកមិនឃើញ file seed_export.json ឬ ALL_MOVIES_AND_EPISODE_LINKS.json ទេ", "warn")
        return

    anime_list = []
    episodes_list = []

    for sfile in seed_files:
        try:
            with open(sfile, "r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, list) and len(data) > 0 and "anime" in data[0]:
                for item in data:
                    a = item.get("anime", {})
                    eps = item.get("episodes", [])
                    anime_list.append(a)
                    episodes_list.extend(eps)
                add_log(f"✅ បាន Load ទិន្នន័យពី: {os.path.basename(sfile)} ({len(anime_list)} រឿង, {len(episodes_list)} ភាគ)", "ok")
                break
            elif isinstance(data, dict) and "anime" in data:
                anime_list = data.get("anime", [])
                episodes_list = data.get("episodes", [])
                add_log(f"✅ បាន Load ទិន្នន័យពី: {os.path.basename(sfile)} ({len(anime_list)} រឿង, {len(episodes_list)} ភាគ)", "ok")
                break
        except Exception as ex:
            add_log(f"❌ កំហុសអាន {sfile}: {ex}", "err")

    # Deduplicate anime by ID
    seen_ids = set()
    unique_anime = []
    for a in anime_list:
        aid = a.get("id")
        if aid and aid not in seen_ids:
            seen_ids.add(aid)
            unique_anime.append(a)

    raw_catalog_cache["anime"] = unique_anime
    raw_catalog_cache["episodes"] = episodes_list

    # Build lookup table
    anime_lookup.clear()
    for a in unique_anime:
        aid = str(a.get("id"))
        anime_lookup[aid] = a
        if a.get("slug"):
            anime_lookup[a["slug"].lower()] = a
        if a.get("title"):
            anime_lookup[a["title"].lower()] = a
        if a.get("alt_title"):
            anime_lookup[a["alt_title"].lower()] = a

def scan_disk_and_update_state():
    cfg = load_config()
    out_base = cfg.get("out_dir", DEFAULT_OUT)
    os.makedirs(out_base, exist_ok=True)
    try:
        existing_folders = [f for f in os.listdir(out_base) if os.path.isdir(os.path.join(out_base, f))]
    except Exception:
        existing_folders = []

    ep_map: Dict[int, List[dict]] = {}
    for ep in raw_catalog_cache["episodes"]:
        ep_map.setdefault(ep.get("anime_id", 0), []).append(ep)

    anime_map = {}
    tot_dl = 0
    tot_miss = 0
    new_anime_count = 0

    for a in raw_catalog_cache["anime"]:
        aid = a.get("id", 0)
        eps = ep_map.get(aid, [])
        total_ep_count = len(eps)
        folder = get_anime_folder(out_base, a, existing_folders)
        dl_count = 0
        missing_eps = []

        for ep in eps:
            num = ep.get("episode_number", 0)
            is_dl, _, _ = is_episode_downloaded(folder, num, ep.get("title", ""))
            if is_dl:
                dl_count += 1
            else:
                missing_eps.append(num)

        is_new = (total_ep_count > 0 and dl_count == 0)
        if is_new:
            new_anime_count += 1

        tot_dl += dl_count
        tot_miss += len(missing_eps)

        anime_map[aid] = {
            "id": aid,
            "title": a.get("title") or a.get("title_en") or f"Anime {aid}",
            "title_en": a.get("title_en") or "",
            "alt_title": a.get("alt_title") or "",
            "slug": a.get("slug") or "",
            "poster_url": a.get("poster_url") or "",
            "banner_url": a.get("banner_url") or "",
            "type": a.get("type", "DONGHUA"),
            "year": a.get("year", 2026),
            "status": a.get("status", "ONGOING"),
            "folder": folder,
            "total_episodes": total_ep_count,
            "downloaded": dl_count,
            "missing": len(missing_eps),
            "is_new": is_new,
            "is_complete": (total_ep_count > 0 and dl_count >= total_ep_count)
        }

    with engine_lock:
        engine_state["disk_status"] = {
            "scanned_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_downloaded_eps": tot_dl,
            "total_missing_eps": tot_miss,
            "total_anime": len(raw_catalog_cache["anime"]),
            "new_anime_count": new_anime_count,
            "anime_map": anime_map
        }
    add_log(f"💾 បានស្កេន Disk ({out_base}): {tot_dl} ភាគមានរួច, {tot_miss} ភាគខ្វះ, {new_anime_count} រឿងថ្មីសុទ្ធ", "info")

# Download Worker Engine
class DownloadWorker:
    def __init__(self, task_list: List[dict], max_workers: int = 3, token: str = "", overwrite: bool = False):
        self.task_list = task_list
        self.max_workers = max_workers
        self.token = token
        self.overwrite = overwrite

    def run(self):
        with engine_lock:
            engine_state["is_downloading"] = True
            engine_state["should_stop"] = False
            engine_state["total_tasks"] = len(self.task_list)
            engine_state["completed_tasks"] = 0
            engine_state["active_tasks"] = [
                {
                    "id": idx,
                    "anime": t["anime_title"],
                    "ep_num": t["ep_num"],
                    "title": t["ep_title"],
                    "url": t["url"],
                    "out_path": t["out_path"],
                    "status": "pending",
                    "progress": 0,
                    "size": 0,
                    "speed": "–"
                } for idx, t in enumerate(self.task_list)
            ]

        add_log(f"🚀 ចាប់ផ្តើមទាញយក {len(self.task_list)} ភាគ (Threads: {self.max_workers})...", "ok")

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(self._download_single, task, idx) for idx, task in enumerate(self.task_list)]
            for fut in futures:
                try: fut.result()
                except Exception: pass

        with engine_lock:
            engine_state["is_downloading"] = False
            engine_state["speed_bps"] = 0
            engine_state["eta_seconds"] = 0

        add_log("🎉 ការទាញយកបានបញ្ចប់រួចរាល់!", "ok")
        scan_disk_and_update_state()

    def _download_single(self, task: dict, idx: int):
        with engine_lock:
            if engine_state["should_stop"]:
                engine_state["active_tasks"][idx]["status"] = "cancelled"
                return

        path = task["out_path"]
        url = task["url"]
        folder = os.path.dirname(path)
        os.makedirs(folder, exist_ok=True)

        if not self.overwrite:
            is_dl, _, ex_sz = is_episode_downloaded(folder, task["ep_num"], task["ep_title"])
            if is_dl and ex_sz > 500 * 1024:
                with engine_lock:
                    engine_state["active_tasks"][idx]["status"] = "skipped"
                    engine_state["active_tasks"][idx]["progress"] = 100
                    engine_state["active_tasks"][idx]["size"] = ex_sz
                    engine_state["completed_tasks"] += 1
                return

        with engine_lock:
            engine_state["active_tasks"][idx]["status"] = "downloading"

        hdrs = build_hdrs(url, self.token)
        existing = os.path.getsize(path) if os.path.exists(path) else 0
        total_size = 0

        try:
            req = urllib.request.Request(url, headers=hdrs, method="HEAD")
            with urllib.request.urlopen(req, timeout=15) as r:
                cl = r.headers.get("Content-Length")
                if cl: total_size = int(cl)
        except Exception:
            pass

        if not self.overwrite and existing > 0 and total_size > 0 and existing >= total_size:
            with engine_lock:
                engine_state["active_tasks"][idx]["status"] = "skipped"
                engine_state["active_tasks"][idx]["progress"] = 100
                engine_state["completed_tasks"] += 1
            return

        mode = "wb"
        if existing > 0 and total_size > 0 and existing < total_size and not self.overwrite:
            hdrs["Range"] = f"bytes={existing}-"
            mode = "ab"
        else:
            existing = 0

        downloaded = existing
        last_t = time.time()
        last_b = 0

        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=60) as resp:
                cr = resp.headers.get("Content-Range", "")
                if cr and "/" in cr:
                    try: total_size = int(cr.split("/")[-1])
                    except Exception: pass
                if not total_size:
                    cl = resp.headers.get("Content-Length")
                    if cl: total_size = downloaded + int(cl)

                CHUNK = 512 * 1024
                with open(path, mode) as f:
                    while True:
                        with engine_lock:
                            if engine_state["should_stop"]:
                                engine_state["active_tasks"][idx]["status"] = "cancelled"
                                return
                        chunk = resp.read(CHUNK)
                        if not chunk: break
                        f.write(chunk)
                        downloaded += len(chunk)
                        last_b += len(chunk)

                        now = time.time()
                        if now - last_t >= 0.5:
                            spd = last_b / (now - last_t)
                            last_b = 0
                            last_t = now
                            prog = (downloaded / total_size * 100) if total_size > 0 else 0
                            with engine_lock:
                                engine_state["active_tasks"][idx]["progress"] = round(prog, 1)
                                engine_state["active_tasks"][idx]["size"] = total_size or downloaded
                                engine_state["active_tasks"][idx]["speed"] = f"{fmt_bytes(spd)}/s"

            with engine_lock:
                engine_state["active_tasks"][idx]["status"] = "done"
                engine_state["active_tasks"][idx]["progress"] = 100
                engine_state["completed_tasks"] += 1
        except Exception as ex:
            with engine_lock:
                engine_state["active_tasks"][idx]["status"] = "error"
                engine_state["active_tasks"][idx]["speed"] = str(ex)[:30]

# ══════════════════════════════════════════════════════════════════════════════
# MODERN WEBSITE-STYLE DASHBOARD HTML
# ══════════════════════════════════════════════════════════════════════════════
HTML_PAGE = """<!DOCTYPE html>
<html lang="km" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MER DONGHUA — Visual Downloader & Website Scanner Studio v5.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Kantumruy Pro"', 'Inter', 'sans-serif'],
            mono: ['Consolas', 'monospace']
          },
          colors: {
            brand: {
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              900: '#4c1d95'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { background: #080912; color: #f3f4f6; }
    .glass { background: rgba(15, 17, 32, 0.88); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-card { background: rgba(22, 25, 48, 0.7); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.06); }
    .glass-card:hover { border-color: rgba(139, 92, 246, 0.5); transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.25); }
    .tab-active { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; box-shadow: 0 4px 20px rgba(124, 58, 237, 0.45); }
    .hero-glow { background: radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.18) 0%, transparent 70%); }
    .badge-glow { box-shadow: 0 0 12px rgba(16, 185, 129, 0.35); }
    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: #080912; }
    ::-webkit-scrollbar-thumb { background: #222646; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
  </style>
</head>
<body class="min-h-screen flex flex-col font-sans selection:bg-brand-600 selection:text-white hero-glow">

  <!-- TOP HEADER / NAVBAR (MATCHING MER DONGHUA WEBSITE) -->
  <header class="sticky top-0 z-50 glass border-b border-white/10 px-6 py-3.5 transition">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
      
      <!-- Brand & Title -->
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-brand-600/40 transform hover:rotate-6 transition">
          🎬
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>MER DONGHUA</span>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">STUDIO</span>
            </h1>
            <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">v5.0 WEB UI</span>
          </div>
          <p class="text-xs text-gray-400">Website Video Scanner & Visual Bulk Downloader Engine</p>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center flex-wrap gap-2">
        <button onclick="scanNewOnly()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer transition transform active:scale-95">
          <span>🆕</span> <span>ស្កេនចាប់តែរឿងថ្មី</span>
        </button>
        <button onclick="selectMissingOnly()" class="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
          <span>⚠️ ជ្រើសតែខ្វះភាគ</span>
        </button>
        <button onclick="refreshDisk()" class="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
          <span>🔄 ស្កេន Disk ឡើងវិញ</span>
        </button>
        <button onclick="openFolder()" class="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
          <span>📂 បើក Folder វីដេអូ</span>
        </button>
      </div>

    </div>
  </header>

  <!-- LIVE STATS STRIP -->
  <section class="bg-black/40 border-b border-white/5 px-6 py-3">
    <div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
      
      <div class="glass p-2.5 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base font-bold">💾</div>
        <div>
          <div class="text-[11px] text-gray-400">ភាគមានលើ Disk</div>
          <div class="text-sm font-black text-emerald-400 font-mono" id="stat_total_dl">0</div>
        </div>
      </div>

      <div class="glass p-2.5 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-base font-bold">⚠️</div>
        <div>
          <div class="text-[11px] text-gray-400">ភាគខ្វះត្រូវទាញយក</div>
          <div class="text-sm font-black text-amber-400 font-mono" id="stat_total_miss">0</div>
        </div>
      </div>

      <div class="glass p-2.5 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-base font-bold">🆕</div>
        <div>
          <div class="text-[11px] text-gray-400">រឿងថ្មីសុទ្ធ (0% Disk)</div>
          <div class="text-sm font-black text-purple-400 font-mono" id="stat_new_anime">0</div>
        </div>
      </div>

      <div class="glass p-2.5 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-base font-bold">🎬</div>
        <div>
          <div class="text-[11px] text-gray-400">Anime ក្នុង Website</div>
          <div class="text-sm font-black text-cyan-300 font-mono" id="stat_total_anime">0</div>
        </div>
      </div>

      <div class="glass p-2.5 rounded-xl flex items-center gap-3 col-span-2 md:col-span-1">
        <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base font-bold">📁</div>
        <div class="truncate">
          <div class="text-[11px] text-gray-400">ទីតាំង Save វីដេអូ</div>
          <div class="text-xs font-bold text-white font-mono truncate" id="stat_out_dir" title="">D:\\MerDonghua_Videos</div>
        </div>
      </div>

    </div>
  </section>

  <!-- MAIN APP CONTAINER -->
  <main class="max-w-7xl mx-auto w-full flex-1 p-6 space-y-6">

    <!-- NAVIGATION TABS -->
    <div class="flex items-center justify-between border-b border-white/10 pb-3.5 flex-wrap gap-3">
      <nav class="flex items-center gap-2 flex-wrap">
        <button onclick="switchTab('catalog')" id="tab_btn_catalog" class="tab-active px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2">
          <span>📚</span> <span>កាតាឡុក Anime</span>
        </button>
        <button onclick="switchTab('scanner')" id="tab_btn_scanner" class="px-4 py-2 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-2">
          <span>🌐</span> <span>ស្កេន Website & URL</span>
        </button>
        <button onclick="switchTab('queue')" id="tab_btn_queue" class="px-4 py-2 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-2">
          <span>⬇️</span> <span>កំពុង Download (<span id="queue_badge">0</span>)</span>
        </button>
        <button onclick="switchTab('options')" id="tab_btn_options" class="px-4 py-2 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-2">
          <span>⚙️</span> <span>Options & Settings</span>
        </button>
        <button onclick="switchTab('logs')" id="tab_btn_logs" class="px-4 py-2 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-2">
          <span>📋</span> <span>Log ប្រព័ន្ធ</span>
        </button>
      </nav>

      <!-- Global selection status & start button -->
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">បានជ្រើស: <strong id="sel_count_text" class="text-purple-400 font-bold">0 រឿង (0 ភាគ)</strong></span>
        <button onclick="startDownloadSelected()" id="btn_start_top" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition transform active:scale-95">
          <span>🚀</span> <span>ចាប់ផ្តើម Download</span>
        </button>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 1: CATALOG (VISUAL ANIME CARDS WITH POSTERS)
         ════════════════════════════════════════════════════════════════════════ -->
    <div id="tab_catalog" class="space-y-4">
      
      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center justify-between gap-3 glass p-4 rounded-2xl">
        <div class="flex-1 min-w-[280px] relative">
          <span class="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
          <input type="text" id="search_input" oninput="filterAnimeGrid()" placeholder="ស្វែងរកតាមចំណងជើងរឿង (ខ្មែរ, ចិន, English, Slug, ID)..." class="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition">
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button onclick="setFilterMode('all')" id="flt_all" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white cursor-pointer transition">ទាំងអស់</button>
          <button onclick="setFilterMode('new')" id="flt_new" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-pointer transition">🆕 រឿងថ្មីសុទ្ធ</button>
          <button onclick="setFilterMode('missing')" id="flt_missing" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer transition">⚠️ ខ្វះភាគ</button>
          <button onclick="setFilterMode('complete')" id="flt_complete" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer transition">✅ គ្រប់</button>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="selectAllVisible(true)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer transition">☑ ជ្រើសទាំងអស់</button>
          <button onclick="selectAllVisible(false)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer transition">☐ ដោះទាំងអស់</button>
        </div>
      </div>

      <!-- ANIME CARDS GRID (WEBSITE STYLE WITH LARGE POSTERS) -->
      <div id="anime_grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- Cards loaded dynamically -->
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 2: SCANNER (WITH VIDEO PREVIEW & EPISODE CARDS)
         ════════════════════════════════════════════════════════════════════════ -->
    <div id="tab_scanner" class="hidden space-y-6">
      
      <!-- Scan Bar Box -->
      <div class="glass p-6 rounded-3xl space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="text-base font-black text-white flex items-center gap-2">
            <span>🌐</span> <span>ស្កេនវីដេអូ & រូបភាពពី Website (Website Video & Media Scanner)</span>
          </h2>
          <span class="text-xs text-gray-400">ស្កេនបានទាំង Watch URL, Slug, និង ID រឿង</span>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2 flex-wrap">
            <input type="text" id="scan_target_url" placeholder="ឧទាហរណ៍: http://localhost:5173/watch/big-brother ឬ slug: big-brother" value="big-brother" class="flex-1 min-w-[300px] bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-mono">
            <button onclick="scanTargetUrl()" id="btn_scan_run" class="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 cursor-pointer flex items-center gap-2 transition transform active:scale-95">
              <span>🔍</span> <span>ស្កេនវីដេអូ & រូបភាព</span>
            </button>
          </div>

          <!-- Quick pick anime buttons -->
          <div class="flex items-center gap-2 flex-wrap text-xs text-gray-400">
            <span>👉 រឿងពេញនិយមរហ័ស:</span>
            <button onclick="quickScan('big-brother')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-600/30 text-gray-300 border border-white/10 text-[11px] cursor-pointer">សិស្សច្បងកំពូលល្បិច (Big Brother)</button>
            <button onclick="quickScan('renegade-immortal')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-600/30 text-gray-300 border border-white/10 text-[11px] cursor-pointer">គុជអមតះធានី (Renegade Immortal)</button>
            <button onclick="quickScan('perfect-world')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-600/30 text-gray-300 border border-white/10 text-[11px] cursor-pointer">ពិភពដ៏ល្អឥតខ្ចោះ (Perfect World)</button>
            <select id="quick_anime_dropdown" onchange="if(this.value) quickScan(this.value)" class="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none">
              <option value="">-- ឬជ្រើសរើសពី Anime Catalog ទាំងអស់ --</option>
            </select>
          </div>
        </div>
      </div>

      <!-- SCAN RESULTS SECTION (HERO BANNER + VISUAL EPISODE GRID) -->
      <div id="scan_result_box" class="hidden space-y-6">

        <!-- Anime Hero Card -->
        <div id="scan_hero_card" class="glass rounded-3xl overflow-hidden border border-white/10 relative">
          <!-- Backdrop background -->
          <div id="scan_backdrop" class="absolute inset-0 bg-cover bg-center opacity-15 filter blur-sm"></div>
          <div class="relative p-6 flex flex-col md:flex-row gap-6 items-start">
            
            <!-- Poster -->
            <div class="relative w-36 h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/10 bg-black/40">
              <img id="scan_poster_img" src="" class="w-full h-full object-cover">
              <div id="scan_type_badge" class="absolute top-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-600/80 text-white backdrop-blur-md">DONGHUA</div>
            </div>

            <!-- Meta details -->
            <div class="flex-1 min-w-0 space-y-2.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span id="scan_status_badge" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ONGOING</span>
                <span id="scan_year_badge" class="text-xs text-gray-400 font-mono">2026</span>
              </div>
              <h2 id="scan_anime_title" class="text-xl md:text-2xl font-black text-white leading-tight"></h2>
              <p id="scan_anime_alt" class="text-xs text-gray-400 font-mono"></p>
              <p id="scan_anime_desc" class="text-xs text-gray-300 line-clamp-3 leading-relaxed"></p>

              <!-- Disk Breakdown -->
              <div class="pt-2 flex items-center gap-4 text-xs font-mono flex-wrap">
                <div class="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                  <span class="text-gray-400">ភាគសរុប:</span>
                  <strong id="scan_stat_total" class="text-white">0</strong>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                  <span class="text-emerald-400">● មានលើ Disk:</span>
                  <strong id="scan_stat_dl" class="text-emerald-400">0</strong>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                  <span class="text-amber-400">● ខ្វះត្រូវដោន:</span>
                  <strong id="scan_stat_miss" class="text-amber-400">0</strong>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Episode Selection Control Bar -->
        <div class="glass p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          
          <!-- Filters (All / Old / New) -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-gray-400 font-bold">បង្ហាញ:</span>
            <button onclick="setScanEpFilter('all')" id="btn_ep_flt_all" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white cursor-pointer transition">
              ទាំងអស់ (<span id="cnt_flt_all">0</span>)
            </button>
            <button onclick="setScanEpFilter('new')" id="btn_ep_flt_new" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-pointer transition">
              🆕 តែភាគថ្មី/ខ្វះ (<span id="cnt_flt_new">0</span>)
            </button>
            <button onclick="setScanEpFilter('old')" id="btn_ep_flt_old" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer transition">
              📁 តែភាគចាស់មានរួច (<span id="cnt_flt_old">0</span>)
            </button>
          </div>

          <!-- Selection Controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="toggleAllScanEps(true)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 cursor-pointer transition">☑ ជ្រើសទាំងអស់</button>
            <button onclick="toggleAllScanEps(false)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 cursor-pointer transition">☐ ដោះទាំងអស់</button>
            <button onclick="selectOnlyMissingScanEps()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer transition">⚡ ជ្រើសតែភាគថ្មី</button>
            <button onclick="invertScanEps()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer transition">🔄 បញ្ច្រាស</button>
          </div>

          <!-- Range Selector & Main Download Action -->
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <span class="text-gray-400">ចន្លោះភាគ:</span>
              <input type="number" id="range_start" placeholder="1" class="w-12 bg-white/5 border border-white/10 rounded px-1 text-center text-xs text-white">
              <span>ដល់</span>
              <input type="number" id="range_end" placeholder="10" class="w-12 bg-white/5 border border-white/10 rounded px-1 text-center text-xs text-white">
              <button onclick="selectRangeScanEps()" class="px-2 py-0.5 rounded bg-brand-600 text-white font-bold text-[11px] cursor-pointer">ជ្រើស</button>
            </div>

            <!-- Start Download Button -->
            <button onclick="downloadScannedTarget()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2 transition transform active:scale-95">
              <span>🚀</span> <span>ទាញយកភាគដែលបានជ្រើស (<span id="scan_sel_badge">0</span>)</span>
            </button>
          </div>

        </div>

        <!-- VISUAL EPISODES GRID (WITH THUMBNAILS & VIDEO PREVIEW BUTTONS) -->
        <div id="scan_ep_grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Episode cards injected here -->
        </div>

      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 3: QUEUE & PROGRESS (LIVE ENGINE QUEUE)
         ════════════════════════════════════════════════════════════════════════ -->
    <div id="tab_queue" class="hidden space-y-4">
      <div class="glass p-6 rounded-3xl space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-base font-black text-white flex items-center gap-2">
              <span>⬇️</span> <span>ដំណើរការទាញយកផ្ទាល់ (Live Download Queue)</span>
            </h2>
            <p class="text-xs text-gray-400">ប្រព័ន្ធទាញយកវីដេអូដោយស្វ័យប្រវត្តិ ធានាការពារ Duplicate និង Resume ស្វ័យប្រវត្តិ</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="stopDownload()" id="btn_stop_dl" class="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/40 font-bold text-xs cursor-pointer transition">
              ⏹ បញ្ឈប់ការ Download
            </button>
            <button onclick="openFolder()" class="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs cursor-pointer transition">
              📂 បើក Folder វីដេអូ
            </button>
          </div>
        </div>

        <!-- Overall Progress Bar -->
        <div class="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-white">វឌ្ឍនភាពសរុប (Overall Queue Progress):</span>
            <span id="queue_pct_text" class="font-bold font-mono text-brand-400 text-sm">0%</span>
          </div>
          <div class="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <div id="queue_pbar" class="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-400 transition-all duration-300" style="width: 0%;"></div>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-400 font-mono pt-1">
            <span id="queue_task_count">0 / 0 ភាគ</span>
            <span id="queue_speed" class="text-cyan-300 font-bold">ល្បឿន: 0 B/s</span>
          </div>
        </div>

        <!-- Queue Table -->
        <div class="max-h-96 overflow-y-auto rounded-2xl border border-white/5">
          <table class="w-full text-xs text-left">
            <thead class="bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md">
              <tr>
                <th class="p-3">Anime</th>
                <th class="p-3 w-24 text-center">ភាគ</th>
                <th class="p-3 w-40">Progress</th>
                <th class="p-3 w-28 text-center">Speed</th>
                <th class="p-3 w-28 text-center">ទំហំ</th>
                <th class="p-3 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody id="queue_tbody" class="divide-y divide-white/5 text-gray-300">
              <tr><td colspan="6" class="p-6 text-center text-gray-500">មិនទាន់មាន Task ក្នុង Queue ទេ។ សូមជ្រើសរើសរឿងរួចចុច "ចាប់ផ្តើម Download"</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 4: OPTIONS & SETTINGS
         ════════════════════════════════════════════════════════════════════════ -->
    <div id="tab_options" class="hidden space-y-4">
      <div class="glass p-6 rounded-3xl space-y-6 max-w-3xl">
        <h2 class="text-base font-black text-white flex items-center gap-2">
          <span>⚙️</span> <span>ការកំណត់ប្រព័ន្ធ (Studio Settings & Configuration)</span>
        </h2>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-300 mb-1">📁 ទីតាំង Folder រក្សាទុកវីដេអូ (Output Directory):</label>
            <div class="flex gap-2">
              <input type="text" id="cfg_out_dir" class="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-brand-500">
              <button onclick="openFolder()" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold cursor-pointer">
                📂 បើកមើល
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-300 mb-1">⚡ ចំនួន Threads ទាញយកដំណាលគ្នា (Concurrent Downloads):</label>
            <select id="cfg_threads" class="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-brand-500">
              <option value="1">1 Thread (ល្បឿនយឺត / សន្សំសំចៃ Network)</option>
              <option value="2">2 Threads</option>
              <option value="3" selected>3 Threads (ល្បឿនមធ្យម & ស្ថិរភាព - Recommended)</option>
              <option value="5">5 Threads (ល្បឿនលឿន)</option>
              <option value="8">8 Threads (ល្បឿនអតិបរមា High-Speed)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-300 mb-1">🏷 ទម្រង់ឈ្មោះ File វីដេអូ (Video File Naming):</label>
            <select id="cfg_naming" class="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-brand-500">
              <option value="kh" selected>ខ្មែរ: ភាគ 001 - Title.mp4</option>
              <option value="en">English: Ep001 - Title.mp4</option>
              <option value="num">លេខសុទ្ធ: 001.mp4</option>
            </select>
          </div>

          <div class="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="cfg_overwrite" class="w-4 h-4 text-brand-600 rounded bg-black/40 border-white/10 focus:ring-brand-500">
              <div>
                <span class="text-xs font-bold text-white">🔄 អនុញ្ញាតឱ្យទាញយកជាន់លើ File ចាស់ (Force Overwrite Existing)</span>
                <p class="text-[11px] text-gray-400">ប្រសិនបើមិនធីកទេ ប្រព័ន្ធនឹងស្វ័យប្រវត្តិ Skip រាល់ភាគណាដែលមានរួចរាល់លើ Disk ដើម្បីកុំឱ្យខាត Internet</p>
              </div>
            </label>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-300 mb-1">🌐 Website API Base URL:</label>
            <input type="text" id="cfg_api_url" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-brand-500">
          </div>

          <button onclick="saveSettings()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 cursor-pointer transition">
            💾 រក្សាទុកការកំណត់ (Save Configuration)
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 5: SYSTEM LOGS
         ════════════════════════════════════════════════════════════════════════ -->
    <div id="tab_logs" class="hidden space-y-4">
      <div class="glass p-6 rounded-3xl space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-black text-white flex items-center gap-2">
            <span>📋</span> <span>កំណត់ត្រាដំណើរការ (Live System Logs)</span>
          </h2>
          <button onclick="clearLogs()" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs cursor-pointer">🗑 សម្អាត Log</button>
        </div>
        <div id="log_terminal" class="bg-black/70 border border-white/10 rounded-2xl p-4 font-mono text-xs text-gray-300 h-96 overflow-y-auto space-y-1"></div>
      </div>
    </div>

  </main>

  <!-- ════════════════════════════════════════════════════════════════════════
       MODAL 1: VIDEO PREVIEW PLAYER (POPUP STREAM PLAYER)
       ════════════════════════════════════════════════════════════════════════ -->
  <div id="video_player_modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="glass w-full max-w-4xl rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col">
      <!-- Player Header -->
      <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-2.5 truncate">
          <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          <h3 id="vp_title" class="text-sm font-bold text-white truncate">កំពុងមើលវីដេអូសាកល្បង</h3>
        </div>
        <button onclick="closeVideoPlayer()" class="text-gray-400 hover:text-white p-1 text-lg rounded-lg hover:bg-white/10">✕</button>
      </div>

      <!-- Player Content -->
      <div class="relative bg-black aspect-video flex items-center justify-center">
        <video id="html5_video" class="w-full h-full" controls autoplay preload="metadata">
          <source id="video_source" src="" type="video/mp4">
          កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រការចាក់វីដេអូនេះទេ។
        </video>
      </div>

      <!-- Player Footer -->
      <div class="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
        <div class="text-gray-400 truncate max-w-md font-mono text-[11px]" id="vp_stream_url"></div>
        <div class="flex items-center gap-2">
          <button onclick="downloadCurrentPreviewEp()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/30">
            ⬇️ ទាញយកភាគនេះភ្លាមៗ
          </button>
          <button onclick="closeVideoPlayer()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs cursor-pointer">
            បិទផ្ទាំង
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════════════
       MODAL 2: ANIME EPISODE MANAGER MODAL (FROM CATALOG)
       ════════════════════════════════════════════════════════════════════════ -->
  <div id="anime_detail_modal" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="glass w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3 truncate">
          <div class="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-sm">🎬</div>
          <div>
            <h3 id="modal_anime_title" class="text-sm md:text-base font-black text-white truncate"></h3>
            <p id="modal_anime_meta" class="text-xs text-gray-400 font-mono"></p>
          </div>
        </div>
        <button onclick="closeAnimeDetailModal()" class="text-gray-400 hover:text-white p-1 text-xl rounded-lg hover:bg-white/10">✕</button>
      </div>

      <!-- Episode Content Scroll -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div class="flex items-center gap-2">
            <button onclick="modalSelectAll(true)" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold">☑ ជ្រើសទាំងអស់</button>
            <button onclick="modalSelectAll(false)" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold">☐ ដោះទាំងអស់</button>
            <button onclick="modalSelectMissingOnly()" class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">⚡ ជ្រើសតែភាគថ្មី</button>
          </div>
          <div>
            <span class="text-gray-400">បានជ្រើស: <strong id="modal_sel_count" class="text-purple-400">0</strong> ភាគ</span>
          </div>
        </div>

        <div id="modal_ep_grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <!-- Modal episode cards -->
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <span class="text-xs text-gray-400">ជ្រើសរើសភាគដែលចង់ដោនឡូត (ទាំងភាគចាស់ និងថ្មី)</span>
        <div class="flex items-center gap-2">
          <button onclick="downloadFromModal()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer">
            🚀 ទាញយកភាគដែលបានជ្រើស
          </button>
          <button onclick="closeAnimeDetailModal()" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs cursor-pointer">
            បិទ
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════════════
       JAVASCRIPT APP LOGIC
       ════════════════════════════════════════════════════════════════════════ -->
  <script>
    let animeList = [];
    let selectedAids = new Set();
    let currentFilter = 'all';
    let currentScanData = null;
    let scanSelectedEps = new Set();
    let scanEpFilter = 'all'; // 'all', 'new', 'old'
    let currentPreviewTask = null;
    let activeModalAnime = null;
    let modalSelectedEps = new Set();

    async function init() {
      await loadCatalog();
      await fetchStatus();
      setInterval(fetchStatus, 1500);
      populateQuickDropdown();
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const d = await res.json();
        
        // Update stats
        document.getElementById('stat_total_dl').innerText = (d.disk_status.total_downloaded_eps || 0) + ' ភាគ';
        document.getElementById('stat_total_miss').innerText = (d.disk_status.total_missing_eps || 0) + ' ភាគ';
        document.getElementById('stat_new_anime').innerText = (d.disk_status.new_anime_count || 0) + ' រឿង';
        document.getElementById('stat_total_anime').innerText = (d.disk_status.total_anime || 0) + ' រឿង';
        document.getElementById('stat_out_dir').innerText = d.out_dir || '';
        document.getElementById('stat_out_dir').title = d.out_dir || '';
        
        const activeCount = (d.active_tasks || []).filter(t => t.status === 'downloading').length;
        document.getElementById('queue_badge').innerText = activeCount;

        // Update settings inputs if empty
        const cfgOut = document.getElementById('cfg_out_dir');
        if (cfgOut && !cfgOut.value) {
          cfgOut.value = d.out_dir || '';
        }

        // Update queue view
        if (d.active_tasks && d.active_tasks.length > 0) {
          const total = d.total_tasks || 1;
          const comp = d.completed_tasks || 0;
          const pct = Math.round((comp / total) * 100);
          document.getElementById('queue_pbar').style.width = pct + '%';
          document.getElementById('queue_pct_text').innerText = pct + '%';
          document.getElementById('queue_task_count').innerText = `${comp} / ${total} ភាគ`;

          const tbody = document.getElementById('queue_tbody');
          tbody.innerHTML = d.active_tasks.map(t => {
            let badge = '';
            if (t.status === 'done') badge = '<span class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✅ Done</span>';
            else if (t.status === 'downloading') badge = '<span class="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-bold text-[10px] animate-pulse">⬇ ' + t.progress + '%</span>';
            else if (t.status === 'skipped') badge = '<span class="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">⏩ Skipped</span>';
            else if (t.status === 'error') badge = '<span class="px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 font-bold text-[10px]">❌ Error</span>';
            else badge = '<span class="px-2.5 py-1 rounded-md bg-white/10 text-gray-400 font-bold text-[10px]">⏳ Pending</span>';

            return `<tr>
              <td class="p-3 font-semibold text-white truncate max-w-xs">${t.anime}</td>
              <td class="p-3 text-center font-mono text-cyan-300 font-bold">ភាគ ${t.ep_num}</td>
              <td class="p-3">
                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div class="bg-gradient-to-r from-brand-500 to-cyan-400 h-full transition-all" style="width: ${t.progress || 0}%"></div>
                </div>
              </td>
              <td class="p-3 text-center font-mono text-gray-300 font-semibold">${t.speed || '–'}</td>
              <td class="p-3 text-center font-mono text-gray-400">${t.size ? (t.size / 1048576).toFixed(1) + ' MB' : '–'}</td>
              <td class="p-3 text-center">${badge}</td>
            </tr>`;
          }).join('');
        }

        // Render logs
        if (d.logs) {
          const logBox = document.getElementById('log_terminal');
          logBox.innerHTML = d.logs.map(l => {
            let col = 'text-gray-300';
            if (l.kind === 'ok') col = 'text-emerald-400 font-semibold';
            else if (l.kind === 'err') col = 'text-red-400 font-semibold';
            else if (l.kind === 'warn') col = 'text-amber-300';
            return `<div><span class="text-gray-500">[${l.time}]</span> <span class="${col}">${l.msg}</span></div>`;
          }).join('');
        }
      } catch(e) {}
    }

    async function loadCatalog() {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        animeList = data.items || [];
        renderAnimeGrid();
        populateQuickDropdown();
      } catch(e) {}
    }

    function populateQuickDropdown() {
      const dd = document.getElementById('quick_anime_dropdown');
      if (!dd || animeList.length === 0) return;
      dd.innerHTML = '<option value="">-- ឬជ្រើសរើសពី Anime Catalog ទាំងអស់ --</option>' +
        animeList.map(a => `<option value="${a.slug || a.id}">${a.title} (${a.total_episodes} ភាគ)</option>`).join('');
    }

    function renderAnimeGrid() {
      const grid = document.getElementById('anime_grid');
      const q = (document.getElementById('search_input').value || '').toLowerCase().trim();

      const filtered = animeList.filter(a => {
        if (q) {
          const matchTitle = (a.title || '').toLowerCase().includes(q);
          const matchAlt = (a.alt_title || '').toLowerCase().includes(q);
          const matchEn = (a.title_en || '').toLowerCase().includes(q);
          const matchSlug = (a.slug || '').toLowerCase().includes(q);
          const matchId = String(a.id) === q;
          if (!matchTitle && !matchAlt && !matchEn && !matchSlug && !matchId) return false;
        }

        if (currentFilter === 'new') return a.is_new;
        if (currentFilter === 'missing') return a.missing > 0 && !a.is_new;
        if (currentFilter === 'complete') return a.is_complete;
        return true;
      });

      grid.innerHTML = filtered.map(a => {
        const isSel = selectedAids.has(a.id);
        let badge = '';
        if (a.is_new) badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">🆕 រឿងថ្មីសុទ្ធ</span>';
        else if (a.is_complete) badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✅ គ្រប់ ' + a.total_episodes + ' ភាគ</span>';
        else badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">⚠️ ខ្វះ ' + a.missing + ' ភាគ</span>';

        const posterImg = a.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400';
        const pct = a.total_episodes > 0 ? Math.round((a.downloaded / a.total_episodes) * 100) : 0;

        return `<div onclick="toggleSelectAnime(${a.id})" class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer transition ${isSel ? 'ring-2 ring-brand-500 bg-brand-500/10' : ''}">
          
          <!-- Poster with overlay badge -->
          <div class="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
            <img src="${posterImg}" class="w-full h-full object-cover transform hover:scale-105 transition duration-500" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0f1f] via-transparent to-transparent"></div>
            
            <div class="absolute top-2 left-2 flex items-center gap-1.5">
              <input type="checkbox" ${isSel ? 'checked' : ''} class="w-4 h-4 rounded text-brand-600 bg-black/60 border-white/20 pointer-events-none">
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-gray-300 backdrop-blur-md">ID: ${a.id}</span>
            </div>

            <div class="absolute top-2 right-2">
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-600/90 text-white backdrop-blur-md">${a.type || 'DONGHUA'}</span>
            </div>

            <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              ${badge}
              <span class="text-[10px] font-mono text-cyan-300 font-bold bg-black/70 px-2 py-0.5 rounded backdrop-blur-md">${a.downloaded}/${a.total_episodes} ភាគ</span>
            </div>
          </div>

          <!-- Anime Info -->
          <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <h3 class="text-xs font-black text-white line-clamp-1" title="${a.title}">${a.title}</h3>
              <p class="text-[10px] text-gray-400 line-clamp-1 font-mono">${a.alt_title || a.title_en || '–'}</p>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-1">
              <div class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div class="bg-gradient-to-r from-brand-500 to-emerald-400 h-full" style="width: ${pct}%"></div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-gray-400">
                <span>វឌ្ឍនភាព: ${pct}%</span>
                <span>${a.year || 2026}</span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5 text-xs">
              <button onclick="event.stopPropagation(); openAnimeDetailModal(${a.id})" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 text-[11px] font-bold transition flex items-center gap-1">
                <span>👁️</span> <span>មើលភាគ</span>
              </button>
              <button onclick="event.stopPropagation(); scanFromCatalog('${a.slug || a.id}')" class="px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-[11px] font-bold transition flex items-center gap-1">
                <span>🔍</span> <span>ស្កេន</span>
              </button>
              <button onclick="event.stopPropagation(); downloadSingleAnime(${a.id})" class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1">
                <span>⬇</span> <span>ដោន</span>
              </button>
            </div>
          </div>

        </div>`;
      }).join('');

      updateSelectionCount();
    }

    function toggleSelectAnime(id) {
      if (selectedAids.has(id)) selectedAids.delete(id);
      else selectedAids.add(id);
      renderAnimeGrid();
    }

    function updateSelectionCount() {
      let eps = 0;
      selectedAids.forEach(id => {
        const a = animeList.find(x => x.id === id);
        if (a) eps += a.missing;
      });
      document.getElementById('sel_count_text').innerText = `${selectedAids.size} រឿង (${eps} ភាគត្រូវទាញយក)`;
    }

    function scanNewOnly() {
      selectedAids.clear();
      currentFilter = 'new';
      animeList.forEach(a => {
        if (a.is_new) selectedAids.add(a.id);
      });
      renderAnimeGrid();
      alert(`✅ បានស្កេនចាប់តែរឿងថ្មី!\nរកឃើញ ${selectedAids.size} រឿងថ្មីសុទ្ធ។\nចុច "ចាប់ផ្តើម Download" ដើម្បីទាញយកភ្លាមៗ!`);
    }

    function selectMissingOnly() {
      selectedAids.clear();
      currentFilter = 'missing';
      animeList.forEach(a => {
        if (a.missing > 0) selectedAids.add(a.id);
      });
      renderAnimeGrid();
    }

    function selectAllVisible(select) {
      animeList.forEach(a => {
        if (select) selectedAids.add(a.id);
        else selectedAids.delete(a.id);
      });
      renderAnimeGrid();
    }

    function setFilterMode(mode) {
      currentFilter = mode;
      ['all', 'new', 'missing', 'complete'].forEach(m => {
        const btn = document.getElementById('flt_' + m);
        if (btn) {
          if (m === mode) {
            btn.classList.add('bg-brand-600', 'text-white');
            btn.classList.remove('bg-white/10', 'text-gray-300');
          } else {
            btn.classList.remove('bg-brand-600', 'text-white');
          }
        }
      });
      renderAnimeGrid();
    }

    function filterAnimeGrid() {
      renderAnimeGrid();
    }

    async function startDownloadSelected() {
      if (selectedAids.size === 0) {
        alert('⚠️ សូមជ្រើសរើស Anime យ៉ាងហោចមួយដើម្បី Download!');
        return;
      }
      await fetch('/api/start_download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime_ids: Array.from(selectedAids) })
      });
      switchTab('queue');
    }

    async function downloadSingleAnime(id) {
      selectedAids.clear();
      selectedAids.add(id);
      await startDownloadSelected();
    }

    async function stopDownload() {
      await fetch('/api/stop_download', { method: 'POST' });
    }

    async function openFolder() {
      await fetch('/api/open_folder', { method: 'POST' });
    }

    async function refreshDisk() {
      await fetch('/api/scan_disk', { method: 'POST' });
      await loadCatalog();
      alert('✅ បានស្កេន Disk រួចរាល់!');
    }

    // ── SCANNER STUDIO ─────────────────────────────────────────────────────────
    function quickScan(target) {
      document.getElementById('scan_target_url').value = target;
      scanTargetUrl();
    }

    function scanFromCatalog(target) {
      switchTab('scanner');
      quickScan(target);
    }

    async function scanTargetUrl() {
      const target = document.getElementById('scan_target_url').value.trim();
      if (!target) return;

      const btn = document.getElementById('btn_scan_run');
      btn.innerHTML = '<span>⏳</span> <span>កំពុងស្កេន...</span>';
      btn.disabled = true;

      try {
        const res = await fetch('/api/scan_target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target })
        });
        const d = await res.json();
        currentScanData = d;

        if (d.anime && d.episodes && d.episodes.length > 0) {
          renderScanResult(d);
        } else {
          alert('❌ មិនអាចស្កេនឃើញ Episode សម្រាប់ Target នេះទេ។ សូមពិនិត្យមើល URL ឬ Slug!');
        }
      } catch (ex) {
        alert('❌ Error ស្កេន: ' + ex);
      } finally {
        btn.innerHTML = '<span>🔍</span> <span>ស្កេនវីដេអូ & រូបភាព</span>';
        btn.disabled = false;
      }
    }

    function renderScanResult(data) {
      const anime = data.anime;
      const eps = data.episodes;
      scanSelectedEps.clear();

      document.getElementById('scan_result_box').classList.remove('hidden');

      // Populate Hero
      document.getElementById('scan_anime_title').innerText = anime.title || 'Unknown Anime';
      document.getElementById('scan_anime_alt').innerText = anime.alt_title || anime.title_en || '';
      document.getElementById('scan_anime_desc').innerText = anime.description || 'មិនមានការពិពណ៌នាទេ។';
      document.getElementById('scan_poster_img').src = anime.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400';
      if (anime.banner_url) {
        document.getElementById('scan_backdrop').style.backgroundImage = `url('${anime.banner_url}')`;
      }
      document.getElementById('scan_year_badge').innerText = anime.year || 2026;
      document.getElementById('scan_status_badge').innerText = anime.status || 'ONGOING';
      document.getElementById('scan_type_badge').innerText = anime.type || 'DONGHUA';

      // Disk breakdown counts
      let dlCount = 0;
      let missCount = 0;
      eps.forEach(ep => {
        if (ep.is_downloaded) dlCount++;
        else {
          missCount++;
          scanSelectedEps.add(ep.episode_number); // Preselect missing/new episodes by default
        }
      });

      document.getElementById('scan_stat_total').innerText = eps.length;
      document.getElementById('scan_stat_dl').innerText = dlCount;
      document.getElementById('scan_stat_miss').innerText = missCount;

      document.getElementById('cnt_flt_all').innerText = eps.length;
      document.getElementById('cnt_flt_new').innerText = missCount;
      document.getElementById('cnt_flt_old').innerText = dlCount;

      // Render episodes grid
      renderScanEpisodesGrid();
    }

    function renderScanEpisodesGrid() {
      if (!currentScanData || !currentScanData.episodes) return;
      const grid = document.getElementById('scan_ep_grid');
      const eps = currentScanData.episodes;
      const anime = currentScanData.anime;

      const filtered = eps.filter(ep => {
        if (scanEpFilter === 'new') return !ep.is_downloaded;
        if (scanEpFilter === 'old') return ep.is_downloaded;
        return true;
      });

      grid.innerHTML = filtered.map(ep => {
        const isSel = scanSelectedEps.has(ep.episode_number);
        const isDl = ep.is_downloaded;
        const thumb = ep.thumbnail_url || anime.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400';

        let statusBadge = isDl 
          ? `<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">✅ មានរួច (${(ep.file_size / 1048576).toFixed(1)} MB)</span>`
          : `<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">🆕 ភាគថ្មី (ត្រៀមដោន)</span>`;

        return `<div class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between p-3 space-y-2.5 transition ${isSel ? 'ring-2 ring-brand-500 bg-brand-500/10' : ''}">
          
          <!-- Thumbnail with play overlay -->
          <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 group">
            <img src="${thumb}" class="w-full h-full object-cover" onerror="this.src='${anime.poster_url || ''}'">
            
            <!-- Episode number badge -->
            <div class="absolute top-2 left-2 flex items-center gap-1.5">
              <input type="checkbox" ${isSel ? 'checked' : ''} onchange="toggleScanEp(${ep.episode_number})" class="w-4 h-4 rounded text-brand-600 bg-black/60 border-white/30 cursor-pointer">
              <span class="text-[10px] font-black px-2 py-0.5 rounded bg-black/70 text-cyan-300 backdrop-blur-md">ភាគ ${ep.episode_number}</span>
            </div>

            <!-- Duration badge if available -->
            <div class="absolute bottom-2 right-2">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-gray-300 backdrop-blur-md">24:00</span>
            </div>

            <!-- Video Preview Play Overlay Button -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300 cursor-pointer" onclick="openVideoPlayer('${ep.video_url || ''}', 'ភាគ ${ep.episode_number} - ${anime.title || ''}')">
              <div class="w-12 h-12 rounded-full bg-brand-600/90 hover:bg-brand-500 text-white flex items-center justify-center text-xl shadow-xl transform group-hover:scale-110 transition">
                ▶
              </div>
            </div>
          </div>

          <!-- Episode Meta -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <h4 class="font-bold text-white text-xs truncate max-w-[180px]" title="${ep.title || 'ភាគ ' + ep.episode_number}">${ep.title || 'ភាគ ' + ep.episode_number}</h4>
              ${statusBadge}
            </div>
            <p class="text-[10px] text-gray-400 font-mono truncate">${ep.video_url || 'គ្មាន Link'}</p>
          </div>

          <!-- Actions -->
          <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
            <button onclick="openVideoPlayer('${ep.video_url || ''}', 'ភាគ ${ep.episode_number} - ${anime.title || ''}')" class="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">
              <span>▶</span> <span>មើលសាកល្បង</span>
            </button>
            <button onclick="downloadSingleScannedEp(${ep.episode_number})" class="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer">
              ⬇ ដោនឡូត
            </button>
          </div>

        </div>`;
      }).join('');

      document.getElementById('scan_sel_badge').innerText = scanSelectedEps.size;
    }

    function toggleScanEp(epNum) {
      if (scanSelectedEps.has(epNum)) scanSelectedEps.delete(epNum);
      else scanSelectedEps.add(epNum);
      renderScanEpisodesGrid();
    }

    function toggleAllScanEps(select) {
      if (!currentScanData || !currentScanData.episodes) return;
      currentScanData.episodes.forEach(ep => {
        if (select) scanSelectedEps.add(ep.episode_number);
        else scanSelectedEps.delete(ep.episode_number);
      });
      renderScanEpisodesGrid();
    }

    function selectOnlyMissingScanEps() {
      if (!currentScanData || !currentScanData.episodes) return;
      scanSelectedEps.clear();
      currentScanData.episodes.forEach(ep => {
        if (!ep.is_downloaded) scanSelectedEps.add(ep.episode_number);
      });
      renderScanEpisodesGrid();
    }

    function invertScanEps() {
      if (!currentScanData || !currentScanData.episodes) return;
      currentScanData.episodes.forEach(ep => {
        if (scanSelectedEps.has(ep.episode_number)) scanSelectedEps.delete(ep.episode_number);
        else scanSelectedEps.add(ep.episode_number);
      });
      renderScanEpisodesGrid();
    }

    function selectRangeScanEps() {
      if (!currentScanData || !currentScanData.episodes) return;
      const s = parseInt(document.getElementById('range_start').value) || 1;
      const e = parseInt(document.getElementById('range_end').value) || 999;
      currentScanData.episodes.forEach(ep => {
        if (ep.episode_number >= s && ep.episode_number <= e) {
          scanSelectedEps.add(ep.episode_number);
        }
      });
      renderScanEpisodesGrid();
    }

    function setScanEpFilter(flt) {
      scanEpFilter = flt;
      ['all', 'new', 'old'].forEach(k => {
        const b = document.getElementById('btn_ep_flt_' + k);
        if (b) {
          if (k === flt) b.classList.add('bg-brand-600', 'text-white');
          else b.classList.remove('bg-brand-600', 'text-white');
        }
      });
      renderScanEpisodesGrid();
    }

    async function downloadScannedTarget() {
      if (!currentScanData || scanSelectedEps.size === 0) {
        alert('⚠️ សូមជ្រើសរើសភាគយ៉ាងហោចមួយដើម្បី Download!');
        return;
      }
      const selectedEpsList = currentScanData.episodes.filter(e => scanSelectedEps.has(e.episode_number));

      await fetch('/api/start_download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_episodes: selectedEpsList,
          anime_info: currentScanData.anime
        })
      });
      switchTab('queue');
    }

    async function downloadSingleScannedEp(epNum) {
      scanSelectedEps.clear();
      scanSelectedEps.add(epNum);
      await downloadScannedTarget();
    }

    // ── VIDEO PREVIEW PLAYER ───────────────────────────────────────────────────
    function openVideoPlayer(videoUrl, title) {
      if (!videoUrl) {
        alert('⚠️ ភាគនេះមិនមាន Video Link សម្រាប់ Preview ទេ');
        return;
      }
      currentPreviewTask = { url: videoUrl, title: title };
      const modal = document.getElementById('video_player_modal');
      const vPlayer = document.getElementById('html5_video');
      const vSource = document.getElementById('video_source');

      document.getElementById('vp_title').innerText = title;
      document.getElementById('vp_stream_url').innerText = videoUrl;

      // Route via streaming proxy to avoid CORS/Referer restriction
      const proxyUrl = `/api/video_stream?url=${encodeURIComponent(videoUrl)}`;
      vSource.src = proxyUrl;
      vPlayer.load();
      vPlayer.play().catch(() => {});

      modal.classList.remove('hidden');
    }

    function closeVideoPlayer() {
      const modal = document.getElementById('video_player_modal');
      const vPlayer = document.getElementById('html5_video');
      vPlayer.pause();
      modal.classList.add('hidden');
    }

    async function downloadCurrentPreviewEp() {
      if (!currentPreviewTask) return;
      closeVideoPlayer();
      switchTab('scanner');
    }

    // ── ANIME DETAIL MODAL (FROM CATALOG) ──────────────────────────────────────
    async function openAnimeDetailModal(aid) {
      const res = await fetch(`/api/anime_detail?id=${aid}`);
      const d = await res.json();
      activeModalAnime = d;
      modalSelectedEps.clear();

      document.getElementById('modal_anime_title').innerText = d.anime.title;
      document.getElementById('modal_anime_meta').innerText = `${d.episodes.length} ភាគ · ${d.anime.alt_title || ''} · ${d.anime.year || 2026}`;

      // Preselect missing
      d.episodes.forEach(ep => {
        if (!ep.is_downloaded) modalSelectedEps.add(ep.episode_number);
      });

      renderModalEpisodes();
      document.getElementById('anime_detail_modal').classList.remove('hidden');
    }

    function closeAnimeDetailModal() {
      document.getElementById('anime_detail_modal').classList.add('hidden');
    }

    function renderModalEpisodes() {
      if (!activeModalAnime) return;
      const grid = document.getElementById('modal_ep_grid');
      const eps = activeModalAnime.episodes;
      const anime = activeModalAnime.anime;

      grid.innerHTML = eps.map(ep => {
        const isSel = modalSelectedEps.has(ep.episode_number);
        const isDl = ep.is_downloaded;
        const thumb = ep.thumbnail_url || anime.poster_url || '';

        return `<div class="glass p-3 rounded-xl flex items-center justify-between gap-3 text-xs ${isSel ? 'ring-1 ring-brand-500 bg-brand-500/10' : ''}">
          <div class="flex items-center gap-2.5 min-w-0">
            <input type="checkbox" ${isSel ? 'checked' : ''} onchange="toggleModalEp(${ep.episode_number})" class="w-4 h-4 rounded text-brand-600 bg-black/50 border-white/20">
            <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black/40">
              <img src="${thumb}" class="w-full h-full object-cover">
            </div>
            <div class="truncate">
              <div class="font-bold text-white truncate">ភាគ ${ep.episode_number}</div>
              <div class="text-[10px] text-gray-400 truncate">${isDl ? '✅ មានលើ Disk' : '🆕 ភាគថ្មី'}</div>
            </div>
          </div>
          <button onclick="openVideoPlayer('${ep.video_url || ''}', 'ភាគ ${ep.episode_number} - ${anime.title}')" class="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-cyan-300 font-bold text-[11px]">
            ▶
          </button>
        </div>`;
      }).join('');

      document.getElementById('modal_sel_count').innerText = modalSelectedEps.size;
    }

    function toggleModalEp(num) {
      if (modalSelectedEps.has(num)) modalSelectedEps.delete(num);
      else modalSelectedEps.add(num);
      renderModalEpisodes();
    }

    function modalSelectAll(sel) {
      if (!activeModalAnime) return;
      activeModalAnime.episodes.forEach(e => {
        if (sel) modalSelectedEps.add(e.episode_number);
        else modalSelectedEps.delete(e.episode_number);
      });
      renderModalEpisodes();
    }

    function modalSelectMissingOnly() {
      if (!activeModalAnime) return;
      modalSelectedEps.clear();
      activeModalAnime.episodes.forEach(e => {
        if (!e.is_downloaded) modalSelectedEps.add(e.episode_number);
      });
      renderModalEpisodes();
    }

    async function downloadFromModal() {
      if (!activeModalAnime || modalSelectedEps.size === 0) {
        alert('⚠️ សូមជ្រើសរើសភាគយ៉ាងហោចមួយ!');
        return;
      }
      const selectedEps = activeModalAnime.episodes.filter(e => modalSelectedEps.has(e.episode_number));
      await fetch('/api/start_download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_episodes: selectedEps,
          anime_info: activeModalAnime.anime
        })
      });
      closeAnimeDetailModal();
      switchTab('queue');
    }

    // ── TAB SWITCHING ──────────────────────────────────────────────────────────
    function switchTab(tabId) {
      ['catalog', 'scanner', 'queue', 'options', 'logs'].forEach(t => {
        document.getElementById('tab_' + t).classList.add('hidden');
        document.getElementById('tab_btn_' + t).classList.remove('tab-active');
        document.getElementById('tab_btn_' + t).classList.add('text-gray-400');
      });
      document.getElementById('tab_' + tabId).classList.remove('hidden');
      document.getElementById('tab_btn_' + tabId).classList.add('tab-active');
      document.getElementById('tab_btn_' + tabId).classList.remove('text-gray-400');
    }

    async function saveSettings() {
      const cfg = {
        out_dir: document.getElementById('cfg_out_dir').value,
        threads: parseInt(document.getElementById('cfg_threads').value) || 3,
        naming: document.getElementById('cfg_naming').value,
        overwrite_existing: document.getElementById('cfg_overwrite').checked,
        api_url: document.getElementById('cfg_api_url').value
      };
      await fetch('/api/save_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      alert('✅ បានរក្សាទុកការកំណត់ Settings រួចរាល់!');
    }

    async function clearLogs() {
      document.getElementById('log_terminal').innerHTML = '';
    }

    window.onload = init;
  </script>
</body>
</html>
"""

class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path in ["/", "/index.html"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))

        elif parsed.path == "/api/status":
            cfg = load_config()
            with engine_lock:
                st = {
                    "is_downloading": engine_state["is_downloading"],
                    "total_tasks": engine_state["total_tasks"],
                    "completed_tasks": engine_state["completed_tasks"],
                    "active_tasks": engine_state["active_tasks"][-25:],
                    "logs": engine_state["logs"][-40:],
                    "disk_status": engine_state["disk_status"],
                    "out_dir": cfg.get("out_dir", DEFAULT_OUT)
                }
            self.send_json(st)

        elif parsed.path == "/api/catalog":
            with engine_lock:
                amap = engine_state["disk_status"].get("anime_map", {})
            items = list(amap.values())
            self.send_json({"items": items})

        elif parsed.path == "/api/anime_detail":
            params = urllib.parse.parse_qs(parsed.query)
            aid_str = params.get("id", ["0"])[0]
            aid = int(aid_str) if aid_str.isdigit() else 0

            target_anime = None
            for a in raw_catalog_cache["anime"]:
                if a.get("id") == aid:
                    target_anime = a
                    break

            if not target_anime:
                self.send_json({"error": "Anime not found"})
                return

            cfg = load_config()
            out_base = cfg.get("out_dir", DEFAULT_OUT)
            folder = get_anime_folder(out_base, target_anime)

            eps = [e for e in raw_catalog_cache["episodes"] if e.get("anime_id") == aid]
            eps = sorted(eps, key=lambda x: x.get("episode_number", 0))

            ep_list = []
            for ep in eps:
                num = ep.get("episode_number", 0)
                is_dl, fp, sz = is_episode_downloaded(folder, num, ep.get("title", ""))
                ep_list.append({
                    "id": ep.get("id"),
                    "episode_number": num,
                    "title": ep.get("title") or f"Episode {num}",
                    "video_url": ep.get("video_url", ""),
                    "thumbnail_url": ep.get("thumbnail_url", ""),
                    "is_downloaded": is_dl,
                    "file_path": fp,
                    "file_size": sz
                })

            self.send_json({
                "anime": target_anime,
                "episodes": ep_list,
                "folder": folder
            })

        elif parsed.path == "/api/video_stream":
            # Video streaming proxy with HTTP Range request support
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get("url", [""])[0]
            if not target_url or not target_url.startswith("http"):
                self.send_error(400, "Missing or invalid url parameter")
                return

            cfg = load_config()
            token = cfg.get("token", "")
            hdrs = build_hdrs(target_url, token)

            # Forward Range header if client requested seeking
            range_header = self.headers.get("Range")
            if range_header:
                hdrs["Range"] = range_header

            try:
                req = urllib.request.Request(target_url, headers=hdrs)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    code = resp.status if hasattr(resp, 'status') else 200
                    self.send_response(code)

                    # Forward essential media headers
                    for h_name in ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]:
                        val = resp.headers.get(h_name)
                        if val:
                            self.send_header(h_name, val)

                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()

                    # Stream data
                    while True:
                        chunk = resp.read(128 * 1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
            except Exception:
                pass

        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            body = json.loads(post_body)
        except Exception:
            body = {}

        if parsed.path == "/api/scan_disk":
            scan_disk_and_update_state()
            self.send_json({"status": "ok"})

        elif parsed.path == "/api/open_folder":
            cfg = load_config()
            p = cfg.get("out_dir", DEFAULT_OUT)
            os.makedirs(p, exist_ok=True)
            try:
                os.startfile(p)
            except Exception:
                pass
            self.send_json({"status": "ok"})

        elif parsed.path == "/api/stop_download":
            with engine_lock:
                engine_state["should_stop"] = True
            add_log("⏹ អ្នកប្រើប្រាស់បានស្នើសុំបញ្ឈប់ការទាញយក", "warn")
            self.send_json({"status": "ok"})

        elif parsed.path == "/api/save_config":
            cfg = load_config()
            cfg.update(body)
            save_config(cfg)
            add_log("⚙️ បានរក្សាទុកការកំណត់ Configuration រួចរាល់", "ok")
            self.send_json({"status": "ok"})

        elif parsed.path == "/api/scan_target":
            target = body.get("target", "").strip()
            # Try importing helper or local lookup
            from scan_and_download import scan_website_target
            try:
                res = scan_website_target(target)
                anime = res.get("anime", {})
                episodes = res.get("episodes", [])

                # Enrich episodes with current disk status
                cfg = load_config()
                out_base = cfg.get("out_dir", DEFAULT_OUT)
                folder = get_anime_folder(out_base, anime)

                enriched_eps = []
                for ep in episodes:
                    num = ep.get("episode_number", 0)
                    is_dl, fp, sz = is_episode_downloaded(folder, num, ep.get("title", ""))
                    ep_data = dict(ep)
                    ep_data["is_downloaded"] = is_dl
                    ep_data["file_path"] = fp
                    ep_data["file_size"] = sz
                    enriched_eps.append(ep_data)

                res["episodes"] = enriched_eps
                res["folder"] = folder
                self.send_json(res)
            except Exception as ex:
                self.send_json({"error": str(ex)})

        elif parsed.path == "/api/start_download":
            anime_ids = body.get("anime_ids", [])
            target_eps = body.get("target_episodes", [])
            anime_info = body.get("anime_info", {})

            cfg = load_config()
            out_base = cfg.get("out_dir", DEFAULT_OUT)
            naming = cfg.get("naming", "kh")
            threads = cfg.get("threads", 3)
            token = cfg.get("token", "")
            overwrite = cfg.get("overwrite_existing", False)

            tasks = []
            if anime_ids:
                ep_map: Dict[int, List[dict]] = {}
                for ep in raw_catalog_cache["episodes"]:
                    ep_map.setdefault(ep.get("anime_id", 0), []).append(ep)

                aid_map = {a["id"]: a for a in raw_catalog_cache["anime"]}
                existing_folders = [f for f in os.listdir(out_base) if os.path.isdir(os.path.join(out_base, f))] if os.path.exists(out_base) else []

                for aid in anime_ids:
                    anime = aid_map.get(aid, {})
                    eps = ep_map.get(aid, [])
                    folder = get_anime_folder(out_base, anime, existing_folders)
                    a_title = os.path.basename(folder)

                    for ep in eps:
                        vurl = (ep.get("video_url") or "").strip()
                        if not vurl or not vurl.startswith("http"): continue
                        ep_num = ep.get("episode_number", 0)
                        ep_title = sanitize(ep.get("title") or f"Episode {ep_num}", mx=80)
                        n = f"{ep_num:03d}"
                        if naming == "kh": fname = f"ភាគ {n} - {ep_title}.mp4"
                        elif naming == "en": fname = f"Ep{n} - {ep_title}.mp4"
                        else: fname = f"{n}.mp4"
                        out_path = os.path.join(folder, fname)
                        tasks.append({
                            "anime_title": a_title,
                            "ep_num": ep_num,
                            "ep_title": ep_title,
                            "url": vurl,
                            "out_path": out_path
                        })

            elif target_eps and anime_info:
                a_title = sanitize(anime_info.get("title") or "Unknown_Anime")
                folder = os.path.join(out_base, a_title)
                for ep in target_eps:
                    vurl = (ep.get("video_url") or "").strip()
                    if not vurl or not vurl.startswith("http"): continue
                    ep_num = ep.get("episode_number", 0)
                    ep_title = sanitize(ep.get("title") or f"Episode {ep_num}", mx=80)
                    n = f"{ep_num:03d}"
                    if naming == "kh": fname = f"ភាគ {n} - {ep_title}.mp4"
                    elif naming == "en": fname = f"Ep{n} - {ep_title}.mp4"
                    else: fname = f"{n}.mp4"
                    out_path = os.path.join(folder, fname)
                    tasks.append({
                        "anime_title": a_title,
                        "ep_num": ep_num,
                        "ep_title": ep_title,
                        "url": vurl,
                        "out_path": out_path
                    })

            if tasks:
                worker = DownloadWorker(tasks, max_workers=threads, token=token, overwrite=overwrite)
                threading.Thread(target=worker.run, daemon=True).start()

            self.send_json({"status": "started", "task_count": len(tasks)})

    def send_json(self, data: dict):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

def start_server():
    load_raw_data()
    scan_disk_and_update_state()
    
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    url = f"http://127.0.0.1:{PORT}"
    print(f"\n========================================================")
    print(f" 🎬 MER DONGHUA VISUAL DOWNLOADER & SCANNER STUDIO v5.0")
    print(f" 🌐 Dashboard URL: {url}")
    print(f"========================================================\n")
    webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    start_server()
