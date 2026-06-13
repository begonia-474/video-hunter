"""GET /api/platforms -- static platform catalogue."""

from fastapi import APIRouter

from api.models import ModeOption, PlatformInfo

router = APIRouter()

_PLATFORMS: list[PlatformInfo] = [
    PlatformInfo(
        id="douyin",
        name="抖音",
        icon="douyin",
        status="ready",
        modes=[
            ModeOption(id="one", name="单个作品", description="下载单个作品"),
            ModeOption(id="post", name="用户主页", description="下载用户主页全部作品"),
            ModeOption(id="like", name="点赞作品", description="下载用户点赞作品"),
            ModeOption(id="collection", name="收藏作品", description="下载用户收藏作品"),
            ModeOption(id="music", name="收藏音乐", description="下载用户收藏音乐"),
            ModeOption(id="live", name="直播", description="下载直播回放"),
            ModeOption(id="user-mix", name="合集", description="下载用户合集"),
            ModeOption(id="related", name="相关推荐", description="下载相关推荐作品"),
        ],
    ),
    PlatformInfo(
        id="tiktok",
        name="TikTok",
        icon="tiktok",
        status="ready",
        modes=[
            ModeOption(id="one", name="Single Post", description="Download a single post"),
            ModeOption(id="post", name="User Posts", description="Download all posts from a user"),
            ModeOption(id="like", name="Liked Posts", description="Download liked posts"),
            ModeOption(id="collection", name="Collection", description="Download collection"),
            ModeOption(id="live", name="Live", description="Download live replay"),
        ],
    ),
    PlatformInfo(
        id="twitter",
        name="Twitter / X",
        icon="twitter",
        status="ready",
        modes=[
            ModeOption(id="one", name="单条推文", description="下载单条推文"),
            ModeOption(id="post", name="用户推文", description="下载用户全部推文"),
            ModeOption(id="like", name="喜欢", description="下载用户喜欢的推文"),
            ModeOption(id="media", name="媒体", description="下载用户媒体文件"),
        ],
    ),
    PlatformInfo(
        id="bilibili",
        name="哔哩哔哩",
        icon="bilibili",
        status="developing",
        modes=[
            ModeOption(id="one", name="单个视频", description="下载单个视频"),
            ModeOption(id="post", name="用户投稿", description="下载用户全部投稿"),
            ModeOption(id="collection", name="收藏夹", description="下载收藏夹内容"),
        ],
    ),
    PlatformInfo(id="weibo", name="微博", icon="weibo", status="planned", modes=[]),
    PlatformInfo(
        id="instagram", name="Instagram", icon="instagram", status="planned", modes=[]
    ),
    PlatformInfo(
        id="youtube", name="YouTube", icon="youtube", status="planned", modes=[]
    ),
    PlatformInfo(id="twitch", name="Twitch", icon="twitch", status="planned", modes=[]),
    PlatformInfo(
        id="little_red_book",
        name="小红书",
        icon="little_red_book",
        status="planned",
        modes=[],
    ),
    PlatformInfo(
        id="bark",
        name="Bark",
        icon="bark",
        status="ready",
        modes=[
            ModeOption(id="get", name="GET", description="Send notification via GET"),
            ModeOption(id="post", name="POST", description="Send notification via POST"),
            ModeOption(id="cipher", name="Cipher", description="Send encrypted notification"),
        ],
    ),
]


@router.get("/api/platforms", response_model=list[PlatformInfo])
async def list_platforms() -> list[PlatformInfo]:
    """Return all supported platforms and their modes."""
    return _PLATFORMS
