#!/bin/bash

# 从源码编译 KataGo（适用于 macOS 12）
# 使用 Eigen 后端（纯 CPU，无需 GPU）

set -e

echo "========================================="
echo "  从源码编译 KataGo（Eigen 后端）"
echo "========================================="
echo ""

# 检查依赖
echo "📦 检查依赖..."

# 检查 CMake
if ! command -v cmake &> /dev/null; then
    echo "   安装 CMake..."
    brew install cmake
fi

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "❌ 需要 Git，请先安装"
    exit 1
fi

echo "✅ 依赖检查完成"
echo ""

# 克隆 KataGo 仓库
echo "📥 克隆 KataGo 仓库..."
KATAGO_DIR="$HOME/katago-build"

if [ -d "$KATAGO_DIR" ]; then
    echo "   仓库已存在，删除旧版本..."
    rm -rf "$KATAGO_DIR"
fi

git clone https://github.com/lightvector/KataGo.git "$KATAGO_DIR"
cd "$KATAGO_DIR"

# 切换到稳定版本
echo "   切换到 v1.15.3 版本..."
git checkout v1.15.3

echo "✅ 代码准备完成"
echo ""

# 编译（使用 Eigen 后端，纯 CPU）
echo "🔨 开始编译（这可能需要 10-20 分钟）..."
cd cpp
mkdir -p build
cd build

echo "   配置编译选项..."
cmake .. \
    -DUSE_BACKEND=EIGEN \
    -DBUILD_DISTRIBUTED=0 \
    -DNO_GIT_REVISION=1

echo "   开始编译..."
make -j$(sysctl -n hw.ncpu)

echo "✅ 编译完成"
echo ""

# 安装
echo "📦 安装 KataGo..."
mkdir -p ~/katago/bin
cp katago ~/katago/bin/
chmod +x ~/katago/bin/katago

# 添加到 PATH
if ! grep -q 'export PATH="$HOME/katago/bin:$PATH"' ~/.zshrc; then
    echo 'export PATH="$HOME/katago/bin:$PATH"' >> ~/.zshrc
    echo "✅ 已添加到 ~/.zshrc"
fi

export PATH="$HOME/katago/bin:$PATH"

echo "✅ 安装完成"
echo ""

# 验证
echo "🧪 验证安装..."
~/katago/bin/katago version

echo ""
echo "========================================="
echo "  ✅ KataGo 编译安装成功！"
echo "========================================="
echo ""
echo "📝 下一步："
echo "   1. 重新打开终端或运行: source ~/.zshrc"
echo "   2. 下载模型和配置项目:"
echo "      cd /Users/longguangbin/0_Work/Codes/git_codes/long-go"
echo "      bash scripts/install-katago-v1.16.sh"
echo ""
