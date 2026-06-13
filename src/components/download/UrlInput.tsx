import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Link } from "lucide-react";

interface UrlInputProps {
  onStart: (params: { platform: string; mode: string; url: string }) => void;
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

export function UrlInput({ onStart, defaultPlatform = "douyin" }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setDetectedPlatform(detectPlatform(val));
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    const platform = detectedPlatform || defaultPlatform;
    onStart({ platform, mode: "one", url: url.trim() });
    setUrl("");
    setDetectedPlatform(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="粘贴链接... 自动识别平台"
            className="pl-9 h-10"
          />
        </div>
        <Button onClick={handleSubmit} disabled={!url.trim()} className="h-10 px-5">
          <Download size={16} />
          下载
        </Button>
      </div>

      {detectedPlatform && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">检测到平台：</span>
          <Badge variant="success">
            {platformPatterns[detectedPlatform]?.name || detectedPlatform}
          </Badge>
        </div>
      )}
    </div>
  );
}
