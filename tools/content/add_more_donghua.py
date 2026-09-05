import os
import sys
import json
import sqlite3
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

NEW_8_ANIMES = [
    {
        "title": "អាទិទេពប្រឆាំងស្ថានសួគ៌",
        "slug": "against-the-gods",
        "alt_title": "逆天邪神 (Against the Gods)",
        "description": "Yun Che, carrying the Sky Poison Pearl and the Evil God's profound veins, defies the heavens, reincarnating and battling gods and devils across the profound realms.",
        "poster_url": "https://i.pinimg.com/736x/5f/af/f4/5faff454bf2914ef6cbc0ca612e425c3.jpg",
        "banner_url": "https://i.pinimg.com/736x/5f/af/f4/5faff454bf2914ef6cbc0ca612e425c3.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Foch Film / Bilibili",
        "country": "China",
        "airing_day": "Wednesday",
        "heat_score": 96800,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 680000,
        "average_rating": 4.9,
        "rating_count": 520,
        "episode_count": 26,
        "genres": [1, 2, 3, 5],
    },
    {
        "title": "ច្បាប់បិសាច",
        "slug": "law-of-the-devil",
        "alt_title": "恶魔法则 (Law of the Devil)",
        "description": "Du Wei is reborn into a fantasy noble world. Regarded as a waste by his clan, he forms a pact with the ancient servant of the devil, using cunning intellect, magic, and mechanical genius to conquer the empire.",
        "poster_url": "https://i.pinimg.com/736x/b1/96/75/b196759acf690dc4be63deaa28ab47b2.jpg",
        "banner_url": "https://i.pinimg.com/736x/b1/96/75/b196759acf690dc4be63deaa28ab47b2.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Sunday",
        "heat_score": 93400,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 390000,
        "average_rating": 4.8,
        "rating_count": 280,
        "episode_count": 24,
        "genres": [2, 5, 8, 16],
    },
    {
        "title": "ព្រេងនិទានស៊ានវូ",
        "slug": "legend-of-xianwu",
        "alt_title": "仙武帝尊 (Legend of Xianwu)",
        "description": "Ye Chen, an expelled loyal disciple of the Zheng Yang Sect, discovers the mysterious True Fire of the Heavens. Rising against betrayal and powerful sacred sects, he forges his legendary path as the Emperor of Immortal Martial.",
        "poster_url": "https://i.pinimg.com/736x/d2/4a/14/d24a145a7d0f3f9d3f7d795001e02946.jpg",
        "banner_url": "https://i.pinimg.com/736x/d2/4a/14/d24a145a7d0f3f9d3f7d795001e02946.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Sparkly Key Animation / Youku",
        "country": "China",
        "airing_day": "Tuesday",
        "heat_score": 95200,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 510000,
        "average_rating": 4.9,
        "rating_count": 410,
        "episode_count": 20,
        "genres": [1, 3, 5, 6],
    },
    {
        "title": "មេបក្សសៀនឡុង",
        "slug": "xianlong-sect-leader",
        "alt_title": "仙龙宗主 (Sect Leader of Xianlong)",
        "description": "The supreme ancient dragon reincarnates as the young leader of a decaying mountain sect. Commanding dragon bloodline divine beasts, he leads his sect to dominate the continent.",
        "poster_url": "https://i.pinimg.com/736x/e7/41/e5/e741e5c0fc0c44d38f3a3bee88e5440b.jpg",
        "banner_url": "https://i.pinimg.com/736x/e7/41/e5/e741e5c0fc0c44d38f3a3bee88e5440b.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Tencent Video",
        "country": "China",
        "airing_day": "Saturday",
        "heat_score": 91200,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 280000,
        "average_rating": 4.8,
        "rating_count": 190,
        "episode_count": 16,
        "genres": [1, 3, 5, 8],
    },
    {
        "title": "កំណត់ត្រាពន្លឺទេវភាព",
        "slug": "record-of-divine-light",
        "alt_title": "神光圣典 (Record of Divine Light)",
        "description": "The sacred divine scripture awakens ancient holy flames. A young swordmaster embarks on a celestial crusade to seal chaotic netherworld lords and protect the divine realm.",
        "poster_url": "https://i.pinimg.com/1200x/3e/59/62/3e59627999c0c30f0fee2f8fbf0daeb0.jpg",
        "banner_url": "https://i.pinimg.com/1200x/3e/59/62/3e59627999c0c30f0fee2f8fbf0daeb0.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Bilibili / Foch Film",
        "country": "China",
        "airing_day": "Thursday",
        "heat_score": 94100,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 340000,
        "average_rating": 4.9,
        "rating_count": 230,
        "episode_count": 12,
        "genres": [1, 2, 4, 5],
    },
    {
        "title": "កំពូលយុទ្ធសិល្ប៍ប្រយុទ្ធនិងវីរៈបុរស",
        "slug": "the-immortal-vs-superheroes",
        "alt_title": "修仙者大战超能力 (The Immortal vs Superheroes)",
        "description": "In a futuristic modern city brimming with modern superheroes and cyborgs, an ancient supreme immortal cultivator descends to show the world the true terror of Daoist cultivation.",
        "poster_url": "https://i.pinimg.com/736x/09/90/0c/09900c39eb554655acffac31f01143fe.jpg",
        "banner_url": "https://i.pinimg.com/736x/09/90/0c/09900c39eb554655acffac31f01143fe.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Tencent / Bilibili",
        "country": "China",
        "airing_day": "Monday",
        "heat_score": 97800,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 720000,
        "average_rating": 5.0,
        "rating_count": 610,
        "episode_count": 24,
        "genres": [1, 5, 8, 13],
    },
    {
        "title": "និទានព្រះនិងបិសាច",
        "slug": "tales-of-demons-and-gods",
        "alt_title": "妖神记 (Tales of Demons and Gods)",
        "description": "Nie Li, the strongest Demon Spiritualist, is killed in battle with the Sage Emperor and reborn back to his 13-year-old self. Armed with boundless knowledge, he trains to protect Glory City and defeat the Sage Emperor.",
        "poster_url": "https://i.pinimg.com/736x/88/23/96/882396392ff9f6cb0dc684e9213905a8.jpg",
        "banner_url": "https://i.pinimg.com/736x/88/23/96/882396392ff9f6cb0dc684e9213905a8.jpg",
        "trailer_url": "",
        "year": 2023,
        "status": "ONGOING",
        "studio": "Ruo Hong Culture / Tencent",
        "country": "China",
        "airing_day": "Friday",
        "heat_score": 96500,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 890000,
        "average_rating": 4.9,
        "rating_count": 580,
        "episode_count": 52,
        "genres": [1, 2, 3, 5],
    },
    {
        "title": "កំនើតវីរៈបុរសនាគរាជ វគ្គ២",
        "slug": "coiling-dragon-season-2",
        "alt_title": "盘龙 第二季 (Coiling Dragon Season 2)",
        "description": "Linley Baruch trains relentlessly with the Coiling Dragon Ring, unlocking the heritage of the supreme Dragonblood Warriors to explore the boundless higher planes of gods.",
        "poster_url": "https://i.pinimg.com/736x/e8/bf/f5/e8bff523785ab461213939e235df7664.jpg",
        "banner_url": "https://i.pinimg.com/736x/e8/bf/f5/e8bff523785ab461213939e235df7664.jpg",
        "trailer_url": "",
        "year": 2024,
        "status": "ONGOING",
        "studio": "Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Saturday",
        "heat_score": 95600,
        "type": "DONGHUA",
        "is_featured": True,
        "is_trending": True,
        "is_published": True,
        "is_free": False,
        "view_count": 480000,
        "average_rating": 4.9,
        "rating_count": 320,
        "episode_count": 16,
        "genres": [2, 3, 5, 6],
    },
]

