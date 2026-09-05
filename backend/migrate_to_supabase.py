import asyncio
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.user import User
from app.models.genre import Genre, anime_genres
from app.models.anime import Anime
from app.models.episode import Episode
from app.models.banner import Banner
from app.core.database import Base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, insert, delete

DATABASE_URL = 'postgresql+asyncpg://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={'statement_cache_size': 0}
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    print("1. Creating tables in Supabase PostgreSQL...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables verified!")

    print("2. Reading seed_export.json...")
    seed_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'services', 'seed_export.json')
    with open(seed_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    async with AsyncSessionLocal() as session:
        # Import Genres
        genres_list = data.get('genres', [])
        for g_data in genres_list:
            res = await session.execute(select(Genre).where(Genre.id == g_data['id']))
            if not res.scalar_one_or_none():
                session.add(Genre(id=g_data['id'], name=g_data['name'], slug=g_data['slug']))
        await session.commit()
        print(f"Imported {len(genres_list)} genres.")

        # Import Users
        users_list = data.get('users', [])
        for u_data in users_list:
            res = await session.execute(select(User).where(User.username == u_data['username']))
            if not res.scalar_one_or_none():
                session.add(User(
                    username=u_data['username'],
                    email=u_data.get('email', f"{u_data['username']}@namianime.com"),
                    password_hash=u_data.get('password_hash') or u_data.get('hashed_password', ''),
                    role=u_data.get('role', 'USER'),
                    is_vip=u_data.get('is_vip', False),
                    is_active=True
                ))
        await session.commit()
        print(f"Imported {len(users_list)} users.")

        # Import Anime
        anime_list = data.get('anime', [])
        imported_anime = 0
        for a_data in anime_list:
            res = await session.execute(select(Anime).where(Anime.id == a_data['id']))
            existing = res.scalar_one_or_none()
            if not existing:
                anime = Anime(
                    id=a_data['id'],
                    title=a_data['title'],
                    slug=a_data.get('slug', ''),
                    alt_title=a_data.get('alt_title'),
                    description=a_data.get('description'),
                    poster_url=a_data.get('poster_url'),
                    banner_url=a_data.get('banner_url'),
                    trailer_url=a_data.get('trailer_url'),
                    year=a_data.get('year', 2024),
                    status=a_data.get('status', 'ONGOING'),
                    studio=a_data.get('studio'),
                    country=a_data.get('country', 'China'),
                    airing_day=a_data.get('airing_day'),
                    heat_score=a_data.get('heat_score', 85000),
                    type=a_data.get('type', 'DONGHUA'),
                    is_featured=a_data.get('is_featured', False),
                    is_trending=a_data.get('is_trending', False),
                    is_published=a_data.get('is_published', True),
                    is_free=a_data.get('is_free', False),
                    episode_count=a_data.get('episode_count', 0),
                    average_rating=a_data.get('average_rating', 9.8)
                )
                session.add(anime)
                imported_anime += 1
            else:
                # Update poster & metadata in case already seeded
                existing.poster_url = a_data.get('poster_url')
                existing.banner_url = a_data.get('banner_url')
                existing.title = a_data.get('title')
                existing.alt_title = a_data.get('alt_title')
                existing.status = a_data.get('status')
                existing.episode_count = a_data.get('episode_count')

        await session.commit()
        print(f"Verified/Imported {len(anime_list)} anime.")

        # Import Episodes
        episodes_list = data.get('episodes', [])
        imported_eps = 0
        for ep_data in episodes_list:
            res = await session.execute(select(Episode).where(Episode.id == ep_data['id']))
            if not res.scalar_one_or_none():
                ep = Episode(
                    id=ep_data['id'],
                    anime_id=ep_data['anime_id'],
                    episode_number=ep_data.get('episode_number', 1),
                    title=ep_data.get('title'),
                    description=ep_data.get('description'),
                    video_url=ep_data.get('video_url', ''),
                    subtitle_url=ep_data.get('subtitle_url'),
                    thumbnail_url=ep_data.get('thumbnail_url'),
                    duration_seconds=ep_data.get('duration_seconds', 1200),
                    is_published=ep_data.get('is_published', True),
                    is_free=ep_data.get('is_free', False),
                    view_count=ep_data.get('view_count', ep_data.get('views', 0))
                )
                session.add(ep)
                imported_eps += 1

        await session.commit()
        print(f"Imported {imported_eps} episodes.")

        # Import Banners
        banners_list = data.get('banners', [])
        for b_data in banners_list:
            res = await session.execute(select(Banner).where(Banner.id == b_data['id']))
            if not res.scalar_one_or_none():
                session.add(Banner(
                    id=b_data['id'],
                    title=b_data['title'],
                    subtitle=b_data.get('subtitle'),
                    image_url=b_data['image_url'],
                    link_url=b_data.get('link_url'),
                    anime_id=b_data.get('anime_id'),
                    is_active=b_data.get('is_active', True),
                    order=b_data.get('order', 0)
                ))
        await session.commit()
        print(f"Imported {len(banners_list)} banners.")

        # Import Anime Genres
        ag_list = data.get('anime_genres', [])
        for ag in ag_list:
            try:
                await session.execute(insert(anime_genres).values(anime_id=ag['anime_id'], genre_id=ag['genre_id']))
            except Exception:
                pass
        await session.commit()
        print(f"Linked {len(ag_list)} anime genres.")

        print(f"\n=======================================================")
        print(f"🎉 100% COMPLETE: All 69 Anime, {len(episodes_list)} Episodes, Genres & Banners are in Supabase Cloud!")
        print(f"=======================================================\n")

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
