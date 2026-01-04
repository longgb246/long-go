#!/bin/bash

# KataGo v1.16.0 快速安装脚本（macOS）
# 适用于无法通过 Homebrew 安装的情况

set -e

echo "========================================="
echo "  KataGo v1.16.0 快速安装脚本"
echo "========================================="
echo ""

# 检查系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本仅适用于 macOS 系统"
    exit 1
fi

echo "✅ 系统检查通过：macOS"
echo ""

# 创建安装目录
echo "📁 创建安装目录..."
mkdir -p ~/katago/bin
mkdir -p ~/katago/models
echo "✅ 目录创建完成"
echo ""

# 下载 KataGo 可执行文件
echo "📥 下载 KataGo v1.16.0 (OpenCL 版本)..."
cd ~/katago

if command -v curl &> /dev/null; then
    echo "   使用 curl 下载..."
    curl -L https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip -o katago.zip
    
    # 如果下载失败，尝试使用镜像
    if [ $? -ne 0 ] || [ ! -s katago.zip ]; then
        echo "   GitHub 下载失败，尝试使用镜像..."
        curl -L https://ghproxy.com/https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip -o katago.zip
    fi
else
    echo "❌ 未找到 curl 命令"
    exit 1
fi

# 检查下载是否成功
if [ ! -f katago.zip ] || [ ! -s katago.zip ]; then
    echo "❌ 下载失败，请手动下载："
    echo "   https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip"
    exit 1
fi

echo "✅ KataGo 下载完成"
echo ""

# 解压
echo "📦 解压文件..."
unzip -o katago.zip
mv katago bin/
chmod +x bin/katago
rm katago.zip
echo "✅ 解压完成"
echo ""

# 添加到 PATH
echo "⚙️  配置环境变量..."
if ! grep -q 'export PATH="$HOME/katago/bin:$PATH"' ~/.zshrc; then
    echo 'export PATH="$HOME/katago/bin:$PATH"' >> ~/.zshrc
    echo "✅ 已添加到 ~/.zshrc"
else
    echo "✅ PATH 已配置"
fi
echo ""

# 重新加载配置
export PATH="$HOME/katago/bin:$PATH"

# 验证安装
echo "🧪 验证 KataGo 安装..."
if ~/katago/bin/katago version; then
    echo "✅ KataGo 安装成功！"
else
    echo "❌ KataGo 验证失败"
    exit 1
fi
echo ""

# 下载神经网络模型
echo "📥 下载神经网络模型（约 200MB，可能需要几分钟）..."
cd ~/katago/models

if [ -f "kata1-b18c384nbt-s7709731328-d3715293823.bin.gz" ]; then
    echo "✅ 模型文件已存在，跳过下载"
else
    echo "   正在下载..."
    curl -L https://media.githubusercontent.com/media/lightvector/KataGo/master/python/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -o kata1-b18c384nbt-s7709731328-d3715293823.bin.gz
    
    # 如果下载失败，尝试使用镜像
    if [ $? -ne 0 ] || [ ! -s kata1-b18c384nbt-s7709731328-d3715293823.bin.gz ]; then
        echo "   GitHub 下载失败，尝试使用镜像..."
        curl -L https://ghproxy.com/https://media.githubusercontent.com/media/lightvector/KataGo/master/python/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -o kata1-b18c384nbt-s7709731328-d3715293823.bin.gz
    fi
    
    if [ -f "kata1-b18c384nbt-s7709731328-d3715293823.bin.gz" ] && [ -s "kata1-b18c384nbt-s7709731328-d3715293823.bin.gz" ]; then
        echo "✅ 模型下载完成"
    else
        echo "⚠️  模型下载失败，请手动下载："
        echo "   https://media.githubusercontent.com/media/lightvector/KataGo/master/python/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz"
        echo "   下载后放到：~/katago/models/"
    fi
fi
echo ""

# 生成配置文件
echo "⚙️  生成 KataGo 配置文件..."
cd ~/katago
if [ -f "gtp_config.cfg" ]; then
    echo "✅ 配置文件已存在，跳过生成"
else
    ~/katago/bin/katago genconfig -model models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -output gtp_config.cfg
    echo "✅ 配置文件生成完成"
fi
echo ""

# 配置项目
echo "🔧 配置 LongGo 项目..."
PROJECT_DIR="/Users/longguangbin/0_Work/Codes/git_codes/long-go"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    
    # 创建项目模型目录
    mkdir -p server/models
    
    # 复制文件到项目
    echo "   复制模型文件..."
    cp ~/katago/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz server/models/katago_model.bin.gz
    
    echo "   复制配置文件..."
    cp ~/katago/gtp_config.cfg server/katago_config.cfg
    
    # 安装服务器依赖
    if [ -d "server" ] && [ -f "server/package.json" ]; then
        echo "   安装服务器依赖..."
        cd server && npm install && cd ..
        echo "✅ 服务器依赖安装完成"
    fi
    
    echo "✅ 项目配置完成"
else
    echo "⚠️  项目目录不存在：$PROJECT_DIR"
    echo "   请手动复制文件："
    echo "   cp ~/katago/models/*.bin.gz $PROJECT_DIR/server/models/katago_model.bin.gz"
    echo "   cp ~/katago/gtp_config.cfg $PROJECT_DIR/server/katago_config.cfg"
fi
echo ""

echo "========================================="
echo "  ✅ KataGo 安装完成！"
echo "========================================="
echo ""
echo "📝 安装信息："
echo "   KataGo 路径: ~/katago/bin/katago"
echo "   模型路径: ~/katago/models/"
echo "   配置文件: ~/katago/gtp_config.cfg"
echo ""
echo "🚀 下一步操作："
echo "   1. 重新打开终端或运行: source ~/.zshrc"
echo "   2. 验证安装: katago version"
echo "   3. 启动项目:"
echo "      cd $PROJECT_DIR"
echo "      bash scripts/start-all.sh"
echo ""
echo "   或者分别启动："
echo "      终端 1: npm run server"
echo "      终端 2: npm run dev"
echo ""
echo "   然后访问: http://localhost:3000"
echo ""
echo "🎮 开始享受本地 AI 围棋对弈吧！"
echo ""
