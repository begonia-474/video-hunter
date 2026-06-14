"""GET /api/f2 -- f2's user/video database access."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from core import f2_db

router = APIRouter()


@router.get("/api/f2/users")
async def get_users(platform: str = "", limit: int = 50) -> list:
    """Return users from f2's database."""
    if platform:
        return f2_db.get_recent_users(platform, limit)
    return f2_db.get_all_users(limit)


@router.get("/api/f2/videos")
async def get_videos(platform: str = "", limit: int = 50) -> list:
    """Return videos from f2's database."""
    if platform:
        return f2_db.get_recent_videos(platform, limit)
    return f2_db.get_all_videos(limit)


@router.get("/api/f2/user/{platform}/{sec_user_id}")
async def get_user(platform: str, sec_user_id: str) -> dict:
    """Return a specific user's info."""
    user = f2_db.get_user_info(platform, sec_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/api/f2/video/{platform}/{aweme_id}")
async def get_video(platform: str, aweme_id: str) -> dict:
    """Return a specific video's info."""
    video = f2_db.get_video_info(platform, aweme_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video
