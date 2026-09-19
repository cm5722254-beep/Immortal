#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Website Video Scanner & Bulk Downloader
=========================================================
Scans video streams directly from website URLs (watch/anime),
fetches all episode links (e.g. 139 to 153), and downloads
with correct Khmer anime folder and episode naming.
"""
import os
import sys
import re
import json
import time
import math
import urllib.request
import urllib.parse
import urllib.error
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

API_DEFAULT = "https://merdonghua-com.onrender.com/api"
DEFAULT_OUT = r"D:\MerDonghua_Videos" if os.path.exists("D:\\") else os.path.join(os.path.expanduser("~"), "Desktop", "MerDonghua_Videos")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"


def sanitize(name: str, mx: int = 100) -> str:
    if not name:
        return "unnamed"
    clean = re.sub(r'[\\/*?:"<>|]', '_', name.strip())
    clean = re.sub(r'\s+', ' ', clean)
    return clean[:mx]


def fmt_bytes(b: float) -> str:
    if b <= 0:
        return "0 B"
    if b >= 1 << 30:
        return f"{b/(1<<30):.2f} GB"
    if b >= 1 << 20:
        return f"{b/(1<<20):.1f} MB"
    if b >= 1 << 10:
        return f"{b/(1<<10):.1f} KB"
    return f"{int(b)} B"


def fmt_time(s: float) -> str:
    if not math.isfinite(s) or s <= 0:
        return "--:--"
    m, sec = divmod(int(s), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"


def build_headers(url: str, token: str = "") -> dict:
    h = {"User-Agent": UA, "Accept": "*/*"}
    if "nintanime.com" in url or "s3." in url:
        h["Referer"] = "https://nintanime.com/"
        h["Origin"] = "https://nintanime.com"
    elif "r2.dev" in url or "cloudflarestorage" in url:
        h["Referer"] = "https://merdonghua.com/"
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def scan_website_target(target: str, api_base: str = API_DEFAULT) -> Dict[str, Any]:
    """
    Scans a website target (Watch URL, Anime URL, slug, or title)
    and returns anime info and its complete episode list with video stream URLs.
    """
    target = target.strip()
    slug_or_query = target

    # Extract slug from website URL if provided
    # e.g. http://localhost:5173/watch/big-brother/139 -> big-brother
    m = re.search(r'/(?:watch|anime|donghua|movie)/([^/?#]+)', target)
    if m:
        slug_or_query = m.group(1).strip()

    # Load local seed/catalog fallback
    local_data = {}
    for p in [
        os.path.join(os.path.dirname(__file__), "..", "..", "backend", "app", "services", "seed_export.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "data", "catalog.json"),
        os.path.join("D:\\", "Huang-anime", "backend", "app", "services", "seed_export.json")
    ]:
        if os.path.exists(p):
            try:
                with open(p, encoding="utf-8") as f:
                    local_data = json.load(f)
                    break
            except Exception:
                pass

    anime_info = None
    episodes = []

    # 1. Check local catalog first by slug/title/alt_title
    q_low = slug_or_query.lower()
    for a in local_data.get("anime", []):
        t = (a.get("title") or "").lower()
        alt = (a.get("alt_title") or "").lower()
        s = (a.get("slug") or "").lower()
        aid = str(a.get("id"))
        if q_low == s or q_low == aid or q_low in t or q_low in alt or (q_low in ["139", "big brother", "សិស្សច្បង"] and s == "big-brother"):
            anime_info = a
            break

    # 2. Try online API (Localhost first, then Render)
    slug_for_api = anime_info.get("slug", slug_or_query) if anime_info else slug_or_query
    encoded_slug = urllib.parse.quote(slug_for_api)
    api_candidates = [api_base]
    if "localhost:8000" not in api_base:
        api_candidates.insert(0, "http://localhost:8000/api")

    for cand in api_candidates:
        api_url = f"{cand.rstrip('/')}/anime/{encoded_slug}/episodes"
        try:
            req = urllib.request.Request(api_url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as r:
                episodes = json.loads(r.read().decode("utf-8"))
                if episodes:
                    api_base = cand
                    break
        except Exception:
            continue

    # If API didn't return episodes, fallback to local episodes
    if not episodes and anime_info:
        aid = anime_info.get("id")
        episodes = [e for e in local_data.get("episodes", []) if e.get("anime_id") == aid]

    # If anime_info wasn't found locally, fetch anime info from API
    if not anime_info and episodes:
        try:
            info_url = f"{api_base.rstrip('/')}/anime/{encoded_slug}"
            req = urllib.request.Request(info_url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as r:
                anime_info = json.loads(r.read().decode("utf-8"))
        except Exception:
            anime_info = {"title": slug_or_query, "slug": slug_for_api}

    if not anime_info:
        anime_info = {"title": slug_or_query, "slug": slug_for_api}

    # Sort episodes by episode_number
    episodes = sorted(episodes, key=lambda e: e.get("episode_number", 0))

    return {
        "anime": anime_info,
        "episodes": episodes,
        "count": len(episodes),
        "source": "api" if episodes and episodes[0].get("created_at") else "catalog"
    }


def download_single_video(url: str, out_path: str, token: str = "") -> bool:
    """Downloads video with resume support and real-time progress."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    hdrs = build_headers(url, token)
    existing = os.path.getsize(out_path) if os.path.exists(out_path) else 0

    total = 0
    try:
        req = urllib.request.Request(url, headers=hdrs, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            cl = r.headers.get("Content-Length")
            if cl:
                total = int(cl)
    except Exception:
        pass

    if existing > 0 and total > 0 and existing >= total:
        print(f"      ⏩ Skip (រួចរាល់ហើយ): {os.path.basename(out_path)} ({fmt_bytes(existing)})")
        return True

    mode = "wb"
    if existing > 0 and total > 0 and existing < total:
        hdrs["Range"] = f"bytes={existing}-"
        mode = "ab"

    req = urllib.request.Request(url, headers=hdrs)
    downloaded = existing
    start_t = time.time()
    last_print = start_t
    bytes_window = 0

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            cr = resp.headers.get("Content-Range", "")
            if cr and "/" in cr:
                try:
                    total = int(cr.split("/")[-1])
                except Exception:
                    pass
            if not total:
                cl = resp.headers.get("Content-Length")
                if cl:
                    total = downloaded + int(cl)

            CHUNK = 512 * 1024
            with open(out_path, mode) as f:
                while True:
                    chunk = resp.read(CHUNK)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    bytes_window += len(chunk)
                    now = time.time()
                    if now - last_print >= 0.5:
                        spd = bytes_window / (now - last_print)
                        bytes_window = 0
                        last_print = now
                        pct = (downloaded / total * 100) if total else 0
                        eta = ((total - downloaded) / spd) if total and spd > 0 else 0
                        print(
                            f"\r      ⬇ [{pct:5.1f}%] {fmt_bytes(downloaded)}/{fmt_bytes(total)}  "
                            f"· Speed: {fmt_bytes(spd)}/s  · ETA: {fmt_time(eta)}",
                            end="",
                            flush=True
                        )
        print(f"\r      ✅ ជោគជ័យ: {os.path.basename(out_path)} ({fmt_bytes(downloaded)})       ")
        return True
    except Exception as ex:
        print(f"\n      ❌ Error: {ex}")
        return False


if __name__ == "__main__":
    print("=" * 65)
    print("🎬 MER DONGHUA — Website Video Scanner & Downloader")
    print("=" * 65)

    target = "http://localhost:5173/watch/big-brother"
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        user_in = input(f"👉 បញ្ចូល Link Website ឬ ឈ្មោះរឿង [Enter=ស្កេន {target}]: ").strip()
        if user_in:
            target = user_in

    print(f"\n🔍 កំពុងស្កេន Website: {target} ...")
    res = scan_website_target(target)
    anime = res["anime"]
    episodes = res["episodes"]

    a_title = sanitize(anime.get("title") or "Unknown_Anime")
    print(f"\n📺 បានរកឃើញ: {a_title}")
    if anime.get("alt_title"):
        print(f"   ចំណងជើងដើម: {anime.get('alt_title')}")
    print(f"   ចំនួនភាគ: {len(episodes)} ភាគ")

    if not episodes:
        print("❌ មិនមានវីដេអូ ឬ ភាគត្រូវបានរកឃើញទេ។")
        sys.exit(1)

    print("\n📋 បញ្ជីភាគដែលបានស្កេនឃើញ:")
    for ep in episodes:
        num = ep.get("episode_number")
        vurl = ep.get("video_url") or "គ្មាន Link"
        print(f"   • ភាគ {num:03d} - {ep.get('title')} [{vurl[:60]}...]")

    confirm = input(f"\n👉 ទាញយកទាំង {len(episodes)} ភាគនេះទេ? (Y/n): ").strip().lower()
    if confirm in ["n", "no"]:
        print("បោះបង់ការ Download។")
        sys.exit(0)

    out_dir = DEFAULT_OUT
    print(f"\n📂 រក្សាទុកនៅ: {out_dir}\\{a_title}")
    os.makedirs(os.path.join(out_dir, a_title), exist_ok=True)

    success_count = 0
    for idx, ep in enumerate(episodes, 1):
        num = ep.get("episode_number", idx)
        title = sanitize(ep.get("title") or f"Episode {num}")
        url = ep.get("video_url", "")
        if not url:
            print(f"⚠️ ភាគ {num} គ្មាន Video URL! រំលង...")
            continue
        fname = f"ភាគ {num:03d} - {title}.mp4"
        fpath = os.path.join(out_dir, a_title, fname)
        if os.path.exists(fpath) and os.path.getsize(fpath) > 500 * 1024:
            print(f"[{idx}/{len(episodes)}] ⏩ ភាគ {num} មានរួចរាល់ហើយ (Skipped): {fname}")
            success_count += 1
            continue

        print(f"\n[{idx}/{len(episodes)}] ⬇ កំពុង Download ភាគ {num}: {fname}")
        if download_single_video(url, fpath):
            success_count += 1

    print(f"\n🎉 ការទាញយកបានបញ្ចប់: {success_count}/{len(episodes)} ភាគ!")
    os.startfile(os.path.join(out_dir, a_title))
