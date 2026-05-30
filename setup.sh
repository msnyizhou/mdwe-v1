#!/usr/bin/env bash
# ===============================================================
# MDwe 一体化管理脚本 v2.1.3
# 更新：状态页双路径打印、自动检测index.html 200、缓存清理功能
# ===============================================================

# -------------------------- 管道模式兼容读取 --------------------------
read_input() {
    local prompt="$1"
    local varname="$2"
    echo -n "$prompt"
    read -r input_val
    eval "$varname='$input_val'"
}

# -------------------------- 彩色输出定义 --------------------------
if [ -t 1 ]; then
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    CYAN=$(tput setaf 6)
    NC=$(tput sgr0)
else
    RED=""
    GREEN=""
    YELLOW=""
    CYAN=""
    NC=""
fi

info()  { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

title() {
    clear
    printf "\n${CYAN}====================================================${NC}\n"
    printf "${CYAN}  %s${NC}\n" "$1"
    printf "${CYAN}====================================================${NC}\n\n"
}

# -------------------------- 全局常量配置 --------------------------
GIT_REPO_URL="https://github.com/msnyizhou/mdwe.git"
ARCHIVE_DOWNLOAD_URL="https://github.com/msnyizhou/mdwe/raw/main/download/mdwe-server-latest.tar.gz"
PACKAGE_NAME="mdwe-server"
SERVICE_PORT=80
PYTHON_BIN="python3"
INSTALL_DIR=""
LOCAL_IP=""

# -------------------------- 自动检索web_server.py函数（过滤.cache缓存、限制/root搜索） --------------------------
auto_find_server_path() {
    info "正在 /root 目录内搜索 web_server.py，自动过滤.cache缓存目录..."
    local find_result
    find_result=$(find /root -path "*/.cache*" -prune -o -name "web_server.py" -type f -print 2>/dev/null | head -n1)

    if [ -z "$find_result" ]; then
        warn "/root目录未检索到合法web_server.py，程序未部署，请前往部署菜单安装"
        INSTALL_DIR=""
        return 1
    fi

    local SERVER_DIR
    SERVER_DIR=$(dirname "$find_result")
    info "检索到web_server.py文件：$find_result"
    info "程序根目录：$SERVER_DIR"

    local dir_system="${SERVER_DIR}/system"
    local dir_webroot="${SERVER_DIR}/web_root"
    # 兼容你的目录结构：src/web_root / src/system
    local dir_system_src="${SERVER_DIR}/src/system"
    local dir_webroot_src="${SERVER_DIR}/src/web_root"

    if [ -d "$dir_system" ] && [ -d "$dir_webroot" ]; then
        info "目录校验通过，根目录存在 system/ web_root/"
        INSTALL_DIR="$SERVER_DIR"
        return 0
    elif [ -d "$dir_system_src" ] && [ -d "$dir_webroot_src" ]; then
        info "目录校验通过，src目录存在 system/ web_root/"
        INSTALL_DIR="$SERVER_DIR"
        return 0
    else
        warn "当前检索的web_server.py缺少system/web_root目录，判定无效"
        warn "清空程序目录变量，请前往部署菜单重新部署"
        INSTALL_DIR=""
        return 1
    fi
}

# -------------------------- 系统识别函数 --------------------------
detect_os() {
    local sys_name
    sys_name=$(uname -s)
    case "$sys_name" in
        Linux*)
            OS="linux"
            PKG_MANAGER="apt"
            ;;
        Darwin*)
            OS="macos"
            PKG_MANAGER="brew"
            ;;
        MINGW*|MSYS*)
            OS="windows"
            error "Windows GitBash仅支持基础操作，推荐WSL运行完整功能"
            ;;
        *)
            error "不支持的操作系统：$sys_name"
            exit 1
            ;;
    esac
    info "检测当前系统：${OS}"
}

