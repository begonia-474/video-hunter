import { useState } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar, type PageId } from "@/components/layout/Sidebar";
import { DownloadPage } from "@/pages/Download";
import { ConfigPage } from "@/pages/Config";
import { HistoryPage } from "@/pages/History";
import { cn } from "@/lib/utils";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("download");
  const [activePlatform, setActivePlatform] = useState("douyin");
  const [config, setConfig] = useState<Record<string, string | boolean>>({});

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
            />
          </div>
          <div className={cn("h-full", activePage !== "config" && "hidden")}>
            <ConfigPage
              activePlatform={activePlatform}
              setActivePlatform={setActivePlatform}
              config={config}
              setConfig={setConfig}
            />
          </div>
          <div className={cn("h-full", activePage !== "history" && "hidden")}>
            <HistoryPage />
          </div>
        </main>
      </div>
    </div>
  );
}
