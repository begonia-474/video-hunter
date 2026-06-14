import { useState, useMemo } from "react";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/constants";
import {
  CheckSquare,
  Square,
  Trash2,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onRemove?: (taskId: string) => void;
  onBatchCancel?: (taskIds: string[]) => void;
  onBatchRemove?: (taskIds: string[]) => void;
}

type StatusFilter = "all" | "running" | "pending" | "complete" | "failed" | "cancelled";

export function TaskList({
  tasks,
  onCancel,
  onRetry,
  onRemove,
  onBatchCancel,
  onBatchRemove,
}: TaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSelectMode, setShowSelectMode] = useState(false);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const selectedCount = selectedIds.size;
  const allSelected =
    filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.has(t.task_id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.task_id)));
    }
  };

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

  const handleBatchCancel = () => {
    onBatchCancel?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowSelectMode(false);
  };

  const handleBatchRemove = () => {
    onBatchRemove?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowSelectMode(false);
  };

  const statusFilters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "全部", count: tasks.length },
    {
      value: "running",
      label: "下载中",
      count: tasks.filter((t) => t.status === "running").length,
    },
    {
      value: "pending",
      label: "等待中",
      count: tasks.filter((t) => t.status === "pending").length,
    },
    {
      value: "complete",
      label: "已完成",
      count: tasks.filter((t) => t.status === "complete").length,
    },
    {
      value: "failed",
      label: "失败",
      count: tasks.filter((t) => t.status === "failed").length,
    },
  ];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <p className="text-sm">还没有下载任务</p>
        <p className="text-xs mt-1">粘贴链接开始下载</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-muted-foreground" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2 py-1 rounded-md text-xs transition-mac",
                statusFilter === f.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {f.label}
              {f.count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1 py-0"
                >
                  {f.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Batch actions */}
        <div className="flex items-center gap-2">
          {showSelectMode ? (
            <>
              <span className="text-xs text-muted-foreground">
                已选 {selectedCount} 项
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="h-7 gap-1 text-xs"
              >
                {allSelected ? (
                  <CheckSquare size={12} />
                ) : (
                  <Square size={12} />
                )}
                {allSelected ? "取消全选" : "全选"}
              </Button>
              {selectedCount > 0 && (
                <>
                  {onBatchCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchCancel}
                      className="h-7 gap-1 text-xs"
                    >
                      <X size={12} />
                      取消选中
                    </Button>
                  )}
                  {onBatchRemove && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchRemove}
                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 size={12} />
                      移除选中
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSelectMode(false);
                  setSelectedIds(new Set());
                }}
                className="h-7 text-xs"
              >
                取消
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSelectMode(true)}
              className="h-7 gap-1 text-xs"
            >
              <CheckSquare size={12} />
              批量操作
            </Button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.task_id}
            task={task}
            selected={selectedIds.has(task.task_id)}
            onSelect={(sel) => toggleSelect(task.task_id, sel)}
            onCancel={() => onCancel?.(task.task_id)}
            onRetry={() => onRetry?.(task.task_id)}
            onRemove={() => onRemove?.(task.task_id)}
            showCheckbox={showSelectMode}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && statusFilter !== "all" && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <p className="text-sm">没有 {statusFilter} 状态的任务</p>
        </div>
      )}
    </div>
  );
}
