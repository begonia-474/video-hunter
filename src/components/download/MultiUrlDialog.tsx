import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Link, Check } from "lucide-react";

interface MultiUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}

export function MultiUrlDialog({ open, onClose, onConfirm }: MultiUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setUrls([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = () => {
    const trimmed = url.trim();
    if (trimmed && trimmed.startsWith("http") && !urls.includes(trimmed)) {
      setUrls((prev) => [...prev, trimmed]);
      setUrl("");
      inputRef.current?.focus();
    }
  };

  const handleRemove = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleConfirm = () => {
    if (urls.length > 0) {
      onConfirm(urls);
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    const lines = pasted
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("http"));
    if (lines.length > 1) {
      e.preventDefault();
      setUrls((prev) => {
        const newUrls = [...prev];
        for (const line of lines) {
          if (!newUrls.includes(line)) {
            newUrls.push(line);
          }
        }
        return newUrls;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-[480px] max-h-[80vh] bg-white rounded-2xl shadow-mac-lg border border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold">批量添加链接</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            逐条添加或粘贴多个链接，确定后批量下载
          </p>
        </div>

        {/* Input area */}
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="输入链接，按 Enter 添加"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={!url.trim().startsWith("http")}
              className="shrink-0 gap-1"
            >
              <Plus size={14} />
              添加
            </Button>
          </div>
        </div>

        {/* URL list */}
        <div className="flex-1 overflow-auto px-5 pb-3 min-h-[120px] max-h-[300px]">
          {urls.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-xs">暂无链接，请添加</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {urls.map((u, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 group"
                >
                  <span className="text-xs font-mono text-muted-foreground w-5">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{u}</span>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-mac"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-secondary/30">
          <span className="text-xs text-muted-foreground">
            {urls.length > 0 ? `已添加 ${urls.length} 个链接` : "支持批量粘贴"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={urls.length === 0}
              className="gap-1.5"
            >
              <Check size={14} />
              确定下载
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
