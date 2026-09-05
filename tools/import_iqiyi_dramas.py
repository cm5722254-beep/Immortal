#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Import Top iQIYI C-Dramas & K-Dramas
=====================================================
Populates the 'Drama (រឿងភាគចិន/កូរ៉េ)' section with top trending
iQIYI drama series, complete with posters, banners, and streaming episodes!
"""

import os
import sys
import json
import re
import urllib.request
from typing import Dict, List, Any, Optional

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

API_BASE = os.getenv("API_BASE_URL", "https://merdonghua-com.onrender.com/api").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "cm5722254@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

DRAMAS = [
    {
        "title": "ចំណងស្នេហ៍អាទិទេព និងផ្កា",
        "alt_title": "Love Between Fairy and Devil (苍兰诀)",
        "slug": "love-between-fairy-and-devil",
        "description": "រឿងភាគចិនមនោសញ្ចេតនាលំដាប់កំពូលពី iQIYI រវាងស្ដេចបិសាច Dongfang Qingcang និងទេពអប្សរផ្កា Xiao Lanhua។ ទស្សនាកម្រិត 4K UHD លើ Mer Donghua",
        "poster_url": "https://i.pinimg.com/736x/89/3e/16/893e164c05e197c36a4694fc81961ec9.jpg",
        "banner_url": "https://i.pinimg.com/1200x/23/07/ee/2307eee10b3ef7753664d4b29bb88ef2.jpg",
        "year": 2022,
        "studio": "iQIYI / Stellar Pictures",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/love-between-fairy/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/love-between-fairy/Ep_002.mp4"},
            {"episode_number": 3, "title": "ភាគ 3", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/love-between-fairy/Ep_003.mp4"}
        ]
    },
    {
        "title": "ក្តីសុបិនវិមានឃុននីង",
        "alt_title": "Story of Kunning Palace (宁安如梦)",
        "slug": "story-of-kunning-palace",
        "description": "រឿងភាគបុរាណចិនដ៏ល្បីល្បាញពី iQIYI ដឹកនាំសម្តែងដោយ Bai Lu និង Zhang Linghe។ ទស្សនាកម្រិត 4K UHD",
        "poster_url": "https://i.pinimg.com/736x/21/df/b6/21dfb68997ef31cfad881d77b8f9e011.jpg",
        "banner_url": "https://i.pinimg.com/1200x/bc/52/63/bc52636f32e93b167a544c0ee1ba3c73.jpg",
        "year": 2023,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/kunning-palace/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/kunning-palace/Ep_002.mp4"}
        ]
    },
    {
        "title": "អាថ៌កំបាំងផ្ទះផ្កាឈូក",
        "alt_title": "Mysterious Lotus Casebook (莲花楼)",
        "slug": "mysterious-lotus-casebook",
        "description": "រឿងភាគក្បាច់គុណស៊ើបអង្កេតអាថ៌កំបាំងលំដាប់កំពូលពី iQIYI សម្តែងដោយ Cheng Yi។ ទស្សនាកម្រិត 4K UHD",
        "poster_url": "https://i.pinimg.com/736x/80/7e/61/807e617d5c5f87b8d7ef2e0c0df4e67d.jpg",
        "banner_url": "https://i.pinimg.com/1200x/77/89/a3/7789a3f9050d24bf51fe8365f57ff0e8.jpg",
        "year": 2023,
        "studio": "iQIYI / H&R Century",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/lotus-casebook/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/lotus-casebook/Ep_002.mp4"}
        ]
    },
    {
        "title": "វាសនាស្នេហ៍ខ្យល់បក់",
        "alt_title": "Destined (长风渡)",
        "slug": "destined",
        "description": "រឿងភាគចិនបុរាណស្នេហា និងពាណិជ្ជកម្មកំពូលពី iQIYI សម្តែងដោយ Bai Jingting & Song Yi។",
        "poster_url": "https://i.pinimg.com/736x/01/be/df/01bedf7a1f5923cb118a804791ee3083.jpg",
        "banner_url": "https://i.pinimg.com/1200x/66/1b/fb/661bfb48b9487c603bce36c7e2b79a55.jpg",
        "year": 2023,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/destined/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/destined/Ep_002.mp4"}
        ]
    },
    {
        "title": "ខ្យល់កួចស្នេហា",
        "alt_title": "My Journey to You (云之羽)",
        "slug": "my-journey-to-you",
        "description": "រឿងភាគចិនបែបចារកម្ម ឃាតករ និងស្នេហាដ៏រំជួលចិត្តពី iQIYI សម្តែងដោយ Yu Shuxin & Zhang Linghe។",
        "poster_url": "https://i.pinimg.com/736x/e6/5d/79/e65d7945d8b7470f7d5ca47c0b05b451.jpg",
        "banner_url": "https://i.pinimg.com/1200x/49/a0/0a/49a00ac82e6d51c33eb3207eb58db0eb.jpg",
        "year": 2023,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/journey-to-you/Ep_001.mp4"}
        ]
    },
    {
        "title": "ជីវិតថ្មីចាប់ផ្តើម",
        "alt_title": "New Life Begins (卿卿日常)",
        "slug": "new-life-begins",
        "description": "រឿងភាគចិនកំប្លែង និងមនោសញ្ចេតនាដ៏កក់ក្តៅពី iQIYI សម្តែងដោយ Bai Jingting & Tian Xiwei។",
        "poster_url": "https://i.pinimg.com/736x/a2/4f/73/a24f7389148d531a61362e457cb14197.jpg",
        "banner_url": "https://i.pinimg.com/1200x/0b/49/e8/0b49e88bf99da0503027b407137f6a73.jpg",
        "year": 2022,
        "studio": "iQIYI / New Classics Media",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/new-life-begins/Ep_001.mp4"}
        ]
    },
    {
        "title": "ស្នេហ៍និរន្តរ៍ ចូវសឹងរូគូ",
        "alt_title": "One and Only (周生如故)",
        "slug": "one-and-only",
        "description": "រឿងភាគចិនមនោសញ្ចេតនាស្នេហ៍កំសត់ដ៏ល្បីពី iQIYI សម្តែងដោយ Ren Jialun និង Bai Lu។",
        "poster_url": "https://i.pinimg.com/736x/8b/cb/db/8bcbdb46237b67876a3e6f98aeae150b.jpg",
        "banner_url": "https://i.pinimg.com/1200x/c1/9d/23/c19d233e7b26c7104b2b6cb08c792440.jpg",
        "year": 2021,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/one-and-only/Ep_001.mp4"}
        ]
    },
    {
        "title": "មួយជីវិតមួយដួងចិត្ត",
        "alt_title": "Forever and Ever (一生一世)",
        "slug": "forever-and-ever",
        "description": "ភាគបន្តសម័យទំនើបនៃ One and Only ពី iQIYI សម្តែងដោយ Ren Jialun & Bai Lu។",
        "poster_url": "https://i.pinimg.com/736x/31/3e/26/313e26cf8d451cb52ae7ffda55e1a3bc.jpg",
        "banner_url": "https://i.pinimg.com/1200x/36/45/be/3645beeefcfcfb3ea1e70e9a56012695.jpg",
        "year": 2021,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/forever-and-ever/Ep_001.mp4"}
        ]
    },
    {
        "title": "រហូតដល់ចុងបញ្ចប់នៃព្រះចន្ទ",
        "alt_title": "Till The End of The Moon (长月烬明)",
        "slug": "till-the-end-of-the-moon",
        "description": "រឿងភាគទេវកថាកំពូលមហស្ចារ្យ សម្តែងដោយ Luo Yunxi និង Bai Lu។ ទស្សនាកម្រិត 4K UHD",
        "poster_url": "https://i.pinimg.com/736x/77/82/1a/77821a7199cbcfb0a8801947a1ffdae9.jpg",
        "banner_url": "https://i.pinimg.com/1200x/90/e1/9b/90e19bb4421b44ec94d84f8bb64f89d3.jpg",
        "year": 2023,
        "studio": "Youku / iQIYI",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/till-the-end-of-the-moon/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/till-the-end-of-the-moon/Ep_002.mp4"}
        ]
    },
    {
        "title": "ព្យុះសង្គ្រាម 狂飙",
        "alt_title": "The Knockout (狂飙)",
        "slug": "the-knockout",
        "description": "រឿងភាគចិនស៊ើបអង្កេតឧក្រិដ្ឋកម្មបំបែកកំណត់ត្រាអ្នកទស្សនាច្រើនជាងគេបំផុតគ្រប់ជំនាន់របស់ iQIYI!",
        "poster_url": "https://i.pinimg.com/736x/6d/2c/ce/6d2cce7747e9b0c793ffceb86b46487e.jpg",
        "banner_url": "https://i.pinimg.com/1200x/4e/d3/18/4ed318a666e857fe05f56b2c2c019970.jpg",
        "year": 2023,
        "studio": "iQIYI Original",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/the-knockout/Ep_001.mp4"}
        ]
    },
    {
        "title": "ព្រលឹងកញ្ជ្រោងស្នេហ៍",
        "alt_title": "Fox Spirit Matchmaker: Red-Moon Pact (狐妖小红娘·月红篇)",
        "slug": "fox-spirit-matchmaker",
        "description": "រឿងភាគទេវកថាកំពូលពី iQIYI សម្តែងដោយ Yang Mi និង Gong Jun។ ទស្សនាកម្រិត 4K UHD",
        "poster_url": "https://i.pinimg.com/736x/e4/f0/73/e4f073289069d300f89839446f2ee856.jpg",
        "banner_url": "https://i.pinimg.com/1200x/ea/a3/98/eaa398cf2925235805bb5f763aa87ce9.jpg",
        "year": 2024,
        "studio": "iQIYI / Tencent Pictures",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/fox-spirit/Ep_001.mp4"}
        ]
    },
    {
        "title": "ទឹកភ្នែករាជនី",
        "alt_title": "Queen of Tears (눈물의 여왕)",
        "slug": "queen-of-tears",
        "description": "រឿងភាគកូរ៉េដ៏ល្បីល្បាញប្រចាំឆ្នាំ សម្តែងដោយ Kim Soo-hyun និង Kim Ji-won។ ទស្សនាកម្រិត 1080p Full HD",
        "poster_url": "https://i.pinimg.com/736x/88/44/0d/88440d9cb5ba74dbcc33bc7b719ba111.jpg",
        "banner_url": "https://i.pinimg.com/1200x/c7/c9/79/c7c979e2c608b49e29a997235a90e386.jpg",
        "year": 2024,
        "studio": "Studio Dragon",
        "country": "Korea",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/queen-of-tears/Ep_001.mp4"},
            {"episode_number": 2, "title": "ភាគ 2", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/queen-of-tears/Ep_002.mp4"}
        ]
    },
    {
        "title": "ស្នេហាឆ្លងដែន",
        "alt_title": "Crash Landing on You (사랑의 불시착)",
        "slug": "crash-landing-on-you",
        "description": "រឿងភាគកូរ៉េមនោសញ្ចេតនាកំពូល សម្តែងដោយ Hyun Bin និង Son Ye-jin។ ទស្សនាកម្រិត 1080p",
        "poster_url": "https://i.pinimg.com/736x/55/a1/ec/55a1ec093fc4d01b1cb9ae9fc4b5952d.jpg",
        "banner_url": "https://i.pinimg.com/1200x/e0/75/a2/e075a22830f367fa12cb1362ad79d46f.jpg",
        "year": 2019,
        "studio": "Studio Dragon",
        "country": "Korea",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/crash-landing/Ep_001.mp4"}
        ]
    },
    {
        "title": "បេសកកម្មស្នេហ៍ក្រោមពន្លឺព្រះអាទិត្យ",
        "alt_title": "Descendants of the Sun (태양의 후예)",
        "slug": "descendants-of-the-sun",
        "description": "រឿងភាគកូរ៉េដ៏ល្បីល្បាញទូទាំងអាស៊ី សម្តែងដោយ Song Joong-ki និង Song Hye-kyo។",
        "poster_url": "https://i.pinimg.com/736x/eb/7e/15/eb7e155c8f85f36e4f35a4b413009403.jpg",
        "banner_url": "https://i.pinimg.com/1200x/f1/8c/fa/f18cfa5e2d1eb7a08b3c3756cfad9498.jpg",
        "year": 2016,
        "studio": "KBS Drama",
        "country": "Korea",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/descendants-of-the-sun/Ep_001.mp4"}
        ]
    },
    {
        "title": "លួចស្រលាញ់",
        "alt_title": "Hidden Love (偷偷藏不住)",
        "slug": "hidden-love",
        "description": "រឿងភាគមនោសញ្ចេតនាយុវវ័យដ៏ផ្អែមល្ហែម សម្តែងដោយ Zhao Lusi និង Chen Zheyuan។",
        "poster_url": "https://i.pinimg.com/736x/80/f7/32/80f732454b68e99a8ea3f35fe99fec36.jpg",
        "banner_url": "https://i.pinimg.com/1200x/a4/bc/d0/a4bcd0ae567634fef94c653f5cf7b713.jpg",
        "year": 2023,
        "studio": "Wajijiwa Entertainment",
        "country": "China",
        "episodes": [
            {"episode_number": 1, "title": "ភាគ 1", "video_url": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episodes/hidden-love/Ep_001.mp4"}
        ]
    }
]


def login() -> Optional[str]:
    login_url = f"{API_BASE}/auth/login"
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode('utf-8')
    req = urllib.request.Request(
        login_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get("access_token")
    except Exception as e:
        print(f"❌ Admin login failed: {e}")
        return None


def fetch_all_anime() -> List[Dict[str, Any]]:
    url = f"{API_BASE}/anime?page=1&per_page=100"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get("items", []) if isinstance(data, dict) else data
    except Exception:
        return []


def create_or_update_drama(token: str, drama_data: Dict[str, Any], existing_list: List[Dict[str, Any]]) -> Optional[int]:
    title = drama_data["title"]
    slug = drama_data["slug"]
    alt_title = drama_data.get("alt_title", "")

    # Check if exists
    for a in existing_list:
        if a.get("slug") == slug or a.get("title").lower() == title.lower():
            print(f"   ℹ️ Drama '{title}' already exists (ID: {a['id']})")
            return a["id"]

    # Create new drama
    url = f"{API_BASE}/anime"
    payload = {
        "title": title,
        "slug": slug,
        "alt_title": alt_title,
        "description": drama_data.get("description", f"ទស្សនារឿង {title} កម្រិត 4K UHD លើ Mer Donghua"),
        "poster_url": drama_data["poster_url"],
        "banner_url": drama_data["banner_url"],
        "trailer_url": "",
        "type": "DRAMA",  # 🎭 DRAMA Type
        "status": "ONGOING",
        "is_free": True,
        "is_published": True,
        "heat_score": 98000,
        "year": drama_data.get("year", 2024),
        "studio": drama_data.get("studio", "iQIYI Original"),
        "country": drama_data.get("country", "China"),
        "airing_day": "Friday",
        "genre_ids": []
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}", "User-Agent": USER_AGENT},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            created = json.loads(res.read().decode('utf-8'))
            anime_id = created.get("id")
            print(f"   ✨ Created Drama: '{title}' (ID: {anime_id})")
            return anime_id
    except Exception as e:
        print(f"   ❌ Failed to create drama '{title}': {e}")
        return None


def import_episode(token: str, anime_id: int, ep_num: int, video_url: str, title: str, thumb: str) -> bool:
    url = f"{API_BASE}/episodes"
    payload = {
        "anime_id": anime_id,
        "episode_number": ep_num,
        "title": title,
        "video_url": video_url,
        "thumbnail_url": thumb,
        "duration_seconds": 2700,
        "is_published": True,
        "is_vip_only": False
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}", "User-Agent": USER_AGENT},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.status in (200, 201, 204)
    except Exception as e:
        return False


def main():
    print("=" * 75)
    print(" 🎬 MER DONGHUA — IMPORT TOP iQIYI DRAMAS (រឿងភាគចិន/កូរ៉េ)")
    print(" 🎭 បញ្ចូលរឿងភាគចិន និងកូរ៉េពី iQIYI ចូលទៅក្នុងផ្ទាំង Drama")
    print("=" * 75)

    token = login()
    if not token:
        return

    print("📡 កំពុងទាញយកបញ្ជីរឿងដែលមានស្រាប់...")
    existing = fetch_all_anime()

    total_dramas_added = 0
    total_eps = 0

    for idx, drama in enumerate(DRAMAS, 1):
        print(f"\n[{idx}/{len(DRAMAS)}] 🎭 {drama['title']} ({drama['alt_title']})")
        anime_id = create_or_update_drama(token, drama, existing)
        if not anime_id:
            continue

        total_dramas_added += 1
        for ep in drama.get("episodes", []):
            ep_num = ep["episode_number"]
            v_url = ep["video_url"]
            ep_title = ep["title"]
            thumb = drama["poster_url"]
            if import_episode(token, anime_id, ep_num, v_url, ep_title, thumb):
                total_eps += 1

    print("\n" + "=" * 75)
    print(f"🎉 ជោគជ័យ! បានបញ្ចូលរឿងភាគ Drama សរុប: {total_dramas_added} រឿង និង {total_eps} ភាគ!")
    print("=" * 75)


if __name__ == "__main__":
    main()
