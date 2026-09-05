import json
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Site Theme & Appearance"])

THEMES_FILE = os.path.join(os.path.dirname(__file__), "..", "core", "site_theme.json")

SUPPORTED_THEMES = [
    {
        "id": "midnight-slate",
        "name": "Midnight Slate (លំនាំដើម)",
        "name_en": "Midnight Slate (Default)",
        "bg_base": "#0A0E17",
        "bg_card": "#111726",
        "bg_card_subtle": "#161F33",
        "border": "#1E283C",
        "accent": "#E8452C",
        "description": "The signature dark cinematic look with orange-red glow"
    },
    {
        "id": "pure-obsidian",
        "name": "OLED Pure Obsidian (ខ្មៅសុទ្ធ)",
        "name_en": "OLED Pure Obsidian",
        "bg_base": "#040404",
        "bg_card": "#101010",
        "bg_card_subtle": "#181818",
        "border": "#262626",
        "accent": "#E8452C",
        "description": "Deepest OLED pitch black for ultra contrast and battery efficiency"
    },
    {
        "id": "dragon-blood",
        "name": "Dragon Blood (ក្រហមឈាមនាគ)",
        "name_en": "Dragon Blood Burgundy",
        "bg_base": "#120609",
        "bg_card": "#1C0B10",
        "bg_card_subtle": "#281017",
        "border": "#3B1622",
        "accent": "#FF3355",
        "description": "Fierce imperial burgundy dark background with fiery crimson accents"
    },
    {
        "id": "cyber-purple",
        "name": "Cyber Neon Purple (ស្វាយ Cyber)",
        "name_en": "Cyber Neon Purple",
        "bg_base": "#0D071B",
        "bg_card": "#160C2C",
        "bg_card_subtle": "#221344",
        "border": "#361F66",
        "accent": "#A855F7",
        "description": "Electrifying cyberpunk deep violet atmosphere"
    },
    {
        "id": "jade-dynasty",
        "name": "Jade Dynasty (បៃតងត្បូងមរកត)",
        "name_en": "Jade Dynasty Emerald",
        "bg_base": "#04130D",
        "bg_card": "#082016",
        "bg_card_subtle": "#0E2F21",
        "border": "#184734",
        "accent": "#10B981",
        "description": "Mystical ancient emerald jade with luminous forest glow"
    },
    {
        "id": "ocean-sapphire",
        "name": "Ocean Sapphire (ខៀវទឹកសមុទ្រ)",
        "name_en": "Ocean Sapphire Deep Blue",
        "bg_base": "#050E1E",
        "bg_card": "#0A1830",
        "bg_card_subtle": "#0F2445",
        "border": "#183866",
        "accent": "#38BDF8",
        "description": "Calm and rich abyssal ocean sapphire blue"
    },
    {
        "id": "imperial-gold",
        "name": "Imperial Gold (មាសរាជវាំង)",
        "name_en": "Imperial Amber Gold",
        "bg_base": "#130D06",
        "bg_card": "#1F160A",
        "bg_card_subtle": "#2C1F0E",
        "border": "#423016",
        "accent": "#F59E0B",
        "description": "Prestigious dark bronze and royal golden amber highlights"
    },
    {
        "id": "cyber-cobalt",
        "name": "Cyber Cobalt (ខៀវអគ្គិសនី)",
        "name_en": "Cyber Cobalt Neon",
        "bg_base": "#06121C",
        "bg_card": "#0B1E2E",
        "bg_card_subtle": "#102B42",
        "border": "#1B4263",
        "accent": "#06B6D4",
        "description": "Futuristic neon cyan with high-tech cobalt midnight background"
    },
    {
        "id": "velvet-rose",
        "name": "Velvet Rose (ផ្កាកុលាប Velvet)",
        "name_en": "Velvet Rose & Magenta",
        "bg_base": "#140711",
        "bg_card": "#200C1B",
        "bg_card_subtle": "#2E1227",
        "border": "#451B3B",
        "accent": "#F43F5E",
        "description": "Seductive velvet dark rose magenta ambiance"
    },
    {
        "id": "titanium-gunmetal",
        "name": "Titanium Carbon (ប្រផេះដែកថែប)",
        "name_en": "Titanium Gunmetal Carbon",
        "bg_base": "#0D1016",
        "bg_card": "#141922",
        "bg_card_subtle": "#1C2330",
        "border": "#2C3647",
        "accent": "#94A3B8",
        "description": "Sleek industrial titanium and stealth carbon steel"
    }
]


def load_theme_setting() -> str:
    try:
        if os.path.exists(THEMES_FILE):
            with open(THEMES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                theme_id = data.get("theme_id", "midnight-slate")
                if any(t["id"] == theme_id for t in SUPPORTED_THEMES):
                    return theme_id
    except Exception as e:
        logger.warning(f"Failed to read theme file: {e}")
    return "midnight-slate"


def save_theme_setting(theme_id: str):
    try:
        os.makedirs(os.path.dirname(THEMES_FILE), exist_ok=True)
        with open(THEMES_FILE, "w", encoding="utf-8") as f:
            json.dump({"theme_id": theme_id}, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write theme file: {e}")
        raise HTTPException(status_code=500, detail="Could not save theme configuration")


class ThemeUpdateRequest(BaseModel):
    theme_id: str


@router.get("/site-settings/theme")
@router.get("/theme")
async def get_site_theme():
    """Get active website background theme and list of all 10 available themes."""
    current_id = load_theme_setting()
    current_theme = next((t for t in SUPPORTED_THEMES if t["id"] == current_id), SUPPORTED_THEMES[0])
    return {
        "active_theme_id": current_id,
        "active_theme": current_theme,
        "available_themes": SUPPORTED_THEMES,
    }


@router.put("/admin/theme")
async def update_site_theme(
    data: ThemeUpdateRequest,
    admin: User = Depends(require_admin),
):
    """Admin updates the global website background theme."""
    valid_ids = [t["id"] for t in SUPPORTED_THEMES]
    if data.theme_id not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid theme_id. Must be one of: {', '.join(valid_ids)}"
        )
    save_theme_setting(data.theme_id)
    current_theme = next(t for t in SUPPORTED_THEMES if t["id"] == data.theme_id)
    return {
        "success": True,
        "message": f"Website background theme updated to '{current_theme['name']}'",
        "active_theme_id": data.theme_id,
        "active_theme": current_theme,
    }
