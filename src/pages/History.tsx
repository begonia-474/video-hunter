import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileVideo, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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

const platformNames: Record<string, string> = {
  douyin: "抖音",
  tiktok: "TikTok",
  twitter: "Twitter",
  bilibili: "Bilibili",
  weibo: "微博",
};

const modeNames: Record<string, string> = {
  one: "单个作品",
  post: "用户主页",
  like: "点赞作品",
  collection: "收藏作品",
  collects: "收藏夹",
  music: "收藏音乐",
  mix: "合集",
  live: "直播录制",
  feed: "推荐流",
  related: "相关推荐",
  friend: "好友动态",
  collect: "收藏作品",
  search: "关键词搜索",
  bookmark: "书签推文",
};

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

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:18224/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // backend not available
    } finally {
      setLoading(false);
    }
  }, []);

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
                        <p className="text-sm truncate text-foreground/80">{item.url}</p>
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
