from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_id = Column(String(64), unique=True, nullable=False, index=True)
    bill_number = Column(String(32), unique=True, nullable=False, index=True)
    
    plan_type = Column(String(50), nullable=False)  # "1month", "3month", "6month", "1year", "lifetime"
    plan_title = Column(String(100), nullable=False)
    duration_days = Column(Integer, default=30)  # 30, 90, 180, 365, 0 (lifetime)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)  # "USD" or "KHR"
    amount_khr = Column(Integer, default=0)
    
    status = Column(String(20), default="PENDING", nullable=False, index=True)  # PENDING, PAID, FAILED, EXPIRED, CANCELLED
    payment_method = Column(String(50), default="ACLEDA_KHQR", nullable=False)
    
    khqr_string = Column(Text, nullable=True)
    deeplink = Column(Text, nullable=True)
    md5_hash = Column(String(64), nullable=True)
    
    acleda_ref = Column(String(100), nullable=True)
    acleda_raw_response = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="payments")
