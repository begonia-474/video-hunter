"""Read f2's user/video databases."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Optional

from utils.paths import get_app_dir


def _get_f2_db_path(platform: str, db_type: str) -> Path:
    """Get path to f2's database file."""
    return get_app_dir() / f"{platform}_{db_type}.db"


def _read_db(db_path: Path, query: str, params: tuple = ()) -> list[dict[str, Any]]:
    """Read from a SQLite database."""
    if not db_path.is_file():
        return []
    try:
        conn = sqlite3.connect(str(db_path), timeout=5)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        return []


def get_user_info(platform: str, user_id: str) -> Optional[dict[str, Any]]:
    """Get user info from f2's database."""
    db_path = _get_f2_db_path(platform, "users")
    # 微博使用 uid 字段，其他平台使用 sec_user_id
    id_field = "uid" if platform == "weibo" else "sec_user_id"
    results = _read_db(
        db_path,
        f"SELECT * FROM user_info_web WHERE {id_field} = ?",
        (user_id,),
    )
    return results[0] if results else None


def get_video_info(platform: str, aweme_id: str) -> Optional[dict[str, Any]]:
    """Get video info from f2's database."""
    db_path = _get_f2_db_path(platform, "videos")
    results = _read_db(
        db_path,
        "SELECT * FROM video_info WHERE aweme_id = ?",
        (aweme_id,),
    )
    return results[0] if results else None


def get_recent_users(platform: str, limit: int = 50) -> list[dict[str, Any]]:
    """Get recent users from f2's database."""
    db_path = _get_f2_db_path(platform, "users")
    return _read_db(
        db_path,
        "SELECT * FROM user_info_web LIMIT ?",
        (limit,),
    )


def get_recent_videos(platform: str, limit: int = 50) -> list[dict[str, Any]]:
    """Get recent videos from f2's database."""
    db_path = _get_f2_db_path(platform, "videos")
    return _read_db(
        db_path,
        "SELECT * FROM video_info LIMIT ?",
        (limit,),
    )


def get_all_users(limit: int = 100) -> list[dict[str, Any]]:
    """Get all users from all platforms."""
    users = []
    for platform in ["douyin", "tiktok", "twitter", "weibo"]:
        db_path = _get_f2_db_path(platform, "users")
        results = _read_db(
            db_path,
            "SELECT *, ? as platform FROM user_info_web LIMIT ?",
            (platform, limit),
        )
        users.extend(results)
    return users


def get_all_videos(limit: int = 100) -> list[dict[str, Any]]:
    """Get all videos from all platforms."""
    videos = []
    for platform in ["douyin", "tiktok"]:
        db_path = _get_f2_db_path(platform, "videos")
        results = _read_db(
            db_path,
            "SELECT *, ? as platform FROM video_info LIMIT ?",
            (platform, limit),
        )
        videos.extend(results)
    return videos
