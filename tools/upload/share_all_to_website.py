#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Share / Upload All Local Videos Directly To Website
====================================================================
Uploads downloaded local videos (from downloaded_videos and Telegram)
to Cloudflare R2, generates permanent 4K/HD streaming links, and automatically
registers or updates the episodes on the Mer Donghua website database!
"""

import os
import sys
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import urllib.request
import urllib.parse
from tqdm import tqdm

# Force UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
R2_CONFIG_PATH = ROOT_DIR / "r2_config.json"
LOCAL_VIDEOS_DIR = ROOT_DIR / "downloaded_videos"
TG_DOWNLOADS_DIR = Path("D:/video telegram/downloads")

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "cm5722254@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

KM_NUMS = {'០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4', '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'}


def khmer_to_digits(text: str) -> str:
    for k, v in KM_NUMS.items():
        text = text.replace(k, v)
    return text


def load_r2_config() -> Optional[Dict[str, Any]]:
    if not R2_CONFIG_PATH.exists():
        print(f"❌ r2_config.json not found at {R2_CONFIG_PATH}")
        return None
    try:
        with open(R2_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading r2_config.json: {e}")
        return None


def get_r2_client(cfg: Dict[str, Any]):
    endpoint = f"https://{cfg['account_id']}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=cfg["access_key"],
        aws_secret_access_key=cfg["secret_key"],
        config=Config(signature_version="s3v4", retries={"max_attempts": 5, "mode": "standard"})
    )


class WebsiteUploader:
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

    def fetch_episodes(self, anime_id: int) -> List[Dict[str, Any]]:
        url = f"{self.api_base}/anime/{anime_id}/episodes"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                data = json.loads(res.read().decode('utf-8'))
                return data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        except Exception:
            return []

    def create_or_update_episode(self, anime_id: int, episode_number: int, video_url: str, title: str = "") -> bool:
        """Create or update episode in MerDonghua database."""
        if not self.login():
            return False

        episodes = self.fetch_episodes(anime_id)
        existing = next((e for e in episodes if e.get("episode_number") == episode_number), None)

        if existing:
            # Update existing episode
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
                "episode_number": episode_number,
                "title": title or f"Episode {episode_number}",
                "video_url": video_url,
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
            print(f"   ⚠️ API Error: {e}")
            return False


def upload_file_to_r2(r2_client, bucket: str, local_path: Path, s3_key: str) -> bool:
    """Uploads file with tqdm progress bar and verification."""
    file_size = local_path.stat().st_size
    # Check if already exists with same size
    try:
        head = r2_client.head_object(Bucket=bucket, Key=s3_key)
        if head.get("ContentLength") == file_size:
            print(f"   ⏩ Already on R2 ({file_size / (1024*1024):.1f} MB) — Skipped upload!")
            return True
    except ClientError:
        pass

    with tqdm(total=file_size, unit="B", unit_scale=True, desc=f"   Uploading {local_path.name[:25]}", leave=False) as pbar:
        try:
            r2_client.upload_file(
                Filename=str(local_path),
                Bucket=bucket,
                Key=s3_key,
                ExtraArgs={"ContentType": "video/mp4"},
                Callback=lambda bytes_transferred: pbar.update(bytes_transferred)
            )
            return True
        except Exception as e:
            print(f"   ❌ Upload failed: {e}")
            return False


def scan_all_local_videos() -> List[Dict[str, Any]]:
    """Scan all local video files across downloaded_videos and TG downloads."""
    results = []
    dirs_to_scan = [LOCAL_VIDEOS_DIR, TG_DOWNLOADS_DIR]

    for root_scan_dir in dirs_to_scan:
        if not root_scan_dir.exists():
            continue

        for dirpath, _, filenames in os.walk(root_scan_dir):
            for fn in filenames:
                if not fn.lower().endswith(('.mp4', '.mkv', '.mov')):
                    continue

                full_path = Path(dirpath) / fn
                folder_name = Path(dirpath).name
                size_mb = full_path.stat().st_size / (1024 * 1024)

                # Skip if file size < 10MB (likely partial or sample)
                if size_mb < 10:
                    continue

                # Parse episode number from filename
                ep_num = 1
                # Check patterns like Ep_001 or ภาค 1 or 1-5
                m = re.search(r'(?:Ep_|Episode_|ភាគ_|ភាគទី|ភាគ\s*|Ep\s*)([0-9]+)', fn, re.IGNORECASE)
                if m:
                    try:
                        ep_num = int(m.group(1))
                    except ValueError:
                        pass
                else:
                    # Trailing number
                    m2 = re.search(r'([0-9]+)\.mp4$', fn)
                    if m2:
                        try:
                            ep_num = int(m2.group(1))
                        except ValueError:
                            pass

                results.append({
                    "full_path": full_path,
                    "folder_name": folder_name,
                    "filename": fn,
                    "episode_number": ep_num,
                    "size_mb": size_mb
                })

    return results


def find_matching_anime(anime_list: List[Dict[str, Any]], folder_name: str) -> Optional[Dict[str, Any]]:
    """Smart matching between local folder name and database anime."""
    folder_clean = re.sub(r'[_\s-]+', ' ', folder_name).lower().strip()
    
    # 1. Exact title or alt_title match
    for a in anime_list:
        title = (a.get("title") or "").lower().strip()
        alt = (a.get("alt_title") or "").lower().strip()
        slug = (a.get("slug") or "").lower().strip()

        if folder_clean in title or title in folder_clean:
            return a
        if alt and (folder_clean in alt or alt in folder_clean):
            return a
        if slug and (slug in folder_clean.replace(" ", "-")):
            return a

    # 2. Known aliases mapping
    aliases = {
        "apotheosis": ["ដំណើទៅកាន់ឋាណះអាទិទេព", "apotheosis"],
        "slay the gods": ["ប្រហាអាទិទេព", "slay the gods"],
        "against the gods": ["ប្រឆាំងនិងវាសនា", "against the gods"],
        "immortality": ["យុទ្ទសិល្ប៍អមតះ", "immortality"],
        "martial gods asura": ["អាទិទេពអាស៊ូរ៉ា", "martial god asura"],
        "jade dynasty": ["ដាវទេព ជូសៀន", "jade dynasty"],
        "ling cage": ["គុកវិញ្ញាណ", "ling cage"],
        "my heroic husband": ["លោកប្ដីអឆរិយះ", "my heroic husband"],
        "the degenerate": ["សម្ព័នមនុស្សអាក្រក់", "degenerate"],
        "the gate of mystical": ["ច្រកទ្វាអាថកំបាំង", "mystical realm"],
        "walking the way": ["ផ្លូវមាគាកំសត់", "walking the way"],
        "way of choices": ["ប្រយុទ្ទទៅកាន់មេឃា", "fighter of the destiny"],
        "ផ្នូរអាទិទេព": ["ផ្នូររបស់ព្រះដែលដួលរលំ", "tomb of fallen gods"],
    }

    for key, targets in aliases.items():
        if key in folder_clean:
            for t in targets:
                for a in anime_list:
                    if t.lower() in (a.get("title") or "").lower() or t.lower() in (a.get("alt_title") or "").lower():
                        return a

    return None


def main():
    print("=" * 75)
    print(" 🎬 MER DONGHUA — SHARE / UPLOAD ALL LOCAL VIDEOS DIRECTLY TO WEBSITE")
    print(" 🚀 បញ្ចូលវីដេអូដែលមានទាំងអស់ក្នុងកុំព្យូទ័រចូល Website MerDonghua ដោយស្វ័យប្រវត្តិ")
    print("=" * 75)

    r2_cfg = load_r2_config()
    if not r2_cfg:
        return

    r2_client = get_r2_client(r2_cfg)
    uploader = WebsiteUploader()
    anime_list = uploader.fetch_all_anime()

    print(f"📡 បានភ្ជាប់ជាមួយ Website API: {API_BASE} ({len(anime_list)} Anime ក្នុងប្រព័ន្ធ)")
    print(f"☁️ Cloudflare R2 Bucket: {r2_cfg['bucket_name']} ({r2_cfg['public_domain']})")

    print("\n🔍 កំពុងស្វែងរកឯកសារវីដេអូទាំងអស់ក្នុងកុំព្យូទ័រ...")
    all_videos = scan_all_local_videos()
    print(f"🎬 រកឃើញវីដេអូសរុប: {len(all_videos)} ឯកសារ\n")

    # Group by folder
    folders = {}
    for v in all_videos:
        fn = v["folder_name"]
        folders.setdefault(fn, []).append(v)

    print("📋 បញ្ជីរឿងដែលមានវីដេអូក្នុងកុំព្យូទ័រ:")
    print("-" * 70)
    folder_items = list(folders.items())
    for idx, (fn, v_list) in enumerate(folder_items, 1):
        matched = find_matching_anime(anime_list, fn)
        match_info = f"-> ភ្ជាប់ជាមួយ [{matched['id']}] {matched['title']}" if matched else "-> ⚠️ មិនទាន់មានក្នុង Website"
        print(f"  [{idx:2d}] {fn:<35} : {len(v_list):2d} ភាគ  {match_info}")
    print("-" * 70)

    print("\nជម្រើសបញ្ជូន (Upload Options):")
    print("  [1] Upload និង Share រឿងទាំងអស់តែម្តង (Upload ALL 200+ Videos to Website)")
    print("  [2] ជ្រើសរើសរឿងមួយណាដែលចង់ Upload & Share (Select a Specific Movie)")
    print("  [3] ចាកចេញ (Exit)")
    
    choice = input("\n👉 សូមជ្រើសរើស (1, 2, or 3): ").strip()

    targets_to_process = []
    if choice == "1":
        for fn, v_list in folders.items():
            targets_to_process.extend(v_list)
    elif choice == "2":
        try:
            sel = int(input(f"👉 បញ្ចូលលេខរៀងរឿង (1-{len(folder_items)}): ").strip())
            if 1 <= sel <= len(folder_items):
                sel_folder, sel_vids = folder_items[sel - 1]
                targets_to_process = sel_vids
            else:
                print("❌ លេខមិនត្រឹមត្រូវទេ។")
                return
        except ValueError:
            print("❌ សូមបញ្ចូលជាលេខ!")
            return
    else:
        print("👋 ចាកចេញ។")
        return

    print(f"\n🚀 កំពុងចាប់ផ្តើម Upload និង Share វីដេអូចំនួន {len(targets_to_process)} ភាគ...")

    success_count = 0
    for idx, v in enumerate(targets_to_process, 1):
        full_path = v["full_path"]
        folder_name = v["folder_name"]
        filename = v["filename"]
        ep_num = v["episode_number"]
        size_mb = v["size_mb"]

        matched = find_matching_anime(anime_list, folder_name)
        anime_title = matched["title"] if matched else folder_name
        anime_id = matched["id"] if matched else None

        print(f"\n[{idx}/{len(targets_to_process)}] 🎬 {anime_title} — ភាគ {ep_num} ({size_mb:.1f} MB)")

        # Generate clean S3 key
        clean_folder = re.sub(r'[\\/*?:"<>|]', '_', folder_name).strip()
        clean_fn = re.sub(r'[\\/*?:"<>|]', '_', filename).strip()
        s3_key = f"episodes/{clean_folder}/{clean_fn}"
        public_url = f"{r2_cfg['public_domain'].rstrip('/')}/{s3_key}"

        # 1. Upload to Cloudflare R2
        ok = upload_file_to_r2(r2_client, r2_cfg["bucket_name"], full_path, s3_key)
        if not ok:
            print("   ❌ Upload បរាជ័យ រំលងភាគនេះ!")
            continue

        print(f"   🔗 Direct Link: {public_url}")

        # 2. Register into Website Database
        if anime_id:
            print(f"   💾 កំពុង Share និង Update ចូល Website (Anime ID: {anime_id})...")
            if uploader.create_or_update_episode(anime_id, ep_num, public_url, title=f"Episode {ep_num}"):
                print(f"   ✅ បាន Share ចូល Website ជោគជ័យ!")
                success_count += 1
            else:
                print(f"   ⚠️ មិនអាច Save ចូល Website បានទេ សូមពិនិត្យមើល API")
        else:
            print(f"   ⚠️ រឿង '{folder_name}' មិនទាន់មានក្នុង Database Website ទេ (អាចបង្កើតរឿងថ្មី ឬ Upload តែ Link)។")

    print("\n" + "=" * 70)
    print(f"🎉🎉🎉 បញ្ចប់រួចរាល់! បាន Share ជោគជ័យសរុប: {success_count} / {len(targets_to_process)} ភាគ!")
    print("=" * 70)


if __name__ == "__main__":
    main()
