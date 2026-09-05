import json
import urllib.request
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token_notify = "8907079812:AAF2K8UmXDWYbM2D668Ea45UIh0AO6dGsU0"
chat_ids = ["-1003509251885"]

photo_url = "https://i.pinimg.com/736x/8f/ce/e3/8fcee3db01e85a66699ecaa3045ea79c.jpg"
title = "ពិភពថាមពលវេទមន្ត"
alt_title = "Perfect World (Wanmei Shijie)"
ep_num = 284
watch_url = "https://namianime.vercel.app/watch/perfect-world/284"
anime_url = "https://namianime.vercel.app/anime/perfect-world"

caption = (
    "🔥 <b>【 ចេញភាគថ្មីហើយ / NEW EPISODE RELEASE 】</b> 🔥\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    f"🎬 <b>រឿង:</b> <b>{title}</b>\n"
    f"🏷️ <i>{alt_title}</i>\n\n"
    f"⚡ <b>ភាគទើបចេញ:</b> <b>ភាគ {ep_num} (Episode {ep_num})</b>\n"
    "📌 <b>ប្រភេទ / Type:</b> 🇨🇳 Donghua 3D Action / Cultivation\n"
    "⏱️ <b>រយៈពេល:</b> ~24 នាទី\n"
    "📺 <b>កម្រិតរូបភាព:</b> 4K UHD & Full HD 1080p Bufferless\n"
    "💬 <b>Live Chat:</b> មាន Danmaku Comments\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "✨ <i>ចូលទស្សនាភាគថ្មីនេះដោយឥតគិតថ្លៃឥឡូវនេះ!</i>"
)

keyboard = {
    "inline_keyboard": [
        [
            {"text": f"▶️ ទស្សនាភាគ {ep_num} ឥឡូវនេះ / Watch EP {ep_num}", "url": watch_url}
        ],
        [
            {"text": "📺 ភាគទាំងអស់ (All Episodes)", "url": anime_url},
            {"text": "📢 Join Telegram Group", "url": "https://t.me/+TS6IZI6unQ81M2Jl"}
        ]
    ]
}

def send(token, cid):
    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    payload = {
        "chat_id": cid,
        "photo": photo_url,
        "caption": caption,
        "parse_mode": "HTML",
        "reply_markup": keyboard
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnime/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        return {"ok": False, "error": f"HTTP {e.code}: {err}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

for cid in chat_ids:
    res = send(token_notify, cid)
    msg_id = res.get("result", {}).get("message_id")
    print(f"Sent to {cid}: ok={res.get('ok')} (message_id: {msg_id})")
