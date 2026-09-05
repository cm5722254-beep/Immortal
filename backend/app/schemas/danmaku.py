from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DanmakuCreate(BaseModel):
    episode_id: int
    text: str
    time_seconds: float
    color: Optional[str] = "#ffffff"
    position: Optional[str] = "scroll"  # 'scroll', 'top', 'bottom'


class DanmakuRead(BaseModel):
    id: int
    episode_id: int
    user_id: Optional[int] = None
    text: str
    time_seconds: float
    color: str
    position: str
    created_at: datetime

    class Config:
        from_attributes = True
