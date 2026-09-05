import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import require_admin
from app.models.user import User

logger = logging.getLogger("promo_settings")

router = APIRouter(tags=["Site Settings"])

PROMO_CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "promo_settings.json")


def get_current_time() -> datetime:
    return datetime.now(timezone.utc)


def load_promo_config() -> dict:
    default_start = get_current_time()
    default_end = default_start + timedelta(days=15)
    default_config = {
        "promo_enabled": True,
        "promo_duration_days": 15,
        "start_time": default_start.isoformat(),
        "end_time": default_end.isoformat(),
        "force_vip_lock": False,
        # System Update / Maintenance Mode settings
        "system_update_enabled": False,
        "system_update_title": "🚀 Website កំពុង Update ជំនាន់ថ្មី",
        "system_update_message": "យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន និងល្អបំផុតជូនប្រិយមិត្តទាំងអស់គ្នា! សូមអភ័យទោសចំពោះការរំខានបណ្ដោះអាសន្ន។",
        "system_update_version": "v2.5.0 Update",
        "system_update_eta": "នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ",
        "system_update_allow_dismiss": True,
        "system_update_telegram_link": "https://t.me/namianime_channel",
        "updated_at": default_start.isoformat(),
    }

    try:
        if os.path.exists(PROMO_CONFIG_FILE):
            with open(PROMO_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**default_config, **data}
        else:
            save_promo_config(default_config)
            return default_config
    except Exception as e:
        logger.warning(f"Error loading promo config: {e}")
        return default_config


