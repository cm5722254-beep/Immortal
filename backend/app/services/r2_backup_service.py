# R2 Cloud Backup Service
import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger("merdonghua.r2_backup")

def get_r2_client():
    try:
        import boto3
        from botocore.config import Config

        cfg_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "r2_config.json"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "r2_config.json"),
            "r2_config.json",
            "backend/r2_config.json"
        ]
        cfg = None
        for cp in cfg_paths:
            if os.path.exists(cp):
                try:
                    with open(cp, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                        break
                except Exception:
                    pass

        account_id = os.getenv("R2_ACCOUNT_ID") or (cfg.get("account_id") if cfg else None)
        access_key = os.getenv("R2_ACCESS_KEY") or (cfg.get("access_key") if cfg else None)
        secret_key = os.getenv("R2_SECRET_KEY") or (cfg.get("secret_key") if cfg else None)
        bucket_name = os.getenv("R2_BUCKET_NAME") or (cfg.get("bucket_name") if cfg else "rit-anime-videos")

        if not (account_id and access_key and secret_key and bucket_name):
            return None, None

        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )
        return client, bucket_name
    except Exception as e:
        logger.warning(f"Failed to initialize R2 client: {e}")
        return None, None


def upload_backup_to_r2_sync(data_dict: Dict[str, Any]) -> bool:
    anime_count = len(data_dict.get("anime", []))
    if anime_count < 10:
        logger.warning(f"Aborting R2 backup upload: payload has only {anime_count} anime. Protection against empty overwrite triggered.")
        return False

    client, bucket = get_r2_client()
    if not client or not bucket:
        return False
    try:
        payload = json.dumps(data_dict, ensure_ascii=False, indent=2).encode("utf-8")
        client.put_object(
            Bucket=bucket,
            Key="backups/seed_export.json",
            Body=payload,
            ContentType="application/json"
        )
        now_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        client.put_object(
            Bucket=bucket,
            Key=f"backups/backup_{now_str}.json",
            Body=payload,
            ContentType="application/json"
        )
        logger.info(f"Uploaded backup to Cloudflare R2: {anime_count} anime")
        return True
    except Exception as e:
        logger.error(f"Error uploading backup to Cloudflare R2: {e}")
        return False


def fetch_latest_backup_from_r2_sync() -> Optional[Dict[str, Any]]:
    client, bucket = get_r2_client()
    if not client or not bucket:
        return None
    try:
        obj = client.get_object(Bucket=bucket, Key="backups/seed_export.json")
        data = json.loads(obj["Body"].read().decode("utf-8"))
        logger.info(f"Fetched latest backup from Cloudflare R2: {len(data.get('anime', []))} anime")
        return data
    except Exception as e:
        logger.warning(f"Could not fetch backup from R2: {e}")
        return None
