import os
import sys
import json
import sqlite3
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

NEW_ANIMES = [
    {
        "id": 50,
        "title": "គ្រូពេទ្យទេវតា",
        "slug": "urban-miracle-doctor",
        "alt_title": "都市绝品仙医 (Urban Miracle Doctor)",
        "description": "Ye Fei, a peerless cultivator with extraordinary medical and martial arts prowess, returns to the mortal urban city. Using his supreme medical acupuncture and immortal techniques, he heals incurable illnesses, protects his loved ones, and crushes arrogant enemies.",
        "poster_url": "https://i.pinimg.com/736x/89/3e/2d/893e2dc9ea0ea1d8a4369e1f57962c82.jpg",
        "banner_url": "https://i.pinimg.com/736x/89/3e/2d/893e2dc9ea0ea1d8a4369e1f57962c82.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Tencent Video / Bilibili",
        "country": "China",
        "airing_day": "Sunday",
        "heat_score": 92000,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 185000,
        "average_rating": 4.9,
        "rating_count": 120,
        "episode_count": 12,
        "genres": [1, 3, 5, 8], # Xianxia, Cultivation, Action, Fantasy
    },
    {
        "id": 51,
        "title": "រាជបុត្រនាគរាជ",
        "slug": "dragon-prince-yuan",
        "alt_title": "元尊 (Dragon Prince Yuan / Yuan Zun)",
        "description": "Zhou Yuan, prince of the Great Zhou Empire, was born with the Sacred Dragon Fate, but had his sacred blessing stolen by the Great Wu Empire at birth, leaving his eight meridian channels blocked. Armed with his Ancestral Dragon scripture and sheer perseverance, Zhou Yuan rises to reclaim his destiny.",
        "poster_url": "https://i.pinimg.com/736x/b2/87/47/b287474ba7cebe5c27da1d5964f4340d.jpg",
        "banner_url": "https://i.pinimg.com/736x/b2/87/47/b287474ba7cebe5c27da1d5964f4340d.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Motion Magic / Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Thursday",
        "heat_score": 97500,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 420000,
        "average_rating": 5.0,
        "rating_count": 310,
        "episode_count": 16,
        "genres": [2, 3, 5, 6], # Xuanhuan, Cultivation, Action, Adventure
    },
    {
        "id": 52,
        "title": "មហាទេវរាជ",
        "slug": "supreme-god-emperor",
        "alt_title": "无上神帝 (Supreme God Emperor / Wu Shang Shen Di)",
        "description": "Ten thousand years ago, the Supreme Immortal Emperor Mu Yun was betrayed and fell. Reincarnating into the body of an illegitimate weak youth in the Southern Cloud Empire, Mu Yun awakens his ancient supreme alchemy and martial memories to storm back into the heavens.",
        "poster_url": "https://i.pinimg.com/736x/5a/09/b6/5a09b6c0850dfd92f582fa6618eebfd4.jpg",
        "banner_url": "https://i.pinimg.com/736x/5a/09/b6/5a09b6c0850dfd92f582fa6618eebfd4.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Ruo Hong Culture / Tencent",
        "country": "China",
        "airing_day": "Monday",
        "heat_score": 95800,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 890000,
        "average_rating": 4.8,
        "rating_count": 450,
        "episode_count": 26,
        "genres": [1, 2, 3, 5],
    },
    {
        "id": 53,
        "title": "អ្នកប្រម៉ាញ់បិសាច",
        "slug": "the-demon-hunter",
        "alt_title": "沧元图 (The Demon Hunter / Cang Yuan Tu)",
        "description": "Demons invade the world, leaving humanity clinging to sanctuaries defended by Divine Slayers. Meng Chuan, a young painting prodigy whose mother was killed by demons, enters Early Mountain God Academy and masters the peerless Thunder-Lightning Blade technique to exterminate demons.",
        "poster_url": "https://i.pinimg.com/736x/11/9d/b1/119db1d6a6dc1a7ea6207a908a8a47ca.jpg",
        "banner_url": "https://i.pinimg.com/736x/11/9d/b1/119db1d6a6dc1a7ea6207a908a8a47ca.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Sparkly Key Animation / Youku",
        "country": "China",
        "airing_day": "Tuesday",
        "heat_score": 98900,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 950000,
        "average_rating": 5.0,
        "rating_count": 620,
        "episode_count": 26,
        "genres": [2, 3, 5, 8],
    },
    {
        "id": 54,
        "title": "ទេពធីតាអមតៈ",
        "slug": "immortal-goddesses",
        "alt_title": "仙界神女 (Immortal Goddesses of Cultivation)",
        "description": "In the divine sacred realm of the high heavens, celestial goddesses and fairy empresses master the ancient secret arts of lotus spiritual dao. When celestial tribulations threaten the balance of the multiverse, the immortal maidens descend to protect the mortal realm.",
        "poster_url": "https://i.pinimg.com/736x/2b/d7/b9/2bd7b915080d373af206ee9a7fc5592f.jpg",
        "banner_url": "https://i.pinimg.com/736x/2b/d7/b9/2bd7b915080d373af206ee9a7fc5592f.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Foch Film / Bilibili",
        "country": "China",
        "airing_day": "Friday",
        "heat_score": 94500,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 310000,
        "average_rating": 4.9,
        "rating_count": 240,
        "episode_count": 12,
        "genres": [1, 7, 8, 10], # Xianxia, Romance, Fantasy, Supernatural
    },
]

