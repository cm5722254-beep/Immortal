from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, MappedColumn
from sqlalchemy import Column, Integer, DateTime, func
from datetime import datetime

from app.core.config import settings

# Support both PostgreSQL and SQLite (for local dev without a Postgres instance)
DATABASE_URL = settings.DATABASE_URL.strip()
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}
if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(
    DATABASE_URL,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


from sqlalchemy import text

async def init_db():
    """Create all tables and safely apply non-destructive column migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Safely migrate new VIP & Telegram columns to existing users table if they don't exist yet
        try:
            user_columns = [
                ("is_vip", "BOOLEAN DEFAULT FALSE"),
                ("vip_plan", "VARCHAR(50) DEFAULT NULL"),
                ("vip_started_at", "TIMESTAMP DEFAULT NULL"),
                ("vip_expires_at", "TIMESTAMP DEFAULT NULL"),
                ("unlocked_movies", "TEXT DEFAULT '[]'"),
                ("telegram_id", "VARCHAR(50) DEFAULT NULL"),
                ("telegram_username", "VARCHAR(100) DEFAULT NULL"),
                ("telegram_first_name", "VARCHAR(100) DEFAULT NULL"),
                ("telegram_photo_url", "VARCHAR(500) DEFAULT NULL"),
                ("telegram_init_data", "VARCHAR(2000) DEFAULT NULL"),
                ("login_source", "VARCHAR(30) DEFAULT NULL"),
                ("last_login_at", "TIMESTAMP DEFAULT NULL"),
            ]
            for col_name, col_type in user_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                except Exception:
                    pass
        except Exception as e:
            print(f"[DB INFO] Safe column check: {e}")

