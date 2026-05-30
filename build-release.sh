#!/usr/bin/env bash
# MDwe 发布包构建脚本（仅核心代码，不含用户数据）
# 用法：bash build-release.sh [version]
# 然后 git add download/ && git commit -m "release" && git push
set -e

VERSION="${1:-latest}"
OUT_DIR="download"
SRC_DIR="src"
TEMP_DIR="/tmp/mdwe-build-$$"

echo "=== 构建发布包: ${VERSION} ==="

mkdir -p "${TEMP_DIR}" "${OUT_DIR}"

# 复制服务器文件
cp "${SRC_DIR}/web_server.py" "${TEMP_DIR}/"

# 复制前端文件（按清单：仅程序文件，不含用户图片和文章）
mkdir -p "${TEMP_DIR}/web_root"
for f in index.html read.html manager.html imanager.html header.html footer.html theme.css marked.min.js three.min.js OrbitControls.js favicon.ico; do
    [ -f "${SRC_DIR}/web_root/$f" ] && cp "${SRC_DIR}/web_root/$f" "${TEMP_DIR}/web_root/"
done

# 创建空的用户数据目录
mkdir -p "${TEMP_DIR}/web_root/md" "${TEMP_DIR}/web_root/img"

# 放置默认文档
cp "${SRC_DIR}/web_root/md/readme.md" "${TEMP_DIR}/web_root/md/" 2>/dev/null || true

# 打包
echo "打包..."
cd "${TEMP_DIR}"
tar czf "${OLDPWD}/${OUT_DIR}/mdwe-server-${VERSION}.tar.gz" ./*
cd - > /dev/null

# latest 版本（避免同文件拷贝问题）
if [ "$VERSION" != "latest" ]; then
    cp "${OUT_DIR}/mdwe-server-${VERSION}.tar.gz" "${OUT_DIR}/mdwe-server-latest.tar.gz"
fi

rm -rf "$TEMP_DIR"

ls -lh "${OUT_DIR}/mdwe-server-${VERSION}.tar.gz"
echo "=== 构建完成 ==="