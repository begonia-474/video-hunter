import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Save,
  RotateCcw,
  FileDown,
  FileUp,
  Cookie,
  FolderOpen,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Info,
  Copy,
  BookTemplate,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { CookieDialog } from "@/components/config/CookieDialog";

// ========== Types ==========
interface FieldDef {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "toggle" | "select";
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  group: "basic" | "download" | "network" | "advanced";
  required?: boolean;
  validate?: (value: string | boolean) => string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

// ========== Platform definitions ==========
const platforms = [
  { id: "douyin", name: "抖音", status: "ready" as const },
  { id: "tiktok", name: "TikTok", status: "ready" as const },
  { id: "twitter", name: "Twitter", status: "ready" as const },
  { id: "weibo", name: "微博", status: "ready" as const },
  { id: "bilibili", name: "Bilibili", status: "developing" as const },
  { id: "instagram", name: "Instagram", status: "planned" as const },
  { id: "youtube", name: "YouTube", status: "planned" as const },
];

// ========== Config templates ==========
const configTemplates: Record<string, { name: string; config: Record<string, string | boolean> }[]> = {
  douyin: [
    {
      name: "快速下载",
      config: {
        mode: "one",
        max_connections: "10",
        max_tasks: "10",
        skip_existing: true,
      },
    },
    {
      name: "用户全部作品",
      config: {
        mode: "post",
        page_counts: "50",
        max_counts: "0",
        folderize: true,
        skip_existing: true,
      },
    },
    {
      name: "日期区间下载",
      config: {
        mode: "post",
        interval: "2024-01-01|2024-12-31",
        folderize: true,
        skip_existing: true,
      },
    },
  ],
  twitter: [
    {
      name: "用户推文",
      config: {
        mode: "post",
        page_counts: "50",
        skip_existing: true,
      },
    },
    {
      name: "书签推文",
      config: {
        mode: "bookmark",
        skip_existing: true,
      },
    },
  ],
  weibo: [
    {
      name: "用户微博",
      config: {
        mode: "post",
        page_counts: "50",
        skip_existing: true,
      },
    },
  ],
};

// ========== Field factory ==========
function makeFields(
  modeOptions: { value: string; label: string }[],
  exclude: string[] = []
): FieldDef[] {
  const basics: FieldDef[] = [
    {
      key: "cookie",
      label: "Cookie",
      type: "password",
      placeholder: "粘贴浏览器 Cookie",
      description: "登录凭证，必填",
      group: "basic",
      required: true,
      validate: (v) => {
        if (!v || (typeof v === "string" && v.length < 10)) {
          return "请输入有效的 Cookie";
        }
        return null;
      },
    },
    {
      key: "mode",
      label: "下载模式",
      type: "select",
      group: "basic",
      required: true,
      options: modeOptions,
    },
  ];
  const allToggles: FieldDef[] = [
    { key: "music", label: "下载原声", type: "toggle", group: "download" },
    { key: "lyric", label: "下载歌词", type: "toggle", group: "download" },
    { key: "cover", label: "下载封面", type: "toggle", group: "download" },
    { key: "desc", label: "保存文案", type: "toggle", group: "download" },
  ];
  const download: FieldDef[] = [
    {
      key: "path",
      label: "下载路径",
      type: "text",
      placeholder: "Download",
      group: "download",
    },
    {
      key: "naming",
      label: "文件命名模板",
      type: "text",
      placeholder: "{create}_{desc}",
      description: "可用变量: {create} {desc} {nickname} {aweme_id} {uid}",
      group: "download",
    },
    {
      key: "interval",
      label: "日期区间",
      type: "text",
      placeholder: "all",
      description: "如: 2024-01-01|2024-12-31 或 all",
      group: "download",
      validate: (v) => {
        if (v && typeof v === "string" && v !== "all") {
          const parts = v.split("|");
          if (parts.length !== 2) {
            return '格式应为: 开始日期|结束日期 或 all';
          }
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(parts[0]) || !dateRegex.test(parts[1])) {
            return '日期格式应为: YYYY-MM-DD';
          }
        }
        return null;
      },
    },
    ...allToggles.filter((f) => !exclude.includes(f.key)),
    {
      key: "folderize",
      label: "子文件夹",
      type: "toggle",
      description: "为每个作品创建独立文件夹",
      group: "download",
    },
    {
      key: "skip_existing",
      label: "跳过已下载",
      type: "toggle",
      description: "已存在的文件不再重复下载",
      group: "download",
    },
  ];
  const advanced: FieldDef[] = [
    {
      key: "timeout",
      label: "请求超时 (秒)",
      type: "number",
      placeholder: "10",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 1) {
            return "请输入大于 0 的数字";
          }
        }
        return null;
      },
    },
    {
      key: "max_retries",
      label: "最大重试",
      type: "number",
      placeholder: "5",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 0) {
            return "请输入大于等于 0 的数字";
          }
        }
        return null;
      },
    },
    {
      key: "max_connections",
      label: "最大连接数",
      type: "number",
      placeholder: "5",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 1 || num > 50) {
            return "请输入 1-50 之间的数字";
          }
        }
        return null;
      },
    },
    {
      key: "max_tasks",
      label: "并发下载数",
      type: "number",
      placeholder: "5",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 1 || num > 20) {
            return "请输入 1-20 之间的数字";
          }
        }
        return null;
      },
    },
    {
      key: "page_counts",
      label: "每页数量",
      type: "number",
      placeholder: "20",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 1) {
            return "请输入大于 0 的数字";
          }
        }
        return null;
      },
    },
    {
      key: "max_counts",
      label: "最大下载数",
      type: "number",
      placeholder: "0 = 无限制",
      group: "advanced",
      validate: (v) => {
        if (v && typeof v === "string") {
          const num = parseInt(v);
          if (isNaN(num) || num < 0) {
            return "请输入大于等于 0 的数字";
          }
        }
        return null;
      },
    },
  ];
  const network: FieldDef[] = [
    {
      key: "proxies.http",
      label: "HTTP 代理",
      type: "text",
      placeholder: "留空则不使用代理",
      group: "network",
      validate: (v) => {
        if (v && typeof v === "string" && !v.startsWith("http")) {
          return '代理地址应以 http:// 或 https:// 开头';
        }
        return null;
      },
    },
    {
      key: "proxies.https",
      label: "HTTPS 代理",
      type: "text",
      placeholder: "留空则不使用代理",
      group: "network",
      validate: (v) => {
        if (v && typeof v === "string" && !v.startsWith("http")) {
          return '代理地址应以 http:// 或 https:// 开头';
        }
        return null;
      },
    },
  ];
  return [...basics, ...download, ...advanced, ...network];
}

