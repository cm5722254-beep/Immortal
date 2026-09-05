#!/usr/bin/env python3
"""
🇰🇭 NBC BAKONG OPEN API & KHQR TEST TOOL
========================================
Test connection and verify payments with the National Bank of Cambodia (NBC)
Bakong Open API.
"""

import sys
import hashlib
import json
import urllib.request
import urllib.error

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BAKONG_API_URL = "https://api-bakong.nbc.gov.kh/v1"


def check_transaction_by_md5(md5_hash: str, token: str):
    """
    Check if payment was received for a specific KHQR MD5.
    Endpoint: POST https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5
    """
    url = f"{BAKONG_API_URL}/check_transaction_by_md5"
    payload = json.dumps({"md5": md5_hash}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            return True, data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else str(e)
        return False, f"HTTP {e.code}: {err_msg}"
    except Exception as e:
        return False, str(e)


def main():
    print("=" * 65)
    print(" 🇰🇭 NBC BAKONG OPEN API & KHQR PAYMENT CHECKER")
    print("=" * 65)
    print(f"🌐 Bakong API URL: {BAKONG_API_URL}\n")

    token = input("👉 Enter your Bakong Developer Token (Bearer Token): ").strip()
    if not token:
        print("❌ Token is required.")
        return

    print("\nOptions:")
    print("  [1] Check transaction by KHQR String (calculates MD5 automatically)")
    print("  [2] Check transaction by direct MD5 Hash")
    choice = input("\nChoose (1 or 2): ").strip()

    if choice == "1":
        khqr = input("👉 Paste KHQR String: ").strip()
        if not khqr:
            return
        md5_hash = hashlib.md5(khqr.encode("utf-8")).hexdigest()
        print(f"🔑 Calculated MD5: {md5_hash}")
    else:
        md5_hash = input("👉 Enter MD5 Hash (32 hex characters): ").strip()

    if not md5_hash:
        return

    print("\n⏳ Checking payment status on NBC Bakong Open API...")
    ok, result = check_transaction_by_md5(md5_hash, token)

    if ok:
        print("\n✅ API Response Received:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        code = result.get("responseCode")
        if code == 0:
            print("\n🎉 PAYMENT SUCCESSFUL! Transaction is confirmed by Bakong.")
        else:
            print(f"\n⚠️ Response Code: {code} ({result.get('responseMessage')})")
    else:
        print(f"\n❌ Request failed: {result}")


if __name__ == "__main__":
    main()
