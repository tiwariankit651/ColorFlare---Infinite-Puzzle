import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Level, CellType } from '../types';
import { PathValidator } from '../logic/pathValidator';
import { CellComponent } from './Cell';
import { sounds } from '../lib/sounds';

interface GameBoardProps {
  level: Level;
  grid: any[][];
  setGrid: (grid: any[][]) => void;
  onComplete: () => void;
  colors: string[];
  hintPath?: { r: number, c: number }[];
  onMove?: (nextGrid: any[][], colorIndex: number) => void;
  onError?: () => void;
  moveCount?: number;
  showingSolution?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ level, grid, setGrid, onComplete, colors, hintPath, onMove, onError, moveCount = 0, showingSolution = false }) => {
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [lastCell, setLastCell] = useState<{ r: number, c: number } | null>(null);
  const [pulsePos, setPulsePos] = useState<{ r: number, c: number, color: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearColor = useCallback((colorIndex: number) => {
    if (showingSolution) return;
    setGrid(grid.map(row => 
      row.map(cell => {
        if (cell.pathColorIndex === colorIndex) {
          return { ...cell, isPath: false, pathColorIndex: undefined };
        }
        return cell;
      })
    ));
  }, [grid, setGrid, showingSolution]);

  const handleCellInteraction = useCallback((r: number, c: number) => {
    if (showingSolution) return;
    if (r < 0 || r >= grid.length || c < 0 || c >= (grid[r]?.length || 0)) return;
    const cell = grid[r][c];

    // Start from a dot
    if (cell.type === CellType.DOT) {
      const colorIdx = cell.colorIndex!;
      onMove?.(grid, colorIdx);
      clearColor(colorIdx);
      setActiveColor(colorIdx);
      setLastCell({ r, c });
      return;
    }

    // Continue path
    if (activeColor === null || lastCell === null) return;
    if (cell.type === CellType.WALL || cell.type === CellType.ROTATOR) return;

    // Must be adjacent
    const dr = Math.abs(r - lastCell.r);
    const dc = Math.abs(c - lastCell.c);
    if (dr + dc !== 1) {
      if (dr + dc > 0) onError?.();
      return;
    }

    // Can't go on another color's path
    if (cell.isPath && cell.pathColorIndex !== activeColor) {
      onError?.();
      return;
    }

    const nextGrid = [...grid.map(row => [...row])];
    nextGrid[r][c] = { ...nextGrid[r][c], isPath: true, pathColorIndex: activeColor };
    
    // Teleporter logic
    let targetCell = { r, c };
    if (cell.type === CellType.TELEPORTER) {
      const pairId = cell.colorIndex;
      const otherPair = level.grid.flat().find(f => f.type === CellType.TELEPORTER && f.colorIndex === pairId && (f.row !== r || f.col !== c));
      if (otherPair) {
        nextGrid[otherPair.row][otherPair.col] = { ...nextGrid[otherPair.row][otherPair.col], isPath: true, pathColorIndex: activeColor };
        targetCell = { r: otherPair.row, c: otherPair.col };
        sounds.playConnect(); // Extra sound for teleport
      }
    }

    sounds.playConnect();

    // Use functional state updates carefully here
    const winCheckLevel = { ...level, grid: nextGrid };
    if (PathValidator.isLevelComplete(winCheckLevel)) {
        setTimeout(onComplete, 100);
    }
    
    onMove?.(grid, activeColor); // Record current grid to history before applying next
    setGrid(nextGrid);
    setLastCell(targetCell);

    // Check if reached the other dot
    if (cell.type === CellType.DOT && cell.colorIndex === activeColor) {
      setPulsePos({ r, c, color: colors[activeColor] });
      setTimeout(() => setPulsePos(null), 1000);
      setActiveColor(null);
      setLastCell(null);
    }
  }, [grid, activeColor, lastCell, clearColor, level, onComplete, onMove, setGrid]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const cellSize = rect.width / level.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < level.gridSize && col >= 0 && col < level.gridSize) {
      if (lastCell?.r !== row || lastCell?.c !== col) {
        handleCellInteraction(row, col);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeColor === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellSize = rect.width / level.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < level.gridSize && col >= 0 && col < level.gridSize) {
      if (lastCell?.r !== row || lastCell?.c !== col) {
        handleCellInteraction(row, col);
      }
    }
  };

  const [hintStep, setHintStep] = useState(-1);

  useEffect(() => {
    if (hintPath && hintPath.length > 0) {
      setHintStep(0);
      const interval = setInterval(() => {
        setHintStep(prev => (prev + 1) % (hintPath.length + 1));
      }, 400);
      return () => clearInterval(interval);
    } else {
      setHintStep(-1);
    }
  }, [hintPath]);

  const isHintCell = (r: number, c: number) => {
    if (!hintPath || hintStep === -1) return false;
    // Show all cells up to the current hint step
    const cellIdx = hintPath.findIndex(p => p.r === r && p.c === c);
    return cellIdx !== -1 && cellIdx < hintStep;
  };

  const isTutorialCell = (r: number, c: number) => {
    if (!hintPath || hintPath.length === 0 || level.number > 2) return false;
    // For tutorial, we'll highlight the cell they should touch next
    // If moveCount is 0, highlight start. If 1, highlight next, etc.
    const step = Math.min(hintPath.length - 1, moveCount);
    const target = hintPath[step];
    return target && target.r === r && target.c === c;
  };

  return (
    <div 
      ref={containerRef}
      className="grid w-full aspect-square bg-black/20 p-1 rounded-xl shadow-2xl overflow-hidden select-none"
      style={{
        gridTemplateColumns: `repeat(${level.gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${level.gridSize}, 1fr)`,
        touchAction: 'none'
      }}
      onMouseDown={(e) => {
          const rect = containerRef.current!.getBoundingClientRect();
          const col = Math.floor((e.clientX - rect.left) / (rect.width / level.gridSize));
          const row = Math.floor((e.clientY - rect.top) / (rect.width / level.gridSize));
          handleCellInteraction(row, col);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { setActiveColor(null); setLastCell(null); }}
      onMouseLeave={() => { setActiveColor(null); setLastCell(null); }}
      onTouchStart={(e) => {
          const rect = containerRef.current!.getBoundingClientRect();
          const touch = e.touches[0];
          const col = Math.floor((touch.clientX - rect.left) / (rect.width / level.gridSize));
          const row = Math.floor((touch.clientY - rect.top) / (rect.width / level.gridSize));
          handleCellInteraction(row, col);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => { setActiveColor(null); setLastCell(null); }}
    >
      {grid.flat().map((cell, idx) => (
        <CellComponent
          key={`${cell.row}-${cell.col}`}
          cell={cell}
          color={cell.pathColorIndex !== undefined ? colors[cell.pathColorIndex] : (cell.colorIndex !== undefined ? colors[cell.colorIndex] : undefined)}
          isActive={lastCell?.r === cell.row && lastCell?.c === cell.col}
          isHint={isHintCell(cell.row, cell.col)}
          isTutorial={isTutorialCell(cell.row, cell.col)}
        />
      ))}

      {/* Connection Pulse Effect */}
      <AnimatePresence>
        {pulsePos && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none rounded-full blur-xl"
            style={{
              width: `${100 / level.gridSize}%`,
              height: `${100 / level.gridSize}%`,
              left: `${(pulsePos.c / level.gridSize) * 100}%`,
              top: `${(pulsePos.r / level.gridSize) * 100}%`,
              backgroundColor: pulsePos.color,
              boxShadow: `0 0 40px ${pulsePos.color}`
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
