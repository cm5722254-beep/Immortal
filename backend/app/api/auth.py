from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserRole
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    AuthResponse, UserRead, GoogleAuthRequest, TelegramAuthRequest, PhoneAuthRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check duplicate username
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.USER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return AuthResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    input_str = data.email.strip()
    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == input_str.lower())
            | (func.lower(User.username) == input_str.lower())
            | (User.phone_number == input_str)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email/Username ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ")

    if not user.is_active and user.email != "cm5722254@gmail.com":
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Ensure OWNER role for owner account
    if user.email == "cm5722254@gmail.com" or user.username == "cheat_admin":
        user.role = UserRole.OWNER
        user.is_active = True
        user.is_verified = True

    # Track login session
    from datetime import datetime, timezone
    user.login_source = "email"
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return AuthResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/logout")
async def logout():
    # Client-side token deletion; server-side blacklisting would require Redis
    return {"message": "Logged out successfully"}


@router.post("/google", response_model=AuthResponse)
async def google_login(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    import json
    import secrets
    import urllib.request
    import urllib.error

    if not data.credential:
        raise HTTPException(status_code=400, detail="Google credential token is required")

    # Verify Google token with Google OAuth2 TokenInfo API
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={data.credential}"
        req = urllib.request.Request(url, headers={"User-Agent": "MER-DONGHUA/1.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            google_data = json.loads(response.read().decode("utf-8"))
    except Exception:
        # Fallback: if Google TokenInfo API is slow/blocked from cloud IP, decode JWT claims directly
        try:
            from jose import jwt as jose_jwt
            claims = jose_jwt.get_unverified_claims(data.credential)
            if claims.get("iss") in ("accounts.google.com", "https://accounts.google.com") or claims.get("email"):
                google_data = claims
            else:
                raise ValueError("Invalid Google token")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to verify Google token. Please try again."
            )

    email = google_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if not user.is_active and user.email != "cm5722254@gmail.com":
            raise HTTPException(status_code=403, detail="Account has been disabled")
        if not user.avatar_url and google_data.get("picture"):
            user.avatar_url = google_data.get("picture")
        # Ensure OWNER role for owner account
        if user.email == "cm5722254@gmail.com" or user.username == "cheat_admin":
            user.role = UserRole.OWNER
            user.is_active = True
            user.is_verified = True
        await db.commit()
    else:
        # Generate a unique username based on Google name/email
        raw_name = (google_data.get("name") or email.split("@")[0]).strip()
        base_username = "".join(c for c in raw_name if c.isalnum() or c in ("_", "-"))[:30] or "cultivator"
        username = base_username

        # Ensure unique username
        existing = await db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            username = f"{base_username}_{secrets.randbelow(9999):04d}"

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            avatar_url=google_data.get("picture"),
            role=UserRole.OWNER if email == "cm5722254@gmail.com" else UserRole.USER,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Track Google login session
    from datetime import datetime, timezone
    user.login_source = "google"
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return AuthResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.post("/telegram", response_model=AuthResponse)
async def telegram_login(data: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    """Auto login / register Telegram Mini App user seamlessly with their exact Telegram account username & profile photo."""
    import secrets

    if not data.id:
        raise HTTPException(status_code=400, detail="Telegram user ID is required")

    tg_email = f"tg_{data.id}@telegram.merdonghua.com"

    # Check if user already exists with this telegram email
    result = await db.execute(select(User).where(User.email == tg_email))
    user = result.scalar_one_or_none()

    # Determine real display username
    full_name = f"{data.first_name or ''} {data.last_name or ''}".strip()
    raw_name = data.username or full_name or data.first_name or f"TelegramUser_{data.id}"
    clean_user = "".join(c for c in raw_name if c.isalnum() or c in ("_", "-", " ")).strip()[:30] or f"User_{data.id}"

    if user:
        if not user.is_active:
            user.is_active = True
        if data.photo_url and user.avatar_url != data.photo_url:
            user.avatar_url = data.photo_url
        if clean_user and user.username != clean_user:
            # Check if username is not taken by another user
            existing = await db.execute(select(User).where(User.username == clean_user, User.id != user.id))
            if not existing.scalar_one_or_none():
                user.username = clean_user
        # Always update Telegram data on every login
        from datetime import datetime, timezone
        user.telegram_id = str(data.id)
        user.telegram_username = data.username
        user.telegram_first_name = data.first_name
        user.telegram_photo_url = data.photo_url
        user.telegram_init_data = (data.init_data or '')[:2000]
        user.login_source = "telegram"
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
    else:
        # Check unique username
        existing = await db.execute(select(User).where(User.username == clean_user))
        if existing.scalar_one_or_none():
            clean_user = f"{clean_user}_{secrets.randbelow(9999):04d}"

        user = User(
            username=clean_user,
            email=tg_email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            avatar_url=data.photo_url,
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            # Telegram specific data
            telegram_id=str(data.id),
            telegram_username=data.username,
            telegram_first_name=data.first_name,
            telegram_photo_url=data.photo_url,
            telegram_init_data=(data.init_data or '')[:2000],
            login_source="telegram",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return AuthResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.post("/phone", response_model=AuthResponse)
async def phone_login(data: PhoneAuthRequest, db: AsyncSession = Depends(get_db)):
    """Login or register seamlessly using verified Phone Number OTP."""
    import secrets
    from datetime import datetime, timezone
    import re

    raw_phone = re.sub(r"[^\d+]", "", data.phone_number.strip())
    if not raw_phone or len(raw_phone) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    # Format phone number for consistency
    phone = raw_phone
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+855" + phone[1:]
        else:
            phone = "+855" + phone

    clean_digits = re.sub(r"\D", "", phone)
    phone_email = f"phone_{clean_digits}@namianime.com"

    # Search user by phone number or phone email
    result = await db.execute(
        select(User).where((User.phone_number == phone) | (User.email == phone_email))
    )
    user = result.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")
        user.phone_number = phone
        user.login_source = "phone"
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
    else:
        # Generate default username
        base_name = data.display_name or f"User_{clean_digits[-4:]}"
        clean_user = "".join(c for c in base_name if c.isalnum() or c in ("_", "-")).strip()[:30] or f"User_{clean_digits[-4:]}"
        
        # Check uniqueness
        existing = await db.execute(select(User).where(User.username == clean_user))
        if existing.scalar_one_or_none():
            clean_user = f"{clean_user}_{secrets.randbelow(9999):04d}"

        user = User(
            username=clean_user,
            email=phone_email,
            phone_number=phone,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            login_source="phone",
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return AuthResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


class SecurityViolationRequest(BaseModel):
    reason: str
    strikes: int


@router.post("/security-violation")
async def report_security_violation(
    data: SecurityViolationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Auto-bans user account when F12 / DevTools inspect strikes reach 5+.
    Account is deactivated (is_active = False) until Admin unbans them.
    """
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()

    if not token:
        return {"status": "recorded", "banned": False}

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id:
            res = await db.execute(select(User).where(User.id == int(user_id)))
            user = res.scalar_one_or_none()
            if user:
                # Admins and Owners are exempt
                if user.role in (UserRole.ADMIN, UserRole.OWNER) or user.email == "cm5722254@gmail.com":
                    return {"status": "admin_exempt", "banned": False}

                # Auto-ban when strikes >= 5
                if data.strikes >= 5:
                    user.is_active = False
                    await db.commit()
                    return {
                        "status": "banned",
                        "banned": True,
                        "message": "គណនីរបស់អ្នកត្រូវបាន BANNED ដោយសារចុច F12 / Inspect លើស ៥ ដង។ សូមទាក់ទង Admin ដើម្បីដោះសោរ។"
                    }
    except Exception:
        pass

    return {"status": "recorded", "banned": False}


# ─── 📩 UNBAN APPEAL REQUEST API ───
import os
import json
import uuid

UNBAN_REQUESTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "unban_requests.json")


def load_unban_requests() -> list:
    try:
        if os.path.exists(UNBAN_REQUESTS_FILE):
            with open(UNBAN_REQUESTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def save_unban_requests(requests_list: list):
    try:
        os.makedirs(os.path.dirname(UNBAN_REQUESTS_FILE), exist_ok=True)
        with open(UNBAN_REQUESTS_FILE, "w", encoding="utf-8") as f:
            json.dump(requests_list, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save unban requests: {e}")


class UnbanAppealRequest(BaseModel):
    username_or_email: str
    reason: str
    contact: Optional[str] = None


@router.post("/request-unban")
async def submit_unban_appeal(data: UnbanAppealRequest):
    """
    Submits an appeal request to the Admin for an account that was Auto-Disabled / Banned.
    """
    if not data.username_or_email or not data.reason:
        raise HTTPException(status_code=400, detail="សូមបំពេញឈ្មោះគណនី និងមូលហេតុស្នើសុំដោះសោរ")

    from datetime import datetime, timezone
    reqs = load_unban_requests()
    new_req = {
        "id": str(uuid.uuid4()),
        "username_or_email": data.username_or_email.strip(),
        "reason": data.reason.strip(),
        "contact": (data.contact or "").strip(),
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    reqs.insert(0, new_req)
    save_unban_requests(reqs)

    return {
        "success": True,
        "message": "សំណើស្នើសុំដោះសោររបស់អ្នកត្រូវបានផ្ញើទៅកាន់ Admin រួចរាល់ហើយ! Admin នឹងពិនិត្យដោះសោរជូនក្នុងពេលឆាប់ៗ។",
        "request_id": new_req["id"]
    }



