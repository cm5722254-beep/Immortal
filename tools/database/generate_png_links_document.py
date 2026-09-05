#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Movie Poster & Banner PNG/Image Full Documentation & Audit Tool
================================================================================
Generates comprehensive Master Markdown Document, CSV Spreadsheet, and JSON
database of all 50 Movie Poster and Banner image links.
"""

import os
import sys
import json
import csv
import urllib.request
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8 on Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api").rstrip("/")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC_MD_PATH = os.path.join(ROOT_DIR, "FULL_MOVIE_PNG_IMAGES_DOCUMENT.md")
CSV_PATH = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.csv")
JSON_PATH = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.json")


def check_image_url(url: str) -> tuple[bool, str]:
    """Test if image URL is reachable and returns HTTP 200 OK."""
    if not url or not url.strip():
        return False, "EMPTY"
    url = url.strip()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
        with urllib.request.urlopen(req, timeout=8) as resp:
            return True, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Range": "bytes=0-1"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                return True, f"HTTP {resp.status}"
        except Exception:
            return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)[:30]


def fetch_all_anime():
    url = f"{API_BASE}/anime?page=1&per_page=100"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as res:
        data = json.loads(res.read().decode('utf-8'))
        items = data.get("items", []) if isinstance(data, dict) else data
        items.sort(key=lambda x: x["id"])
        return items


def main():
    print(f"📡 កំពុងទាញយកទិន្នន័យ Movie ពី {API_BASE} ...")
    anime_list = fetch_all_anime()
    print(f"🎬 រកឃើញ Movie សរុប: {len(anime_list)} រឿង")

    print("⏳ កំពុងពិនិត្យសុពលភាព Poster PNG និង Banner PNG Links...")

    def audit_item(a):
        p_url = (a.get("poster_url") or "").strip()
        b_url = (a.get("banner_url") or "").strip()
        p_ok, p_msg = check_image_url(p_url)
        b_ok, b_msg = check_image_url(b_url)
        return {
            "anime": a,
            "poster_url": p_url,
            "poster_ok": p_ok,
            "poster_msg": p_msg,
            "banner_url": b_url,
            "banner_ok": b_ok,
            "banner_msg": b_msg
        }

    with ThreadPoolExecutor(max_workers=10) as executor:
        audited = list(executor.map(audit_item, anime_list))

    audited.sort(key=lambda x: x["anime"]["id"])

    valid_posters = sum(1 for x in audited if x["poster_ok"])
    empty_posters = sum(1 for x in audited if not x["poster_url"])
    broken_posters = sum(1 for x in audited if x["poster_url"] and not x["poster_ok"])

    valid_banners = sum(1 for x in audited if x["banner_ok"])
    empty_banners = sum(1 for x in audited if not x["banner_url"])
    broken_banners = sum(1 for x in audited if x["banner_url"] and not x["banner_ok"])

    print(f"\n📊 សង្ខេបលទ្ធផល (Audit Summary):")
    print(f"   • រឿងសរុប (Total Movies): {len(audited)}")
    print(f"   • Poster PNG ត្រឹមត្រូវ (Valid Posters): {valid_posters} / {len(audited)}")
    print(f"   • Poster ខ្វះ/ខូច (Empty/Broken Posters): {empty_posters + broken_posters}")
    print(f"   • Banner PNG ត្រឹមត្រូវ (Valid Banners): {valid_banners} / {len(audited)}")
    print(f"   • Banner ខ្វះដែលត្រូវ Repair (Empty Banners): {empty_banners}")

    # 1. Generate JSON
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": "2026-08-29",
            "total_movies": len(audited),
            "summary": {
                "valid_posters": valid_posters,
                "empty_posters": empty_posters,
                "valid_banners": valid_banners,
                "empty_banners": empty_banners
            },
            "movies": [
                {
                    "id": item["anime"]["id"],
                    "title": item["anime"].get("title", ""),
                    "alt_title": item["anime"].get("alt_title", ""),
                    "slug": item["anime"].get("slug", ""),
                    "year": item["anime"].get("year"),
                    "status": item["anime"].get("status"),
                    "poster_url": item["poster_url"],
                    "poster_status": "OK" if item["poster_ok"] else item["poster_msg"],
                    "banner_url": item["banner_url"],
                    "banner_status": "OK" if item["banner_ok"] else ("EMPTY_NEED_REPAIR" if not item["banner_url"] else item["banner_msg"])
                }
                for item in audited
            ]
        }, f, indent=2, ensure_ascii=False)
    print(f"✅ បានរក្សាទុក JSON: {JSON_PATH}")

    # 2. Generate CSV
    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Movie ID",
            "Movie Title (ចំណងជើងរឿង)",
            "Alt Title (ឈ្មោះផ្សេង)",
            "Year",
            "Poster PNG / Image URL",
            "Poster Status",
            "Banner PNG / Image URL",
            "Banner Status"
        ])
        for item in audited:
            a = item["anime"]
            writer.writerow([
                a["id"],
                a.get("title", ""),
                a.get("alt_title", ""),
                a.get("year", ""),
                item["poster_url"],
                "OK" if item["poster_ok"] else item["poster_msg"],
                item["banner_url"] if item["banner_url"] else "[EMPTY_NEED_REPAIR]",
                "OK" if item["banner_ok"] else ("EMPTY_NEED_REPAIR" if not item["banner_url"] else item["banner_msg"])
            ])
    print(f"✅ បានរក្សាទុក CSV: {CSV_PATH}")

    # 3. Generate Full Markdown Master Document
    with open(DOC_MD_PATH, "w", encoding="utf-8") as f:
        f.write("# 🎬 MER DONGHUA — ឯកសារលម្អិត Poster & Banner PNG/JPG Image Links សម្រាប់រឿងទាំងអស់\n")
        f.write("## FULL MOVIE POSTER & BANNER PNG/IMAGE LINKS AUDIT & REPAIR MASTER DOCUMENT\n\n")
        f.write("> **បរិយាយ (Description):** ឯកសារនេះផ្ដោតលើការត្រួតពិនិត្យ និងជួសជុលរូបភាពតំណាងរឿង (Poster PNG Link) និងផ្ទាំងរូបភាពធំ (Banner PNG Link) សម្រាប់គ្រប់រឿងទាំងអស់ក្នុង Website Mer Donghua / Nami Anime មួយរឿងម្តងៗ។\n\n")

        f.write("### 📊 សង្ខេបស្ថិតិរូបភាព Movie (Image Catalog Overview):\n")
        f.write(f"- **រឿង Anime សរុប (Total Movies):** {len(audited)} រឿង\n")
        f.write(f"- **Poster PNG ត្រឹមត្រូវ 100% (Valid Posters):** `{valid_posters}` រឿង 🟢\n")
        f.write(f"- **Banner PNG មានស្រាប់ (Existing Banners):** `{valid_banners}` រឿង 🟢\n")
        f.write(f"- **Banner PNG ដែលខ្វះ និងត្រូវ Repair (Empty Banners to Repair):** `{empty_banners}` រឿង ⚠️\n\n")

        if empty_banners > 0:
            f.write("### ⚠️ បញ្ជីរឿងដែលខ្វះ Banner PNG (Movies Requiring Banner Repair):\n")
            f.write("| Movie ID | ចំណងជើងរឿង (Movie Title) | ស្ថានភាព Poster | ស្ថានភាព Banner | សកម្មភាពជួសជុល (Suggested Fix) |\n")
            f.write("|:---:|---|:---:|:---:|---|\n")
            for item in audited:
                if not item["banner_url"]:
                    a = item["anime"]
                    f.write(f"| `{a['id']}` | **{a.get('title', '')}** | 🟢 OK | 🔴 **EMPTY** | អាចកំណត់ប្រើ Poster ឬបន្ថែម Banner PNG ថ្មី |\n")
            f.write("\n---\n\n")

        f.write("## 📚 តារាងលម្អិតមួយរឿងម្តងៗ (One-by-One Movie PNG Image Links Table)\n\n")
        f.write("| ល.រ | ID | ចំណងជើងរឿង (Movie Title) | ឆ្នាំ | ស្ថានភាព | Poster PNG Link | Banner PNG Link |\n")
        f.write("|:---:|:---:|---|:---:|:---:|---|---|\n")

        for idx, item in enumerate(audited, 1):
            a = item["anime"]
            p_status_icon = "🟢" if item["poster_ok"] else "❌"
            b_status_icon = "🟢" if item["banner_ok"] else "⚠️"

            p_link = f"[🖼️ មើល Poster Link]({item['poster_url']})" if item["poster_url"] else "`គ្មាន (None)`"
            b_link = f"[🖼️ មើល Banner Link]({item['banner_url']})" if item["banner_url"] else "`❌ ខ្វះ (Empty - Need Repair)`"

            f.write(f"| {idx} | `{a['id']}` | **{a.get('title', '')}** | {a.get('year', 'N/A')} | {p_status_icon} Poster / {b_status_icon} Banner | {p_link} | {b_link} |\n")

        f.write("\n---\n\n")
        f.write("## 📋 បញ្ជីតំណភ្ជាប់ផ្ទាល់ជាក់ស្តែង (Raw Direct URLs List One-by-One)\n\n")

        for idx, item in enumerate(audited, 1):
            a = item["anime"]
            f.write(f"### {idx}. [{a['id']}] {a.get('title', '')}\n")
            f.write(f"- **Movie ID:** `{a['id']}`\n")
            if a.get('alt_title'):
                f.write(f"- **ឈ្មោះផ្សេង (Alt Title):** {a.get('alt_title')}\n")
            f.write(f"- **🖼️ Poster PNG Link:** `{item['poster_url'] or 'EMPTY'}`\n")
            f.write(f"- **🖼️ Banner PNG Link:** `{item['banner_url'] or 'EMPTY (Need Repair)'}`\n")
            f.write(f"- **ស្ថានភាពរូបភាព (Status):** Poster: {'🟢 200 OK' if item['poster_ok'] else '❌ Broken'} | Banner: {'🟢 200 OK' if item['banner_ok'] else '⚠️ EMPTY (Need Repair)'}\n\n")

    print(f"✅ បានបង្កើតឯកសារ Master Markdown: {DOC_MD_PATH}")


if __name__ == "__main__":
    main()
