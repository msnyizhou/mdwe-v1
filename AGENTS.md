# AGENTS.md — AI 开发助手使用指南

> 本文件供 AI 助手阅读，帮助其理解项目结构、开发规范和操作规则。

---

## 项目概述

**mdwe (miniWEB)** 是一个轻量级 Markdown 文档网站服务器，支持多模板、分类浏览和在线编辑。

**技术栈：** Python 3 + HTML5 + CSS3 + JavaScript（Three.js 关系图谱）

---

## 文件夹结构说明

```
MDWE-V1/
├── src/                    # 【唯一代码区】— 所有代码必须在此目录
│   ├── web_server.py       # HTTP 服务器（端口 80，Python 标准库）
│   ├── system/             # system 系统级别环境变量
|   |   └──config.json      # 系统级别全局环境变量配置文件，直接读入内存，修改后直存储。
│   └── web_root/           # 前端文件（HTML + 同名 CSS/JS 分离）
│       ├── index.html      # 首页：文章卡片、分类筛选、分页
│       ├── index.css       # 首页样式（分类标签、全屏横幅、毛玻璃）
│       ├── index.js        # 首页逻辑（列表加载、分类切换、深色模式）
│       ├── read.html       # 阅读页：Markdown 渲染、推荐阅读
│       ├── read.css        # 阅读页样式（文章排版、表格、封面）
│       ├── read.js         # 阅读页逻辑（内容加载、推荐、深色模式）
│       ├── manager.html    # 桌面端编辑器：三栏拖拽 + 关系图谱
│       ├── manager.css     # 桌面编辑器样式
│       ├── manager.js      # 桌面编辑器逻辑（编辑、图谱、上传）
│       ├── imanager.html   # 移动端编辑器：底部导航 + 关系图谱
│       ├── imanager.css    # 移动端编辑器样式
│       ├── imanager.js     # 移动端编辑器逻辑
│       ├── theme.css       # 全局主题样式（CSS 变量、深色模式）
│       ├── header.html     # 页眉组件（Logo + 导航 + 主题切换）
│       ├── footer.html     # 页脚组件（导航链接 + 版权）
│       ├── marked.min.js   # 本地化：Markdown 渲染库
│       ├── three.min.js    # 本地化：3D 引擎（关系图谱）
│       ├── OrbitControls.js# 本地化：Three.js 轨道控制器
|       ├── setweb.html     # 设置系统全局环境变量配置文件的工具、站点名称、logo、标语、菜单、首页的首屏视频路径，调用的模板路径。
│       ├── md/             # Markdown 文档存储（31 篇）
│       └── img/            # 图片资源（40 个，含上传图片）

├── docs/                   # 【产品文档区】— PRD、需求迭代、关键决策
│   ├── PRD.md              # 产品需求文档
│   └── 迭代记录与决策.md    # 迭代记录 & 关键决策
│
├── assets/                 # 【静态资源】— 设计素材/截图/参考
│   ├── design/             # 设计素材（logo.svg 等）
│   ├── bug/                # 测试报错截图
│   └── reference/          # 参考图、灵感收集（235938.png 等）
│
├── notes/                  # 【学习笔记】— 踩坑记录、技术方案
│
├── AGENTS.md               # 本文件（AI 助手使用说明）
└── README.md               # 项目简要说明
```

---

## 开发规范

### 1. 代码区规则 (`src/`)

- **所有代码必须放在 `src/`** — 根目录不放置代码文件
- **HTML/CSS/JS 同名分离** — 每个 HTML 对应 `同名.css` + `同名.js`，不写内联脚本/样式
- **不引用外部 CDN JS** — marked、three.js 等已本地化到 `src/web_root/`
- **Font Awesome 保留 CDN** — 图标库本地化体积过大
- **禁止引用外部绝对路径** — 使用相对路径

### 2. 文档区规则 (`docs/`)

- 所有产品需求、迭代记录、技术方案放 `docs/`
- 关键决策记录含：时间、决策内容、原因、后果

### 3. 资源管理 (`assets/`)

- 设计稿/UI 效果图 → `assets/design/`
- Bug 截图 → `assets/bug/`
- 参考图片/灵感 → `assets/reference/`

### 4. 笔记区规则 (`notes/`)

- 开发踩坑记录、技术方案总结放 `notes/`
- 命名：`问题描述-日期.md`

### 5. 文件清理规则

- **不移除工作版本** — `src/web_root/` 只保留当前使用的文件
- **旧版本删除原则** — 带日期后缀的测试文件（ograph/video/x 等）已清理

---

## 页面功能对照

| 文件 | 功能 | 特点 |
|------|------|------|
| index.html | 首页 | 文章卡片列 + 分类筛选 + 分页 + 动画横幅 + 深色模式 |
| read.html | 阅读页 | Markdown 渲染 + 推荐阅读 + 面包屑 + 封面展示 |
| manager.html | 桌面编辑器 | 三栏拖拽 + 工具栏 + 粘贴上传 + 交易日志 + 关系图谱 |
| imanager.html | 移动端编辑器 | 底部导航 + 编辑/预览切换 + 交易日志 + 关系图谱 |

---

## 常见命令

```bash
# 启动服务
cd src && python3 web_server.py
# 或
bash src/start_web.sh

# 提交代码
git add .
git commit -m "描述"
git push origin main

# 使用代理推送
git config --global http.proxy http://192.168.1.8:3564
git push origin main
```

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/list-md` | 获取 MD 文件列表 |
| GET | `/md-files.json` | 同上（兼容旧版） |
| POST | `/api/save-md` | 保存 MD 文件 |
| POST | `/api/delete-md` | 删除 MD 文件 |
| POST | `/api/upload-image` | 上传图片（粘贴上传） |
| POST | `/api/fetch-cover` | 获取随机封面（picsum.photos） |

---

## 文章格式

```markdown
---
title: 文章标题
category: 分类名称
date: 2026-03-19
desc: 简短描述
cover: 封面URL（可选图片或MP4）
===

正文内容...
```

---

## 关系图谱说明

- 使用 Three.js 3D 渲染，分类（大球体）+ 文档（小粒子点）
- `[[WikiLink]]` 语法建立文档间关联
- 桌面端：左侧栏「关系图谱」按钮
- 移动端：底部导航「图谱」按钮
- 支持拖拽移动节点、鼠标悬停高亮

---

## 注意事项

1. **大文件** — PDF/视频等使用 Git LFS 管理（已配置 `.gitattributes`）
2. **代理推送** — 如需代理 `git config --global http.proxy http://192.168.1.8:3564`
3. **Git LFS** — 已追踪类型：pdf, epub, mp4, mov, jpg, png, webp, sh, jpeg