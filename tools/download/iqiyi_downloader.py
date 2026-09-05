#!/usr/bin/env python3
"""
🎬 MER DONGHUA — iQIYI (iq.com) VIP Video Downloader
====================================================
Automated tool using yt-dlp to download 1080p/HD VIP videos directly
from iQIYI using browser cookies (Chrome, Edge) or cookies.txt.
"""

import os
import sys
import subprocess
import re
from pathlib import Path

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "downloaded_videos" / "iQIYI"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
COOKIES_FILE = ROOT_DIR / "iq_cookies.txt"


def check_dependencies():
    """Verify yt-dlp and ffmpeg are ready."""
    try:
        import yt_dlp
    except ImportError:
        print("❌ yt-dlp is not installed. Installing yt-dlp now...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-U", "yt-dlp"])


def download_iqiyi_video(url: str, cookie_source: str = "chrome"):
    """
    Downloads iQIYI video using yt-dlp with the specified cookie source.
    cookie_source can be: 'chrome', 'edge', 'firefox', or 'file' (iq_cookies.txt)
    """
    url = url.strip()
    if not url:
        print("❌ URL is empty.")
        return False

    print("\n" + "=" * 65)
    print(f"🎬 Starting iQIYI VIP Download: {url}")
    print(f"📂 Output Directory: {OUTPUT_DIR}")
    print(f"🍪 Cookie Source: {cookie_source}")
    print("=" * 65)

    # Output template: downloaded_videos/iQIYI/%(series,title)s/Ep_%(episode_number,playlist_index)03d_%(title)s.%(ext)s
    output_template = str(OUTPUT_DIR / "%(series,playlist_title,title)s" / "%(title)s.%(ext)s")

    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "-o", output_template,
        "--format", "bestvideo+bestaudio/best",
        "--merge-output-format", "mp4",
        "--no-check-certificates",
        "--add-metadata",
    ]

    if cookie_source == "file":
        if not COOKIES_FILE.exists():
            print(f"❌ Cookies file not found: {COOKIES_FILE}")
            print("👉 Please export your iQIYI cookies and save as 'iq_cookies.txt' in the project folder.")
            return False
        cmd.extend(["--cookies", str(COOKIES_FILE)])
    else:
        cmd.extend(["--cookies-from-browser", cookie_source])

    print(f"\n🚀 Running command:\n{' '.join(cmd[:6])} ...\n")

    try:
        res = subprocess.run(cmd)
        if res.returncode == 0:
            print("\n🎉 DOWNLOAD COMPLETED SUCCESSFULLY!")
            print(f"📁 Check your downloaded video in: {OUTPUT_DIR}")
            return True
        else:
            print(f"\n❌ Download exited with code: {res.returncode}")
            return False
    except Exception as e:
        print(f"\n❌ Error during download: {e}")
        return False


def main():
    check_dependencies()

    print("=" * 70)
    print(" 🎬 MER DONGHUA — iQIYI VIP VIDEO DOWNLOADER (ជម្រើស B: yt-dlp)")
    print(" 🚀 ទាញយកវីដេអូកម្រិតច្បាស់ 1080p ពី iQIYI ដោយប្រើ Account VIP")
    print("=" * 70)
    print("  [1] ប្រើ Cookies ដោយស្វ័យប្រវត្តិពី Google Chrome (បាន Login លើ Chrome)")
    print("  [2] ប្រើ Cookies ដោយស្វ័យប្រវត្តិពី Microsoft Edge (បាន Login លើ Edge)")
    print("  [3] ប្រើ File 'iq_cookies.txt' (Export ពី Extension)")
    print("  [4] ចាកចេញ (Exit)")
    print("-" * 70)

    choice = input("👉 សូមជ្រើសរើសប្រភព Cookies (1, 2, or 3): ").strip()
    if choice == "1":
        source = "chrome"
    elif choice == "2":
        source = "edge"
    elif choice == "3":
        source = "file"
    else:
        print("👋 ចាកចេញ។")
        return

    url = input("\n👉 សូមបញ្ចូលតំណភ្ជាប់ iQIYI URL (Paste iQiyi Link, e.g. https://www.iq.com/play/...):\n").strip()
    if not url:
        print("❌ មិនបានបញ្ចូល URL ទេ។")
        return

    download_iqiyi_video(url, cookie_source=source)


if __name__ == "__main__":
    main()
