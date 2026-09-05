from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import json
from app.models.user import UserRole


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    is_vip: bool = False
    vip_plan: Optional[str] = None
    vip_started_at: Optional[datetime] = None
    vip_expires_at: Optional[datetime] = None
    is_vip_active: bool = False
    unlocked_movies: Optional[List[str]] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Telegram Mini App fields
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    telegram_photo_url: Optional[str] = None
    # Phone Auth
    phone_number: Optional[str] = None
    # Session tracking
    login_source: Optional[str] = None
    last_login_at: Optional[datetime] = None

    @field_validator("unlocked_movies", mode="before")
    @classmethod
    def parse_unlocked_movies(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                data = json.loads(v)
                return data if isinstance(data, list) else []
            except Exception:
                return []
        return []

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_vip: Optional[bool] = None
    vip_plan: Optional[str] = None
    vip_duration_days: Optional[int] = None  # 30, 90, 180, 365, or 0 (lifetime)


class VIPGrantRequest(BaseModel):
    plan: str  # "1month", "3month", "6month", "1year", "lifetime", "revoke"
    custom_days: Optional[int] = None


class MovieUnlockRequest(BaseModel):
    movie_slug: str
    action: str = "unlock"  # "unlock" or "lock"


class UserStats(BaseModel):
    favorites_count: int = 0
    history_count: int = 0
    comments_count: int = 0
    ratings_count: int = 0

