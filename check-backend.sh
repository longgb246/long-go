#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 检查 KataGo 后端服务状态...${NC}"
echo ""

# 1. 检查进程
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 进程检查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

NODE_PROCESS=$(ps aux | grep -E "node.*katagoServer" | grep -v grep)
KATAGO_PROCESS=$(ps aux | grep -E "katago.*gtp" | grep -v grep)

if [ -z "$NODE_PROCESS" ]; then
    echo -e "${RED}❌ Node.js 后端进程未运行${NC}"
    NODE_RUNNING=false
else
    echo -e "${GREEN}✅ Node.js 后端进程正在运行${NC}"
    echo "$NODE_PROCESS" | awk '{printf "   PID: %s, CPU: %s%%, MEM: %s%%\n", $2, $3, $4}'
    NODE_RUNNING=true
fi

echo ""

if [ -z "$KATAGO_PROCESS" ]; then
    echo -e "${RED}❌ KataGo 进程未运行${NC}"
    KATAGO_RUNNING=false
else
    echo -e "${GREEN}✅ KataGo 进程正在运行${NC}"
    echo "$KATAGO_PROCESS" | awk '{printf "   PID: %s, CPU: %s%%, MEM: %s%%\n", $2, $3, $4}'
    KATAGO_RUNNING=true
fi

echo ""

# 2. 检查端口
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔌 端口检查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PORT_3001=$(lsof -Pi :3001 -sTCP:LISTEN -t 2>/dev/null)

if [ -z "$PORT_3001" ]; then
    echo -e "${RED}❌ 端口 3001 未被监听${NC}"
    PORT_LISTENING=false
else
    echo -e "${GREEN}✅ 端口 3001 正在监听${NC}"
    lsof -Pi :3001 -sTCP:LISTEN | tail -n +2 | awk '{printf "   进程: %s (PID: %s)\n", $1, $2}'
    PORT_LISTENING=true
fi

echo ""

# 3. 检查健康状态
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏥 健康检查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)

if [ -z "$HEALTH_RESPONSE" ]; then
    echo -e "${RED}❌ 无法连接到健康检查接口${NC}"
    echo "   URL: http://localhost:3001/api/health"
    HEALTH_OK=false
else
    STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    MESSAGE=$(echo $HEALTH_RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "ready" ]; then
        echo -e "${GREEN}✅ 服务状态: $STATUS${NC}"
        echo -e "   消息: $MESSAGE"
        HEALTH_OK=true
    elif [ "$STATUS" = "starting" ]; then
        echo -e "${YELLOW}⚠️  服务状态: $STATUS${NC}"
        echo -e "   消息: $MESSAGE"
        HEALTH_OK=false
    else
        echo -e "${RED}❌ 服务状态: $STATUS${NC}"
        echo -e "   消息: $MESSAGE"
        HEALTH_OK=false
    fi
    
    echo ""
    echo "   完整响应:"
    echo "   $HEALTH_RESPONSE" | sed 's/^/   /'
fi

echo ""

# 4. 测试 AI 请求
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🤖 AI 功能测试${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$HEALTH_OK" = true ]; then
    echo "正在测试 AI 请求..."
    
    AI_RESPONSE=$(curl -s -X POST http://localhost:3001/api/genmove \
        -H "Content-Type: application/json" \
        -d '{"boardSize":19,"player":2,"moves":[]}' 2>/dev/null)
    
    if [ -z "$AI_RESPONSE" ]; then
        echo -e "${RED}❌ AI 请求失败（无响应）${NC}"
    else
        MOVE=$(echo $AI_RESPONSE | grep -o '"move":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "$MOVE" ] && [ "$MOVE" != "null" ]; then
            echo -e "${GREEN}✅ AI 功能正常${NC}"
            echo "   返回着法: $MOVE"
        else
            echo -e "${RED}❌ AI 返回了空着法${NC}"
            echo "   响应: $AI_RESPONSE"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  跳过 AI 测试（服务未就绪）${NC}"
fi

echo ""

# 5. 检查文件
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 文件检查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FILES_OK=true

if [ -f "server/bin/katago" ]; then
    echo -e "${GREEN}✅ KataGo 可执行文件存在${NC}"
    ls -lh server/bin/katago | awk '{printf "   大小: %s, 修改时间: %s %s %s\n", $5, $6, $7, $8}'
else
    echo -e "${RED}❌ KataGo 可执行文件不存在${NC}"
    echo "   路径: server/bin/katago"
    FILES_OK=false
fi

echo ""

if [ -f "server/models/katago_model.bin.gz" ]; then
    echo -e "${GREEN}✅ KataGo 模型文件存在${NC}"
    ls -lh server/models/katago_model.bin.gz | awk '{printf "   大小: %s, 修改时间: %s %s %s\n", $5, $6, $7, $8}'
else
    echo -e "${RED}❌ KataGo 模型文件不存在${NC}"
    echo "   路径: server/models/katago_model.bin.gz"
    FILES_OK=false
fi

echo ""

if [ -f "server/katago_config.cfg" ]; then
    echo -e "${GREEN}✅ KataGo 配置文件存在${NC}"
    ls -lh server/katago_config.cfg | awk '{printf "   大小: %s, 修改时间: %s %s %s\n", $5, $6, $7, $8}'
else
    echo -e "${RED}❌ KataGo 配置文件不存在${NC}"
    echo "   路径: server/katago_config.cfg"
    FILES_OK=false
fi

echo ""

# 6. 总结
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 状态总结${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ALL_OK=true

if [ "$NODE_RUNNING" = true ]; then
    echo -e "${GREEN}✅ Node.js 进程${NC}"
else
    echo -e "${RED}❌ Node.js 进程${NC}"
    ALL_OK=false
fi

if [ "$KATAGO_RUNNING" = true ]; then
    echo -e "${GREEN}✅ KataGo 进程${NC}"
else
    echo -e "${RED}❌ KataGo 进程${NC}"
    ALL_OK=false
fi

if [ "$PORT_LISTENING" = true ]; then
    echo -e "${GREEN}✅ 端口监听${NC}"
else
    echo -e "${RED}❌ 端口监听${NC}"
    ALL_OK=false
fi

if [ "$HEALTH_OK" = true ]; then
    echo -e "${GREEN}✅ 健康检查${NC}"
else
    echo -e "${RED}❌ 健康检查${NC}"
    ALL_OK=false
fi

if [ "$FILES_OK" = true ]; then
    echo -e "${GREEN}✅ 必需文件${NC}"
else
    echo -e "${RED}❌ 必需文件${NC}"
    ALL_OK=false
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 后端服务运行正常！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ 后端服务存在问题${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 建议操作：${NC}"
    
    if [ "$NODE_RUNNING" = false ] || [ "$KATAGO_RUNNING" = false ]; then
        echo "  1. 启动后端服务: ${GREEN}./start-backend.sh${NC}"
    fi
    
    if [ "$FILES_OK" = false ]; then
        echo "  2. 检查并安装必需文件"
    fi
    
    if [ "$HEALTH_OK" = false ] && [ "$NODE_RUNNING" = true ]; then
        echo "  3. 查看日志: ${GREEN}tail -f server/logs/katago.log${NC}"
        echo "  4. 重启服务: ${GREEN}pkill -f 'node.*katagoServer' && ./start-backend.sh${NC}"
    fi
    
    exit 1
fi
