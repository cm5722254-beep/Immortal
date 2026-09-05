#!/usr/bin/env python3
"""
🎬 MER DONGHUA / NAMI ANIME — Movie & Episode Link Repair & Audit System
========================================================================
Interactive & Automated tool to inspect, repair, update, and manage
video stream links for all anime movies and episodes one-by-one.

Features:
1. Live health audit: Scans all movies and shows valid vs empty/broken links.
2. Interactive One-by-One Link Repair: Enter Movie/Episode ID and new link.
3. Quick Repair for detected missing links (e.g. Ep 87 of Anime 14, Ep 5 of Anime 30).
4. Batch link update from CSV.
5. Auto-sync and regeneration of Master Markdown Document & CSV spreadsheet.
"""

import os
import sys
import json
import csv
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, List, Any, Optional

# Force UTF-8 on Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "cm5722254@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC_MD_PATH = os.path.join(ROOT_DIR, "FULL_MOVIE_EPISODE_LINKS_DOCUMENT.md")
CSV_PATH = os.path.join(ROOT_DIR, "ALL_MOVIES_AND_EPISODE_LINKS.csv")
JSON_PATH = os.path.join(ROOT_DIR, "ALL_MOVIES_AND_EPISODE_LINKS.json")


class MovieLinkRepairer:
    def __init__(self, api_base: str = API_BASE):
        self.api_base = api_base
        self.token: Optional[str] = None

    def login(self) -> bool:
        """Authenticate with Admin credentials to get JWT token for updates."""
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
            print(f"❌ Admin login failed ({login_url}): {e}")
            return False

    def fetch_all_anime(self) -> List[Dict[str, Any]]:
        """Fetch all anime movies from backend API."""
        url = f"{self.api_base}/anime?page=1&per_page=100"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as res:
                data = json.loads(res.read().decode('utf-8'))
                items = data.get("items", []) if isinstance(data, dict) else data
                items.sort(key=lambda x: x["id"])
                return items
        except Exception as e:
            print(f"❌ Failed to fetch anime: {e}")
            return []

    def fetch_episodes(self, anime_id: int) -> List[Dict[str, Any]]:
        """Fetch all episodes for a specific anime."""
        url = f"{self.api_base}/anime/{anime_id}/episodes"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                data = json.loads(res.read().decode('utf-8'))
                items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                items.sort(key=lambda x: x.get("episode_number", 0))
                return items
        except Exception as e:
            print(f"❌ Failed to fetch episodes for Anime {anime_id}: {e}")
            return []

    def update_episode_link(self, episode_id: int, new_video_url: str, title: Optional[str] = None) -> bool:
        """Update episode video_url directly on backend database."""
        if not self.login():
            print("❌ Cannot update: Authentication required.")
            return False

        url = f"{self.api_base}/episodes/{episode_id}"
        payload_dict = {"video_url": new_video_url.strip()}
        if title:
            payload_dict["title"] = title.strip()

        payload = json.dumps(payload_dict).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
                "User-Agent": USER_AGENT
            },
            method="PUT"
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                if res.status in (200, 204):
                    print(f"✅ Episode ID {episode_id} បានជួសជុល និង update ជោគជ័យ!")
                    return True
                else:
                    print(f"⚠️ API returned status: {res.status}")
                    return False
        except Exception as e:
            print(f"❌ Failed to update Episode {episode_id}: {e}")
            return False

    def scan_and_audit(self) -> Dict[str, Any]:
        """Scan catalog and identify all links needing repair."""
        print("\n🔍 កំពុងពិនិត្យ និង Scan តំណភ្ជាប់វីដេអូទាំងអស់ក្នុងប្រព័ន្ធ...")
        anime_list = self.fetch_all_anime()
        total_episodes = 0
        valid_links = 0
        missing_links = []
        catalog = []

        for a in anime_list:
            a_id = a["id"]
            title = a.get("title", f"Anime #{a_id}")
            eps = self.fetch_episodes(a_id)
            total_episodes += len(eps)
            ep_records = []

            for ep in eps:
                raw_url = (ep.get("video_url") or "").strip()
                ep_id = ep.get("id")
                ep_num = ep.get("episode_number", 1)
                ep_title = ep.get("title") or f"Episode {ep_num}"

                if not raw_url:
                    missing_links.append({
                        "anime_id": a_id,
                        "anime_title": title,
                        "episode_id": ep_id,
                        "episode_number": ep_num,
                        "episode_title": ep_title
                    })
                else:
                    valid_links += 1

                ep_records.append(ep)

            catalog.append({"anime": a, "episodes": ep_records})

        return {
            "anime_count": len(anime_list),
            "total_episodes": total_episodes,
            "valid_links": valid_links,
            "missing_links": missing_links,
            "catalog": catalog
        }


