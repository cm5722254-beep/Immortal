from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association table for Anime <-> Genre many-to-many
anime_genres = Table(
    "anime_genres",
    Base.metadata,
    Column("anime_id", Integer, ForeignKey("anime.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    anime_list = relationship("Anime", secondary=anime_genres, back_populates="genres")
