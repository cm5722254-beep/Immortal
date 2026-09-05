#!/usr/bin/env python3
"""
🎬 Cloudflare R2 Large Video Uploader (Bypass 300MB Web Limit)
=============================================================
Uploads large video files (.mp4, .mkv, .ts, etc.) to Cloudflare R2
using S3 Multipart Upload (Supports unlimited file sizes up to 5 TB).
"""

import os
import sys
import json
import time
import threading
from typing import List, Optional

# Force UTF-8 on Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config
except ImportError:
    print("❌ Error: boto3 is not installed. Installing boto3...")
    os.system("pip install boto3")
    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config


def load_r2_config():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg_file = os.path.join(root_dir, "r2_config.json")
    if os.path.exists(cfg_file):
        with open(cfg_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "account_id": "1d54b0dc7bdad89412ac36527c758b10",
        "access_key": "ac74d336cebfe08b6cc8f9eb4efb8093",
        "secret_key": "f7f318794694573404f8aa9ba9c1ed61dec57732a19b9f79bf2f99de1a928bda",
        "bucket_name": "rit-anime-videos",
        "public_domain": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev"
    }


class ProgressPercentage(object):
    def __init__(self, filename, total_size):
        self._filename = filename
        self._size = float(total_size)
        self._seen_so_far = 0
        self._lock = threading.Lock()
        self._start_time = time.time()

    def __call__(self, bytes_amount):
        with self._lock:
            self._seen_so_far += bytes_amount
            percentage = (self._seen_so_far / self._size) * 100
            elapsed = time.time() - self._start_time
            speed = (self._seen_so_far / (1024 * 1024)) / elapsed if elapsed > 0 else 0
            
            mb_uploaded = self._seen_so_far / (1024 * 1024)
            mb_total = self._size / (1024 * 1024)
            
            bar_length = 30
            filled = int(bar_length * self._seen_so_far // self._size)
            bar = '█' * filled + '░' * (bar_length - filled)
            
            sys.stdout.write(
                f"\r⏳ Uploading: [{bar}] {percentage:.1f}% ({mb_uploaded:.1f}/{mb_total:.1f} MB) | Speed: {speed:.1f} MB/s  "
            )
            sys.stdout.flush()


def upload_file(client, bucket_name: str, public_domain: str, local_path: str, r2_key: str):
    file_size = os.path.getsize(local_path)
    file_name = os.path.basename(local_path)
    
    print("\n" + "=" * 65)
    print(f"🎬 Uploading File: {file_name}")
    print(f"📦 File Size: {file_size / (1024 * 1024):.2f} MB")
    print(f"🎯 Target R2 Path: {r2_key}")
    print("-" * 65)

    # 15MB multipart chunk configuration for fast multi-threaded uploads
    transfer_config = TransferConfig(
        multipart_threshold=15 * 1024 * 1024,
        max_concurrency=10,
        multipart_chunksize=15 * 1024 * 1024,
        use_threads=True
    )

    progress = ProgressPercentage(file_name, file_size)

    # Determine Content-Type
    content_type = "video/mp4"
    if local_path.endswith(".mkv"):
        content_type = "video/x-matroska"
    elif local_path.endswith(".ts"):
        content_type = "video/mp2t"
    elif local_path.endswith(".m3u8"):
        content_type = "application/x-mpegURL"

    try:
        client.upload_file(
            Filename=local_path,
            Bucket=bucket_name,
            Key=r2_key,
            ExtraArgs={
                'ContentType': content_type,
            },
            Config=transfer_config,
            Callback=progress
        )
        
        public_domain = public_domain.rstrip('/')
        url = f"{public_domain}/{r2_key}"
        print("\n\n" + "✅" * 15 + " UPLOAD SUCCESSFUL " + "✅" * 15)
        print(f"🔗 Direct Video URL (សម្រាប់យកទៅដាក់ក្នុង Merdonghua):")
        print(f"\n👉  {url}\n")
        print("=" * 65)
        return url
    except Exception as e:
        print(f"\n❌ Upload Error: {e}")
        return None


def main():
    print("=" * 65)
    print("🚀 Cloudflare R2 Large Video Uploader (Bypass 300MB Limit)")
    print("=" * 65)

    cfg = load_r2_config()
    endpoint = f"https://{cfg['account_id']}.r2.cloudflarestorage.com"

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=cfg["access_key"],
        aws_secret_access_key=cfg["secret_key"],
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

    # Check input arguments
    if len(sys.argv) > 1:
        target_path = sys.argv[1].strip('\"\'')
    else:
        target_path = input("\n👉 សូមអូស File/Folder វីដេអូមកដាក់ទីនេះ (Drag & drop File or Folder) រួចចុច Enter:\n").strip('\"\'')

    if not os.path.exists(target_path):
        print(f"❌ រកមិនឃើញ File/Folder: {target_path}")
        input("\nចុច Enter ដើម្បីបិទ...")
        return

    # Folder or single file
    if os.path.isdir(target_path):
        folder_name = os.path.basename(os.path.normpath(target_path))
        files_to_upload = []
        for root, _, files in os.walk(target_path):
            for file in sorted(files):
                if file.lower().endswith(('.mp4', '.mkv', '.ts', '.m3u8', '.webm', '.avi')):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, target_path)
                    r2_key = f"{folder_name}/{rel_path}".replace('\\', '/')
                    files_to_upload.append((full_path, r2_key))

        if not files_to_upload:
            print(f"❌ គ្មាន File វីដេអូ (.mp4, .mkv) នៅក្នុង Folder នេះឡើយ!")
            input("\nចុច Enter ដើម្បីបិទ...")
            return

        print(f"\n📁 រកឃើញវីដេអូចំនួន {len(files_to_upload)} Files នៅក្នុង Folder '{folder_name}'។ កំពុង Upload...")
        results = []
        for local_file, r2_key in files_to_upload:
            url = upload_file(s3_client, cfg['bucket_name'], cfg['public_domain'], local_file, r2_key)
            if url:
                results.append((os.path.basename(local_file), url))

        print("\n\n" + "🎉" * 10 + " បញ្ជី LINK វីដេអូទាំងអស់ដែលបាន UPLOAD រួច " + "🎉" * 10)
        for name, url in results:
            print(f"🎬 {name} ➔ {url}")

    else:
        file_name = os.path.basename(target_path)
        folder_prefix = input(f"\n👉 បញ្ចូលឈ្មោះ Folder នៅលើ R2 (ចុច Enter យក 'episodes'): ").strip() or "episodes"
        r2_key = f"{folder_prefix}/{file_name}"
        upload_file(s3_client, cfg['bucket_name'], cfg['public_domain'], target_path, r2_key)

    print("\n✅ រួចរាល់!")
    input("\nចុច Enter ដើម្បីបិទ...")


if __name__ == "__main__":
    main()