# -------------------------- 环境预检模块 --------------------------
# 80端口占用检测
check_port_occupied() {
    local pid=""
    title "端口预检 - ${SERVICE_PORT}端口占用检测"
    info "正在检测${SERVICE_PORT}端口占用进程..."

    case "${OS}" in
        linux)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
        macos)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
    esac

    if [ -z "${pid}" ]; then
        info "${SERVICE_PORT}端口空闲，无占用进程"
        read_input "按下回车返回环境预检菜单..." dummy
        return 0
    fi

    warn "检测到${SERVICE_PORT}端口被进程PID:${pid}占用！"
    read_input "请选择操作 [1=强制杀死占用进程 | 2=返回上级菜单]: " port_opt
    case "${port_opt}" in
        1)
            info "正在强制终止进程${pid}"
            kill -9 "${pid}" 2>/dev/null
            sleep 1
            local new_pid
            new_pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            if [ -z "${new_pid}" ]; then
                info "端口释放成功"
            else
                error "进程终止失败，请手动执行 kill -9 ${pid}"
            fi
            ;;
        2)
            info "返回环境预检菜单"
            return 1
            ;;
        *)
            warn "无效输入，返回菜单"
            return 1
            ;;
    esac
    read_input "按下回车返回环境预检菜单..." dummy
}

# Python3检测安装
check_python() {
    title "环境预检 - Python3检测"
    if command -v "${PYTHON_BIN}" &>/dev/null; then
        local py_ver
        py_ver=$(${PYTHON_BIN} --version)
        info "Python3已安装：${py_ver}"
        read_input "按下回车返回环境预检菜单..." dummy
        return 0
    fi

    warn "未检测到Python3，将自动安装"
    case "${OS}" in
        linux)
            info "Linux系统执行apt安装命令"
            sudo apt update && sudo apt install -y python3 python3-pip
            ;;
        macos)
            info "macOS可选brew安装Python3"
            echo "方案1：brew install python3"
            echo "方案2：官网下载安装包 https://www.python.org/downloads/macos/"
            read_input "是否执行brew自动安装Python3？[y/n]: " py_confirm
            if [[ "${py_confirm}" == "y" || "${py_confirm}" == "Y" ]]; then
                brew install python3
            else
                info "请手动安装Python3后重新运行脚本"
            fi
            ;;
    esac

    if command -v "${PYTHON_BIN}" &>/dev/null; then
        info "Python3安装完成：$(${PYTHON_BIN} --version)"
    else
        error "Python3安装失败，请手动安装后重试"
    fi
    read_input "按下回车返回环境预检菜单..." dummy
}

# Git检测安装
check_git() {
    title "环境预检 - Git检测"
    if command -v git &>/dev/null; then
        local git_ver
        git_ver=$(git --version)
        info "Git已安装：${git_ver}"
        read_input "按下回车返回环境预检菜单..." dummy
        return 0
    fi

    warn "未检测到Git，开始自动安装"
    case "${OS}" in
        linux)
            sudo apt update && sudo apt install -y git
            ;;
        macos)
            info "macOS安装Git命令：brew install git"
            read_input "是否自动brew安装Git？[y/n]: " git_confirm
            if [[ "${git_confirm}" == "y" || "${git_confirm}" == "Y" ]]; then
                brew install git
            else
                info "请手动安装Git后重试"
            fi
            ;;
    esac

    if command -v git &>/dev/null; then
        info "Git安装完成：$(git --version)"
    else
        error "Git安装失败，请手动安装"
    fi
    read_input "按下回车返回环境预检菜单..." dummy
}

# 环境预检子菜单
env_check_menu() {
    while true; do
        title "环境预检工具箱"
        echo "  1) 检测并释放80端口"
        echo "  2) 检测/自动安装Python3"
        echo "  3) 检测/自动安装Git"
        echo "  4) 返回主菜单"
        echo ""
        read_input "请选择功能 [1-4]: " env_opt
        case "${env_opt}" in
            1) check_port_occupied ;;
            2) check_python ;;
            3) check_git ;;
            4) info "返回主菜单"; return 0 ;;
            *) warn "无效选项，请重新输入" ;;
        esac
    done
}

