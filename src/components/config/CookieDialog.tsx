import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const browsers = [
  { id: "firefox", name: "Firefox", reliable: true },
  { id: "chrome", name: "Chrome", reliable: false },
  { id: "edge", name: "Edge", reliable: false },
  { id: "brave", name: "Brave", reliable: false },
  { id: "opera", name: "Opera", reliable: false },
  { id: "opera_gx", name: "Opera GX", reliable: false },
  { id: "vivaldi", name: "Vivaldi", reliable: false },
  { id: "librewolf", name: "LibreWolf", reliable: true },
  { id: "arc", name: "Arc", reliable: false },
];

const platformDomains: Record<string, string> = {
  douyin: ".douyin.com",
  tiktok: ".tiktok.com",
  twitter: ".x.com",
  weibo: ".weibo.com",
  bilibili: ".bilibili.com",
};

interface CookieDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (cookie: string) => void;
  platform: string;
}

export function CookieDialog({ open, onClose, onSave, platform }: CookieDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);
  const [result, setResult] = useState<{ browserId: string; success: boolean; cookie?: string; error?: string } | null>(null);

  if (!open) return null;

  const handleSelectBrowser = async (browserId: string) => {
    setSelectedBrowser(browserId);
    setLoading(true);
    setResult(null);
    try {
      const domain = platformDomains[platform] || "";
      const res = await fetch(
        `http://127.0.0.1:18224/api/cookie/${browserId}?domain=${encodeURIComponent(domain)}`
      );
      const data = await res.json();
      if (data.cookie) {
        setResult({ browserId, success: true, cookie: data.cookie });
      } else {
        setResult({ browserId, success: false, error: data.error || "未找到 Cookie" });
      }
    } catch {
      setResult({ browserId, success: false, error: "无法连接后端服务" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (result?.cookie) {
      onSave(result.cookie);
    }
    handleClose();
  };

  const handleClose = () => {
    setResult(null);
    setSelectedBrowser(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 + 模糊 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗 */}
      <div className="relative w-[360px] bg-white rounded-2xl shadow-mac-lg border border-border overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold">自动获取 Cookie</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            选择浏览器，自动读取 Cookie
          </p>
        </div>

        {/* 浏览器网格 */}
        <div className="px-5 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {browsers.map((b) => {
              const isSelected = selectedBrowser === b.id;
              const isLoading = isSelected && loading;
              const isSuccess = result?.browserId === b.id && result.success;
              const isError = result?.browserId === b.id && !result.success;

              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBrowser(b.id)}
                  disabled={loading}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs transition-mac",
                    isLoading
                      ? "border-primary bg-primary/5"
                      : isSuccess
                        ? "border-success bg-success/5"
                        : isError
                          ? "border-destructive bg-destructive/5"
                          : "border-border hover:border-primary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{b.name}</span>
                    {b.reliable && (
                      <span className="text-[9px] text-success font-medium">推荐</span>
                    )}
                  </div>

                  {/* 状态指示器 */}
                  {isLoading && (
                    <Loader2 size={12} className="animate-spin text-primary mt-1" />
                  )}
                  {isSuccess && (
                    <span className="w-1.5 h-1.5 rounded-full bg-success mt-1" />
                  )}
                  {isError && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 错误信息 */}
          {result && !result.success && result.error && (
            <p className="text-xs text-destructive mt-3 px-1">{result.error}</p>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/30">
          <Button variant="outline" size="sm" onClick={handleClose}>
            退出
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!result?.success}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
