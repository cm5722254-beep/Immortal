import json
import sqlite3
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed_path = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
db_path = os.path.join(base_dir, "backend", "merdonghua.db")
new_poster = "https://i.pinimg.com/736x/eb/f6/cd/ebf6cd299f28eb5fd269c7fecc400b29.jpg"

with open(seed_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for a in data.get("anime", []):
    if a.get("slug") == "urban-miracle-doctor" or "គ្រូពេទ្យទេវតា" in a.get("title", ""):
        a["poster_url"] = new_poster
        a["banner_url"] = new_poster
        print(f"[OK] Updated poster in seed_export.json for: [{a['id']}] {a['title']}")

with open(seed_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "UPDATE anime SET poster_url = ?, banner_url = ? WHERE slug = 'urban-miracle-doctor' OR title LIKE '%គ្រូពេទ្យទេវតា%'",
        (new_poster, new_poster)
    )
    conn.commit()
    print(f"[OK] Updated in SQLite DB! Rows affected: {cur.rowcount}")
    conn.close()

try:
    sys.path.insert(0, os.path.join(base_dir, "backend"))
    from app.services.r2_backup_service import upload_backup_to_r2_sync
    with open(seed_path, "r", encoding="utf-8") as f:
        full_data = json.load(f)
    r2_ok = upload_backup_to_r2_sync(full_data)
    print(f"[OK] Synced updated poster to Cloudflare R2: {r2_ok}")
except Exception as e:
    print(f"[WARN] R2 error: {e}")
