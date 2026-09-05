import json
import sqlite3
import os
import sys
import urllib.request

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed_file = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
db_file = os.path.join(base_dir, "backend", "merdonghua.db")

with open(seed_file, "r", encoding="utf-8") as f:
    seed = json.load(f)

# Fix poster for Urban Miracle Doctor
urban_doctor_poster = "https://i.pinimg.com/736x/89/3e/2d/893e2dc9ea0ea1d8a4369e1f57962c82.jpg"
dragon_prince_poster = "https://i.pinimg.com/736x/eb/f6/cd/ebf6cd299f28eb5fd269c7fecc400b29.jpg"

for a in seed.get("anime", []):
    if a.get("id") == 50 or a.get("slug") == "urban-miracle-doctor":
        a["poster_url"] = urban_doctor_poster
        print(f"Fixed seed for Anime 50: {a['title']} -> {urban_doctor_poster}")
    elif a.get("id") == 51 or a.get("slug") == "dragon-prince-yuan":
        a["poster_url"] = dragon_prince_poster
        print(f"Fixed seed for Anime 51: {a['title']} -> {dragon_prince_poster}")

# Fix episode thumbnails
for ep in seed.get("episodes", []):
    if ep.get("anime_id") == 50:
        ep["thumbnail_url"] = urban_doctor_poster
    elif ep.get("anime_id") == 51:
        ep["thumbnail_url"] = dragon_prince_poster

with open(seed_file, "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=2)

if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    cur.execute("UPDATE anime SET poster_url = ? WHERE id = 50 OR slug = 'urban-miracle-doctor'", (urban_doctor_poster,))
    cur.execute("UPDATE anime SET poster_url = ? WHERE id = 51 OR slug = 'dragon-prince-yuan'", (dragon_prince_poster,))
    cur.execute("UPDATE episodes SET thumbnail_url = ? WHERE anime_id = 50", (urban_doctor_poster,))
    cur.execute("UPDATE episodes SET thumbnail_url = ? WHERE anime_id = 51", (dragon_prince_poster,))
    conn.commit()
    conn.close()
    print("Fixed SQLite DB.")

# Sync to R2
try:
    sys.path.insert(0, os.path.join(base_dir, "backend"))
    from app.services.r2_backup_service import upload_backup_to_r2_sync
    upload_backup_to_r2_sync(seed)
    print("Synced to Cloudflare R2.")
except Exception as e:
    print("R2 error:", e)

# Send corrected Telegram notification to group
token = "8907079812:AAF2K8UmXDWYbM2D668Ea45UIh0AO6dGsU0"
group_id = "-1003509251885"

caption = (
    "🔥 <b>【 ចេញភាគថ្មីហើយ / NEW EPISODE OUT 】</b> 🔥\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "🎬 <b>រឿង:</b> <b>គ្រូពេទ្យទេវតា</b>\n"
    "🏷️ <i>Urban Miracle Doctor (都市绝品仙医)</i>\n\n"
    "⚡ <b>ភាគទើបចេញ:</b> <b>ភាគ 1 (Episode 1)</b>\n"
    "📌 <b>ប្រភេទ / Type:</b> 🇨🇳 Donghua 3D Action / Urban Doctor\n"
    "⏱️ <b>រយៈពេល:</b> ~22 នាទី\n"
    "📺 <b>កម្រិតរូបភាព:</b> 4K UHD & Full HD 1080p Bufferless\n"
    "💬 <b>Live Chat:</b> មាន Danmaku Comments\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "✨ <i>ចូលទស្សនាភាគថ្មីនេះដោយឥតគិតថ្លៃឥឡូវនេះ!</i>"
)

keyboard = {
    "inline_keyboard": [
        [
            {"text": "▶️ ទស្សនាភាគ 1 ឥឡូវនេះ / Watch EP 1", "url": "https://namianime.vercel.app/watch/urban-miracle-doctor/1"}
        ],
        [
            {"text": "📺 ភាគទាំងអស់ (All Episodes)", "url": "https://namianime.vercel.app/anime/urban-miracle-doctor"},
            {"text": "🌐 Nami Anime App", "url": "https://namianime.vercel.app"}
        ]
    ]
}

url_photo = f"https://api.telegram.org/bot{token}/sendPhoto"
payload_photo = {
    "chat_id": group_id,
    "photo": urban_doctor_poster,
    "caption": caption,
    "parse_mode": "HTML",
    "reply_markup": keyboard
}
req = urllib.request.Request(url_photo, data=json.dumps(payload_photo).encode("utf-8"), headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=12) as res:
    print("Corrected Telegram sendPhoto result:", res.read().decode("utf-8"))
