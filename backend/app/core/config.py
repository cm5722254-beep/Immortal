import os
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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "merdonghua-super-secret-jwt-key-change-in-production-2024")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://namianime.vercel.app")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    APP_NAME: str = "ទស្សនារឿង"
    APP_VERSION: str = "1.0.0"

    # Redis Caching Settings
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        "rediss://default:gQAAAAAAAeYoAAIgcDE2YWFkZWE4YTJjMTY0NjkzYWU4ZjY5YTE5NTc0ZGFkNw@bright-ewe-124456.upstash.io:6379"
    )
    REDIS_CACHE_ENABLED: bool = os.getenv("REDIS_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")

    # Telegram Bot Integration (Bot @namianime_bot)
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "8854922605:AAFttXelbYxhvvnv-i2BwGJwWmQoG2eZfRc")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "-1003509251885")
    TELEGRAM_NOTIFY_ENABLED: bool = True
    TELEGRAM_NOTIFY_GROUP_URL: str = os.getenv("TELEGRAM_NOTIFY_GROUP_URL", "https://t.me/+TS6IZI6unQ81M2Jl")
    TELEGRAM_PAY_BOT_TOKEN: str = os.getenv("TELEGRAM_PAY_BOT_TOKEN", "8817663313:AAGSEO0bxx-EIgmQDlhY6xcjL7DuheOKQ-s")
    TELEGRAM_PAY_GROUP_CHAT_ID: str = os.getenv("TELEGRAM_PAY_GROUP_CHAT_ID", "-1004355858315")

    # ACLEDA Bank & Bakong KHQR Settings
    ACLEDA_MERCHANT_ID: str = os.getenv("ACLEDA_MERCHANT_ID", "merdonghua_anime@bkrt")
    ACLEDA_MERCHANT_NAME: str = "MerDonghua Anime"
    ACLEDA_MERCHANT_CITY: str = "Phnom Penh"
    ACLEDA_ACCOUNT_ID: str = os.getenv("ACLEDA_ACCOUNT_ID", "merdonghua_anime@bkrt")
    ACLEDA_API_URL: str = "https://api.acledabank.com.kh/ecommerce"
    ACLEDA_API_KEY: str = os.getenv("ACLEDA_API_KEY", "")
    ACLEDA_SECRET_KEY: str = os.getenv("ACLEDA_SECRET_KEY", "")

    # Bakong Open API Settings (National Bank of Cambodia)
    BAKONG_ACCOUNT_ID: str = os.getenv("BAKONG_ACCOUNT_ID", "merdonghua_anime@bkrt")
    BAKONG_DEVELOPER_TOKEN: str = os.getenv("BAKONG_DEVELOPER_TOKEN", "")
    BAKONG_API_URL: str = "https://api-bakong.nbc.gov.kh/v1"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
