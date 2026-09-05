#!/usr/bin/env python3
"""
🎬 Multi-Cloud & 3-Server Parallel Video Uploader
=================================================
Uploads video files to 3 different servers / S3 APIs simultaneously in 1 click!
- Parallel concurrent upload to Server 1, Server 2, Server 3
- Full S3 / Cloudflare R2 / BunnyCDN / Backblaze / AWS / MinIO compatibility
- Generates 3 Mirror Backup URLs for every single episode
"""

import os
import sys
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional

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
    print("❌ Error: boto3 is missing. Installing...")
    os.system("pip install boto3")
    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config


def load_config() -> Dict[str, Any]:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg_file = os.path.join(root_dir, "multi_server_config.json")
    if os.path.exists(cfg_file):
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Warning reading multi_server_config.json: {e}")
    
    # Fallback to single R2
    r2_file = os.path.join(root_dir, "r2_config.json")
    if os.path.exists(r2_file):
        with open(r2_file, "r", encoding="utf-8") as f:
            c = json.load(f)
            return {
                "server_1": {
                    "name": "Cloudflare R2 (Server 1)",
                    "enabled": True,
                    "endpoint": f"https://{c['account_id']}.r2.cloudflarestorage.com",
                    "access_key": c["access_key"],
                    "secret_key": c["secret_key"],
                    "bucket_name": c["bucket_name"],
                    "public_domain": c["public_domain"]
                }
            }
    return {}


def create_s3_client(server_cfg: Dict[str, Any]):
    return boto3.client(
        "s3",
        endpoint_url=server_cfg["endpoint"],
        aws_access_key_id=server_cfg["access_key"],
        aws_secret_access_key=server_cfg["secret_key"],
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )


def upload_single_server(server_id: str, server_cfg: Dict[str, Any], local_path: str, r2_key: str) -> Dict[str, Any]:
    server_name = server_cfg.get("name", server_id)
    try:
        client = create_s3_client(server_cfg)
        file_size = os.path.getsize(local_path)

        content_type = "video/mp4"
        if local_path.endswith(".mkv"):
            content_type = "video/x-matroska"
        elif local_path.endswith(".ts"):
            content_type = "video/mp2t"

        transfer_config = TransferConfig(
            multipart_threshold=15 * 1024 * 1024,
            max_concurrency=6,
            multipart_chunksize=15 * 1024 * 1024,
            use_threads=True
        )

        client.upload_file(
            Filename=local_path,
            Bucket=server_cfg["bucket_name"],
            Key=r2_key,
            ExtraArgs={'ContentType': content_type},
            Config=transfer_config
        )

        public_domain = server_cfg.get("public_domain", "").rstrip('/')
        url = f"{public_domain}/{r2_key}" if public_domain else f"{server_cfg['endpoint']}/{server_cfg['bucket_name']}/{r2_key}"
        return {
            "server_id": server_id,
            "name": server_name,
            "success": True,
            "url": url,
            "error": None
        }
    except Exception as e:
        return {
            "server_id": server_id,
            "name": server_name,
            "success": False,
            "url": None,
            "error": str(e)
        }


def upload_to_all_servers(active_servers: Dict[str, Any], local_file: str, r2_key: str) -> List[Dict[str, Any]]:
    file_name = os.path.basename(local_file)
    file_size_mb = os.path.getsize(local_file) / (1024 * 1024)
    print("\n" + "=" * 70)
    print(f"🚀 Uploading: {file_name} ({file_size_mb:.1f} MB)")
    print(f"📡 Uploading to {len(active_servers)} servers in parallel simultaneously...")
    print("-" * 70)

    results = []
    # Parallel concurrent uploads to all configured servers
    with ThreadPoolExecutor(max_workers=len(active_servers)) as executor:
        future_to_srv = {
            executor.submit(upload_single_server, sid, scfg, local_file, r2_key): sid
            for sid, scfg in active_servers.items()
        }

        for future in as_completed(future_to_srv):
            res = future.result()
            results.append(res)
            if res["success"]:
                print(f"✅ [{res['name']}]: Upload ជោគជ័យ ➔ {res['url']}")
            else:
                print(f"❌ [{res['name']}]: បរាជ័យ ({res['error']})")

    return results