# -------------------------- 程序部署模块 --------------------------
# Git克隆部署
install_by_git() {
    title "部署方式1 - Git克隆源码部署"
    local target_dir="${HOME}/${PACKAGE_NAME}"
    if [ -d "${target_dir}" ]; then
        read_input "默认目录${target_dir}已存在，是否覆盖？[y/n]: " cover_opt
        if [[ "${cover_opt}" != "y" && "${cover_opt}" != "Y" ]]; then
            info "取消Git克隆，返回部署菜单"
            return 1
        fi
        rm -rf "${target_dir}"
    fi
    info "开始克隆仓库：${GIT_REPO_URL}"
    git clone "${GIT_REPO_URL}" "${target_dir}"
    if [ $? -eq 0 ]; then
        info "Git克隆完成，重新检索程序目录"
        auto_find_server_path
    else
        error "Git克隆失败，请检查网络连接"
    fi
    read_input "按下回车返回部署菜单..." dummy
}

# 在线压缩包部署
install_by_archive() {
    title "部署方式2 - 在线压缩包部署"
    local tmp_tar="/tmp/mdwe-server.tar.gz"
    info "下载地址：${ARCHIVE_DOWNLOAD_URL}"
    curl -#L -o "${tmp_tar}" "${ARCHIVE_DOWNLOAD_URL}"
    if [ ! -f "${tmp_tar}" ]; then
        error "压缩包下载失败"
        return 1
    fi

    local target_dir="${HOME}/${PACKAGE_NAME}"
    mkdir -p "${target_dir}"
    # 备份用户md与img文件
    if [ -d "${target_dir}/web_root/md" ]; then
        cp -r "${target_dir}/web_root/md" /tmp/mdwe-md-bak 2>/dev/null
    fi
    if [ -d "${target_dir}/web_root/img" ]; then
        cp -r "${target_dir}/web_root/img" /tmp/mdwe-img-bak 2>/dev/null
    fi

    info "解压程序包至${target_dir}"
    tar xzf "${tmp_tar}" -C "${target_dir}" --strip-components=1
    rm -f "${tmp_tar}"

    # 恢复用户数据
    [ -d "/tmp/mdwe-md-bak" ] && cp -r /tmp/mdwe-md-bak/* "${target_dir}/web_root/md/" 2>/dev/null && rm -rf /tmp/mdwe-md-bak
    [ -d "/tmp/mdwe-img-bak" ] && cp -r /tmp/mdwe-img-bak/* "${target_dir}/web_root/img/" 2>/dev/null && rm -rf /tmp/mdwe-img-bak

    chmod +x "${target_dir}/web_server.py"
    info "压缩包部署完成，重新检索程序目录"
    auto_find_server_path
    read_input "按下回车返回部署菜单..." dummy
}

# 本地文件夹/压缩包部署
install_by_local_file() {
    title "部署方式3 - 本地文件部署"
    read_input "输入本地压缩包(.tar.gz)或源码文件夹完整路径: " local_path
    if [ ! -e "${local_path}" ]; then
        error "路径不存在"
        return 1
    fi
    local target_dir="${HOME}/${PACKAGE_NAME}"
    read_input "是否覆盖默认目录${target_dir}？[y/n]: " cover_opt
    [[ "${cover_opt}" != "y" && "${cover_opt}" != "Y" ]] && return 0
    rm -rf "${target_dir}"
    mkdir -p "${target_dir}"

    if [ -d "${local_path}" ]; then
        cp -r "${local_path}"/* "${target_dir}/"
        info "本地文件夹复制完成"
    elif [[ "${local_path}" == *.tar.gz ]]; then
        tar xzf "${local_path}" -C "${target_dir}" --strip-components=1
        info "本地压缩包解压完成"
    else
        error "不支持该文件格式，仅支持文件夹与tar.gz压缩包"
        return 1
    fi
    chmod +x "${target_dir}/web_server.py"
    info "本地文件部署完成，重新检索程序目录"
    auto_find_server_path
    read_input "按下回车返回部署菜单..." dummy
}

# 部署子菜单
install_menu() {
    while true; do
        title "程序部署工具箱"
        echo "  1) Git克隆源码部署（推荐更新）"
        echo "  2) 在线压缩包一键部署"
        echo "  3) 本地文件夹/压缩包部署"
        echo "  4) 返回主菜单"
        echo ""
        read_input "请选择部署方式 [1-4]: " install_opt
        case "${install_opt}" in
            1) install_by_git ;;
            2) install_by_archive ;;
            3) install_by_local_file ;;
            4) info "返回主菜单"; return 0 ;;
            *) warn "无效选项，请重新输入" ;;
        esac
    done
}

# -------------------------- 服务管理模块 --------------------------
# 获取局域网IP
get_lan_ip() {
    LOCAL_IP="127.0.0.1"
    case "${OS}" in
        linux)
            LOCAL_IP=$(ip -4 addr show | grep -v LOOPBACK | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || echo "127.0.0.1")
            ;;
        macos)
            LOCAL_IP=$(ifconfig | grep inet | grep -v 127.0.0.1 | awk '{print $2}' | head -n1 || echo "127.0.0.1")
            ;;
    esac
}

# 查询服务状态【升级版本：打印双路径、检测index.html 200】
check_service_status() {
    get_lan_ip
    local pid=""
    local TEST_INDEX_URL="http://127.0.0.1:${SERVICE_PORT}/index.html"
    local INDEX_HTTP_CODE="000"
    # 检测首页index.html状态码
    INDEX_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$TEST_INDEX_URL" 2>/dev/null || echo "000")

    case "${OS}" in
        linux)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
        macos)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
    esac

    title "服务状态查询"
    echo "程序根目录: ${INSTALL_DIR:-未部署程序}"
    # 新增两行路径打印
    echo "配置文件目录：${INSTALL_DIR}/system"
    echo "网站页面文件根目录：${INSTALL_DIR}/web_root"
    echo "监听端口: ${SERVICE_PORT}"

    if [ -n "${pid}" ]; then
        info "✅ 服务正在运行，进程PID: ${pid}"
        info "本地访问地址: http://127.0.0.1:${SERVICE_PORT}"
        info "局域网访问地址: http://${LOCAL_IP}:${SERVICE_PORT}"
        # 首页检测结果
        if [ "${INDEX_HTTP_CODE}" -eq 200 ]; then
            info "✅ 首页 index.html 检测通过，返回HTTP 200"
        else
            error "❌ 首页 index.html 检测失败，HTTP状态码：${INDEX_HTTP_CODE}"
        fi
    else
        warn "❌ 服务当前未启动"
    fi

    # 检测开机自启状态
    case "${OS}" in
        linux)
            if systemctl --user is-enabled mdwe.service &>/dev/null; then
                info "开机自启状态：已开启"
            else
                warn "开机自启状态：未配置"
            fi
            ;;
        macos)
            if launchctl list | grep com.mdwe.server &>/dev/null; then
                info "开机自启状态：已开启"
            else
                warn "开机自启状态：未配置"
            fi
            ;;
    esac
    read_input "按下回车返回服务菜单..." dummy
}

# 启动服务（新增curl外部自检）
start_mdwe_service() {
    title "启动 MDwe 服务"
    if [ -z "${INSTALL_DIR}" ] || [ ! -f "${INSTALL_DIR}/web_server.py" ]; then
        error "未识别到合法程序目录，请先进入部署菜单安装程序"
        read_input "按下回车返回服务菜单..." dummy
        return 1
    fi

    cd "${INSTALL_DIR}" || return
    : > web.log

    # root权限校验提示
    if [ "$(id -u)" -ne 0 ]; then
        warn "当前用户非root，80端口会出现权限不足启动失败！建议切换root运行脚本"
        read_input "是否继续尝试启动服务？[y/n]: " run_confirm
        if [[ "${run_confirm}" != "y" && "${run_confirm}" != "Y" ]]; then
            info "已取消启动操作"
            read_input "按下回车返回服务菜单..." dummy
            return 0
        fi
    fi

    # 后台启动服务
    nohup "${PYTHON_BIN}" web_server.py > web.log 2>&1 &
    local run_pid=$!
    info "服务后台进程PID: ${run_pid}，等待2秒完成初始化..."
    sleep 2

    # curl健康自检逻辑
    info "执行curl外部健康自检，检测接口 /md-files.json"
    local TEST_URL="http://127.0.0.1:${SERVICE_PORT}/md-files.json"
    local HTTP_CODE
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "${TEST_URL}" 2>/dev/null || echo "000")

    if [ "${HTTP_CODE}" -eq 200 ]; then
        info "✅ curl自检通过，${TEST_URL} 返回HTTP 200"
        get_lan_ip
        info "本地访问地址：http://127.0.0.1:${SERVICE_PORT}"
        info "局域网访问地址：http://${LOCAL_IP}:${SERVICE_PORT}"
    else
        error "❌ curl自检失败，接口返回状态码：${HTTP_CODE}"
        error "常见故障：80端口权限不足、服务进程崩溃、端口被占用"
        warn "打印web.log最新10行日志用于排查："
        tail -n 10 web.log
    fi

    read_input "按下回车返回服务菜单..." dummy
}

# 停止服务
stop_mdwe_service() {
    title "停止 MDwe 服务"
    local pid=""
    case "${OS}" in
        linux)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
        macos)
            pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
            ;;
    esac

    if [ -z "${pid}" ]; then
        warn "当前无运行中的MDwe服务，无需停止"
        read_input "按下回车返回服务菜单..." dummy
        return 0
    fi

    info "正在终止服务进程PID: ${pid}"
    kill -9 "${pid}" 2>/dev/null
    sleep 1
    local new_pid
    new_pid=$(lsof -iTCP:${SERVICE_PORT} -sTCP:LISTEN -t 2>/dev/null || true)
    if [ -z "${new_pid}" ]; then
        info "服务停止成功，${SERVICE_PORT}端口已释放"
    else
        error "进程停止失败，请手动执行 kill -9 ${pid}"
    fi
    read_input "按下回车返回服务菜单..." dummy
}

# 配置开机自启
install_auto_start() {
    title "配置MDwe开机自启"
    if [ -z "${INSTALL_DIR}" ] || [ ! -f "${INSTALL_DIR}/web_server.py" ]; then
        error "程序目录无效，无法配置开机自启，请先部署程序"
        read_input "按下回车返回服务菜单..." dummy
        return 1
    fi

    case "${OS}" in
        linux)
            local unit_file="${HOME}/.config/systemd/user/mdwe.service"
            mkdir -p "${HOME}/.config/systemd/user"
            cat > "${unit_file}" <<EOF
[Unit]
Description=MDwe Markdown Web Service
After=network.target

[Service]
ExecStart=$(which ${PYTHON_BIN}) ${INSTALL_DIR}/web_server.py
WorkingDirectory=${INSTALL_DIR}
Restart=on-failure

[Install]
WantedBy=default.target
EOF
            systemctl --user daemon-reload
            systemctl --user enable mdwe.service
            info "Linux systemd用户服务开机自启配置完成"
            ;;
        macos)
            local plist_file="${HOME}/Library/LaunchAgents/com.mdwe.server.plist"
            cat > "${plist_file}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mdwe.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which ${PYTHON_BIN})</string>
        <string>${INSTALL_DIR}/web_server.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
            launchctl load "${plist_file}"
            info "macOS LaunchAgent开机自启配置完成"
            ;;
    esac
    read_input "按下回车返回服务菜单..." dummy
}

# 取消开机自启
uninstall_auto_start() {
    title "取消MDwe开机自启"
    case "${OS}" in
        linux)
            systemctl --user stop mdwe.service 2>/dev/null
            systemctl --user disable mdwe.service 2>/dev/null
            rm -f "${HOME}/.config/systemd/user/mdwe.service"
            systemctl --user daemon-reload
            info "Linux开机自启已彻底删除"
            ;;
        macos)
            local plist_file="${HOME}/Library/LaunchAgents/com.mdwe.server.plist"
            launchctl unload "${plist_file}" 2>/dev/null
            rm -f "${plist_file}"
            info "macOS开机自启文件已删除"
            ;;
    esac
    read_input "按下回车返回服务菜单..." dummy
}

# 重启服务
restart_mdwe_service() {
    title "重启 MDwe 服务"
    stop_mdwe_service
    start_mdwe_service
}

# 清理缓存&日志功能
clean_cache_log() {
    title "清理缓存与日志文件"
    read_input "确认清理web.log日志、临时下载缓存？[y/n]: " clean_confirm
    if [[ "${clean_confirm}" != "y" && "${clean_confirm}" != "Y" ]]; then
        info "取消清理操作"
        read_input "按下回车返回服务菜单..." dummy
        return 0
    fi
    # 清理程序目录日志
    if [ -n "${INSTALL_DIR}" ] && [ -f "${INSTALL_DIR}/web.log" ]; then
        rm -f "${INSTALL_DIR}/web.log"
        info "已删除服务日志 web.log"
    fi
    # 清理系统临时压缩包缓存
    rm -f /tmp/mdwe-server.tar.gz /tmp/mdwe-md-bak /tmp/mdwe-img-bak
    info "已清理系统临时缓存文件"
    info "缓存&日志清理完成"
    read_input "按下回车返回服务菜单..." dummy
}

# 服务管理子菜单（新增清理缓存选项）
service_manage_menu() {
    while true; do
        title "MDwe 服务管理工具箱"
        echo "  1) 查询当前服务运行状态、访问地址、自启状态"
        echo "  2) 启动 MDwe 服务（自动curl健康自检）"
        echo "  3) 停止 MDwe 服务"
        echo "  4) 配置系统开机自启"
        echo "  5) 取消系统开机自启"
        echo "  6) 一键重启服务"
        echo "  7) 清理日志&临时缓存文件"
        echo "  8) 返回主菜单"
        echo ""
        read_input "请选择功能 [1-8]: " service_opt
        case "${service_opt}" in
            1) check_service_status ;;
            2) start_mdwe_service ;;
            3) stop_mdwe_service ;;
            4) install_auto_start ;;
            5) uninstall_auto_start ;;
            6) restart_mdwe_service ;;
            7) clean_cache_log ;;
            8) info "返回主菜单"; return 0 ;;
            *) warn "无效选项，请重新输入" ;;
        esac
    done
}

# -------------------------- 主菜单入口 --------------------------
main_menu() {
    detect_os
    # 脚本启动自动检索web_server.py并校验目录
    auto_find_server_path

    while true; do
        title "MDwe 一体化管理脚本 v2.1.3"
        echo "当前识别程序目录：${INSTALL_DIR:-未部署程序}"
        echo ""
        echo "  1) 环境预检工具箱（端口、Python、Git检测安装）"
        echo "  2) 程序部署工具箱（Git/在线包/本地文件部署）"
        echo "  3) MDwe服务管理（启停、重启、curl自检、开机自启、缓存清理）"
        echo "  4) 退出脚本"
        echo ""
        read_input "请选择功能模块 [1-4]: " main_opt
        case "${main_opt}" in
            1) env_check_menu ;;
            2) install_menu ;;
            3) service_manage_menu ;;
            4) info "脚本正常退出，再见！"; exit 0 ;;
            *) warn "输入无效，请选择1~4" ;;
        esac
    done
}

# 启动脚本主逻辑
main_menu "$@"
