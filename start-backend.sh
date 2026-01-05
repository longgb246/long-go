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

echo -e "${BLUE}🚀 启动 KataGo 后端服务...${NC}"
echo ""

# 检查 KataGo 是否存在
if [ ! -f "backend/bin/katago" ]; then
    echo -e "${RED}❌ 错误：找不到 KataGo 可执行文件${NC}"
    echo "   路径: backend/bin/katago"
    exit 1
fi

# 检查模型文件是否存在
if [ ! -f "backend/models/katago_model.bin.gz" ]; then
    echo -e "${RED}❌ 错误：找不到 KataGo 模型文件${NC}"
    echo "   路径: backend/models/katago_model.bin.gz"
    exit 1
fi

# 检查配置文件是否存在
if [ ! -f "backend/katago_config.cfg" ]; then
    echo -e "${RED}❌ 错误：找不到 KataGo 配置文件${NC}"
    echo "   路径: backend/katago_config.cfg"
    exit 1
fi

echo -e "${GREEN}✅ KataGo 可执行文件: backend/bin/katago${NC}"
echo -e "${GREEN}✅ 模型文件: backend/models/katago_model.bin.gz${NC}"
echo -e "${GREEN}✅ 配置文件: backend/katago_config.cfg${NC}"
echo ""

# 查找可用端口的函数
find_available_port() {
    local start_port=$1
    local max_port=$((start_port + 100))
    
    for port in $(seq $start_port $max_port); do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    
    return 1
}

# 默认端口
DEFAULT_PORT=3001
BACKEND_PORT=$(find_available_port $DEFAULT_PORT)

if [ -z "$BACKEND_PORT" ]; then
    echo -e "${RED}❌ 错误：无法找到可用端口（尝试范围：${DEFAULT_PORT}-$((DEFAULT_PORT + 100))）${NC}"
    exit 1
fi

if [ "$BACKEND_PORT" != "$DEFAULT_PORT" ]; then
    echo -e "${YELLOW}⚠️  默认端口 ${DEFAULT_PORT} 已被占用，自动切换到端口 ${BACKEND_PORT}${NC}"
else
    echo -e "${GREEN}✅ 使用端口: ${BACKEND_PORT}${NC}"
fi
echo ""

# 检查 Python 虚拟环境
if [ ! -d "backend/.venv" ]; then
    echo -e "${YELLOW}⚠️  Python 虚拟环境不存在，正在创建...${NC}"
    cd backend
    python3 -m venv .venv
    echo -e "${GREEN}✅ 虚拟环境创建成功${NC}"
    cd ..
fi

# 检查依赖是否已安装
if [ ! -f "backend/.venv/lib/python*/site-packages/fastapi/__init__.py" ]; then
    echo -e "${YELLOW}⚠️  正在安装 Python 依赖...${NC}"
    cd backend
    .venv/bin/pip install -q -r requirements.txt
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
    cd ..
fi

# 启动后端服务器（Python 版本）
echo -e "${BLUE}📡 启动 Python 后端服务器 (端口 ${BACKEND_PORT})...${NC}"
cd backend
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT &
SERVER_PID=$!
cd ..

echo -e "${YELLOW}⏳ 等待服务启动...${NC}"

# 等待并检测服务是否启动成功
MAX_RETRIES=15
RETRY_COUNT=0
SERVICE_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    # 检查进程是否还在运行
    if ! ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ 后端进程异常退出！${NC}"
        echo ""
        echo "请检查日志："
        echo "  tail -f backend/logs/katago.log"
        exit 1
    fi
    
    # 检查健康状态
    HEALTH_CHECK=$(curl -s http://localhost:$BACKEND_PORT/api/health 2>/dev/null)
    
    if [ ! -z "$HEALTH_CHECK" ]; then
        STATUS=$(echo $HEALTH_CHECK | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$STATUS" = "ready" ]; then
            SERVICE_READY=true
            break
        elif [ "$STATUS" = "starting" ]; then
            echo -e "${YELLOW}   [${RETRY_COUNT}/${MAX_RETRIES}] KataGo 正在初始化...${NC}"
        fi
    else
        echo -e "${YELLOW}   [${RETRY_COUNT}/${MAX_RETRIES}] 等待服务响应...${NC}"
    fi
done

echo ""

if [ "$SERVICE_READY" = true ]; then
    echo -e "${GREEN}✅ 后端服务启动成功！${NC}"
    echo ""
    echo "================================================"
    echo -e "  ${GREEN}KataGo 后端服务已就绪${NC}"
    echo "  后端地址: http://localhost:$BACKEND_PORT"
    echo "  健康检查: http://localhost:$BACKEND_PORT/api/health"
    echo "  进程 PID: $SERVER_PID"
    echo "================================================"
    echo ""
    echo -e "${BLUE}💡 提示：${NC}"
    echo "  - 使用 ${YELLOW}./check-backend.sh${NC} 检查服务状态"
    echo "  - 使用 ${YELLOW}pkill -f 'uvicorn.*app.main'${NC} 停止服务"
    echo "  - API 文档: ${YELLOW}http://localhost:$BACKEND_PORT/docs${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    echo ""
    
    # 保持进程运行
    wait $SERVER_PID
else
    echo -e "${RED}❌ 后端服务启动超时（${MAX_RETRIES}秒）${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. KataGo 模型加载失败"
    echo "  2. 端口 $BACKEND_PORT 被占用"
    echo "  3. 配置文件错误"
    echo ""
    echo "请检查："
    echo "  - 运行 ${YELLOW}./check-backend.sh${NC} 查看详细状态"
    echo "  - 查看日志: ${YELLOW}tail -f backend/logs/katago.log${NC}"
    
    # 停止进程
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
