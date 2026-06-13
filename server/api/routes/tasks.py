"""WebSocket /api/tasks -- task lifecycle management."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.models import TaskStatus
from core.f2_service import F2Service
from core.task_manager import TaskManager

router = APIRouter()

# Shared singletons
task_manager = TaskManager()
f2_service = F2Service()

# All connected WebSocket clients
_clients: set[WebSocket] = set()


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

    async def on_progress(current: int, total: int, message: str) -> None:
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

    try:
        task_manager.update_task_status(task.task_id, status="running", message="Starting download...")
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

        task_manager.update_task_status(
            task.task_id,
            status="complete",
            message="Download complete",
            files=files,
        )
    except Exception as exc:
        task_manager.update_task_status(
            task.task_id,
            status="failed",
            message=str(exc),
        )

    final = task_manager.get_task(task.task_id)
    if final:
        await _broadcast({"type": "task_update", "task": final.model_dump(mode="json")})


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
                await _broadcast({"type": "task_update", "task": task.model_dump(mode="json")})

                # Run the download in a background task
                asyncio.create_task(_run_task(task))

            else:
                await ws.send_text(
                    json.dumps({"type": "error", "message": f"Unknown action: {action}"})
                )

    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
