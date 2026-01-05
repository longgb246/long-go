"""
FastAPI 主应用
提供 API 端点
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

from .models import (
    AIMove,
    AIMoveResponse,
    AIAnalysisRequest,
    AIAnalysisResponse,
    HealthResponse,
)
from .katago_manager import KataGoManager

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局 KataGo 管理器实例
katago_manager: KataGoManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global katago_manager

    # 启动时初始化 KataGo
    logger.info("正在启动 KataGo 服务...")
    katago_manager = KataGoManager()
    await katago_manager.start()

    yield

    # 关闭时停止 KataGo
    logger.info("正在停止 KataGo 服务...")
    if katago_manager:
        await katago_manager.stop()


# 创建 FastAPI 应用
app = FastAPI(
    title="KataGo API Server",
    description="围棋 AI 服务器（Python 版本）",
    version="2.0.0",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    健康检查端点

    Returns:
        服务状态信息
    """
    if katago_manager and katago_manager.is_ready:
        return HealthResponse(status="ready", message="KataGo 运行正常")
    else:
        return HealthResponse(status="starting", message="KataGo 正在启动")


@app.post("/api/ai-move", response_model=AIMoveResponse)
async def get_ai_move(request: AIMove):
    """
    获取 AI 着法（支持难度等级）

    Args:
        request: AI 着法请求

    Returns:
        AI 推荐的着法

    Raises:
        HTTPException: 当服务不可用或处理失败时
    """
    if not katago_manager or not katago_manager.is_ready:
        raise HTTPException(status_code=503, detail="KataGo 未就绪，请稍后重试")

    # 使用请求锁防止并发请求
    async with katago_manager.request_lock:
        try:
            result = await katago_manager.get_ai_move(
                board=request.board,
                size=request.size,
                player=request.player,
                ai_level=request.aiLevel,
            )

            return AIMoveResponse(**result)

        except Exception as e:
            logger.error(f"处理 AI 请求时出错: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-analysis", response_model=AIAnalysisResponse)
async def get_ai_analysis(request: AIAnalysisRequest):
    """
    获取多步推荐分析（用于学习）

    Args:
        request: AI 分析请求

    Returns:
        多个候选着法及最优着法

    Raises:
        HTTPException: 当服务不可用或处理失败时
    """
    logger.info("📥 [API] 收到多步推荐分析请求")

    if not katago_manager or not katago_manager.is_ready:
        raise HTTPException(status_code=503, detail="KataGo 未就绪，请稍后重试")

    # 使用请求锁防止并发请求
    async with katago_manager.request_lock:
        try:
            result = await katago_manager.get_ai_analysis(
                board=request.board, size=request.size, player=request.player
            )

            return AIAnalysisResponse(**result)

        except Exception as e:
            logger.error(f"处理分析请求时出错: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "KataGo API Server (Python)",
        "version": "2.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3002)
