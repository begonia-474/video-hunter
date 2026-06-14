"""In-memory task manager for download tasks."""

from __future__ import annotations

import asyncio
import threading
import uuid
from datetime import datetime
from typing import Optional

from api.models import TaskStatus


class TaskManager:
    """Thread-safe, in-memory storage for download tasks."""

    def __init__(self) -> None:
        self._tasks: dict[str, TaskStatus] = {}
        self._cancel_events: dict[str, asyncio.Event] = {}
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

    def cancel_task(self, task_id: str) -> Optional[TaskStatus]:
        """Request cancellation of a running task."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            if task.status in ("complete", "failed", "cancelled"):
                return task
            task.status = "cancelled"
            task.message = "Task cancelled by user"
            # Signal the cancel event
            event = self._cancel_events.get(task_id)
            if event:
                event.set()
            return task

    def retry_task(self, task_id: str) -> Optional[TaskStatus]:
        """Reset a failed task to pending for retry."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            if task.status != "failed":
                return task
            task.status = "pending"
            task.message = "Task queued for retry"
            task.current = 0
            task.total = 0
            task.files = []
            return task

    def get_cancel_event(self, task_id: str) -> asyncio.Event:
        """Get or create a cancellation event for a task."""
        with self._lock:
            if task_id not in self._cancel_events:
                self._cancel_events[task_id] = asyncio.Event()
            return self._cancel_events[task_id]

    def remove_task(self, task_id: str) -> bool:
        """Remove a completed/failed/cancelled task from memory."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return False
            if task.status in ("running", "pending"):
                return False
            del self._tasks[task_id]
            self._cancel_events.pop(task_id, None)
            return True

    def get_stats(self) -> dict:
        """Get task statistics."""
        with self._lock:
            stats = {
                "total": len(self._tasks),
                "pending": 0,
                "running": 0,
                "complete": 0,
                "failed": 0,
                "cancelled": 0,
                "by_platform": {},
            }
            for task in self._tasks.values():
                stats[task.status] = stats.get(task.status, 0) + 1
                platform = task.platform
                if platform not in stats["by_platform"]:
                    stats["by_platform"][platform] = {"total": 0, "complete": 0, "failed": 0}
                stats["by_platform"][platform]["total"] += 1
                if task.status in ("complete", "failed"):
                    stats["by_platform"][platform][task.status] += 1
            return stats
