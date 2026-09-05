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
    backup_data = json.load(f)

with open(seed_file, "r", encoding="utf-8") as f:
    seed_data = json.load(f)

backup_anime = {a["id"]: a for a in backup_data.get("anime", [])}
seed_anime = {a["id"]: a for a in seed_data.get("anime", [])}

# 1. Update or Add Anime
added_anime_count = 0
updated_anime_count = 0

for b_id, b_a in backup_anime.items():
    if b_id in seed_anime:
        # Check if video/poster/fields are richer
        s_a = seed_anime[b_id]
        if not s_a.get("poster_url") and b_a.get("poster_url"):
            s_a["poster_url"] = b_a["poster_url"]
            updated_anime_count += 1
        if not s_a.get("banner_url") and b_a.get("banner_url"):
            s_a["banner_url"] = b_a["banner_url"]
            updated_anime_count += 1
    else:
        seed_data["anime"].append(b_a)
        seed_anime[b_id] = b_a
        added_anime_count += 1

# 2. Merge Episodes
seed_ep_dict = {(ep["anime_id"], ep["episode_number"]): ep for ep in seed_data.get("episodes", [])}
added_episodes_count = 0
updated_episodes_count = 0

for b_ep in backup_data.get("episodes", []):
    key = (b_ep["anime_id"], b_ep["episode_number"])
    if key in seed_ep_dict:
        s_ep = seed_ep_dict[key]
        # If backup has video_url and seed doesn't, update it
        if b_ep.get("video_url") and (not s_ep.get("video_url") or s_ep.get("video_url") != b_ep.get("video_url")):
            s_ep["video_url"] = b_ep["video_url"]
            if b_ep.get("duration_seconds"):
                s_ep["duration_seconds"] = b_ep["duration_seconds"]
            updated_episodes_count += 1
    else:
        # Assign unique id if needed
        max_id = max([ep.get("id", 0) for ep in seed_data.get("episodes", [])] or [0])
        new_ep = dict(b_ep)
        new_ep["id"] = max_id + 1
        seed_data["episodes"].append(new_ep)
        seed_ep_dict[key] = new_ep
        added_episodes_count += 1

# Recalculate anime episode_count
anime_ep_counts = {}
for ep in seed_data.get("episodes", []):
    aid = ep.get("anime_id")
    anime_ep_counts[aid] = anime_ep_counts.get(aid, 0) + 1

for a in seed_data.get("anime", []):
    a["episode_count"] = anime_ep_counts.get(a["id"], a.get("episode_count", 0))

# Save updated seed_export.json
with open(seed_file, "w", encoding="utf-8") as f:
    json.dump(seed_data, f, ensure_ascii=False, indent=2)

print(f"✅ Seed export updated:")
print(f"   - Anime added: {added_anime_count}, updated: {updated_anime_count}")
print(f"   - Episodes added: {added_episodes_count}, updated: {updated_episodes_count}")
print(f"   - Total Anime: {len(seed_data.get('anime', []))}")
print(f"   - Total Episodes: {len(seed_data.get('episodes', []))}")

# 3. Update SQLite Database
if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    
    # Insert or update episodes
    db_ep_inserted = 0
    db_ep_updated = 0
    for ep in seed_data.get("episodes", []):
        cur.execute(
            "SELECT id, video_url FROM episodes WHERE anime_id = ? AND episode_number = ?",
            (ep["anime_id"], ep["episode_number"])
        )
        row = cur.fetchone()
        if row:
            if ep.get("video_url") and row[1] != ep.get("video_url"):
                cur.execute(
                    "UPDATE episodes SET video_url = ?, duration_seconds = ? WHERE id = ?",
                    (ep.get("video_url"), ep.get("duration_seconds", 0), row[0])
                )
                db_ep_updated += 1
        else:
            cur.execute("""
                INSERT INTO episodes (
                    anime_id, episode_number, title, description, video_url,
                    subtitle_url, thumbnail_url, duration_seconds, is_published,
                    is_free, view_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                ep["anime_id"],
                ep["episode_number"],
                ep.get("title", f"Episode {ep['episode_number']}"),
                ep.get("description", ""),
                ep.get("video_url", ""),
                ep.get("subtitle_url", ""),
                ep.get("thumbnail_url", ""),
                ep.get("duration_seconds", 0),
                ep.get("is_published", True),
                ep.get("is_free", True),
                ep.get("view_count", 0)
            ))
            db_ep_inserted += 1

    # Update anime episode counts in DB
    for aid, count in anime_ep_counts.items():
        cur.execute("UPDATE anime SET episode_count = ? WHERE id = ?", (count, aid))

    conn.commit()
    print(f"💾 SQLite DB updated: {db_ep_inserted} episodes inserted, {db_ep_updated} updated.")
    conn.close()

# 4. Sync to Cloudflare R2
try:
    sys.path.insert(0, os.path.join(base_dir, "backend"))
    from app.services.r2_backup_service import upload_backup_to_r2_sync
    r2_ok = upload_backup_to_r2_sync(seed_data)
    print(f"☁️ Synced to Cloudflare R2 Master Backup: {r2_ok}")
except Exception as e:
    print(f"⚠️ R2 sync warning: {e}")
