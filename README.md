# f2 GUI

[f2](https://github.com/Johnserf-Seed/f2) 的桌面 GUI 客户端，基于 Tauri + React + FastAPI 构建。

## 功能

- 多平台下载：抖音、TikTok、Twitter、微博等
- 自动识别平台链接
- 配置管理：Cookie、下载模式、命名规则、代理等
- 浏览器 Cookie 自动获取（Firefox、Chrome、Edge 等）
- 实时下载进度
- 下载历史记录

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + Tailwind CSS + shadcn/ui |
| 桌面壳 | Tauri v2 |
| 后端 | FastAPI + Python |
| 下载核心 | [f2](https://github.com/Johnserf-Seed/f2) |

## 开发

### 环境要求

- Node.js >= 18
- pnpm
- Rust (Tauri)
- Python >= 3.10 + conda 环境 `projects-python`

### 启动

```bash
# 安装前端依赖
pnpm install

# 启动 Python 后端
cd server
conda activate projects-python
python main.py

# 启动 Tauri 开发模式（另开终端）
pnpm tauri dev
```

### 构建

```bash
# 打包 Python 后端
cd server
pyinstaller --onefile --name f2-server main.py

# 构建 Tauri 应用
pnpm tauri build
```

## 项目结构

```
f2 gui/
├── src/              # React 前端
├── src-tauri/        # Tauri Rust 壳
├── server/           # FastAPI 后端
│   ├── api/routes/   # API 路由
│   ├── core/         # f2 服务封装
│   └── utils/        # 配置工具
└── package.json
```

## License

Apache-2.0
