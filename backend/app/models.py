"""
数据模型定义（使用 Pydantic）
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class AIMove(BaseModel):
    """AI 着法请求"""
    board: List[List[int]] = Field(..., description="棋盘数组，0=空，1=黑，2=白")
    size: int = Field(19, description="棋盘大小")
    player: int = Field(..., description="当前玩家，1=黑，2=白")
    aiLevel: Literal["master", "expert", "intermediate", "beginner"] = Field(
        "master", description="AI 难度等级"
    )


class AIMoveResponse(BaseModel):
    """AI 着法响应"""
    x: int = Field(..., description="着法 X 坐标")
    y: int = Field(..., description="着法 Y 坐标")
    winRate: float = Field(..., description="胜率百分比")
    scoreLead: float = Field(..., description="目数领先")
    visits: Optional[int] = Field(None, description="访问次数")
    order: Optional[int] = Field(None, description="推荐顺序")
    reason: str = Field(..., description="战略理由")


class AIAnalysisRequest(BaseModel):
    """AI 分析请求"""
    board: List[List[int]] = Field(..., description="棋盘数组")
    size: int = Field(19, description="棋盘大小")
    player: int = Field(..., description="当前玩家")


class CandidateMove(BaseModel):
    """候选着法"""
    x: int
    y: int
    winRate: float
    scoreLead: float
    visits: int
    order: int
    reason: str


class AIAnalysisResponse(BaseModel):
    """AI 分析响应"""
    moves: List[CandidateMove] = Field(..., description="候选着法列表")
    bestMove: CandidateMove = Field(..., description="最优着法")


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: Literal["ready", "starting"] = Field(..., description="服务状态")
    message: str = Field(..., description="状态消息")
