import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Force UTF-8 on Windows stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BOT_TOKEN = "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc"
CHAT_ID = "8399608471"
APK_PATH = r"c:\Users\DI Fight\Documents\Website\mer-donghua\MerDonghua-v1.3-Latest.apk"

def send_telegram_document(bot_token: str, chat_id: str, file_path: str, caption: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    file_name = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        file_content = f.read()

    body = []
    # chat_id
    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="chat_id"'.encode("utf-8"))
    body.append(b"")
    body.append(str(chat_id).encode("utf-8"))

    # caption
    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="caption"'.encode("utf-8"))
    body.append(b"")
    body.append(caption.encode("utf-8"))

    # parse_mode
    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="parse_mode"'.encode("utf-8"))
    body.append(b"")
    body.append(b"HTML")

    # document
    body.append(f"--{boundary}".encode("utf-8"))
    body.append(f'Content-Disposition: form-data; name="document"; filename="{file_name}"'.encode("utf-8"))
    body.append(b"Content-Type: application/vnd.android.package-archive")
    body.append(b"")
    body.append(file_content)
    body.append(f"--{boundary}--".encode("utf-8"))
    body.append(b"")

    payload = b"\r\n".join(body)

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "MerDonghuaBot/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            res_data = resp.read().decode("utf-8")
            result = json.loads(res_data)
            return result
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err}", file=sys.stderr)
        return {"ok": False, "error": err}
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    if not os.path.exists(APK_PATH):
        print(f"Error: File not found at {APK_PATH}")
        sys.exit(1)

    file_size_mb = os.path.getsize(APK_PATH) / (1024 * 1024)

    caption = (
        "🚀 <b>MER DONGHUA Mobile App (APK v1.3)</b>\n\n"
        "✨ <b>ការអាប់ដេតថ្មី (What's New):</b>\n"
        "• 🎨 <b>Dark Cinematic Theme</b>: ផ្ទៃពណ៌ Navy (#0A0E17) & ប៊ូតុង Red-Orange (#E8452C)\n"
        "• 🎬 <b>3D Hero Carousel</b>: រូបភាព poster ត្រួតគ្នា 3 ជាន់\n"
        "• 📱 <b>Mobile UI</b>: មើលបន្ត, Promo Cards, ម៉ឺនុយការកំណត់ v1.0.7, ប្រវត្តិរូប\n"
        "• ⭐ <b>Gold Rating Badge</b>: ★ 9.6 • សមាជិក\n"
        "• 🇰🇭 <b>Khmer Display Fonts</b>: Kantumruy Pro & Koh Santepheap\n\n"
        f"📦 <b>ទំហំ File:</b> {file_size_mb:.2f} MB\n"
        "⚡ <i>ចុចទាញយក APK ខាងលើដើម្បីដំឡើងលើទូរស័ព្ទ Android របស់អ្នក!</i>"
    )

    print(f"Uploading APK ({file_size_mb:.2f} MB) to Telegram Chat ID: {CHAT_ID}...")
    res = send_telegram_document(BOT_TOKEN, CHAT_ID, APK_PATH, caption)
    if res.get("ok"):
        print("SUCCESS! APK sent to Telegram successfully!")
        print("Message ID:", res.get("result", {}).get("message_id"))
    else:
        print("FAILED to send APK to Telegram:", res)
