import os
import hashlib
import hmac
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings
except Exception:
    try:
        from pydantic import BaseSettings
    except Exception:
        from pydantic import BaseModel
        class BaseSettings(BaseModel):
            def __init__(self, **kwargs):
                super().__init__(**kwargs)
                for field_name in self.__class__.model_fields:
                    env_val = os.getenv(field_name.upper()) or os.getenv(field_name)
                    if env_val is not None:
                        setattr(self, field_name, env_val)


class Settings(BaseSettings):
    # =========================================================================
    # 🔴 ALL values MUST come from environment variables (.env)
    # No hardcoded credentials — use .env.example as reference
    # =========================================================================

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS & URLs
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # App Identity
    APP_NAME: str = "ទស្សនារឿង"
    APP_VERSION: str = "1.0.0"

    # Authorized domains — only these origins are allowed to use the API
    # Comma-separated list: "https://namianime.vercel.app,https://yourdomain.com"
    AUTHORIZED_DOMAINS: str = os.getenv(
        "AUTHORIZED_DOMAINS",
        "http://localhost:5173,http://localhost:3000"
    )

    # License key — must match server-side validation
    # Set this in your .env file on YOUR server only
    APP_LICENSE_KEY: str = os.getenv("APP_LICENSE_KEY", "")
    APP_INSTANCE_ID: str = os.getenv("APP_INSTANCE_ID", "")

    # Redis Caching
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    REDIS_CACHE_ENABLED: bool = os.getenv("REDIS_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    TELEGRAM_NOTIFY_ENABLED: bool = True
    TELEGRAM_NOTIFY_GROUP_URL: str = os.getenv("TELEGRAM_NOTIFY_GROUP_URL", "")
    TELEGRAM_PAY_BOT_TOKEN: str = os.getenv("TELEGRAM_PAY_BOT_TOKEN", "")
    TELEGRAM_PAY_GROUP_CHAT_ID: str = os.getenv("TELEGRAM_PAY_GROUP_CHAT_ID", "")

    # ACLEDA / Bakong Payment
    ACLEDA_MERCHANT_ID: str = os.getenv("ACLEDA_MERCHANT_ID", "")
    ACLEDA_MERCHANT_NAME: str = "MerDonghua Anime"
    ACLEDA_MERCHANT_CITY: str = "Phnom Penh"
    ACLEDA_ACCOUNT_ID: str = os.getenv("ACLEDA_ACCOUNT_ID", "")
    ACLEDA_API_URL: str = "https://api.acledabank.com.kh/ecommerce"
    ACLEDA_API_KEY: str = os.getenv("ACLEDA_API_KEY", "")
    ACLEDA_SECRET_KEY: str = os.getenv("ACLEDA_SECRET_KEY", "")

    BAKONG_ACCOUNT_ID: str = os.getenv("BAKONG_ACCOUNT_ID", "")
    BAKONG_DEVELOPER_TOKEN: str = os.getenv("BAKONG_DEVELOPER_TOKEN", "")
    BAKONG_API_URL: str = "https://api-bakong.nbc.gov.kh/v1"

    @property
    def allowed_origins(self) -> list[str]:
        """Parse AUTHORIZED_DOMAINS into a list."""
        return [d.strip() for d in self.AUTHORIZED_DOMAINS.split(",") if d.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
