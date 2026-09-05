from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)  # 1–5 stars
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", "anime_id", name="uq_user_anime_rating"),)

    anime = relationship("Anime", back_populates="ratings")
    user = relationship("User", back_populates="ratings")