const platformFields: Record<string, FieldDef[]> = {
  douyin: makeFields([
    { value: "one", label: "单个作品" },
    { value: "post", label: "用户主页作品" },
    { value: "like", label: "点赞作品" },
    { value: "collection", label: "收藏作品" },
    { value: "collects", label: "收藏夹" },
    { value: "music", label: "收藏音乐" },
    { value: "mix", label: "合集作品" },
    { value: "live", label: "直播录制" },
    { value: "feed", label: "推荐流" },
    { value: "related", label: "相关推荐" },
    { value: "friend", label: "好友动态" },
  ]),
  tiktok: makeFields([
    { value: "one", label: "单个作品" },
    { value: "post", label: "用户主页作品" },
    { value: "like", label: "点赞作品" },
    { value: "collect", label: "收藏作品" },
    { value: "mix", label: "合集作品" },
    { value: "search", label: "关键词搜索" },
    { value: "live", label: "直播录制" },
  ]),
  twitter: makeFields(
    [
      { value: "one", label: "单条推文" },
      { value: "post", label: "用户推文" },
      { value: "like", label: "喜欢的推文" },
      { value: "bookmark", label: "书签推文" },
    ],
    ["music", "cover", "desc"]
  ),
  weibo: makeFields(
    [
      { value: "one", label: "单条微博" },
      { value: "post", label: "用户微博" },
    ],
    ["music", "cover", "desc"]
  ),
};

