#!/usr/bin/env python3
"""
🎬 MER DONGHUA / NAMI ANIME — All Website Video Downloader & Backup Engine
==========================================================================
Automatically discovers, organizes, and downloads all anime video streams
directly from the Mer Donghua / Nami Anime platform.

Features:
- Live API integration with pagination to discover all anime & episodes.
- Resumable downloading (HTTP Range requests) — won't re-download finished files!
- Live progress indicator with speed (MB/s), file size, ETA, and progress bar.
- Automatic filename sanitization for Windows filesystem compatibility.
- Multi-anime selection or full batch automated backup.
- Safe retries and robust streaming socket error handling.
"""

import os
import sys
import re
import time
import math
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error
from typing import List, Dict, Any, Optional

# Force UTF-8 on Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configurations
DEFAULT_API_URL = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api")
DEFAULT_DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "downloaded_videos")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def sanitize_filename(name: str) -> str:
    """Removes or replaces invalid Windows filename characters."""
    if not name:
        return "unnamed"
    # Replace characters not allowed in Windows files
    clean = re.sub(r'[\\/*?:"<>|]', '_', name)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:120] if len(clean) > 120 else clean


def format_bytes(size: float) -> str:
    if size <= 0:
        return "0 MB"
    if size >= 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"
    return f"{size / (1024 * 1024):.1f} MB"


def format_seconds(seconds: float) -> str:
    if not math.isfinite(seconds) or seconds <= 0:
        return "--:--"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


