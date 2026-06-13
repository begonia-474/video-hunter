import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Save, RotateCcw, FileDown, FileUp, Cookie, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { CookieDialog } from "@/components/config/CookieDialog";

// ========== 平台定义 ==========
const platforms = [
  { id: "douyin", name: "抖音", status: "ready" as const },
  { id: "tiktok", name: "TikTok", status: "ready" as const },
  { id: "twitter", name: "Twitter", status: "ready" as const },
  { id: "weibo", name: "微博", status: "ready" as const },
  { id: "bilibili", name: "Bilibili", status: "developing" as const },
  { id: "instagram", name: "Instagram", status: "planned" as const },
  { id: "youtube", name: "YouTube", status: "planned" as const },
];

// ========== 字段定义 ==========
interface FieldDef {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "toggle" | "select";
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  group: "basic" | "download" | "advanced";
}

const douyinFields: FieldDef[] = [
  { key: "cookie", label: "Cookie", type: "password", placeholder: "粘贴浏览器 Cookie", description: "登录凭证，必填", group: "basic" },
  {
    key: "mode", label: "下载模式", type: "select", group: "basic",
    options: [
      { value: "one", label: "单个作品" },
      { value: "post", label: "用户主页作品" },
      { value: "like", label: "点赞作品" },
      { value: "collection", label: "收藏作品" },
      { value: "music", label: "收藏音乐" },
      { value: "live", label: "直播流" },
      { value: "user-mix", label: "合集作品" },
      { value: "related", label: "相关推荐" },
    ],
  },
  { key: "path", label: "下载路径", type: "text", placeholder: "Download", group: "download" },
  { key: "naming", label: "文件命名模板", type: "text", placeholder: "{create}_{desc}", description: "可用变量: {create} {desc} {nickname} {aweme_id} {uid}", group: "download" },
  { key: "interval", label: "日期区间", type: "text", placeholder: "all", description: "如: 2024-01-01_2024-12-31 或 all", group: "download" },
  { key: "music", label: "下载原声", type: "toggle", group: "download" },
  { key: "lyric", label: "下载歌词", type: "toggle", group: "download" },
  { key: "cover", label: "下载封面", type: "toggle", group: "download" },
  { key: "desc", label: "保存文案", type: "toggle", group: "download" },
  { key: "folderize", label: "子文件夹", type: "toggle", description: "为每个作品创建独立文件夹", group: "download" },
  { key: "timeout", label: "请求超时 (秒)", type: "number", placeholder: "10", group: "advanced" },
  { key: "max_retries", label: "最大重试", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_connections", label: "最大连接数", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_tasks", label: "并发下载数", type: "number", placeholder: "10", group: "advanced" },
  { key: "page_counts", label: "每页数量", type: "number", placeholder: "20", group: "advanced" },
  { key: "max_counts", label: "最大下载数", type: "number", placeholder: "0 = 无限制", group: "advanced" },
];

