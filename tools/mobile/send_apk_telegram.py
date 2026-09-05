import os
import sys
import json
import requests

# Force UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BOT_TOKEN = "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APK_PATH = os.path.join(BASE_DIR, "NamiAnime-v1.6-Latest.apk") if os.path.exists(os.path.join(BASE_DIR, "NamiAnime-v1.6-Latest.apk")) else os.path.join(BASE_DIR, "NamiAnime-v1.5-Latest.apk")
SUBSCRIBERS_FILE = os.path.join(BASE_DIR, "backend", "telegram_subscribers.json") if os.path.exists(os.path.join(BASE_DIR, "backend", "telegram_subscribers.json")) else r"C:\Users\DI Fight\Documents\Website\NAMI  ANIME\backend\telegram_subscribers.json"


def get_chat_ids():
    chat_ids = ["8399608471", "7777639689", "8636007665", "1067485715"]
    if os.path.exists(SUBSCRIBERS_FILE):
        try:
            with open(SUBSCRIBERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                chat_ids.extend(data.get("subscribers", []))
        except Exception:
            pass
    return list(set(chat_ids))

def send_apk_document(chat_id: str, apk_path: str):
    caption = (
        "🎬 *NAMI ANIME — Android App APK v1.6 (Latest Update)*\n\n"
        "⚡️ *កំណែទម្រង់ និងមុខងារថ្មីៗ (New Features & Style):*\n"
        "• 🇰🇭 *Interface ខ្មែរ 100%* — Menu, Sections និងផ្ទាំងទស្សនាជាភាសាខ្មែរស្រួលមើល\n"
        "• 🍿 *ប្រព័ន្ធលក់រឿង Movie ($1.00)* — ភាពយន្តដុំទូទាត់ Wing Bank KHQR (VIP ក៏ត្រូវទិញ លើកលែងតែ Admin)\n"
        "• 💎 *គម្រោង VIP ($2.50)* — កូដ KHQR ស្វ័យប្រវត្តិតាម Bot Telegram\n"
        "• 💬 *តំណភ្ជាប់ Group Chat ថ្មី* — @nintplex\n"
        "• ⚡ AMOLED Dark Theme + Ultra 4K UHD Fast Streaming\n\n"
        "📥 *ចុច Download APK ខាងលើដើម្បី Install / Update លើទូរសព្ទ Android!*"
    )
    
    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "🎬 បើក Mini App", "web_app": {"url": "https://namianime.vercel.app"}},
                {"text": "🌐 ចូលមើលវេបសាយ", "url": "https://namianime.vercel.app"}
            ]
        ]
    }

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendDocument"
    filename = os.path.basename(apk_path)

    try:
        with open(apk_path, "rb") as f:
            files = {
                "document": (filename, f, "application/vnd.android.package-archive")
            }
            data = {
                "chat_id": chat_id,
                "caption": caption,
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(reply_markup)
            }
            resp = requests.post(url, data=data, files=files, timeout=600)
            return resp.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

def main():
    chat_ids = get_chat_ids()
    print(f"Sending APK to {len(chat_ids)} recipient(s)...", flush=True)
    for cid in chat_ids:
        print(f"Sending to chat {cid}...", flush=True)
        res = send_apk_document(cid, APK_PATH)
        if res.get("ok"):
            print(f"  [SUCCESS] Sent successfully to {cid}!", flush=True)
        else:
            print(f"  [ERROR] for {cid}: {res}", flush=True)

if __name__ == "__main__":
    main()
