from datetime import datetime
from app.core.config import settings


def is_free_promotion_active() -> bool:
    """
    Check if the global free promotion period is still active.
    Returns True if current date is before GLOBAL_FREE_PROMOTION_END_DATE.
    """
    try:
        end_date = datetime.strptime(settings.GLOBAL_FREE_PROMOTION_END_DATE, "%Y-%m-%d")
        current_date = datetime.now()
        return current_date < end_date
    except Exception:
        # If there's an error parsing the date, default to False (promotion ended)
        return False


def get_free_promotion_time_left() -> dict:
    """
    Get the time left until the free promotion ends.
    Returns a dict with days, hours, minutes, seconds.
    """
    try:
        end_date = datetime.strptime(settings.GLOBAL_FREE_PROMOTION_END_DATE, "%Y-%m-%d")
        current_date = datetime.now()

        if current_date >= end_date:
            return {"days": 0, "hours": 0, "minutes": 0, "seconds": 0}

        time_left = end_date - current_date
        days = time_left.days
        hours, remainder = divmod(time_left.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        return {
            "days": days,
            "hours": hours,
            "minutes": minutes,
            "seconds": seconds
        }
    except Exception:
        return {"days": 0, "hours": 0, "minutes": 0, "seconds": 0}