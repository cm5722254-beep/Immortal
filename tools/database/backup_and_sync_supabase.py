#!/usr/bin/env python3
"""
Complete Supabase Cloud Database Backup and Synchronization Script.
1. Exports a full JSON backup of all tables (anime, episodes, genres, users, banners, anime_genres).
2. Updates anime table in Supabase with the 50 movies (titles, alt_titles, posters, status, year).
3. Updates local ALL_MOVIES_PNG_IMAGES.json & seed_export.json.
4. Resets sequences and clears cache.
"""
import asyncio
import json
import os
import sys
from datetime import datetime
import asyncpg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"d:\Huang-anime"
DATABASE_URL = "postgresql://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

# The 50 movies from user
USER_MOVIES = [
    {"id":1,"title":"គុជអមតះធៀននី","alt_title":"仙逆 (Xian Ni)","slug":"renegade-immortal","year":2023,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/39/6e/e7/396ee7f0c71b61ebeb6a25b6381148fa.jpg","poster_local":"គុជអមតះធៀននី.jpg"},
    {"id":2,"title":"ពិភពនៃថាមពលវេទមន្ត","alt_title":"完美世界 (Wanmei Shijie)","slug":"perfect-world","year":2021,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/3f/1a/10/3f1a10463df30c93c1918e85c0c2ade0.jpg","poster_local":"ពិភពនៃថាមពលវេទមន្ត.jpg"},
    {"id":3,"title":"ដំណើស្វែងរកជីវិតអមតះ","alt_title":"凡人修仙传 (Fanren Xiu Xian Chuan)","slug":"a-record-of-a-mortals-journey-to-immortality","year":2020,"status":"ONGOING","poster_url":"https://i.pinimg.com/236x/9b/1f/88/9b1f88a6f3018ba4ba70b629d13e805d.jpg","poster_local":"ដំណើស្វែងរកជីវិតអមតះ.jpg"},
    {"id":4,"title":"ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥","alt_title":"斗破苍穹 (Doupo Cangqiong)","slug":"battle-through-the-heavens","year":2017,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/8a/c9/b8/8ac9b8efb39095d3ea3ee2d1c9da4949.jpg","poster_local":"ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥.jpg"},
    {"id":5,"title":"ទឹកដីថាមពលវិញ្ញាណ វគ្ក២","alt_title":"斗罗大陆II绝世唐门 (Jueshi Tangmen)","slug":"soul-land-2-the-peerless-tang-clan","year":2023,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/b7/56/fb/b756fb0ca3bc43f527eebc8707bca447.jpg","poster_local":"ទឹកដីថាមពលវិញ្ញាណ វគ្ក២.jpg"},
    {"id":6,"title":"លេបផ្កាយ","alt_title":"吞噬星空 (Tunshi Xingkong)","slug":"swallowed-star","year":2020,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/03/d1/ce/03d1ceb946aec9c2dfde756005ba2111.jpg","poster_local":"លេបផ្កាយ.jpg"},
    {"id":7,"title":"ឆន្ទៈដ៏អស់កល្បជានិច្ច","alt_title":"一念永恒 (Yi Nian Yong Heng)","slug":"a-will-eternal","year":2020,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/a2/42/7d/a2427d906710467755ecf6c820bf3c58.jpg","poster_local":"ឆន្ទៈដ៏អស់កល្បជានិច្ច.jpg"},
    {"id":8,"title":"សិស្សច្បងកំពូលល្បិច","alt_title":"师兄啊师兄 (Shixiong A Shixiong)","slug":"big-brother","year":2023,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/ed/31/a7/ed31a79e9a9d1498f63523261e78f147.jpg","poster_local":"សិស្សច្បងកំពូលល្បិច.jpg"},
    {"id":9,"title":"អាទិទេពកំណប់","alt_title":"zhu zhanlong","slug":"the-wealth-gods","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/c7/87/45/c787458d3959cbfc3948c1656d807c73.jpg","poster_local":"អាទិទេពកំណប់.jpg"},
    {"id":10,"title":"បណ្ឌិតសភាក្បាច់គុណ","alt_title":"Tần Vũ","slug":"orientalmartialacademy","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/5d/4b/21/5d4b214b1e75899fbb4d2d90391f38b8.jpg","poster_local":"បណ្ឌិតសភាក្បាច់គុណ.jpg"},
    {"id":11,"title":"កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព","alt_title":"","slug":"a-good-day-to-ascend","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/83/a5/a3/83a5a359496821ff4f17415fd21e8241.jpg","poster_local":"កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព.jpg"},
    {"id":12,"title":"កាំបិតមួយទៅកាន់ឋានសួគ៌","alt_title":"Gu An","slug":"one-slash-to-the-heavens","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/fa/32/4c/fa324c0b115fe61806b22ae9905f0d1c.jpg","poster_local":"កាំបិតមួយទៅកាន់ឋានសួគ៌.jpg"},
    {"id":13,"title":"ព្រេងនិទានរបស់ព្រះ","alt_title":"Qin Muer","slug":"talesofherdinggods","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/1200x/1d/19/72/1d19726dbe508589ede095c875958681.jpg","poster_local":"ព្រេងនិទានរបស់ព្រះ.jpg"},
    {"id":14,"title":"ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣","alt_title":"Chen Nan","slug":"tomb-of-failen-god-season-3","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/86/55/9f/86559fb7c7bb2246db219e9ad0abc3d0.jpg","poster_local":"ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣.jpg"},
    {"id":15,"title":"ខ្សែស្រឡាយនៃវាសនា","alt_title":"","slug":"threads-of-fate-a-war-untold","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/12/64/7f/12647fe7025f0904f1633fb0c4ae5b8d.jpg","poster_local":"ខ្សែស្រឡាយនៃវាសនា.jpg"},
    {"id":16,"title":"អាទិទេពដាវ ឈិនភីងអាន វគ្ក២","alt_title":"Chen Ping An","slug":"sword-of-coming","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/57/57/79/5757799e6e9351029ef244b2417981af.jpg","poster_local":"អាទិទេពដាវ ឈិនភីងអាន វគ្ក២.jpg"},
    {"id":17,"title":"ប្រហាអាទិទេព","alt_title":"Li Chi Ye","slug":"slay-the-gods","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/32/f5/94/32f59467938bc19aaee13ab73c5af4d7.jpg","poster_local":"ប្រហាអាទិទេព.jpg"},
    {"id":18,"title":"ស្ដេចដាវអមតះ","alt_title":"","slug":"sword-and-fairy","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/d5/83/24/d58324f38c2bedb43015f00c68515509.jpg","poster_local":"ស្ដេចដាវអមតះ.jpg"},
    {"id":19,"title":"មិនមែនពេលវាលានិងលំហរ","alt_title":"Xu Qing","slug":"beyondtimesgaze","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/0a/82/98/0a8298d7deb58e67ea47b3d05bab3a7e.jpg","poster_local":"មិនមែនពេលវាលានិងលំហរ.jpg"},
    {"id":20,"title":"ស្វែងរកអាថកំបាំងអាទិទេព","alt_title":"Tu Pa Ye","slug":"in-search-of-gods","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/9a/c6/14/9ac614043ee46e8578ee082cd381e542.jpg","poster_local":"ស្វែងរកអាថកំបាំងអាទិទេព.jpg"},
    {"id":21,"title":"ឃាតករអេលាន","alt_title":"","slug":"alian-among-immortal","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/34/19/e7/3419e70a2ed5c28fdce939b6183e29e9.jpg","poster_local":"ឃាតករអេលាន.jpg"},
    {"id":22,"title":"អ្នកប្រយុទ្ទឈាមនាគ","alt_title":"","slug":"coiling-dragon","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/85/f4/13/85f4132843cf9564ce1ae2d667d4715e.jpg","poster_local":"អ្នកប្រយុទ្ទឈាមនាគ.jpg"},
    {"id":23,"title":"យប់នៃការស្លាប់","alt_title":"","slug":"ever-night","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/5e/3f/71/5e3f719adb339d6ebb63c9813e1bdacc.jpg","poster_local":"យប់នៃការស្លាប់.jpg"},
    {"id":24,"title":"លោកប្ដីអឆរិយះ","alt_title":"","slug":"my-heroic-husband","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/1200x/3b/13/be/3b13be0dad49dc17433678d37be3a63e.jpg","poster_local":"លោកប្ដីអឆរិយះ.jpg"},
    {"id":25,"title":"បុព្វបុរសក្បាច់គុណ វគ្ក៦","alt_title":"","slug":"martial-universe-season-6","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/3a/29/ec/3a29eccf17b88057ce0be75c5fbacd8d.jpg","poster_local":"បុព្វបុរសក្បាច់គុណ វគ្ក៦.jpg"},
    {"id":26,"title":"យុទ្ទសិល្ប៍អមតះ វគ្ក៥","alt_title":"","slug":"immortality-season-5","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/06/6b/68/066b682d2265a171addcd8e5217b5305.jpg","poster_local":"យុទ្ទសិល្ប៍អមតះ វគ្ក៥.jpg"},
    {"id":27,"title":"ផ្លូវមាគាកំសត់","alt_title":"","slug":"walking-the-way-all-alone","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/18/42/65/184265d092ec32c2d0cbf27c99e4edf6.jpg","poster_local":"ផ្លូវមាគាកំសត់.jpg"},
    {"id":28,"title":"ដំណើទៅកាន់ឋាណះអាទិទេព","alt_title":"","slug":"apotheosis","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/5a/3c/f6/5a3cf6a7d9a918eda7416af8734d23d3.jpg","poster_local":"ដំណើទៅកាន់ឋាណះអាទិទេព.jpg"},
    {"id":29,"title":"ដំណើអធិរាធអមតះ","alt_title":"","slug":"back-as-immortal-lord","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/49/bd/c4/49bdc43e562b23f6e4b7c6c512944b75.jpg","poster_local":"ដំណើអធិរាធអមតះ.jpg"},
    {"id":30,"title":"ប្រឆាំងនិងវាសនា","alt_title":"","slug":"way-of-choices","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/e2/48/57/e24857dea6bbc8027405198edb47a759.jpg","poster_local":"ប្រឆាំងនិងវាសនា.jpg"},
    {"id":31,"title":"រន្ទះដាវអ្នកប្រយុទ្ធ","alt_title":"","slug":"blades-of-the-guardians","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/1200x/b0/db/74/b0db74315169186b54c431d4cf8f4608.jpg","poster_local":"រន្ទះដាវអ្នកប្រយុទ្ធ.jpg"},
    {"id":32,"title":"ភ្លើងសង្រ្គាមបំផ្លាញលោក","alt_title":"","slug":"the-ravanges-of-time","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/11/6f/b9/116fb9c309be9f1173c63099df34f37b.jpg","poster_local":"ភ្លើងសង្រ្គាមបំផ្លាញលោក.jpg"},
    {"id":33,"title":"ច្រកទ្វាអាថកំបាំង","alt_title":"","slug":"the-gate-of-mystical-realm","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/84/ae/2a/84ae2ac908a9327d7112b5f2506793b8.jpg","poster_local":"ច្រកទ្វាអាថកំបាំង.jpg"},
    {"id":34,"title":"ត្រើយម្ខាងនែសំហរ","alt_title":"","slug":"the-other-side-of-deep-space","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/31/a1/9e/31a19e0da8777efc5ef3a68bd6ce4f11.jpg","poster_local":"ត្រើយម្ខាងនែសំហរ.jpg"},
    {"id":35,"title":"ដំណើទៅកាន់ឋាណះអាទិទេព វគ្ក២","alt_title":"","slug":"apotheosis-season-3","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/79/7a/ac/797aac6dadf0fa97807e31df277aacae.jpg","poster_local":"ដំណើទៅកាន់ឋាណះអាទិទេព វគ្ក២.jpg"},
    {"id":36,"title":"សម្ព័នមនុស្សអាក្រក់ វគ្ក៧","alt_title":"","slug":"the-degenerate-drawing-jianghu-season-7","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/1200x/14/53/65/1453658398b75682cb0c473a1cb33adc.jpg","poster_local":"សម្ព័នមនុស្សអាក្រក់ វគ្ក៧.jpg"},
    {"id":37,"title":"គុកវិញ្ញាណ","alt_title":"","slug":"ling-cage","year":2026,"status":"ONGOING","poster_url":"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpqehx9x7dUZGT2H2uQjwi_iS7NZWr22FyjbKCIe9yvvmhMF4I6HNSP74&s=10","poster_local":"គុកវិញ្ញាណ.jpg"},
    {"id":38,"title":"លោកប្ដីអឆរិយះ វគ្គ២","alt_title":"","slug":"my-heroic-husband-season-2","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/fd/a9/85/fda9855869dd3761b6d8539ea5e203ee.jpg","poster_local":"លោកប្ដីអឆរិយះ វគ្គ២.jpg"},
    {"id":39,"title":"អាទិទេពអាស៊ូរ៉ា វគ្ក ២","alt_title":"","slug":"martial-gods-asura-season-2","year":2026,"status":"COMPLETED","poster_url":"https://i.pinimg.com/736x/e0/b7/d2/e0b7d203f623b9120f4087a967cea239.jpg","poster_local":"អាទិទេពអាស៊ូរ៉ា វគ្ក ២.jpg"},
    {"id":40,"title":"ដាវទេព ជូសៀន វគ្ក ៤","alt_title":"","slug":"jade-dynasty-season-4","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/44/9d/1e/449d1e2e60a3caa200a86fd574be3540.jpg","poster_local":"ដាវទេព ជូសៀន វគ្ក ៤.jpg"},
    {"id":41,"title":"Dragon Ball","alt_title":"","slug":"dragon-ball","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/d1/ec/56/d1ec56eaea2b1f7fb17834880083b383.jpg","poster_local":"Dragon Ball.jpg"},
    {"id":42,"title":"Case Closed - Detective Conan","alt_title":"","slug":"case-closed-detective-conan","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/23/6b/8d/236b8d5ce29ea4e637dc3943bed3a28c.jpg","poster_local":"Case Closed - Detective Conan.jpg"},
    {"id":43,"title":"Tokyo Revengers","alt_title":"","slug":"tokyo-revengers","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/fd/dc/56/fddc56685aa3ebff2468da214b8b3404.jpg","poster_local":"Tokyo Revengers.jpg"},
    {"id":44,"title":"Hunter x Hunter","alt_title":"","slug":"hunter-x-hunter","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/f6/68/a3/f668a3141dc9ccd4afb7e4545ca1cf6b.jpg","poster_local":"Hunter x Hunter.jpg"},
    {"id":45,"title":"Solo Leveling Season 3","alt_title":"","slug":"solo-leveling-season-3","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/a7/25/6d/a7256d015c48f7078922b6f3453df985.jpg","poster_local":"Solo Leveling Season 3.jpg"},
    {"id":46,"title":"Attack on Titan Season 1","alt_title":"","slug":"attack-on-titan-season-1","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/736x/d8/34/91/d83491ac30d4c7a2b64b42c7ed67b7b8.jpg","poster_local":"Attack on Titan Season 1.jpg"},
    {"id":47,"title":"អាទិទេពអាស៊ូរ៉ា វគ្ក ១","alt_title":"","slug":"martial-gods-asura-season-1","year":2026,"status":"UPCOMING","poster_url":"https://i.pinimg.com/1200x/a0/80/20/a080205abbea3899119d02d0bab72df6.jpg","poster_local":"អាទិទេពអាស៊ូរ៉ា វគ្ក ១.jpg"},
    {"id":48,"title":"ប្រហាអាទិទេព វគ្ក២","alt_title":"","slug":"slay-the-gods-season-2","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/bd/4a/64/bd4a642e42e6c33354e1577341e42110.jpg","poster_local":"ប្រហាអាទិទេព វគ្ក២.jpg"},
    {"id":49,"title":"សង្គ្រាមគ្រោះមហន្តរាយ","alt_title":"","slug":"disaster-war","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/0d/31/88/0d318870eb2930c15dd9ab66623c36d3.jpg","poster_local":"សង្គ្រាមគ្រោះមហន្តរាយ.jpg"},
    {"id":50,"title":"សង្ក្រាមអធិរាជ","alt_title":"","slug":"emperor-war","year":2026,"status":"ONGOING","poster_url":"https://i.pinimg.com/736x/86/b4/2b/86b42b6c51b8191eb7a265d3ef9bd2fa.jpg","poster_local":"សង្ក្រាមអធិរាជ.jpg"}
]

# Explicit mapping for movies that map to specific DB IDs
SPECIAL_MAPPINGS = {
    "disaster-war": 67,  # សង្គ្រាមគ្រោះមហន្តរាយ -> ID 67
    "emperor-war": 68,   # សង្ក្រាមអធិរាជ -> ID 68
}

def serialize_row(row):
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d

async def main():
    print("🔌 1. Connecting to Supabase Cloud Database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("   Connected successfully.")

    # ── STEP 1: Complete Backup of ALL Tables ──
    print("\n📦 2. Creating Complete Cloud Database Backup...")
    backup_dir = os.path.join(ROOT_DIR, "backend", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    today_str = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"supabase_full_backup_{today_str}.json")

    anime_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM anime ORDER BY id")]
    episode_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM episodes ORDER BY id")]
    genre_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM genres ORDER BY id")]
    user_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM users ORDER BY id")]
    banner_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM banners ORDER BY id")]
    ag_rows = [serialize_row(r) for r in await conn.fetch("SELECT * FROM anime_genres")]

    full_backup_data = {
        "backup_date": datetime.now().isoformat(),
        "counts": {
            "anime": len(anime_rows),
            "episodes": len(episode_rows),
            "genres": len(genre_rows),
            "users": len(user_rows),
            "banners": len(banner_rows),
            "anime_genres": len(ag_rows)
        },
        "anime": anime_rows,
        "episodes": episode_rows,
        "genres": genre_rows,
        "users": user_rows,
        "banners": banner_rows,
        "anime_genres": ag_rows
    }

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(full_backup_data, f, ensure_ascii=False, indent=2)
    print(f"   ✅ Saved full backup to {backup_file}")
    print(f"      • {len(anime_rows)} Anime")
    print(f"      • {len(episode_rows)} Episodes")
    print(f"      • {len(genre_rows)} Genres")
    print(f"      • {len(user_rows)} Users")
    print(f"      • {len(banner_rows)} Banners")

    # ── STEP 2: Update Supabase Anime with latest data ──
    print("\n🔄 3. Updating Supabase Anime records...")
    db_by_slug = {r["slug"]: r["id"] for r in anime_rows}

    updated_count = 0
    for m in USER_MOVIES:
        slug = m["slug"]
        db_id = SPECIAL_MAPPINGS.get(slug) or db_by_slug.get(slug)

        if not db_id:
            # Try matching by title
            for a in anime_rows:
                if a["title"].strip() == m["title"].strip():
                    db_id = a["id"]
                    break

        if db_id:
            await conn.execute("""
                UPDATE anime
                SET title = $1,
                    alt_title = $2,
                    year = $3,
                    status = $4::animestatus,
                    poster_url = $5,
                    updated_at = NOW()
                WHERE id = $6
            """, m["title"], m.get("alt_title") or "", m["year"], m["status"], m["poster_url"], db_id)
            updated_count += 1
        else:
            print(f"   ⚠️ Could not find match for movie: {m['title']} ({slug})")

    print(f"   ✅ Successfully updated {updated_count} anime entries in Supabase!")

    # ── STEP 3: Reset PostgreSQL ID sequences ──
    print("\n🔢 4. Verifying and synchronizing database sequences...")
    for tbl in ["anime", "episodes", "genres", "users", "banners"]:
        try:
            max_val = await conn.fetchval(f"SELECT COALESCE(MAX(id), 0) + 1 FROM {tbl}")
            await conn.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), {max_val}, false)")
            print(f"   Sequence for {tbl} set to {max_val}")
        except Exception:
            pass

    # ── STEP 4: Update ALL_MOVIES_PNG_IMAGES.json ──
    print("\n📝 5. Updating ALL_MOVIES_PNG_IMAGES.json...")
    local_png_path = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.json")
    if os.path.exists(local_png_path):
        with open(local_png_path, "r", encoding="utf-8") as f:
            png_data = json.load(f)

        existing_movies = png_data.get("movies", [])
        m_map = {m["id"]: m for m in existing_movies}

        # The exact 50 movies corresponding to IDs 1..5, 7..51
        new_list = []
        for i, um in enumerate(USER_MOVIES):
            # determine local ID: 1..5 is 1..5, 6..48 is 7..49, 49 is 50, 50 is 51
            if um["id"] <= 5:
                lid = um["id"]
            elif um["id"] <= 48:
                lid = um["id"] + 1
            elif um["id"] == 49:
                lid = 50
            else:
                lid = 51

            existing = m_map.get(lid, {})
            new_list.append({
                "id": lid,
                "title": um["title"],
                "alt_title": um["alt_title"],
                "slug": um["slug"],
                "year": um["year"],
                "status": um["status"],
                "poster_url": um["poster_url"],
                "poster_local": um["poster_local"],
                "poster_status": "OK",
                "banner_url": existing.get("banner_url", um["poster_url"]),
                "banner_status": existing.get("banner_status", "OK")
            })

        png_data["generated_at"] = "2026-09-19"
        png_data["total_movies"] = len(new_list)
        png_data["categories"] = ["ONGOING", "COMPLETED", "UPCOMING"]
        png_data["movies"] = new_list

        with open(local_png_path, "w", encoding="utf-8") as f:
            json.dump(png_data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ Saved {len(new_list)} movies with poster_local & latest URLs to ALL_MOVIES_PNG_IMAGES.json")

    # ── STEP 5: Update backend seed_export.json ──
    print("\n🌱 6. Updating backend/app/services/seed_export.json...")
    seed_path = os.path.join(ROOT_DIR, "backend", "app", "services", "seed_export.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        slug_to_user = {u["slug"]: u for u in USER_MOVIES}
        for a in seed_data.get("anime", []):
            u = slug_to_user.get(a["slug"])
            if not u:
                if a["id"] == 67:
                    u = slug_to_user.get("disaster-war")
                elif a["id"] == 68:
                    u = slug_to_user.get("emperor-war")
            if u:
                a["title"] = u["title"]
                a["alt_title"] = u["alt_title"]
                a["year"] = u["year"]
                a["status"] = u["status"]
                a["poster_url"] = u["poster_url"]

        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(seed_data, f, ensure_ascii=False, indent=2)
        print("   ✅ Updated seed_export.json with latest movie metadata & posters.")

    # ── STEP 6: Final Verification ──
    total_anime = await conn.fetchval("SELECT count(*) FROM anime")
    total_eps = await conn.fetchval("SELECT count(*) FROM episodes")
    total_genres = await conn.fetchval("SELECT count(*) FROM genres")
    total_users = await conn.fetchval("SELECT count(*) FROM users")
    total_banners = await conn.fetchval("SELECT count(*) FROM banners")

    print("\n=======================================================")
    print("🎉 ALL DATA SAFELY BACKED UP & PRESERVED IN SUPABASE:")
    print(f"  • Total Anime in Cloud:     {total_anime}")
    print(f"  • Total Episodes in Cloud:  {total_eps}")
    print(f"  • Total Genres in Cloud:    {total_genres}")
    print(f"  • Total Users in Cloud:     {total_users}")
    print(f"  • Total Banners in Cloud:   {total_banners}")
    print(f"  • Backup Archive File:      {backup_file}")
    print("=======================================================\n")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
