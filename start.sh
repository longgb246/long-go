#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 启动 LongGo 围棋应用..."
echo ""

# 检查 KataGo 是否存在
if [ ! -f "server/bin/katago" ]; then
    echo "❌ 错误：找不到 KataGo 可执行文件"
    echo "请先运行编译安装 KataGo"
    exit 1
fi

# 检查模型文件是否存在
if [ ! -f "server/models/katago_model.bin.gz" ]; then
    echo "❌ 错误：找不到 KataGo 模型文件"
    exit 1
fi

echo "✅ KataGo 可执行文件: server/bin/katago"
echo "✅ 模型文件: server/models/katago_model.bin.gz"
echo ""

# 启动后端服务器（后台运行）
echo "📡 启动后端服务器 (端口 3001)..."
(cd server && npm start) &
SERVER_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端应用 (端口 3000)..."
echo ""
echo "================================================"
echo "  LongGo 围棋应用已启动！"
echo "  前端地址: http://localhost:3000"
echo "  后端地址: http://localhost:3001"
echo "================================================"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

npm run dev

# 清理：当前端停止时，也停止后端
kill $SERVER_PID 2>/dev/null
