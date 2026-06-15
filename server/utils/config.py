"""Helpers to locate configuration files."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Optional

import yaml

from utils.paths import get_data_dir, get_resource_dir


def get_app_yaml_path() -> Path:
    """Return the path to app.yaml.

    Priority:
    1. User-editable config in data dir (next to exe)
    2. Bundled default in resource dir (inside PyInstaller temp)
    """
    data_path = get_data_dir() / "app.yaml"
    if data_path.is_file():
        return data_path

    resource_path = get_resource_dir() / "data" / "app.yaml"
    if resource_path.is_file():
        return resource_path

    return data_path


def ensure_default_config(destination: Path) -> None:
    """Copy bundled app.yaml to destination if it does not already exist."""
    if destination.is_file():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Try to copy from bundled resources
    resource_path = get_resource_dir() / "data" / "app.yaml"
    if resource_path.is_file():
        shutil.copy2(resource_path, destination)
        return
    # Write a minimal placeholder
    destination.write_text(
        "# Video Hunter default config\n"
        "douyin:\n  cookie:\n  path: Download\n  timeout: 10\n",
        encoding="utf-8",
    )


def get_conf_yaml_path() -> Path:
    """Return the path to conf.yaml."""
    return get_data_dir() / "conf.yaml"


def set_enable_bark(enable: bool) -> None:
    """Update the ``f2.enable_bark`` field in ``conf.yaml``."""
    import logging
    logger = logging.getLogger(__name__)
    conf_path = get_conf_yaml_path()
    if not conf_path.is_file():
        logger.warning("conf.yaml not found at %s, skipping enable_bark sync", conf_path)
        return
    try:
        data = yaml.safe_load(conf_path.read_text(encoding="utf-8")) or {}
        if "f2" not in data:
            data["f2"] = {}
        data["f2"]["enable_bark"] = enable
        conf_path.parent.mkdir(parents=True, exist_ok=True)
        with conf_path.open("w", encoding="utf-8") as fh:
            yaml.dump(data, fh, allow_unicode=True, default_flow_style=False)
    except Exception as e:
        logger.error("Failed to update enable_bark in conf.yaml: %s", e)


def load_platform_config(platform: str) -> Optional[dict[str, Any]]:
    """Load the saved configuration for *platform* from ``app.yaml``.

    Returns the platform's config dict, or ``None`` if not found.
    """
    config_path = get_app_yaml_path()
    if not config_path.is_file():
        return None
    try:
        data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        section = data.get(platform)
        if isinstance(section, dict):
            # Replace None values with empty strings (matches f2's behavior)
            return {k: ("" if v is None else v) for k, v in section.items()}
    except Exception:
        pass
    return None
