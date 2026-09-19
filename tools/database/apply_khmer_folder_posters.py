#!/usr/bin/env python3
"""
Import all local poster images from 'C:\\Users\\DI Fight\\Documents\\khmer poster'
and set them directly into the website and Supabase database.
"""
import asyncio
import json
import os
import shutil
import sys
import asyncpg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"d:\Huang-anime"
KHMER_POSTERS_DIR = r"C:\Users\DI Fight\Documents\khmer poster"
DEST_PUBLIC_POSTERS = os.path.join(ROOT_DIR, "frontend", "public", "posters")
DEST_UPLOADS_POSTERS = os.path.join(ROOT_DIR, "backend", "uploads", "posters")

DATABASE_URL = "postgresql://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

# The user's 50 movies mapping
MOVIES = [
    {"id":1,"title":"គុជអមតះធៀននី","alt_title":"仙逆 (Xian Ni)","slug":"renegade-immortal","year":2023,"status":"ONGOING","poster_local":"គុជអមតះធៀននី.jpg"},
    {"id":2,"title":"ពិភពនៃថាមពលវេទមន្ត","alt_title":"完美世界 (Wanmei Shijie)","slug":"perfect-world","year":2021,"status":"ONGOING","poster_local":"ពិភពនៃថាមពលវេទមន្ត.jpg"},
    {"id":3,"title":"ដំណើស្វែងរកជីវិតអមតះ","alt_title":"凡人修仙传 (Fanren Xiu Xian Chuan)","slug":"a-record-of-a-mortals-journey-to-immortality","year":2020,"status":"ONGOING","poster_local":"ដំណើស្វែងរកជីវិតអមតះ.jpg"},
    {"id":4,"title":"ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥","alt_title":"斗破苍穹 (Doupo Cangqiong)","slug":"battle-through-the-heavens","year":2017,"status":"ONGOING","poster_local":"ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥.jpg"},
    {"id":5,"title":"ទឹកដីថាមពលវិញ្ញាណ វគ្ក២","alt_title":"斗罗大陆II绝世唐门 (Jueshi Tangmen)","slug":"soul-land-2-the-peerless-tang-clan","year":2023,"status":"ONGOING","poster_local":"ទឹកដីថាមពលវិញ្ញាណ វគ្ក២.jpg"},
    {"id":7,"title":"លេបផ្កាយ","alt_title":"吞噬星空 (Tunshi Xingkong)","slug":"swallowed-star","year":2020,"status":"ONGOING","poster_local":"លេបផ្កាយ.jpg"},
    {"id":8,"title":"ឆន្ទៈដ៏អស់កល្បជានិច្ច","alt_title":"一念永恒 (Yi Nian Yong Heng)","slug":"a-will-eternal","year":2020,"status":"UPCOMING","poster_local":"ឆន្ទៈដ៏អស់កល្បជានិច្ច.jpg"},
    {"id":9,"title":"សិស្សច្បងកំពូលល្បិច","alt_title":"师兄啊师兄 (Shixiong A Shixiong)","slug":"big-brother","year":2023,"status":"ONGOING","poster_local":"សិស្សច្បងកំពូលល្បិច.jpg"},
    {"id":10,"title":"អាទិទេពកំណប់","alt_title":"zhu zhanlong","slug":"the-wealth-gods","year":2026,"status":"ONGOING","poster_local":"អាទិទេពកំណប់.jpg"},
    {"id":11,"title":"បណ្ឌិតសភាក្បាច់គុណ","alt_title":"Tần Vũ","slug":"orientalmartialacademy","year":2026,"status":"ONGOING","poster_local":"បណ្ឌិតសភាក្បាច់គុណ.jpg"},
    {"id":12,"title":"កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព","alt_title":"","slug":"a-good-day-to-ascend","year":2026,"status":"ONGOING","poster_local":"កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព.jpg"},
    {"id":13,"title":"កាំបិតមួយទៅកាន់ឋានសួគ៌","alt_title":"Gu An","slug":"one-slash-to-the-heavens","year":2026,"status":"ONGOING","poster_local":"កាំបិតមួយទៅកាន់ឋានសួគ៌.jpg"},
    {"id":14,"title":"ព្រេងនិទានរបស់ព្រះ","alt_title":"Qin Muer","slug":"talesofherdinggods","year":2026,"status":"ONGOING","poster_local":"ព្រេងនិទានរបស់ព្រះ.jpg"},
    {"id":15,"title":"ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣","alt_title":"Chen Nan","slug":"tomb-of-failen-god-season-3","year":2026,"status":"COMPLETED","poster_local":"ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣.jpg"},
    {"id":16,"title":"ខ្សែស្រឡាយនៃវាសនា៖ សង្គ្រាមដែលមិនធ្លាប់មាន","alt_title":"","slug":"threads-of-fate-a-war-untold","year":2026,"status":"ONGOING","poster_local":"ខ្សែស្រឡាយនៃវាសនា.jpg"},
    {"id":17,"title":"អាទិទេពដាវ ឈិនភីងអាន វគ្ក២","alt_title":"Chen Ping An","slug":"sword-of-coming","year":2026,"status":"COMPLETED","poster_local":"អាទិទេពដាវ ឈិនភីងអាន វគ្ក២.jpg"},
    {"id":18,"title":"ប្រហាអាទិទេព","alt_title":"Li Chi Ye","slug":"slay-the-gods","year":2026,"status":"COMPLETED","poster_local":"ប្រហាអាទិទេព.jpg"},
    {"id":19,"title":"ស្ដេចដាវអមតះ","alt_title":"","slug":"sword-and-fairy","year":2026,"status":"ONGOING","poster_local":"ស្ដេចដាវអមតះ.jpg"},
    {"id":20,"title":"មិនមែនពេលវាលានិងលំហរ","alt_title":"Xu Qing","slug":"beyondtimesgaze","year":2026,"status":"ONGOING","poster_local":"មិនមែនពេលវាលានិងលំហរ.jpg"},
    {"id":21,"title":"ស្វែងរកអាថកំបាំងអាទិទេព","alt_title":"Tu Pa Ye","slug":"in-search-of-gods","year":2026,"status":"ONGOING","poster_local":"ស្វែងរកអាថកំបាំងអាទិទេព.jpg"},
    {"id":22,"title":"ឃាតករអេលាន","alt_title":"","slug":"alian-among-immortal","year":2026,"status":"ONGOING","poster_local":"ឃាតករអេលាន.jpg"},
    {"id":23,"title":"អ្នកប្រយុទ្ទឈាមនាគ","alt_title":"","slug":"coiling-dragon","year":2026,"status":"COMPLETED","poster_local":"អ្នកប្រយុទ្ទឈាមនាគ.jpg"},
    {"id":24,"title":"យប់នៃការស្លាប់","alt_title":"","slug":"ever-night","year":2026,"status":"ONGOING","poster_local":"យប់នៃការស្លាប់.jpg"},
    {"id":25,"title":"លោកប្ដីអឆរិយះ","alt_title":"","slug":"my-heroic-husband","year":2026,"status":"COMPLETED","poster_local":"លោកប្ដីអឆរិយះ.jpg"},
    {"id":26,"title":"បុព្វបុរសក្បាច់គុណ វគ្ក៦","alt_title":"","slug":"martial-universe-season-6","year":2026,"status":"COMPLETED","poster_local":"បុព្វបុរសក្បាច់គុណ វគ្ក៦.jpg"},
    {"id":27,"title":"យុទ្ទសិល្ប៍អមតះ វគ្ក៥","alt_title":"","slug":"immortality-season-5","year":2026,"status":"COMPLETED","poster_local":"យុទ្ទសិល្ប៍អមតះ វគ្ក៥.jpg"},
    {"id":28,"title":"ផ្លូវមាគាកំសត់","alt_title":"","slug":"walking-the-way-all-alone","year":2026,"status":"ONGOING","poster_local":"ផ្លូវមាគាកំសត់.jpg"},
    {"id":29,"title":"ដំណើទៅកាន់ឋាណះអាទិទេព","alt_title":"","slug":"apotheosis","year":2026,"status":"ONGOING","poster_local":"ដំណើទៅកាន់ឋាណះអាទិទេព.jpg"},
    {"id":30,"title":"ដំណើអធិរាធអមតះ","alt_title":"","slug":"back-as-immortal-lord","year":2026,"status":"COMPLETED","poster_local":"ដំណើអធិរាធអមតះ.jpg"},
    {"id":31,"title":"ប្រឆាំងនិងវាសនា","alt_title":"","slug":"way-of-choices","year":2026,"status":"ONGOING","poster_local":"ប្រឆាំងនិងវាសនា.jpg"},
    {"id":32,"title":"រន្ទះដាវអ្នកប្រយុទ្ធ","alt_title":"","slug":"blades-of-the-guardians","year":2026,"status":"ONGOING","poster_local":"រន្ទះដាវអ្នកប្រយុទ្ធ.jpg"},
    {"id":33,"title":"ភ្លើងសង្រ្គាមបំផ្លាញលោក","alt_title":"","slug":"the-ravanges-of-time","year":2026,"status":"ONGOING","poster_local":"ភ្លើងសង្រ្គាមបំផ្លាញលោក.jpg"},
    {"id":34,"title":"ច្រកទ្វាអាថកំបាំង","alt_title":"","slug":"the-gate-of-mystical-realm","year":2026,"status":"ONGOING","poster_local":"ច្រកទ្វាអាថកំបាំង.jpg"},
    {"id":35,"title":"ត្រើយម្ខាងនែសំហរ","alt_title":"","slug":"the-other-side-of-deep-space","year":2026,"status":"ONGOING","poster_local":"ត្រើយម្ខាងនែសំហរ.jpg"},
    {"id":36,"title":"ដំណើទៅកាន់ឋាណះអាទិទេព វគ្ក២","alt_title":"","slug":"apotheosis-season-3","year":2026,"status":"ONGOING","poster_local":"ដំណើទៅកាន់ឋាណះអាទិទេព វគ្ក២.jpg"},
    {"id":37,"title":"សម្ព័នមនុស្សអាក្រក់ វគ្ក៧","alt_title":"","slug":"the-degenerate-drawing-jianghu-season-7","year":2026,"status":"ONGOING","poster_local":"សម្ព័នមនុស្សអាក្រក់ វគ្ក៧.jpg"},
    {"id":38,"title":"គុកវិញ្ញាណ","alt_title":"","slug":"ling-cage","year":2026,"status":"ONGOING","poster_local":"គុកវិញ្ញាណ.jpg"},
    {"id":39,"title":"លោកប្ដីអឆរិយះ វគ្គ២","alt_title":"","slug":"my-heroic-husband-season-2","year":2026,"status":"ONGOING","poster_local":"លោកប្ដីអឆរិយះ វគ្គ២.jpg"},
    {"id":40,"title":"អាទិទេពអាស៊ូរ៉ា វគ្ក ២","alt_title":"","slug":"martial-gods-asura-season-2","year":2026,"status":"COMPLETED","poster_local":"អាទិទេពអាស៊ូរ៉ា វគ្ក ២.jpg"},
    {"id":41,"title":"ដាវទេព ជូសៀន វគ្ក ៤","alt_title":"","slug":"jade-dynasty-season-4","year":2026,"status":"UPCOMING","poster_local":"ដាវទេព ជូសៀន វគ្ក ៤.jpg"},
    {"id":42,"title":"Dragon Ball","alt_title":"","slug":"dragon-ball","year":2026,"status":"UPCOMING","poster_local":"Dragon Ball.jpg"},
    {"id":43,"title":"Case Closed / Detective Conan","alt_title":"","slug":"case-closed-detective-conan","year":2026,"status":"UPCOMING","poster_local":"Case Closed - Detective Conan.jpg"},
    {"id":44,"title":"Tokyo Revengers","alt_title":"","slug":"tokyo-revengers","year":2026,"status":"UPCOMING","poster_local":"Tokyo Revengers.jpg"},
    {"id":45,"title":"Hunter x Hunter","alt_title":"","slug":"hunter-x-hunter","year":2026,"status":"UPCOMING","poster_local":"Hunter x Hunter.jpg"},
    {"id":46,"title":"Solo leveling season 3","alt_title":"","slug":"solo-leveling-season-3","year":2026,"status":"UPCOMING","poster_local":"Solo Leveling Season 3.jpg"},
    {"id":47,"title":"Attack on Titan Season 1","alt_title":"","slug":"attack-on-titan-season-1","year":2026,"status":"UPCOMING","poster_local":"Attack on Titan Season 1.jpg"},
    {"id":48,"title":"អាទិទេពអាស៊ូរ៉ា វគ្ក ១","alt_title":"","slug":"martial-gods-asura-season-1","year":2026,"status":"UPCOMING","poster_local":"អាទិទេពអាស៊ូរ៉ា វគ្ក ១.jpg"},
    {"id":49,"title":"ប្រហាអាទិទេព វគ្ក២","alt_title":"","slug":"slay-the-gods-season-2","year":2026,"status":"ONGOING","poster_local":"ប្រហាអាទិទេព វគ្ក២.jpg"},
    {"id":67,"title":"សង្គ្រាមគ្រោះមហន្តរាយ","alt_title":"Swallowed Star: Disaster War","slug":"disaster-war","year":2026,"status":"ONGOING","poster_local":"សង្គ្រាមគ្រោះមហន្តរាយ.jpg"},
    {"id":68,"title":"សង្ក្រាមអធិរាជ","alt_title":"Renegade Immortal: Sovereign War","slug":"emperor-war","year":2026,"status":"ONGOING","poster_local":"សង្ក្រាមអធិរាជ.jpg"}
]

