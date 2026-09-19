from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.episode import Episode
from app.models.anime import Anime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationItem(BaseModel):
    id: str
    icon: str  # 'episode' | 'system' | 'vip'
    title: str
    subtitle: str
    time: str
    link: str
    avatarUrl: Optional[str] = None
    isUnread: bool = True
    tag: Optional[str] = None
    category: Optional[str] = "episode"


@router.get("", response_model=List[NotificationItem])
async def get_notifications(db: AsyncSession = Depends(get_db)):
    notifications: List[NotificationItem] = []

    # 1. System / VIP Announcement
    notifications.append(
        NotificationItem(
            id="notif-system-vip",
            icon="vip",
            category="vip",
            tag="VIP ពិសេស",
            title="👑 គម្រោង VIP 1 Month ($1.50) នឹងមកដល់ក្នុងពេលឆាប់ៗនេះ!",
            subtitle="ទទួលបានការទស្សនាកម្រិត 4K Ultra HD ដោយគ្មាន Logo បាំងលើគ្រប់ឧបករណ៍ទាំងអស់",
            time="10 នាទីមុន",
            link="/vip",
            avatarUrl="/video_mask_logo.png",
            isUnread=True,
        )
    )

    notifications.append(
        NotificationItem(
            id="notif-system-telegram",
            icon="system",
            category="system",
            tag="Telegram",
            title="💬 ចូលរួម Telegram Channel ផ្លូវការ @watchflixanimeadmin",
            subtitle="ទទួលបានដំណឹងចេញភាគថ្មីៗ និងការ Support ផ្ទាល់ពី Admin ២៤/៧",
            time="1 ម៉ោងមុន",
            link="https://t.me/watchflixanimeadmin",
            avatarUrl="/video_mask_logo.png",
            isUnread=True,
        )
    )

    # 2. Fetch Latest Episodes from Database
    stmt = (
        select(Episode)
        .options(selectinload(Episode.anime))
        .order_by(Episode.id.desc())
        .limit(12)
    )
    result = await db.execute(stmt)
    episodes = result.scalars().all()

    times_sequence = [
        "ទើបចេញ",
        "15 នាទីមុន",
        "30 នាទីមុន",
        "1 ម៉ោងមុន",
        "2 ម៉ោងមុន",
        "3 ម៉ោងមុន",
        "5 ម៉ោងមុន",
        "8 ម៉ោងមុន",
        "1 ថ្ងៃមុន",
        "2 ថ្ងៃមុន",
        "3 ថ្ងៃមុន",
        "5 ថ្ងៃមុន",
    ]

    for idx, ep in enumerate(episodes):
        if not ep.anime:
            continue
        
        anime_title = ep.anime.title
        ep_num = ep.episode_number
        ep_title = ep.title or f"Episode {ep_num}"
        slug = ep.anime.slug
        avatar = f"/posters/{slug}.jpg"
        if ep.thumbnail_url and "onrender.com" not in ep.thumbnail_url and "unsplash.com" not in ep.thumbnail_url:
            avatar = ep.thumbnail_url
        elif ep.anime.poster_url and "onrender.com" not in ep.anime.poster_url and "unsplash.com" not in ep.anime.poster_url:
            avatar = ep.anime.poster_url

        rel_time = times_sequence[idx] if idx < len(times_sequence) else f"{idx // 2} ថ្ងៃមុន"

        notifications.append(
            NotificationItem(
                id=f"notif-ep-{ep.id}",
                icon="episode",
                category="episode",
                tag=f"ភាគ {ep_num}",
                title=f"{anime_title} — ភាគ {ep_num} ចេញផ្សាយហើយ!",
                subtitle=f"ទស្សនា {ep_title} កម្រិត 1080p / 4K UHD គ្មាន Logo បាំងឡើយ",
                time=rel_time,
                link=f"/watch/{ep.anime.slug}/{ep_num}",
                avatarUrl=avatar,
                isUnread=True,
            )
        )

    return notifications
