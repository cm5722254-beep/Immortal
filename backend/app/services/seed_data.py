import os
import json
from datetime import datetime
import asyncio
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.genre import Genre, anime_genres
from app.models.anime import Anime, AnimeType, AnimeStatus
from app.models.episode import Episode
from app.models.banner import Banner
from app.models.danmaku import Danmaku
from app.models.comment import Comment

GENRES = [
    {"name": "Xianxia (Immortal Heroes)", "slug": "xianxia"},
    {"name": "Xuanhuan (Fantasy)", "slug": "xuanhuan"},
    {"name": "Cultivation", "slug": "cultivation"},
    {"name": "Wuxia (Martial Arts)", "slug": "wuxia"},
    {"name": "Action", "slug": "action"},
    {"name": "Adventure", "slug": "adventure"},
    {"name": "Romance", "slug": "romance"},
    {"name": "Fantasy", "slug": "fantasy"},
    {"name": "Historical", "slug": "historical"},
    {"name": "Supernatural", "slug": "supernatural"},
    {"name": "Comedy", "slug": "comedy"},
    {"name": "Drama", "slug": "drama"},
    {"name": "Sci-Fi", "slug": "sci-fi"},
    {"name": "Mystery", "slug": "mystery"},
    {"name": "Shounen", "slug": "shounen"},
    {"name": "Isekai", "slug": "isekai"},
]

# High quality sample video streams (Creative Commons / Authorized Open Streams)
SAMPLE_STREAMS = [
    {
        "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "duration": 596,
    },
    {
        "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "duration": 653,
    },
    {
        "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "duration": 734,
    },
    {
        "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "duration": 888,
    },
]

