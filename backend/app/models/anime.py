from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, Float, func, Text
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base
from app.models.genre import anime_genres


class AnimeType(str, enum.Enum):
    ANIME = "ANIME"
    DONGHUA = "DONGHUA"
    DRAMA = "DRAMA"
    MOVIE = "MOVIE"


class AnimeStatus(str, enum.Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    UPCOMING = "UPCOMING"
    HIATUS = "HIATUS"


class Anime(Base):
    __tablename__ = "anime"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(300), unique=True, nullable=False, index=True)
    alt_title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    poster_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    trailer_url = Column(String(500), nullable=True)
    year = Column(Integer, nullable=True)
    status = Column(SAEnum(AnimeStatus), default=AnimeStatus.ONGOING, nullable=False)
    studio = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    airing_day = Column(String(20), nullable=True)
    heat_score = Column(Integer, default=0)
    type = Column(SAEnum(AnimeType), default=AnimeType.DONGHUA, nullable=False)
    is_featured = Column(Boolean, default=False)
    is_trending = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    is_free = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    episode_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    genres = relationship("Genre", secondary=anime_genres, back_populates="anime_list")
    episodes = relationship("Episode", back_populates="anime", cascade="all, delete-orphan", order_by="Episode.episode_number")
    favorites = relationship("Favorite", back_populates="anime", cascade="all, delete-orphan")
    watch_history = relationship("WatchHistory", back_populates="anime", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="anime", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="anime", cascade="all, delete-orphan")
    banners = relationship("Banner", back_populates="anime", cascade="all, delete-orphan")
