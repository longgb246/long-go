#!/bin/bash

# KataGo 简化安装脚本 - 适用于无法使用 Homebrew 的 macOS 系统
# 此脚本会下载预编译的 KataGo 和模型文件

set -e

echo "========================================="
echo "  KataGo 简化安装脚本"
echo "========================================="
echo ""

# 创建目录
echo "📁 创建必要的目录..."
mkdir -p ~/katago/bin
mkdir -p ~/katago/models
mkdir -p server/models
echo "✅ 目录创建完成"
echo ""

# 下载神经网络模型
echo "📥 下载 KataGo 神经网络模型..."
MODEL_URL="https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz"
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

# 提示用户手动安装 KataGo
echo "⚠️  由于您的系统无法通过 Homebrew 安装 KataGo，"
echo "   请选择以下方案之一："
echo ""
echo "方案 1: 使用 Python 实现（推荐）"
echo "   我们可以使用纯 Python 实现一个简化版的围棋 AI"
echo "   虽然不如 KataGo 强大，但可以立即使用"
echo ""
echo "方案 2: 从源码编译 KataGo"
echo "   运行: bash scripts/build-katago-from-source.sh"
echo "   需要: Xcode Command Line Tools, CMake"
echo ""
echo "方案 3: 使用 Docker"
echo "   运行: docker-compose up"
echo "   需要: Docker Desktop for Mac"
echo ""
echo "请告诉我您想使用哪个方案，我会帮您配置。"
echo ""