# Authentic Real Donghua Library
DONGHUA_LIST = [
    {
        "title": "Renegade Immortal",
        "slug": "renegade-immortal",
        "alt_title": "仙逆 (Xian Ni)",
        "description": "Wang Lin is a very smart boy with loving parents. Although he and his parents are shunned by the rest of their relatives, his parents always held high hopes that he would one day become a great cultivator. Through sheer determination, perseverance, and possessing the mysterious Heaven-Defying Bead, Wang Lin embarks on the brutal, blood-soaked path of cultivation to defy the heavens themselves.",
        "poster_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.ONGOING,
        "studio": "Foch Film / Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Monday",
        "heat_score": 98500,
        "type": AnimeType.DONGHUA,
        "is_featured": True,
        "is_trending": True,
        "genres": ["xianxia", "cultivation", "action", "adventure"],
        "episodes": 12,
        "view_count": 4850000,
        "rating": 4.9,
    },
    {
        "title": "Perfect World",
        "slug": "perfect-world",
        "alt_title": "完美世界 (Wanmei Shijie)",
        "description": "Born into a unique world where villages fight for survival and celestial beasts roam the continents, Shi Hao is a prodigy blessed by the heavens, yet stripped of his Supreme Being Bone in early childhood. Rising from the humble Stone Village with an indomitable spirit, Shi Hao cultivates boundless power to reclaim what was stolen and shake the vast universe.",
        "poster_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=900&fit=crop&q=80",
        "year": 2021,
        "status": AnimeStatus.ONGOING,
        "studio": "Foch Film / Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Friday",
        "heat_score": 96200,
        "type": AnimeType.DONGHUA,
        "is_featured": True,
        "is_trending": True,
        "genres": ["xuanhuan", "cultivation", "action", "fantasy"],
        "episodes": 10,
        "view_count": 6200000,
        "rating": 4.8,
    },
    {
        "title": "A Record of a Mortal's Journey to Immortality",
        "slug": "a-record-of-a-mortals-journey-to-immortality",
        "alt_title": "凡人修仙传 (Fanren Xiu Xian Chuan)",
        "description": "Han Li, an ordinary poor boy from a rural village, accidentally joins a minor sect. Despite having common spiritual roots and facing lethal treachery at every corner, Han Li uses his extraordinary cautiousness, intellect, and the mysterious Little Green Bottle to survive deadly cultivation sects and forge a path toward true immortality.",
        "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&h=900&fit=crop&q=80",
        "year": 2020,
        "status": AnimeStatus.ONGOING,
        "studio": "Original Force / Bilibili",
        "country": "China",
        "airing_day": "Saturday",
        "heat_score": 97800,
        "type": AnimeType.DONGHUA,
        "is_featured": True,
        "is_trending": True,
        "genres": ["xianxia", "cultivation", "action", "adventure"],
        "episodes": 10,
        "view_count": 5900000,
        "rating": 4.9,
    },
    {
        "title": "Battle Through the Heavens",
        "slug": "battle-through-the-heavens",
        "alt_title": "斗破苍穹 (Doupo Cangqiong)",
        "description": "In a land where strength dictates respect and no magic exists, Xiao Yan was once a legendary prodigy. Suddenly, at the age of ten, he lost all his powers and became the laughingstock of his clan. When he discovers the spirit of Yao Chen residing within his mother's ring, Xiao Yan's journey to conquer Heavenly Flames and conquer the Dou Qi continent begins.",
        "poster_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&h=900&fit=crop&q=80",
        "year": 2017,
        "status": AnimeStatus.ONGOING,
        "studio": "Motion Magic / Tencent Penguin Pictures",
        "country": "China",
        "airing_day": "Sunday",
        "heat_score": 95400,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": True,
        "genres": ["xuanhuan", "cultivation", "action", "fantasy"],
        "episodes": 8,
        "view_count": 7800000,
        "rating": 4.8,
    },
    {
        "title": "Soul Land II: The Peerless Tang Clan",
        "slug": "soul-land-2-the-peerless-tang-clan",
        "alt_title": "斗罗大陆II绝世唐门 (Jueshi Tangmen)",
        "description": "Ten thousand years after the founding of the Tang Sect on the Douluo Continent, the once glorious clan is on the brink of extinction. Huo Yuhao, a young boy bearing immense grief and the million-year Spirit Soul Skydream Iceworm, enters Shrek Academy with determination to revive the legendary Tang Sect.",
        "poster_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.ONGOING,
        "studio": "Sparkly Key Animation / Tencent",
        "country": "China",
        "airing_day": "Saturday",
        "heat_score": 94200,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": True,
        "genres": ["fantasy", "action", "adventure", "romance"],
        "episodes": 8,
        "view_count": 6800000,
        "rating": 4.7,
    },
    {
        "title": "Shrouding the Heavens",
        "slug": "shrouding-the-heavens",
        "alt_title": "遮天 (Zhe Tian)",
        "description": "Nine gigantic dragon corpses pulling an ancient bronze coffin descend from the depths of the icy cosmos onto Mount Tai. Ye Fan and his classmates are transported across the galaxy into the Big Dipper Ancient Star, stepping into an ancient cultivation world overflowing with celestial emperors, ancient forbidden lands, and sacred grounds.",
        "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.ONGOING,
        "studio": "Sparkly Key Animation / Tencent",
        "country": "China",
        "airing_day": "Wednesday",
        "heat_score": 93100,
        "type": AnimeType.DONGHUA,
        "is_featured": True,
        "is_trending": True,
        "genres": ["xuanhuan", "cultivation", "action", "sci-fi"],
        "episodes": 8,
        "view_count": 4200000,
        "rating": 4.7,
    },
    {
        "title": "Swallowed Star",
        "slug": "swallowed-star",
        "alt_title": "吞噬星空 (Tunshi Xingkong)",
        "description": "Following the Great Nirvana Period caused by the deadly RR virus, terrifying mutated beasts ravage Earth. Luo Feng awakens his superhuman psychic ability and joins the Dojo of Limits. Striving beyond Earth's atmosphere, he rises into a cosmic powerhouse defending humankind against interstellar leviathans.",
        "poster_url": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&h=900&fit=crop&q=80",
        "year": 2020,
        "status": AnimeStatus.ONGOING,
        "studio": "Sparkly Key Animation / Tencent",
        "country": "China",
        "airing_day": "Tuesday",
        "heat_score": 91800,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": True,
        "genres": ["sci-fi", "action", "cultivation", "adventure"],
        "episodes": 8,
        "view_count": 5100000,
        "rating": 4.8,
    },
    {
        "title": "A Will Eternal",
        "slug": "a-will-eternal",
        "alt_title": "一念永恒 (Yi Nian Yong Heng)",
        "description": "Bai Xiaochun, a cheeky, cowardly, but endearing young man, is driven by one supreme goal: immortality! Armed with a fear of death and a knack for creating comical sect-wide disasters, his unorthodox approach to pill refining and martial arts sparks legend across the River-Defying Sect.",
        "poster_url": "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&h=900&fit=crop&q=80",
        "year": 2020,
        "status": AnimeStatus.ONGOING,
        "studio": "B.CMAY PICTURES / Tencent",
        "country": "China",
        "airing_day": "Thursday",
        "heat_score": 89400,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": False,
        "genres": ["comedy", "xianxia", "cultivation", "action"],
        "episodes": 8,
        "view_count": 3800000,
        "rating": 4.8,
    },
    {
        "title": "Big Brother",
        "slug": "big-brother",
        "alt_title": "师兄啊师兄 (Shixiong A Shixiong)",
        "description": "Reincarnated into the pre-God-conferment mythological era, Li Changshou has only one philosophy: stay low, plan for 99 back-up plans, and never make enemies. Yet the more he tries to avoid karma and live a peaceful life as the cautious senior brother of Duoxian Peak, the deeper he gets entangled in heavenly schemes.",
        "poster_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.ONGOING,
        "studio": "Sparkly Key Animation / Youku",
        "country": "China",
        "airing_day": "Thursday",
        "heat_score": 88700,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": True,
        "genres": ["comedy", "xianxia", "cultivation", "fantasy"],
        "episodes": 8,
        "view_count": 3400000,
        "rating": 4.8,
    },
    {
        "title": "Against the Gods",
        "slug": "against-the-gods",
        "alt_title": "逆天邪神 (Ni Tian Xie Shen)",
        "description": "Wielding the Sky Poison Pearl and reincarnated into the body of the crippled Xiao Che on the Profound Sky Continent, Yun Che awakens the Heretic God's veins. Defying destiny and confronting celestial emperors, he carves his wrath across heaven and earth.",
        "poster_url": "https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.ONGOING,
        "studio": "Foch Film / iQIYI",
        "country": "China",
        "airing_day": "Sunday",
        "heat_score": 87500,
        "type": AnimeType.DONGHUA,
        "is_featured": False,
        "is_trending": False,
        "genres": ["xuanhuan", "cultivation", "action", "romance"],
        "episodes": 8,
        "view_count": 2900000,
        "rating": 4.6,
    },
]

