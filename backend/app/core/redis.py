import json
import time
import logging
from typing import Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global Redis client instance
_redis_client = None

# In-memory fallback cache (used if Redis is unreachable or REDIS_URL not set)
_memory_cache: dict[str, tuple[Any, float]] = {}


async def init_redis():
    """Initialize Redis connection pool asynchronously."""
    global _redis_client
    if not settings.REDIS_CACHE_ENABLED:
        logger.info("[REDIS] Cache is disabled via REDIS_CACHE_ENABLED=false")
        return

    if not settings.REDIS_URL:
        logger.info("[REDIS] REDIS_URL not provided. Using high-speed in-memory fallback cache.")
        return

    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
            retry_on_timeout=True,
            max_connections=20,
        )
        await _redis_client.ping()
        logger.info(f"[REDIS] Connected successfully to Redis")
    except Exception as e:
        logger.warning(f"[REDIS] Could not connect to Redis server ({e}). Falling back to in-memory cache.")
        _redis_client = None


async def close_redis():
    """Gracefully close Redis connections."""
    global _redis_client
    if _redis_client:
        try:
            if hasattr(_redis_client, "aclose"):
                await _redis_client.aclose()
            else:
                await _redis_client.close()
            logger.info("[REDIS] Redis client disconnected.")
        except Exception:
            pass
        _redis_client = None


async def get_cache(key: str) -> Optional[Any]:
    """Retrieve item from Redis or in-memory fallback."""
    if not settings.REDIS_CACHE_ENABLED:
        return None

    global _redis_client
    if _redis_client:
        try:
            val = await _redis_client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as e:
            logger.debug(f"[REDIS] Error reading key '{key}': {e}")

    # Check fallback memory cache
    cached = _memory_cache.get(key)
    if cached:
        data, expire_time = cached
        if expire_time > time.time():
            return data
        else:
            _memory_cache.pop(key, None)

    return None


async def set_cache(key: str, value: Any, ttl: int = 300) -> bool:
    """Store item in Redis or in-memory fallback with TTL (seconds)."""
    if not settings.REDIS_CACHE_ENABLED:
        return False

    global _redis_client
    json_str = None
    try:
        json_str = json.dumps(value, default=str)
    except Exception as e:
        logger.warning(f"[REDIS] Failed to serialize cache value for key '{key}': {e}")
        return False

    if _redis_client:
        try:
            await _redis_client.set(key, json_str, ex=ttl)
            return True
        except Exception as e:
            logger.debug(f"[REDIS] Error setting key '{key}': {e}")

    # Fallback to in-memory store
    _memory_cache[key] = (value, time.time() + ttl)
    # Evict expired entries if memory cache grows too big (> 2000 items)
    if len(_memory_cache) > 2000:
        now = time.time()
        expired_keys = [k for k, (_, exp) in _memory_cache.items() if exp <= now]
        for k in expired_keys:
            _memory_cache.pop(k, None)

    return True


async def delete_cache(key: str) -> bool:
    """Delete a single key from cache."""
    global _redis_client
    deleted = False
    if _redis_client:
        try:
            await _redis_client.delete(key)
            deleted = True
        except Exception:
            pass

    if key in _memory_cache:
        _memory_cache.pop(key, None)
        deleted = True

    return deleted


async def delete_cache_pattern(pattern: str) -> int:
    """Delete all keys matching pattern (e.g. 'anime:*', 'episodes:*')."""
    global _redis_client
    count = 0
    if _redis_client:
        try:
            keys = await _redis_client.keys(pattern)
            if keys:
                count += await _redis_client.delete(*keys)
        except Exception as e:
            logger.debug(f"[REDIS] Error deleting pattern '{pattern}': {e}")

    # Memory cache wildcard deletion
    import fnmatch
    mem_keys = [k for k in list(_memory_cache.keys()) if fnmatch.fnmatch(k, pattern)]
    for k in mem_keys:
        _memory_cache.pop(k, None)
        count += 1

    return count


async def get_redis_stats() -> dict[str, Any]:
    """Return current cache statistics."""
    global _redis_client
    is_connected = False
    ping_ms = None
    redis_info = {}

    if _redis_client:
        try:
            start = time.perf_counter()
            await _redis_client.ping()
            ping_ms = round((time.perf_counter() - start) * 1000, 2)
            is_connected = True
            info = await _redis_client.info(section="memory")
            redis_info = {
                "used_memory_human": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", "N/A")
            }
        except Exception:
            is_connected = False

    return {
        "status": "connected" if is_connected else ("in-memory-fallback" if settings.REDIS_CACHE_ENABLED else "disabled"),
        "backend": "redis" if is_connected else "in-memory",
        "ping_ms": ping_ms,
        "memory_cache_entries": len(_memory_cache),
        "redis_url_configured": bool(settings.REDIS_URL),
        "redis_details": redis_info,
    }
