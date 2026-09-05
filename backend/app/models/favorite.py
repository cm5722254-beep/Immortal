from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "anime_id", name="uq_user_anime_favorite"),)

    user = relationship("User", back_populates="favorites")
    anime = relationship("Anime", back_populates="favorites")
