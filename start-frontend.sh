#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}🚀 启动前端应用...${NC}"
echo ""

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：找不到 package.json${NC}"
    exit 1
fi

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules 不存在，正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ 依赖检查完成${NC}"
echo ""

# 检查端口是否被占用
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  端口 5173 已被占用，正在停止旧进程...${NC}"
    pkill -f "vite" 2>/dev/null
    sleep 2
fi

# 检查后端是否运行
echo -e "${BLUE}🔍 检查后端服务...${NC}"
BACKEND_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null)

if [ -z "$BACKEND_CHECK" ]; then
    echo -e "${YELLOW}⚠️  后端服务未运行${NC}"
    echo ""
    echo "请先启动后端服务："
    echo -e "  ${GREEN}./start-backend.sh${NC}"
    echo ""
    read -p "是否继续启动前端？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    STATUS=$(echo $BACKEND_CHECK | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "ready" ]; then
        echo -e "${GREEN}✅ 后端服务已就绪${NC}"
    else
        echo -e "${YELLOW}⚠️  后端服务状态: $STATUS${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🎨 启动前端开发服务器...${NC}"
echo ""
echo "================================================"
echo -e "  ${GREEN}前端应用启动中...${NC}"
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:3001"
echo "================================================"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 启动前端
npm run dev
