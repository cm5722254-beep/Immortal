import logging
import secrets
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_user, require_admin, require_owner, get_optional_user
from app.models.user import User
from app.models.payment import PaymentTransaction
from app.models.platform_setting import PlatformSetting
from app.schemas.payment import (
    CreatePaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
    VIPPlanItem,
    MockSimulatePaymentRequest,
    AcledaWebhookRequest,
)
from app.services.acleda_service import AcledaPaymentService, VIP_PLANS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment & VIP"])

PAYMENT_SETTINGS_DEFAULTS = {
    "enabled": False,
    "method": "khqr",
    "display_name": "VIP Membership",
    "instructions": "Select a VIP plan, pay using the QR code, then submit your transaction reference for review.",
    "payment_link": "",
    "qr_image_url": "",
    "merchant_name": "",
    "currency": "KHR",
    "accent_color": "#D5A63C",
    "background_color": "#101318",
}


class PaymentSettingsUpdate(BaseModel):
    enabled: bool = False
    method: str = Field(default="khqr", pattern="^(khqr|link|both)$")
    display_name: str = Field(default="VIP Membership", min_length=1, max_length=100)
    instructions: str = Field(default="", max_length=2000)
    payment_link: str = Field(default="", max_length=2048)
    qr_image_url: str = Field(default="", max_length=2048)
    merchant_name: str = Field(default="", max_length=100)
    currency: str = Field(default="KHR", pattern="^(KHR|USD)$")
    accent_color: str = Field(default="#D5A63C", pattern="^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#101318", pattern="^#[0-9A-Fa-f]{6}$")


class ManualPaymentSubmission(BaseModel):
    plan_type: str = Field(min_length=1, max_length=50)
    reference: str = Field(min_length=4, max_length=120)
    proof_url: str = Field(default="", max_length=2048)

    @field_validator("proof_url")
    @classmethod
    def proof_url_must_be_http(cls, value: str) -> str:
        value = value.strip()
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("Proof URL must use HTTP or HTTPS")
        return value


class ManualPaymentReview(BaseModel):
    approved: bool
    note: str = Field(default="", max_length=500)


async def _get_payment_settings(db: AsyncSession) -> dict:
    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == "vip_payment"))
    setting = result.scalar_one_or_none()
    if not setting:
        return PAYMENT_SETTINGS_DEFAULTS.copy()
    try:
        import json
        return {**PAYMENT_SETTINGS_DEFAULTS, **json.loads(setting.value)}
    except (TypeError, ValueError):
        return PAYMENT_SETTINGS_DEFAULTS.copy()


@router.get("/settings")
async def get_payment_settings(db: AsyncSession = Depends(get_db)):
    """Public, display-only payment instructions. No payment status is inferred from this data."""
    return await _get_payment_settings(db)


@router.put("/admin/settings")
async def update_payment_settings(
    data: PaymentSettingsUpdate,
    owner: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    import json
    if data.payment_link and not data.payment_link.startswith(("https://", "http://")):
        raise HTTPException(status_code=400, detail="Payment link must be an HTTP or HTTPS URL")
    if data.qr_image_url and not data.qr_image_url.startswith(("https://", "http://", "/uploads/")):
        raise HTTPException(status_code=400, detail="QR image must be an HTTP(S) URL or /uploads path")
    if data.enabled and data.method in {"khqr", "both"} and not data.qr_image_url:
        raise HTTPException(status_code=400, detail="Add a QR image before enabling KHQR payments")
    if data.enabled and data.method in {"link", "both"} and not data.payment_link:
        raise HTTPException(status_code=400, detail="Add a payment URL before enabling link payments")

    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == "vip_payment"))
    setting = result.scalar_one_or_none()
    encoded = json.dumps(data.model_dump(), ensure_ascii=False)
    if setting:
        setting.value = encoded
    else:
        db.add(PlatformSetting(key="vip_payment", value=encoded))
    await db.commit()
    return {"status": "saved", "settings": data.model_dump()}


@router.delete("/admin/settings")
async def delete_payment_settings(
    owner: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == "vip_payment"))
    setting = result.scalar_one_or_none()
    if setting:
        await db.delete(setting)
        await db.commit()
    return {"status": "deleted", "settings": PAYMENT_SETTINGS_DEFAULTS}


