const API_BASE = "http://127.0.0.1:18224/api";

export interface Platform {
  id: string;
  name: string;
  icon: string;
  modes: { id: string; name: string; description: string }[];
  status: "ready" | "developing" | "planned";
}

export interface TaskMessage {
  type: "progress" | "complete" | "error" | "status";
  task_id: string;
  platform: string;
  mode: string;
  status: string;
  message?: string;
  current?: number;
  total?: number;
  files?: string[];
}

export interface AppConfig {
  [key: string]: unknown;
}

// REST API
export async function fetchPlatforms(): Promise<Platform[]> {
  const res = await fetch(`${API_BASE}/platforms`);
  return res.json();
}

export async function fetchConfig(platform: string): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config/${platform}`);
  return res.json();
}

export async function updateConfig(
  platform: string,
  config: AppConfig
): Promise<void> {
  await fetch(`${API_BASE}/config/${platform}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function fetchHistory(): Promise<
  { id: string; platform: string; url: string; title: string; date: string }[]
> {
  const res = await fetch(`${API_BASE}/history`);
  return res.json();
}

// WebSocket
let ws: WebSocket | null = null;
let wsCallbacks: ((msg: TaskMessage) => void)[] = [];

export function connectWebSocket(onMessage: (msg: TaskMessage) => void) {
  wsCallbacks.push(onMessage);

  if (ws && ws.readyState === WebSocket.OPEN) {
    return () => {
      wsCallbacks = wsCallbacks.filter((cb) => cb !== onMessage);
    };
  }

  ws = new WebSocket(`ws://127.0.0.1:18224/api/tasks`);

  ws.onmessage = (event) => {
    const msg: TaskMessage = JSON.parse(event.data);
    wsCallbacks.forEach((cb) => cb(msg));
  };

  ws.onclose = () => {
    setTimeout(() => {
      if (wsCallbacks.length > 0) {
        connectWebSocket(() => {});
      }
    }, 3000);
  };

  return () => {
    wsCallbacks = wsCallbacks.filter((cb) => cb !== onMessage);
    if (wsCallbacks.length === 0 && ws) {
      ws.close();
      ws = null;
    }
  };
}

export function sendTask(params: {
  platform: string;
  mode: string;
  url: string;
  options?: Record<string, unknown>;
}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "start", ...params }));
  }
}
