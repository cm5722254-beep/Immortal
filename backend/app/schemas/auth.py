from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username is required")
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be 3–50 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str  # Supports Email, Username, or Phone Number
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


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
    unlocked_movies: Optional[list[str]] = []
    created_at: datetime
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
            import json
            try:
                data = json.loads(v)
                return data if isinstance(data, list) else []
            except Exception:
                return []
        return []

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class GoogleAuthRequest(BaseModel):
    credential: str


class TelegramAuthRequest(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: Optional[int] = None
    hash: Optional[str] = None
    init_data: Optional[str] = None  # Google ID token JWT string


class PhoneAuthRequest(BaseModel):
    phone_number: str
    firebase_id_token: Optional[str] = None
    display_name: Optional[str] = None


