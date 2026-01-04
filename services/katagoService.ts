import { Stone, BoardSize, AIHint } from "../types";

const KATAGO_API_URL = 'http://localhost:3001/api';

// 等待 KataGo 服务就绪
const waitForKataGoReady = async (maxRetries: number = 10, retryDelay: number = 1000): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const healthResponse = await fetch(`${KATAGO_API_URL}/health`);
      const healthData = await healthResponse.json();
      
      if (healthData.status === 'ready') {
        console.log('[KataGo] 服务已就绪');
        return true;
      }
      
      console.log(`[KataGo] 等待服务启动... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } catch (error) {
      console.warn(`[KataGo] 健康检查失败 (${i + 1}/${maxRetries}):`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
};

export const getAIMove = async (
  board: Stone[][],
  size: BoardSize,
  player: Stone,
  aiLevel: string = 'master'
): Promise<AIHint | null> => {
  try {
    // 等待 KataGo 服务就绪（最多等待 10 秒）
    const isReady = await waitForKataGoReady();
    
    if (!isReady) {
      console.error('[KataGo] 服务启动超时，请检查后端服务');
      return null;
    }
    
    console.log('[KataGo] 正在请求 AI 着法...');

    // 将 Stone 枚举转换为数字格式 (0=空, 1=黑, 2=白)
    const boardData = board.map(row => 
      row.map(cell => {
        if (cell === Stone.BLACK) return 1;
        if (cell === Stone.WHITE) return 2;
        return 0;
      })
    );

    // 请求 AI 分析
    const response = await fetch(`${KATAGO_API_URL}/ai-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board: boardData,
        size: size,
        player: player === Stone.BLACK ? 1 : 2,
        aiLevel: aiLevel
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[KataGo] API 请求失败:', error);
      console.error('[KataGo] HTTP 状态码:', response.status);
      return null;
    }

    const data = await response.json();
    
    console.log('[KataGo] AI 着法:', `(${data.x}, ${data.y})`, `胜率: ${data.winRate}%`);
    
    return {
      x: data.x,
      y: data.y,
      winRate: data.winRate,
      scoreLead: data.scoreLead,
      visits: data.visits,
      order: data.order,
      reason: data.reason
    };
  } catch (error) {
    console.error('[KataGo] 服务连接错误:', error);
    console.error('[KataGo] 请确保后端服务运行在 http://localhost:3001');
    return null;
  }
};

// 获取多步推荐分析
export const getAIAnalysis = async (
  board: Stone[][],
  size: BoardSize,
  player: Stone
): Promise<{ moves: AIHint[]; bestMove: AIHint } | null> => {
  try {
    // 等待 KataGo 服务就绪（最多等待 10 秒）
    const isReady = await waitForKataGoReady();
    
    if (!isReady) {
      console.error('[KataGo] 服务启动超时，请检查后端服务');
      return null;
    }
    
    console.log('[KataGo] 正在请求多步推荐分析...');

    // 将 Stone 枚举转换为数字格式 (0=空, 1=黑, 2=白)
    const boardData = board.map(row => 
      row.map(cell => {
        if (cell === Stone.BLACK) return 1;
        if (cell === Stone.WHITE) return 2;
        return 0;
      })
    );

    // 请求 AI 多步分析
    const response = await fetch(`${KATAGO_API_URL}/ai-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board: boardData,
        size: size,
        player: player === Stone.BLACK ? 1 : 2
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[KataGo] API 请求失败:', error);
      console.error('[KataGo] HTTP 状态码:', response.status);
      return null;
    }

    const data = await response.json();
    
    console.log('[KataGo] 收到', data.moves.length, '个候选着法');
    console.log('[KataGo] 详细数据:', data.moves);
    data.moves.forEach((move: any, index: number) => {
      console.log(`[KataGo] Move ${index}: (${move.x}, ${move.y}), order: ${move.order}, winRate: ${move.winRate}%`);
    });
    
    return {
      moves: data.moves.map((move: any) => ({
        x: move.x,
        y: move.y,
        winRate: move.winRate,
        scoreLead: move.scoreLead,
        visits: move.visits,
        order: move.order,
        reason: move.reason
      })),
      bestMove: {
        x: data.bestMove.x,
        y: data.bestMove.y,
        winRate: data.bestMove.winRate,
        scoreLead: data.bestMove.scoreLead,
        visits: data.bestMove.visits,
        order: data.bestMove.order,
        reason: data.bestMove.reason
      }
    };
  } catch (error) {
    console.error('[KataGo] 服务连接错误:', error);
    console.error('[KataGo] 请确保后端服务运行在 http://localhost:3001');
    return null;
  }
};
