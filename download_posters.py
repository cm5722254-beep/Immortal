#!/usr/bin/env python3
r"""
=============================================================================
🎬 WatchFlix Anime — Poster & Picture Downloader Tool
=============================================================================
Downloads all Anime/Donghua poster and banner images from the database/catalog
and saves them into folder D:\Anime_Posters (or custom path).

Features:
- Fast multi-threaded concurrent downloading (8 workers)
- Upgrades Pinterest images to highest resolution (/736x/)
- Handles local uploads and remote CDNs
- Generates an offline HTML Gallery (index.html) to browse downloaded pictures
=============================================================================
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure UTF-8 output in Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_DEST_DIR = r"D:\Anime_Posters"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def sanitize_filename(name: str) -> str:
    """Make string safe for Windows filesystem."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = cleaned.strip().replace(" ", "_")
    return cleaned[:80] if cleaned else "image"


def get_image_ext(url: str, default: str = ".jpg") -> str:
    """Extract file extension from URL or content."""
    clean_url = url.split("?")[0].lower()
    for ext in [".webp", ".png", ".gif", ".jpeg", ".jpg", ".avif"]:
        if clean_url.endswith(ext):
            return ext
    return default


def upgrade_pinterest_url(url: str) -> str:
    """Upgrade Pinterest thumbnail /236x/ or /474x/ to high-res /736x/."""
    if "i.pinimg.com" in url:
        return re.sub(r"/236x/|/474x/|/564x/", "/736x/", url)
    return url


def fetch_anime_list():
    """Fetch anime list from local database or seed export JSON."""
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    
    # 1. Try connecting to database
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(backend_dir, ".env"))
        
        # Try SQLite direct first if present
        db_path = os.path.join(backend_dir, "merdonghua.db")
        if os.path.exists(db_path):
            import sqlite3
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT id, title, slug, poster_url, banner_url, year, type FROM anime")
            rows = cur.fetchall()
            conn.close()
            if rows:
                return [
                    {
                        "id": r[0],
                        "title": r[1],
                        "slug": r[2] or f"anime-{r[0]}",
                        "poster_url": r[3],
                        "banner_url": r[4],
                        "year": r[5],
                        "type": r[6],
                    }
                    for r in rows
                ]
    except Exception:
        pass

    # 2. Try seed_export.json or cloud backup in backend
    for fn in ["seed_export.json", "backups/latest_backup.json"]:
        fp = os.path.join(backend_dir, fn)
        if os.path.exists(fp):
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "anime" in data:
                        return data["anime"]
                    elif isinstance(data, list):
                        return data
            except Exception:
                pass

    # 3. Fallback: Query live API http://127.0.0.1:8000/api/anime
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/anime?per_page=100",
            headers={"User-Agent": USER_AGENT}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if "items" in data:
                return data["items"]
    except Exception:
        pass

    return []


def download_single_image(url: str, save_path: str) -> bool:
    """Download single image file safely."""
    if not url:
        return False

    backend_uploads = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "uploads")

    # Handle local uploads path
    if url.startswith("/uploads/") or "localhost:8000/uploads/" in url or "127.0.0.1:8000/uploads/" in url:
        filename = os.path.basename(url.split("?")[0])
        local_src = os.path.join(backend_uploads, filename)
        if os.path.exists(local_src):
            try:
                shutil.copy2(local_src, save_path)
                return True
            except Exception:
                pass

    # Handle remote HTTP/HTTPS download
    high_res_url = upgrade_pinterest_url(url)
    req = urllib.request.Request(high_res_url, headers={"User-Agent": USER_AGENT, "Referer": "https://www.pinterest.com/"})
    try:
        with urllib.request.urlopen(req, timeout=15) as response, open(save_path, "wb") as out_file:
            shutil.copyfileobj(response, out_file)
        return True
    except Exception:
        # Fallback to original URL if upgraded URL 404s
        if high_res_url != url:
            try:
                req2 = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req2, timeout=15) as response, open(save_path, "wb") as out_file:
                    shutil.copyfileobj(response, out_file)
                return True
            except Exception:
                pass
    return False


def generate_gallery_html(output_dir: str, downloaded_records: list):
    """Generate a modern offline HTML gallery for all downloaded posters."""
    html_file = os.path.join(output_dir, "index.html")
    cards_html = []
    for item in downloaded_records:
        poster_rel = item.get("poster_rel", "")
        banner_rel = item.get("banner_rel", "")
        title = item.get("title", "Untitled")
        slug = item.get("slug", "")
        year = item.get("year", "")
        
        cards_html.append(f"""
        <div class="card">
          <div class="poster-wrap">
            <img src="{poster_rel}" alt="{title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
            <span class="badge">4K ULTRA</span>
          </div>
          <div class="info">
            <h3 title="{title}">{title}</h3>
            <p>{slug} • {year}</p>
            <div class="links">
              {f'<a href="{poster_rel}" target="_blank" download>💾 Poster</a>' if poster_rel else ''}
              {f'<a href="{banner_rel}" target="_blank" download>🖼️ Banner</a>' if banner_rel else ''}
            </div>
          </div>
        </div>
        """)

    full_html = f"""<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WatchFlix Anime — Poster Gallery</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #080d1a;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 30px 20px;
    }}
    .header {{
      max-width: 1400px;
      margin: 0 auto 30px auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 20px;
    }}
    .title {{ font-size: 26px; font-weight: 900; background: linear-gradient(90deg, #ff4d6d, #ffa3b1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
    .subtitle {{ font-size: 13px; color: #9ca3af; margin-top: 4px; }}
    .count-pill {{ background: rgba(255,77,109,0.2); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.4); padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 13px; }}
    .grid {{
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }}
    .card {{
      background: #0d1526;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
    }}
    .card:hover {{
      transform: translateY(-5px);
      border-color: rgba(255,77,109,0.6);
      box-shadow: 0 12px 25px rgba(255,77,109,0.25);
    }}
    .poster-wrap {{ position: relative; width: 100%; aspect-ratio: 2/3; background: #151f38; overflow: hidden; }}
    .poster-wrap img {{ width: 100%; height: 100%; object-fit: cover; }}
    .badge {{
      position: absolute; top: 8px; right: 8px;
      background: rgba(0,0,0,0.75); color: #ff4d6d; border: 1px solid #ff4d6d;
      font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px;
    }}
    .info {{ padding: 12px; }}
    .info h3 {{ font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }}
    .info p {{ font-size: 11px; color: #9ca3af; margin-bottom: 10px; }}
    .links {{ display: flex; gap: 8px; }}
    .links a {{
      flex: 1; text-align: center; font-size: 11px; font-weight: bold;
      padding: 5px 8px; border-radius: 6px; text-decoration: none;
      background: rgba(255,255,255,0.08); color: #e5e7eb; transition: background 0.2s;
    }}
    .links a:hover {{ background: #ff4d6d; color: #fff; }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🎬 WatchFlix Anime — Poster Gallery</div>
      <div class="subtitle">Downloaded on Drive D: {output_dir}</div>
    </div>
    <div class="count-pill">🖼️ {len(downloaded_records)} Post & Banners</div>
  </div>
  <div class="grid">
    {''.join(cards_html)}
  </div>
</body>
</html>
"""
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(full_html)


