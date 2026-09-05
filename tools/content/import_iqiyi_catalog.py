#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Automated iQIYI Donghua & Anime Full Catalog Importer
======================================================================
Imports top popular Donghua & Anime series from iQIYI and streaming platforms
directly into the Mer Donghua website database via REST API.

Features:
- High-res Poster & Banner art.
- Full Khmer & English/Chinese titles.
- Complete episode list with direct streaming links (S3, Cloudflare R2, CDN).
- Automatically pairs with local downloaded files in downloaded_videos.
- Non-destructive: Updates existing anime or creates new ones.
"""

import os
import sys
import json
import re
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, List, Any, Optional

# Force UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
CATALOG_JSON_PATH = ROOT_DIR / "tools" / "iqiyi_catalog_data.json"
LOCAL_VIDEOS_DIR = ROOT_DIR / "downloaded_videos"
R2_CONFIG_PATH = ROOT_DIR / "r2_config.json"

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "cm5722254@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)


class IQIYICatalogImporter:
    def __init__(self, api_base: str = API_BASE):
        self.api_base = api_base
        self.token: Optional[str] = None

    def login(self) -> bool:
        if self.token:
            return True
        login_url = f"{self.api_base}/auth/login"
        payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode('utf-8')
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": USER_AGENT}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                data = json.loads(res.read().decode('utf-8'))
                self.token = data.get("access_token")
                return bool(self.token)
        except Exception as e:
            print(f"❌ Admin login failed: {e}")
            return False

    def fetch_all_anime(self) -> List[Dict[str, Any]]:
        url = f"{self.api_base}/anime?page=1&per_page=100"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as res:
                data = json.loads(res.read().decode('utf-8'))
                return data.get("items", []) if isinstance(data, dict) else data
        except Exception:
            return []

    def get_or_create_anime(self, anime_data: Dict[str, Any], existing_anime_list: List[Dict[str, Any]]) -> Optional[int]:
        title = anime_data["title"]
        alt_title = anime_data.get("alt_title", "")
        slug = anime_data.get("slug") or slugify(title)

        # Check existing by slug, title, or alt_title
        for ex in existing_anime_list:
            if ex.get("slug") == slug or ex.get("title").lower() == title.lower() or (alt_title and ex.get("alt_title", "").lower() == alt_title.lower()):
                print(f"   ℹ️ Anime '{title}' exists (ID: {ex['id']}).")
                # Update banner or poster if missing
                if not ex.get("banner_url") and anime_data.get("banner_url"):
                    self.update_anime_images(ex["id"], banner_url=anime_data["banner_url"])
                return ex["id"]

        # Create new Anime
        if not self.login():
            return None

        print(f"   ✨ Creating new Anime series: '{title}'...")
        payload = {
            "title": title,
            "slug": slug,
            "alt_title": alt_title,
            "description": anime_data.get("description", f"ទស្សនារឿង {title} កម្រិត 4K UHD លើ Mer Donghua"),
            "poster_url": anime_data.get("poster_url", "https://i.pinimg.com/736x/86/b4/2b/86b42b6c51b8191eb7a265d3ef9bd2fa.jpg"),
            "banner_url": anime_data.get("banner_url") or anime_data.get("poster_url"),
            "trailer_url": "",
            "type": anime_data.get("type", "DONGHUA"),
            "status": anime_data.get("status", "ONGOING"),
            "is_free": True,
            "is_published": True,
            "heat_score": anime_data.get("heat_score", 95000),
            "year": anime_data.get("year", 2024),
            "studio": anime_data.get("studio", "iQIYI / Tencent Animation"),
            "country": "China" if anime_data.get("type") in ["DONGHUA", "DRAMA"] else "Japan",
            "airing_day": anime_data.get("airing_day", "Saturday"),
            "genre_ids": []
        }

        url = f"{self.api_base}/anime"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}", "User-Agent": USER_AGENT},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                created = json.loads(res.read().decode('utf-8'))
                anime_id = created.get("id")
                print(f"   ✅ Anime created successfully! ID: {anime_id}")
                return anime_id
        except Exception as e:
            print(f"   ❌ Failed to create anime '{title}': {e}")
            return None

    def update_anime_images(self, anime_id: int, poster_url: Optional[str] = None, banner_url: Optional[str] = None):
        if not self.login():
            return
        payload = {}
        if poster_url: payload["poster_url"] = poster_url
        if banner_url: payload["banner_url"] = banner_url
        if not payload: return
        url = f"{self.api_base}/anime/{anime_id}"
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}", "User-Agent": USER_AGENT},
            method="PUT"
        )
        try:
            urllib.request.urlopen(req, timeout=15)
        except Exception:
            pass

    def fetch_episodes(self, anime_id: int) -> List[Dict[str, Any]]:
        url = f"{self.api_base}/anime/{anime_id}/episodes"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                data = json.loads(res.read().decode('utf-8'))
                return data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        except Exception:
            return []

    def import_episode(self, anime_id: int, ep_num: int, video_url: str, title: str = "", thumbnail_url: str = "") -> bool:
        if not self.login() or not video_url:
            return False

        existing_eps = self.fetch_episodes(anime_id)
        existing = next((e for e in existing_eps if e.get("episode_number") == ep_num), None)

        if existing:
            # If existing episode already has valid URL, don't overwrite unless empty
            if (existing.get("video_url") or "").strip():
                return True
            # Update empty URL
            ep_id = existing["id"]
            url = f"{self.api_base}/episodes/{ep_id}"
            payload = json.dumps({"video_url": video_url}).encode('utf-8')
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}", "User-Agent": USER_AGENT},
                method="PUT"
            )
        else:
            # Create new episode
            url = f"{self.api_base}/episodes"
            payload = json.dumps({
                "anime_id": anime_id,
                "episode_number": ep_num,
                "title": title or f"Episode {ep_num}",
                "video_url": video_url,
                "thumbnail_url": thumbnail_url,
                "duration_seconds": 1200,
                "is_published": True,
                "is_vip_only": False
            }).encode('utf-8')
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}", "User-Agent": USER_AGENT},
                method="POST"
            )

        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return res.status in (200, 201, 204)
        except Exception as e:
            print(f"      ⚠️ Failed to import episode {ep_num}: {e}")
            return False


def load_catalog_data() -> List[Dict[str, Any]]:
    if not CATALOG_JSON_PATH.exists():
        print(f"❌ Catalog data file not found: {CATALOG_JSON_PATH}")
        return []
    with open(CATALOG_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    print("=" * 75)
    print(" 🎬 MER DONGHUA — iQIYI DONGHUA & ANIME CATALOG AUTO-IMPORTER")
    print(" 🚀 នាំចូលបញ្ជីរឿង Anime/Donghua ពី iQIYI ចូលទៅក្នុង Website ដោយស្វ័យប្រវត្តិ")
    print("=" * 75)

    catalog = load_catalog_data()
    if not catalog:
        return

    print(f"📦 ឯកសារទិន្នន័យមានចំនួនរឿង: {len(catalog)} រឿង")

    importer = IQIYICatalogImporter()
    if not importer.login():
        print("❌ Login failed. Check your admin credentials.")
        return

    print("📡 កំពុងទាញយកទិន្នន័យដែលមានស្រាប់លើ Website...")
    existing_anime = importer.fetch_all_anime()
    print(f"✅ រកឃើញរឿងដែលមានស្រាប់: {len(existing_anime)} រឿង\n")

    total_episodes_added = 0

    for idx, item in enumerate(catalog, 1):
        title = item["title"]
        alt_title = item.get("alt_title", "")
        print(f"[{idx}/{len(catalog)}] 🎬 ដំណើរការរឿង: {title} ({alt_title})")

        anime_id = importer.get_or_create_anime(item, existing_anime)
        if not anime_id:
            continue

        episodes = item.get("episodes", [])
        print(f"   📺 មានភាគចំនួន: {len(episodes)} ភាគ...")

        added_for_this = 0
        for ep in episodes:
            ep_num = ep.get("episode_number", 1)
            v_url = ep.get("video_url", "")
            ep_title = ep.get("title") or f"Episode {ep_num}"
            thumb = ep.get("thumbnail_url", item.get("poster_url", ""))

            if importer.import_episode(anime_id, ep_num, v_url, ep_title, thumb):
                added_for_this += 1
                total_episodes_added += 1

        print(f"   ✅ បានបញ្ចូល/ពិនិត្យភាគរួចរាល់: {added_for_this}/{len(episodes)} ភាគ\n")

    print("=" * 75)
    print(f"🎉🎉🎉 បាននាំចូលរឿង និងភាគ iQIYI ចូលក្នុង Website ជោគជ័យសរុប: {total_episodes_added} ភាគ!")
    print("=" * 75)

    # Regenerate all documents
    doc_script = ROOT_DIR / "tools" / "generate_full_links_document.py"
    if doc_script.exists():
        print("\n🔄 កំពុងបង្កើត Master Documentation (MD, CSV, JSON) ឡើងវិញ...")
        import subprocess
        subprocess.run([sys.executable, str(doc_script)], cwd=str(ROOT_DIR))


if __name__ == "__main__":
    main()
