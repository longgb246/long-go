
import React from 'react';
import { Stone as StoneType } from '../types';

interface StoneProps {
  type: StoneType;
  isLastMove?: boolean;
}

const Stone: React.FC<StoneProps> = ({ type, isLastMove }) => {
  if (type === StoneType.NONE) return null;

  const isBlack = type === StoneType.BLACK;
  
  return (
    <div className={`
      relative w-full h-full rounded-full flex items-center justify-center
      ${isBlack 
        ? 'bg-gradient-to-br from-[#333] via-[#111] to-black shadow-[1px_2px_4px_rgba(0,0,0,0.5)]' 
        : 'bg-gradient-to-br from-[#fff] via-[#f8f8f8] to-[#eee] shadow-[1px_2px_4px_rgba(0,0,0,0.3)] border border-neutral-300'
      }
      transition-transform duration-300
    `}>
      {/* 白子特有的蛤壳纹理感 */}
      {!isBlack && (
        <div className="absolute inset-0 opacity-5 rounded-full pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      )}
      
      {/* 最后落子标记 */}
      {isLastMove && (
        <div className={`w-1.5 h-1.5 rounded-full ${isBlack ? 'bg-red-500/80 shadow-[0_0_5px_red]' : 'bg-red-600/80 shadow-[0_0_5px_red]'}`} />
      )}
    </div>
  );
};

export default Stone;
