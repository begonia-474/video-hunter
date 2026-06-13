"""GET/PUT /api/config/{platform} -- read and update f2 app.yaml settings."""

from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from api.models import ConfigUpdate
from utils.config import get_app_yaml_path, set_enable_bark

router = APIRouter()


@router.get("/api/cookie/{browser}")
async def get_browser_cookie(browser: str, domain: str = "") -> dict:
    """Extract cookies from the specified browser using browser_cookie3.

    Supported browsers: firefox, chrome, edge, chromium, opera, vivaldi, brave.
    """
    try:
        import browser_cookie3
    except ImportError:
        return {"cookie": "", "error": "browser_cookie3 未安装"}

    browser_funcs = {
        "firefox": browser_cookie3.firefox,
        "chrome": browser_cookie3.chrome,
        "edge": browser_cookie3.edge,
        "chromium": browser_cookie3.chromium,
        "opera": browser_cookie3.opera,
        "opera_gx": browser_cookie3.opera_gx,
        "vivaldi": browser_cookie3.vivaldi,
        "brave": browser_cookie3.brave,
        "librewolf": browser_cookie3.librewolf,
        "arc": browser_cookie3.arc,
    }

    func = browser_funcs.get(browser)
    if not func:
        return {"cookie": "", "error": f"不支持的浏览器: {browser}"}

    try:
        cj = func(domain_name=domain or None)
        cookies = "; ".join(f"{c.name}={c.value}" for c in cj)
        if cookies:
            return {"cookie": cookies}
        return {"cookie": "", "error": f"{browser} 中未找到相关 Cookie"}
    except browser_cookie3.BrowserCookieError as e:
        return {"cookie": "", "error": f"无法读取 {browser} Cookie: {e}"}
    except Exception as e:
        return {"cookie": "", "error": f"获取失败: {e}"}


def _load_yaml(path: Path) -> dict:
    """Load a YAML file and return its contents as a dict."""
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return data if isinstance(data, dict) else {}


def _save_yaml(path: Path, data: dict) -> None:
    """Write *data* as YAML to *path*."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        yaml.dump(data, fh, allow_unicode=True, default_flow_style=False)


@router.get("/api/config/all")
async def get_all_config() -> dict:
    """Return all platform configs from ``app.yaml`` (excluding bark)."""
    config_path = get_app_yaml_path()
    data = _load_yaml(config_path)
    return {k: v for k, v in data.items() if k != "bark" and isinstance(v, dict)}


@router.get("/api/config/{platform}")
async def get_config(platform: str) -> dict:
    """Return the configuration section for *platform* from ``app.yaml``."""
    config_path = get_app_yaml_path()
    data = _load_yaml(config_path)
    if platform not in data:
        raise HTTPException(status_code=404, detail=f"Platform '{platform}' not found in config")
    return {"platform": platform, "config": data[platform]}


@router.put("/api/config/{platform}")
async def update_config(platform: str, body: ConfigUpdate) -> dict:
    """Merge *body.config* into the existing config for *platform*."""
    config_path = get_app_yaml_path()
    data = _load_yaml(config_path)
    existing = data.get(platform, {})
    if not isinstance(existing, dict):
        existing = {}
    existing.update(body.config)
    data[platform] = existing
    _save_yaml(config_path, data)

    # Sync enable_bark to conf.yaml when bark config is saved
    if platform == "bark" and "enable_bark" in body.config:
        set_enable_bark(bool(body.config["enable_bark"]))

    return {"platform": platform, "config": existing, "status": "updated"}
