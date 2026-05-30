# -*- coding: utf-8 -*-
import os
import json
import time
import urllib.request
import urllib.parse
import platform
import sys
import traceback
import threading
import socketserver
from http.server import SimpleHTTPRequestHandler

# ===================== 全局基础配置 =====================
PORT = 80
WEB_ROOT = "web_root"
SYSTEM_DIR = "system"
SYSTEM_CONFIG_PATH = os.path.join(SYSTEM_DIR, "config.json")
MD_FOLDER = os.path.join(WEB_ROOT, "md")
IMG_FOLDER = os.path.join(WEB_ROOT, "img")

# ===================== 目录初始化、配置自动补齐、Linux权限修复 =====================
def init_dirs():
    # 批量创建所需文件夹
    dir_list = [WEB_ROOT, MD_FOLDER, IMG_FOLDER, SYSTEM_DIR]
    for d in dir_list:
        os.makedirs(d, exist_ok=True)

    # 默认配置：新增 hero_title、hero_subtitle
    default_config = {
        "site_title": "交易觉知",
        "hero_video_url": "https://static.699pic.com/video/video-banner-v3.4.mp4",
        "hero_title": "交易觉知",
        "hero_subtitle": "专注交易认知提升、思维觉醒、策略沉淀 · 让每一次思考都成为盈利的基石",
        "site_name": "MDwe-v1",
        "site_description": "这是一套简单站点模板",
        "logo_url": "/img/logo.svg",
        "admin_password": "123456",
        "max_upload_size": 5,
        "dark_mode": False,
        "navigation": {
            "menu": [
                {"name": "首页", "url": "index.html", "children": []},
                {
                    "name": "文章分类",
                    "url": "#",
                    "children": [
                        {"name": "软件工具", "url": "index.html?cat=软件工具"},
                        {"name": "交易心得", "url": "index.html?cat=交易心得"}
                    ]
                },
                {"name": "文档管理", "url": "manager.html", "children": []}
            ]
        }
    }

    # 配置文件不存在则新建，存在则合并补齐缺失字段
    if not os.path.exists(SYSTEM_CONFIG_PATH):
        with open(SYSTEM_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
    else:
        with open(SYSTEM_CONFIG_PATH, "r", encoding="utf-8") as f:
            old_cfg = json.load(f)
        # 默认配置覆盖缺失项，原有用户配置保留
        merge_cfg = {**default_config, **old_cfg}
        with open(SYSTEM_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(merge_cfg, f, ensure_ascii=False, indent=2)

    # Linux / MacOS 自动修复目录文件权限
    sys_type = platform.system()
    if sys_type != "Windows":
        scan_paths = [WEB_ROOT, SYSTEM_DIR]
        print("[权限修复] 正在修正静态资源与配置目录权限")
        try:
            current_uid = os.getuid()
            current_gid = os.getgid()
            for base_path in scan_paths:
                if not os.path.exists(base_path):
                    continue
                for root, dirs, files in os.walk(base_path):
                    # 文件夹权限 755
                    for dname in dirs:
                        full_dir = os.path.join(root, dname)
                        os.chown(full_dir, current_uid, current_gid)
                        os.chmod(full_dir, 0o755)
                    # 文件权限 644
                    for fname in files:
                        full_file = os.path.join(root, fname)
                        os.chown(full_file, current_uid, current_gid)
                        os.chmod(full_file, 0o644)
                os.chown(base_path, current_uid, current_gid)
                os.chmod(base_path, 0o755)
            print("[权限修复] 目录文件权限修复完成")
        except Exception as e:
            print(f"[权限警告] 无法自动修改文件权限：{str(e)}")
            print("手动修复命令：chmod -R 755 web_root system")
    print("[系统初始化] 全部目录检查完成")

# ===================== 后台健康检测线程 =====================
def health_check():
    time.sleep(1.2)
    test_url = f"http://127.0.0.1:{PORT}/md-files.json"
    try:
        req = urllib.request.Request(test_url)
        with urllib.request.urlopen(req, timeout=3) as resp:
            status_code = resp.getcode()
            if status_code == 200:
                print(f"[健康检测] {test_url} 接口访问正常")
            else:
                print(f"[健康检测] 接口返回异常状态码：{status_code}")
    except Exception as e:
        print(f"[健康检测] 自检失败：{str(e)}")

# ===================== 自定义HTTP请求处理器 =====================
class CustomHandler(SimpleHTTPRequestHandler):
    # 全局响应头：禁用浏览器缓存
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # 路径处理：剥离URL缓存时间戳参数，API路由不受 ?t=xxx 影响
    def translate_path(self, path):
        path = urllib.parse.unquote(path)
        pure_path = path.split("?")[0]
        api_prefixes = ("/api/", "/system/config.json")
        if pure_path.startswith(api_prefixes):
            return super().translate_path(path)

        rel_path = pure_path.lstrip("/")
        target = os.path.join(WEB_ROOT, rel_path)
        abs_target = os.path.abspath(target)
        # 访问文件夹自动匹配 index.html
        if os.path.isdir(abs_target):
            index_html = os.path.join(abs_target, "index.html")
            if os.path.exists(index_html):
                return index_html
        return abs_target

    # GET 请求处理
    def do_GET(self):
        pure_path = self.path.split("?")[0]
        full_path = self.translate_path(self.path)
        # 目录自动重定向到 index.html
        if os.path.isdir(full_path):
            index_file = os.path.join(full_path, "index.html")
            if os.path.exists(index_file):
                self.path = os.path.join(self.path, "index.html")

        # 旧版笔记列表接口 /md-files.json
        if pure_path == "/md-files.json":
            md_list = [file for file in os.listdir(MD_FOLDER) if file.endswith(".md")]
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"files": md_list}, ensure_ascii=False).encode("utf-8"))
            return

        # 新版笔记列表接口 /api/list-md（兼容任意缓存参数）
        if pure_path.startswith("/api/list-md"):
            md_list = [file for file in os.listdir(MD_FOLDER) if file.endswith(".md")]
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(md_list, ensure_ascii=False).encode("utf-8"))
            return

        # 读取全局配置文件（header.js 读取Logo、站点名称、主题、导航、site_title）
        if pure_path == "/system/config.json":
            try:
                with open(SYSTEM_CONFIG_PATH, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(config_data, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        # 静态文件兜底处理
        try:
            super().do_GET()
        except Exception as err:
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            error_html = f"<h2>404 文件不存在</h2><p>{str(err)}</p>"
            self.wfile.write(error_html.encode("utf-8"))

    # POST 请求全套接口：图片上传、文档增删、封面拉取、配置保存（主题/Logo/站点信息）
    def do_POST(self):
        pure_path = self.path.split("?")[0]
        # 图片上传接口
        if pure_path == "/api/upload-image":
            try:
                content_len = int(self.headers["Content-Length"])
                img_bytes = self.rfile.read(content_len)
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                img_name = f"clip_{timestamp}.jpg"
                save_full = os.path.join(IMG_FOLDER, img_name)
                with open(save_full, "wb") as f:
                    f.write(img_bytes)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"url": f"/img/{img_name}"}, ensure_ascii=False).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode("utf-8"))
                return

        # 解析POST JSON请求体
        try:
            content_len = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_len).decode("utf-8")
            post_data = json.loads(raw_body)
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"JSON解析失败：{str(e)}"}, ensure_ascii=False).encode("utf-8"))
            return

        # 保存/编辑 MD 文档
        if pure_path == "/api/save-md":
            filename = post_data.get("file", "").strip()
            content_text = post_data.get("content", "")
            if not filename.endswith(".md"):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "文件名后缀必须为 .md"}, ensure_ascii=False).encode("utf-8"))
                return
            save_path = os.path.join(MD_FOLDER, filename)
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(content_text)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode("utf-8"))
            return

        # 删除 MD 文档
        if pure_path == "/api/delete-md":
            filename = post_data.get("file", "").strip()
            del_file_path = os.path.join(MD_FOLDER, filename)
            if os.path.exists(del_file_path):
                os.remove(del_file_path)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode("utf-8"))
            return

        # 自动拉取文章封面图
        if pure_path == "/api/fetch-cover":
            filename = post_data.get("filename", "").strip()
            if not filename or not filename.endswith(".md"):
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "无效的MD文件名称"}, ensure_ascii=False).encode("utf-8"))
                return
            base_name = os.path.splitext(filename)[0]
            cover_img = f"{base_name}.jpg"
            cover_save_path = os.path.join(IMG_FOLDER, cover_img)
            cover_url = f"https://picsum.photos/830/280?random={int(time.time())}"
            try:
                urllib.request.urlretrieve(cover_url, cover_save_path)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "path": f"/img/{cover_img}"}, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        # 保存全局配置接口（黑白主题、Logo地址、站点名称、导航、site_title全部持久化）
        if pure_path == "/api/save-config":
            new_config = post_data.get("config", {})
            if not isinstance(new_config, dict):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "配置数据格式错误"}, ensure_ascii=False).encode("utf-8"))
                return
            try:
                # 修复BUG：读取原有完整配置，合并前端传来的修改，不会丢失site_title等默认字段
                with open(SYSTEM_CONFIG_PATH, "r", encoding="utf-8") as f:
                    origin_cfg = json.load(f)
                final_cfg = {**origin_cfg, **new_config}
                with open(SYSTEM_CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump(final_cfg, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        # 不存在的接口返回404
        self.send_response(404)
        self.end_headers()
        self.wfile.write(json.dumps({"error": "请求接口不存在"}, ensure_ascii=False).encode("utf-8"))

# ===================== 支持端口复用的多线程TCP服务 =====================
class ReusePortTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    allow_reuse_port = True

# ===================== 服务启动入口 =====================
def run_server():
    init_dirs()
    print(f"===== MDwe 站点服务启动信息 =====")
    print(f"操作系统：{platform.system()}")
    print(f"监听端口：{PORT}")
    print(f"静态资源根目录：{WEB_ROOT}")
    print(f"笔记存放目录：{MD_FOLDER}")
    print(f"图片存放目录：{IMG_FOLDER}")
    print(f"系统配置文件：{SYSTEM_CONFIG_PATH}")
    print("================================\n")

    try:
        server = ReusePortTCPServer(("0.0.0.0", PORT), CustomHandler)
        print(f"服务启动成功！本地访问地址：http://127.0.0.1:{PORT}")
        # 后台启动健康自检线程
        threading.Thread(target=health_check, daemon=True).start()
        server.serve_forever()
    except PermissionError:
        print("\n【致命错误】80端口权限不足！")
        print("Linux / MacOS 执行命令：sudo python3 web_server.py")
        print("Windows：右键终端，选择【以管理员身份运行】后重新启动")
        sys.exit(1)
    except OSError as err:
        err_msg = str(err).lower()
        if "address already in use" in err_msg:
            print(f"\n【致命错误】端口 {PORT} 已被其他程序占用，请关闭占用程序后重启服务")
        else:
            print("\n【启动异常】")
            traceback.print_exc()
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n服务收到终止信号，正常关闭")
        server.server_close()
    except Exception as err:
        print("\n【服务启动失败】详细异常信息：")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_server()