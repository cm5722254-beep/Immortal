from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.dependencies.auth import require_user, get_optional_user, require_admin
from app.models.comment import Comment
from app.models.anime import Anime
from app.models.user import User
from app.schemas.common import CommentCreate, CommentUpdate, CommentRead, CommentListResponse

router = APIRouter(tags=["Comments"])


@router.get("/anime/{anime_id}/comments", response_model=CommentListResponse)
async def get_comments(
    anime_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    # Top-level comments only (parent_id is None)
    result = await db.execute(
        select(Comment)
        .where(Comment.anime_id == anime_id, Comment.parent_id == None, Comment.is_deleted == False)
        .options(selectinload(Comment.user), selectinload(Comment.replies).selectinload(Comment.user))
        .order_by(Comment.created_at.desc())
    )
    comments = result.scalars().unique().all()
    total = await db.scalar(
        select(func.count()).where(Comment.anime_id == anime_id, Comment.is_deleted == False)
    )
    return CommentListResponse(
        items=[CommentRead.model_validate(c) for c in comments],
        total=total or 0,
    )


@router.post("/anime/{anime_id}/comments", response_model=CommentRead, status_code=201)
async def create_comment(
    anime_id: int,
    data: CommentCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    anime = await db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    if data.parent_id:
        parent_result = await db.execute(
            select(Comment).where(Comment.id == data.parent_id, Comment.anime_id == anime_id)
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = Comment(
        anime_id=anime_id,
        user_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment.id)
        .options(selectinload(Comment.user), selectinload(Comment.replies))
    )
    return CommentRead.model_validate(result.scalar_one())


@router.put("/comments/{comment_id}", response_model=CommentRead)
async def update_comment(
    comment_id: int,
    data: CommentUpdate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.is_deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit another user's comment")
    comment.content = data.content
    db.add(comment)
    await db.commit()
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
        .options(selectinload(Comment.user), selectinload(Comment.replies))
    )
    return CommentRead.model_validate(result.scalar_one())


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    from app.models.user import UserRole
    if comment.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    comment.is_deleted = True
    comment.content = "[deleted]"
    db.add(comment)
    await db.commit()


@router.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.is_deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.likes_count += 1
    db.add(comment)
    await db.commit()
    return {"likes_count": comment.likes_count}


@router.post("/comments/{comment_id}/report")
async def report_comment(
    comment_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_reported = True
    db.add(comment)
    await db.commit()
    return {"message": "Comment reported"}