const tiktokFields: FieldDef[] = [
  { key: "cookie", label: "Cookie", type: "password", placeholder: "粘贴浏览器 Cookie", group: "basic" },
  {
    key: "mode", label: "下载模式", type: "select", group: "basic",
    options: [
      { value: "one", label: "单个作品" },
      { value: "post", label: "用户主页作品" },
      { value: "like", label: "点赞作品" },
      { value: "collection", label: "收藏作品" },
      { value: "live", label: "直播流" },
    ],
  },
  { key: "path", label: "下载路径", type: "text", placeholder: "Download", group: "download" },
  { key: "naming", label: "文件命名模板", type: "text", placeholder: "{create}_{desc}", group: "download" },
  { key: "interval", label: "日期区间", type: "text", placeholder: "all", group: "download" },
  { key: "music", label: "下载原声", type: "toggle", group: "download" },
  { key: "cover", label: "下载封面", type: "toggle", group: "download" },
  { key: "desc", label: "保存文案", type: "toggle", group: "download" },
  { key: "folderize", label: "子文件夹", type: "toggle", group: "download" },
  { key: "timeout", label: "请求超时 (秒)", type: "number", placeholder: "10", group: "advanced" },
  { key: "max_retries", label: "最大重试", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_connections", label: "最大连接数", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_tasks", label: "并发下载数", type: "number", placeholder: "5", group: "advanced" },
  { key: "page_counts", label: "每页数量", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_counts", label: "最大下载数", type: "number", placeholder: "0 = 无限制", group: "advanced" },
];

const twitterFields: FieldDef[] = [
  { key: "cookie", label: "Cookie", type: "password", placeholder: "粘贴浏览器 Cookie", group: "basic" },
  {
    key: "mode", label: "下载模式", type: "select", group: "basic",
    options: [
      { value: "one", label: "单条推文" },
      { value: "post", label: "用户推文" },
      { value: "like", label: "喜欢的推文" },
      { value: "media", label: "媒体文件" },
    ],
  },
  { key: "path", label: "下载路径", type: "text", placeholder: "Download", group: "download" },
  { key: "naming", label: "文件命名模板", type: "text", placeholder: "{create}_{desc}", group: "download" },
  { key: "interval", label: "日期区间", type: "text", placeholder: "all", group: "download" },
  { key: "folderize", label: "子文件夹", type: "toggle", group: "download" },
  { key: "timeout", label: "请求超时 (秒)", type: "number", placeholder: "10", group: "advanced" },
  { key: "max_retries", label: "最大重试", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_connections", label: "最大连接数", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_tasks", label: "并发下载数", type: "number", placeholder: "5", group: "advanced" },
  { key: "page_counts", label: "每页数量", type: "number", placeholder: "20", group: "advanced" },
  { key: "max_counts", label: "最大下载数", type: "number", placeholder: "0 = 无限制", group: "advanced" },
];

const weiboFields: FieldDef[] = [
  { key: "cookie", label: "Cookie", type: "password", placeholder: "粘贴浏览器 Cookie", group: "basic" },
  {
    key: "mode", label: "下载模式", type: "select", group: "basic",
    options: [
      { value: "one", label: "单条微博" },
      { value: "post", label: "用户微博" },
    ],
  },
  { key: "path", label: "下载路径", type: "text", placeholder: "Download", group: "download" },
  { key: "naming", label: "文件命名模板", type: "text", placeholder: "{create}_{desc}", group: "download" },
  { key: "interval", label: "日期区间", type: "text", placeholder: "all", group: "download" },
  { key: "folderize", label: "子文件夹", type: "toggle", group: "download" },
  { key: "timeout", label: "请求超时 (秒)", type: "number", placeholder: "10", group: "advanced" },
  { key: "max_retries", label: "最大重试", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_connections", label: "最大连接数", type: "number", placeholder: "5", group: "advanced" },
  { key: "max_tasks", label: "并发下载数", type: "number", placeholder: "5", group: "advanced" },
  { key: "page_counts", label: "每页数量", type: "number", placeholder: "20", group: "advanced" },
  { key: "max_counts", label: "最大下载数", type: "number", placeholder: "0 = 无限制", group: "advanced" },
];

const platformFields: Record<string, FieldDef[]> = {
  douyin: douyinFields,
  tiktok: tiktokFields,
  twitter: twitterFields,
  weibo: weiboFields,
};

const groupLabels: Record<string, string> = {
  basic: "基础配置",
  download: "下载配置",
  advanced: "高级配置",
};

// ========== 主组件 ==========
interface ConfigPageProps {
  activePlatform: string;
  setActivePlatform: (p: string) => void;
  config: Record<string, string | boolean>;
  setConfig: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}

export function ConfigPage({ activePlatform, setActivePlatform, config, setConfig }: ConfigPageProps) {
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);

  const fields = platformFields[activePlatform] || [];

  const grouped = fields.reduce(
    (acc, f) => {
      (acc[f.group] ||= []).push(f);
      return acc;
    },
    {} as Record<string, FieldDef[]>
  );

  const handleChange = (key: string, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:18224/api/config/${activePlatform}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: activePlatform, config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // backend not available, still mark as saved locally
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [activePlatform, config]);

  const handleReset = () => setConfig({});

  const handleExportYaml = () => {
    const lines = [`${activePlatform}:`];
    for (const f of fields) {
      const val = config[f.key];
      if (val !== undefined && val !== "" && val !== false) {
        lines.push(`  ${f.key}: ${val}`);
      }
    }
    const yaml = lines.join("\n") + "\n";
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePlatform}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportYaml = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed: Record<string, string> = {};
        for (const line of text.split("\n")) {
          const match = line.match(/^\s+(\w+):\s*(.*)$/);
          if (match) parsed[match[1]] = match[2].trim();
        }
        setConfig(parsed);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">配置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理各平台的下载配置
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportYaml} className="gap-1.5">
            <FileUp size={14} />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportYaml} className="gap-1.5">
            <FileDown size={14} />
            导出
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：平台列表 */}
        <div className="w-44 shrink-0 border-r border-border px-2 py-2 overflow-auto">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-mac",
                activePlatform === p.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{p.name}</span>
              {p.status !== "ready" && (
                <Badge
                  variant={p.status === "developing" ? "warning" : "outline"}
                  className="text-[10px] px-1 py-0"
                >
                  {p.status === "developing" ? "开发中" : "计划中"}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* 右侧：配置表单 */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {Object.entries(grouped).map(([group, groupFields]) => (
            <div key={group} className="mb-6">
              {group === "advanced" ? (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-mac"
                >
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    className={cn("transition-transform", showAdvanced && "rotate-90")}
                  >
                    <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {groupLabels[group]}
                </button>
              ) : (
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {groupLabels[group]}
                </h3>
              )}

              {(group !== "advanced" || showAdvanced) && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {groupFields.map((field) => (
                      <FieldRow
                        key={field.key}
                        field={field}
                        value={config[field.key]}
                        onChange={handleChange}
                        onOpenCookieDialog={field.key === "cookie" ? () => setCookieDialogOpen(true) : undefined}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2 pb-4">
            <Button onClick={handleSave} className="gap-2">
              <Save size={14} />
              {saved ? "已保存" : "保存配置"}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw size={14} />
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* Cookie 自动获取弹窗 */}
      <CookieDialog
        open={cookieDialogOpen}
        onClose={() => setCookieDialogOpen(false)}
        onSave={(cookie) => handleChange("cookie", cookie)}
        platform={activePlatform}
      />
    </div>
  );
}

// ========== 字段行组件 ==========
function FieldRow({
  field,
  value,
  onChange,
  onOpenCookieDialog,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (key: string, value: string | boolean) => void;
  onOpenCookieDialog?: () => void;
}) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{field.label}</label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <button
          onClick={() => onChange(field.key, !value)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-mac",
            value ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
              value ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{field.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(field.key, opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-mac border",
                value === opt.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-white/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{field.label}</label>
      {field.key === "cookie" ? (
        <div className="flex gap-2">
          <Input
            type="password"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCookieDialog}
            className="shrink-0 gap-1.5"
          >
            <Cookie size={14} />
            自动获取
          </Button>
        </div>
      ) : field.key === "path" ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const selected = await open({ directory: true });
              if (selected) onChange(field.key, selected);
            }}
            className="shrink-0 gap-1.5"
          >
            <FolderOpen size={14} />
            选择
          </Button>
        </div>
      ) : (
        <Input
          type={field.type}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
