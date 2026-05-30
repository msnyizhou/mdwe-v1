# setup.sh 开发踩坑记录

> 记录一键安装脚本开发中遇到的所有问题、根因和解决方案，供日后参考。

## 1. 颜色码显示为原始转义文本

**现象：** 菜单中的 `\033[0;32m1\033[0m` 直接显示为原始字符串，而不是绿色数字。

**根因：** `echo -e` 在某些 shell 环境（特别是 `/bin/sh` 而非 bash）不认识 `-e` 参数，直接把 `\033` 当作普通文本输出。`curl | bash` 模式下 bash 版本可能较旧。

**解决：** 将 `echo -e` 全部替换为 `printf`，`printf` 在所有 POSIX shell 中行为一致。

**启示：** 跨平台 shell 脚本不要依赖 `echo -e`，始终用 `printf`。

## 2. curl | bash 模式下 read 读取到空字符串（死循环）

**现象：** 脚本进入无限循环，菜单反复出现，用户输入的任何内容都被提示"无效输入"。按 `1` 菜单刷新一次后又回到原样，完全无法操作。

**根因：** `curl -sL url | bash` 是管道模式，stdin 被 curl 占用。脚本里的 `read` 从 stdin 读到的是 **EOF**（空字符串），变量 `choice` 变成空字符串，case 匹配不到 `1`-`8`，永远走 `*)` 分支。

**第一次修复：** `exec </dev/tty` — 把整个脚本的 stdin 重定向到终端设备。

**结果：** 在某些 SSH 连接中 `/dev/tty` 不存在（或不可读），`exec` 失败后带 `|| exit 1` 直接退出，**无任何输出**，用户看到的就是命令执行后没反应。

**第二次修复：** 不重定向整个 stdin，而是创建一个 `read_input()` 函数，只在需要读取时才从 `/dev/tty` 读取：
```bash
read_input() {
    if [ "$READ_FROM_TTY" = "1" ]; then
        read -p "$prompt" "$varname" </dev/tty
    else
        read -p "$prompt" "$varname"
    fi
}
```

**启示：**
- 不要在管道模式下用 `exec` 重定向 stdin，失败后无反馈非常迷惑
- `read` 在没有 stdin 时不是阻塞等待，而是立刻返回空
- 交互式脚本的 read 必须显式指定从 `/dev/tty` 读取

## 3. 端口检测失败导致 stop 不生效，restart 报错 Address already in use

**现象：** 按 `2` 停止显示"服务已停止"，但按 `3` 重启时提示端口被占用。

**根因：** 停止函数只用了 `ss` 一种方式查找 PID，而目标 Linux 发行版可能：
- `ss` 输出格式不同（有的默认不显示 `pid=` 字段）
- 没有安装 `ss`
- 进程已经僵死

`ss` 没找到 PID，`stop_server` 判断"服务未运行"，实际进程还在。

**解决：** 
- 停止函数采用多种方式查找 PID：`ss` → `lsof` → `fuser` → `netstat`
- 启动函数在启动前先用 `pgrep -f` 强制 kill 残留的 `web_server.py` 进程

**启示：** Linux 系统差异大，不能依赖单一命令获取进程信息。多准备备选方案。

## 4. kill 信号强度不够

**现象：** 端口检测到被占用后，`kill $pid` 返回成功但端口仍被占用。

**根因：** 默认 `kill` 发送 SIGTERM(15)，进程可能忽略或需要时间退出。

**解决：** 统一使用 `kill -9`（SIGKILL）确保立即终止。

**启示：** 在设置脚本中，对遗留进程应使用 `kill -9`，不要在端口抢占上犹豫。

## 5. 发布包中包含本地私有文件

**现象：** 第一次构建的 tar.gz 包 133MB，包含了 `assets/reference/` 下的图片和本地私有 md 文档。

**根因：** `build-release.sh` 直接用 `cp -r src/web_root` 复制了全部文件，包括 `md/` 和 `img/` 目录中的所有私有内容。

**解决：** 改为按清单复制文件，只复制核心程序文件，`md/` 和 `img/` 目录只创建空目录 + 默认 readme.md。

**启示：** 发布包构建必须显式声明文件列表，不能用通配符复制。

## 总结：交互式 shell 脚本检查清单

| 检查项 | 说明 |
|--------|------|
| `printf` 替代 `echo -e` | `echo -e` 不可移植 |
| `read` 在管道模式的兼容 | `curl \| bash` 时 stdin 为空 |
| `/dev/tty` 可用性测试 | 部分环境无 `/dev/tty` |
| 进程发现多备选 | ss/lsof/fuser/netstat |
| `kill -9` 而非 `kill` | SIGTERM 可能被忽略 |
| 发布包文件清单 | 显式列表，避免全部复制 |