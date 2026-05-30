# CRLF 元数据解析故障记录

> 日期：2026-05-16
> 影响范围：index.js / read.js / manager.js / imanager.js 全部前端页面

## 现象

- 在 manager.html 点击已存在的文件，元数据（title/category/date/desc/cover）全部为空
- YAML 头部 `--- ... ===` 被当成正文显示在 Markdown 编辑区
- 预览区域换行丢失
- Three.js 图谱鼠标移动时报 `Cannot read properties of undefined (reading 'type')`

## 根因

**Windows CRLF (`\r\n`) 与 Unix LF (`\n`) 换行符差异。**

正则 `txt.match(/^---\n([\s\S]*?)\n===/)` 中的 `\n` 只匹配 LF，而 Windows 环境下 git checkout 会把文件转换为 CRLF。文件中实际是：

```
---\r\n...\r\n===\r\n
```

正则 `^---\n` 要求 `---` 后紧跟 `\n`，但实际遇到的是 `\r\n`，`match` 返回 `null`。导致：
- `if(m)` 为 false，进入 else 分支
- `body = txt` —— 整个文件（包括头部）被当作正文
- 元数据输入框全部为空
- `marked.parse` 因为没分离头部也渲染异常

## 根本原因链

```
git配置core.autocrlf=true
    → checkout时自动将LF转为CRLF
        → JS正则只写了\n不匹配\r\n
            → match返回null
                → 头部未被解析
```

## 为什么以前没出问题

在 CSS/JS 未分离前，所有内联代码在同一个 HTML 文件中，元数据解析逻辑直接写在 `<script>` 里。分离后 JS 作为独立文件加载，文件格式受 git CRLF 转换影响。

## 修复方案

```javascript
// 所有 md.match(/^---\n([\s\S]*?)\n===/) 之前，先归一化换行符
const normalized = rawText.replace(/\r\n/g, '\n');
const match = normalized.match(/^---\n([\s\S]*?)\n===/);
```

修改了 4 个文件共 8 处正则匹配。

## 同类隐患检查清单

| 检查点 | 状态 |
|--------|------|
| 所有 JS 中 `match(/^---.../)` 正则需要 `\r\n` 转 `\n` | ✅ 已修复 |
| 所有 JS 中 `split("\n")` 需要 `\r\n` 转 `\n` | ✅ 已修复 |
| `.replace(m[0],"")` 也需要在归一化后的字符串上操作 | ✅ 已修复 |
| 图谱 `loadGraphAllData` 中同样问题 | ✅ 已修复 |

## Three.js 图谱鼠标报错

**现象：** 图谱未初始化时（`graphNodes` 仍为空数组），鼠标在 Canvas 上移动时 `raycaster.intersectObjects(graphNodes.map(x=>x.mesh))` 报错。

**根因：** 空数组传给 `intersectObjects`，Three.js 内部读取 `undefined` 的属性。

**修复：** 在调用前加空数组保护：
```javascript
if (!graphNodes || graphNodes.length === 0) return;
```

## 启示

1. **跨平台项目必须考虑 CRLF/LF 差异** — 正则 `\n` 在 Windows 上很容易失效
2. **git config core.autocrlf** 默认值因平台而异，不应假设
3. **字符串解析逻辑** — 不要假设来源文件的换行符格式，先做归一化
4. **Three.js 空数组调用** — 即使没有初始化，event listener 仍会触发，需要防御性检查