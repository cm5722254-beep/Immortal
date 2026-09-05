from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class CreatePaymentRequest(BaseModel):
    plan_type: str = Field("1month", description="VIP plan key: 1month, 3month, 6month, 1year, lifetime")
    currency: str = Field("USD", description="Currency: USD or KHR")


class VIPPlanItem(BaseModel):
    key: str
    title: str
    days: int
    amount_usd: float
    amount_khr: int
    description: str
    badge: Optional[str] = None


class PaymentResponse(BaseModel):
    transaction_id: str
    bill_number: str
    plan_type: str
    plan_title: str
    duration_days: int
    amount: float
    currency: str
    amount_khr: int
    status: str
    khqr_string: Optional[str] = None
    deeplink: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentStatusResponse(BaseModel):
    transaction_id: str
    status: str  # PENDING, PAID, FAILED, EXPIRED, CANCELLED
    paid_at: Optional[datetime] = None
    is_vip_active: bool = False
    vip_plan: Optional[str] = None
    vip_expires_at: Optional[datetime] = None
    message: Optional[str] = None


class MockSimulatePaymentRequest(BaseModel):
    transaction_id: str


class AcledaWebhookRequest(BaseModel):
    tran_id: Optional[str] = None
    bill_no: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    approval_code: Optional[str] = None
    hash: Optional[str] = None
