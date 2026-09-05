import json
import urllib.request
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token = "8817663313:AAGSEO0bxx-EIgmQDlhY6xcjL7DuheOKQ-s"
token_notify = "8907079812:AAF2K8UmXDWYbM2D668Ea45UIh0AO6dGsU0"
chat_ids = ["-1004355858315", "7777639689"]

title = "ពិភពថាមពលវេទមន្ត"
alt_title = "Perfect World (Wanmei Shijie)"
ep_num = 284
watch_url = "https://namianime.vercel.app/watch/perfect-world/284"
anime_url = "https://namianime.vercel.app/anime/perfect-world"
photo_url = "https://i.pinimg.com/736x/3f/1a/10/3f1a10463df30c93c1918e85c0c2ade0.jpg"

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

def send_notification(t, cid):
    # Try sendPhoto first
    url_photo = f"https://api.telegram.org/bot{t}/sendPhoto"
    payload_photo = {
        "chat_id": cid,
        "photo": photo_url,
        "caption": caption,
        "parse_mode": "HTML",
        "reply_markup": keyboard
    }
    req = urllib.request.Request(
        url_photo,
        data=json.dumps(payload_photo).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnime/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            parsed = json.loads(res.read().decode("utf-8"))
            if parsed.get("ok"):
                return parsed
    except Exception:
        pass

    # Fallback to sendMessage
    url_msg = f"https://api.telegram.org/bot{t}/sendMessage"
    payload_msg = {
        "chat_id": cid,
        "text": caption,
        "parse_mode": "HTML",
        "reply_markup": keyboard
    }
    req_msg = urllib.request.Request(
        url_msg,
        data=json.dumps(payload_msg).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnime/1.0"}
    )
    try:
        with urllib.request.urlopen(req_msg, timeout=10) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}

for cid in chat_ids:
    res = send_notification(token, cid)
    if not res.get("ok"):
        res = send_notification(token_notify, cid)
    msg_id = res.get("result", {}).get("message_id")
    print(f"Result for {cid}: ok={res.get('ok')} -> message_id: {msg_id}")
