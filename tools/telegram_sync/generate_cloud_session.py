"""
Generate an exclusive Telethon StringSession for the Cloud 24/7 Server.
This NEVER touches local tg_sync_config.json or any local .session file, preventing
AuthKeyDuplicatedError when the returned token is stored exclusively in the Cloud
TELEGRAM_USER_SESSION environment variable.

Usage:
  Interactive:
    python tools/telegram_sync/generate_cloud_session.py

  Two-step (for automated / non-interactive terminals):
    python tools/telegram_sync/generate_cloud_session.py --send-code
    python tools/telegram_sync/generate_cloud_session.py --verify-code 12345 [--password YOUR_2FA]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.sessions import StringSession

DEFAULT_API_ID = int(os.getenv("TELEGRAM_API_ID", "2040"))
DEFAULT_API_HASH = os.getenv("TELEGRAM_API_HASH", "b18441a1ff607e10a989891a5462e627")
DEFAULT_PHONE = os.getenv("TELEGRAM_PHONE", "+855888162192")

WORKER_DIR = Path(__file__).resolve().parent
TMP_STATE_PATH = WORKER_DIR / "temp_videos_cloud" / ".cloud_login_tmp.json"


async def send_otp(phone: str, api_id: int, api_hash: str) -> None:
    """Request an OTP code cleanly and save temporary handshake state inside gitignored temp_videos_cloud."""
    TMP_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.connect()
    try:
        sent = await client.send_code_request(phone)
        temp_session = client.session.save()
        TMP_STATE_PATH.write_text(
            json.dumps(
                {
                    "phone": phone,
                    "api_id": api_id,
                    "api_hash": api_hash,
                    "phone_code_hash": sent.phone_code_hash,
                    "temp_session": temp_session,
                }
            ),
            encoding="utf-8",
        )
        print(f"OTP code sent to Telegram account {phone}.")
        print("Next step: verify the OTP with --verify-code <OTP>.")
    finally:
        await client.disconnect()


async def verify_otp(code: str, password: str = "") -> str:
    """Complete OTP verification and print an exclusive TELEGRAM_USER_SESSION string."""
    if not TMP_STATE_PATH.exists():
        raise FileNotFoundError("No pending OTP handshake found. Run --send-code first.")

    data = json.loads(TMP_STATE_PATH.read_text(encoding="utf-8"))
    client = TelegramClient(StringSession(data["temp_session"]), int(data["api_id"]), data["api_hash"])
    await client.connect()
    try:
        try:
            await client.sign_in(
                phone=data["phone"],
                code=code.strip(),
                phone_code_hash=data["phone_code_hash"],
            )
        except SessionPasswordNeededError:
            if not password:
                raise RuntimeError("2FA password required. Re-run with --password <YOUR_2FA_PASSWORD>.")
            await client.sign_in(password=password)

        final_session = client.session.save()
    finally:
        await client.disconnect()

    TMP_STATE_PATH.unlink(missing_ok=True)
    return final_session


async def interactive_login(phone: str, api_id: int, api_hash: str) -> str:
    """Interactive terminal prompt to generate a brand-new exclusive Cloud StringSession."""
    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.connect()
    try:
        sent = await client.send_code_request(phone)
        code = input(f"Enter Telegram OTP code sent to {phone}: ").strip()
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=sent.phone_code_hash)
        except SessionPasswordNeededError:
            pw = input("Enter your Telegram 2FA Password: ").strip()
            await client.sign_in(password=pw)
        return client.session.save()
    finally:
        await client.disconnect()


def _print_session_banner(session_str: str) -> None:
    print("\n" + "=" * 72)
    print("EXCLUSIVE CLOUD TELEGRAM_USER_SESSION (DO NOT COMMIT TO GIT OR SHARE):")
    print("-" * 72)
    print(session_str)
    print("-" * 72)
    print("Copy this entire token into your Cloud Server Environment Variable:")
    print("  TELEGRAM_USER_SESSION=<paste-above-token>")
    print("IMPORTANT: Do NOT run Local PC Studio with this same session simultaneously!")
    print("=" * 72 + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an exclusive Cloud TELEGRAM_USER_SESSION.")
    parser.add_argument("--phone", default=DEFAULT_PHONE, help="Telegram phone number (e.g. +855888162192)")
    parser.add_argument("--send-code", action="store_true", help="Send OTP code and store temporary handshake")
    parser.add_argument("--verify-code", default="", help="Verify OTP code from previous --send-code call")
    parser.add_argument("--password", default="", help="Optional Telegram 2FA password for --verify-code")
    args = parser.parse_args()

    if args.send_code:
        asyncio.run(send_otp(args.phone, DEFAULT_API_ID, DEFAULT_API_HASH))
    elif args.verify_code:
        session_str = asyncio.run(verify_otp(args.verify_code, args.password))
        _print_session_banner(session_str)
    else:
        session_str = asyncio.run(interactive_login(args.phone, DEFAULT_API_ID, DEFAULT_API_HASH))
        _print_session_banner(session_str)


if __name__ == "__main__":
    main()
