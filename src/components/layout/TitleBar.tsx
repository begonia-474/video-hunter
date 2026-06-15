import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 items-center justify-between select-none shrink-0"
    >
      <span className="text-xs font-medium text-muted-foreground pointer-events-none tracking-wide pl-4">
        Video Hunter
      </span>

      <div className="flex h-full">
        <button
          onClick={() => appWindow.minimize()}
          className="inline-flex items-center justify-center w-12 h-full text-muted-foreground hover:bg-secondary transition-mac"
          title="最小化"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="inline-flex items-center justify-center w-12 h-full text-muted-foreground hover:bg-secondary transition-mac"
          title="最大化"
        >
          <Square size={13} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="inline-flex items-center justify-center w-12 h-full text-muted-foreground hover:bg-destructive hover:text-white transition-mac"
          title="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