const barkFields: FieldDef[] = [
  {
    key: "enable_bark",
    label: "启用推送通知",
    type: "toggle",
    description: "下载完成后发送 iOS 推送通知",
    group: "basic",
  },
  {
    key: "key",
    label: "Bark Key",
    type: "text",
    placeholder: "输入 Bark App 中的 Key",
    group: "basic",
    required: true,
    validate: (v) => {
      const enabled = true; // TODO: check enable_bark
      if (enabled && (!v || (typeof v === "string" && v.length < 5))) {
        return "请输入有效的 Bark Key";
      }
      return null;
    },
  },
  {
    key: "token",
    label: "设备 Token",
    type: "text",
    placeholder: "可选，用于指定设备",
    group: "basic",
  },
  {
    key: "sound",
    label: "铃声",
    type: "text",
    placeholder: "birdsong",
    description: "铃声名称，参考 Bark App",
    group: "basic",
  },
  {
    key: "volume",
    label: "音量",
    type: "number",
    placeholder: "5",
    group: "basic",
    validate: (v) => {
      if (v && typeof v === "string") {
        const num = parseInt(v);
        if (isNaN(num) || num < 0 || num > 10) {
          return "请输入 0-10 之间的数字";
        }
      }
      return null;
    },
  },
  {
    key: "group",
    label: "通知分组",
    type: "text",
    placeholder: "Video Hunter 下载统计",
    group: "basic",
  },
  {
    key: "url",
    label: "点击跳转",
    type: "text",
    placeholder: "https://f2.wiki/",
    group: "basic",
    validate: (v) => {
      if (v && typeof v === "string" && !v.startsWith("http")) {
        return 'URL 应以 http:// 或 https:// 开头';
      }
      return null;
    },
  },
];

const groupLabels: Record<string, string> = {
  basic: "基础配置",
  download: "下载配置",
  network: "网络配置",
  advanced: "高级配置",
};

// ========== Main component ==========
interface ConfigPageProps {
  activePlatform: string;
  setActivePlatform: (p: string) => void;
  config: Record<string, string | boolean>;
  setConfig: React.Dispatch<
    React.SetStateAction<Record<string, string | boolean>>
  >;
}

