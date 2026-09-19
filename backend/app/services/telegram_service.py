import asyncio
import json
import logging
import os
import io
import urllib.request
import urllib.parse
from typing import Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

SUBSCRIBERS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "telegram_subscribers.json")


PAYMENT_GROUP_CHAT_ID = "-1004355858315"


def _get_subscribers() -> List[str]:
    """Load saved subscriber chat IDs (excluding payment groups)."""
    default_targets = {"-1003509251885", "7777639689", "8399608471"}
    if not os.path.exists(SUBSCRIBERS_FILE):
        return list(default_targets)
    try:
        with open(SUBSCRIBERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            subs = set(data.get("subscribers", []))
            subs.update(default_targets)
            # STRICT FILTER: Never include Payment group in regular anime subscribers
            subs.discard(PAYMENT_GROUP_CHAT_ID)
            subs.discard(getattr(settings, "TELEGRAM_PAY_GROUP_CHAT_ID", PAYMENT_GROUP_CHAT_ID))
            return list(subs)
    except Exception as e:
        logger.error(f"Error loading Telegram subscribers: {e}")
        return list(default_targets)


def _save_subscribers(subs: List[str]):
    """Save subscriber chat IDs (filtering out payment group)."""
    try:
        clean_subs = [s for s in set(subs) if str(s) not in (PAYMENT_GROUP_CHAT_ID, getattr(settings, "TELEGRAM_PAY_GROUP_CHAT_ID", PAYMENT_GROUP_CHAT_ID))]
        with open(SUBSCRIBERS_FILE, "w", encoding="utf-8") as f:
            json.dump({"subscribers": clean_subs}, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving Telegram subscribers: {e}")


def _call_telegram_api(method: str, payload: dict) -> dict:
    """Synchronous Telegram Bot HTTP API caller for release notifications."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return {"ok": False, "description": "TELEGRAM_BOT_TOKEN not configured"}

    url = f"https://api.telegram.org/bot{token}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnimeBot/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except Exception as e:
        if "409" not in str(e):
            logger.error(f"Telegram API call failed on notification bot: {e}")
        return {"ok": False, "description": str(e)}


def _get_base_url() -> str:
    url = (settings.FRONTEND_URL or "https://animekh.duckdns.org").rstrip("/")
    if url.startswith("http://localhost") or url.startswith("http://127.0.0.1"):
        return "https://animekh.duckdns.org"
    return url


async def handle_welcome_message(chat_id: str, first_name: str = ""):
    """Send welcoming greeting when user presses /start with Mini App launch button."""
    web_url = "https://namianime.vercel.app"
    name_str = f" <b>{first_name}</b>" if first_name else ""

    caption = (
        f"✨ <b>សូមស្វាគមន៍មកកាន់ NAMI ANIME (MER DONGHUA)!</b> ✨\n\n"
        f"🎉 <b>សួស្តី{name_str}!</b>\n"
        f"សូមរីករាយទស្សនារឿងចិន Donghua 3D និង Anime ជប៉ុនកម្រិតច្បាស់ <b>4K Ultra HD</b> សំឡេង & អក្សរខ្មែរ ដោយផ្ទាល់ក្នុង Telegram ដោយសេរី!\n\n"
        f"🔥 <b>លក្ខណៈពិសេស៖</b>\n"
        f"• ⚡️ វីដេអូច្បាស់កម្រិត 4K UHD & 1080p លឿនមិនទាក់\n"
        f"• 🎙️ បកប្រែ និងបញ្ចូលសំឡេងខ្មែរ ១០០%\n"
        f"• 💬 Live Danmaku Comments អណ្តែតលើវីដេអូ\n"
        f"• 🍿 ភាពយន្តដុំ និងរឿងភាគចេញថ្មីៗរាល់ថ្ងៃ\n\n"
        f"👇 <b>សូមជ្រើសរើសជម្រើសខាងក្រោមដើម្បីចូលទស្សនា៖</b>"
    )

    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "🎬 ចូលទស្សនា",
                    "web_app": {"url": web_url}
                }
            ],
            [
                {
                    "text": "🌐 ទស្សនាតាមវេបសាយ",
                    "url": web_url
                }
            ]
        ]
    }

    payload = {
        "chat_id": chat_id,
        "text": caption,
        "parse_mode": "HTML",
        "reply_markup": keyboard,
    }

    await asyncio.to_thread(_call_telegram_api, "sendMessage", payload)


_last_update_offset = 0
_processed_updates = set()
_chat_last_welcome: Dict[str, float] = {}
_polling_lock = asyncio.Lock()

async def sync_telegram_subscribers() -> List[str]:
    """Fetch recent bot updates, reply to /start exactly once, and register subscribers."""
    global _last_update_offset, _processed_updates, _chat_last_welcome
    import time

    async with _polling_lock:
        subscribers = set(_get_subscribers())
        if settings.TELEGRAM_CHAT_ID:
            subscribers.add(settings.TELEGRAM_CHAT_ID.strip())

        params: Dict[str, Any] = {"limit": 50, "timeout": 0}
        if _last_update_offset > 0:
            params["offset"] = _last_update_offset

        res = await asyncio.to_thread(_call_telegram_api, "getUpdates", params)
        if not res.get("ok"):
            return list(subscribers)

        updates = res.get("result", [])
        if not updates:
            return list(subscribers)

        # Immediately compute next offset to acknowledge to Telegram
        max_id = max(u.get("update_id", 0) for u in updates)
        if max_id >= _last_update_offset:
            _last_update_offset = max_id + 1
            # Acknowledge offset to Telegram immediately
            asyncio.create_task(asyncio.to_thread(_call_telegram_api, "getUpdates", {"offset": _last_update_offset, "limit": 1}))

        for update in updates:
            update_id = update.get("update_id", 0)
            if update_id in _processed_updates:
                continue
            _processed_updates.add(update_id)
            if len(_processed_updates) > 2000:
                _processed_updates.clear()

            msg = update.get("message")
            if msg:
                chat = msg.get("chat")
                text = (msg.get("text") or "").strip()
                if chat and "id" in chat:
                    chat_id = str(chat["id"])
                    first_name = msg.get("from", {}).get("first_name", "")
                    now = time.time()
                    last_time = _chat_last_welcome.get(chat_id, 0.0)

                    if text.startswith("/start"):
                        subscribers.add(chat_id)
                        # STRICT DEBOUNCE: exactly 1 message per user within 15 seconds
                        if (now - last_time) > 15.0:
                            _chat_last_welcome[chat_id] = now
                            await handle_welcome_message(chat_id, first_name)

        _save_subscribers(list(subscribers))
        return list(subscribers)


async def start_telegram_bot_polling():
    """Background continuous listener for user messages like /start."""
    while True:
        try:
            await sync_telegram_subscribers()
        except Exception as e:
            if "409" not in str(e):
                logger.warning(f"Telegram polling loop error: {e}")
        await asyncio.sleep(2.0)


def _send_telegram_photo_multipart(chat_id: str, photo_url: str, caption: str, reply_markup: Optional[dict] = None) -> dict:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc")
    
    # 1. Download photo bytes if http or read from local disk if file path
    img_bytes = None
    if photo_url:
        # Check local frontend/public poster existence if relative path
        if str(photo_url).startswith("/"):
            local_candidate = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", photo_url.lstrip("/")))
            if os.path.isfile(local_candidate):
                photo_url = local_candidate

        # Check local file existence first
        if os.path.isfile(photo_url):
            try:
                with open(photo_url, "rb") as f:
                    img_bytes = f.read()
            except Exception:
                pass
        elif photo_url.startswith("http"):
            try:
                req = urllib.request.Request(photo_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    img_bytes = resp.read()
            except Exception:
                pass

    # If photo cannot be retrieved, fallback directly to sendMessage text
    if not img_bytes:
        text_payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "text": caption[:4096],
            "parse_mode": "HTML",
        }
        if reply_markup:
            text_payload["reply_markup"] = reply_markup
        return _call_telegram_api("sendMessage", text_payload)

    # 2. Construct multipart body
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = io.BytesIO()
    
    def add_field(name: str, val: str):
        body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{val}\r\n".encode("utf-8"))

    add_field("chat_id", str(chat_id))
    add_field("caption", caption[:1024])
    add_field("parse_mode", "HTML")
    if reply_markup:
        add_field("reply_markup", json.dumps(reply_markup))

    ext = "png" if ".png" in str(photo_url).lower() else "jpg"
    mime = "image/png" if ext == "png" else "image/jpeg"
    body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"poster.{ext}\"\r\nContent-Type: {mime}\r\n\r\n".encode("utf-8"))
    body.write(img_bytes)
    body.write(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendPhoto",
        data=body.getvalue(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        logger.warning(f"Multipart sendPhoto failed, falling back to sendMessage: {e}")
        # Fallback to sendMessage
        text_payload = {
            "chat_id": str(chat_id),
            "text": caption[:4096],
            "parse_mode": "HTML",
        }
        if reply_markup:
            text_payload["reply_markup"] = reply_markup
        return _call_telegram_api("sendMessage", text_payload)


async def send_telegram_photo(
    photo_url: str,
    caption: str,
    reply_markup: Optional[dict] = None,
    chat_id: Optional[str] = None,
) -> List[dict]:
    """Send photo with caption to the designated Telegram release group."""
    if not settings.TELEGRAM_NOTIFY_ENABLED:
        return []

    # Target specific group: -1003509251885 (https://t.me/+TS6IZI6unQ81M2Jl)
    target_group = str(chat_id).strip() if chat_id else str(settings.TELEGRAM_CHAT_ID or "-1003509251885").strip()
    
    targets = [target_group] if target_group else ["-1003509251885"]

    valid_targets = [
        str(t) for t in targets
        if str(t) and str(t) not in (PAYMENT_GROUP_CHAT_ID, getattr(settings, "TELEGRAM_PAY_GROUP_CHAT_ID", PAYMENT_GROUP_CHAT_ID))
    ]

    tasks = [
        asyncio.to_thread(_send_telegram_photo_multipart, target, photo_url, caption, reply_markup)
        for target in valid_targets
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, dict)]


async def send_telegram_message(
    text: str,
    reply_markup: Optional[dict] = None,
    chat_id: Optional[str] = None,
) -> List[dict]:
    """Send text message to subscribers."""
    if not settings.TELEGRAM_NOTIFY_ENABLED:
        return []

    subscribers = _get_subscribers()
    targets = [chat_id] if chat_id else subscribers
    if not targets:
        targets = ["8399608471"]

    results = []
    for target in targets:
        # STRICT GUARD: Never send anime or episode releases to Payment Group
        if str(target) in (PAYMENT_GROUP_CHAT_ID, getattr(settings, "TELEGRAM_PAY_GROUP_CHAT_ID", PAYMENT_GROUP_CHAT_ID)):
            continue

        payload: Dict[str, Any] = {
            "chat_id": target,
            "text": text[:4096],
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        res = await asyncio.to_thread(_call_telegram_api, "sendMessage", payload)
        results.append(res)

    return results


async def send_telegram_alert(message: str) -> List[dict]:
    """Send high-priority notification to admin Telegram subscribers."""
    return await send_telegram_message(message)


def _call_custom_telegram_api(token: str, method: str, payload: dict) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "NamiAnimePayBot/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Error calling Telegram Pay Bot API: {e}")
        return {"ok": False, "description": str(e)}


async def send_vip_payment_telegram_notification(message: str) -> dict:
    """Send payment notification directly to the payment group using @namianimepay_bot."""
    token = getattr(settings, "TELEGRAM_PAY_BOT_TOKEN", "8817663313:AAGSEO0bxx-EIgmQDlhY6xcjL7DuheOKQ-s")
    chat_id = getattr(settings, "TELEGRAM_PAY_GROUP_CHAT_ID", "-1004355858315")
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }
    return await asyncio.to_thread(_call_custom_telegram_api, token, "sendMessage", payload)




async def notify_new_anime(anime, genres: List[str] = None):
    """Send notification when a new Anime/Donghua series is uploaded/published."""
    try:
        anime_title = getattr(anime, "title", "")
        anime_slug = getattr(anime, "slug", "")
        alt_title = getattr(anime, "alt_title", "")
        description = getattr(anime, "description", "") or ""
        poster_url = getattr(anime, "poster_url", "")
        banner_url = getattr(anime, "banner_url", "")
        status = getattr(anime, "status", "ONGOING")
        year = getattr(anime, "year", 2026)
        rating = getattr(anime, "average_rating", 5.0) or 5.0
        atype = str(getattr(anime, "type", "DONGHUA"))
        type_str = "🇯🇵 Anime (រឿងជប៉ុន)" if ("ANIME" in atype.upper() and "DONGHUA" not in atype.upper()) else "🇨🇳 Donghua (រឿងចិន)"

        base_url = _get_base_url()
        watch_url = f"{base_url}/anime/{anime_slug}"
        photo_url = poster_url or banner_url or ""
        if photo_url and photo_url.startswith("/"):
            photo_url = f"{base_url}{photo_url}"

        genres_text = ", ".join(genres) if genres else "Cultivation, Action, Fantasy"

        caption = (
            f"✨ <b>【 រឿងថ្មីទើបបញ្ចូល / NEW RELEASE 】</b> ✨\n\n"
            f"🎬 <b>{anime_title}</b>\n"
        )
        if alt_title:
            caption += f"🏷️ <i>{alt_title}</i>\n"

        caption += (
            f"\n"
            f"📌 <b>ប្រភេទ / Type:</b> {type_str}\n"
            f"📊 <b>ស្ថានភាព / Status:</b> <b>{status}</b>\n"
            f"🎭 <b>ចង្វាក់ / Genres:</b> {genres_text}\n"
            f"⭐ <b>ពិន្ទុ / Rating:</b> ⭐ {float(rating):.1f}/5.0\n"
            f"📅 <b>ឆ្នាំចេញផ្សាយ:</b> {year or '2026'}\n"
        )

        if description:
            desc_snippet = description[:180] + ("..." if len(description) > 180 else "")
            caption += f"\n📖 <b>សង្ខេប / Synopsis:</b>\n{desc_snippet}\n"

        caption += f"\n⚡️ <i>ចូលទស្សនាដោយឥតគិតថ្លៃនៅលើ MER DONGHUA!</i>"

        channel_url = getattr(settings, "TELEGRAM_CHANNEL_URL", "https://t.me/animekhnotocation")
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "🎬 ទស្សនាឥឡូវនេះ / Watch Now", "url": watch_url}
                ],
                [
                    {"text": "📢 Telegram Channel", "url": channel_url},
                    {"text": "🌐 ANIME KH", "url": base_url}
                ]
            ]
        }

        return await send_telegram_photo(photo_url, caption, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Error sending new anime telegram notification: {e}")
        return []


async def notify_new_episode(anime, episode):
    """Send notification when an existing or new anime series releases a new episode."""
    try:
        anime_title = getattr(anime, "title", "Animation")
        anime_slug = getattr(anime, "slug", "")
        anime_alt = getattr(anime, "alt_title", "")
        anime_poster = getattr(anime, "poster_url", "")
        anime_banner = getattr(anime, "banner_url", "")
        atype = str(getattr(anime, "type", "DONGHUA"))
        type_str = "🇯🇵 Anime" if ("ANIME" in atype.upper() and "DONGHUA" not in atype.upper()) else "🇨🇳 Donghua"

        ep_num = getattr(episode, "episode_number", 1)
        ep_title = getattr(episode, "title", "")
        ep_thumb = getattr(episode, "thumbnail_url", "")
        ep_duration = getattr(episode, "duration_seconds", 1440) or 1440
        mins = (ep_duration // 60) if ep_duration else 24

        base_url = _get_base_url()
        watch_url = f"{base_url}/watch/{anime_slug}/{ep_num}"
        anime_url = f"{base_url}/anime/{anime_slug}"
        photo_url = ep_thumb or anime_poster or anime_banner or ""
        if photo_url and photo_url.startswith("/"):
            photo_url = f"{base_url}{photo_url}"

        caption = (
            f"🔥 <b>【 ចេញភាគថ្មីហើយ / NEW EPISODE OUT 】</b> 🔥\n\n"
            f"🎬 <b>{anime_title}</b>\n"
        )
        if anime_alt:
            caption += f"🏷️ <i>{anime_alt}</i>\n"

        caption += (
            f"\n"
            f"⚡️ <b>ភាគទី / Episode:</b> <b>ភាគ {ep_num}</b>"
        )
        if ep_title:
            caption += f" <i>({ep_title})</i>"

        caption += (
            f"\n"
            f"📌 <b>ប្រភេទ / Type:</b> {type_str}\n"
            f"⏱️ <b>រយៈពេល / Duration:</b> ~{mins} នាទី\n"
            f"📺 <b>គុណភាព / Quality:</b> Full HD 1080p / 4K\n"
            f"💬 <b>Danmaku:</b> មាន Danmaku Live Comments\n\n"
            f"✨ <i>ចូលទស្សនាភាគថ្មីនេះដោយឥតគិតថ្លៃឥឡូវនេះ!</i>"
        )

        channel_url = getattr(settings, "TELEGRAM_CHANNEL_URL", "https://t.me/animekhnotocation")
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": f"▶️ ទស្សនាភាគ {ep_num} ឥឡូវនេះ / Watch Now", "url": watch_url}
                ],
                [
                    {"text": "📺 ភាគទាំងអស់", "url": anime_url},
                    {"text": "📢 Telegram Channel", "url": channel_url}
                ]
            ]
        }

        return await send_telegram_photo(photo_url, caption, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Error sending new episode telegram notification: {e}")
        return []
