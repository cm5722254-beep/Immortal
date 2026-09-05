import sys
import json
import urllib.request

# Force UTF-8 on stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

DEFAULT_BOT_TOKEN = "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc"
DEFAULT_WEB_APP_URL = "https://namianime.vercel.app"

def call_tg(token: str, method: str, payload: dict) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnimeGuard/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            res_data = resp.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} on {method}: {err}", file=sys.stderr)
        return {"ok": False, "error": err}
    except Exception as e:
        print(f"Error on {method}: {e}", file=sys.stderr)
        return {"ok": False, "error": str(e)}

def update_telegram_settings(web_url: str = DEFAULT_WEB_APP_URL, bot_token: str = DEFAULT_BOT_TOKEN):
    print("=" * 60)
    print("🛡️ NAMI ANIME — TELEGRAM DYNAMIC DOMAIN & ANTI-BAN SUITE")
    print("=" * 60)
    print(f"🔹 Target Mini App URL : {web_url}")
    print(f"🔹 Bot Token Prefix   : {bot_token[:12]}... (Secured)\n")

    # 1. Update Chat Menu Button (1-Second Instant Domain Switch)
    res_menu = call_tg(bot_token, "setChatMenuButton", {
        "menu_button": {
            "type": "web_app",
            "text": "🎬 ចូលទស្សនា",
            "web_app": {
                "url": web_url
            }
        }
    })
    print(f"1. [Dynamic Domain Switch] Menu Button updated: {res_menu.get('ok')}")

    # 2. Set Clean Anti-Report Bot Commands (Khmer Language)
    res_cmds = call_tg(bot_token, "setMyCommands", {
        "commands": [
            {"command": "start", "description": "🚀 បើកដំណើរការ NAMI ANIME Mini App"},
            {"command": "app", "description": "🎬 បើកផ្ទាំងទស្សនារឿង (4K UHD)"},
            {"command": "donghua", "description": "🇨🇳 រឿងចិន 3D កំពុងពេញនិយម"},
            {"command": "movies", "description": "🍿 ភាពយន្តដុំពិសេស (Full Movies)"},
            {"command": "anime", "description": "🇯🇵 រឿងគំនូរជីវចលជប៉ុន"},
            {"command": "vip", "description": "👑 ដំឡើងគម្រោង VIP ($2.50)"},
            {"command": "help", "description": "💬 ទំនាក់ទំនងជំនួយ & Admin Support"},
        ]
    })
    print(f"2. [Bot Commands] Commands updated: {res_cmds.get('ok')}")

    # 3. Set Clean Compliant Bot Description (Full Khmer Introduction)
    khmer_description = (
        "🎬 សូមស្វាគមន៍មកកាន់ NAMI ANIME (MER DONGHUA)! 🇰🇭\n\n"
        "🍿 កន្លែងទស្សនារឿងចិន 3D (Donghua) រឿងជប៉ុន (Anime) និងភាពយន្តដុំកម្រិតច្បាស់ 4K Ultra HD ដោយផ្ទាល់ក្នុង Telegram ឥតគិតថ្លៃ!\n\n"
        "✨ លក្ខណៈពិសេសៗ៖\n"
        "• ⚡️ វីដេអូច្បាស់កម្រិត 4K UHD & 1080p លឿនមិនទាក់\n"
        "• 🎙️ សំឡេង & អក្សរខ្មែរ (Khmer Dubbed & Subtitles)\n"
        "• 💬 Danmaku Live Chat ខមិនអណ្តែតលើវីដេអូ\n"
        "• 🚀 មិនបាច់ទាញយក App ក្រៅ បើកមើលក្នុង Telegram ភ្លាមៗ\n\n"
        "👉 សូមចុចប៊ូតុង «🎬 បើកទស្សនារឿង (Open App)» ខាងក្រោមដើម្បីចាប់ផ្តើមទស្សនា!"
    )
    res_desc = call_tg(bot_token, "setMyDescription", {
        "description": khmer_description
    })
    print(f"3. [Bot Description] Bio updated: {res_desc.get('ok')}")

    # 4. Set Bot Short Description (Khmer Bio)
    res_short = call_tg(bot_token, "setMyShortDescription", {
        "short_description": "🎬 ទស្សនារឿងចិន Donghua 3D & Anime គុណភាព 4K UHD សំឡេងខ្មែរផ្ទាល់ក្នុង Telegram!"
    })
    print(f"4. [Short Bio] Short description updated: {res_short.get('ok')}")

    # 5. Verify Active Configuration
    bot_info = call_tg(bot_token, "getMe", {})
    current_menu = call_tg(bot_token, "getChatMenuButton", {})
    
    print("\n" + "-" * 60)
    print(f"🤖 Bot Name      : {bot_info.get('result', {}).get('first_name')} (@{bot_info.get('result', {}).get('username')})")
    print(f"🌐 Active URL    : {current_menu.get('result', {}).get('web_app', {}).get('url')}")
    print("-" * 60)

    if res_menu.get("ok"):
        print(f"\n🎉 SUCCESS! Telegram Mini App is active and safely routed to: {web_url}")

if __name__ == "__main__":
    target_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_WEB_APP_URL
    custom_token = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BOT_TOKEN
    update_telegram_settings(target_url, custom_token)
