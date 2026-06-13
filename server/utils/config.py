"""Helpers to locate f2 configuration files."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Optional

import yaml

# Well-known locations to look for the f2 installation.
_F2_SEARCH_PATHS: list[Path] = [
    Path(r"C:\begonia\project\GitHub\f2"),
    Path.home() / "f2",
]


def find_f2_root() -> Path | None:
    """Return the root directory of the f2 project, or *None* if not found.

    Searches a list of candidate paths and returns the first one that
    contains ``f2/conf/app.yaml``.
    """
    for base in _F2_SEARCH_PATHS:
        if (base / "f2" / "conf" / "app.yaml").is_file():
            return base
    # Fallback: try to resolve via the installed ``f2`` package.
    try:
        import f2  # type: ignore[import-untyped]

        candidate = Path(f2.__file__).resolve().parent.parent
        if (candidate / "f2" / "conf" / "app.yaml").is_file():
            return candidate
        # The package itself may be the root (flat layout).
        candidate2 = Path(f2.__file__).resolve().parent
        if (candidate2 / "conf" / "app.yaml").is_file():
            return candidate2.parent
    except Exception:
        pass
    return None


def get_app_yaml_path() -> Path:
    """Return the path to ``conf/app.yaml``.

    If f2 is installed or present at a known location, use its config.
    Otherwise, fall back to the local ``server/data/app.yaml`` default.
    """
    f2_root = find_f2_root()
    if f2_root is not None:
        path = f2_root / "f2" / "conf" / "app.yaml"
        if path.is_file():
            return path
    # Local fallback
    return Path(__file__).resolve().parent.parent / "data" / "app.yaml"


def ensure_default_config(destination: Path) -> None:
    """Copy the default ``app.yaml`` from f2 into *destination* if it does
    not already exist.
    """
    if destination.is_file():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    f2_root = find_f2_root()
    if f2_root is not None:
        src = f2_root / "f2" / "conf" / "app.yaml"
        if src.is_file():
            shutil.copy2(src, destination)
            return
    # Write a minimal placeholder
    destination.write_text(
        "# f2 GUI default config\n"
        "douyin:\n  cookie:\n  path: Download\n  timeout: 10\n",
        encoding="utf-8",
    )


def get_conf_yaml_path() -> Path:
    """Return the path to ``conf/conf.yaml`` (f2 low-frequency config)."""
    f2_root = find_f2_root()
    if f2_root is not None:
        path = f2_root / "f2" / "conf" / "conf.yaml"
        if path.is_file():
            return path
    return Path(__file__).resolve().parent.parent / "data" / "conf.yaml"


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
