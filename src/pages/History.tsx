import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileVideo, RefreshCw } from "lucide-react";

interface HistoryItem {
  task_id: string;
  platform: string;
  mode: string;
  url: string;
  status: string;
  message: string;
  files: string[];
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
  music: "收藏音乐",
  live: "直播",
};

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    fetchHistory();
  }, [fetchHistory]);

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
            已完成的下载记录
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-mac"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <FileVideo size={24} />
            </div>
            <p className="text-sm">还没有下载记录</p>
            <p className="text-xs mt-1">下载完成的内容会显示在这里</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <Card key={item.task_id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                          {platformNames[item.platform] || item.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {modeNames[item.mode] || item.mode}
                        </span>
                      </div>
                      <p className="text-sm truncate text-foreground/80">{item.url}</p>
                      {item.message && (
                        <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                      )}
                      {item.files && item.files.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          保存至: {item.files[0]}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
