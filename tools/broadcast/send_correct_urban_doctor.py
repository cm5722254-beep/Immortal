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
poster_url = "https://i.pinimg.com/736x/89/3e/2d/893e2dc9ea0ea1d8a4369e1f57962c82.jpg"

req_img = urllib.request.Request(poster_url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.pinterest.com/"
})
with urllib.request.urlopen(req_img, timeout=10) as r:
    img_data = r.read()
    print(f"Downloaded image ({len(img_data)} bytes)")

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

boundary = "----NamiAnimeBoundary123"
body = bytearray()
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{group_id}\r\n".encode("utf-8"))
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{caption}\r\n".encode("utf-8"))
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"parse_mode\"\r\n\r\nHTML\r\n".encode("utf-8"))
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"reply_markup\"\r\n\r\n{json.dumps(keyboard)}\r\n".encode("utf-8"))
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"urban_doctor.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode("utf-8"))
body.extend(img_data)
body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

url = f"https://api.telegram.org/bot{token}/sendPhoto"
req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
with urllib.request.urlopen(req, timeout=15) as res:
    print("Multipart result:", res.read().decode("utf-8"))
