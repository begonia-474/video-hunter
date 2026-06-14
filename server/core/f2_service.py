"""F2 service — wraps f2's handler to execute real downloads."""

from __future__ import annotations

import importlib
import logging
import traceback
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

from utils.config import load_platform_config

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int, str], Awaitable[None]]


async def _noop(*_a: Any, **_kw: Any) -> None:
    """No-op replacement for Bark notification methods.

    Bark notifications are irrelevant when running through the GUI —
    errors from the notification service must not abort the download.
    """


def _patch_bark() -> None:
    """Disable Bark notifications in all platform handlers."""
    for mod_name, cls_name in [
        ("f2.apps.bark.handler", "BarkHandler"),
    ]:
        try:
            mod = importlib.import_module(mod_name)
            cls = getattr(mod, cls_name, None)
            if cls:
                for method in ("_send_bark_notification", "send_quick_notification", "cipher_bark_notification"):
                    if hasattr(cls, method):
                        setattr(cls, method, _noop)
        except ImportError:
            pass


class F2Service:
    """Thin async wrapper around f2 download handlers."""

    async def start_download(
        self,
        platform: str,
        mode: str,
        url: str,
        options: Optional[dict[str, Any]] = None,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> list[str]:
        kwargs = self._build_kwargs(platform, mode, url, options)

        if progress_callback:
            await progress_callback(0, 0, f"正在初始化 {platform} 下载...")

        try:
            handler_module = importlib.import_module(f"f2.apps.{platform}.handler")
        except ImportError:
            raise RuntimeError(f"平台 {platform} 的 handler 模块未找到")

        try:
            # Patch bark on the handler class
            Handler = getattr(handler_module, "Handler", None)
            if Handler and hasattr(Handler, "_send_bark_notification"):
                Handler._send_bark_notification = _noop
            _patch_bark()

            await handler_module.main(kwargs)

            if progress_callback:
                await progress_callback(1, 1, "下载完成")

            download_path = kwargs.get("path", "Download")
            return [str(Path(download_path).resolve())]
        except Exception as e:
            traceback.print_exc()
            raise RuntimeError(f"下载失败: {e}")

    def _build_kwargs(
        self,
        platform: str,
        mode: str,
        url: str,
        options: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Construct the kwargs dict that f2's handler expects.

        Layer priority: defaults < platform config < user options < request params.
        """
        kwargs: dict[str, Any] = {
            "app_name": platform, "mode": mode, "url": url,
            "path": "Download", "naming": "{create}_{desc}", "interval": "all",
            "timeout": 10, "max_retries": 5, "max_connections": 5,
            "max_tasks": 5, "page_counts": 20, "max_counts": 0,
            "folderize": False, "skip_existing": False,
            "music": False, "lyric": False, "cover": False, "desc": False,
        }

        platform_config = load_platform_config(platform)
        if platform_config:
            kwargs.update(platform_config)
        if options:
            kwargs.update(options)

        # Ensure required fields
        kwargs["app_name"] = platform
        kwargs["mode"] = mode
        kwargs["url"] = url

        # Type coercion
        for bool_key in ("music", "lyric", "cover", "desc", "folderize", "skip_existing"):
            val = kwargs.get(bool_key)
            if isinstance(val, str):
                kwargs[bool_key] = val.lower() in ("true", "1", "yes")

        for num_key in ("timeout", "max_retries", "max_connections", "max_tasks", "page_counts", "max_counts"):
            val = kwargs.get(num_key)
            if isinstance(val, str):
                try:
                    kwargs[num_key] = int(val)
                except ValueError:
                    pass

        if "headers" not in kwargs:
            kwargs["headers"] = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                "Referer": f"https://www.{platform}.com/",
            }

        # Handle proxy
        proxy_http = kwargs.pop("proxies.http", "") or ""
        proxy_https = kwargs.pop("proxies.https", "") or ""
        if proxy_http or proxy_https:
            kwargs["proxies"] = {"http://": proxy_http or None, "https://": proxy_https or None}
        elif "proxies" not in kwargs:
            kwargs["proxies"] = {"http://": None, "https://": None}

        return kwargs
