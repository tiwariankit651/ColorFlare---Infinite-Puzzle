import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Zap, Box, Key, Lock } from 'lucide-react';
import { Cell, CellType } from '../types';

interface CellProps {
  cell: Cell;
  color?: string;
  isActive: boolean;
  isHint?: boolean;
  isTutorial?: boolean;
  hintColor?: string; // Color of the path index when showing solution
}

export const CellComponent: React.FC<CellProps> = ({ 
  cell, 
  color, 
  isActive, 
  isHint, 
  isTutorial,
  hintColor 
}) => {
  const getBgColor = () => {
    if (cell.type === CellType.WALL) return 'rgb(31, 41, 55)'; // gray-800
    if (cell.type === CellType.GATE) return 'rgba(239, 68, 68, 0.05)';
    if (cell.type === CellType.KEY) return 'rgba(245, 158, 11, 0.05)';
    if (cell.isPath && color) {
        return `${color}59`; 
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
      case CellType.KEY:
        const kColor = color || '#facc15';
        return (
          <div className="flex items-center justify-center w-full h-full p-2">
            <Key className="text-white/85" style={{ color: kColor, filter: `drop-shadow(0 0 6px ${kColor}aa)` }} size="60%" />
          </div>
        );
      case CellType.GATE:
        const gColor = color || '#cf3c3c';
        return (
          <div className="flex items-center justify-center w-full h-full p-1.5">
            <div 
              className="w-full h-full rounded border border-white/25 bg-black/40 flex items-center justify-center"
              style={{ borderColor: `${gColor}55` }}
            >
              <Lock className="text-white/55" style={{ color: gColor }} size="55%" />
            </div>
          </div>
        );
      case CellType.BRIDGE:
        return (
          <div className="flex items-center justify-center w-full h-full relative opacity-40">
            <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full" />
            <div className="absolute top-0 bottom-0 w-1 bg-white/10 rounded-full" />
            <div className="absolute w-2 h-2 rounded-full border border-white/20 bg-black/50" />
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
        backgroundColor: getBgColor()
      }}
    >
      {/* Solution Hint Pulsating Tube Indicator */}
      {hintColor && !cell.isPath && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.3, 0.65, 0.3],
            scale: [0.8, 1.05, 0.8]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute inset-0 z-50 m-[30%] rounded-full border-2 border-dashed shadow-[0_0_8px_currentColor] pointer-events-none"
          style={{ 
            color: hintColor,
          }}
        />
      )}

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
