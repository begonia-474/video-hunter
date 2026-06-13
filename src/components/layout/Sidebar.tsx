import {
  Download,
  Settings,
  History,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PageId = "download" | "config" | "history";

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "download", label: "下载", icon: Download },
  { id: "config", label: "配置", icon: Settings },
  { id: "history", label: "历史", icon: History },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-52 h-full glass border-r border-border shrink-0">
      <nav className="flex flex-col gap-0.5 px-2 pt-2">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-mac",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 底部版本信息 */}
      <div className="mt-auto px-3 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          f2 GUI v0.1.0
        </p>
      </div>
    </aside>
  );
}
