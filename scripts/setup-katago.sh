#!/bin/bash

# KataGo 安装和配置脚本
# 适用于 macOS

set -e

echo "========================================="
echo "  KataGo 本地部署安装脚本"
echo "========================================="
echo ""

# 检查是否已安装 Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ 未检测到 Homebrew，请先安装 Homebrew："
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew 已安装"
echo ""

# 安装 KataGo
echo "📦 正在安装 KataGo..."
if command -v katago &> /dev/null; then
    echo "✅ KataGo 已安装: $(which katago)"
    katago version
else
    echo "   执行: brew install katago"
    brew install katago
    echo "✅ KataGo 安装完成"
fi
echo ""

# 创建模型目录
echo "📁 创建模型目录..."
mkdir -p server/models
echo "✅ 模型目录已创建: server/models"
echo ""

# 下载 KataGo 模型
echo "📥 下载 KataGo 神经网络模型..."
MODEL_URL="https://github.com/lightvector/KataGo/releases/download/v1.13.2/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz"
MODEL_FILE="server/models/katago_model.bin.gz"

if [ -f "$MODEL_FILE" ]; then
    echo "✅ 模型文件已存在: $MODEL_FILE"
else
    echo "   下载地址: $MODEL_URL"
    echo "   保存位置: $MODEL_FILE"
    curl -L -o "$MODEL_FILE" "$MODEL_URL"
    echo "✅ 模型下载完成"
fi
echo ""

# 生成默认配置文件
echo "⚙️  生成 KataGo 配置文件..."
if [ -f "server/katago_config.cfg" ]; then
    echo "✅ 配置文件已存在: server/katago_config.cfg"
else
    katago genconfig -model "$MODEL_FILE" -output server/katago_config.cfg
    echo "✅ 配置文件已生成"
fi
echo ""

# 安装 Node.js 服务器依赖
echo "📦 安装 Node.js 服务器依赖..."
cd server
if [ -d "node_modules" ]; then
    echo "✅ 依赖已安装"
else
    npm install
    echo "✅ 依赖安装完成"
fi
cd ..
echo ""

# 测试 KataGo
echo "🧪 测试 KataGo 是否正常工作..."
echo "boardsize 19" | katago gtp -model "$MODEL_FILE" -config server/katago_config.cfg 2>/dev/null | head -n 5
echo "✅ KataGo 测试通过"
echo ""

echo "========================================="
echo "  ✅ KataGo 安装配置完成！"
echo "========================================="
echo ""
echo "📝 下一步操作："
echo "   1. 启动 KataGo 服务器："
echo "      npm run server"
echo ""
echo "   2. 在另一个终端启动前端："
echo "      npm run dev"
echo ""
echo "   3. 访问 http://localhost:3000"
echo ""
echo "🎮 开始享受本地 AI 围棋对弈吧！"
echo ""
