import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Link } from "lucide-react";

interface UrlInputProps {
  onStart: (params: { platform: string; url: string }) => void;
  defaultPlatform?: string;
}

const platformPatterns: Record<string, { patterns: RegExp[]; name: string }> = {
  douyin: {
    patterns: [/douyin\.com/, /v\.douyin\.com/],
    name: "抖音",
  },
  tiktok: {
    patterns: [/tiktok\.com/],
    name: "TikTok",
  },
  twitter: {
    patterns: [/twitter\.com/, /x\.com/],
    name: "Twitter",
  },
  bilibili: {
    patterns: [/bilibili\.com/, /b23\.tv/],
    name: "Bilibili",
  },
  youtube: {
    patterns: [/youtube\.com/, /youtu\.be/],
    name: "YouTube",
  },
  instagram: {
    patterns: [/instagram\.com/],
    name: "Instagram",
  },
  weibo: {
    patterns: [/weibo\.com/, /weibo\.cn/],
    name: "微博",
  },
};

function detectPlatform(url: string): string | null {
  for (const [id, { patterns }] of Object.entries(platformPatterns)) {
    if (patterns.some((p) => p.test(url))) {
      return id;
    }
  }
  return null;
}

interface ParsedUrl {
  url: string;
  platform: string;
}

const MIN_HEIGHT = 40; // px, ~2.5rem
const MAX_HEIGHT = 144; // px, ~9rem

export function UrlInput({ onStart, defaultPlatform = "douyin" }: UrlInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${MIN_HEIGHT}px`;
    const next = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  const parsedUrls = useMemo((): ParsedUrl[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith("http"))
      .map((url) => ({
        url,
        platform: detectPlatform(url) || defaultPlatform,
      }));
  }, [text, defaultPlatform]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { platform } of parsedUrls) {
      const name = platformPatterns[platform]?.name || platform;
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [parsedUrls]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    requestAnimationFrame(adjustHeight);
  };

  const handleSubmit = () => {
    if (parsedUrls.length === 0) return;
    for (const { platform, url } of parsedUrls) {
      onStart({ platform, url });
    }
    setText("");
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      textareaRef.current.style.overflowY = "hidden";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={16}
            className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none"
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="粘贴链接，支持多个（每行一个）&#10;Ctrl/Cmd + Enter 下载"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-white/50 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-[inherit]"
            style={{ height: `${MIN_HEIGHT}px`, overflowY: "hidden" }}
          />
        </div>
        <Button onClick={handleSubmit} disabled={parsedUrls.length === 0} className="h-10 px-5 self-end">
          <Download size={16} />
          {parsedUrls.length > 1 ? `下载全部 (${parsedUrls.length})` : "下载"}
        </Button>
      </div>

      {parsedUrls.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            检测到 {parsedUrls.length} 个链接：
          </span>
          {Object.entries(platformCounts).map(([name, count]) => (
            <Badge key={name} variant="success" className="text-[11px]">
              {name}{count > 1 ? ` ×${count}` : ""}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
