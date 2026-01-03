
export enum Stone {
  NONE = 0,
  BLACK = 1,
  WHITE = 2
}

export enum GameMode {
  HUMAN_VS_HUMAN = 'PvP',
  HUMAN_VS_AI = 'PvE'
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
  isGameOver: boolean;
  captures: { [Stone.BLACK]: number; [Stone.WHITE]: number };
}

export interface AIHint {
  x: number;
  y: number;
  reason: string;
  winRate: number;    // 0-100 胜率
  scoreLead: number;  // 领先目数，正数为当前棋手领先
}