@router.post("/manual/submit", status_code=201)
async def submit_manual_payment(
    data: ManualPaymentSubmission,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    settings_data = await _get_payment_settings(db)
    if not settings_data["enabled"]:
        raise HTTPException(status_code=403, detail="Manual VIP payments are currently unavailable")
    if data.plan_type not in VIP_PLANS:
        raise HTTPException(status_code=400, detail="Unknown VIP plan")
    plan = VIP_PLANS[data.plan_type]
    now = datetime.now(timezone.utc)
    transaction = PaymentTransaction(
        user_id=user.id,
        transaction_id=f"MANUAL_{now.strftime('%y%m%d%H%M%S')}_{user.id}_{secrets.token_hex(3)}",
        bill_number=f"M{now.strftime('%y%m%d%H%M%S')}{user.id}{secrets.token_hex(2)}",
        plan_type=data.plan_type,
        plan_title=plan["title"],
        duration_days=plan["days"],
        amount=plan["amount_khr"],
        currency="KHR",
        amount_khr=plan["amount_khr"],
        status="PENDING",
        payment_method="MANUAL_KHQR",
        acleda_raw_response=__import__("json").dumps({"proof_url": data.proof_url.strip()}),
        acleda_ref=data.reference.strip(),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return {"transaction_id": transaction.transaction_id, "status": transaction.status, "message": "Submitted for Owner review"}


@router.get("/admin/manual/pending")
async def list_pending_manual_payments(
    owner: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    import json
    result = await db.execute(
        select(PaymentTransaction)
        .options(selectinload(PaymentTransaction.user))
        .where(PaymentTransaction.payment_method == "MANUAL_KHQR", PaymentTransaction.status == "PENDING")
        .order_by(desc(PaymentTransaction.created_at))
        .limit(200)
    )
    transactions = result.scalars().all()
    return [
        {
            "transaction_id": item.transaction_id,
            "user_id": item.user_id,
            "username": item.user.username if item.user else None,
            "plan_type": item.plan_type,
            "plan_title": item.plan_title,
            "amount_khr": item.amount_khr,
            "reference": item.acleda_ref,
            "proof_url": (json.loads(item.acleda_raw_response or "{}").get("proof_url", "")),
            "created_at": item.created_at,
        }
        for item in transactions
    ]


@router.post("/admin/manual/{transaction_id}/review")
async def review_manual_payment(
    transaction_id: str,
    data: ManualPaymentReview,
    owner: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.transaction_id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction or transaction.payment_method != "MANUAL_KHQR":
        raise HTTPException(status_code=404, detail="Manual payment submission not found")
    if transaction.status != "PENDING":
        raise HTTPException(status_code=409, detail="Only pending payments can be reviewed")
    if data.approved:
        await AcledaPaymentService.fulfill_payment(
            db=db,
            transaction=transaction,
            acleda_ref=f"OWNER_{owner.id}_{transaction.acleda_ref or ''}"[:100],
            raw_response=data.model_dump_json(),
        )
    else:
        transaction.status = "FAILED"
        transaction.acleda_raw_response = data.model_dump_json()
        await db.commit()
    return {"transaction_id": transaction_id, "status": transaction.status, "note": data.note}


@router.get("/plans", response_model=List[VIPPlanItem])
async def get_vip_plans():
    """Get list of available VIP subscription plans."""
    plans = []
    for key, val in VIP_PLANS.items():
        plans.append(
            VIPPlanItem(
                key=key,
                title=val["title"],
                days=val["days"],
                amount_usd=val["amount_usd"],
                amount_khr=val["amount_khr"],
                description=val["description"],
                badge=val.get("badge"),
            )
        )
    return plans


@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    data: CreatePaymentRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new KHQR payment order for ACLEDA & Bakong scanning.
    Works for logged-in users and guest sessions.
    """
    user_id = current_user.id if current_user else None
    transaction = await AcledaPaymentService.create_payment_order(
        db=db,
        user_id=user_id,
        plan_type=data.plan_type,
        currency=data.currency or "KHR",
    )
    return transaction


@router.get("/status/{transaction_id}", response_model=PaymentStatusResponse)
async def check_payment_status(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check real-time payment status of a transaction.
    Frontend polls this endpoint while showing the KHQR code.
    """
    stmt = select(PaymentTransaction).where(PaymentTransaction.transaction_id == transaction_id)
    res = await db.execute(stmt)
    transaction = res.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If still pending, check official Bakong Open API (if Bakong token configured)
    if transaction.status == "PENDING":
        await AcledaPaymentService.check_bakong_status(db, transaction)

    # Check if expired
    now = datetime.now(timezone.utc)
    if transaction.status == "PENDING" and transaction.expires_at:
        exp = transaction.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            transaction.status = "EXPIRED"
            await db.commit()


    # If linked to a user, get updated user VIP status
    is_vip_active = False
    vip_plan = None
    vip_expires_at = None

    if transaction.user_id:
        user_res = await db.execute(select(User).where(User.id == transaction.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            is_vip_active = user.is_vip_active
            vip_plan = user.vip_plan
            vip_expires_at = user.vip_expires_at

    return PaymentStatusResponse(
        transaction_id=transaction.transaction_id,
        status=transaction.status,
        paid_at=transaction.paid_at,
        is_vip_active=is_vip_active,
        vip_plan=vip_plan,
        vip_expires_at=vip_expires_at,
        message="Payment verified successfully" if transaction.status == "PAID" else "Waiting for payment scan",
    )


@router.post("/simulate-success", response_model=PaymentStatusResponse)
async def simulate_payment_success(
    data: MockSimulatePaymentRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Simulator endpoint to test instant payment and VIP activation without paying real cash.
    Useful for local testing, staging, and demo flow.
    """
    stmt = select(PaymentTransaction).where(PaymentTransaction.transaction_id == data.transaction_id)
    res = await db.execute(stmt)
    transaction = res.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If transaction didn't have user_id attached but current user is authenticated, attach user
    if not transaction.user_id and current_user:
        transaction.user_id = current_user.id

    success, user = await AcledaPaymentService.fulfill_payment(
        db=db,
        transaction=transaction,
        acleda_ref=f"TEST_SIM_{int(datetime.now().timestamp())}",
        raw_response='{"mock": true, "result": "SUCCESS", "channel": "ACLEDA_MOBILE"}',
    )

    return PaymentStatusResponse(
        transaction_id=transaction.transaction_id,
        status=transaction.status,
        paid_at=transaction.paid_at,
        is_vip_active=user.is_vip_active if user else False,
        vip_plan=user.vip_plan if user else transaction.plan_type,
        vip_expires_at=user.vip_expires_at if user else None,
        message="Simulated payment success and VIP activated!",
    )


@router.post("/webhook/acleda")
async def acleda_webhook_callback(
    payload: AcledaWebhookRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    ACLEDA Merchant Payment Gateway Webhook / IPN notification endpoint.
    Called by ACLEDA Bank servers when customer finishes payment in ACLEDA Mobile.
    """
    tran_id = payload.tran_id or payload.bill_no
    if not tran_id:
        raise HTTPException(status_code=400, detail="Missing tran_id or bill_no")

    stmt = select(PaymentTransaction).where(
        (PaymentTransaction.transaction_id == tran_id) | (PaymentTransaction.bill_number == tran_id)
    )
    res = await db.execute(stmt)
    transaction = res.scalar_one_or_none()

    if not transaction:
        logger.warning(f"ACLEDA Webhook transaction not found: {tran_id}")
        return {"status": "FAILED", "description": "Transaction not found"}

    if payload.status in ["00", "SUCCESS", "PAID", "OK"]:
        await AcledaPaymentService.fulfill_payment(
            db=db,
            transaction=transaction,
            acleda_ref=payload.approval_code or "ACLB_WEBHOOK_OK",
            raw_response=payload.model_dump_json(),
        )
        return {"status": "SUCCESS", "message": "Payment recorded and VIP activated"}
    else:
        transaction.status = "FAILED"
        transaction.acleda_raw_response = payload.model_dump_json()
        await db.commit()
        return {"status": "FAILED", "message": "Payment failed from gateway"}


@router.get("/history", response_model=List[PaymentResponse])
async def get_my_payment_history(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get transaction history of current logged-in user."""
    stmt = (
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == current_user.id)
        .order_by(desc(PaymentTransaction.created_at))
        .limit(50)
    )
    res = await db.execute(stmt)
    transactions = res.scalars().all()
    return transactions


@router.get("/admin/all", response_model=List[PaymentResponse])
async def get_all_payments_admin(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint to monitor all payments."""
    stmt = select(PaymentTransaction).order_by(desc(PaymentTransaction.created_at)).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()