def save_promo_config(config: dict):
    try:
        os.makedirs(os.path.dirname(PROMO_CONFIG_FILE), exist_ok=True)
        with open(PROMO_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save promo config: {e}")
        raise HTTPException(status_code=500, detail="Failed to save promo configuration")


def compute_promo_status(config: dict) -> dict:
    now = get_current_time()
    try:
        end_time = datetime.fromisoformat(config["end_time"])
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
    except Exception:
        end_time = now + timedelta(days=15)

    is_enabled = config.get("promo_enabled", True)
    force_lock = config.get("force_vip_lock", False)

    total_seconds_left = max(0, int((end_time - now).total_seconds()))
    is_time_expired = total_seconds_left <= 0

    # If promo is disabled or time expired or admin forced lock -> VIP is required for all
    is_vip_locked = force_lock or not is_enabled or is_time_expired

    days = total_seconds_left // 86400
    hours = (total_seconds_left % 86400) // 3600
    minutes = (total_seconds_left % 3600) // 60
    seconds = total_seconds_left % 60

    return {
        "promo_enabled": is_enabled,
        "start_time": config.get("start_time"),
        "end_time": end_time.isoformat(),
        "now": now.isoformat(),
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "total_seconds_left": total_seconds_left,
        "is_expired": is_time_expired,
        "force_vip_lock": force_lock,
        "is_vip_locked": is_vip_locked,
        # System Update Mode payload
        "system_update": {
            "enabled": config.get("system_update_enabled", False),
            "title": config.get("system_update_title", "🚀 Website កំពុង Update ជំនាន់ថ្មី"),
            "message": config.get("system_update_message", "យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន និងល្អបំផុតជូនប្រិយមិត្តទាំងអស់គ្នា!"),
            "version": config.get("system_update_version", "v2.5.0 Update"),
            "eta": config.get("system_update_eta", "នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ"),
            "allow_dismiss": config.get("system_update_allow_dismiss", True),
            "telegram_link": config.get("system_update_telegram_link", "https://t.me/namianime_channel"),
        }
    }


class PromoUpdateRequest(BaseModel):
    promo_enabled: Optional[bool] = None
    reset_15_days: Optional[bool] = None
    custom_days: Optional[int] = None
    custom_end_time: Optional[str] = None
    force_vip_lock: Optional[bool] = None


class SystemUpdateUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    title: Optional[str] = None
    message: Optional[str] = None
    version: Optional[str] = None
    eta: Optional[str] = None
    allow_dismiss: Optional[bool] = None
    telegram_link: Optional[str] = None


@router.get("/site-settings/promo-countdown")
@router.get("/site-settings")
async def get_promo_countdown():
    """Get active 15-day promotional countdown and VIP lock status."""
    config = load_promo_config()
    return compute_promo_status(config)


@router.get("/site-settings/system-update")
async def get_system_update_status():
    """Public endpoint to get current Website Update / Maintenance status."""
    config = load_promo_config()
    return {
        "enabled": config.get("system_update_enabled", False),
        "title": config.get("system_update_title", "🚀 Website កំពុង Update ជំនាន់ថ្មី"),
        "message": config.get("system_update_message", "យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន និងល្អបំផុតជូនប្រិយមិត្តទាំងអស់គ្នា!"),
        "version": config.get("system_update_version", "v2.5.0 Update"),
        "eta": config.get("system_update_eta", "នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ"),
        "allow_dismiss": config.get("system_update_allow_dismiss", True),
        "telegram_link": config.get("system_update_telegram_link", "https://t.me/namianime_channel"),
        "updated_at": config.get("updated_at"),
    }


@router.put("/admin/site-settings/system-update")
async def update_system_update_status(
    data: SystemUpdateUpdateRequest,
    admin: User = Depends(require_admin),
):
    """Admin endpoint to toggle Website Update Mode on/off and configure announcement details."""
    config = load_promo_config()
    now = get_current_time()

    if data.enabled is not None:
        config["system_update_enabled"] = data.enabled
    if data.title is not None:
        config["system_update_title"] = data.title.strip()
    if data.message is not None:
        config["system_update_message"] = data.message.strip()
    if data.version is not None:
        config["system_update_version"] = data.version.strip()
    if data.eta is not None:
        config["system_update_eta"] = data.eta.strip()
    if data.allow_dismiss is not None:
        config["system_update_allow_dismiss"] = data.allow_dismiss
    if data.telegram_link is not None:
        config["system_update_telegram_link"] = data.telegram_link.strip()

    config["updated_at"] = now.isoformat()
    save_promo_config(config)

    return {
        "status": "success",
        "message": "System Update status updated successfully",
        "system_update": {
            "enabled": config.get("system_update_enabled", False),
            "title": config.get("system_update_title"),
            "message": config.get("system_update_message"),
            "version": config.get("system_update_version"),
            "eta": config.get("system_update_eta"),
            "allow_dismiss": config.get("system_update_allow_dismiss"),
            "telegram_link": config.get("system_update_telegram_link"),
        }
    }


@router.put("/admin/site-settings/promo-countdown")
async def update_promo_countdown(
    data: PromoUpdateRequest,
    admin: User = Depends(require_admin),
):
    """Admin updates the 15-day promo countdown or forces VIP lockdown."""
    config = load_promo_config()
    now = get_current_time()

    if data.promo_enabled is not None:
        config["promo_enabled"] = data.promo_enabled

    if data.force_vip_lock is not None:
        config["force_vip_lock"] = data.force_vip_lock

    if data.reset_15_days:
        config["start_time"] = now.isoformat()
        config["end_time"] = (now + timedelta(days=15)).isoformat()
        config["force_vip_lock"] = False
        config["promo_enabled"] = True
    elif data.custom_days is not None and data.custom_days > 0:
        config["start_time"] = now.isoformat()
        config["end_time"] = (now + timedelta(days=data.custom_days)).isoformat()
        config["force_vip_lock"] = False
    elif data.custom_end_time:
        try:
            parsed = datetime.fromisoformat(data.custom_end_time)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            config["end_time"] = parsed.isoformat()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid custom_end_time ISO format")

    config["updated_at"] = now.isoformat()
    save_promo_config(config)

    return compute_promo_status(config)
