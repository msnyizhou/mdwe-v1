---
title: MDwe 网站服务器使用说明
category: 使用教程
date: 2026-04-15
desc: MDwe 服务器的使用说明、功能概览和 API 接口说明
cover: https://picsum.photos/720/280
===

# MDwe 网站服务器

## 简介

MDwe (miniWEB) 是一个轻量级 Markdown 文档网站服务器。

- **零依赖** — 仅需 Python 3，无需数据库
- **开箱即用** — 下载解压，一条命令启动
- **在线编辑** — 自带浏览器端 Markdown 编辑器
- **多媒体封面** — 支持图片和 MP4 视频
- **深色模式** — 一键切换

## 快速启动

```bash
cd mdwe-server
python3 web_server.py
```

服务地址：`http://本机IP:80`

## 目录结构

```
web_root/
├── index.html       # 首页
├── read.html        # 阅读页
├── manager.html     # 桌面编辑器
├── imanager.html    # 移动端编辑器
├── header.html      # 页眉
├── footer.html      # 页脚
├── theme.css        # 主题样式
├── md/              # 文章目录（.md 文件放这里）
└── img/             # 图片目录（粘贴上传自动存入）
```

## 添加文章

推荐使用在线编辑器：

- 桌面端：`http://本机IP/manager.html`
- 手机端：`http://本机IP/imanager.html`

也可以直接往 `web_root/md/` 目录下放 `.md` 文件。

## 文章格式

```
---
title: 文章标题
category: 分类名称
date: 2026-03-19
desc: 简短描述（显示在首页卡片）
cover: 封面URL（可选，支持图片和MP4视频）
===

正文内容，标准 Markdown 格式...
```

**字段说明：**
- `title` — 文章主标题
- `category` — 分类（只能选一个，如：技术类、新闻类等）
- `date` — 发布日期
- `desc` — 首页卡片显示的简介
- `cover` — 封面（图片 URL 或 MP4 视频 URL，支持外链）

## 功能说明

| 页面 | 功能 |
|------|------|
| 首页 | 文章卡片列表，分类筛选，分页加载，深色模式 |
| 阅读页 | 完整渲染，推荐阅读，面包屑导航 |
| 桌面编辑器 | 三栏布局，实时预览，粘贴上传图片，交易日志模板 |
| 移动端编辑器 | 底部导航切换，编辑/预览切换，适配手机 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/list-md` | 获取 MD 文件列表 |
| POST | `/api/save-md` | 保存 MD 文件 |
| POST | `/api/delete-md` | 删除 MD 文件 |
| POST | `/api/upload-image` | 上传图片 |
| POST | `/api/fetch-cover` | 获取随机封面 |

## 关系图谱

文章内使用 `[[WikiLink]]` 语法建立文档间关联，访问 `manager.html` 或 `imanager.html` 点击「关系图谱」按钮，即可看到 3D 可视化节点图。

## 开源

https://github.com/msnyizhou/mdwe