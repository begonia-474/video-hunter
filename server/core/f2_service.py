"""F2 service — wraps f2's handler to execute real downloads."""

from __future__ import annotations

import importlib
import logging
import re
import traceback
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

from utils.config import load_platform_config

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int, str], Awaitable[None]]


class IntervalExhaustedError(Exception):
    """Raised when interval filtering finds no matching works for multiple consecutive pages."""
    pass


class IntervalMonitor(logging.Handler):
    """Monitor f2 logs to detect when interval filtering exhausts all pages."""

    def __init__(self, max_empty_pages: int = 3):
        super().__init__()
        self.max_empty_pages = max_empty_pages
        self.empty_page_count = 0
        self.enabled = False

    def reset(self):
        self.empty_page_count = 0
        self.enabled = True

    def disable(self):
        self.enabled = False

    def emit(self, record):
        if not self.enabled:
            return

        msg = record.getMessage()
        if "没有找到符合条件的作品" in msg:
            self.empty_page_count += 1
            logger.debug(f"[IntervalMonitor] Empty page count: {self.empty_page_count}/{self.max_empty_pages}")
            if self.empty_page_count >= self.max_empty_pages:
                raise IntervalExhaustedError(
                    f"连续 {self.max_empty_pages} 页没有找到符合条件的作品，已到达区间边界，停止下载"
                )


class FileTracker(logging.Handler):
    """Track downloaded files by monitoring f2's completion logs."""

    def __init__(self):
        super().__init__()
        self.downloaded_files: list[str] = []
        self.enabled = False
        # Pattern to match f2's log: [  跳过  ]: filename or [  完成  ]: filename
        self._pattern = re.compile(r'\[\s*(?:跳过|完成)\s*\]\s*[:：]\s*(.+)')
        # Pattern to clean Rich markup tags like [\cyan], [green], [/green]
        self._rich_pattern = re.compile(r'\[/?\\?\w+\]')

    def reset(self):
        self.downloaded_files = []
        self.enabled = True

    def disable(self):
        self.enabled = False

    def emit(self, record):
        if not self.enabled:
            return

        msg = record.getMessage()
        # Match completion/skip logs
        match = self._pattern.search(msg)
        if match:
            filename = match.group(1).strip()
            # Clean Rich markup tags
            filename = self._rich_pattern.sub('', filename).strip()
            if filename:
                self.downloaded_files.append(filename)
                logger.debug(f"[FileTracker] Tracked file: {filename}")


_interval_monitor = IntervalMonitor(max_empty_pages=3)
_file_tracker = FileTracker()


def _setup_interval_monitor():
    """Attach interval monitor to f2's logger."""
    f2_logger = logging.getLogger("f2")
    if _interval_monitor not in f2_logger.handlers:
        f2_logger.addHandler(_interval_monitor)


