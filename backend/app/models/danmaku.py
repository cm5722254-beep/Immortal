from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Danmaku(Base):
    __tablename__ = "danmaku"

    id = Column(Integer, primary_key=True, index=True)
    episode_id = Column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text = Column(String(200), nullable=False)
    time_seconds = Column(Float, nullable=False)
    color = Column(String(20), default="#ffffff")
    position = Column(String(10), default="scroll")  # 'scroll', 'top', 'bottom'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    episode = relationship("Episode", backref="danmaku_list")
    user = relationship("User")
