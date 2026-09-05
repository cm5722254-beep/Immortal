from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    anime = relationship("Anime", back_populates="banners")