async def apply_posters():
    os.makedirs(DEST_PUBLIC_POSTERS, exist_ok=True)
    os.makedirs(DEST_UPLOADS_POSTERS, exist_ok=True)

    copied = 0
    poster_url_map = {}

    for m in MOVIES:
        poster_name = m["poster_local"]
        src_path = os.path.join(KHMER_POSTERS_DIR, poster_name)
        if not os.path.exists(src_path):
            # Try without exact spaces
            for f in os.listdir(KHMER_POSTERS_DIR):
                if f.strip() == poster_name.strip():
                    src_path = os.path.join(KHMER_POSTERS_DIR, f)
                    break

        if os.path.exists(src_path):
            # 1. Copy with clean slug filename: e.g. /posters/renegade-immortal.jpg
            slug_filename = f"{m['slug']}.jpg"
            dest_slug = os.path.join(DEST_PUBLIC_POSTERS, slug_filename)
            shutil.copy2(src_path, dest_slug)

            # 2. Copy with original filename
            dest_orig = os.path.join(DEST_PUBLIC_POSTERS, poster_name)
            shutil.copy2(src_path, dest_orig)

            # Also copy to uploads
            shutil.copy2(src_path, os.path.join(DEST_UPLOADS_POSTERS, slug_filename))

            poster_url = f"/posters/{slug_filename}"
            poster_url_map[m["id"]] = poster_url
            copied += 1
            print(f"✅ Copied {poster_name} -> {poster_url}")
        else:
            print(f"⚠️ Missing file: {src_path}")

    print(f"\nTotal posters copied from khmer poster folder: {copied} / {len(MOVIES)}")

    # 3. Update Supabase PostgreSQL Database
    print("🔌 Connecting to Supabase Cloud PostgreSQL...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    db_updates = 0
    for mid, purl in poster_url_map.items():
        await conn.execute("""
            UPDATE anime
            SET poster_url = $1,
                updated_at = NOW()
            WHERE id = $2
        """, purl, mid)
        db_updates += 1
    print(f"✅ Updated {db_updates} anime poster_urls in Supabase Cloud DB!")

    # 4. Make sure ID 50 & 51 have their local posters
    await conn.execute("""
        UPDATE anime
        SET poster_url = '/posters/050_urban-miracle-doctor_poster.jpg',
            updated_at = NOW()
        WHERE id = 50
    """)
    await conn.execute("""
        UPDATE anime
        SET poster_url = '/posters/051_dragon-prince-yuan_poster.jpg',
            updated_at = NOW()
        WHERE id = 51
    """)

    # Fetch updated anime list from Supabase
    all_anime = await conn.fetch("SELECT * FROM anime ORDER BY id")
    await conn.close()

    # 5. Update frontend/public/data/catalog.json
    cat_path = os.path.join(ROOT_DIR, "frontend", "public", "data", "catalog.json")
    if os.path.exists(cat_path):
        with open(cat_path, "r", encoding="utf-8") as f:
            cat = json.load(f)

        anime_list = []
        for r in all_anime:
            anime_list.append({
                "id": r["id"],
                "title": r["title"],
                "alt_title": r["alt_title"] or "",
                "slug": r["slug"],
                "description": r["description"] or "",
                "poster_url": r["poster_url"] or "",
                "banner_url": r["banner_url"] or "",
                "year": r["year"],
                "status": str(r["status"]),
                "studio": r["studio"] or "",
                "country": r["country"] or "China",
                "heat_score": r["heat_score"] or 85000,
                "type": str(r["type"]),
                "is_featured": bool(r["is_featured"]),
                "is_trending": bool(r["is_trending"]),
                "is_published": bool(r["is_published"]),
                "is_free": bool(r["is_free"]),
                "view_count": r["view_count"] or 0,
                "average_rating": float(r["average_rating"] or 9.8),
                "rating_count": r["rating_count"] or 0,
                "episode_count": r["episode_count"] or 0
            })

        cat["anime"] = anime_list
        cat["counts"]["anime"] = len(anime_list)
        cat["version"] = "5.0.0"

        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(cat, f, ensure_ascii=False, indent=2)
        print(f"✅ Updated {cat_path} with {len(anime_list)} anime!")

    # 6. Update ALL_MOVIES_PNG_IMAGES.json
    png_path = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.json")
    if os.path.exists(png_path):
        with open(png_path, "r", encoding="utf-8") as f:
            png_d = json.load(f)

        for m in png_d.get("movies", []):
            if m["id"] in poster_url_map:
                m["poster_url"] = poster_url_map[m["id"]]
            elif m["id"] == 50:
                m["poster_url"] = "/posters/050_urban-miracle-doctor_poster.jpg"
            elif m["id"] == 51:
                m["poster_url"] = "/posters/051_dragon-prince-yuan_poster.jpg"

        with open(png_path, "w", encoding="utf-8") as f:
            json.dump(png_d, f, ensure_ascii=False, indent=2)
        print("✅ Updated ALL_MOVIES_PNG_IMAGES.json")

    # 7. Update seed_export.json
    seed_path = os.path.join(ROOT_DIR, "backend", "app", "services", "seed_export.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_d = json.load(f)

        for a in seed_d.get("anime", []):
            if a["id"] in poster_url_map:
                a["poster_url"] = poster_url_map[a["id"]]

        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(seed_d, f, ensure_ascii=False, indent=2)
        print("✅ Updated seed_export.json")

if __name__ == "__main__":
    asyncio.run(apply_posters())
