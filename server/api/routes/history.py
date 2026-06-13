"""GET /api/history -- download history."""

from fastapi import APIRouter

from core.task_manager import TaskManager

router = APIRouter()

# Share the same TaskManager instance used by tasks.py
# Import it from tasks to keep a single source of truth
from api.routes.tasks import task_manager


@router.get("/api/history")
async def get_history() -> list:
    """Return completed download tasks as history."""
    history = task_manager.list_history()
    return [t.model_dump(mode="json") for t in history]
