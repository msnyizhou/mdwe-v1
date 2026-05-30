# MDwe (miniWEB)

轻量级 Markdown 文档网站服务器，零依赖、文件系统存储、开箱即用。

## ✨ 一键安装

复制下方命令到终端执行即可：

| 系统 | 命令 |
|------|------|
| **Linux** | `curl -sL https://github.com/msnyizhou/mdwe/raw/main/setup.sh \| bash` |
| **macOS** | `curl -sL https://github.com/msnyizhou/mdwe/raw/main/setup.sh \| bash` |
| **Windows** (Git Bash) | `curl -sL https://github.com/msnyizhou/mdwe/raw/main/setup.sh \| bash` |
| **Windows** (PowerShell) | `iwr -Uri https://github.com/msnyizhou/mdwe/raw/main/setup.sh -OutFile setup.sh; bash setup.sh` |

安装后会自动出现管理菜单：

```
  ══════════════════════════════════════════════
    MDwe 服务器管理菜单
  ══════════════════════════════════════════════

  1) 启动服务
  2) 停止服务
  3) 重启服务
  4) 更新程序
  5) 测试服务
  6) 安装开机自启
  7) 取消开机自启
  8) 退出
```

## 核心功能

- **Markdown 在线管理** — 通过浏览器创建、编辑、删除文章
- **多媒体封面** — 封面支持图片和 MP4 视频
- **分类导航** — 动态分类标签，点击筛选不同类别
- **阅读量统计** — 基于 localStorage 的文章阅读计数
- **深色模式** — 一键切换亮色/暗色主题
- **推荐阅读** — 文章页底部展示随机推荐
- **关系图谱** — 3D 可视化 `[[WikiLink]]` 文档关联
- **API 接口** — 支持程序化文章递交

## 手动启动

```bash
cd ~/mdwe-server
python3 web_server.py
```

服务地址：`http://本机IP:80`

## 文章格式

```yaml
---
title: 文章标题
category: 分类名称
date: 2026-03-19
desc: 简短描述
cover: 封面URL（可选，图片或MP4）
===

正文内容，支持 Markdown 语法...
```

## 目录结构

```
~/mdwe-server/
├── web_server.py       # HTTP 服务器
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
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/list-md` | 获取文章列表 |
| POST | `/api/save-md` | 保存文章 |
| POST | `/api/delete-md` | 删除文章 |
| POST | `/api/upload-image` | 上传图片 |
| POST | `/api/fetch-cover` | 获取随机封面 |

## 技术栈

Python 3（标准库） + HTML5 + CSS3 + JavaScript

## 仓库

https://github.com/msnyizhou/mdwe