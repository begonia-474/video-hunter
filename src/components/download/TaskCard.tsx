import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { platformNames, modeNames, type Task } from "@/lib/constants";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  RotateCcw,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "destructive" | "warning";
    icon: React.ReactNode;
  }
> = {
  pending: { label: "等待中", variant: "secondary", icon: <Clock size={14} /> },
  running: {
    label: "下载中",
    variant: "default",
    icon: <Loader2 size={14} className="animate-spin" />,
  },
  complete: {
    label: "完成",
    variant: "success",
    icon: <CheckCircle2 size={14} />,
  },
  failed: {
    label: "失败",
    variant: "destructive",
    icon: <XCircle size={14} />,
  },
  cancelled: {
    label: "已取消",
    variant: "warning",
    icon: <X size={14} />,
  },
};

interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  showCheckbox?: boolean;
}

export function TaskCard({
  task,
  selected,
  onSelect,
  onCancel,
  onRetry,
  onRemove,
  showCheckbox,
}: TaskCardProps) {
  const status = statusConfig[task.status] || statusConfig.pending;
  const progress = task.total ? ((task.current || 0) / task.total) * 100 : 0;
  const canCancel = task.status === "running" || task.status === "pending";
  const canRetry = task.status === "failed";
  const canRemove =
    task.status === "complete" ||
    task.status === "failed" ||
    task.status === "cancelled";

  return (
    <Card
      className={cn(
        "transition-mac group",
        task.status === "running" && "ring-1 ring-primary/20",
        selected && "ring-2 ring-primary"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox for batch selection */}
          {showCheckbox && (
            <button
              onClick={() => onSelect?.(!selected)}
              className="mt-0.5 text-muted-foreground hover:text-foreground transition-mac"
            >
              {selected ? (
                <CheckSquare size={18} className="text-primary" />
              ) : (
                <Square size={18} />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                {platformNames[task.platform] || task.platform}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {modeNames[task.mode] || task.mode}
              </span>
              <Badge variant={status.variant} className="gap-1 text-[10px] px-1.5 py-0">
                {status.icon}
                {status.label}
              </Badge>
            </div>

            <p className="text-sm truncate text-foreground/80">{task.url}</p>

            {task.message && (
              <p
                className={cn(
                  "text-xs mt-1.5",
                  task.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {task.message}
              </p>
            )}

            {/* Progress bar for running tasks */}
            {task.status === "running" && task.total !== undefined && (
              <div className="mt-3">
                <Progress value={progress} className="h-1.5" />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {task.current || 0} / {task.total}
                  </span>
                  <span className="text-[11px] font-medium text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            )}

            {/* Completed files count */}
            {task.status === "complete" && task.files && task.files.length > 0 && (
              <p className="text-xs text-success mt-1.5">
                已下载 {task.files.length} 个文件
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-mac">
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onCancel}
                title="取消任务"
              >
                <X size={14} />
              </Button>
            )}
            {canRetry && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRetry}
                title="重试任务"
              >
                <RotateCcw size={14} />
              </Button>
            )}
            {canRemove && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                title="移除任务"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
