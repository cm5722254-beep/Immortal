import json
import sys
import os
import asyncio
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import AsyncSessionLocal
from app.models.anime import Anime
from app.models.episode import Episode
from app.models.genre import Genre
from app.services.telegram_service import notify_new_episode
from sqlalchemy import select

backup_path = Path(r"d:\Merdonghua.com-main\namianime_full_backup_2026-08-31 (1).json")

async def main():
    if not backup_path.exists():
        print(f"Error: Backup file not found at {backup_path}")
        return

    with open(backup_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"📊 Loading backup file with {len(data.get('anime', []))} Anime and {len(data.get('episodes', []))} Episodes...")

    # 0. Also permanently sync master seed_export.json
    seed_export_file = Path(r"d:\Merdonghua.com-main\backend\app\services\seed_export.json")
    with open(seed_export_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("✅ Permanently updated backend seed_export.json with new backup!")

    async with AsyncSessionLocal() as db:
        # 1. Sync / update database with backup content
        from app.services.data_persistence import restore_data_from_dict
        print("💾 Merging and syncing backup content into database...")
        sync_result = await restore_data_from_dict(data)
        print("Sync result:", sync_result)

        # 2. Get all anime with their latest episodes from this backup
        anime_list = data.get("anime", [])
        episodes_list = data.get("episodes", [])

        # Group episodes by anime_id
        episodes_by_anime = {}
        for ep in episodes_list:
            aid = ep.get("anime_id")
            if aid not in episodes_by_anime:
                episodes_by_anime[aid] = []
            episodes_by_anime[aid].append(ep)

        print(f"\n🚀 Starting broadcast of latest episodes for all {len(anime_list)} anime...")

        sent_count = 0
        for idx, a_data in enumerate(anime_list, 1):
            aid = a_data.get("id")
            title = a_data.get("title", "")
            eps = episodes_by_anime.get(aid, [])
            if not eps:
                continue

            # Sort to get the highest episode number
            latest_ep = max(eps, key=lambda x: x.get("episode_number", 0))
            ep_num = latest_ep.get("episode_number")

            # Create dummy/model objects for telegram service
            class DummyAnime:
                pass
            class DummyEpisode:
                pass

            a_obj = DummyAnime()
            for k, v in a_data.items():
                setattr(a_obj, k, v)

            e_obj = DummyEpisode()
            for k, v in latest_ep.items():
                setattr(e_obj, k, v)

            print(f"[{idx}/{len(anime_list)}] ផ្ញើ: {title} (ភាគ {ep_num})...")
            results = await notify_new_episode(a_obj, e_obj)
            if results and results[0].get("ok"):
                sent_count += 1
                msg_id = results[0].get("result", {}).get("message_id")
                print(f"   ✅ ជោគជ័យ! Message ID: {msg_id}")
            else:
                print(f"   ⚠️ Result: {results}")

            await asyncio.sleep(1.0)

        print(f"\n🎉 ជោគជ័យ! បានផ្សាយភាគថ្មីៗសរុប {sent_count} ភាគ ពីឯកសារ Backup ចូល Telegram Group រួចរាល់!")

if __name__ == "__main__":
    asyncio.run(main())
