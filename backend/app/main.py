import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ============================================================
# 🔒 LICENSE & ENVIRONMENT VALIDATION — runs before anything
# ============================================================
from app.core.license_guard import validate_license, get_authorized_origins
validate_license()  # ❌ Process exits here if license invalid

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db
from app.core.redis import init_redis, close_redis, get_redis_stats, delete_cache_pattern
from app.api import auth, users, anime, episodes, favorites, history, comments, ratings, search, admin, genres, danmaku, schedule, ws, stream, theme, notifications, site_settings, payment, api_keys


# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Redis Caching Engine
    try:
        await init_redis()
    except Exception as e:
        print(f"[WARN] Redis init notice: {e}")

    # 2. Initialize Database Tables safely
    try:
        await init_db()
    except Exception as e:
        print(f"[WARN] Database init notice: {e}")

    # 3. Sync / Guarantee Owner & Admin Roles
    try:
        from app.services.seed_data import seed_database
        await seed_database()
    except Exception as e:
        print(f"[WARN] Initial seed / role sync notice: {e}")

    # 4. Background Telegram Bot Polling
    try:
        from app.services.telegram_service import start_telegram_bot_polling
        import asyncio
        asyncio.create_task(start_telegram_bot_polling())
    except Exception as e:
        print(f"[WARN] Telegram bot polling notice: {e}")

    # 5. Periodic background data persistence
    try:
        import asyncio
        async def periodic_backup_loop():
            while True:
                await asyncio.sleep(600)
                try:
                    from app.services.data_persistence import sync_database_to_export_json
                    await sync_database_to_export_json()
                except Exception as e:
                    print(f"[WARN] Periodic backup notice: {e}")

        asyncio.create_task(periodic_backup_loop())
    except Exception as e:
        print(f"[WARN] Periodic backup starter notice: {e}")

    yield

    # Cleanup on shutdown
    try:
        await close_redis()
    except Exception:
        pass

app = FastAPI(
    title="MER DONGHUA API",
    description="Anime & Donghua Streaming Platform REST API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================
# 🔒 STRICT DOMAIN LOCK — only authorized origins allowed
# Configure via AUTHORIZED_DOMAINS env variable
# ============================================================
_AUTHORIZED_ORIGINS = get_authorized_origins()
print(f"[SECURITY] Authorized origins: {_AUTHORIZED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_AUTHORIZED_ORIGINS,   # ← No wildcard "*" !
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# GZIP compression for high performance response transfers
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Global error handler - never expose stack traces in production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred"},
        )
    raise exc


# API Routes
API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(payment.router, prefix=API_PREFIX)
app.include_router(anime.router, prefix=API_PREFIX)
app.include_router(episodes.router, prefix=API_PREFIX)
app.include_router(favorites.router, prefix=API_PREFIX)
app.include_router(history.router, prefix=API_PREFIX)
app.include_router(comments.router, prefix=API_PREFIX)
app.include_router(ratings.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(genres.router, prefix=API_PREFIX)
app.include_router(danmaku.router, prefix=API_PREFIX)
app.include_router(schedule.router, prefix=API_PREFIX)
app.include_router(stream.router, prefix=API_PREFIX)
app.include_router(theme.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(site_settings.router, prefix=API_PREFIX)
app.include_router(api_keys.router, prefix=API_PREFIX)
app.include_router(ws.router)

# ── Serve uploaded images (poster, banner) as static files ──
_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")




@app.get("/api/health", tags=["Health"])
async def health_check():
    redis_stats = await get_redis_stats()
    return {
        "status": "ok",
        "app": "MER DONGHUA",
        "version": "1.0.0",
        "cache": redis_stats
    }


@app.get("/api/cache/stats", tags=["Cache"])
async def cache_stats():
    """Return real-time Redis/Cache statistics."""
    return await get_redis_stats()


@app.post("/api/cache/clear", tags=["Cache"])
async def clear_cache():
    """Flush all Redis and memory cache keys."""
    deleted_count = await delete_cache_pattern("*")
    return {
        "status": "ok",
        "message": f"Successfully flushed {deleted_count} cache keys.",
        "cleared_at": str(settings.APP_NAME)
    }


@app.get("/api/health/seed", tags=["Health"])
async def trigger_seed_if_empty():
    import traceback
    try:
        from app.services.seed_data import seed_database
        await seed_database()
        return {"status": "ok", "message": "Database seed executed successfully"}
    except Exception as e:
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "tagline": "Anime & Donghua — Anytime, Anywhere",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
