from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


import hmac
import hashlib
import secrets


def generate_api_key() -> tuple[str, str, str]:
    """Generates a new API key. Returns (raw_full_key, key_prefix, key_hash)."""
    random_part = secrets.token_hex(20)
    full_key = f"nami_live_{random_part}"
    prefix = full_key[:13]
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, key_hash


def hash_api_key(raw_key: str) -> str:
    """Hashes a raw API key using SHA-256."""
    return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()


def sign_stream_url(episode_id: int, expires_in_seconds: int = 86400, user_id: Optional[int] = None) -> tuple[int, str]:
    """
    Generates a secure HMAC-SHA256 signature for streaming an episode.
    Returns (expires_timestamp, signature_hex).
    """
    expires_at = int(datetime.now(timezone.utc).timestamp()) + expires_in_seconds
    data = f"ep:{episode_id}|exp:{expires_at}|uid:{user_id or 0}"
    sig = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return expires_at, sig


def verify_stream_signature(episode_id: int, expires_at: int, sig: str, user_id: Optional[int] = None) -> bool:
    """
    Verifies that the HMAC signature is authentic and not expired.
    """
    now = int(datetime.now(timezone.utc).timestamp())
    if now > expires_at:
        return False  # Expired

    data = f"ep:{episode_id}|exp:{expires_at}|uid:{user_id or 0}"
    expected_sig = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig, expected_sig)

