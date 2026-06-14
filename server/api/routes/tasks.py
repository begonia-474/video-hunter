"""WebSocket /api/tasks -- task lifecycle management."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.models import TaskStatus
from core.f2_service import F2Service
from core.task_manager import TaskManager
from core import history_db

router = APIRouter()

# Shared singletons
task_manager = TaskManager()
f2_service = F2Service()

import logging

logger = logging.getLogger(__name__)

# All connected WebSocket clients
_clients: set[WebSocket] = set()

# Track running asyncio tasks for cancellation
_running_tasks: dict[str, asyncio.Task] = {}


@router.get("/api/tasks/stats")
async def get_task_stats() -> dict:
    """Get current task statistics."""
    return task_manager.get_stats()


async def _broadcast(message: dict[str, Any]) -> None:
    """Send a JSON message to every connected client."""
    payload = json.dumps(message, default=str)
    stale: list[WebSocket] = []
    for ws in _clients:
        try:
            await ws.send_text(payload)
        except Exception:
            stale.append(ws)
    for ws in stale:
        _clients.discard(ws)


async def _run_task(task: TaskStatus) -> None:
    """Execute the download in the background and broadcast updates."""

    cancel_event = task_manager.get_cancel_event(task.task_id)

    async def on_progress(current: int, total: int, message: str) -> None:
        # Check for cancellation
        if cancel_event.is_set():
            raise asyncio.CancelledError("Task cancelled by user")

        task_manager.update_task_status(
            task.task_id,
            status="running",
            current=current,
            total=total,
            message=message,
        )
        updated = task_manager.get_task(task.task_id)
        if updated:
            await _broadcast({"type": "task_update", "task": updated.model_dump(mode="json")})

    download_succeeded = False
    files: list[str] = []

    try:
        task_manager.update_task_status(task.task_id, status="running", message="Starting download...")
        logger.info(f"[TASK-START] id={task.task_id}")
        updated = task_manager.get_task(task.task_id)
        if updated:
            await _broadcast({"type": "task_update", "task": updated.model_dump(mode="json")})

        files = await f2_service.start_download(
            platform=task.platform,
            mode=task.mode,
            url=task.url,
            options=task.options,
            progress_callback=on_progress,
        )

        download_succeeded = True

        task_manager.update_task_status(
            task.task_id,
            status="complete",
            message="Download complete",
            files=files,
        )
        logger.info(f"[TASK-COMPLETE] id={task.task_id}")
    except asyncio.CancelledError:
        task_manager.update_task_status(
            task.task_id,
            status="cancelled",
            message="Task cancelled by user",
        )
        logger.info(f"[TASK-CANCELLED] id={task.task_id}")
    except Exception as exc:
        if download_succeeded:
            task_manager.update_task_status(
                task.task_id,
                status="complete",
                message=f"下载完成（附加功能出错: {exc}）",
                files=files,
            )
            logger.info(f"[TASK-COMPLETE-WITH-ERROR] id={task.task_id} error={exc}")
        else:
            task_manager.update_task_status(
                task.task_id,
                status="failed",
                message=str(exc),
            )
            logger.info(f"[TASK-FAILED] id={task.task_id} error={exc}")
    finally:
        _running_tasks.pop(task.task_id, None)

    final = task_manager.get_task(task.task_id)
    if final:
        await _broadcast({"type": "task_update", "task": final.model_dump(mode="json")})
        # Persist finished tasks to SQLite
        if final.status in ("complete", "failed", "cancelled"):
            history_db.save_task(
                task_id=final.task_id,
                platform=final.platform,
                mode=final.mode,
                url=final.url,
                status=final.status,
                message=final.message,
                files=final.files,
                options=final.options,
                created_at=final.created_at.isoformat() if final.created_at else None,
            )


@router.websocket("/api/tasks")
async def websocket_tasks(ws: WebSocket) -> None:
    """Manage tasks over a WebSocket connection.

    **Client messages**
    - ``{"action": "list"}`` -- receive the current task list.
    - ``{"action": "start", "platform": ..., "mode": ..., "url": ..., "options": ...}`` -- create and run a task.

    **Server messages**
    - ``{"type": "task_list", "tasks": [...]}``
    - ``{"type": "task_update", "task": {...}}``
    """
    await ws.accept()
    _clients.add(ws)

    try:
        # Send the current task list on connect
        tasks = task_manager.list_tasks()
        await ws.send_text(
            json.dumps(
                {"type": "task_list", "tasks": [t.model_dump(mode="json") for t in tasks]},
                default=str,
            )
        )

        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            action = msg.get("action")

            if action == "list":
                tasks = task_manager.list_tasks()
                await ws.send_text(
                    json.dumps(
                        {"type": "task_list", "tasks": [t.model_dump(mode="json") for t in tasks]},
                        default=str,
                    )
                )

            elif action == "start":
                platform = msg.get("platform", "")
                mode = msg.get("mode", "")
                url = msg.get("url", "")
                options = msg.get("options", {})
                if not platform or not mode:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": "platform and mode are required"})
                    )
                    continue

                task = task_manager.add_task(platform=platform, mode=mode, url=url, options=options)
                logger.info(f"[TASK-CREATED] id={task.task_id} platform={platform} mode={mode}")
                await _broadcast({"type": "task_update", "task": task.model_dump(mode="json")})

                # Run the download in a background task
                asyncio_task = asyncio.create_task(_run_task(task))
                _running_tasks[task.task_id] = asyncio_task

            elif action == "cancel":
                task_id = msg.get("task_id", "")
                if not task_id:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": "task_id is required"})
                    )
                    continue

                task = task_manager.cancel_task(task_id)
                if task:
                    # Cancel the asyncio task if it's running
                    asyncio_task = _running_tasks.get(task_id)
                    if asyncio_task and not asyncio_task.done():
                        asyncio_task.cancel()
                    await _broadcast({"type": "task_update", "task": task.model_dump(mode="json")})
                else:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": f"Task not found: {task_id}"})
                    )

            elif action == "retry":
                task_id = msg.get("task_id", "")
                if not task_id:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": "task_id is required"})
                    )
                    continue

                task = task_manager.retry_task(task_id)
                if task:
                    await _broadcast({"type": "task_update", "task": task.model_dump(mode="json")})
                    # Re-run the task
                    asyncio_task = asyncio.create_task(_run_task(task))
                    _running_tasks[task.task_id] = asyncio_task
                else:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": f"Task not found or not failed: {task_id}"})
                    )

            elif action == "remove":
                task_id = msg.get("task_id", "")
                if not task_id:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": "task_id is required"})
                    )
                    continue

                if task_manager.remove_task(task_id):
                    await ws.send_text(
                        json.dumps({"type": "task_removed", "task_id": task_id})
                    )
                else:
                    await ws.send_text(
                        json.dumps({"type": "error", "message": f"Task not found or still running: {task_id}"})
                    )

            else:
                await ws.send_text(
                    json.dumps({"type": "error", "message": f"Unknown action: {action}"})
                )

    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
