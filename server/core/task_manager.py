"""In-memory task manager for download tasks."""

from __future__ import annotations

import threading
import uuid
from datetime import datetime
from typing import Optional

from api.models import TaskStatus


class TaskManager:
    """Thread-safe, in-memory storage for download tasks."""

    def __init__(self) -> None:
        self._tasks: dict[str, TaskStatus] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # CRUD helpers
    # ------------------------------------------------------------------

    def add_task(self, platform: str, mode: str, url: str, options: Optional[dict] = None) -> TaskStatus:
        """Create a new task in *pending* status and return it."""
        task = TaskStatus(
            task_id=uuid.uuid4().hex[:12],
            platform=platform,
            mode=mode,
            url=url,
            options=options or {},
            status="pending",
            message=f"Task queued for {platform}/{mode}",
            created_at=datetime.now(),
        )
        with self._lock:
            self._tasks[task.task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[TaskStatus]:
        """Return a task by id, or *None*."""
        with self._lock:
            return self._tasks.get(task_id)

    def list_tasks(self) -> list[TaskStatus]:
        """Return all tasks, newest first."""
        with self._lock:
            return sorted(
                self._tasks.values(),
                key=lambda t: t.created_at,
                reverse=True,
            )

    def list_history(self) -> list[TaskStatus]:
        """Return finished tasks (complete + failed), newest first."""
        with self._lock:
            return sorted(
                [t for t in self._tasks.values() if t.status in ("complete", "failed")],
                key=lambda t: t.created_at,
                reverse=True,
            )

    def update_task_status(
        self,
        task_id: str,
        *,
        status: Optional[str] = None,
        message: Optional[str] = None,
        current: Optional[int] = None,
        total: Optional[int] = None,
        files: Optional[list[str]] = None,
    ) -> Optional[TaskStatus]:
        """Update one or more fields of an existing task."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            if status is not None:
                task.status = status
            if message is not None:
                task.message = message
            if current is not None:
                task.current = current
            if total is not None:
                task.total = total
            if files is not None:
                task.files = files
            return task
