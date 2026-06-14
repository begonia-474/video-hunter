import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { platformNames, modeNames } from "@/lib/constants";
import {
  BarChart3,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskStats {
  total: number;
  pending: number;
  running: number;
  complete: number;
  failed: number;
  cancelled: number;
  by_platform: Record<string, { total: number; complete: number; failed: number }>;
}

interface HistoryStats {
  total: number;
  by_status: Record<string, number>;
  by_platform: Record<string, number>;
  by_mode: Record<string, number>;
}

interface StatsPageProps {
  active?: boolean;
}

export function StatsPage({ active }: StatsPageProps) {
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, historyRes] = await Promise.all([
        fetch("http://127.0.0.1:18224/api/tasks/stats"),
        fetch("http://127.0.0.1:18224/api/history/stats"),
      ]);

      if (taskRes.ok) {
        const data = await taskRes.json();
        setTaskStats(data);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistoryStats(data);
      }
    } catch {
      // backend not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      fetchStats();
    }
  }, [active, fetchStats]);

  const successRate = historyStats
    ? historyStats.total > 0
      ? Math.round(
          ((historyStats.by_status["complete"] || 0) / historyStats.total) * 100
        )
      : 0
    : 0;

  const topPlatforms = historyStats
    ? Object.entries(historyStats.by_platform)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const topModes = historyStats
    ? Object.entries(historyStats.by_mode)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">统计</h1>
          <p className="text-sm text-muted-foreground mt-1">
            下载数据统计和分析
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-mac"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">历史总数</p>
                  <p className="text-2xl font-semibold mt-1">
                    {historyStats?.total || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HardDrive size={20} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">成功率</p>
                  <p className="text-2xl font-semibold mt-1">{successRate}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">当前任务</p>
                  <p className="text-2xl font-semibold mt-1">
                    {taskStats?.total || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Download size={20} className="text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">运行中</p>
                  <p className="text-2xl font-semibold mt-1">
                    {taskStats?.running || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock size={20} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">状态分布</h3>
              <div className="space-y-3">
                {[
                  {
                    label: "已完成",
                    count: historyStats?.by_status["complete"] || 0,
                    color: "bg-success",
                    icon: <CheckCircle2 size={14} className="text-success" />,
                  },
                  {
                    label: "失败",
                    count: historyStats?.by_status["failed"] || 0,
                    color: "bg-destructive",
                    icon: <XCircle size={14} className="text-destructive" />,
                  },
                  {
                    label: "已取消",
                    count: historyStats?.by_status["cancelled"] || 0,
                    color: "bg-warning",
                    icon: <Clock size={14} className="text-warning" />,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.icon}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{item.label}</span>
                        <span className="text-sm font-medium">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", item.color)}
                          style={{
                            width: `${
                              historyStats?.total
                                ? (item.count / historyStats.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">平台分布</h3>
              <div className="space-y-3">
                {topPlatforms.length > 0 ? (
                  topPlatforms.map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {platformNames[platform] || platform}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">
                            {count} 个任务
                          </span>
                          <span className="text-sm font-medium">
                            {historyStats?.total
                              ? Math.round((count / historyStats.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${
                                historyStats?.total
                                  ? (count / historyStats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无数据
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mode distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">模式分布</h3>
              <div className="space-y-3">
                {topModes.length > 0 ? (
                  topModes.map(([mode, count]) => (
                    <div key={mode} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 truncate">
                        {modeNames[mode] || mode}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">
                            {count} 次
                          </span>
                          <span className="text-sm font-medium">
                            {historyStats?.total
                              ? Math.round((count / historyStats.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-foreground"
                            style={{
                              width: `${
                                historyStats?.total
                                  ? (count / historyStats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无数据
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current tasks breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">当前任务</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "等待中",
                    count: taskStats?.pending || 0,
                    icon: <Clock size={16} className="text-muted-foreground" />,
                  },
                  {
                    label: "运行中",
                    count: taskStats?.running || 0,
                    icon: (
                      <Download size={16} className="text-primary animate-pulse" />
                    ),
                  },
                  {
                    label: "已完成",
                    count: taskStats?.complete || 0,
                    icon: <CheckCircle2 size={16} className="text-success" />,
                  },
                  {
                    label: "失败",
                    count: taskStats?.failed || 0,
                    icon: <XCircle size={16} className="text-destructive" />,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50"
                  >
                    {item.icon}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-lg font-semibold">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty state */}
        {!loading && !historyStats && !taskStats && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BarChart3 size={24} />
            </div>
            <p className="text-sm">无法获取统计数据</p>
            <p className="text-xs mt-1">请确保后端服务正在运行</p>
          </div>
        )}
      </div>
    </div>
  );
}
