from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.anime import AnimeType, AnimeStatus


class GenreRead(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class AnimeCreate(BaseModel):
    title: str
    slug: str
    alt_title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    year: Optional[int] = None
    status: AnimeStatus = AnimeStatus.ONGOING
    studio: Optional[str] = None
    country: Optional[str] = None
    airing_day: Optional[str] = None
    heat_score: int = 0
    type: AnimeType = AnimeType.DONGHUA
    is_featured: bool = False
    is_trending: bool = False
    is_published: bool = True
    is_free: bool = False
    genre_ids: List[int] = []


class AnimeUpdate(BaseModel):
    title: Optional[str] = None
    alt_title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    year: Optional[int] = None
    status: Optional[AnimeStatus] = None
    studio: Optional[str] = None
    country: Optional[str] = None
    airing_day: Optional[str] = None
    heat_score: Optional[int] = None
    is_featured: Optional[bool] = None
    is_trending: Optional[bool] = None
    is_published: Optional[bool] = None
    is_free: Optional[bool] = None
    genre_ids: Optional[List[int]] = None


class AnimeRead(BaseModel):
    id: int
    title: str
    slug: str
    alt_title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    year: Optional[int] = None
    status: AnimeStatus
    studio: Optional[str] = None
    country: Optional[str] = None
    airing_day: Optional[str] = None
    heat_score: int = 0
    type: AnimeType
    is_featured: bool
    is_trending: bool
    is_published: bool
    is_free: bool = False
    view_count: int
    average_rating: float
    rating_count: int
    episode_count: int
    genres: List[GenreRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnimeListResponse(BaseModel):
    items: List[AnimeRead]
    total: int
    page: int
    per_page: int
    pages: int
