import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformNames, modeNames } from "@/lib/constants";
import { FileVideo, RefreshCw, Trash2, ChevronDown, ChevronUp, User, Video } from "lucide-react";

interface HistoryItem {
  task_id: string;
  platform: string;
  mode: string;
  url: string;
  status: string;
  message: string;
  files: string[];
  options: Record<string, unknown>;
  created_at: string;
}

interface F2User {
  // 通用字段
  nickname?: string;
  avatar_url?: string;
  avatar_hd?: string;
  follower_count?: number;
  followers_count?: number;
  following_count?: number;
  aweme_count?: number;
  weibo_count?: number;
  signature?: string;
  description?: string;
  sec_user_id?: string;
  uid?: string;
  unique_id?: string;
  gender?: string;
  location?: string;
  profile_url?: string;
  verified?: number;
  // 微博特有字段
  cover_image?: string;
  following?: number;
  friends_count?: number;
  weihao?: string;
  user_type?: string;
}

interface F2Video {
  desc?: string;
  cover?: string;
  duration?: string;
  create_time?: string;
  nickname?: string;
  digg_count?: string;
  comment_count?: string;
  share_count?: string;
  aweme_id?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  running: { label: "运行中", variant: "warning" },
  complete: { label: "已完成", variant: "success" },
  failed: { label: "失败", variant: "destructive" },
  pending: { label: "等待中", variant: "secondary" },
};

interface HistoryPageProps {
  active?: boolean;
}

