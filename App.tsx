
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stone, GameMode, BoardSize, Point, GameState, AIHint } from './types';
import { createEmptyBoard, checkMove } from './logic/goEngine';
import { getAIMove } from './services/geminiService';
import Board from './components/Board';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    board: createEmptyBoard(19),
    size: 19,
    currentPlayer: Stone.BLACK,
    history: [],
    lastMove: null,
    mode: GameMode.HUMAN_VS_AI,
    isGameOver: false,
    captures: { [Stone.BLACK]: 0, [Stone.WHITE]: 0 }
  });

  const [aiHint, setAiHint] = useState<AIHint | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [log, setLog] = useState<string[]>(["[系统] 棋局初始化完成。"]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const addLog = (msg: string) => {
    setLog(prev => [...prev, msg].slice(-50));
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const handleMove = useCallback((x: number, y: number) => {
    if (state.isGameOver || isThinking) return;

    const { valid, captures } = checkMove(state.board, x, y, state.currentPlayer);
    if (!valid) {
      addLog("[警告] 禁着点或已有子。");
      return;
    }

    const newBoard = state.board.map(row => [...row]);
    newBoard[y][x] = state.currentPlayer;
    
    captures.forEach(p => {
      newBoard[p.y][p.x] = Stone.NONE;
    });

    const nextPlayer = state.currentPlayer === Stone.BLACK ? Stone.WHITE : Stone.BLACK;

    setState(prev => ({
      ...prev,
      board: newBoard,
      lastMove: { x, y },
      currentPlayer: nextPlayer,
      captures: {
        ...prev.captures,
        [prev.currentPlayer]: prev.captures[prev.currentPlayer] + captures.length
      },
      history: [...prev.history, prev.board]
    }));

    setAiHint(null);
    const coordStr = `${"ABCDEFGHJKLMNOPQRST"[x]}${state.size - y}`;
    addLog(`[落子] ${state.currentPlayer === Stone.BLACK ? '黑' : '白'}方 -> ${coordStr}`);
  }, [state, isThinking]);

  // AI 自动走棋逻辑
  useEffect(() => {
    if (state.mode === GameMode.HUMAN_VS_AI && state.currentPlayer === Stone.WHITE && !state.isGameOver) {
      const triggerAI = async () => {
        setIsThinking(true);
        const result = await getAIMove(state.board, state.size, Stone.WHITE);
        setIsThinking(false);
        if (result) {
          handleMove(result.x, result.y);
          setAiHint(result); // AI 走完也更新一下分析数据
        } else {
          addLog("[系统] 白方停着。");
          setState(prev => ({ ...prev, currentPlayer: Stone.BLACK }));
        }
      };
      const timer = setTimeout(triggerAI, 600);
      return () => clearTimeout(timer);
    }
  }, [state.currentPlayer, state.mode, state.board, state.size, state.isGameOver, handleMove]);

  const requestHint = async () => {
    if (isThinking || state.isGameOver) return;
    setIsThinking(true);
    addLog("[分析] 引擎正在计算当前最优解...");
    const hint = await getAIMove(state.board, state.size, state.currentPlayer, true);
    setIsThinking(false);
    if (hint) {
      setAiHint(hint);
      addLog(`[分析] 建议落子 ${"ABCDEFGHJKLMNOPQRST"[hint.x]}${state.size - hint.y}，胜率: ${hint.winRate}%`);
    }
  };

  const resetGame = (newSize: BoardSize = state.size, newMode: GameMode = state.mode) => {
    setState({
      board: createEmptyBoard(newSize),
      size: newSize,
      currentPlayer: Stone.BLACK,
      history: [],
      lastMove: null,
      mode: newMode,
      isGameOver: false,
      captures: { [Stone.BLACK]: 0, [Stone.WHITE]: 0 }
    });
    setAiHint(null);
    setLog(["[系统] 棋局重开，黑方先行。"]);
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-[#fdfaf5] overflow-hidden">
      
      <aside className="w-full lg:w-[360px] shrink-0 border-r border-[#d1c4a9] flex flex-col glass-panel z-50">
        
        <div className="p-6 space-y-5">
          <header className="border-b border-[#d1c4a9] pb-4">
            <h1 className="text-4xl font-bold chinese-font text-[#5d4037]">渐进围棋</h1>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] tracking-[0.2em] text-[#8b7355] opacity-70">LONG GO ENGINE PRO</span>
              <span className="bg-[#5d4037] text-white text-[9px] px-2 py-0.5 rounded-full">v0.1 Analysis</span>
            </div>
          </header>

          <section className="space-y-3">
            <div className="flex gap-1">
              {[9, 13, 19].map(s => (
                <button key={s} onClick={() => resetGame(s as BoardSize)} className={`flex-1 py-2 rounded font-bold text-xs border ${state.size === s ? 'bg-[#5d4037] text-white' : 'bg-white/40 border-[#d1c4a9] text-[#5d4037]'}`}>
                  {s}路
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {[GameMode.HUMAN_VS_AI, GameMode.HUMAN_VS_HUMAN].map(m => (
                <button key={m} onClick={() => resetGame(state.size, m)} className={`flex-1 py-2 rounded font-bold text-xs border ${state.mode === m ? 'bg-[#5d4037] text-white' : 'bg-white/40 border-[#d1c4a9] text-[#5d4037]'}`}>
                  {m === GameMode.HUMAN_VS_AI ? '引擎分析' : '双人对弈'}
                </button>
              ))}
            </div>
            <button onClick={requestHint} disabled={isThinking} className="w-full bg-[#8b7355] hover:bg-[#5d4037] text-white py-3 rounded-lg font-serif font-bold text-md shadow-lg transition-all active:scale-95 disabled:opacity-50">
              {isThinking ? '正在拆解棋局...' : '请求引擎分析 (KataMode)'}
            </button>
          </section>

          {/* 专业引擎数据面板 */}
          <section className="bg-black/5 p-4 rounded-xl border border-black/10 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-[#5d4037]">
                <span>黑胜率 {aiHint ? (state.currentPlayer === Stone.BLACK ? aiHint.winRate : 100 - aiHint.winRate).toFixed(1) : '50.0'}%</span>
                <span>白胜率 {aiHint ? (state.currentPlayer === Stone.WHITE ? aiHint.winRate : 100 - aiHint.winRate).toFixed(1) : '50.0'}%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden flex shadow-inner">
                <div 
                  className="h-full bg-black transition-all duration-700" 
                  style={{ width: `${aiHint ? (state.currentPlayer === Stone.BLACK ? aiHint.winRate : 100 - aiHint.winRate) : 50}%` }} 
                />
                <div className="h-full bg-neutral-300 flex-1" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <div className="text-[9px] text-gray-500 uppercase">目数估计</div>
                <div className="text-xl font-bold chinese-font">
                  {aiHint ? `${aiHint.scoreLead > 0 ? '+' : ''}${aiHint.scoreLead.toFixed(1)}` : '0.0'}
                </div>
              </div>
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <div className="text-[9px] text-gray-500 uppercase">当前提子</div>
                <div className="text-xl font-bold chinese-font">{state.captures[Stone.BLACK] - state.captures[Stone.WHITE]}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 flex flex-col border-t border-[#d1c4a9] bg-white/30 overflow-hidden">
          <div className="px-6 py-3 border-b border-[#d1c4a9]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-[#8b7355] uppercase">Engine Log</span>
            </div>
            {aiHint && <span className="text-[9px] text-red-600 font-bold">最优解: ${"ABCDEFGHJKLMNOPQRST"[aiHint.x]}${state.size - aiHint.y}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-3">
              {log.map((m, i) => (
                <p key={i} className={`text-xs leading-relaxed ${i === log.length - 1 ? 'text-[#5d4037] font-bold border-l-2 border-[#5d4037] pl-3' : 'text-[#8b7355] opacity-60 pl-3'}`}>
                  {m}
                </p>
              ))}
              {aiHint && (
                <div className="mt-2 p-3 bg-[#5d4037]/5 rounded-lg border-l-4 border-[#5d4037]">
                  <p className="text-[11px] font-bold text-[#5d4037] mb-1 underline">棋圣拆解：</p>
                  <p className="text-[11px] text-[#5d4037] leading-relaxed italic">{aiHint.reason}</p>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex items-center justify-center p-6 lg:p-12">
        <Board 
          size={state.size}
          board={state.board}
          onMove={handleMove}
          lastMove={state.lastMove}
          hint={aiHint}
        />
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1c4a9; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
