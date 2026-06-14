import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { platformNames, type Task } from "@/lib/constants";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning"; icon: React.ReactNode }> = {
  pending: { label: "等待中", variant: "secondary", icon: <Clock size={14} /> },
  running: { label: "下载中", variant: "default", icon: <Loader2 size={14} className="animate-spin" /> },
  complete: { label: "完成", variant: "success", icon: <CheckCircle2 size={14} /> },
  failed: { label: "失败", variant: "destructive", icon: <XCircle size={14} /> },
};

export function TaskCard({ task }: { task: Task }) {
  const status = statusConfig[task.status] || statusConfig.pending;
  const progress = task.total ? ((task.current || 0) / task.total) * 100 : 0;

  return (
    <Card
      className={cn(
        "transition-mac",
        task.status === "running" && "ring-1 ring-primary/20"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                {platformNames[task.platform] || task.platform}
              </Badge>
              <span className="text-xs text-muted-foreground">{task.mode}</span>
            </div>
            <p className="text-sm truncate text-foreground/80">{task.url}</p>
            {task.message && (
              <p className="text-xs text-muted-foreground mt-1">{task.message}</p>
            )}
          </div>

          <Badge variant={status.variant} className="shrink-0 gap-1">
            {status.icon}
            {status.label}
          </Badge>
        </div>

        {task.status === "running" && task.total && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              {task.current || 0} / {task.total}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
