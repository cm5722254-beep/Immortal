import json
import urllib.request
import os
import sys
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed_file = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")

BOT_TOKEN = "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc"

# Target release group
CHATS = ["-1003509251885"]

with open(seed_file, "r", encoding="utf-8") as f:
    seed = json.load(f)

anime_list = seed.get("anime", [])
episodes_list = seed.get("episodes", [])

# Find recently added / top hot donghua
featured_anime = [
    a for a in anime_list 
    if a.get("id") in [63, 51, 50, 2, 1, 3, 4, 7]
]

def send_photo(token, chat_id, photo_url, caption, reply_markup=None):
    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    payload = {
        "chat_id": chat_id,
        "photo": photo_url,
        "caption": caption[:1024],
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnimeBot/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}

print(f"🚀 Starting Telegram Broadcast for {len(featured_anime)} New Series...")

success_count = 0
for a in featured_anime:
    title = a.get("title", "")
    alt_title = a.get("alt_title", "")
    slug = a.get("slug", "")
    ep_count = a.get("episode_count", 1)
    rating = a.get("average_rating", 5.0)
    poster = a.get("poster_url") or "https://i.pinimg.com/736x/eb/f6/cd/ebf6cd299f28eb5fd269c7fecc400b29.jpg"
    watch_url = f"https://namianime.vercel.app/anime/{slug}"
    
    caption = (
        f"🔥 <b>【 រឿងចិន 3D ចេញផ្សាយថ្មី / NEW DONGHUA 】</b> 🔥\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"🎬 <b>ចំណងជើង:</b> <b>{title}</b>\n"
    )
    if alt_title:
        caption += f"🏷️ <i>{alt_title}</i>\n"
    
    caption += (
        f"⚡ <b>ភាគសរុប:</b> មាន <b>{ep_count} ភាគ</b> (Full HD / 4K UHD)\n"
        f"⭐ <b>ពិន្ទុ:</b> ⭐ {rating:.1f}/5.0\n"
        f"📺 <b>គុណភាព:</b> 4K UHD & 1080p Bufferless\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"✨ <i>ចូលទស្សនាដោយឥតគិតថ្លៃនៅលើ NAMI ANIME ឥឡូវនេះ!</i>"
    )
    
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "🎬 ទស្សនាឥឡូវនេះ / Watch Now", "url": watch_url}
            ],
            [
                {"text": "📢 Join Telegram Group", "url": "https://t.me/+TS6IZI6unQ81M2Jl"},
                {"text": "🌐 Nami Anime App", "url": "https://namianime.vercel.app"}
            ]
        ]
    }

    for chat_id in CHATS:
        # Try primary notification bot first, fallback to pay bot
        res = send_photo(BOT_TOKEN, chat_id, poster, caption, keyboard)
        if not res.get("ok"):
            res = send_photo(BOT_TOKEN_PAY, chat_id, poster, caption, keyboard)
        
        if res.get("ok"):
            print(f" ✅ Sent [{title}] to {chat_id}")
            success_count += 1
        else:
            print(f" ⚠️ Failed [{title}] to {chat_id}: {res.get('error') or res.get('description')}")
    
    time.sleep(1)

print(f"\n🎉 Broadcast complete! Successfully sent {success_count} notifications.")