def add_more():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    seed_path = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
    db_path = os.path.join(base_dir, "backend", "merdonghua.db")

    print("[*] Loading seed_export.json...")
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_slugs = {a["slug"]: a for a in data.get("anime", [])}
    existing_ids = {a["id"] for a in data.get("anime", [])}
    next_id = max(existing_ids, default=0) + 1

    added_anime = []
    added_episodes = []
    added_anime_genres = []
    sample_video = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

    for na in NEW_8_ANIMES:
        slug = na["slug"]
        if slug in existing_slugs:
            # Update existing with new poster
            old = existing_slugs[slug]
            old["poster_url"] = na["poster_url"]
            old["banner_url"] = na["banner_url"]
            old["title"] = na["title"]
            old["alt_title"] = na["alt_title"]
            print(f"  🔄 Updated poster for: [{old['id']}] {na['title']}")
            continue

        aid = next_id
        next_id += 1

        entry = {
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
        data["anime"].append(entry)
        added_anime.append(entry)

        for gid in na.get("genres", [1, 2, 3]):
            ag_entry = {"anime_id": aid, "genre_id": gid}
            data.setdefault("anime_genres", []).append(ag_entry)
            added_anime_genres.append(ag_entry)

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
                "view_count": 120,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            data.setdefault("episodes", []).append(ep_entry)
            added_episodes.append(ep_entry)

        print(f"  ✅ Added new Donghua: [{aid}] {na['title']} | {na['alt_title']}")

    data["counts"]["anime"] = len(data["anime"])
    data["counts"]["episodes"] = len(data.get("episodes", []))
    with open(seed_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Sync to local SQLite
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        for a in data["anime"]:
            cur.execute("""
                INSERT OR REPLACE INTO anime (
                    id, title, slug, alt_title, description, poster_url, banner_url,
                    trailer_url, year, status, studio, country, airing_day, heat_score,
                    type, is_featured, is_trending, is_published, is_free, view_count,
                    average_rating, rating_count, episode_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                a["id"], a["title"], a["slug"], a.get("alt_title",""), a.get("description",""),
                a.get("poster_url",""), a.get("banner_url",""), a.get("trailer_url",""), a.get("year", 2024),
                a["status"], a.get("studio",""), a.get("country","China"), a.get("airing_day","Saturday"),
                a.get("heat_score", 85000), a["type"], a.get("is_featured", False), a.get("is_trending", False),
                a.get("is_published", True), a.get("is_free", False), a.get("view_count", 0),
                a.get("average_rating", 0.0), a.get("rating_count", 0), a.get("episode_count", 0)
            ))
        conn.commit()
        conn.close()
        print(f"[OK] Synced {len(data['anime'])} titles to SQLite DB!")

    # Sync to Cloudflare R2
    try:
        sys.path.insert(0, os.path.join(base_dir, "backend"))
        from app.services.r2_backup_service import upload_backup_to_r2_sync
        r2_ok = upload_backup_to_r2_sync(data)
        print(f"[OK] Synced updated catalog to Cloudflare R2: {r2_ok}")
    except Exception as e:
        print(f"[WARN] R2 error: {e}")

if __name__ == "__main__":
    add_more()