export function ConfigPage({
  activePlatform,
  setActivePlatform,
  config,
  setConfig,
}: ConfigPageProps) {
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const fields =
    activePlatform === "bark"
      ? barkFields
      : platformFields[activePlatform] || [];

  const grouped = fields.reduce(
    (acc, f) => {
      (acc[f.group] ||= []).push(f);
      return acc;
    },
    {} as Record<string, FieldDef[]>
  );

  // Validate config
  const validateConfig = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];
    for (const field of fields) {
      if (field.validate) {
        const error = field.validate(config[field.key]);
        if (error) {
          errors.push({ field: field.key, message: error });
        }
      }
      if (field.required && !config[field.key]) {
        errors.push({
          field: field.key,
          message: `${field.label} 是必填项`,
        });
      }
    }
    return errors;
  }, [fields, config]);

  // Update validation on config change
  useEffect(() => {
    const errors = validateConfig();
    setValidationErrors(errors);
  }, [config, validateConfig]);

  const handleChange = (key: string, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setHasChanges(true);
  };

  const handleSave = useCallback(async () => {
    const errors = validateConfig();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:18224/api/config/${activePlatform}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: activePlatform, config }),
        }
      );
      if (res.ok) {
        setSaved(true);
        setHasChanges(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [activePlatform, config, validateConfig]);

  const handleReset = () => {
    setConfig({});
    setHasChanges(true);
  };

  const handleApplyTemplate = (template: Record<string, string | boolean>) => {
    setConfig((prev) => ({ ...prev, ...template }));
    setHasChanges(true);
    setShowTemplates(false);
  };

  const handleExportYaml = () => {
    const lines = [`${activePlatform}:`];
    for (const f of fields) {
      const val = config[f.key];
      if (val !== undefined && val !== "" && val !== false) {
        lines.push(`  ${f.key}: ${val}`);
      }
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/yaml" });
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
        setHasChanges(true);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Generate preview YAML
  const previewYaml = useMemo(() => {
    const lines: string[] = [`${activePlatform}:`];
    for (const f of fields) {
      const val = config[f.key];
      if (val !== undefined && val !== "" && val !== false) {
        lines.push(`  ${f.key}: ${val}`);
      }
    }
    return lines.join("\n");
  }, [activePlatform, fields, config]);

  // Get error for a field
  const getFieldError = (key: string): string | null => {
    const error = validationErrors.find((e) => e.field === key);
    return error?.message || null;
  };

  const templates = configTemplates[activePlatform] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">配置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理各平台的下载配置
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="gap-1.5"
            >
              <BookTemplate size={14} /> 模板
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1.5"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? "隐藏" : "预览"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportYaml}
            className="gap-1.5"
          >
            <FileUp size={14} /> 导入
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportYaml}
            className="gap-1.5"
          >
            <FileDown size={14} /> 导出
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Platform list */}
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
          <div className="my-2 border-t border-border" />
          <button
            onClick={() => setActivePlatform("bark")}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-mac",
              activePlatform === "bark"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span>通知</span>
          </button>
        </div>

        {/* Right: Config form */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Templates dropdown */}
          {showTemplates && templates.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">配置模板</h3>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTemplate(t.config)}
                      className="gap-1.5"
                    >
                      <Copy size={12} />
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation errors banner */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle size={14} />
                <span className="text-sm font-medium">
                  配置有 {validationErrors.length} 个错误
                </span>
              </div>
              <ul className="mt-1.5 text-xs text-destructive/80 list-disc list-inside">
                {validationErrors.map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Change indicator */}
          {hasChanges && (
            <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 text-warning">
                <Info size={14} />
                <span className="text-sm">配置已修改，请记得保存</span>
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([group, groupFields]) => {
            const collapsible =
              group === "advanced" || group === "network";
            const expanded =
              group === "advanced"
                ? showAdvanced
                : group === "network"
                  ? showNetwork
                  : true;
            const toggle =
              group === "advanced"
                ? () => setShowAdvanced(!showAdvanced)
                : group === "network"
                  ? () => setShowNetwork(!showNetwork)
                  : undefined;
            return (
              <div key={group} className="mb-6">
                {collapsible ? (
                  <button
                    onClick={toggle}
                    className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-mac"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      className={cn(
                        "transition-transform",
                        expanded && "rotate-90"
                      )}
                    >
                      <path
                        d="M4 2l4 4-4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    {groupLabels[group]}
                  </button>
                ) : (
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {groupLabels[group]}
                  </h3>
                )}
                {expanded && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {groupFields.map((field) => (
                        <FieldRow
                          key={field.key}
                          field={field}
                          value={config[field.key]}
                          onChange={handleChange}
                          error={getFieldError(field.key)}
                          onOpenCookieDialog={
                            field.key === "cookie"
                              ? () => setCookieDialogOpen(true)
                              : undefined
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}

          {/* Preview */}
          {showPreview && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  配置预览
                </h3>
                <pre className="p-3 rounded-lg bg-foreground/5 text-foreground text-xs font-mono overflow-auto">
                  {previewYaml}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-2 pb-4">
            <Button
              onClick={handleSave}
              disabled={validationErrors.length > 0}
              className="gap-2"
            >
              {saved ? (
                <CheckCircle2 size={14} />
              ) : (
                <Save size={14} />
              )}
              {saved ? "已保存" : "保存配置"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw size={14} /> 重置
            </Button>
          </div>
        </div>
      </div>

      <CookieDialog
        open={cookieDialogOpen}
        onClose={() => setCookieDialogOpen(false)}
        onSave={(cookie) => handleChange("cookie", cookie)}
        platform={activePlatform}
      />
    </div>
  );
}

// ========== Field row component ==========
function FieldRow({
  field,
  value,
  onChange,
  error,
  onOpenCookieDialog,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (key: string, value: string | boolean) => void;
  error?: string | null;
  onOpenCookieDialog?: () => void;
}) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">
            {field.label}
            {field.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          {field.description && (
            <p className="text-xs text-muted-foreground">
              {field.description}
            </p>
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
        <label className="text-sm font-medium">
          {field.label}
          {field.required && (
            <span className="text-destructive ml-0.5">*</span>
          )}
        </label>
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
      <label className="text-sm font-medium">
        {field.label}
        {field.required && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </label>
      {field.key === "cookie" ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="password"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={cn(error && "border-destructive")}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCookieDialog}
            className="shrink-0 gap-1.5"
          >
            <Cookie size={14} /> 自动获取
          </Button>
        </div>
      ) : field.key === "path" ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={cn("flex-1", error && "border-destructive")}
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
            <FolderOpen size={14} /> 选择
          </Button>
        </div>
      ) : (
        <Input
          type={field.type}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && "border-destructive")}
        />
      )}
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle size={10} />
          {error}
        </p>
      ) : (
        field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )
      )}
    </div>
  );
}
