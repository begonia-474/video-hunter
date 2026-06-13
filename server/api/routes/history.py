"""GET/DELETE /api/history -- persistent download history (SQLite)."""

from fastapi import APIRouter

from core import history_db

router = APIRouter()


@router.get("/api/history")
async def get_history() -> list:
    """Return all persisted tasks from SQLite, newest first."""
    return history_db.get_all_tasks()


# NOTE: specific route must come before the catch-all to avoid matching "" as task_id
@router.delete("/api/history/{task_id}")
async def delete_history(task_id: str) -> dict:
    """Delete a single history record."""
    deleted = history_db.delete_task(task_id)
    return {"deleted": deleted}


@router.delete("/api/history")
async def clear_history() -> dict:
    """Clear all history records."""
    count = history_db.clear_all()
    return {"deleted": count}
