from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    STAFF = "STAFF"
    ADMIN = "ADMIN"
    OWNER = "OWNER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    phone_number = Column(String(30), unique=True, nullable=True, index=True)

    # VIP Membership Fields
    is_vip = Column(Boolean, default=False, nullable=False)
    vip_plan = Column(String(50), nullable=True)  # "1month", "3month", "6month", "1year", "lifetime"
    vip_started_at = Column(DateTime(timezone=True), nullable=True)
    vip_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Telegram Mini App Data
    telegram_id = Column(String(50), nullable=True, index=True)        # Telegram user ID
    telegram_username = Column(String(100), nullable=True)             # @username from Telegram
    telegram_first_name = Column(String(100), nullable=True)           # First name from Telegram
    telegram_photo_url = Column(String(500), nullable=True)            # Telegram profile photo
    telegram_init_data = Column(String(2000), nullable=True)           # Raw initData for verification

    # Session Tracking
    login_source = Column(String(30), nullable=True)                   # "telegram", "google", "email"
    last_login_at = Column(DateTime(timezone=True), nullable=True)     # Timestamp of latest login

    # Relationships
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    watch_history = relationship("WatchHistory", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_vip_active(self) -> bool:
        """Returns True if the user is an Owner/Admin/Staff or has an active, unexpired VIP membership."""
        if self.role in (UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF):
            return True
        if not self.is_vip:
            return False
        if self.vip_expires_at is None:
            return True  # Lifetime VIP
        
        now = datetime.now(timezone.utc)
        # Handle naive datetime vs timezone-aware
        if self.vip_expires_at.tzinfo is None:
            return self.vip_expires_at > datetime.utcnow()
        return self.vip_expires_at > now

