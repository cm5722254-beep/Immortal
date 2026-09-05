#!/usr/bin/env python3
"""
MER DONGHUA — Auto Episode & Anime Importer Tool (Python)
=========================================================
Allows bulk importing or single-command adding of episodes & anime
into the Mer Donghua database via the Backend REST API.

Features:
- Supports JSON, CSV, CLI Arguments, and Interactive Mode.
- Automatically creates Anime series if it doesn't exist.
- Automatically creates or updates Episodes.
- Triggers Telegram channel/bot notification for new episodes.
- Supports remote production API or local development server.
"""

import os
import sys
import json
import csv
import re
import argparse
import requests
from typing import Optional, Dict, Any, List

# Default API configuration
DEFAULT_API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000/api")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "cm5722254@gmail.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")


class MerDonghuaImporter:
    def __init__(self, api_base: str = DEFAULT_API_BASE, email: str = DEFAULT_ADMIN_EMAIL, password: str = DEFAULT_ADMIN_PASSWORD):
        self.api_base = api_base.rstrip("/")
        self.email = email
        self.password = password
        self.token: Optional[str] = None
        self.session = requests.Session()

    def slugify(self, text: str) -> str:
        """Convert anime title to URL-friendly slug."""
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        return re.sub(r"[\s_-]+", "-", text)

    def login(self) -> bool:
        """Authenticate as Admin to obtain JWT token."""
        url = f"{self.api_base}/auth/login"
        print(f"🔑 Logging in as {self.email}...")
        try:
            res = self.session.post(url, json={"email": self.email, "password": self.password}, timeout=15)
            if res.status_code == 200:
                data = res.json()
                self.token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print("✅ Login successful! Admin authenticated.")
                return True
            else:
                print(f"❌ Login failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            print(f"❌ Connection error connecting to {self.api_base}: {e}")
            return False

    def find_or_create_anime(self, title: str, alt_title: str = "", poster_url: str = "", banner_url: str = "", anime_type: str = "DONGHUA", studio: str = "") -> Optional[Dict[str, Any]]:
        """Check if anime exists by slug or title; create if not found."""
        slug = self.slugify(title)
        
        # 1. Search existing
        try:
            res = self.session.get(f"{self.api_base}/anime/{slug}", timeout=10)
            if res.status_code == 200:
                anime = res.json()
                print(f"🎬 Found existing anime: {anime['title']} (ID: {anime['id']})")
                return anime
        except Exception:
            pass

        # Also search in search API
        try:
            search_res = self.session.get(f"{self.api_base}/search?q={title}", timeout=10)
            if search_res.status_code == 200:
                items = search_res.json().get("items", [])
                for it in items:
                    if it["title"].lower() == title.lower() or it["slug"] == slug:
                        print(f"🎬 Found existing anime: {it['title']} (ID: {it['id']})")
                        return it
        except Exception:
            pass

        # 2. Create new Anime
        print(f"✨ Anime '{title}' not found. Creating new {anime_type} series...")
        payload = {
            "title": title,
            "slug": slug,
            "alt_title": alt_title or title,
            "description": f"{title} — High quality 4K streaming on Mer Donghua.",
            "poster_url": poster_url or "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=900&fit=crop&q=80",
            "banner_url": banner_url or poster_url or "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop&q=80",
            "trailer_url": "",
            "year": 2024,
            "status": "ONGOING",
            "studio": studio or "Tencent Penguin / Sparkly Key",
            "country": "China" if anime_type == "DONGHUA" else "Japan",
            "type": anime_type,
            "is_featured": True,
            "is_trending": True,
            "is_published": True,
            "genre_ids": [1, 2, 3], # Xianxia, Xuanhuan, Cultivation
        }

        try:
            create_res = self.session.post(f"{self.api_base}/anime", json=payload, timeout=15)
            if create_res.status_code in [200, 201]:
                created = create_res.json()
                print(f"🎉 Successfully created Anime: {created['title']} (ID: {created['id']})")
                return created
            else:
                print(f"❌ Failed to create anime ({create_res.status_code}): {create_res.text}")
                return None
        except Exception as e:
            print(f"❌ Error creating anime: {e}")
            return None

    def upsert_episode(self, anime_id: int, episode_number: int, video_url: str, title: str = "", thumbnail_url: str = "", duration_seconds: int = 1200) -> bool:
        """Insert new episode or update existing episode URL."""
        # 1. Check existing episodes for this anime
        try:
            eps_res = self.session.get(f"{self.api_base}/anime/{anime_id}/episodes", timeout=10)
            if eps_res.status_code == 200:
                episodes = eps_res.json()
                for ep in episodes:
                    if ep["episode_number"] == episode_number:
                        print(f"🔄 Episode {episode_number} already exists (ID: {ep['id']}). Updating video URL...")
                        update_res = self.session.put(
                            f"{self.api_base}/episodes/{ep['id']}",
                            json={
                                "video_url": video_url,
                                "title": title or ep.get("title") or f"Episode {episode_number}",
                                "thumbnail_url": thumbnail_url or ep.get("thumbnail_url"),
                                "duration_seconds": duration_seconds or ep.get("duration_seconds", 1200),
                                "is_published": True,
                            },
                            timeout=15,
                        )
                        if update_res.status_code == 200:
                            print(f"✅ Episode {episode_number} updated successfully!")
                            return True
                        else:
                            print(f"❌ Failed to update episode: {update_res.text}")
                            return False
        except Exception as e:
            print(f"⚠️ Error checking existing episodes: {e}")

        # 2. Insert new Episode
        payload = {
            "anime_id": anime_id,
            "episode_number": episode_number,
            "title": title or f"Episode {episode_number}",
            "video_url": video_url,
            "thumbnail_url": thumbnail_url or "",
            "duration_seconds": duration_seconds,
            "is_published": True,
        }

        try:
            res = self.session.post(f"{self.api_base}/episodes", json=payload, timeout=15)
            if res.status_code in [200, 201]:
                ep_data = res.json()
                print(f"🎉 Episode {episode_number} added successfully! (ID: {ep_data['id']})")
                print(f"🚀 Telegram broadcast notification dispatched automatically.")
                return True
            else:
                print(f"❌ Failed to add episode {episode_number} ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            print(f"❌ Error adding episode: {e}")
            return False

    def import_single(self, anime_title: str, episode_number: int, video_url: str, alt_title: str = "", poster_url: str = "", thumbnail_url: str = "", anime_type: str = "DONGHUA", studio: str = "") -> bool:
        """Import a single episode with auto-anime resolution."""
        anime = self.find_or_create_anime(anime_title, alt_title=alt_title, poster_url=poster_url, anime_type=anime_type, studio=studio)
        if not anime:
            return False
        return self.upsert_episode(anime["id"], episode_number, video_url, thumbnail_url=thumbnail_url)

    def import_from_json(self, json_filepath: str) -> int:
        """Bulk import from JSON file."""
        if not os.path.exists(json_filepath):
            print(f"❌ File not found: {json_filepath}")
            return 0

        with open(json_filepath, "r", encoding="utf-8") as f:
            items = json.load(f)

        if not isinstance(items, list):
            items = [items]

        print(f"📦 Found {len(items)} episode(s) to import from JSON.")
        success_count = 0
        for i, item in enumerate(items, 1):
            print(f"\n--- [{i}/{len(items)}] Processing {item.get('anime_title', 'Unknown')} Ep. {item.get('episode_number')} ---")
            ok = self.import_single(
                anime_title=item.get("anime_title", ""),
                episode_number=int(item.get("episode_number", 1)),
                video_url=item.get("video_url", ""),
                alt_title=item.get("alt_title", ""),
                poster_url=item.get("poster_url", ""),
                thumbnail_url=item.get("thumbnail_url", ""),
                anime_type=item.get("type", "DONGHUA"),
                studio=item.get("studio", ""),
            )
            if ok:
                success_count += 1

        print(f"\n==========================================")
        print(f"✨ Import Complete: {success_count}/{len(items)} episodes successfully added!")
        print(f"==========================================")
        return success_count

    def import_from_csv(self, csv_filepath: str) -> int:
        """Bulk import from CSV file."""
        if not os.path.exists(csv_filepath):
            print(f"❌ File not found: {csv_filepath}")
            return 0

        success_count = 0
        with open(csv_filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            print(f"📦 Found {len(rows)} episode(s) to import from CSV.")
            for i, row in enumerate(rows, 1):
                print(f"\n--- [{i}/{len(rows)}] Processing {row.get('anime_title')} Ep. {row.get('episode_number')} ---")
                ok = self.import_single(
                    anime_title=row.get("anime_title", ""),
                    episode_number=int(row.get("episode_number", 1)),
                    video_url=row.get("video_url", ""),
                    alt_title=row.get("alt_title", ""),
                    poster_url=row.get("poster_url", ""),
                    thumbnail_url=row.get("thumbnail_url", ""),
                    anime_type=row.get("type", "DONGHUA"),
                    studio=row.get("studio", ""),
                )
                if ok:
                    success_count += 1

        print(f"\n==========================================")
        print(f"✨ CSV Import Complete: {success_count}/{len(rows)} episodes successfully added!")
        print(f"==========================================")
        return success_count


def interactive_mode(importer: MerDonghuaImporter):
    """Guide user through step-by-step interactive CLI entry."""
    print("\n🎬 --- MER DONGHUA EPISODE IMPORTER (INTERACTIVE MODE) --- 🎬")
    anime_title = input("1. ឈ្មោះរឿង (Anime/Donghua Title): ").strip()
    if not anime_title:
        print("❌ Anime title is required!")
        return

    alt_title = input("2. ឈ្មោះអក្សរចិន ឬ Subtitle (Alt Title, optional): ").strip()
    ep_str = input("3. លេខភាគ (Episode Number, e.g. 1, 156): ").strip()
    try:
        episode_number = int(ep_str)
    except ValueError:
        print("❌ Invalid episode number!")
        return

    video_url = input("4. តំណភ្ជាប់វីដេអូ (Video Stream URL / .mp4 / .m3u8): ").strip()
    if not video_url:
        print("❌ Video URL is required!")
        return

    poster_url = input("5. រូបភាព Poster URL (Optional): ").strip()
    thumbnail_url = input("6. រូបភាព Thumbnail ភាគ URL (Optional): ").strip()
    anime_type = input("7. ប្រភេទ (DONGHUA, DRAMA, MOVIE, ឬ ANIME, default: DONGHUA): ").strip().upper() or "DONGHUA"

    print("\n🚀 Starting import...")
    importer.import_single(
        anime_title=anime_title,
        episode_number=episode_number,
        video_url=video_url,
        alt_title=alt_title,
        poster_url=poster_url,
        thumbnail_url=thumbnail_url,
        anime_type=anime_type,
    )


def main():
    parser = argparse.ArgumentParser(description="Mer Donghua Auto Episode & Anime Importer")
    parser.add_argument("--api", default=DEFAULT_API_BASE, help="Backend API base URL (e.g. http://localhost:8000/api)")
    parser.add_argument("--email", default=DEFAULT_ADMIN_EMAIL, help="Admin Email")
    parser.add_argument("--password", default=DEFAULT_ADMIN_PASSWORD, help="Admin Password")
    
    # Import Modes
    parser.add_argument("--json", help="Path to JSON file containing episode list")
    parser.add_argument("--csv", help="Path to CSV file containing episode list")
    
    # Single Episode Import
    parser.add_argument("--anime", help="Anime title for single episode import")
    parser.add_argument("--alt-title", default="", help="Chinese/Alt title")
    parser.add_argument("--ep", type=int, help="Episode number")
    parser.add_argument("--url", help="Video stream URL (.mp4 or .m3u8)")
    parser.add_argument("--poster", default="", help="Poster image URL")
    parser.add_argument("--thumbnail", default="", help="Episode thumbnail URL")
    parser.add_argument("--type", default="DONGHUA", choices=["DONGHUA", "DRAMA", "MOVIE", "ANIME"], help="Type of series")
    parser.add_argument("--studio", default="", help="Animation studio name")

    args = parser.parse_args()

    importer = MerDonghuaImporter(api_base=args.api, email=args.email, password=args.password)
    if not importer.login():
        sys.exit(1)

    if args.json:
        importer.import_from_json(args.json)
    elif args.csv:
        importer.import_from_csv(args.csv)
    elif args.anime and args.ep and args.url:
        importer.import_single(
            anime_title=args.anime,
            episode_number=args.ep,
            video_url=args.url,
            alt_title=args.alt_title,
            poster_url=args.poster,
            thumbnail_url=args.thumbnail,
            anime_type=args.type,
            studio=args.studio,
        )
    else:
        # Interactive mode
        interactive_mode(importer)


if __name__ == "__main__":
    main()