def regenerate_all_documents():
    """Regenerate the markdown master document, csv, and json."""
    print("\n🔄 កំពុងទាញយកទិន្នន័យថ្មី និងបង្កើតឯកសារ Master Documentation ឡើងវិញ...")
    script_path = os.path.join(ROOT_DIR, "tools", "generate_full_links_document.py")
    if os.path.exists(script_path):
        import subprocess
        subprocess.run([sys.executable, script_path], cwd=ROOT_DIR)
    else:
        print("❌ Could not find generate_full_links_document.py")


def main():
    repairer = MovieLinkRepairer()

    while True:
        print("\n" + "=" * 75)
        print(" 🎬 MER DONGHUA — MOVIE & EPISODE LINK AUDIT & REPAIR SYSTEM")
        print(" 🛠️ ឧបករណ៍ត្រួតពិនិត្យ និងជួសជុលតំណភ្ជាប់វីដេអូរឿង និងភាគទាំងអស់ (One-by-One)")
        print("=" * 75)
        print("  [1] ពិនិត្យបញ្ជីភាគដែលខ្វះ Link ឬត្រូវការ Repair (Audit Missing Links)")
        print("  [2] ជួសជុល Link មួយភាគម្តងៗ តាម Episode ID (Repair Episode Link by ID)")
        print("  [3] មើលភាគ និងតំណភ្ជាប់វីដេអូរបស់រឿងណាមួយ (View All Links for Specific Movie)")
        print("  [4] ជួសជុលភាគ 87 (ID 651) នៃរឿង ព្រេងនិទានរបស់ព្រះ (Quick Repair Ep 87)")
        print("  [5] ជួសជុលភាគ 5 (ID 237) នៃរឿង ដំណើអធិរាធអមតះ (Quick Repair Ep 5)")
        print("  [6] បង្កើត និង Update ឯកសារ Full Document (MD, CSV, JSON) ឡើងវិញ")
        print("  [7] បើកមើលឯកសារ Master Document (Open FULL_MOVIE_EPISODE_LINKS_DOCUMENT.md)")
        print("  [8] ចាកចេញ (Exit)")
        print("-" * 75)

        try:
            choice = input("👉 សូមជ្រើសរើសជម្រើស (Choose 1-8): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n👋 ចាកចេញ។")
            break

        if choice == "1":
            audit = repairer.scan_and_audit()
            print("\n" + "=" * 70)
            print(f"📊 សង្ខេបលទ្ធផលពិនិត្យ (Audit Results):")
            print(f"   • រឿងសរុប (Total Movies): {audit['anime_count']} រឿង")
            print(f"   • ភាគសរុប (Total Episodes): {audit['total_episodes']} ភាគ")
            print(f"   • Link ត្រឹមត្រូវ (Valid Links): {audit['valid_links']} ភាគ ({(audit['valid_links']/audit['total_episodes']*100):.1f}%)")
            print(f"   • Link ខ្វះ/ត្រូវការ Repair: {len(audit['missing_links'])} ភាគ")
            print("=" * 70)

            if audit["missing_links"]:
                print("\n⚠️ បញ្ជីភាគដែលត្រូវជួសជុល (Episodes Requiring Repair):")
                for item in audit["missing_links"]:
                    print(f"   ❌ Movie [{item['anime_id']}] '{item['anime_title']}' -> Ep {item['episode_number']} (Episode ID: {item['episode_id']})")
            else:
                print("🎉 អស្ចារ្យណាស់! គ្រប់ភាគទាំងអស់សុទ្ធតែមាន Link វីដេអូត្រឹមត្រូវ 100%!")

        elif choice == "2":
            try:
                ep_id_str = input("\n👉 បញ្ចូល Episode ID ដែលចង់ជួសជុល (Enter Episode ID to repair): ").strip()
                if not ep_id_str:
                    continue
                ep_id = int(ep_id_str)
                new_link = input("🔗 បញ្ចូល Video Link ថ្មី (Direct MP4 URL or Stream Link): ").strip()
                if not new_link:
                    print("❌ Link មិនអាចទទេបានទេ។")
                    continue

                if repairer.update_episode_link(ep_id, new_link):
                    regenerate_all_documents()
            except ValueError:
                print("❌ សូមបញ្ចូល Episode ID ជាលេខ!")

        elif choice == "3":
            anime_list = repairer.fetch_all_anime()
            print(f"\n📚 បញ្ជីរឿងទាំងអស់ ({len(anime_list)} រឿង):")
            for a in anime_list:
                print(f"   [{a['id']:2d}] {a.get('title', '')}")
            try:
                sel = input("\n👉 បញ្ចូល Movie ID (Enter Movie ID): ").strip()
                if not sel:
                    continue
                sel_id = int(sel)
                target = next((a for a in anime_list if a["id"] == sel_id), None)
                if not target:
                    print("❌ រកមិនឃើញ Movie ID នេះទេ។")
                    continue
                eps = repairer.fetch_episodes(sel_id)
                print(f"\n🎬 រឿង: [{target['id']}] {target.get('title')}")
                print(f"   ចំនួនភាគ: {len(eps)} ភាគ\n")
                for e in eps:
                    ep_num = e.get("episode_number")
                    v_url = e.get("video_url") or "❌ [EMPTY LINK - NEED REPAIR]"
                    print(f"   • Ep {ep_num:03d} (ID: {e.get('id')}): {v_url}")
            except ValueError:
                print("❌ សូមបញ្ចូលជាលេខ!")

        elif choice == "4":
            print("\n🛠️ ជួសជុល Anime [14] 'ព្រេងនិទានរបស់ព្រះ' - ភាគ 87 (Episode ID: 651)")
            link = input("🔗 បញ្ចូល Video Link សម្រាប់ភាគ 87 (Enter Video URL): ").strip()
            if link:
                if repairer.update_episode_link(651, link):
                    regenerate_all_documents()
            else:
                print("❌ មិនបានបញ្ចូល Link ទេ។")

        elif choice == "5":
            print("\n🛠️ ជួសជុល Anime [30] 'ដំណើអធិរាធអមតះ' - ភាគ 5 (Episode ID: 237)")
            link = input("🔗 បញ្ចូល Video Link សម្រាប់ភាគ 5 (Enter Video URL): ").strip()
            if link:
                if repairer.update_episode_link(237, link):
                    regenerate_all_documents()
            else:
                print("❌ មិនបានបញ្ចូល Link ទេ។")

        elif choice == "6":
            regenerate_all_documents()
            print("✅ ឯកសារទាំងអស់ត្រូវបានបង្កើតឡើងវិញរួចរាល់!")

        elif choice == "7":
            if os.path.exists(DOC_MD_PATH):
                print(f"\n📖 ឯកសារស្ថិតនៅ: {DOC_MD_PATH}")
                try:
                    os.startfile(DOC_MD_PATH)
                except Exception:
                    print("សូមបើកឯកសារនេះដោយផ្ទាល់ក្នុង text editor ឬ VS Code / IDE។")
            else:
                print("❌ រកមិនឃើញឯកសារ សូមចុចជម្រើស [6] ជាមុនសិន។")

        elif choice == "8":
            print("\n👋 អរគុណ! បានចាកចេញពីប្រព័ន្ធ។")
            break


if __name__ == "__main__":
    main()