class MerDonghuaDownloader:
    def __init__(self, api_url: str = DEFAULT_API_URL, download_dir: str = DEFAULT_DOWNLOAD_DIR):
        self.api_url = api_url.rstrip("/")
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)

    def fetch_all_anime(self) -> List[Dict[str, Any]]:
        """Fetch all anime series from the REST API."""
        print(f"\n🔍 កំពុងទាញយកបញ្ជី Anime ពី API: {self.api_url}/anime ...")
        all_anime = []
        page = 1
        per_page = 100

        while True:
            url = f"{self.api_url}/anime?page={page}&per_page={per_page}"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=20) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                    if not items:
                        break
                    all_anime.extend(items)
                    total = data.get("total", len(all_anime)) if isinstance(data, dict) else len(all_anime)
                    print(f"   -> ទាញយកបានទិន្នន័យ {len(all_anime)}/{total} Anime...")
                    if len(all_anime) >= total or len(items) < per_page:
                        break
                    page += 1
            except Exception as e:
                print(f"❌ Error fetching anime page {page}: {e}")
                break

        print(f"✅ រកឃើញ Anime សរុប: {len(all_anime)} រឿង!\n")
        return all_anime

    def fetch_episodes_for_anime(self, anime_id: int) -> List[Dict[str, Any]]:
        """Fetch all episodes for a specific anime."""
        url = f"{self.api_url}/anime/{anime_id}/episodes"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "items" in data:
                    return data["items"]
                return []
        except Exception as e:
            print(f"⚠️  មិនអាចទាញយកភាគរបស់ Anime ID {anime_id}: {e}")
            return []

    def resolve_video_url(self, video_url: str) -> str:
        """Resolve potential redirect or proxy links into final direct stream URL."""
        video_url = video_url.strip()
        if not video_url:
            return ""

        # Prepend base url if relative link
        if video_url.startswith("/"):
            base_domain = urllib.parse.urlsplit(self.api_url).netloc
            scheme = urllib.parse.urlsplit(self.api_url).scheme
            video_url = f"{scheme}://{base_domain}{video_url}"

        # If it's a proxy link or requires redirect checking
        if "/api/video-stream" in video_url or "/stream/" in video_url:
            try:
                headers = {"User-Agent": USER_AGENT, "Referer": "https://nintanime.com/"}
                req = urllib.request.Request(video_url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return resp.geturl()
            except Exception:
                pass

        return video_url

    def download_file(self, video_url: str, output_path: str, ep_label: str) -> bool:
        """Download video with live progress bar and HTTP Range resume support."""
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Accept-Encoding": "identity",
        }

        # Set appropriate Referer based on domain
        if "nintanime.com" in video_url or "s3." in video_url:
            headers["Referer"] = "https://nintanime.com/"
        elif "mediadelivery.net" in video_url or "b-cdn.net" in video_url:
            headers["Referer"] = "https://iframe.mediadelivery.net/"

        # Check existing file for resume
        existing_size = 0
        if os.path.exists(output_path):
            existing_size = os.path.getsize(output_path)

        # First query remote file size using HEAD or Range 0-0
        total_size = 0
        try:
            head_req = urllib.request.Request(video_url, headers=headers, method="HEAD")
            with urllib.request.urlopen(head_req, timeout=15) as head_resp:
                cl = head_resp.headers.get("Content-Length")
                if cl:
                    total_size = int(cl)
        except Exception:
            pass

        # If file already downloaded completely
        if total_size > 0 and existing_size >= total_size:
            print(f"   ⏩ {ep_label}: ឯកសារមានរួចហើយ ({format_bytes(existing_size)}) — រំលង (Skipped)!")
            return True

        mode = "wb"
        downloaded = 0

        # Enable Resume if file partially exists
        if existing_size > 0:
            headers["Range"] = f"bytes={existing_size}-"
            mode = "ab"
            downloaded = existing_size
            print(f"   🔄 {ep_label}: បន្តទាញយកពី {format_bytes(existing_size)} ...")

        req = urllib.request.Request(video_url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                status = getattr(response, "status", 200)

                # Check Content-Range or Content-Length
                content_range = response.headers.get("Content-Range", "")
                if content_range and "/" in content_range:
                    try:
                        total_size = int(content_range.split("/")[-1])
                    except Exception:
                        pass

                if not total_size:
                    cl = response.headers.get("Content-Length")
                    if cl:
                        total_size = downloaded + int(cl)

                # If server doesn't support 206 Partial Content and gave 200, restart from 0
                if existing_size > 0 and status == 200:
                    mode = "wb"
                    downloaded = 0

                chunk_size = 1024 * 512  # 512 KB chunks
                start_time = time.time()
                last_update = 0

                with open(output_path, mode) as f:
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)

                        now = time.time()
                        if now - last_update >= 0.25 or (total_size > 0 and downloaded >= total_size):
                            last_update = now
                            elapsed = now - start_time
                            speed = (downloaded - existing_size) / elapsed if elapsed > 0 else 0
                            eta = (total_size - downloaded) / speed if (total_size > downloaded and speed > 0) else 0

                            if total_size > 0:
                                percent = (downloaded / total_size) * 100
                                bar_len = 25
                                filled = int(bar_len * downloaded // total_size)
                                bar = "█" * filled + "░" * (bar_len - filled)
                                sys.stdout.write(
                                    f"\r   [{bar}] {percent:5.1f}% | {format_bytes(downloaded)}/{format_bytes(total_size)} | {speed / (1024*1024):.2f} MB/s | ETA: {format_seconds(eta)}  "
                                )
                            else:
                                sys.stdout.write(
                                    f"\r   [Streaming...] {format_bytes(downloaded)} | {speed / (1024*1024):.2f} MB/s  "
                                )
                            sys.stdout.flush()

            sys.stdout.write("\n")
            print(f"   ✅ {ep_label} ទាញយកជោគជ័យ! ({format_bytes(downloaded)})")
            return True

        except Exception as e:
            sys.stdout.write("\n")
            print(f"   ❌ {ep_label} បរាជ័យ: {e}")
            return False

    def download_anime(self, anime: Dict[str, Any], max_retries: int = 2):
        """Download all episodes of an anime."""
        anime_id = anime["id"]
        title = anime.get("title", f"Anime_{anime_id}")
        clean_title = sanitize_filename(title)
        anime_dir = os.path.join(self.download_dir, clean_title)
        os.makedirs(anime_dir, exist_ok=True)

        print(f"\n{'='*70}")
        print(f"📺 ចាប់ផ្តើម Anime: [{anime_id}] {title}")
        print(f"📂 ទីតាំងរក្សាទុក: {anime_dir}")
        print(f"{'='*70}")

        episodes = self.fetch_episodes_for_anime(anime_id)
        if not episodes:
            print(f"⚠️  គ្មាន Episode នៅក្នុង Anime នេះទេ។")
            return

        valid_episodes = [ep for ep in episodes if ep.get("video_url")]
        print(f"🎬 រកឃើញ {len(valid_episodes)} / {len(episodes)} ភាគដែលមាន Video Stream Link")

        success_count = 0
        for i, ep in enumerate(valid_episodes, 1):
            ep_num = ep.get("episode_number", i)
            ep_title = ep.get("title") or f"Episode {ep_num}"
            clean_ep_title = sanitize_filename(ep_title)
            filename = f"Ep_{ep_num:03d}_{clean_ep_title}.mp4"
            output_file = os.path.join(anime_dir, filename)

            raw_url = ep.get("video_url", "")
            resolved_url = self.resolve_video_url(raw_url)

            ep_label = f"[{i}/{len(valid_episodes)}] Ep {ep_num}"
            print(f"\n▶️  {ep_label}: {ep_title}")
            print(f"   🔗 Stream URL: {resolved_url[:85]}..." if len(resolved_url) > 85 else f"   🔗 Stream URL: {resolved_url}")

            ok = False
            for attempt in range(1, max_retries + 1):
                if attempt > 1:
                    print(f"   🔄 កំពុងព្យាយាមម្តងទៀត (Attempt {attempt}/{max_retries})...")
                    time.sleep(2)
                if self.download_file(resolved_url, output_file, ep_label):
                    ok = True
                    success_count += 1
                    break

            if not ok:
                print(f"   ⚠️  រំលងភាគនេះ ដោយសារមិនអាចទាញយកបាន។")

        print(f"\n🎉 បញ្ចប់ Anime '{title}': ជោគជ័យ {success_count}/{len(valid_episodes)} ភាគ!")


def main():
    parser = argparse.ArgumentParser(description="Mer Donghua & Nami Anime All Video Downloader")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Base API URL")
    parser.add_argument("-o", "--output", default=DEFAULT_DOWNLOAD_DIR, help="Output directory")
    parser.add_argument("--all", action="store_true", help="Download all anime automatically without prompting")
    parser.add_argument("--anime-id", type=int, help="Download only a specific anime by ID")
    args = parser.parse_args()

    print("=" * 75)
    print(" 🎬 MER DONGHUA / NAMI ANIME — ALL VIDEO RECOVERY & AUTO DOWNLOADER")
    print(" 🚀 ឧបករណ៍ទាញយកវីដេអូ Website Anime ស្វ័យប្រវត្តិ")
    print("=" * 75)
    print(f"🌐 Backend API   : {args.api_url}")
    print(f"📂 Output Folder : {args.output}")
    print("=" * 75)

    downloader = MerDonghuaDownloader(api_url=args.api_url, download_dir=args.output)
    all_anime = downloader.fetch_all_anime()

    if not all_anime:
        print("❌ មិនអាចស្វែងរក Anime បានទេ។ សូមពិនិត្យមើលការភ្ជាប់អ៊ីនធឺណិត ឬ API URL!")
        return

    # If specific anime ID provided
    if args.anime_id:
        target = next((a for a in all_anime if a["id"] == args.anime_id), None)
        if target:
            downloader.download_anime(target)
        else:
            print(f"❌ រកមិនឃើញ Anime ID {args.anime_id} ទេ។")
        return

    # If --all flag specified
    if args.all:
        print(f"🚀 កំពុងចាប់ផ្តើមទាញយក Anime ទាំង {len(all_anime)} រឿងក្នុង Website...")
        for anime in all_anime:
            downloader.download_anime(anime)
        print("\n🏆🏆🏆 ទាញយកចប់សព្វគ្រប់ទាំងអស់ 100%! 🏆🏆🏆")
        return

    # Interactive Menu
    print("📋 ជម្រើសទាញយក (DOWNLOAD OPTIONS):")
    print("  [1] ទាញយក Anime ទាំងអស់ក្នុង Website (Download ALL Anime - Full Backup)")
    print("  [2] ជ្រើសរើស Anime មួយណាដែលចង់ទាញយក (Select a Specific Anime)")
    print("  [3] ចាកចេញ (Exit)")
    print("-" * 75)

    try:
        choice = input("👉 សូមជ្រើសរើសលេខ (Enter choice 1, 2, or 3): ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n👋 បានចាកចេញ។")
        return

    if choice == "1":
        print(f"\n🚀 ចាប់ផ្តើមទាញយក Anime ទាំងអស់ ({len(all_anime)} រឿង)...")
        for anime in all_anime:
            downloader.download_anime(anime)
        print("\n🏆🏆🏆 ទាញយកចប់សព្វគ្រប់ទាំងអស់ 100%! 🏆🏆🏆")

    elif choice == "2":
        print("\n📚 បញ្ជី ANIME ទាំងអស់ក្នុង WEBSITE:")
        print(f"{'No.':<5} {'ID':<6} {'ចំណងជើង (Title)'}")
        print("-" * 65)
        for idx, a in enumerate(all_anime, 1):
            print(f"{idx:<5} [{a['id']:<4}] {a.get('title', 'Unknown')}")

        print("-" * 65)
        try:
            sel = input(f"👉 បញ្ចូលលេខរៀង No. (1-{len(all_anime)}) ឬ Anime ID: ").strip()
            if not sel:
                return

            sel_num = int(sel)
            selected_anime = None
            if 1 <= sel_num <= len(all_anime):
                selected_anime = all_anime[sel_num - 1]
            else:
                selected_anime = next((a for a in all_anime if a["id"] == sel_num), None)

            if selected_anime:
                downloader.download_anime(selected_anime)
            else:
                print("❌ លេខដែលបានបញ្ចូលមិនត្រឹមត្រូវទេ។")
        except ValueError:
            print("❌ សូមបញ្ចូលជាលេខ!")
    else:
        print("👋 បានចាកចេញ។")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 បានផ្អាកដំណើរការដោយអ្នកប្រើប្រាស់ (Cancelled by user).")
