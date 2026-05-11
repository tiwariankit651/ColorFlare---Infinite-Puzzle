import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Zap, Box } from 'lucide-react';
import { Cell, CellType } from '../types';

interface CellProps {
  cell: Cell;
  color?: string;
  isActive: boolean;
  isHint?: boolean;
  isTutorial?: boolean;
}

export const CellComponent: React.FC<CellProps> = ({ cell, color, isActive, isHint, isTutorial }) => {
  const getBgColor = () => {
    if (cell.type === CellType.WALL) return 'rgb(31, 41, 55)'; // gray-800
    if (cell.isPath && color) {
        return undefined; 
    }
    return 'rgba(255, 255, 255, 0.05)';
  };

  const content = () => {
    switch (cell.type) {
      case CellType.DOT:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-3/5 h-3/5 rounded-full shadow-lg"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}66`
              }}
            />
          </div>
        );
      case CellType.ROTATOR:
        return (
          <div className="flex items-center justify-center w-full h-full p-2">
            <RotateCcw className="text-white/20 animate-spin-slow" size="100%" />
          </div>
        );
      case CellType.WALL:
        return (
          <div className="flex items-center justify-center w-full h-full p-3 opacity-20">
            <Box className="text-white" size="100%" />
          </div>
        );
      case CellType.TELEPORTER:
        return (
          <div className="flex items-center justify-center w-full h-full p-2">
            <Zap className="text-indigo-400 opacity-40 animate-pulse" size="100%" fill="currentColor" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      className={`relative aspect-square rounded-md m-[1px] transition-colors duration-150 ${
        isActive ? 'ring-2 ring-white z-10' : ''
      }`}
      style={{
        backgroundColor: getBgColor(),
        background: cell.isPath && color ? `${color}59` : undefined
      }}
    >
      {isHint && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7] 
          }}
          transition={{
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 1, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-[0_0_20px_#facc15] border-2 border-white" />
        </motion.div>
      )}
      {isTutorial && !cell.isPath && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 border-4 border-blue-400 rounded-md z-0"
        />
      )}
      {cell.isPath && color && (
        <motion.div 
          initial={isActive ? { scale: 1.2 } : { scale: 0, opacity: 0 }}
          animate={isActive ? { 
            scale: [1, 1.1, 1],
            opacity: 1 
          } : { 
            scale: 1, 
            opacity: 1 
          }}
          transition={isActive ? { 
            scale: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.2 }
          } : { 
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className={`absolute inset-0 z-0 ${cell.type === CellType.DOT ? 'm-0' : 'm-[25%]'} rounded-full`}
          style={{ 
            backgroundColor: color,
            boxShadow: isActive 
              ? `0 0 20px ${color}, 0 0 40px ${color}88, 0 0 60px ${color}44` 
              : `0 0 10px ${color}aa, 0 0 20px ${color}44`
          }}
        />
      )}
      <div className="relative z-10 w-full h-full">
        {content()}
      </div>
    </motion.div>
  );
};
