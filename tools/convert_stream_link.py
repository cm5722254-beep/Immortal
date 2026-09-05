#!/usr/bin/env python3
"""
NINT-ANIME Stream Link Converter Tool
Convert Link Type 1 (/api/video-stream?...) to Link Type 2 (https://s3.nintanime.com/.../ep-001/....mp4)
"""
import sys
import json
import urllib.request
import urllib.parse
from typing import Optional, Dict

# Force UTF-8 on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


def convert_stream_url(stream_url: str) -> Dict[str, str]:
    """Resolve a signed stream link into its underlying direct S3 storage MP4 URL."""
    stream_url = stream_url.strip()
    if not stream_url:
        return {"ok": False, "error": "Empty URL"}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://nintanime.com/",
        "Accept": "*/*",
    }

    # Custom redirect handler to intercept Location header before redirect
    class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
        def http_error_302(self, req, fp, code, msg, headers):
            return fp or headers
        http_error_301 = http_error_302
        http_error_303 = http_error_302
        http_error_307 = http_error_302
        http_error_308 = http_error_302

    opener = urllib.request.build_opener(NoRedirectHandler)
    request = urllib.request.Request(stream_url, headers=headers)

    try:
        resp = opener.open(request, timeout=15)
        loc = None
        if hasattr(resp, "headers"):
            loc = resp.headers.get("Location")
        elif hasattr(resp, "getheader"):
            loc = resp.getheader("Location")

        if loc:
            return {"ok": True, "direct_url": loc, "type": "redirect"}

        final_url = resp.geturl() if hasattr(resp, "geturl") else stream_url
        if "s3.nintanime.com" in final_url or final_url.endswith(".mp4") or final_url.endswith(".m3u8"):
            return {"ok": True, "direct_url": final_url, "type": "direct"}

    except Exception as e:
        # Fallback: Follow redirects
        try:
            with urllib.request.urlopen(urllib.request.Request(stream_url, headers=headers), timeout=15) as full_resp:
                final_url = full_resp.geturl()
                return {"ok": True, "direct_url": final_url, "type": "resolved"}
        except Exception as inner_e:
            return {"ok": False, "error": f"{str(e)} | {str(inner_e)}"}

    return {"ok": True, "direct_url": stream_url, "type": "original"}


def main():
    print("=" * 65)
    print("🎬 NINT-ANIME Stream Link Converter (Link 1 ➔ Link 2 S3 MP4)")
    print("=" * 65)

    if len(sys.argv) > 1:
        input_url = sys.argv[1]
    else:
        input_url = input("\n👉 Paste Link Type 1 (/api/video-stream?...):\n").strip()

    if not input_url:
        print("❌ No URL provided. Exiting.")
        return

    print("\n⏳ Resolving Direct S3 Stream Link...")
    result = convert_stream_url(input_url)

    if result.get("ok"):
        print("\n✅ CONVERSION SUCCESSFUL!")
        print("-" * 65)
        print("🎯 Direct S3 Video URL (Link Type 2):")
        print(result["direct_url"])
        print("-" * 65)
    else:
        print(f"\n❌ Error converting link: {result.get('error')}")


if __name__ == "__main__":
    main()
