"""Pydantic models for the Video Hunter API."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ModeOption(BaseModel):
    """A download mode available for a platform."""

    id: str
    name: str
    description: str


class PlatformInfo(BaseModel):
    """Platform metadata returned by the platforms endpoint."""

    id: str
    name: str
    icon: str
    modes: list[ModeOption]
    status: str = Field(pattern=r"^(ready|developing|planned)$")


class TaskRequest(BaseModel):
    """Request body for creating a new download task."""

    platform: str
    mode: str
    url: str
    options: Optional[dict[str, Any]] = None


class TaskStatus(BaseModel):
    """Status of a download task."""

    task_id: str
    platform: str
    mode: str
    url: str = ""
    options: dict[str, Any] = Field(default_factory=dict)
    status: str = Field(
        default="pending", pattern=r"^(pending|running|complete|failed)$"
    )
    message: str = ""
    current: int = 0
    total: int = 0
    files: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)


class ConfigUpdate(BaseModel):
    """Request body for updating platform configuration."""

    platform: str
    config: dict[str, Any]
