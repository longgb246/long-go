#!/bin/bash

# 同时启动 KataGo 服务器和前端开发服务器

echo "🚀 启动 LongGo 完整服务..."
echo ""

# 检查 KataGo 是否安装
if ! command -v katago &> /dev/null; then
    echo "❌ KataGo 未安装，请先运行安装脚本："
    echo "   bash scripts/setup-katago.sh"
    exit 1
fi

# 检查服务器依赖
if [ ! -d "server/node_modules" ]; then
    echo "📦 安装服务器依赖..."
    cd server && npm install && cd ..
fi

# 检查前端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

echo "✅ 依赖检查完成"
echo ""

# 使用 trap 确保子进程被正确清理
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "🔧 启动 KataGo 服务器 (端口 3001)..."
cd server && npm start &
SERVER_PID=$!

# 等待服务器启动
sleep 3

echo "🎨 启动前端开发服务器 (端口 3000)..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  ✅ 服务启动完成！"
echo "========================================="
echo ""
echo "📍 访问地址："
echo "   前端: http://localhost:3000"
echo "   API:  http://localhost:3001/api/health"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"
echo ""

# 等待任意子进程退出
wait
