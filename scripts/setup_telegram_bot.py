import os
import urllib.request
import json
import sys

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WEB_APP_URL = os.getenv("TELEGRAM_WEB_APP_URL", "https://namianime.vercel.app")

def call_tg(method: str, payload: dict):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            ret = json.loads(res.read().decode("utf-8"))
            print(f"[{method}] Success:", ret)
            return ret
    except Exception as e:
        print(f"[{method}] Error:", e)
        return None

def main():
    if not TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN environment variable is required.")
        sys.exit(1)
    print("Setting up Telegram Bot...")

    # 1. Menu Button for Mini App
    call_tg("setChatMenuButton", {
        "menu_button": {
            "type": "web_app",
            "text": "🎬 ចូលទស្សនា App",
            "web_app": {"url": WEB_APP_URL}
        }
    })

    # 2. Bot Description (shown before user presses Start)
    call_tg("setMyDescription", {
        "description": (
            "✨ សូមស្វាគមន៍មកកាន់ APPFLIX — WatchFlix Anime!\n\n"
            "🎬 កម្មវិធីទស្សនារឿងចិន 3D Donghua និង Anime ជប៉ុនកម្រិតច្បាស់ 4K Ultra HD "
            "សំឡេង & អក្សរខ្មែរ ដោយផ្ទាល់ក្នុង Telegram ដោយសេរី និងល្បឿនលឿនមិនទាក់!\n\n"
            "👇 សូមចុច Start ឬប៊ូតុងខាងក្រោមដើម្បីចូលទស្សនា៖"
        )
    })

    # 3. Short description (shown on bot profile)
    call_tg("setMyShortDescription", {
        "short_description": "🎬 ទស្សនារឿងចិន 3D & Anime ជប៉ុន 4K សំឡេងខ្មែរ លើ Telegram"
    })

    # 4. Commands
    call_tg("setMyCommands", {
        "commands": [
            {"command": "start", "description": "🎬 បើកកម្មវិធីទស្សនារឿង (Launch Mini App)"},
            {"command": "app", "description": "🍿 ចូលមើលរឿងលើ Web/App"},
            {"command": "help", "description": "ℹ️ ជំនួយ និងការណែនាំ"}
        ]
    })

    print("Telegram Bot setup completed successfully!")

if __name__ == "__main__":
    main()
