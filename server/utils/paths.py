"""Path helpers for PyInstaller compatibility."""

from __future__ import annotations

import sys
from pathlib import Path


def get_app_dir() -> Path:
    """Return the application base directory.

    - PyInstaller bundle: directory containing the .exe
    - Development: directory containing this file's parent (server/)
    """
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        return Path(sys.executable).parent
    # Development mode
    return Path(__file__).resolve().parent.parent


def get_data_dir() -> Path:
    """Return the data directory (for config, database, etc.)."""
    return get_app_dir() / "data"


def get_resource_dir() -> Path:
    """Return the resource directory (for bundled files like app.yaml).

    In PyInstaller, this is the temp directory where data files are extracted.
    """
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        return Path(sys._MEIPASS)
    # Development mode
    return Path(__file__).resolve().parent.parent
