import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL.strip()
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

tables = ["episodes", "anime", "users", "comments", "banners", "genres", "ratings", "favorites", "watch_histories"]

async def fix_all_sequences():
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})
    for table in tables:
        try:
            async with engine.begin() as conn:
                max_res = await conn.execute(text(f"SELECT COALESCE(MAX(id), 0) FROM {table};"))
                max_id = max_res.scalar() or 0
                seq_res = await conn.execute(text(f"SELECT pg_get_serial_sequence('{table}', 'id');"))
                seq_name = seq_res.scalar()
                if seq_name:
                    new_val = max(1, max_id)
                    await conn.execute(text(f"SELECT setval('{seq_name}', {new_val});"))
                    print(f"Sequence fixed for {table}: {seq_name} -> {new_val}")
                else:
                    print(f"No sequence found for {table}")
        except Exception as e:
            print(f"Error on {table}: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_all_sequences())
