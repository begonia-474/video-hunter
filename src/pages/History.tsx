import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { platformNames, modeNames } from "@/lib/constants";
import { invoke } from "@tauri-apps/api/core";
import {
  FileVideo,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Video,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface PlatformUser {
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
  cover_image?: string;
  following?: number;
  friends_count?: number;
  weihao?: string;
  user_type?: string;
}

interface PlatformVideo {
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

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
    icon: React.ReactNode;
  }
> = {
  running: {
    label: "运行中",
    variant: "warning",
    icon: <Clock size={12} />,
  },
  complete: {
    label: "已完成",
    variant: "success",
    icon: <CheckCircle2 size={12} />,
  },
  failed: {
    label: "失败",
    variant: "destructive",
    icon: <XCircle size={12} />,
  },
  cancelled: {
    label: "已取消",
    variant: "outline",
    icon: <AlertCircle size={12} />,
  },
  pending: {
    label: "等待中",
    variant: "secondary",
    icon: <Clock size={12} />,
  },
};

type SortField = "created_at" | "platform" | "status";
type SortOrder = "asc" | "desc";

interface HistoryPageProps {
  active?: boolean;
}

export function HistoryPage({ active }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [platformUsers, setPlatformUsers] = useState<Record<string, PlatformUser>>({});
  const [platformVideos, setPlatformVideos] = useState<Record<string, PlatformVideo>>({});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSelectMode, setShowSelectMode] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:18224/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        fetchPlatformData(data);
      }
    } catch {
      // backend not available
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlatformData = async (historyItems: HistoryItem[]) => {
    const platforms = [...new Set(historyItems.map((item) => item.platform))];
    for (const platform of platforms) {
      try {
        const usersRes = await fetch(
          `http://127.0.0.1:18224/api/f2/users?platform=${platform}&limit=100`
        );
        if (usersRes.ok) {
          const users = await usersRes.json();
          const usersMap: Record<string, PlatformUser> = {};
          users.forEach((user: PlatformUser) => {
            const userId = user.sec_user_id || user.uid;
            if (userId) {
              usersMap[userId] = user;
            }
          });
          setPlatformUsers((prev) => ({ ...prev, ...usersMap }));
        }

        const videosRes = await fetch(
          `http://127.0.0.1:18224/api/f2/videos?platform=${platform}&limit=100`
        );
        if (videosRes.ok) {
          const videos = await videosRes.json();
          const videosMap: Record<string, PlatformVideo> = {};
          videos.forEach((video: PlatformVideo) => {
            if (video.aweme_id) {
              videosMap[video.aweme_id] = video;
            }
          });
          setPlatformVideos((prev) => ({ ...prev, ...videosMap }));
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
      await fetch(`http://127.0.0.1:18224/api/history/${taskId}`, {
        method: "DELETE",
      });
      setHistory((prev) => prev.filter((t) => t.task_id !== taskId));
    } catch {
      // ignore
    }
  };

  const handleBatchDelete = async () => {
    const taskIds = Array.from(selectedIds);
    if (taskIds.length === 0) return;

    try {
      await fetch("http://127.0.0.1:18224/api/history/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: taskIds }),
      });
      setHistory((prev) => prev.filter((t) => !selectedIds.has(t.task_id)));
      setSelectedIds(new Set());
      setShowSelectMode(false);
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

  const handleOpenFileLocation = async (filePath: string) => {
    try {
      console.log("Revealing in dir:", filePath);
      await invoke("reveal_in_folder", { path: filePath });
    } catch (err) {
      console.error("Failed to reveal file in folder:", err);
      alert(`打开文件夹失败: ${err}`);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      console.log("Opening file:", filePath);
      const isFile = isFilePath(filePath);
      if (isFile) {
        // For files, reveal in folder
        await invoke("reveal_in_folder", { path: filePath });
      } else {
        // For folders, open directly
        await invoke("open_folder", { path: filePath });
      }
    } catch (err) {
      console.error("Failed to open file:", err);
      alert(`打开文件失败: ${err}`);
    }
  };

  // Check if path is a file (has extension) or folder
  const isFilePath = (path: string): boolean => {
    // Check if the last segment has a file extension
    const lastSegment = path.split(/[\\/]/).pop() || '';
    return /\.[a-zA-Z0-9]+$/.test(lastSegment);
  };

  const getVideoIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const getUserIdFromUrl = (url: string): string | null => {
    const match =
      url.match(/\/user\/([A-Za-z0-9_-]+)/) || url.match(/\/u\/(\d+)/);
    return match ? match[1] : null;
  };

  const getRelatedPlatformData = (item: HistoryItem) => {
    if (item.mode === "one") {
      const videoId = getVideoIdFromUrl(item.url);
      if (videoId && platformVideos[videoId]) {
        return { type: "video", data: platformVideos[videoId] };
      }
    } else {
      const userId = getUserIdFromUrl(item.url);
      if (userId && platformUsers[userId]) {
        return { type: "user", data: platformUsers[userId] };
      }
    }
    return null;
  };

  // Filtered and sorted history
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.url.toLowerCase().includes(query) ||
          item.message?.toLowerCase().includes(query) ||
          platformNames[item.platform]?.toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((item) => item.platform === platformFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "created_at") {
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "platform") {
        comparison = a.platform.localeCompare(b.platform);
      } else if (sortField === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [history, searchQuery, platformFilter, statusFilter, sortField, sortOrder]);

  // Get unique platforms from history
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(history.map((item) => item.platform));
    return Array.from(platforms);
  }, [history]);

  // Selection handlers
  const toggleSelect = (taskId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map((t) => t.task_id)));
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
          {showSelectMode ? (
            <>
              <span className="text-xs text-muted-foreground self-center">
                已选 {selectedIds.size} 项
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-1.5"
              >
                {selectedIds.size === filteredHistory.length ? (
                  <CheckSquare size={14} />
                ) : (
                  <Square size={14} />
                )}
                {selectedIds.size === filteredHistory.length
                  ? "取消全选"
                  : "全选"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 size={12} />
                删除选中
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSelectMode(false);
                  setSelectedIds(new Set());
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              {history.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSelectMode(true)}
                    className="gap-1.5"
                  >
                    <CheckSquare size={12} />
                    批量操作
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 size={12} />
                    清空
                  </Button>
                </>
              )}
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-mac"
              >
                <RefreshCw
                  size={12}
                  className={loading ? "animate-spin" : ""}
                />
                刷新
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索链接、消息..."
            className="pl-9 h-8 text-xs"
          />
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-muted-foreground" />
          <Select
            value={platformFilter}
            onChange={setPlatformFilter}
            placeholder="所有平台"
            options={[
              { value: "all", label: "所有平台" },
              ...availablePlatforms.map((p) => ({
                value: p,
                label: platformNames[p] || p,
              })),
            ]}
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="所有状态"
          options={[
            { value: "all", label: "所有状态" },
            { value: "complete", label: "已完成" },
            { value: "failed", label: "失败" },
            { value: "cancelled", label: "已取消" },
          ]}
        />

        {/* Sort */}
        <div className="flex items-center gap-1">
          <Select
            value={sortField}
            onChange={(v) => setSortField(v as SortField)}
            options={[
              { value: "created_at", label: "时间" },
              { value: "platform", label: "平台" },
              { value: "status", label: "状态" },
            ]}
          />
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-1.5 rounded hover:bg-secondary transition-mac text-muted-foreground"
          >
            {sortOrder === "asc" ? (
              <SortAsc size={14} />
            ) : (
              <SortDesc size={14} />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <FileVideo size={24} />
            </div>
            <p className="text-sm">
              {history.length === 0
                ? "还没有下载记录"
                : "没有匹配的记录"}
            </p>
            <p className="text-xs mt-1">
              {history.length === 0
                ? "已完成的下载会持久保存在这里"
                : "尝试调整搜索条件"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredHistory.map((item) => {
              const sc = statusConfig[item.status] || {
                label: item.status,
                variant: "secondary" as const,
                icon: null,
              };
              const isExpanded = expandedId === item.task_id;
              const platformData = getRelatedPlatformData(item);
              const isSelected = selectedIds.has(item.task_id);

              return (
                <Card
                  key={item.task_id}
                  className={cn(
                    "transition-mac",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      {showSelectMode && (
                        <button
                          onClick={() => toggleSelect(item.task_id, !isSelected)}
                          className="mt-0.5 text-muted-foreground hover:text-foreground transition-mac"
                        >
                          {isSelected ? (
                            <CheckSquare
                              size={18}
                              className="text-primary"
                            />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0"
                          >
                            {platformNames[item.platform] || item.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {modeNames[item.mode] || item.mode}
                          </span>
                          <Badge
                            variant={sc.variant}
                            className="gap-1 text-[10px] px-1.5 py-0"
                          >
                            {sc.icon}
                            {sc.label}
                          </Badge>
                        </div>

                        {/* F2 Data Preview */}
                        {platformData && (
                          <div className="mt-2 p-2.5 rounded-lg bg-secondary/50">
                            {platformData.type === "video" ? (
                              <div className="flex items-start gap-2">
                                {(platformData.data as PlatformVideo).cover && (
                                  <img
                                    src={(platformData.data as PlatformVideo).cover}
                                    alt="封面"
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Video
                                      size={12}
                                      className="text-muted-foreground"
                                    />
                                    <span className="text-xs font-medium truncate">
                                      {(platformData.data as PlatformVideo).desc ||
                                        "无标题"}
                                    </span>
                                  </div>
                                  {(platformData.data as PlatformVideo).nickname && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      @{(platformData.data as PlatformVideo).nickname}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                    {(platformData.data as PlatformVideo).digg_count && (
                                      <span>
                                        ❤️{" "}
                                        {(platformData.data as PlatformVideo).digg_count}
                                      </span>
                                    )}
                                    {(platformData.data as PlatformVideo).comment_count && (
                                      <span>
                                        💬{" "}
                                        {
                                          (platformData.data as PlatformVideo)
                                            .comment_count
                                        }
                                      </span>
                                    )}
                                    {(platformData.data as PlatformVideo).duration && (
                                      <span>
                                        ⏱️{" "}
                                        {(platformData.data as PlatformVideo).duration}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                {((platformData.data as PlatformUser).avatar_url ||
                                  (platformData.data as PlatformUser).avatar_hd) && (
                                  <img
                                    src={
                                      (platformData.data as PlatformUser).avatar_url ||
                                      (platformData.data as PlatformUser).avatar_hd
                                    }
                                    alt="头像"
                                    className="w-10 h-10 rounded-full object-cover"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-1">
                                    <User
                                      size={12}
                                      className="text-muted-foreground"
                                    />
                                    <span className="text-xs font-medium">
                                      {(platformData.data as PlatformUser).nickname ||
                                        "未知用户"}
                                    </span>
                                    {(platformData.data as PlatformUser).verified ===
                                      1 && (
                                      <span className="text-blue-500">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {(platformData.data as PlatformUser).unique_id
                                      ? `抖音号: ${(platformData.data as PlatformUser).unique_id}`
                                      : `ID: ${(platformData.data as PlatformUser).sec_user_id || (platformData.data as PlatformUser).uid}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                    {((platformData.data as PlatformUser).follower_count !==
                                      undefined ||
                                      (platformData.data as PlatformUser)
                                        .followers_count !== undefined) && (
                                      <span>
                                        粉丝:{" "}
                                        {(platformData.data as PlatformUser)
                                          .follower_count ||
                                          (platformData.data as PlatformUser)
                                            .followers_count}
                                      </span>
                                    )}
                                    {((platformData.data as PlatformUser).aweme_count !==
                                      undefined ||
                                      (platformData.data as PlatformUser).weibo_count !==
                                        undefined) && (
                                      <span>
                                        作品:{" "}
                                        {(platformData.data as PlatformUser).aweme_count ||
                                          (platformData.data as PlatformUser).weibo_count}
                                      </span>
                                    )}
                                    {(platformData.data as PlatformUser)
                                      .following_count !== undefined && (
                                      <span>
                                        关注:{" "}
                                        {
                                          (platformData.data as PlatformUser)
                                            .following_count
                                        }
                                      </span>
                                    )}
                                  </div>
                                  {((platformData.data as PlatformUser).description ||
                                    (platformData.data as PlatformUser).signature) && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                      {(platformData.data as PlatformUser).description ||
                                        (platformData.data as PlatformUser).signature}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm truncate text-foreground/80 mt-1">
                          {item.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : item.task_id)
                          }
                          className="p-1 rounded hover:bg-secondary transition-mac text-muted-foreground"
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
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
                          <span className="text-muted-foreground">
                            完整链接
                          </span>
                          <span className="break-all">{item.url}</span>

                          <span className="text-muted-foreground">
                            平台/模式
                          </span>
                          <span>
                            {platformNames[item.platform] || item.platform} /{" "}
                            {modeNames[item.mode] || item.mode}
                          </span>

                          <span className="text-muted-foreground">状态</span>
                          <span>
                            <Badge
                              variant={sc.variant}
                              className="gap-1 text-[10px] px-1 py-0"
                            >
                              {sc.icon}
                              {sc.label}
                            </Badge>
                          </span>

                          {item.message && (
                            <>
                              <span className="text-muted-foreground">
                                消息
                              </span>
                              <span
                                className={
                                  item.status === "failed"
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {item.message}
                              </span>
                            </>
                          )}

                          {item.files && item.files.length > 0 && (
                            <>
                              <span className="text-muted-foreground">
                                保存路径
                              </span>
                              <div className="space-y-1">
                                {item.files.map((file, idx) => {
                                  const isFile = isFilePath(file);
                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="break-all flex-1 text-xs">
                                        {file}
                                      </span>
                                      {isFile ? (
                                        // Single file: show both open file and open folder buttons
                                        <>
                                          <button
                                            onClick={() => handleOpenFile(file)}
                                            className="p-1 rounded hover:bg-secondary transition-mac text-muted-foreground hover:text-foreground shrink-0"
                                            title="打开文件"
                                          >
                                            <FileVideo size={12} />
                                          </button>
                                          <button
                                            onClick={() => handleOpenFileLocation(file)}
                                            className="p-1 rounded hover:bg-secondary transition-mac text-muted-foreground hover:text-foreground shrink-0"
                                            title="打开所在文件夹"
                                          >
                                            <FolderOpen size={12} />
                                          </button>
                                        </>
                                      ) : (
                                        // Folder: only show open folder button
                                        <button
                                          onClick={() => handleOpenFile(file)}
                                          className="p-1 rounded hover:bg-secondary transition-mac text-muted-foreground hover:text-foreground shrink-0"
                                          title="打开文件夹"
                                        >
                                          <FolderOpen size={12} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}

                          <span className="text-muted-foreground">
                            任务 ID
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {item.task_id}
                          </span>

                          <span className="text-muted-foreground">
                            创建时间
                          </span>
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

      {/* Summary bar */}
      {history.length > 0 && (
        <div className="shrink-0 px-6 py-2 border-t border-border bg-secondary/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              共 {history.length} 条记录
              {filteredHistory.length !== history.length &&
                ` (筛选显示 ${filteredHistory.length} 条)`}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-success" />
                {history.filter((h) => h.status === "complete").length} 成功
              </span>
              <span className="flex items-center gap-1">
                <XCircle size={12} className="text-destructive" />
                {history.filter((h) => h.status === "failed").length} 失败
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
