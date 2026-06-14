import { useState, useEffect, useRef, useCallback } from "react";
import { UrlInput } from "@/components/download/UrlInput";
import { TaskList } from "@/components/download/TaskList";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/constants";
import { Terminal, ChevronUp, ChevronDown } from "lucide-react";

interface LogEntry {
  time: string;
  type: "info" | "send" | "recv" | "error";
  text: string;
}

export function DownloadPage({ activePlatform, config }: { activePlatform: string; config: Record<string, string | boolean> }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], text: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((prev) => [...prev.slice(-200), { time, type, text }]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    addLog("info", "正在连接后端服务...");
    const ws = new WebSocket("ws://127.0.0.1:18224/api/tasks");

    ws.onopen = () => {
      setConnected(true);
      addLog("info", "已连接到后端服务");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        addLog("recv", JSON.stringify(msg));

        if (msg.type === "task_list") {
          setTasks(msg.tasks);
        } else if (msg.type === "task_update") {
          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.task_id === msg.task.task_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = msg.task;
              return next;
            }
            return [msg.task, ...prev];
          });
        }
      } catch {
        addLog("error", `解析消息失败: ${event.data}`);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      addLog("info", "连接断开，3秒后重连...");
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      addLog("error", "WebSocket 连接错误");
      ws.close();
    };

    wsRef.current = ws;
  }, [addLog]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = (params: {
    platform: string;
    url: string;
  }) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      addLog("error", "未连接到后端服务，无法发送任务");
      return;
    }

    const mode = (typeof config.mode === "string" && config.mode) || "one";

    const msg = {
      action: "start",
      platform: params.platform,
      mode,
      url: params.url,
      options: {
        cookie: config.cookie || "",
        path: config.path || "Download",
        naming: config.naming || "{create}_{desc}",
        interval: config.interval || "all",
        timeout: config.timeout || 10,
        max_retries: config.max_retries || 5,
        max_connections: config.max_connections || 5,
        max_tasks: config.max_tasks || 5,
        page_counts: config.page_counts || 20,
        max_counts: config.max_counts || 0,
        folderize: config.folderize || false,
        music: config.music || false,
        lyric: config.lyric || false,
        cover: config.cover || false,
        desc: config.desc || false,
        skip_existing: config.skip_existing || false,
        "proxies.http": config["proxies.http"] || "",
        "proxies.https": config["proxies.https"] || "",
      },
    };

    addLog("send", JSON.stringify(msg, null, 2));
    wsRef.current.send(JSON.stringify(msg));
  };

  const levelColors: Record<string, string> = {
    info: "text-muted-foreground",
    send: "text-primary",
    recv: "text-success",
    error: "text-destructive",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">下载</h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入链接，自动识别平台并下载
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? "已连接" : "未连接"}
          </span>
        </div>
      </div>

      <div className="px-6 pb-4 shrink-0">
        <UrlInput onStart={handleStart} defaultPlatform={activePlatform} />
      </div>

      <div className="flex-1 overflow-auto px-6 pb-2">
        <TaskList tasks={tasks} />
      </div>

      {/* 日志面板 */}
      <div className="shrink-0 border-t border-border">
        <button
          onClick={() => setLogOpen(!logOpen)}
          className="flex items-center gap-2 w-full px-6 py-2 text-xs text-muted-foreground hover:text-foreground transition-mac"
        >
          <Terminal size={12} />
          <span className="font-medium">运行日志</span>
          <span className="text-[10px]">({logs.length})</span>
          <div className="ml-auto">
            {logOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </div>
        </button>

        {logOpen && (
          <div className="h-40 overflow-auto px-6 pb-3 bg-[#1e1e1e] font-mono text-[11px] leading-relaxed">
            {logs.length === 0 ? (
              <p className="text-gray-500 py-2">暂无日志</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={cn("whitespace-pre-wrap break-all", levelColors[log.type])}>
                  <span className="text-gray-600">[{log.time}] </span>
                  <span className="text-gray-500">[{log.type}] </span>
                  {log.text}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
