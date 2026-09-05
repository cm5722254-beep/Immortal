#!/usr/bin/env python3
"""
NINT-ANIME Video Stream Downloader
Download streaming MP4 directly to a local file using session credentials and stream URL.
"""

import sys
import os
import time
import urllib.request
import urllib.parse
from typing import Optional

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


def download_stream_video(
    url: str,
    output_filename: str = "downloaded_episode.mp4",
    session_token: Optional[str] = None,
    referer: str = "https://nintanime.com/"
) -> bool:
    """Download video stream with live progress."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Range": "bytes=0-",
    }

    if session_token:
        # Check if full cookie string or just session token
        if "__Secure-next-auth.session-token=" in session_token:
            headers["Cookie"] = session_token
        else:
            headers["Cookie"] = f"__Secure-next-auth.session-token={session_token.strip()}"

    print(f"\n📡 កំពុងភ្ជាប់ទៅកាន់ Server...")
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content_type = response.headers.get("Content-Type", "")
            print(f"📦 Content-Type: {content_type}")

            # Get total file size
            content_range = response.headers.get("Content-Range", "")
            total_size = 0
            if content_range and "/" in content_range:
                try:
                    total_size = int(content_range.split("/")[-1])
                except ValueError:
                    total_size = 0

            if not total_size:
                content_length = response.headers.get("Content-Length", 0)
                try:
                    total_size = int(content_length)
                except ValueError:
                    total_size = 0

            total_mb = total_size / (1024 * 1024) if total_size else 0
            print(f"💾 ទំហំវីដេអូសរុប: {total_mb:.2f} MB" if total_mb else "💾 ទំហំវីដេអូ: កំពុង Stream...")

            downloaded_bytes = 0
            chunk_size = 1024 * 512  # 512 KB chunks
            start_time = time.time()

            print(f"🚀 កំពុងទាញយកដាក់ចូលឯកសារ: {output_filename}\n")

            with open(output_filename, "wb") as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break

                    f.write(chunk)
                    downloaded_bytes += len(chunk)

                    # Calculate progress & speed
                    elapsed = time.time() - start_time
                    speed_mb = (downloaded_bytes / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    downloaded_mb = downloaded_bytes / (1024 * 1024)

                    if total_size > 0:
                        percent = (downloaded_bytes / total_size) * 100
                        bar_len = 30
                        filled_len = int(bar_len * downloaded_bytes // total_size)
                        bar = "█" * filled_len + "░" * (bar_len - filled_len)
                        print(
                            f"\r[{bar}] {percent:.1f}% | {downloaded_mb:.1f}/{total_mb:.1f} MB | {speed_mb:.2f} MB/s",
                            end="",
                            flush=True
                        )
                    else:
                        print(
                            f"\r📥 Downloaded: {downloaded_mb:.1f} MB | {speed_mb:.2f} MB/s",
                            end="",
                            flush=True
                        )

            print(f"\n\n🎉 Download បានសម្រេចដោយជោគជ័យ!")
            print(f"📁 ទីតាំងឯកសារ: {os.path.abspath(output_filename)}")
            return True

    except urllib.error.HTTPError as e:
        print(f"\n❌ HTTP Error {e.code}: {e.reason}")
        if e.code == 403:
            print("⚠️ Link បានផុតកំណត់ (Expired) ឬ Session Token មិនត្រឹមត្រូវ សូមចម្លង Token ថ្មី។")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


if __name__ == "__main__":
    print("=" * 65)
    print("🎬 NINT-ANIME Video Stream Downloader (.MP4)")
    print("=" * 65)

    # 1. ទទួល Video Stream URL
    input_url = input("\n👉 សូមបញ្ចូល Video Stream URL (/api/video-stream?...):\n").strip()
    if not input_url:
        print("❌ មិនមាន URL។ បញ្ឈប់ដំណើរការ។")
        sys.exit(1)

    # 2. ទទួល Session Token ឬ Cookie (Optional បើមានក្នុង URL រួច)
    session_token = input("\n👉 សូមបញ្ចូល __Secure-next-auth.session-token (ចុច Enter បើមិនចង់ដាក់):\n").strip()

    # 3. ឈ្មោះឯកសារដែលត្រូវ Save
    output_name = input("\n👉 ដាក់ឈ្មោះឯកសារ (Default: video_episode.mp4): ").strip()
    if not output_name:
        output_name = "video_episode.mp4"
    if not output_name.endswith(".mp4"):
        output_name += ".mp4"

    download_stream_video(
        url=input_url,
        output_filename=output_name,
        session_token=session_token if session_token else None
    )
