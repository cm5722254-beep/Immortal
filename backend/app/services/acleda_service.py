import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import settings
from app.models.user import User
from app.models.payment import PaymentTransaction
from app.services.khqr_service import generate_khqr_string, generate_khqr_deeplink, generate_md5_hash

logger = logging.getLogger(__name__)

# VIP Plans definitions
VIP_PLANS = {
    "1month": {
        "title": "1 Month VIP Access",
        "days": 30,
        "amount_usd": 2.50,
        "amount_khr": 10000,
        "description": "ទស្សនា 4K UHD គ្មានពាណិជ្ជកម្ម រយៈពេល 30 ថ្ងៃ",
        "badge": "ពេញនិយម"
    },
    "3month": {
        "title": "3 Months VIP Access",
        "days": 90,
        "amount_usd": 7.50,
        "amount_khr": 30000,
        "description": "ទស្សនា 4K UHD គ្មានពាណិជ្ជកម្ម រយៈពេល 90 ថ្ងៃ (៣ ខែ)",
        "badge": "សន្សំសំចៃ"
    },
    "6month": {
        "title": "6 Months VIP Access",
        "days": 180,
        "amount_usd": 15.00,
        "amount_khr": 60000,
        "description": "ទស្សនា 4K UHD គ្មានពាណិជ្ជកម្ម រយៈពេល 180 ថ្ងៃ (៦ ខែ)",
        "badge": "តម្លៃពិសេស"
    },
    "1year": {
        "title": "1 Year VIP Access",
        "days": 365,
        "amount_usd": 25.00,
        "amount_khr": 100000,
        "description": "ទស្សនា 4K UHD គ្មានពាណិជ្ជកម្ម រយៈពេល 365 ថ្ងៃពេញ (១ ឆ្នាំ)",
        "badge": "ល្អបំផុត"
    },
}


