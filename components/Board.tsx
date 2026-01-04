import React from 'react';
import { Stone as StoneType, Point, BoardSize, AIHint } from '../types';
import Stone from './Stone';

interface BoardProps {
  size: BoardSize;
  board: StoneType[][];
  onMove: (x: number, y: number) => void;
  lastMove: Point | null;
  hints: AIHint[];
  isThinking?: boolean;
  isPlayerTurn?: boolean;
}

const Board: React.FC<BoardProps> = ({ size, board, onMove, lastMove, hints, isThinking = false, isPlayerTurn = true }) => {
  // 调试日志：确认 Board 组件接收到的 hints
  console.log('[Board] Received hints:', hints);
  console.log('[Board] Hints length:', hints.length);
  
  // 新增：打印每个 hint 的坐标和排名
  if (hints.length > 0) {
    console.log('[Board] Hints details:');
    hints.forEach((hint, index) => {
      console.log(`  [${index}] Position: (${hint.x}, ${hint.y}), Order: ${hint.order}, WinRate: ${hint.winRate}%`);
    });
    
    // 新增：检查是否有重复坐标
    const positions = hints.map(h => `(${h.x}, ${h.y})`);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      console.warn('[Board] ⚠️  警告：发现重复的坐标！');
      console.warn('[Board] 所有坐标:', positions);
      console.warn('[Board] 唯一坐标:', Array.from(uniquePositions));
    }
  }
  
  const getHoshi = (size: BoardSize): Point[] => {
    if (size === 9) {
      return [
        { x: 2, y: 2 }, { x: 6, y: 2 }, 
        { x: 4, y: 4 }, 
        { x: 2, y: 6 }, { x: 6, y: 6 }
      ];
    }
    if (size === 13) {
      return [
        { x: 3, y: 3 }, { x: 9, y: 3 }, 
        { x: 6, y: 6 }, 
        { x: 3, y: 9 }, { x: 9, y: 9 }
      ];
    }
    return [
      { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
      { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
      { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }
    ];
  };

  // 极窄留白：edgeMargin 定义网格区域距棋盘边界的距离
  const edgeMargin = 5.5; 
  // 网格点之间的百分比间隔：确保第1个点是 0%，最后一个点是 100%
  const step = 100 / (size - 1);

  const hoshis = getHoshi(size);
  const letters = "ABCDEFGHJKLMNOPQRST";

  return (
    /* 棋盘外框：模拟高档棋盘的厚度感 */
    <div className="relative aspect-square w-[min(94vw,88vh)] max-w-[900px] bg-[#5d4037] p-1.5 rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border-b-[8px] border-r-[8px] border-black/30">
      
      {/* 🔧 新增：AI 思考时的遮罩层 */}
      {isThinking && !isPlayerTurn && (
        <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center cursor-not-allowed rounded-sm">
          <div className="bg-white/95 px-6 py-4 rounded-lg shadow-2xl border-2 border-[#5d4037]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-3 border-[#5d4037] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5d4037] font-bold text-lg">AI 正在思考...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 棋盘木纹板面 */}
      <div className={`relative w-full h-full board-bg rounded-sm flex items-center justify-center overflow-hidden ${isThinking && !isPlayerTurn ? 'pointer-events-none' : ''}`}>
        
        {/* 精细木纹覆盖层 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

        {/* 网格核心容器：使用 inset 强制锁定网格范围，线条不再会“溢出” */}
        <div className="absolute" style={{ top: `${edgeMargin}%`, left: `${edgeMargin}%`, right: `${edgeMargin}%`, bottom: `${edgeMargin}%` }}>
          
          {/* 1. 坐标轴标签 (绝对定位，紧随网格边缘) */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: size }).map((_, i) => (
              <React.Fragment key={`axis-${i}`}>
                {/* 数字标签 (左侧) */}
                <div 
                  className="absolute right-[calc(100%+6px)] flex items-center justify-end text-[min(1.4vw,1.4vh,13px)] font-bold text-[#2a1b0a] font-serif select-none"
                  style={{ top: `${i * step}%`, transform: 'translateY(-50%)', width: '20px' }}
                >
                  {size - i}
                </div>
                {/* 字母标签 (底部) */}
                <div 
                  className="absolute top-[calc(1.4vw,1.4vh,13px)] font-bold text-[#2a1b0a] font-serif select-none"
                  style={{ left: `${i * step}%`, transform: 'translateX(-50%)', width: '20px' }}
                >
                  {letters[i]}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* 2. 棋盘线条 (使用 100% 容器宽度/高度，确保不长出) */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: size }).map((_, i) => (
              <React.Fragment key={`line-${i}`}>
                {/* 纵向线：height 设为 100% 确保垂直贴合边界 */}
                <div 
                  className="absolute bg-black/85"
                  style={{ 
                    left: `${i * step}%`, 
                    width: i === 0 || i === size - 1 ? '2.5px' : '1px', 
                    height: '100%',
                    transform: 'translateX(-50%)'
                  }}
                />
                {/* 横向线：width 设为 100% 确保水平贴合边界 */}
                <div 
                  className="absolute bg-black/85"
                  style={{ 
                    top: `${i * step}%`, 
                    height: i === 0 || i === size - 1 ? '2.5px' : '1px', 
                    width: '100%',
                    transform: 'translateY(-50%)'
                  }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* 3. 星位 (Hoshi) */}
          <div className="absolute inset-0 pointer-events-none">
            {hoshis.map((h, i) => (
              <div 
                key={`hoshi-${i}`}
                className="absolute w-[1.4%] h-[1.4%] min-w-[5px] min-h-[5px] max-w-[8px] max-h-[8px] bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${h.x * step}%`, 
                  top: `${h.y * step}%` 
                }}
              />
            ))}
          </div>

          {/* 4. 棋子与交互层 */}
          <div className="absolute inset-0">
            {board.map((row, y) => row.map((cell, x) => {
              const currentHint = hints.find(h => h.x === x && h.y === y);
              const isLast = lastMove?.x === x && lastMove?.y === y;

              // 新增：调试日志 - 记录每个位置的匹配情况
              if (currentHint) {
                console.log(`[Board] 渲染 hint 在位置 (${x}, ${y}):`, {
                  order: currentHint.order,
                  winRate: currentHint.winRate,
                  cellIsEmpty: cell === StoneType.NONE,
                  willRender: cell === StoneType.NONE
                });
              }

              return (
                <div 
                  key={`${x}-${y}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(x, y);
                  }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group flex items-center justify-center"
                  style={{ 
                    left: `${x * step}%`, 
                    top: `${y * step}%`, 
                    width: `${step}%`, 
                    height: `${step}%`,
                    zIndex: cell !== StoneType.NONE ? 30 : 20
                  }}
                >
                  {/* 落子预览 */}
                  {cell === StoneType.NONE && (
                    <div className="absolute rounded-full bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity w-[90%] h-[90%]" />
                  )}
                  
                  {/* 棋子渲染 */}
                  <div className="w-[98%] h-[98%] flex items-center justify-center">
                    <Stone 
                      type={cell} 
                      isLastMove={isLast} 
                    />
                  </div>

                  {/* AI 多步推荐可视化 */}
                  {currentHint && cell === StoneType.NONE && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                      {/* 根据排名选择颜色 */}
                      {(() => {
                        const order = currentHint.order ?? 0;
                        const colors = [
                          { bg: 'bg-red-600', border: 'border-red-500', shadow: 'shadow-[0_0_10px_red]' },      // 最优
                          { bg: 'bg-orange-500', border: 'border-orange-400', shadow: 'shadow-[0_0_10px_orange]' }, // 次优
                          { bg: 'bg-yellow-500', border: 'border-yellow-400', shadow: 'shadow-[0_0_10px_yellow]' }, // 第三
                          { bg: 'bg-green-500', border: 'border-green-400', shadow: 'shadow-[0_0_10px_green]' },   // 第四
                          { bg: 'bg-blue-500', border: 'border-blue-400', shadow: 'shadow-[0_0_10px_blue]' }       // 第五
                        ];
                        const color = colors[Math.min(order, 4)];
                        
                        return (
                          <>
                            {/* 圆圈 + 排名数字 */}
                            <div className={`relative w-[70%] h-[70%] rounded-full ${color.bg} border-2 border-white ${color.shadow} flex items-center justify-center`}>
                              <span className="text-white font-bold text-[min(2vw,2vh,18px)] drop-shadow-lg">
                                {order + 1}
                              </span>
                            </div>
                            
                            {/* 三行数字信息 */}
                            <div className="absolute top-[calc(100%+2px)] left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-[min(1.2vw,1.2vh,11px)] px-2 py-1 rounded whitespace-nowrap font-mono leading-tight">
                              <div className="text-center font-bold">{currentHint.winRate.toFixed(1)}%</div>
                              <div className="text-center">{currentHint.scoreLead > 0 ? '+' : ''}{currentHint.scoreLead.toFixed(1)}</div>
                              <div className="text-center text-[min(1vw,1vh,9px)] opacity-70">#{order + 1}</div>
                            </div>
                            
                            {/* 脉冲动画（仅最优解） */}
                            {order === 0 && (
                              <div className={`absolute w-full h-full rounded-full border-4 ${color.border} animate-ping opacity-30`} />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;