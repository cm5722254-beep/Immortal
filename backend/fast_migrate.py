import asyncio
import json
import os
import sys
import asyncpg

sys.stdout.reconfigure(encoding='utf-8')

DATABASE_URL = 'postgresql://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

async def fast_migrate():
    print("Connecting to Supabase...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

    seed_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'services', 'seed_export.json')
    with open(seed_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Episodes
    episodes = data.get('episodes', [])
    print(f"Preparing {len(episodes)} episodes for bulk insert...")
    ep_records = []
    for ep in episodes:
        ep_records.append((
            ep['id'],
            ep['anime_id'],
            ep.get('episode_number', 1),
            ep.get('title'),
            ep.get('description'),
            ep.get('video_url', ''),
            ep.get('subtitle_url'),
            ep.get('thumbnail_url'),
            ep.get('duration_seconds', 1200),
            ep.get('is_published', True),
            ep.get('is_free', False),
            ep.get('view_count', 0)
        ))

    # Clean existing episodes & bulk insert
    await conn.execute("TRUNCATE TABLE episodes RESTART IDENTITY CASCADE;")
    await conn.copy_records_to_table(
        'episodes',
        records=ep_records,
        columns=[
            'id', 'anime_id', 'episode_number', 'title', 'description',
            'video_url', 'subtitle_url', 'thumbnail_url', 'duration_seconds',
            'is_published', 'is_free', 'view_count'
        ]
    )
    print(f"✅ BULK INSERTED {len(ep_records)} EPISODES!")

    # 2. Banners
    banners = data.get('banners', [])
    if banners:
        banner_records = []
        for b in banners:
            banner_records.append((
                b['id'],
                b['title'],
                b.get('subtitle'),
                b['image_url'],
                b.get('link_url'),
                b.get('anime_id'),
                b.get('is_active', True),
                b.get('order', b.get('order_index', 0))
            ))
        await conn.execute("TRUNCATE TABLE banners RESTART IDENTITY CASCADE;")
        await conn.copy_records_to_table(
            'banners',
            records=banner_records,
            columns=['id', 'title', 'subtitle', 'image_url', 'link_url', 'anime_id', 'is_active', 'order_index']
        )
        print(f"✅ BULK INSERTED {len(banner_records)} BANNERS!")

    # 3. Anime Genres
    ag_list = data.get('anime_genres', [])
    if ag_list:
        ag_records = [(ag['anime_id'], ag['genre_id']) for ag in ag_list]
        await conn.execute("TRUNCATE TABLE anime_genres CASCADE;")
        await conn.copy_records_to_table(
            'anime_genres',
            records=ag_records,
            columns=['anime_id', 'genre_id']
        )
        print(f"✅ BULK INSERTED {len(ag_records)} ANIME GENRE LINKS!")

    # Final summary check
    animes = await conn.fetchval("SELECT count(*) FROM anime")
    eps = await conn.fetchval("SELECT count(*) FROM episodes")
    genres = await conn.fetchval("SELECT count(*) FROM genres")
    users = await conn.fetchval("SELECT count(*) FROM users")
    bnrs = await conn.fetchval("SELECT count(*) FROM banners")

    print("\n=======================================================")
    print(f"🎉 SUPABASE CLOUD DATABASE IS 100% READY!")
    print(f"  • Total Anime:    {animes}")
    print(f"  • Total Episodes: {eps}")
    print(f"  • Total Genres:   {genres}")
    print(f"  • Total Users:    {users}")
    print(f"  • Total Banners:  {bnrs}")
    print("=======================================================\n")

    await conn.close()

if __name__ == '__main__':
    asyncio.run(fast_migrate())