def main():
    print("=" * 65)
    print("   🎬 WATCHFLIX ANIME — POSTER & BANNER DOWNLOADER")
    print("=" * 65)

    dest_dir = DEFAULT_DEST_DIR
    if len(sys.argv) > 1:
        dest_dir = sys.argv[1]

    posters_dir = os.path.join(dest_dir, "Posters")
    banners_dir = os.path.join(dest_dir, "Banners")

    try:
        os.makedirs(posters_dir, exist_ok=True)
        os.makedirs(banners_dir, exist_ok=True)
    except Exception as e:
        print(f"❌ Error creating directory {dest_dir}: {e}")
        return

    print(f"📁 Destination Folder: {dest_dir}")
    print("🔍 Fetching anime records...")

    anime_list = fetch_anime_list()
    if not anime_list:
        print("❌ No anime titles found to download. Please make sure backend or database is active.")
        return

    total = len(anime_list)
    print(f"✅ Found {total} Anime & Donghua titles! Starting downloads with 8 workers...\n")

    tasks = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for idx, anime in enumerate(anime_list, 1):
            aid = anime.get("id", idx)
            slug = sanitize_filename(anime.get("slug") or anime.get("title", f"anime_{aid}"))
            poster_url = anime.get("poster_url")
            banner_url = anime.get("banner_url")

            item_record = {
                "id": aid,
                "title": anime.get("title", f"Anime {aid}"),
                "slug": slug,
                "year": anime.get("year", ""),
                "poster_rel": "",
                "banner_rel": "",
            }

            if poster_url:
                ext = get_image_ext(poster_url)
                poster_filename = f"{aid:03d}_{slug}_poster{ext}"
                poster_path = os.path.join(posters_dir, poster_filename)
                item_record["poster_rel"] = f"Posters/{poster_filename}"
                tasks.append(executor.submit(download_single_image, poster_url, poster_path))

            if banner_url and banner_url != poster_url:
                ext = get_image_ext(banner_url)
                banner_filename = f"{aid:03d}_{slug}_banner{ext}"
                banner_path = os.path.join(banners_dir, banner_filename)
                item_record["banner_rel"] = f"Banners/{banner_filename}"
                tasks.append(executor.submit(download_single_image, banner_url, banner_path))

    # Wait and track progress
    done_count = 0
    total_tasks = len(tasks)
    for fut in as_completed(tasks):
        done_count += 1
        if fut.result():
            print(f"\r progress: [{done_count}/{total_tasks}] downloaded successfully...", end="", flush=True)

    print("\n\n📊 Generating offline HTML Photo Gallery (index.html)...")
    records = []
    for idx, anime in enumerate(anime_list, 1):
        aid = anime.get("id", idx)
        slug = sanitize_filename(anime.get("slug") or anime.get("title", f"anime_{aid}"))
        poster_url = anime.get("poster_url")
        banner_url = anime.get("banner_url")
        
        ext_p = get_image_ext(poster_url or "")
        ext_b = get_image_ext(banner_url or "")
        
        poster_fn = f"{aid:03d}_{slug}_poster{ext_p}"
        banner_fn = f"{aid:03d}_{slug}_banner{ext_b}"

        records.append({
            "id": aid,
            "title": anime.get("title", f"Anime {aid}"),
            "slug": slug,
            "year": anime.get("year", ""),
            "poster_rel": f"Posters/{poster_fn}" if os.path.exists(os.path.join(posters_dir, poster_fn)) else "",
            "banner_rel": f"Banners/{banner_fn}" if os.path.exists(os.path.join(banners_dir, banner_fn)) else "",
        })

    generate_gallery_html(dest_dir, records)

    print("=" * 65)
    print(f"🎉 DOWNLOAD COMPLETE!")
    print(f"📁 Pictures Location : {dest_dir}")
    print(f"🖼️ Posters folder   : {posters_dir}")
    print(f"🖼️ Banners folder   : {banners_dir}")
    print(f"🌐 Offline Gallery  : {os.path.join(dest_dir, 'index.html')}")
    print("=" * 65)


if __name__ == "__main__":
    main()
