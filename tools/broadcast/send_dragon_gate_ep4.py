import json
import urllib.request
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token = "8907079812:AAF2K8UmXDWYbM2D668Ea45UIh0AO6dGsU0"
group_id = "-1003509251885"
admin_id = "7777639689"

title = "ស្ដេចកំណប់ទ្វារនាគ"
alt_title = "The Wealth Gods (财神殿下)"
ep_num = 4
photo_url = "https://i.pinimg.com/736x/c7/87/45/c787458d3959cbfc3948c1656d807c73.jpg"
watch_url = "https://namianime.vercel.app/watch/the-wealth-gods/4"
anime_url = "https://namianime.vercel.app/anime/the-wealth-gods"

caption = (
    "🔥 <b>【 ចេញភាគថ្មីហើយ / NEW EPISODE OUT 】</b> 🔥\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    f"🎬 <b>រឿង:</b> <b>{title}</b>\n"
    f"🏷️ <i>{alt_title}</i>\n\n"
    f"⚡ <b>ភាគទើបចេញ:</b> <b>ភាគ {ep_num} (Episode {ep_num})</b>\n"
    "📌 <b>ប្រភេទ / Type:</b> 🇨🇳 Donghua 3D Action / Fantasy\n"
    "⏱️ <b>រយៈពេល:</b> ~22 នាទី\n"
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
            {"text": "🌐 Nami Anime App", "url": "https://namianime.vercel.app"}
        ]
    ]
}

def send_it(cid):
    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    payload = {"chat_id": cid, "photo": photo_url, "caption": caption, "parse_mode": "HTML", "reply_markup": keyboard}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        url_msg = f"https://api.telegram.org/bot{token}/sendMessage"
        payload_msg = {"chat_id": cid, "text": caption, "parse_mode": "HTML", "reply_markup": keyboard}
        req_msg = urllib.request.Request(url_msg, data=json.dumps(payload_msg).encode("utf-8"), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req_msg, timeout=12) as res2:
            return json.loads(res2.read().decode("utf-8"))

for cid in [group_id, admin_id]:
    r = send_it(cid)
    print(f"Sent to {cid}: ok={r.get('ok')} msg_id={r.get('result', {}).get('message_id')}")
