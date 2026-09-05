# Models package - import all models so SQLAlchemy metadata is populated
from app.models.user import User, UserRole
from app.models.genre import Genre, anime_genres
from app.models.anime import Anime, AnimeType, AnimeStatus
from app.models.episode import Episode
from app.models.favorite import Favorite
from app.models.history import WatchHistory
from app.models.comment import Comment
from app.models.rating import Rating
from app.models.banner import Banner
from app.models.danmaku import Danmaku
from app.models.payment import PaymentTransaction
from app.models.api_key import ApiKey

__all__ = [
    "User", "UserRole",
    "Genre", "anime_genres",
    "Anime", "AnimeType", "AnimeStatus",
    "Episode",
    "Favorite",
    "WatchHistory",
    "Comment",
    "Rating",
    "Banner",
    "Danmaku",
    "PaymentTransaction",
    "ApiKey",
]

