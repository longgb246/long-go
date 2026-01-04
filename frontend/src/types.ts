
export enum Stone {
  NONE = 0,
  BLACK = 1,
  WHITE = 2
}

export enum GameMode {
  HUMAN_VS_HUMAN = 'PvP',
  HUMAN_VS_AI = 'PvE'
}

export enum AILevel {
  MASTER = 'master',    // 大师：最优着法
  EXPERT = 'expert',    // 高手：次优着法
  INTERMEDIATE = 'intermediate', // 中级：第三着法
  BEGINNER = 'beginner' // 初级：第四、第五着法
}

export type BoardSize = 9 | 13 | 19;

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  board: Stone[][];
  size: BoardSize;
  currentPlayer: Stone;
  history: Stone[][][];
  lastMove: Point | null;
  mode: GameMode;
  playerColor: Stone; // 人机博弈时，玩家执子颜色（BLACK 或 WHITE）
  aiLevel: AILevel;   // AI 难度等级
  isGameOver: boolean;
  captures: { [Stone.BLACK]: number; [Stone.WHITE]: number };
}

export interface AIHint {
  x: number;
  y: number;
  reason: string;
  winRate: number;    // 0-100 胜率
  scoreLead: number;  // 领先目数，正数为当前棋手领先
  visits?: number;    // 访问次数
  order?: number;     // 排名（0=最优，1=次优...）
}

// 多步推荐分析结果
export interface AIAnalysis {
  moves: AIHint[];    // 多个候选着法，按优先级排序
  bestMove: AIHint;   // 最优着法
}