# Authentic Real Anime Library
ANIME_LIST = [
    {
        "title": "Solo Leveling",
        "slug": "solo-leveling",
        "alt_title": "Ore dake Level Up na Ken",
        "description": "In a world where hunters must battle deadly monsters from dimensional gates, Sung Jin-Woo is the weakest of them all. After surviving an impossible double dungeon, Jin-Woo awakens a mysterious quest window that allows only him to level up endlessly.",
        "poster_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&h=900&fit=crop&q=80",
        "year": 2024,
        "status": AnimeStatus.COMPLETED,
        "studio": "A-1 Pictures",
        "country": "Japan",
        "airing_day": "Saturday",
        "heat_score": 99200,
        "type": AnimeType.ANIME,
        "is_featured": True,
        "is_trending": True,
        "genres": ["action", "fantasy", "adventure"],
        "episodes": 12,
        "view_count": 8900000,
        "rating": 4.9,
    },
    {
        "title": "Frieren: Beyond Journey's End",
        "slug": "frieren-beyond-journeys-end",
        "alt_title": "Sousou no Frieren",
        "description": "The Demon King has been defeated, and the victorious hero party disbands. Decades later, the elven mage Frieren witnesses the passing of her mortal companions. Embarking on a new journey to understand humanity, Frieren discovers the bittersweet value of mortal time.",
        "poster_url": "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.COMPLETED,
        "studio": "Madhouse",
        "country": "Japan",
        "airing_day": "Friday",
        "heat_score": 98100,
        "type": AnimeType.ANIME,
        "is_featured": False,
        "is_trending": True,
        "genres": ["adventure", "drama", "fantasy"],
        "episodes": 10,
        "view_count": 7400000,
        "rating": 4.9,
    },
    {
        "title": "Jujutsu Kaisen Season 2",
        "slug": "jujutsu-kaisen-s2",
        "alt_title": "Shibuya Incident",
        "description": "The past and present collide as the tragic history between Satoru Gojo and Suguru Geto during their Jujutsu High days unfolds, leading directly into the cataclysmic Shibuya Incident.",
        "poster_url": "https://images.unsplash.com/photo-1601650239284-b879b2e22f5a?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1601650239284-b879b2e22f5a?w=1600&h=900&fit=crop&q=80",
        "year": 2023,
        "status": AnimeStatus.COMPLETED,
        "studio": "MAPPA",
        "country": "Japan",
        "airing_day": "Thursday",
        "heat_score": 97400,
        "type": AnimeType.ANIME,
        "is_featured": False,
        "is_trending": True,
        "genres": ["action", "supernatural", "shounen"],
        "episodes": 10,
        "view_count": 8100000,
        "rating": 4.8,
    },
    {
        "title": "Demon Slayer: Hashira Training Arc",
        "slug": "demon-slayer-hashira-training",
        "alt_title": "Kimetsu no Yaiba",
        "description": "Tanjiro visits Stone Hashira Himejima to prepare for the looming final battle against Muzan Kibutsuji. The Hashiras conduct grueling training for the entire Demon Slayer Corps.",
        "poster_url": "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=600&h=900&fit=crop&q=80",
        "banner_url": "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=1600&h=900&fit=crop&q=80",
        "year": 2024,
        "status": AnimeStatus.COMPLETED,
        "studio": "ufotable",
        "country": "Japan",
        "airing_day": "Sunday",
        "heat_score": 96900,
        "type": AnimeType.ANIME,
        "is_featured": False,
        "is_trending": True,
        "genres": ["action", "historical", "shounen"],
        "episodes": 8,
        "view_count": 7900000,
        "rating": 4.8,
    },
]

