from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EpisodeCreate(BaseModel):
    anime_id: int
    episode_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    subtitle_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: int = 0
    is_published: bool = True
    is_free: bool = False


class EpisodeUpdate(BaseModel):
    episode_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    subtitle_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    is_published: Optional[bool] = None
    is_free: Optional[bool] = None


class EpisodeRead(BaseModel):
    id: int
    anime_id: int
    episode_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    subtitle_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: int
    is_published: bool
    is_free: bool = False
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
