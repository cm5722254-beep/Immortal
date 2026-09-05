import json
import os
import sys
import sqlite3
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed_path = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
db_path = os.path.join(base_dir, "backend", "merdonghua.db")

with open(seed_path, "r", encoding="utf-8") as f:
    data = json.load(f)

existing_slugs = {a["slug"]: a for a in data.get("anime", [])}
existing_ids = {a["id"] for a in data.get("anime", [])}
next_id = max(existing_ids, default=0) + 1

new_item = {
    "id": next_id,
    "title": "អាទិទេពប្រម៉ាញ់បិសាច រដូវកាលទី២",
    "slug": "the-demon-hunter-season-2",
    "alt_title": "沧元图 第二季 (The Demon Hunter Season 2)",
    "description": "Meng Chuan advances his supreme lightning speed blade techniques into the second phase of god-slaying training to safeguard humanity from demonic abyss overlords.",
    "poster_url": "https://i.pinimg.com/1200x/7c/ad/d3/7cadd362d8a600ac0c91b184902bc33b.jpg",
    "banner_url": "https://i.pinimg.com/1200x/7c/ad/d3/7cadd362d8a600ac0c91b184902bc33b.jpg",
    "trailer_url": "",
    "year": 2024,
    "status": "ONGOING",
    "studio": "Sparkly Key Animation / Youku",
    "country": "China",
    "airing_day": "Tuesday",
    "heat_score": 99200,
    "type": "DONGHUA",
    "is_featured": True,
    "is_trending": True,
    "is_published": True,
    "is_free": False,
    "view_count": 640000,
    "average_rating": 5.0,
    "rating_count": 480,
    "episode_count": 26,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

if new_item["slug"] not in existing_slugs:
    data["anime"].append(new_item)
    for gid in [2, 3, 5, 8]:
        data.setdefault("anime_genres", []).append({"anime_id": next_id, "genre_id": gid})
    sample_video = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    for ep_num in range(1, 4):
        data.setdefault("episodes", []).append({
            "anime_id": next_id,
            "episode_number": ep_num,
            "title": f"ភាគ {ep_num}",
            "video_url": sample_video,
            "duration_seconds": 1320,
            "thumbnail_url": new_item["poster_url"],
            "is_published": True,
            "is_vip_only": False,
            "view_count": 110,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    data["counts"]["anime"] = len(data["anime"])
    data["counts"]["episodes"] = len(data.get("episodes", []))

    with open(seed_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Added [{next_id}] {new_item['title']} to seed_export.json")
else:
    old = existing_slugs[new_item["slug"]]
    old["poster_url"] = new_item["poster_url"]
    old["banner_url"] = new_item["banner_url"]
    with open(seed_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Updated [{old['id']}] {old['title']}")

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO anime (
            id, title, slug, alt_title, description, poster_url, banner_url,
            trailer_url, year, status, studio, country, airing_day, heat_score,
            type, is_featured, is_trending, is_published, is_free, view_count,
            average_rating, rating_count, episode_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_item["id"], new_item["title"], new_item["slug"], new_item["alt_title"],
        new_item["description"], new_item["poster_url"], new_item["banner_url"],
        new_item["trailer_url"], new_item["year"], new_item["status"], new_item["studio"],
        new_item["country"], new_item["airing_day"], new_item["heat_score"], new_item["type"],
        new_item["is_featured"], new_item["is_trending"], new_item["is_published"],
        new_item["is_free"], new_item["view_count"], new_item["average_rating"],
        new_item["rating_count"], new_item["episode_count"]
    ))
    conn.commit()
    conn.close()
    print("[OK] Inserted into SQLite DB!")

try:
    sys.path.insert(0, os.path.join(base_dir, "backend"))
    from app.services.r2_backup_service import upload_backup_to_r2_sync
    r2_ok = upload_backup_to_r2_sync(data)
    print(f"[OK] Synced to Cloudflare R2: {r2_ok}")
except Exception as e:
    print(f"[WARN] R2 error: {e}")
