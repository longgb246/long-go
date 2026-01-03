
import React from 'react';
import { Stone as StoneType, Point, BoardSize } from '../types';
import Stone from './Stone';

interface BoardProps {
  size: BoardSize;
  board: StoneType[][];
  onMove: (x: number, y: number) => void;
  lastMove: Point | null;
  hint: Point | null;
}

const Board: React.FC<BoardProps> = ({ size, board, onMove, lastMove, hint }) => {
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
      
      {/* 棋盘木纹板面 */}
      <div className="relative w-full h-full board-bg rounded-sm flex items-center justify-center overflow-hidden">
        
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
                  className="absolute top-[calc(100%+4px)] flex justify-center text-[min(1.4vw,1.4vh,13px)] font-bold text-[#2a1b0a] font-serif select-none"
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
              const isHint = hint?.x === x && hint?.y === y;
              const isLast = lastMove?.x === x && lastMove?.y === y;

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

                  {/* AI 提示特效 */}
                  {isHint && cell === StoneType.NONE && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                      <div className="w-1/2 h-1/2 rounded-full bg-red-600 border-2 border-white animate-bounce shadow-[0_0_10px_red]" />
                      <div className="absolute w-full h-full rounded-full border-4 border-red-500 animate-ping opacity-30" />
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
