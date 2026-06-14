import { useState, useEffect, useCallback } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar, type PageId } from "@/components/layout/Sidebar";
import { DownloadPage } from "@/pages/Download";
import { ConfigPage } from "@/pages/Config";
import { HistoryPage } from "@/pages/History";
import { cn } from "@/lib/utils";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("download");
  const [activePlatform, setActivePlatform] = useState("douyin");
  const [configPlatform, setConfigPlatform] = useState("douyin");
  const [config, setConfig] = useState<Record<string, string | boolean>>({});
  const [wsConnected, setWsConnected] = useState(false);

  // 从后端加载指定平台的配置
  const loadConfig = useCallback(async (platform: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:18224/api/config/${platform}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config && typeof data.config === "object") {
          setConfig(data.config);
        }
      } else {
        // 平台没有配置，清空
        setConfig({});
      }
    } catch {
      setConfig({});
    }
  }, []);

  // WebSocket 连接成功后重新加载配置
  useEffect(() => {
    if (wsConnected) {
      loadConfig(activePlatform);
    }
  }, [wsConnected, activePlatform, loadConfig]);

  // 配置页切换平台时加载配置
  useEffect(() => {
    loadConfig(configPlatform);
  }, [configPlatform, loadConfig]);

  // 配置页的平台切换：同时更新 download 平台（排除 bark）
  const handleConfigPlatformChange = useCallback((platform: string) => {
    setConfigPlatform(platform);
    if (platform !== "bark") {
      setActivePlatform(platform);
    }
  }, []);

  // 进入配置页时，同步当前下载平台到配置平台（除非正在查看 bark）
  useEffect(() => {
    if (activePage === "config") {
      setConfigPlatform((prev) => prev === "bark" ? prev : activePlatform);
    }
  }, [activePage, activePlatform]);

  // 进入下载页时，重新加载当前平台的配置
  useEffect(() => {
    if (activePage === "download") {
      loadConfig(activePlatform);
    }
  }, [activePage, activePlatform, loadConfig]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden rounded-xl border border-border shadow-mac-lg bg-background">
      {/* 标题栏 */}
      <TitleBar />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        {/* 内容区 — 所有页面常驻挂载，隐藏非活跃页 */}
        <main className="flex-1 overflow-hidden">
          <div className={cn("h-full", activePage !== "download" && "hidden")}>
            <DownloadPage
              activePlatform={activePlatform}
              config={config}
              onConnected={setWsConnected}
            />
          </div>
          <div className={cn("h-full", activePage !== "config" && "hidden")}>
            <ConfigPage
              activePlatform={configPlatform}
              setActivePlatform={handleConfigPlatformChange}
              config={config}
              setConfig={setConfig}
            />
          </div>
          <div className={cn("h-full", activePage !== "history" && "hidden")}>
            <HistoryPage active={activePage === "history"} />
          </div>
        </main>
      </div>
    </div>
  );
}