# Sample Danmaku bullet comments to populate
SAMPLE_DANMAKU = [
    {"text": "WANG LIN IS THE TRUE GOAT OF CULTIVATION!", "time": 5.2, "color": "#a855f7", "pos": "scroll"},
    {"text": "The animation quality this season is god tier!!", "time": 12.0, "color": "#38bdf8", "pos": "scroll"},
]

import os
import json
from datetime import datetime

async def seed_database():
    print("[*] Initializing tables...")
    await init_db()

    export_path = os.path.join(os.path.dirname(__file__), "seed_export.json")

    # Check Cloudflare R2 Offsite Backup for latest remote state
    try:
        from app.services.r2_backup_service import fetch_latest_backup_from_r2_sync
        r2_backup = fetch_latest_backup_from_r2_sync()
        if r2_backup and len(r2_backup.get("anime", [])) > 0:
            local_anime_count = 0
            if os.path.exists(export_path):
                try:
                    with open(export_path, "r", encoding="utf-8") as f:
                        local_anime_count = len(json.load(f).get("anime", []))
                except Exception:
                    pass
            if len(r2_backup.get("anime", [])) >= local_anime_count:
                print(f"[*] Found cloud R2 backup with {len(r2_backup.get('anime', []))} anime and {len(r2_backup.get('episodes', []))} episodes. Restoring into local seed...")
                with open(export_path, "w", encoding="utf-8") as f:
                    json.dump(r2_backup, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[*] Cloud R2 sync on startup notice: {e}")

    if os.path.exists(export_path):
        with open(export_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"[*] Found seed_export.json. Syncing complete database ({len(data.get('anime', []))} titles, {len(data.get('episodes', []))} episodes, {len(data.get('users', []))} users)...")

        async with AsyncSessionLocal() as db:
            # 1. Genres
            existing_genres_res = await db.execute(select(Genre))
            existing_genres = {g.id: g for g in existing_genres_res.scalars().all()}
            for g_data in data.get("genres", []):
                if g_data["id"] not in existing_genres:
                    g = Genre(id=g_data["id"], name=g_data["name"], slug=g_data["slug"])
                    db.add(g)
            await db.flush()

            # 2. Seed All Users from seed_export.json
            existing_users_res = await db.execute(select(User))
            existing_users = {u.username.lower(): u for u in existing_users_res.scalars().all()}
            existing_emails = {u.email.lower(): u for u in existing_users.values() if u.email}

            for u_data in data.get("users", []):
                u_uname = (u_data.get("username") or "").strip().lower()
                u_email = (u_data.get("email") or "").strip().lower()
                
                matched_user = existing_users.get(u_uname) or existing_emails.get(u_email)
                if not matched_user:
                    role_str = u_data.get("role", "USER")
                    try:
                        role_val = UserRole(role_str)
                    except Exception:
                        role_val = UserRole.USER

                    new_user = User(
                        username=u_data["username"],
                        email=u_data["email"],
                        password_hash=u_data.get("password_hash") or hash_password("User123!"),
                        role=role_val,
                        is_active=bool(u_data.get("is_active", True)),
                        is_verified=bool(u_data.get("is_verified", True)),
                        is_vip=bool(u_data.get("is_vip", False)),
                        vip_plan=u_data.get("vip_plan"),
                        avatar_url=u_data.get("avatar_url"),
                        telegram_id=str(u_data.get("telegram_id")) if u_data.get("telegram_id") else None,
                        telegram_username=u_data.get("telegram_username"),
                        login_source=u_data.get("login_source", "google"),
                    )
                    db.add(new_user)
                    existing_users[u_uname] = new_user
                    if u_email:
                        existing_emails[u_email] = new_user
                else:
                    if u_uname == "cheat_admin" or u_email == "cm5722254@gmail.com":
                        matched_user.role = UserRole.OWNER
                        matched_user.is_active = True
                        matched_user.is_verified = True
            await db.flush()

            # 3. Anime - Preserve all existing titles permanently (only deleted if admin explicitly deletes)
            existing_anime_res = await db.execute(select(Anime))
            all_existing_anime = existing_anime_res.scalars().all()
            existing_anime = {a.id: a for a in all_existing_anime}
            existing_slugs = {a.slug: a for a in all_existing_anime}
            for a_data in data.get("anime", []):
                aid = a_data["id"]
                slug = a_data["slug"]
                created_at_val = datetime.fromisoformat(a_data["created_at"]) if a_data.get("created_at") else datetime.utcnow()
                updated_at_val = datetime.fromisoformat(a_data["updated_at"]) if a_data.get("updated_at") else datetime.utcnow()
                
                status_val = AnimeStatus(a_data.get("status", "ONGOING"))
                type_val = AnimeType(a_data.get("type", "DONGHUA"))

                matched_anime = existing_anime.get(aid) or existing_slugs.get(slug)
                if matched_anime:
                    if a_data.get("title") and matched_anime.title != a_data["title"]:
                        matched_anime.title = a_data["title"]
                    if a_data.get("alt_title") and matched_anime.alt_title != a_data["alt_title"]:
                        matched_anime.alt_title = a_data["alt_title"]
                    db.add(matched_anime)
                else:
                    a = Anime(
                        id=aid,
                        title=a_data["title"],
                        slug=a_data["slug"],
                        alt_title=a_data.get("alt_title") or "",
                        description=a_data.get("description") or "",
                        poster_url=a_data.get("poster_url") or "",
                        banner_url=a_data.get("banner_url") or "",
                        trailer_url=a_data.get("trailer_url") or "",
                        year=a_data.get("year") or 2024,
                        status=status_val,
                        studio=a_data.get("studio") or "",
                        country=a_data.get("country") or "China",
                        airing_day=a_data.get("airing_day") or "Saturday",
                        heat_score=a_data.get("heat_score") or 85000,
                        type=type_val,
                        is_featured=bool(a_data.get("is_featured", False)),
                        is_trending=bool(a_data.get("is_trending", False)),
                        is_published=bool(a_data.get("is_published", True)),
                        view_count=a_data.get("view_count") or 0,
                        average_rating=a_data.get("average_rating") or 0.0,
                        rating_count=a_data.get("rating_count") or 0,
                        episode_count=a_data.get("episode_count") or 0,
                        created_at=created_at_val,
                        updated_at=updated_at_val,
                    )
                    db.add(a)
            await db.flush()

            # 4. Anime Genres
            existing_ag_res = await db.execute(select(anime_genres.c.anime_id, anime_genres.c.genre_id))
            existing_ag = set(existing_ag_res.all())
            for ag in data.get("anime_genres", []):
                pair = (ag["anime_id"], ag["genre_id"])
                if pair not in existing_ag:
                    await db.execute(anime_genres.insert().values(anime_id=ag["anime_id"], genre_id=ag["genre_id"]))
                    existing_ag.add(pair)
            await db.flush()

            # 5. Episodes
            existing_episodes_res = await db.execute(select(Episode))
            existing_episodes = {(e.anime_id, e.episode_number): e for e in existing_episodes_res.scalars().all()}
            for ep_data in data.get("episodes", []):
                key = (ep_data["anime_id"], ep_data["episode_number"])
                if key not in existing_episodes:
                    ep = Episode(
                        id=ep_data.get("id"),
                        anime_id=ep_data["anime_id"],
                        episode_number=ep_data["episode_number"],
                        title=ep_data.get("title") or f"Episode {ep_data['episode_number']}",
                        video_url=ep_data.get("video_url") or "",
                        duration_seconds=ep_data.get("duration_seconds") or 1440,
                        thumbnail_url=ep_data.get("thumbnail_url") or "",
                        is_published=bool(ep_data.get("is_published", True)),
                        view_count=ep_data.get("view_count") or 0,
                    )
                    db.add(ep)
            await db.flush()

            # 6. Banners
            existing_banners_res = await db.execute(select(Banner))
            existing_banner_ids = {b.id for b in existing_banners_res.scalars().all()}
            for b_data in data.get("banners", []):
                if b_data["id"] not in existing_banner_ids:
                    target_aid = b_data.get("anime_id")
                    if target_aid and target_aid not in existing_anime:
                        target_aid = None
                    b = Banner(
                        id=b_data["id"],
                        anime_id=target_aid,
                        title=b_data["title"],
                        subtitle=b_data.get("subtitle") or "",
                        image_url=b_data["image_url"],
                        link_url=b_data.get("link_url") or (f"/anime/{target_aid}" if target_aid else "#"),
                        is_active=bool(b_data.get("is_active", True)),
                        order_index=b_data.get("order_index") or 0,
                    )
                    db.add(b)

            await db.commit()
            print(f"[OK] Database sync complete: {len(data.get('anime', []))} titles and {len(data.get('episodes', []))} episodes!")

            try:
                from app.services.data_persistence import sync_database_to_export_json
                await sync_database_to_export_json()
            except Exception as e:
                print(f"[WARN] Error running post-sync backup: {e}")

            return

    # Fallback to standard seed if seed_export.json does not exist
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Genre).limit(1))
        if res.scalar_one_or_none():
            print("[INFO] Database already seeded. Skipping initial seed.")
            return

        print("[*] Seeding database with fallback authentic Donghua & Anime data...")
        genre_map = {}
        for g_data in GENRES:
            genre = Genre(name=g_data["name"], slug=g_data["slug"])
            db.add(genre)
            genre_map[g_data["slug"]] = genre
        await db.flush()

        owner_admin = User(
            username="cheat_admin",
            email="cm5722254@gmail.com",
            password_hash=hash_password("Admin123!"),
            role=UserRole.OWNER,
            is_active=True,
            is_verified=True,
        )
        db.add(owner_admin)
        await db.flush()
        await db.commit()
        print("[OK] Fallback database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