def add_new_animes():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    seed_path = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
    db_path = os.path.join(base_dir, "backend", "merdonghua.db")

    print("[*] Reading seed_export.json...")
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_slugs = {a["slug"]: a for a in data.get("anime", [])}
    existing_ids = {a["id"] for a in data.get("anime", [])}
    next_id = max(existing_ids, default=0) + 1

    added_anime = []
    added_episodes = []
    added_anime_genres = []

    # Get sample stream link for initial episode playability
    sample_video = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

    for na in NEW_ANIMES:
        slug = na["slug"]
        if slug in existing_slugs:
            print(f"  ℹ️ {na['title']} ({slug}) already exists. Skipping.")
            continue

        aid = next_id
        next_id += 1

        anime_entry = {
            "id": aid,
            "title": na["title"],
            "slug": na["slug"],
            "alt_title": na["alt_title"],
            "description": na["description"],
            "poster_url": na["poster_url"],
            "banner_url": na["banner_url"],
            "trailer_url": na["trailer_url"],
            "year": na["year"],
            "status": na["status"],
            "studio": na["studio"],
            "country": na["country"],
            "airing_day": na["airing_day"],
            "heat_score": na["heat_score"],
            "type": na["type"],
            "is_featured": na["is_featured"],
            "is_trending": na["is_trending"],
            "is_published": na["is_published"],
            "is_free": na["is_free"],
            "view_count": na["view_count"],
            "average_rating": na["average_rating"],
            "rating_count": na["rating_count"],
            "episode_count": na["episode_count"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        data["anime"].append(anime_entry)
        added_anime.append(anime_entry)

        # Add genres
        for gid in na.get("genres", [1, 2, 3]):
            ag_entry = {"anime_id": aid, "genre_id": gid}
            data.setdefault("anime_genres", []).append(ag_entry)
            added_anime_genres.append(ag_entry)

        # Create starter episodes (3 episodes per title)
        for ep_num in range(1, min(na["episode_count"] + 1, 4)):
            ep_entry = {
                "anime_id": aid,
                "episode_number": ep_num,
                "title": f"ភាគ {ep_num}",
                "video_url": sample_video,
                "duration_seconds": 1320,
                "thumbnail_url": na["poster_url"],
                "is_published": True,
                "is_vip_only": False,
                "view_count": 150,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            data.setdefault("episodes", []).append(ep_entry)
            added_episodes.append(ep_entry)

        print(f"  ✅ Added new Donghua: [{aid}] {na['title']} | {na['alt_title']}")

    if added_anime:
        data["counts"]["anime"] = len(data["anime"])
        data["counts"]["episodes"] = len(data.get("episodes", []))
        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved {len(added_anime)} new anime to seed_export.json (Total: {data['counts']['anime']})")

    # Update local SQLite database
    if os.path.exists(db_path) and added_anime:
        print(f"[*] Updating SQLite database at {db_path}...")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        for a in added_anime:
            cur.execute("""
                INSERT OR IGNORE INTO anime (
                    id, title, slug, alt_title, description, poster_url, banner_url,
                    trailer_url, year, status, studio, country, airing_day, heat_score,
                    type, is_featured, is_trending, is_published, is_free, view_count,
                    average_rating, rating_count, episode_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                a["id"], a["title"], a["slug"], a["alt_title"], a["description"],
                a["poster_url"], a["banner_url"], a["trailer_url"], a["year"],
                a["status"], a["studio"], a["country"], a["airing_day"], a["heat_score"],
                a["type"], a["is_featured"], a["is_trending"], a["is_published"],
                a["is_free"], a["view_count"], a["average_rating"], a["rating_count"],
                a["episode_count"]
            ))

        for ag in added_anime_genres:
            cur.execute("INSERT OR IGNORE INTO anime_genres (anime_id, genre_id) VALUES (?, ?)", (ag["anime_id"], ag["genre_id"]))

        for ep in added_episodes:
            cur.execute("""
                INSERT OR IGNORE INTO episodes (
                    anime_id, episode_number, title, video_url, duration_seconds,
                    thumbnail_url, is_published, is_free, view_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                ep["anime_id"], ep["episode_number"], ep["title"], ep["video_url"],
                ep["duration_seconds"], ep["thumbnail_url"], ep["is_published"],
                True, ep["view_count"]
            ))

        conn.commit()
        conn.close()
        print("[OK] Inserted into SQLite database successfully!")

    # Sync to Cloudflare R2 Cloud
    try:
        sys.path.insert(0, os.path.join(base_dir, "backend"))
        from app.services.r2_backup_service import upload_backup_to_r2_sync
        with open(seed_path, "r", encoding="utf-8") as f:
            full_data = json.load(f)
        r2_ok = upload_backup_to_r2_sync(full_data)
        print(f"[OK] Synced new Donghua catalog to Cloudflare R2: {r2_ok}")
    except Exception as e:
        print(f"[WARN] R2 sync error: {e}")

if __name__ == "__main__":
    add_new_animes()
