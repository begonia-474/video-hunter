export const platformNames: Record<string, string> = {
  douyin: "抖音",
  tiktok: "TikTok",
  twitter: "Twitter",
  bilibili: "Bilibili",
  youtube: "YouTube",
  instagram: "Instagram",
  weibo: "微博",
  bark: "Bark",
};

export const modeNames: Record<string, string> = {
  one: "单个作品",
  post: "用户主页",
  like: "点赞作品",
  collection: "收藏作品",
  collects: "收藏夹",
  music: "收藏音乐",
  mix: "合集",
  live: "直播录制",
  feed: "推荐流",
  related: "相关推荐",
  friend: "好友动态",
  collect: "收藏作品",
  search: "关键词搜索",
  bookmark: "书签推文",
};

export interface Task {
  task_id: string;
  platform: string;
  mode: string;
  url: string;
  status: string;
  message?: string;
  current?: number;
  total?: number;
  files?: string[];
}

// API types (from former api.ts, kept for future REST API encapsulation)
export interface Platform {
  id: string;
  name: string;
  icon: string;
  modes: { id: string; name: string; description: string }[];
  status: "ready" | "developing" | "planned";
}

export interface TaskMessage {
  type: "progress" | "complete" | "error" | "status";
  task_id: string;
  platform: string;
  mode: string;
  status: string;
  message?: string;
  current?: number;
  total?: number;
  files?: string[];
}

export interface AppConfig {
  [key: string]: unknown;
}
