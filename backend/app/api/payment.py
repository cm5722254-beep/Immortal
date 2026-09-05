import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_user, require_admin, get_optional_user
from app.models.user import User
from app.models.payment import PaymentTransaction
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
