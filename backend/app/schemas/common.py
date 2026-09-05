from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment content cannot be empty")
        if len(v) > 2000:
            raise ValueError("Comment must be under 2000 characters")
        return v


class CommentUpdate(BaseModel):
    content: str


class CommentAuthorRead(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentRead(BaseModel):
    id: int
    anime_id: int
    user_id: int
    parent_id: Optional[int] = None
    content: str
    likes_count: int
    is_reported: bool
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[CommentAuthorRead] = None
    replies: List["CommentRead"] = []

    class Config:
        from_attributes = True


CommentRead.model_rebuild()


class CommentListResponse(BaseModel):
    items: List[CommentRead]
    total: int


class HistoryCreate(BaseModel):
    anime_id: int
    episode_id: int
    progress_seconds: int
    duration_seconds: int


class HistoryRead(BaseModel):
    id: int
    user_id: int
    anime_id: int
    episode_id: int
    progress_seconds: int
    duration_seconds: int
    last_watched_at: datetime

    class Config:
        from_attributes = True


class FavoriteRead(BaseModel):
    id: int
    user_id: int
    anime_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RatingCreate(BaseModel):
    score: int

    @field_validator("score")
    @classmethod
    def score_range(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class RatingRead(BaseModel):
    id: int
    anime_id: int
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminStats(BaseModel):
    total_users: int
    total_anime: int
    total_donghua: int
    total_drama: int = 0
    total_movies: int = 0
    total_episodes: int
    total_views: int
    active_users: int


class BannerCreate(BaseModel):
    anime_id: Optional[int] = None
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    order_index: int = 0


class BannerRead(BaseModel):
    id: int
    anime_id: Optional[int] = None
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    is_active: bool
    order_index: int

    class Config:
        from_attributes = True
