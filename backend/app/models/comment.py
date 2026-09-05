from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    is_reported = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    anime = relationship("Anime", back_populates="comments")
    user = relationship("User", back_populates="comments")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Comment", back_populates="replies", remote_side=[id])