export function HistoryPage({ active }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [f2Users, setF2Users] = useState<Record<string, F2User>>({});
  const [f2Videos, setF2Videos] = useState<Record<string, F2Video>>({});

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:18224/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        // Fetch f2 data for each platform
        fetchF2Data(data);
      }
    } catch {
      // backend not available
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchF2Data = async (historyItems: HistoryItem[]) => {
    const platforms = [...new Set(historyItems.map(item => item.platform))];
    for (const platform of platforms) {
      try {
        const usersRes = await fetch(`http://127.0.0.1:18224/api/f2/users?platform=${platform}&limit=100`);
        if (usersRes.ok) {
          const users = await usersRes.json();
          const usersMap: Record<string, F2User> = {};
          users.forEach((user: F2User) => {
            // 抖音/Twitter 使用 sec_user_id，微博使用 uid
            const userId = user.sec_user_id || user.uid;
            if (userId) {
              usersMap[userId] = user;
            }
          });
          setF2Users(prev => ({ ...prev, ...usersMap }));
        }

        const videosRes = await fetch(`http://127.0.0.1:18224/api/f2/videos?platform=${platform}&limit=100`);
        if (videosRes.ok) {
          const videos = await videosRes.json();
          const videosMap: Record<string, F2Video> = {};
          videos.forEach((video: F2Video) => {
            if (video.aweme_id) {
              videosMap[video.aweme_id] = video;
            }
          });
          setF2Videos(prev => ({ ...prev, ...videosMap }));
        }
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (active) {
      fetchHistory();
    }
  }, [active, fetchHistory]);

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`http://127.0.0.1:18224/api/history/${taskId}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((t) => t.task_id !== taskId));
    } catch {
      // ignore
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch("http://127.0.0.1:18224/api/history", { method: "DELETE" });
      setHistory([]);
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getVideoIdFromUrl = (url: string): string | null => {
    // Extract video ID from URL patterns like /video/1234567890
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const getUserIdFromUrl = (url: string): string | null => {
    // Extract user ID from URL patterns like /user/SEC_USER_ID or /u/123456
    const match = url.match(/\/user\/([A-Za-z0-9_-]+)/) || url.match(/\/u\/(\d+)/);
    return match ? match[1] : null;
  };

  const getRelatedF2Data = (item: HistoryItem) => {
    if (item.mode === "one") {
      // Single video mode
      const videoId = getVideoIdFromUrl(item.url);
      if (videoId && f2Videos[videoId]) {
        return { type: "video", data: f2Videos[videoId] };
      }
    } else {
      // User mode (post, like, etc.)
      const userId = getUserIdFromUrl(item.url);
      if (userId && f2Users[userId]) {
        return { type: "user", data: f2Users[userId] };
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">历史</h1>
          <p className="text-sm text-muted-foreground mt-1">
            已完成的下载记录（重启后仍保留）
          </p>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 size={12} />
              清空
            </Button>
          )}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-mac"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <FileVideo size={24} />
            </div>
            <p className="text-sm">还没有下载记录</p>
            <p className="text-xs mt-1">已完成的下载会持久保存在这里</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => {
              const sc = statusConfig[item.status] || { label: item.status, variant: "secondary" as const };
              const isExpanded = expandedId === item.task_id;
              const f2Data = getRelatedF2Data(item);
              return (
                <Card key={item.task_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                            {platformNames[item.platform] || item.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {modeNames[item.mode] || item.mode}
                          </span>
                          <Badge variant={sc.variant} className="text-[10px] px-1 py-0">
                            {sc.label}
                          </Badge>
                        </div>

                        {/* F2 Data Preview */}
                        {f2Data && (
                          <div className="mt-2 p-2 rounded-md bg-secondary/50">
                            {f2Data.type === "video" ? (
                              <div className="flex items-start gap-2">
                                {(f2Data.data as F2Video).cover && (
                                  <img
                                    src={(f2Data.data as F2Video).cover}
                                    alt="封面"
                                    className="w-16 h-16 rounded object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Video size={12} className="text-muted-foreground" />
                                    <span className="text-xs font-medium truncate">
                                      {(f2Data.data as F2Video).desc || "无标题"}
                                    </span>
                                  </div>
                                  {(f2Data.data as F2Video).nickname && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      @{(f2Data.data as F2Video).nickname}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                    {(f2Data.data as F2Video).digg_count && (
                                      <span>❤️ {(f2Data.data as F2Video).digg_count}</span>
                                    )}
                                    {(f2Data.data as F2Video).comment_count && (
                                      <span>💬 {(f2Data.data as F2Video).comment_count}</span>
                                    )}
                                    {(f2Data.data as F2Video).duration && (
                                      <span>⏱️ {(f2Data.data as F2Video).duration}s</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {((f2Data.data as F2User).avatar_url || (f2Data.data as F2User).avatar_hd) && (
                                  <img
                                    src={(f2Data.data as F2User).avatar_url || (f2Data.data as F2User).avatar_hd}
                                    alt="头像"
                                    className="w-10 h-10 rounded-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-1">
                                    <User size={12} className="text-muted-foreground" />
                                    <span className="text-xs font-medium">
                                      {(f2Data.data as F2User).nickname || "未知用户"}
                                    </span>
                                    {(f2Data.data as F2User).verified === 1 && (
                                      <span className="text-blue-500">✓</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {(f2Data.data as F2User).unique_id ? `抖音号: ${(f2Data.data as F2User).unique_id}` : `ID: ${(f2Data.data as F2User).sec_user_id || (f2Data.data as F2User).uid}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                    {((f2Data.data as F2User).follower_count !== undefined || (f2Data.data as F2User).followers_count !== undefined) && (
                                      <span>粉丝: {(f2Data.data as F2User).follower_count || (f2Data.data as F2User).followers_count}</span>
                                    )}
                                    {((f2Data.data as F2User).aweme_count !== undefined || (f2Data.data as F2User).weibo_count !== undefined) && (
                                      <span>作品: {(f2Data.data as F2User).aweme_count || (f2Data.data as F2User).weibo_count}</span>
                                    )}
                                    {(f2Data.data as F2User).following_count !== undefined && (
                                      <span>关注: {(f2Data.data as F2User).following_count}</span>
                                    )}
                                  </div>
                                  {((f2Data.data as F2User).description || (f2Data.data as F2User).signature) && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                      {(f2Data.data as F2User).description || (f2Data.data as F2User).signature}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm truncate text-foreground/80 mt-1">{item.url}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.task_id)}
                          className="p-1 rounded hover:bg-secondary transition-mac text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.task_id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-mac text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                          <span className="text-muted-foreground">完整链接</span>
                          <span className="break-all">{item.url}</span>

                          <span className="text-muted-foreground">平台/模式</span>
                          <span>{platformNames[item.platform] || item.platform} / {modeNames[item.mode] || item.mode}</span>

                          <span className="text-muted-foreground">状态</span>
                          <span>
                            <Badge variant={sc.variant} className="text-[10px] px-1 py-0">
                              {sc.label}
                            </Badge>
                          </span>

                          {item.message && (
                            <>
                              <span className="text-muted-foreground">消息</span>
                              <span className={item.status === "failed" ? "text-destructive" : ""}>{item.message}</span>
                            </>
                          )}

                          {item.files && item.files.length > 0 && (
                            <>
                              <span className="text-muted-foreground">保存路径</span>
                              <span className="break-all">{item.files.join(", ")}</span>
                            </>
                          )}

                          <span className="text-muted-foreground">任务 ID</span>
                          <span className="font-mono text-muted-foreground">{item.task_id}</span>

                          <span className="text-muted-foreground">创建时间</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
