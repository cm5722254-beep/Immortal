import os
import sys
import json
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode('utf-8'))

def main():
    print(f"📡 Fetching complete catalog from {API_BASE}...")
    anime_url = f"{API_BASE}/anime?page=1&per_page=100"
    anime_data = fetch_json(anime_url)
    anime_list = anime_data.get("items", []) if isinstance(anime_data, dict) else anime_data

    print(f"🎬 Total Anime Found: {len(anime_list)}")

    # Sort anime by ID ascending
    anime_list.sort(key=lambda x: x["id"])

    def fetch_eps(anime):
        a_id = anime["id"]
        try:
            ep_data = fetch_json(f"{API_BASE}/anime/{a_id}/episodes")
            eps = ep_data.get("items", []) if isinstance(ep_data, dict) else (ep_data if isinstance(ep_data, list) else [])
            eps.sort(key=lambda e: e.get("episode_number", 0))
            return a_id, eps, None
        except Exception as e:
            return a_id, [], str(e)

    print("⏳ Fetching all episodes in parallel...")
    anime_episodes = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(fetch_eps, anime_list)
        for a_id, eps, err in results:
            anime_episodes[a_id] = (eps, err)

    # Let's inspect everything and build the documentation
    total_eps_count = 0
    empty_links = []
    broken_links = []
    direct_s3_links = 0
    proxy_links = 0
    other_links = 0

    all_rows = []

    for anime in anime_list:
        a_id = anime["id"]
        title = anime.get("title", "").strip() or f"Anime #{a_id}"
        eps, err = anime_episodes.get(a_id, ([], None))
        total_eps_count += len(eps)

        for ep in eps:
            ep_id = ep.get("id")
            ep_num = ep.get("episode_number", 1)
            ep_title = ep.get("title") or f"Episode {ep_num}"
            raw_url = (ep.get("video_url") or "").strip()

            status = "OK"
            note = ""
            if not raw_url:
                status = "NEED_REPAIR"
                note = "Empty video URL"
                empty_links.append((a_id, title, ep_id, ep_num, ep_title))
            elif "s3.nintanime.com" in raw_url:
                direct_s3_links += 1
                note = "Direct S3 MP4"
            elif "/api/video-stream" in raw_url:
                proxy_links += 1
                note = "Proxy Stream URL"
            else:
                other_links += 1
                note = "External Stream"

            all_rows.append({
                "anime_id": a_id,
                "anime_title": title,
                "episode_id": ep_id,
                "episode_number": ep_num,
                "episode_title": ep_title,
                "video_url": raw_url,
                "status": status,
                "note": note
            })

    print(f"\n📊 Summary:")
    print(f"   - Total Anime: {len(anime_list)}")
    print(f"   - Total Episodes: {total_eps_count}")
    print(f"   - Direct S3 MP4 links: {direct_s3_links}")
    print(f"   - Proxy links: {proxy_links}")
    print(f"   - Other links: {other_links}")
    print(f"   - Missing/Empty links (Need Repair): {len(empty_links)}")

    for item in empty_links:
        print(f"     ⚠️ Anime [{item[0]}] '{item[1]}' -> Ep {item[3]} ({item[4]}) has NO LINK!")

    # Save JSON database
    json_path = "d:/Merdonghua.com-main/ALL_MOVIES_AND_EPISODE_LINKS.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": "2026-08-29",
            "total_anime": len(anime_list),
            "total_episodes": total_eps_count,
            "empty_links_count": len(empty_links),
            "catalog": [
                {
                    "id": a["id"],
                    "title": a.get("title", ""),
                    "slug": a.get("slug", ""),
                    "year": a.get("year"),
                    "status": a.get("status"),
                    "episode_count": len(anime_episodes.get(a["id"], ([], None))[0]),
                    "episodes": [
                        {
                            "id": e.get("id"),
                            "episode_number": e.get("episode_number"),
                            "title": e.get("title"),
                            "video_url": e.get("video_url", ""),
                            "status": "NEED_REPAIR" if not e.get("video_url") else "OK"
                        }
                        for e in anime_episodes.get(a["id"], ([], None))[0]
                    ]
                }
                for a in anime_list
            ]
        }, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved full JSON database: {json_path}")

    # Save CSV
    csv_path = "d:/Merdonghua.com-main/ALL_MOVIES_AND_EPISODE_LINKS.csv"
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        import csv
        writer = csv.writer(f)
        writer.writerow(["Anime ID", "Anime Title", "Episode ID", "Episode Number", "Episode Title", "Video Link URL", "Status", "Note"])
        for r in all_rows:
            writer.writerow([
                r["anime_id"],
                r["anime_title"],
                r["episode_id"],
                r["episode_number"],
                r["episode_title"],
                r["video_url"],
                r["status"],
                r["note"]
            ])
    print(f"✅ Saved full CSV spreadsheet: {csv_path}")

    # Save Detailed Full Document (Markdown)
    doc_path = "d:/Merdonghua.com-main/FULL_MOVIE_EPISODE_LINKS_DOCUMENT.md"
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write("# 🎬 MER DONGHUA — ឯកសារលម្អិតតំណភ្ជាប់វីដេអូរឿង និងភាគទាំងអស់\n")
        f.write("## FULL MOVIE & EPISODE VIDEO LINKS AUDIT & REPAIR MASTER DOCUMENT\n\n")
        f.write("> **បរិយាយ (Description):** ឯកសារនេះរៀបចំឡើងយ៉ាងលម្អិត មួយភាគម្តងៗ (One-by-One) សម្រាប់រឿងទាំងអស់ និងភាគទាំងអស់ដែលមាននៅលើ Website រួមទាំងការបញ្ជាក់ស្ថានភាពតំណភ្ជាប់ (Links) ជួសជុល (Repair) និងទាញយក។\n\n")
        
        f.write("### 📊 សង្ខេបស្ថិតិទិន្នន័យ (Catalog Overview):\n")
        f.write(f"- **រឿង Anime សរុប (Total Movies/Anime):** {len(anime_list)} រឿង\n")
        f.write(f"- **ភាគសរុប (Total Episodes):** {total_eps_count} ភាគ\n")
        f.write(f"- **ភាគដែលមាន Video Link ត្រឹមត្រូវ (Valid Links):** {total_eps_count - len(empty_links)} ភាគ\n")
        f.write(f"- **ភាគដែលខ្វះ Link ឬត្រូវ Repair (Empty/Need Repair):** {len(empty_links)} ភាគ\n\n")

        if empty_links:
            f.write("### ⚠️ បញ្ជីភាគដែលត្រូវជួសជុលជាបន្ទាន់ (Episodes Requiring Link Repair):\n")
            f.write("| Movie ID | ចំណងជើងរឿង (Movie Title) | Episode ID | ភាគទី (Ep #) | ចំណងជើងភាគ (Title) | បញ្ហា (Issue) |\n")
            f.write("|---|---|---|---|---|---|\n")
            for item in empty_links:
                f.write(f"| `{item[0]}` | **{item[1]}** | `{item[2]}` | `ភាគ {item[3]}` | {item[4]} | ❌ គ្មាន Link (Empty Video URL) |\n")
            f.write("\n---\n\n")

        f.write("## 📚 តារាងរឿងទាំងអស់ និងតំណភ្ជាប់វីដេអូភាគមួយៗ (Detailed One-by-One Movie & Episode Links)\n\n")

        for idx, anime in enumerate(anime_list, 1):
            a_id = anime["id"]
            title = anime.get("title", "").strip() or f"Anime #{a_id}"
            eps, _ = anime_episodes.get(a_id, ([], None))
            year = anime.get("year", "N/A")
            status = anime.get("status", "ONGOING")

            f.write(f"### {idx}. [{a_id}] {title}\n")
            f.write(f"- **Movie ID:** `{a_id}` | **ឆ្នាំ (Year):** `{year}` | **ស្ថានភាព:** `{status}` | **ចំនួនភាគ:** `{len(eps)} ភាគ`\n\n")

            if not eps:
                f.write("> ℹ️ *មិនទាន់មានភាគនៅឡើយទេ (No episodes added yet)*\n\n")
                continue

            f.write("| ភាគ (Ep) | Episode ID | ចំណងជើងភាគ (Title) | ស្ថានភាព Link | តំណភ្ជាប់វីដេអូ (Video Stream Link URL) |\n")
            f.write("|:---:|:---:|:---|:---:|:---|\n")

            for ep in eps:
                ep_id = ep.get("id")
                ep_num = ep.get("episode_number", 1)
                ep_title = ep.get("title") or f"Episode {ep_num}"
                raw_url = (ep.get("video_url") or "").strip()

                if not raw_url:
                    link_col = "❌ **NEED REPAIR (EMPTY)**"
                    status_badge = "🔴 Missing"
                else:
                    link_col = f"`{raw_url}`"
                    status_badge = "🟢 OK"

                f.write(f"| Ep {ep_num} | `{ep_id}` | {ep_title} | {status_badge} | {link_col} |\n")

            f.write("\n---\n\n")

    print(f"✅ Generated detailed Master Document: {doc_path}")

if __name__ == "__main__":
    main()
