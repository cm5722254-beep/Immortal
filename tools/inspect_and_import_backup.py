import json
import sqlite3
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backup_file = os.path.join(base_dir, "namianime_full_backup_2026-08-31.json")
seed_file = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
db_file = os.path.join(base_dir, "backend", "merdonghua.db")

with open(backup_file, "r", encoding="utf-8") as f:
    backup = json.load(f)

with open(seed_file, "r", encoding="utf-8") as f:
    seed = json.load(f)

backup_anime = backup.get("anime", [])
backup_episodes = backup.get("episodes", [])
seed_anime = seed.get("anime", [])
seed_episodes = seed.get("episodes", [])

print(f"📦 Backup file: {len(backup_anime)} anime, {len(backup_episodes)} episodes")
print(f"🌱 Current Seed: {len(seed_anime)} anime, {len(seed_episodes)} episodes")

seed_slugs = {a.get("slug") for a in seed_anime if a.get("slug")}
seed_titles = {a.get("title") for a in seed_anime if a.get("title")}
seed_ids = {a.get("id") for a in seed_anime if a.get("id")}

new_anime = []
for a in backup_anime:
    if a.get("slug") not in seed_slugs and a.get("title") not in seed_titles:
        new_anime.append(a)

print(f"✨ New anime in backup: {len(new_anime)}")
for na in new_anime:
    print(f" - [{na.get('id')}] {na.get('title')} ({na.get('slug')})")

seed_ep_keys = {(ep.get("anime_id"), ep.get("episode_number")) for ep in seed_episodes}
new_episodes = []
for ep in backup_episodes:
    if (ep.get("anime_id"), ep.get("episode_number")) not in seed_ep_keys:
        new_episodes.append(ep)

print(f"🎬 New episodes in backup: {len(new_episodes)}")
for nep in new_episodes[:10]:
    print(f" - Anime ID {nep.get('anime_id')}, EP {nep.get('episode_number')}: {nep.get('title')} -> {nep.get('video_url')}")
