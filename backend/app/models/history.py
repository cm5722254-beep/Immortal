from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False)
    episode_id = Column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    progress_seconds = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    last_watched_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "episode_id", name="uq_user_episode_history"),
    )

    user = relationship("User", back_populates="watch_history")
    anime = relationship("Anime", back_populates="watch_history")
    episode = relationship("Episode", back_populates="watch_history")
