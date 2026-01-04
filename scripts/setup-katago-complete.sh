#!/bin/bash

# KataGo 完整安装脚本
# 此脚本会下载模型并提供完整的安装指南

set -e

echo "========================================="
echo "  KataGo 完整安装方案"
echo "========================================="
echo ""

# 创建目录
echo "📁 创建必要的目录..."
mkdir -p server/models
echo "✅ 目录创建完成"
echo ""

# 下载神经网络模型
echo "📥 下载 KataGo 神经网络模型（约 200MB）..."
MODEL_URL="https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz"
MODEL_FILE="server/models/katago_model.bin.gz"

if [ -f "$MODEL_FILE" ]; then
    echo "✅ 模型文件已存在: $MODEL_FILE"
else
    echo "   下载地址: $MODEL_URL"
    echo "   保存位置: $MODEL_FILE"
    if curl -L -o "$MODEL_FILE" "$MODEL_URL"; then
        echo "✅ 模型下载完成"
    else
        echo "❌ 模型下载失败"
        exit 1
    fi
fi
echo ""

# 检查系统和提供方案
echo "🔍 检测您的系统环境..."
echo "   系统: macOS $(sw_vers -productVersion)"
echo ""

echo "========================================="
echo "  由于您的系统无法通过 Homebrew 安装 KataGo"
echo "  我为您准备了以下可行方案："
echo "========================================="
echo ""

echo "方案 1: 从源码编译 KataGo（推荐）"
echo "----------------------------------------"
echo "优点: 获得最新版本，性能最优"
echo "缺点: 需要编译时间（约 10-20 分钟）"
echo ""
echo "步骤:"
echo "1. 安装编译工具:"
echo "   xcode-select --install"
echo "   brew install cmake"
echo ""
echo "2. 运行编译脚本:"
echo "   bash scripts/build-katago-from-source.sh"
echo ""
echo "3. 编译完成后，KataGo 将安装到 ~/katago/bin/katago"
echo ""

echo "方案 2: 使用 Docker（最简单）"
echo "----------------------------------------"
echo "优点: 无需编译，开箱即用"
echo "缺点: 需要安装 Docker Desktop"
echo ""
echo "步骤:"
echo "1. 安装 Docker Desktop for Mac:"
echo "   https://www.docker.com/products/docker-desktop"
echo ""
echo "2. 启动 Docker 服务"
echo ""
echo "3. 运行:"
echo "   docker-compose up -d"
echo ""

echo "方案 3: 手动下载预编译版本"
echo "----------------------------------------"
echo "由于 GitHub 不再提供 macOS 预编译版本，"
echo "您可以尝试从其他源获取，或使用方案 1/2"
echo ""

echo "========================================="
echo "  推荐: 使用方案 1（从源码编译）"
echo "========================================="
echo ""
echo "现在开始吗？(y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "开始检查编译环境..."
    
    # 检查 Xcode Command Line Tools
    if ! xcode-select -p &> /dev/null; then
        echo "❌ 未检测到 Xcode Command Line Tools"
        echo "   正在安装..."
        xcode-select --install
        echo "   请在弹出窗口中完成安装，然后重新运行此脚本"
        exit 1
    else
        echo "✅ Xcode Command Line Tools 已安装"
    fi
    
    # 检查 CMake
    if ! command -v cmake &> /dev/null; then
        echo "❌ 未检测到 CMake"
        echo "   正在通过 Homebrew 安装..."
        brew install cmake
    else
        echo "✅ CMake 已安装: $(cmake --version | head -n 1)"
    fi
    
    echo ""
    echo "✅ 编译环境准备完成"
    echo "   现在运行编译脚本:"
    echo "   bash scripts/build-katago-from-source.sh"
else
    echo ""
    echo "您可以稍后运行相应的方案脚本"
fi

echo ""
echo "========================================="
echo "  模型文件已准备完成"
echo "  位置: $MODEL_FILE"
echo "========================================="