class AcledaPaymentService:
    @staticmethod
    def get_plans() -> Dict[str, Any]:
        """Returns all configured VIP subscription plans."""
        return VIP_PLANS

    @staticmethod
    async def create_payment_order(
        db: AsyncSession,
        user_id: Optional[int],
        plan_type: str,
        currency: str = "KHR"
    ) -> PaymentTransaction:
        """
        Creates a new payment transaction and generates the KHQR string and deep links.
        """
        if plan_type not in VIP_PLANS:
            plan_type = "1month"

        plan = VIP_PLANS[plan_type]
        amount = plan["amount_usd"] if currency.upper() == "USD" else plan["amount_khr"]
        
        # Generate unique transaction ID and Bill number
        timestamp_str = datetime.now().strftime("%y%m%d%H%M%S")
        import random
        rand_suffix = random.randint(1000, 9999)
        transaction_id = f"MD_{timestamp_str}_{rand_suffix}"
        bill_number = f"BILL{timestamp_str[-6:]}{rand_suffix}"

        # Merchant details from settings or defaults
        merchant_id = getattr(settings, "ACLEDA_ACCOUNT_ID", "0130000632528") or "0130000632528"
        merchant_name = getattr(settings, "ACLEDA_MERCHANT_NAME", "KAING BUNCHHAY") or "KAING BUNCHHAY"
        merchant_city = getattr(settings, "ACLEDA_MERCHANT_CITY", "Phnom Penh") or "Phnom Penh"

        # Generate standard EMVCo KHQR String
        khqr_string = generate_khqr_string(
            merchant_id=merchant_id,
            merchant_name=merchant_name,
            merchant_city=merchant_city,
            amount=amount,
            currency=currency.upper(),
            bill_number=bill_number,
            store_label="MerDonghua VIP",
            terminal_label="0130000632528"
        )

        # Generate App Deep Links
        deeplinks = generate_khqr_deeplink(khqr_string)
        
        # Calculate expiry (15 minutes from creation)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=15)
        
        # Hash for integrity
        md5_hash = generate_md5_hash(f"{transaction_id}_{amount}_{currency}")

        transaction = PaymentTransaction(
            user_id=user_id,
            transaction_id=transaction_id,
            bill_number=bill_number,
            plan_type=plan_type,
            plan_title=plan["title"],
            duration_days=plan["days"],
            amount=amount,
            currency=currency.upper(),
            amount_khr=plan["amount_khr"],
            status="PENDING",
            payment_method="ACLEDA_KHQR",
            khqr_string=khqr_string,
            deeplink=deeplinks["acleda_deeplink"],
            md5_hash=md5_hash,
            expires_at=expires_at,
        )

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction

    @staticmethod
    async def fulfill_payment(
        db: AsyncSession,
        transaction: PaymentTransaction,
        acleda_ref: Optional[str] = None,
        raw_response: Optional[str] = None
    ) -> Tuple[bool, Optional[User]]:
        """
        Marks transaction as PAID, automatically grants/extends VIP status on user account,
        and sends Telegram Notification to Admin.
        """
        if transaction.status == "PAID":
            return True, None

        now = datetime.now(timezone.utc)
        transaction.status = "PAID"
        transaction.paid_at = now
        transaction.acleda_ref = acleda_ref or f"ACLB_{int(now.timestamp())}"
        if raw_response:
            transaction.acleda_raw_response = str(raw_response)

        user = None
        if transaction.user_id:
            res = await db.execute(select(User).where(User.id == transaction.user_id))
            user = res.scalar_one_or_none()

            if user:
                user.is_vip = True
                user.vip_plan = transaction.plan_type
                
                # Check if lifetime
                if transaction.duration_days == 0:
                    user.vip_expires_at = None
                else:
                    # If already active and unexpired, extend existing expiry
                    current_expiry = user.vip_expires_at
                    if current_expiry:
                        if current_expiry.tzinfo is None:
                            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
                        if current_expiry > now:
                            user.vip_expires_at = current_expiry + timedelta(days=transaction.duration_days)
                        else:
                            user.vip_expires_at = now + timedelta(days=transaction.duration_days)
                    else:
                        user.vip_expires_at = now + timedelta(days=transaction.duration_days)

                if not user.vip_started_at:
                    user.vip_started_at = now

        await db.commit()

        try:
            from app.services.telegram_service import send_vip_payment_telegram_notification
            user_label = user.username if user else f"User #{transaction.user_id}"
            expiry_str = user.vip_expires_at.strftime("%d-%m-%Y") if (user and user.vip_expires_at) else "LIFETIME (មួយជីវិត)"
            now_str = now.strftime("%d-%m-%Y %H:%M:%S")
            msg = (
                f"👑 <b>ការទូទាត់ VIP ជោគជ័យ (NEW VIP PAYMENT)</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👤 <b>អតិថិជន:</b> <code>{user_label}</code>\n"
                f"💎 <b>គម្រោង:</b> <b>{transaction.plan_title}</b>\n"
                f"💵 <b>ទឹកប្រាក់:</b> <b>${transaction.amount:.2f}</b> ({transaction.currency})\n"
                f"🧾 <b>Transaction ID:</b> <code>{transaction.transaction_id}</code>\n"
                f"🏦 <b>Ref / ធនាគារ:</b> <code>{transaction.acleda_ref}</code> (Wing Bank / NBC Bakong)\n"
                f"⏳ <b>ផុតកំណត់:</b> {expiry_str}\n"
                f"⏰ <b>កាលបរិច្ឆេទ:</b> {now_str}\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"✨ <i>ប្រព័ន្ធបានបើកសិទ្ធិ VIP លើគណនីដោយស្វ័យប្រវត្តិរួចរាល់ 100%!</i>"
            )
            import asyncio
            asyncio.create_task(send_vip_payment_telegram_notification(msg))
        except Exception as e:
            logger.warning(f"Failed to send VIP payment Telegram alert: {e}")

        return True, user

    @staticmethod
    async def check_bakong_status(
        db: AsyncSession,
        transaction: PaymentTransaction
    ) -> bool:
        """
        Queries the official Bakong Open API (check_transaction_by_md5) to see
        if customer has transferred money to the KHQR.
        """
        token = getattr(settings, "BAKONG_DEVELOPER_TOKEN", None)
        if not token or not transaction.khqr_string:
            return False

        try:
            # Bakong indexes transactions by MD5 of the raw KHQR string
            import hashlib
            khqr_md5 = hashlib.md5(transaction.khqr_string.encode("utf-8")).hexdigest()
            url = f"{settings.BAKONG_API_URL.rstrip('/')}/check_transaction_by_md5"
            
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url,
                    json={"md5": khqr_md5},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }
                )

                if resp.status_code == 200:
                    data = resp.json()
                    # Bakong responseCode 0 or responseCode 200 indicates success
                    code = data.get("responseCode")
                    txn_data = data.get("data")
                    if code == 0 or (txn_data and txn_data.get("hash")):
                        bakong_hash = txn_data.get("hash") if txn_data else f"BK_{khqr_md5[:10]}"
                        await AcledaPaymentService.fulfill_payment(
                            db=db,
                            transaction=transaction,
                            acleda_ref=f"BAKONG_{bakong_hash[:16]}",
                            raw_response=resp.text
                        )
                        return True
        except Exception as e:
            logger.warning(f"Bakong status check error: {e}")

        return False

