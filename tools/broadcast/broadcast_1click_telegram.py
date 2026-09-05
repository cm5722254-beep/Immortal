#!/usr/bin/env python3
"""
🎬 MER DONGHUA / NAMI ANIME — Website Notifications to Telegram Broadcast Tool
=============================================================================
Sends ONLY the new episodes from the Website's Notification Box (🔔 សេចក្តីជូនដំណឹង Website)
directly to Telegram group: https://t.me/+TS6IZI6unQ81M2Jl (-1003509251885)
"""

import os
import sys
import json
import time
import asyncio
from pathlib import Path

# Force UTF-8 encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.database import AsyncSessionLocal
from app.models.anime import Anime
from app.models.episode import Episode
from app.services.telegram_service import notify_new_episode, notify_new_anime
from sqlalchemy import select
from sqlalchemy.orm import selectinload

TARGET_GROUP_ID = "-1003509251885"

def print_banner():
    print("=" * 72)
    print("  🔔 MER DONGHUA — ផ្សាយតែភាគថ្មីក្នុងប្រអប់សារ WEBSITE ទៅ TELEGRAM")
    print("  📢 Target Group: https://t.me/+TS6IZI6unQ81M2Jl")
    print("  🤖 Notification Bot: @namianime_bot")
    print("=" * 72)

async def broadcast_website_notification_box(limit: int = 10, unique_series: bool = True):
    """Broadcast ONLY the new episodes currently appearing in the Website Notification Box."""
    print(f"\n⏳ កំពុងទាញយកភាគថ្មីៗពីប្រអប់សារសេចក្តីជូនដំណឹង Website (🔔 Notification Box)...")
    
    async with AsyncSessionLocal() as db:
        stmt = (
            select(Episode)
            .options(selectinload(Episode.anime))
            .where(Episode.is_published == True)
            .order_by(Episode.id.desc())
            .limit(limit * 2 if unique_series else limit)
        )
        res = await db.execute(stmt)
        episodes = res.scalars().all()

        if not episodes:
            print("⚠️ មិនមានភាគថ្មីក្នុងប្រអប់សារ Website ឡើយ!")
            return

        # Filter out episodes without anime or poster
        valid_episodes = []
        seen_anime_ids = set()

        for ep in episodes:
            if not ep.anime or not ep.anime.poster_url:
                continue
            if unique_series:
                if ep.anime_id in seen_anime_ids:
                    continue
                seen_anime_ids.add(ep.anime_id)
            valid_episodes.append(ep)
            if len(valid_episodes) >= limit:
                break

        print(f"📋 រកឃើញភាគថ្មីក្នុងប្រអប់សារ Website សរុប: {len(valid_episodes)} ភាគ")
        print("🚀 កំពុងចាប់ផ្តើមផ្សាយដំណឹងចូល Telegram Group ភ្លាមៗ...\n")

        sent_count = 0
        for idx, ep in enumerate(valid_episodes, 1):
            anime = ep.anime
            print(f"[{idx}/{len(valid_episodes)}] 🔔 {anime.title} (ភាគ {ep.episode_number}) ... ", end="", flush=True)
            results = await notify_new_episode(anime, ep)
            if results and results[0].get("ok"):
                sent_count += 1
                msg_id = results[0].get("result", {}).get("message_id")
                print(f"✅ ជោគជ័យ (Msg ID: {msg_id})")
            else:
                print(f"⚠️ បរាជ័យ")

            # Pause to avoid Telegram rate limits
            await asyncio.sleep(0.9)

        print("\n" + "=" * 72)
        print(f"🎉 ជោគជ័យពេញលេញ! បានផ្ញើ {sent_count} ភាគពីប្រអប់សារ Website ចូល Telegram រួចរាល់!")
        print("=" * 72)

async def test_connection():
    """Send a fast test message to verify connection."""
    print("\n⏳ កំពុងធ្វើតេស្តសញ្ញាភ្ជាប់ Telegram Bot...")
    from app.services.telegram_service import send_telegram_photo
    caption = (
        "🔔 <b>【 តេស្តប្រអប់សារ / NOTIFICATION BOX TEST 】</b>\n\n"
        "✅ <b>Telegram Bot Automation ដំណើរការល្អ ១០០%!</b>\n"
        "⚡️ ប្រព័ន្ធផ្សាយដំណឹងពីប្រអប់សារ Website ភ្ជាប់ត្រង់ជាមួយ Group នេះរួចរាល់។"
    )
    photo = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"
    res = await send_telegram_photo(photo, caption)
    if res and res[0].get("ok"):
        print("🎉 សញ្ញាភ្ជាប់ល្អឥតខ្ចោះ (Connection OK)! សារតេស្តបានលោតចូល Group រួចរាល់។")
    else:
        print("❌ បរាជ័យ:", res)

def main():
    print_banner()
    print("\n👉 សូមជ្រើសរើសជម្រើស (Choose an option):")
    print("  [1] 🔔 ផ្សាយតែភាគថ្មីៗក្នុងប្រអប់សារ Website (1-Click: Send Website Notification Box Episodes)")
    print("  [2] 📜 ផ្សាយគ្រប់ភាគថ្មីក្នុងប្រអប់សារ Website ទាំងអស់ (Send ALL without deduplicating)")
    print("  [3] 🧪 ធ្វើតេស្តសញ្ញាភ្ជាប់ Telegram (Test Connection)")
    print("  [0] ❌ ចាកចេញ (Exit)\n")

    choice = input("👉 បញ្ចូលលេខជម្រើស (1/2/3/0) [Default: 1]: ").strip() or "1"

    if choice == "1":
        asyncio.run(broadcast_website_notification_box(limit=10, unique_series=True))
    elif choice == "2":
        asyncio.run(broadcast_website_notification_box(limit=10, unique_series=False))
    elif choice == "3":
        asyncio.run(test_connection())
    else:
        print("👋 អរគុណ!")

if __name__ == "__main__":
    main()
