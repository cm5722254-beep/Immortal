"""
MER DONGHUA — License & Domain Protection Guard

Validates that this instance is authorized to run.
- Domain Lock: Only accept requests from whitelisted origins
- License Key: Startup validation — no key = no start
- Instance ID: Unique fingerprint per deployment
"""

import os
import sys
import hashlib
import hmac
import time
import socket
from typing import Optional


# ============================================================
# ⚙️ Internal — these are NOT secrets, they are validators
# ============================================================
_PRODUCT_SALT = "MERDONGHUA-2026-NAMI-PLATFORM-SALT"
_REQUIRED_ENV_VARS = [
    "DATABASE_URL",
    "JWT_SECRET",
    "APP_LICENSE_KEY",
    "APP_INSTANCE_ID",
]


def _compute_expected_key(instance_id: str) -> str:
    """Derive the expected license key from instance_id + salt."""
    raw = f"{instance_id}:{_PRODUCT_SALT}"
    return hmac.new(
        _PRODUCT_SALT.encode(),
        raw.encode(),
        hashlib.sha256
    ).hexdigest()[:32]


def _check_required_env() -> list[str]:
    """Return list of missing required environment variables."""
    missing = []
    for var in _REQUIRED_ENV_VARS:
        val = os.getenv(var, "").strip()
        if not val:
            missing.append(var)
    return missing


def validate_license() -> bool:
    """
    Validate that this deployment has a proper license.
    Returns True if valid, raises SystemExit if not.
    """
    # 1. Check all required environment variables are set
    missing = _check_required_env()
    if missing:
        _fail(
            "MISSING ENVIRONMENT VARIABLES",
            f"Required variables not set: {', '.join(missing)}\n"
            f"Copy .env.example to .env and fill in your credentials.\n"
            f"This software requires a valid license to operate."
        )

    # 2. Validate LICENSE KEY against INSTANCE ID
    instance_id = os.getenv("APP_INSTANCE_ID", "").strip()
    license_key = os.getenv("APP_LICENSE_KEY", "").strip()

    if not instance_id or not license_key:
        _fail(
            "INVALID LICENSE",
            "APP_LICENSE_KEY and APP_INSTANCE_ID are required.\n"
            "Contact the software owner to obtain a valid license."
        )

    expected = _compute_expected_key(instance_id)
    if not hmac.compare_digest(license_key.lower(), expected.lower()):
        _fail(
            "LICENSE VALIDATION FAILED",
            "The provided APP_LICENSE_KEY is invalid for this instance.\n"
            "This software is proprietary. Unauthorized use is prohibited.\n"
            "Contact the owner to obtain a valid license key."
        )

    return True


def get_authorized_origins() -> list[str]:
    """
    Return the list of domains authorized to use this API.
    Only these origins can make cross-origin requests.
    """
    raw = os.getenv("AUTHORIZED_DOMAINS", "http://localhost:5173,http://localhost:3000")
    origins = [d.strip() for d in raw.split(",") if d.strip()]

    # Always allow localhost for development
    dev_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    for dev in dev_origins:
        if dev not in origins:
            origins.append(dev)

    return origins


def _fail(title: str, message: str) -> None:
    """Print error and exit the process."""
    border = "=" * 60
    print(f"\n{border}", file=sys.stderr)
    print(f"  🚫 {title}", file=sys.stderr)
    print(f"{border}", file=sys.stderr)
    print(f"\n  {message}\n", file=sys.stderr)
    print(f"{border}\n", file=sys.stderr)
    sys.exit(1)


def generate_license_key(instance_id: str) -> str:
    """
    Utility to generate a valid license key for a given instance ID.
    Run: python -c "from app.core.license_guard import generate_license_key; print(generate_license_key('MY_INSTANCE'))"
    """
    return _compute_expected_key(instance_id)