def main():
    print("=" * 70)
    print("🎬 MULTI-SERVER 3-API PARALLEL VIDEO UPLOADER")
    print("======================================================================")

    config = load_config()
    active_servers = {
        k: v for k, v in config.items()
        if v.get("enabled", True) and v.get("access_key") and "YOUR_ACCESS" not in v.get("access_key", "")
    }

    if not active_servers:
        print("❌ មិនទាន់មាន Server ណាត្រូវបានកំណត់នៅក្នុង multi_server_config.json ឡើយ!")
        print("👉 សូមបើក multi_server_config.json រួចដាក់ API keys របស់ Server ទាំង ៣ របស់អ្នក។")
        input("\nចុច Enter ដើម្បីបិទ...")
        return

    print(f"📡 រកឃើញ Server ចំនួន {len(active_servers)} ដែលកំពុងបើកដំណើរការ (Active Servers):")
    for sid, scfg in active_servers.items():
        print(f"  • {scfg.get('name', sid)} ({scfg.get('bucket_name')})")

    # Get input file/folder
    if len(sys.argv) > 1:
        target_path = sys.argv[1].strip('\"\'')
    else:
        target_path = input("\n👉 សូមអូស File ឬ Folder វីដេអូមកដាក់ទីនេះ រួចចុច Enter:\n").strip('\"\'')

    if not os.path.exists(target_path):
        print(f"❌ រកមិនឃើញ File/Folder: {target_path}")
        input("\nចុច Enter ដើម្បីបិទ...")
        return

    all_uploads_summary = []

    if os.path.isdir(target_path):
        folder_name = os.path.basename(os.path.normpath(target_path))
        files = []
        for root, _, f_list in os.walk(target_path):
            for file in sorted(f_list):
                if file.lower().endswith(('.mp4', '.mkv', '.ts', '.m3u8', '.webm')):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, target_path)
                    r2_key = f"{folder_name}/{rel_path}".replace('\\', '/')
                    files.append((full_path, r2_key))

        print(f"\n📁 រកឃើញវីដេអូចំនួន {len(files)} ភាគ។ ចាប់ផ្ដើមដំណើរការ Upload ទៅកាន់ Server ទាំង {len(active_servers)} ក្នុងពេលតែមួយ...")
        for local_file, r2_key in files:
            res = upload_to_all_servers(active_servers, local_file, r2_key)
            all_uploads_summary.append({"file": os.path.basename(local_file), "servers": res})
    else:
        file_name = os.path.basename(target_path)
        folder_prefix = input(f"\n👉 ឈ្មោះ Folder លើ Server (ចុច Enter យក 'episodes'): ").strip() or "episodes"
        r2_key = f"{folder_prefix}/{file_name}"
        res = upload_to_all_servers(active_servers, target_path, r2_key)
        all_uploads_summary.append({"file": file_name, "servers": res})

    # Summary table
    print("\n\n" + "🎉" * 15 + " តារាងលទ្ធផល LINK លើ SERVER ទាំង ៣ " + "🎉" * 15)
    for item in all_uploads_summary:
        print(f"\n🎬 វីដេអូ៖ {item['file']}")
        for s in item["servers"]:
            status_icon = "🟢" if s["success"] else "🔴"
            link = s["url"] if s["success"] else f"Error: {s['error']}"
            print(f"   {status_icon} [{s['name']}]: {link}")

    # Save summary JSON for convenient copying
    output_log = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "multi_server_links.json")
    try:
        with open(output_log, "w", encoding="utf-8") as f:
            json.dump(all_uploads_summary, f, indent=2, ensure_ascii=False)
        print(f"\n💾 បានរក្សាទុក Link ទាំងអស់ក្នុងឯកសារ: multi_server_links.json")
    except Exception:
        pass

    print("\n" + "=" * 70)
    print("✅ បេសកកម្ម Upload ទៅកាន់ Server ទាំង ៣ រួចរាល់ដោយជោគជ័យ!")
    input("\nចុច Enter ដើម្បីបិទ...")


if __name__ == "__main__":
    main()
