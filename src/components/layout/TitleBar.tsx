export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex h-10 items-center justify-center select-none shrink-0"
    >
      <span className="text-xs font-medium text-muted-foreground pointer-events-none tracking-wide">
        f2 GUI
      </span>
    </div>
  );
}
