"""F2 service — wraps f2's handler to execute real downloads."""

from __future__ import annotations

import asyncio
import importlib
import logging
import traceback
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

from utils.config import load_platform_config

logger = logging.getLogger(__name__)

# Type alias for progress callback
ProgressCallback = Callable[[int, int, str], Awaitable[None]]


async def _silent_bark_notification(*args: Any, **kwargs: Any) -> None:
    """No-op replacement for handler._send_bark_notification.

    Bark notifications are irrelevant when running through the GUI —
    errors from the notification service must not abort the download.
    """


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
        """Run a real f2 download task.

        Constructs the kwargs dict f2 expects, then calls the platform's
        handler.main(kwargs) which dispatches to the correct mode handler.

        Args:
            platform: Platform identifier (e.g. "douyin").
            mode: Download mode (e.g. "one", "post").
            url: Target URL.
            options: Extra config overrides from the frontend.
            progress_callback: await callback(current, total, message).

        Returns:
            List of downloaded file paths (best-effort).
        """
        # 1. Build kwargs for f2
        kwargs = self._build_kwargs(platform, mode, url, options)

        # 2. Notify start
        if progress_callback:
            await progress_callback(0, 0, f"正在初始化 {platform} 下载...")

        # 3. Import and call the platform handler's main function
        try:
            handler_module = importlib.import_module(f"f2.apps.{platform}.handler")
        except ImportError:
            raise RuntimeError(f"平台 {platform} 的 handler 模块未找到")

        try:
            # Disable Bark notifications in all platform handlers — the GUI
            # handles notifications separately, and a Bark failure must not
            # abort an otherwise successful download.
            Handler = getattr(handler_module, "Handler", None)
            if Handler:
                if hasattr(Handler, "_send_bark_notification"):
                    Handler._send_bark_notification = _silent_bark_notification  # type: ignore
                # Also patch the bark_notification object's send_quick_notification
                # since some handlers call self.bark_notification.send_quick_notification()

            # Also disable bark at the module level by patching the bark handler
            try:
                bark_handler_mod = importlib.import_module("f2.apps.bark.handler")
                BarkHandler = getattr(bark_handler_mod, "BarkHandler", None)
                if BarkHandler:
                    BarkHandler._send_bark_notification = _silent_bark_notification  # type: ignore
                    BarkHandler.send_quick_notification = _silent_bark_notification  # type: ignore
                    BarkHandler.cipher_bark_notification = _silent_bark_notification  # type: ignore
            except ImportError:
                pass

            # f2's main() creates the Handler and dispatches to the mode handler
            await handler_module.main(kwargs)

            if progress_callback:
                await progress_callback(1, 1, "下载完成")

            # Return a placeholder — f2 downloads to the configured path
            download_path = kwargs.get("path", "Download")
            return [str(Path(download_path).resolve())]

        except Exception as e:
            error_msg = f"下载失败: {e}"
            traceback.print_exc()
            raise RuntimeError(error_msg)

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
        # Start with sensible defaults
        kwargs: dict[str, Any] = {
            "app_name": platform,
            "mode": mode,
            "url": url,
            "path": "Download",
            "naming": "{create}_{desc}",
            "interval": "all",
            "timeout": 10,
            "max_retries": 5,
            "max_connections": 5,
            "max_tasks": 5,
            "page_counts": 20,
            "max_counts": 0,
            "folderize": False,
            "skip_existing": False,
            "music": False,
            "lyric": False,
            "cover": False,
            "desc": False,
        }

        # Load platform config from our saved config
        platform_config = load_platform_config(platform)
        if platform_config:
            kwargs.update(platform_config)

        # Apply user options from the frontend
        if options:
            kwargs.update(options)

        # Ensure required fields
        kwargs["app_name"] = platform
        kwargs["mode"] = mode
        kwargs["url"] = url

        # Convert string booleans
        for bool_key in ("music", "lyric", "cover", "desc", "folderize", "skip_existing"):
            val = kwargs.get(bool_key)
            if isinstance(val, str):
                kwargs[bool_key] = val.lower() in ("true", "1", "yes")

        # Convert numeric fields
        for num_key in ("timeout", "max_retries", "max_connections", "max_tasks", "page_counts", "max_counts"):
            val = kwargs.get(num_key)
            if isinstance(val, str):
                try:
                    kwargs[num_key] = int(val)
                except ValueError:
                    pass

        # Set headers if not present
        if "headers" not in kwargs:
            kwargs["headers"] = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                "Referer": f"https://www.{platform}.com/",
            }

        # Handle proxy configuration from options
        proxy_http = kwargs.pop("proxies.http", "") or ""
        proxy_https = kwargs.pop("proxies.https", "") or ""
        if proxy_http or proxy_https:
            kwargs["proxies"] = {
                "http://": proxy_http or None,
                "https://": proxy_https or None,
            }
        elif "proxies" not in kwargs:
            kwargs["proxies"] = {"http://": None, "https://": None}

        return kwargs
