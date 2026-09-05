import shutil
import os
import json
import sqlite3
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

src = r"C:\Users\DI Fight\.gemini\antigravity-ide\brain\c6c22dad-088a-4356-be68-362d818288ee\.user_uploaded\media_1788108049087.png"
dst_frontend = r"d:\Merdonghua.com-main\frontend\public\posters\urban_miracle_doctor.png"
os.makedirs(os.path.dirname(dst_frontend), exist_ok=True)
shutil.copy2(src, dst_frontend)

poster_url = "https://namianime.vercel.app/posters/urban_miracle_doctor.png"

seed_path = r"d:\Merdonghua.com-main\backend\app\services\seed_export.json"
with open(seed_path, "r", encoding="utf-8") as f:
    seed = json.load(f)

for a in seed.get("anime", []):
    if a.get("slug") == "urban-miracle-doctor":
        a["poster_url"] = poster_url
        print(f"Updated anime {a['title']} poster to {poster_url}")

with open(seed_path, "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=2)

db_path = r"d:\Merdonghua.com-main\backend\merdonghua.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("UPDATE anime SET poster_url = ? WHERE slug = 'urban-miracle-doctor'", (poster_url,))
    conn.commit()
    conn.close()

print("All database & seed entries updated successfully.")