def _setup_file_tracker():
    """Attach file tracker to f2's logger."""
    f2_logger = logging.getLogger("f2")
    if _file_tracker not in f2_logger.handlers:
        f2_logger.addHandler(_file_tracker)


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

        # Validate interval parameter
        interval = kwargs.get("interval", "all")
        use_interval_monitor = False
        if interval != "all" and interval:
            # 兼容 _ 分隔符，自动转换为 |
            if "_" in interval and "|" not in interval:
                interval = interval.replace("_", "|")
                kwargs["interval"] = interval
            if "|" not in interval:
                raise RuntimeError(
                    f"interval 参数格式错误，应为 '2022-01-01|2023-01-01' 或 'all'，当前值：{interval}"
                )
            use_interval_monitor = True

        # Get base path and resolved path
        download_path = kwargs.get("path", "Download")
        resolved_path = Path(download_path).resolve()

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

            # Setup interval monitor if needed
            if use_interval_monitor:
                _setup_interval_monitor()
                _interval_monitor.reset()

            # Setup file tracker
            _setup_file_tracker()
            _file_tracker.reset()

            await handler_module.main(kwargs)

            if progress_callback:
                await progress_callback(1, 1, "下载完成")

            # Get tracked files from file tracker
            tracked_files = _file_tracker.downloaded_files.copy()
            if tracked_files:
                # Try to find user nickname from f2 database for path construction
                user_path = self._find_user_path(platform, mode, url, resolved_path)
                
                # For batch downloads (post, like, collection, etc.), return user folder path
                # For single downloads (one), return specific file paths
                batch_modes = {"post", "like", "collection", "collects", "music", "mix", "live", "feed", "related", "friend"}
                if mode in batch_modes:
                    # Return user folder path
                    return [str(user_path)]
                else:
                    # Single download - return specific file paths
                    abs_files = []
                    for filename in tracked_files:
                        full_path = self._resolve_file_path(user_path, resolved_path, filename)
                        abs_files.append(str(full_path))
                    return abs_files
            return [str(resolved_path)]
        except IntervalExhaustedError as e:
            logger.info(f"[IntervalExhausted] {e}")
            if progress_callback:
                await progress_callback(1, 1, "区间下载完成")
            # Get tracked files from file tracker
            tracked_files = _file_tracker.downloaded_files.copy()
            if tracked_files:
                user_path = self._find_user_path(platform, mode, url, resolved_path)
                # For batch downloads, return user folder path
                batch_modes = {"post", "like", "collection", "collects", "music", "mix", "live", "feed", "related", "friend"}
                if mode in batch_modes:
                    return [str(user_path)]
                else:
                    abs_files = []
                    for filename in tracked_files:
                        full_path = self._resolve_file_path(user_path, resolved_path, filename)
                        abs_files.append(str(full_path))
                    return abs_files
            return [str(resolved_path)]
        except Exception as e:
            traceback.print_exc()
            # 检查下载目录是否有文件（区分部分成功和完全失败）
            download_path = kwargs.get("path", "Download")
            resolved_path = Path(download_path).resolve()
            downloaded_files = []
            if resolved_path.exists():
                downloaded_files = [f for f in resolved_path.rglob("*") if f.is_file()]
            
            if downloaded_files:
                # 有文件已下载，标记为部分成功
                logger.warning(f"[DownloadPartial] f2 出错但有 {len(downloaded_files)} 个文件已下载: {e}")
                if progress_callback:
                    await progress_callback(1, 1, f"部分完成（{len(downloaded_files)} 个文件）")
                return [str(resolved_path)]
            raise RuntimeError(f"下载失败: {e}")
        finally:
            _interval_monitor.disable()
            _file_tracker.disable()

    def _find_user_path(self, platform: str, mode: str, url: str, base_path: Path) -> Path:
        """Find user path from f2 database based on URL."""
        from core.f2_db import get_user_info, get_recent_users
        import re
        
        # Extract user ID from URL
        user_id = None
        # Match /user/SEC_USER_ID or /u/123456 patterns
        user_match = re.search(r'/user/([A-Za-z0-9_-]+)', url) or re.search(r'/u/(\d+)', url)
        if user_match:
            user_id = user_match.group(1)
        
        # Try to find user in database
        nickname = None
        if user_id:
            user_info = get_user_info(platform, user_id)
            if user_info:
                nickname = user_info.get("nickname")
        
        # If not found, try to get the most recent user
        if not nickname:
            recent_users = get_recent_users(platform, limit=1)
            if recent_users:
                nickname = recent_users[0].get("nickname")
        
        # Construct path: {base_path}/{platform}/{mode}/{nickname}
        if nickname:
            return base_path / platform / mode / nickname
        return base_path / platform / mode

    def _resolve_file_path(self, user_path: Path, base_path: Path, filename: str) -> Path:
        """Resolve the full file path by searching in user path and base path."""
        # First try in user path
        full_path = user_path / filename
        if full_path.exists():
            return full_path
        
        # Search in base path recursively
        for p in base_path.rglob(filename):
            if p.is_file():
                return p
        
        # Fallback to user path
        return full_path

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
