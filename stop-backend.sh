#!/bin/bash

echo "🛑 正在停止后端服务..."

# 查找并杀死 katagoServer 进程
PIDS=$(pgrep -f "node.*katagoServer")

if [ -z "$PIDS" ]; then
  echo "✅ 没有发现运行中的后端服务"
  exit 0
fi

echo "📋 发现以下进程："
ps aux | grep "[n]ode.*katagoServer"

echo ""
echo "🔪 正在终止进程..."
pkill -f "node.*katagoServer"

# 等待进程终止
sleep 1

# 检查是否还有残留进程
REMAINING=$(pgrep -f "node.*katagoServer")
if [ -z "$REMAINING" ]; then
  echo "✅ 后端服务已成功停止"
else
  echo "⚠️  发现残留进程，强制终止..."
  pkill -9 -f "node.*katagoServer"
  sleep 1
  
  FINAL_CHECK=$(pgrep -f "node.*katagoServer")
  if [ -z "$FINAL_CHECK" ]; then
    echo "✅ 后端服务已强制停止"
  else
    echo "❌ 无法停止后端服务，请手动检查"
    exit 1
  fi
fi
