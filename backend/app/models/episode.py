from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False, index=True)
    episode_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    video_url = Column(String(1000), nullable=True)
    subtitle_url = Column(String(1000), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    duration_seconds = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    is_free = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    anime = relationship("Anime", back_populates="episodes")
    watch_history = relationship("WatchHistory", back_populates="episode", cascade="all, delete-orphan")
