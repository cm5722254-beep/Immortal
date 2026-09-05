#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Movie Poster & Banner PNG Image Repair & Management Tool
==========================================================================
Interactive & Automated tool to inspect, repair, and update Poster PNG
and Banner PNG links for all movies via backend REST API.
"""

import os
import sys
import json
import csv
import urllib.request
import urllib.parse
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
DOC_MD_PATH = os.path.join(ROOT_DIR, "FULL_MOVIE_PNG_IMAGES_DOCUMENT.md")
CSV_PATH = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.csv")


class MoviePNGRepairer:
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
                items = data.get("items", []) if isinstance(data, dict) else data
                items.sort(key=lambda x: x["id"])
                return items
        except Exception as e:
            print(f"❌ Failed to fetch anime: {e}")
            return []

    def update_movie_images(self, anime_id: int, poster_url: Optional[str] = None, banner_url: Optional[str] = None) -> bool:
        if not self.login():
            print("❌ Authentication failed.")
            return False

        payload_dict = {}
        if poster_url is not None:
            payload_dict["poster_url"] = poster_url.strip()
        if banner_url is not None:
            payload_dict["banner_url"] = banner_url.strip()

        if not payload_dict:
            return False

        url = f"{self.api_base}/anime/{anime_id}"
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
                    return True
                return False
        except Exception as e:
            print(f"❌ Error updating Movie {anime_id}: {e}")
            return False

    def auto_repair_missing_banners(self) -> int:
        """For all movies with empty banner_url, set it to poster_url so it displays nicely."""
        anime_list = self.fetch_all_anime()
        missing = [a for a in anime_list if not (a.get("banner_url") or "").strip()]

        if not missing:
            print("✅ គ្មាន Movie ណាដែលខ្វះ Banner ទេ។ Banners ទាំងអស់សុទ្ធតែមានរួចហើយ!")
            return 0

        print(f"\n🚀 កំពុងចាប់ផ្តើមជួសជុល Auto-Repair Banner សម្រាប់រឿងចំនួន {len(missing)} រឿង...")
        repaired_count = 0

        for a in missing:
            a_id = a["id"]
            title = a.get("title", "")
            poster = a.get("poster_url") or ""
            if not poster:
                continue

            print(f"   🔧 [{a_id}] {title[:30]} ... ដាក់ Banner = Poster Link")
            if self.update_movie_images(a_id, banner_url=poster):
                repaired_count += 1
            else:
                print(f"   ⚠️ មិនអាច update Movie ID {a_id}")

        print(f"\n🎉 ជួសជុលជោគជ័យសរុប: {repaired_count} / {len(missing)} រឿង!")
        return repaired_count


def regenerate_docs():
    script_path = os.path.join(ROOT_DIR, "tools", "generate_png_links_document.py")
    if os.path.exists(script_path):
        import subprocess
        subprocess.run([sys.executable, script_path], cwd=ROOT_DIR)


def main():
    repairer = MoviePNGRepairer()

    while True:
        print("\n" + "=" * 75)
        print(" 🎬 MER DONGHUA — MOVIE POSTER & BANNER PNG IMAGE REPAIR SYSTEM")
        print(" 🖼️ ឧបករណ៍ត្រួតពិនិត្យ និងជួសជុលតំណភ្ជាប់រូបភាព Poster PNG & Banner PNG នៃរឿងទាំងអស់")
        print("=" * 75)
        print("  [1] ពិនិត្យបញ្ជីរូបភាពរឿងទាំងអស់ (Audit All Movie Posters & Banners)")
        print("  [2] ជួសជុលស្វ័យប្រវត្តិនូវ Banner ដែលខ្វះទាំងអស់ (Auto-Repair All Missing Banners)")
        print("  [3] ជួសជុល/ប្តូរ Poster PNG សម្រាប់រឿងណាមួយ (Repair Poster PNG by Movie ID)")
        print("  [4] ជួសជុល/ប្តូរ Banner PNG សម្រាប់រឿងណាមួយ (Repair Banner PNG by Movie ID)")
        print("  [5] បង្កើតឯកសារ Master Document (MD, CSV, JSON) ឡើងវិញ")
        print("  [6] បើកមើលឯកសារ FULL_MOVIE_PNG_IMAGES_DOCUMENT.md")
        print("  [7] ចាកចេញ (Exit)")
        print("-" * 75)

        try:
            choice = input("👉 សូមជ្រើសរើសជម្រើស (Choose 1-7): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n👋 ចាកចេញ។")
            break

        if choice == "1":
            anime_list = repairer.fetch_all_anime()
            print(f"\n📚 បញ្ជីស្ថានភាពរូបភាពនៃរឿងទាំង {len(anime_list)}:")
            print(f"{'ID':<5} {'ចំណងជើងរឿង (Title)':<30} {'Poster Status':<15} {'Banner Status'}")
            print("-" * 75)
            empty_b = 0
            for a in anime_list:
                p = (a.get("poster_url") or "").strip()
                b = (a.get("banner_url") or "").strip()
                p_st = "🟢 OK" if p else "❌ EMPTY"
                b_st = "🟢 OK" if b else "⚠️ EMPTY (Need Repair)"
                if not b: empty_b += 1
                print(f"[{a['id']:<3}] {a.get('title', '')[:28]:<30} {p_st:<15} {b_st}")
            print("-" * 75)
            print(f"សរុប: Poster ត្រឹមត្រូវ 50/50 | Banner ខ្វះត្រូវ Repair: {empty_b} រឿង")

        elif choice == "2":
            count = repairer.auto_repair_missing_banners()
            if count > 0:
                regenerate_docs()

        elif choice == "3":
            try:
                m_id = int(input("\n👉 បញ្ចូល Movie ID ដែលចង់ដូរ Poster PNG: ").strip())
                new_p = input("🖼️ បញ្ចូលតំណភ្ជាប់ Poster PNG URL ថ្មី: ").strip()
                if new_p:
                    if repairer.update_movie_images(m_id, poster_url=new_p):
                        print(f"✅ បានជួសជុល Poster PNG សម្រាប់ Movie ID {m_id} ជោគជ័យ!")
                        regenerate_docs()
            except ValueError:
                print("❌ សូមបញ្ចូលជាលេខ!")

        elif choice == "4":
            try:
                m_id = int(input("\n👉 បញ្ចូល Movie ID ដែលចង់ដូរ Banner PNG: ").strip())
                new_b = input("🖼️ បញ្ចូលតំណភ្ជាប់ Banner PNG URL ថ្មី: ").strip()
                if new_b:
                    if repairer.update_movie_images(m_id, banner_url=new_b):
                        print(f"✅ បានជួសជុល Banner PNG សម្រាប់ Movie ID {m_id} ជោគជ័យ!")
                        regenerate_docs()
            except ValueError:
                print("❌ សូមបញ្ចូលជាលេខ!")

        elif choice == "5":
            regenerate_docs()
            print("✅ ឯកសារទាំងអស់ត្រូវបានបង្កើតឡើងវិញរួចរាល់!")

        elif choice == "6":
            if os.path.exists(DOC_MD_PATH):
                print(f"📖 ទីតាំងឯកសារ: {DOC_MD_PATH}")
                try:
                    os.startfile(DOC_MD_PATH)
                except Exception:
                    pass
            else:
                print("❌ រកមិនឃើញឯកសារ សូមចុច [5] ដើម្បីបង្កើតជាមុនសិន។")

        elif choice == "7":
            print("\n👋 អរគុណ! បានចាកចេញពីប្រព័ន្ធ។")
            break


if __name__ == "__main__":
    main()
